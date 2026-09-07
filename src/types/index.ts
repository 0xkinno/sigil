/**
 * Sigil — shared type definitions.
 * Every type used across the miner is declared here. No `any` anywhere.
 */

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

export type ChainName = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon';

export const CHAIN_NAMES: readonly ChainName[] = [
  'ethereum',
  'base',
  'arbitrum',
  'optimism',
  'polygon',
] as const;

export interface ChainConfig {
  readonly name: ChainName;
  readonly chainId: number;
  readonly nativeSymbol: string;
  readonly providerAUrl: string;
  readonly providerBUrl: string;
  /** Number of block confirmations required for confidence to reach its maximum value. */
  readonly finalityDepth: number;
  readonly usdcContract: string;
}

export type ChainRegistry = Readonly<Record<ChainName, ChainConfig>>;

// ---------------------------------------------------------------------------
// Transaction status / canonical
// ---------------------------------------------------------------------------

export type TxStatus = 'confirmed' | 'reverted' | 'pending' | 'not_found' | 'error';

export interface CanonicalFields {
  readonly chain: ChainName;
  readonly txHash: string;
  readonly status: TxStatus;
  readonly blockNumber: string;
  readonly from: string;
  readonly to: string;
  readonly valueWei: string;
}

// ---------------------------------------------------------------------------
// Error taxonomy (Section 13 — 12 distinct states)
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'RPC_DISAGREEMENT'
  | 'UPSTREAM_ERROR'
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_CHAIN'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CHAIN_ID_MISMATCH'
  | 'INTERNAL_ERROR';

// ---------------------------------------------------------------------------
// RPC provider results
// ---------------------------------------------------------------------------

export interface RawLog {
  readonly address: string;
  readonly topics: readonly string[];
  readonly data: string;
  readonly logIndex: number;
}

export interface ProviderTxResult {
  readonly found: boolean;
  readonly status: TxStatus;
  readonly blockNumber: number | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly valueWei: string | null;
  readonly logs: readonly RawLog[];
  readonly chainId: number | null;
  readonly currentBlockNumber: number;
}

export type ProviderLabel = 'A' | 'B';

export interface DualQuerySuccess {
  readonly ok: true;
  readonly data: ProviderTxResult;
  readonly confidence: number;
  readonly providerCount: 1 | 2;
  readonly providersAgreed: boolean;
  readonly responseTimeMs: number;
}

export interface DualQueryFailure {
  readonly ok: false;
  readonly errorCode: ErrorCode;
  readonly responseTimeMs: number;
}

export type DualQueryResult = DualQuerySuccess | DualQueryFailure;

// ---------------------------------------------------------------------------
// Effects (ERC-20 transfer decoding)
// ---------------------------------------------------------------------------

export interface Erc20TransferEffect {
  readonly type: 'ERC20_TRANSFER';
  readonly token: string;
  readonly symbol: string;
  readonly from: string;
  readonly to: string;
  readonly amount_raw: string;
  readonly decimals: number;
}

export type Effect = Erc20TransferEffect;

// ---------------------------------------------------------------------------
// Confidence / finality / attestation
// ---------------------------------------------------------------------------

export type DepthCategory = 'shallow' | 'moderate' | 'deep';

export type FinalityTier =
  'sequencer_soft' | 'l1_posted' | 'l1_finalized' | 'native_finalized' | 'unknown';

export interface Finality {
  readonly confirmations: number;
  readonly finalized: boolean;
  readonly depth_category: DepthCategory;
  readonly finality_tier: FinalityTier;
  readonly l1_block_number?: number | null;
  readonly l1_batch_status?: string | null;
  readonly finality_reason?: string;
}

export interface Attestation {
  readonly algorithm: 'ed25519';
  readonly canonical: string;
  readonly signature: string;
  readonly public_key: string;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface Evidence {
  readonly providers_agreed: boolean;
  readonly provider_count: number;
  readonly response_time_ms: number;
  readonly queried_at: string;
}

// ---------------------------------------------------------------------------
// API request / response (Section 10)
// ---------------------------------------------------------------------------

export interface LookupQuery {
  readonly chain: string;
  readonly tx_hash: string;
}

export interface LookupSuccessResponse {
  readonly schema_version: '1.0.0';
  readonly chain: ChainName;
  readonly chain_id: number;
  readonly tx_hash: string;
  readonly status: TxStatus;
  readonly block_number: string;
  readonly from: string;
  readonly to: string;
  readonly value_wei: string;
  readonly canonical: string;
  readonly confidence: number;
  readonly summary: string;
  readonly effects: readonly Effect[];
  readonly finality: Finality | null;
  readonly finality_tier: FinalityTier;
  readonly attestation: Attestation | null;
  readonly evidence: Evidence | null;
  readonly error_code: null;
  readonly error_detail: null;
}

export interface LookupErrorResponse {
  readonly schema_version: '1.0.0';
  readonly chain: ChainName | null;
  readonly chain_id: number | null;
  readonly tx_hash: string;
  readonly status: 'error';
  readonly canonical: '';
  readonly confidence: 0;
  readonly summary: string;
  readonly effects: readonly [];
  readonly finality: null;
  readonly finality_tier: 'unknown';
  readonly attestation: null;
  readonly evidence: null;
  readonly error_code: ErrorCode;
  readonly error_detail: string;
}

export type LookupResponse = LookupSuccessResponse | LookupErrorResponse;

export interface HealthResponse {
  readonly status: 'ok';
  readonly uptime_ms: number;
}

export interface ReadyResponse {
  readonly status: 'ready' | 'not_ready';
  readonly chains: Readonly<Record<ChainName, boolean>>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationSuccess {
  readonly valid: true;
  readonly chain: ChainName;
  readonly txHash: string;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly errorCode: 'INVALID_INPUT' | 'UNSUPPORTED_CHAIN';
  readonly errorDetail: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
