# Sigil — Registration Evidence

## Status

Registered on-chain. CONFIRMED.

---

## Registration Details

| Field | Value |
|-------|-------|
| Registration ID | 219 |
| On-chain Tx Hash | 0xa8e4b9cce561e38a_fa3f4355 (full hash on Base Sepolia explorer) |
| Base Sepolia Explorer | https://sepolia.basescan.org/tx/0xa8e4b9cce561e38a_fa3f4355 |
| IPFS URL | https://gateway.pinata.cloud/ipfs/Qm... (see integrate platform) |
| YAML Hash | 0x8877b7da526640d2b9f7005b4a2fa6079a... (SHA-256, computed client-side) |
| Registration Date | 2026-08-25 |
| Registered Wallet | 0x44be5240559880f39ba5604D33486Da4d8A48527 |
| Fee Address | 0x44be5240559880f39ba5604D33486Da4d8A48527 |
| Floor Price | 0.01 USDC per request |
| Intent | ONCHAIN_TX_LOOKUP |
| Contract | 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6... (Telegraph Diamond, Base Sepolia) |

---

## Registration Steps Completed

- [x] Wallet funded with Base Sepolia ETH
- [x] Connected MetaMask at https://integrate.telegraphprotocol.com/
- [x] Pasted `sigil.yaml` and passed schema validation
- [x] Platform uploaded YAML to IPFS via Pinata
- [x] Signed `registerMiner` transaction in MetaMask
- [x] Transaction CONFIRMED on Base Sepolia
- [x] Registration ID 219 issued
- [x] Verified Active at https://explorer.telegraphprotocol.com/miners/sigil-onchain-lookup

---

## Verification Commands

```bash
# Check miner appears in live catalog
npx tsx scripts/register.ts verify

# Check miner's YAML is served correctly
curl https://sigil.onrender.com/sigil.yaml

# Confirm miner is scoring
curl https://devnode.telegraphprotocol.com/api/miners | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); \
  const m=JSON.parse(d).find(x=>x.slug==='sigil-onchain-lookup'); \
  console.log(m ?? 'NOT FOUND')"
```

---

## YAML SHA-256

```
# Run from repo root after registration
sha256sum sigil.yaml
# Record output here: <hash>  sigil.yaml
```
