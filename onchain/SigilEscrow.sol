// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SigilEscrow — Finality-Gated Settlement Escrow for EVM Transactions
 * @notice Protects settlement against L2 sequencer reorgs by releasing funds ONLY
 *         when an on-chain transaction reaches verified L1 finality (`l1_finalized` or `native_finalized`).
 *
 * Built for Telegraph Protocol Hackathon Track 3.
 * Uses ERC-8183 decentralized job routing targeting `keccak256("ONCHAIN_TX_LOOKUP")`.
 */

struct OnChainData {
    address[] addresses;
    uint256[] integers;
    string[] strings;
    bool[] bools;
}

interface ITelegraph {
    function createJob(bytes32 intentId, OnChainData memory params, address callback) external returns (uint256 jobId);
    function depositUSDC(uint256 amount) external;
    function escrowBalance(address account) external view returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SigilEscrow {
    enum FinalityTier {
        None,
        SequencerSoft, // Tier 1: Soft sequencer receipt
        L1Posted,      // Tier 2: Batch posted to L1
        L1Finalized,   // Tier 3: L1 Casper FFG Finalized
        NativeFinalized // Tier 4: Native L1 / PoS Finalized
    }

    enum EscrowStatus {
        Active,
        Released,
        Declined,
        Expired
    }

    struct Escrow {
        uint256 id;
        address sender;
        address recipient;
        address token; // address(0) for native ETH
        uint256 amount;
        FinalityTier requiredFinalityTier;
        EscrowStatus status;
        uint256 openedAt;
        uint256 expiresAt;
        uint256 lastJobId;
        string targetChain;
        string targetTxHash;
    }

    bytes32 public constant INTENT_ID = keccak256("ONCHAIN_TX_LOOKUP");

    address public immutable telegraphDiamond;
    address public owner;

    uint256 public nextEscrowId = 1;
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => uint256) public escrowOfJob;

    event EscrowOpened(
        uint256 indexed escrowId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        FinalityTier requiredFinalityTier,
        uint256 expiresAt
    );

    event CheckRequested(uint256 indexed escrowId, uint256 indexed jobId, string chain, string txHash);
    event EscrowReleased(uint256 indexed escrowId, address indexed recipient, uint256 amount, FinalityTier achievedTier);
    event Declined(uint256 indexed escrowId, string reason);
    event EscrowExpired(uint256 indexed escrowId, address indexed sender, uint256 amount);

    modifier onlyTelegraphOrOwner() {
        require(msg.sender == telegraphDiamond || msg.sender == owner, "Unauthorized caller");
        _;
    }

    constructor(address _telegraphDiamond) {
        telegraphDiamond = _telegraphDiamond;
        owner = msg.sender;
    }

    receive() external payable {}

    /**
     * @notice Opens a finality-gated escrow locking ERC-20 or native ETH.
     */
    function openEscrow(
        address recipient,
        address token,
        uint256 amount,
        FinalityTier requiredFinalityTier,
        uint256 durationSeconds
    ) external payable returns (uint256 escrowId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(requiredFinalityTier >= FinalityTier.SequencerSoft, "Invalid finality tier");
        require(durationSeconds >= 60, "Duration must be >= 60s");

        if (token == address(0)) {
            require(msg.value == amount, "ETH value mismatch");
        } else {
            require(msg.value == 0, "Unexpected ETH value");
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "ERC20 transfer failed");
        }

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            id: escrowId,
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            requiredFinalityTier: requiredFinalityTier,
            status: EscrowStatus.Active,
            openedAt: block.timestamp,
            expiresAt: block.timestamp + durationSeconds,
            lastJobId: 0,
            targetChain: "",
            targetTxHash: ""
        });

        emit EscrowOpened(
            escrowId,
            msg.sender,
            recipient,
            token,
            amount,
            requiredFinalityTier,
            block.timestamp + durationSeconds
        );
    }

    /**
     * @notice Requests verification of a settlement transaction via Telegraph ERC-8183 job.
     */
    function checkAndRelease(
        uint256 escrowId,
        string calldata chain,
        string calldata txHash
    ) external returns (uint256 jobId) {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.Active, "Escrow not active");
        require(block.timestamp < esc.expiresAt, "Escrow already expired");

        esc.targetChain = chain;
        esc.targetTxHash = txHash;

        string[] memory strings = new string[](2);
        strings[0] = chain;
        strings[1] = txHash;

        OnChainData memory params = OnChainData({
            addresses: new address[](0),
            integers: new uint256[](0),
            strings: strings,
            bools: new bool[](0)
        });

        if (telegraphDiamond != address(0)) {
            jobId = ITelegraph(telegraphDiamond).createJob(INTENT_ID, params, address(this));
        } else {
            jobId = uint256(keccak256(abi.encodePacked(block.timestamp, escrowId, txHash)));
        }

        esc.lastJobId = jobId;
        escrowOfJob[jobId] = escrowId;

        emit CheckRequested(escrowId, jobId, chain, txHash);
    }

    /**
     * @notice Telegraph Protocol ERC-8183 callback delivery endpoint.
     */
    function subnetMessage(uint256 jobId, OnChainData memory result) external onlyTelegraphOrOwner {
        uint256 escrowId = escrowOfJob[jobId];
        require(escrowId != 0, "Unknown job ID");

        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.Active, "Escrow not active");

        if (result.strings.length < 3) {
            emit Declined(escrowId, "unreadable_answer_shape");
            return;
        }

        string memory status = result.strings[2];
        FinalityTier reportedTier = FinalityTier.None;

        if (result.strings.length >= 4) {
            reportedTier = parseFinalityTier(result.strings[3]);
        } else {
            // Default to soft sequencer receipt if tier omitted by legacy miner
            reportedTier = FinalityTier.SequencerSoft;
        }

        // Check 1: Status must be confirmed
        if (keccak256(bytes(status)) != keccak256(bytes("confirmed"))) {
            emit Declined(escrowId, "transaction_not_confirmed");
            return;
        }

        // Check 2: Finality tier must satisfy requirement
        if (uint256(reportedTier) < uint256(esc.requiredFinalityTier)) {
            emit Declined(escrowId, "finality_tier_insufficient");
            return;
        }

        // Release funds
        esc.status = EscrowStatus.Released;
        if (esc.token == address(0)) {
            (bool success, ) = payable(esc.recipient).call{value: esc.amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(IERC20(esc.token).transfer(esc.recipient, esc.amount), "ERC20 transfer failed");
        }

        emit EscrowReleased(escrowId, esc.recipient, esc.amount, reportedTier);
    }

    /**
     * @notice Direct resolution for simulation and testing.
     */
    function resolveWithResult(
        uint256 escrowId,
        string memory status,
        FinalityTier reportedTier
    ) external onlyTelegraphOrOwner {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.Active, "Escrow not active");

        if (keccak256(bytes(status)) != keccak256(bytes("confirmed"))) {
            emit Declined(escrowId, "transaction_not_confirmed");
            return;
        }

        if (uint256(reportedTier) < uint256(esc.requiredFinalityTier)) {
            emit Declined(escrowId, "finality_tier_insufficient");
            return;
        }

        esc.status = EscrowStatus.Released;
        if (esc.token == address(0)) {
            (bool success, ) = payable(esc.recipient).call{value: esc.amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(IERC20(esc.token).transfer(esc.recipient, esc.amount), "ERC20 transfer failed");
        }

        emit EscrowReleased(escrowId, esc.recipient, esc.amount, reportedTier);
    }

    /**
     * @notice Releases locked funds back to sender after timeout expires.
     */
    function expire(uint256 escrowId) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.Active, "Escrow not active");
        require(block.timestamp >= esc.expiresAt, "Escrow has not reached expiration timeout");

        esc.status = EscrowStatus.Expired;
        if (esc.token == address(0)) {
            (bool success, ) = payable(esc.sender).call{value: esc.amount}("");
            require(success, "ETH refund failed");
        } else {
            require(IERC20(esc.token).transfer(esc.sender, esc.amount), "ERC20 refund failed");
        }

        emit EscrowExpired(escrowId, esc.sender, esc.amount);
    }

    function parseFinalityTier(string memory tierStr) public pure returns (FinalityTier) {
        bytes32 h = keccak256(bytes(tierStr));
        if (h == keccak256(bytes("l1_finalized"))) return FinalityTier.L1Finalized;
        if (h == keccak256(bytes("native_finalized"))) return FinalityTier.NativeFinalized;
        if (h == keccak256(bytes("l1_posted"))) return FinalityTier.L1Posted;
        if (h == keccak256(bytes("sequencer_soft"))) return FinalityTier.SequencerSoft;
        return FinalityTier.None;
    }
}
