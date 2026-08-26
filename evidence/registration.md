# Sigil — Registration Evidence

## Status

> **TODO:** Fill this in after completing on-chain registration at
> https://integrate.telegraphprotocol.com/

---

## Registration Details

| Field | Value |
|-------|-------|
| Miner ID | _pending registration_ |
| Registration ID | _pending registration_ |
| On-chain Tx Hash | _pending registration_ |
| Base Sepolia Explorer | _pending registration_ |
| IPFS CID (YAML) | _pending registration_ |
| Registration Date | _pending registration_ |
| Registered Wallet | _pending registration_ |

---

## Registration Steps Completed

- [ ] Wallet funded with Base Sepolia ETH (https://www.alchemy.com/faucets/base-sepolia)
- [ ] Connected MetaMask at https://integrate.telegraphprotocol.com/
- [ ] Pasted `sigil.yaml` and passed schema validation
- [ ] Platform sandbox-tested `/lookup` endpoint
- [ ] Platform pinned YAML to IPFS
- [ ] Signed `registerMiner` transaction in MetaMask
- [ ] Confirmed miner active at https://explorer.telegraphprotocol.com/miners
- [ ] SHA-256 of YAML: `sha256sum sigil.yaml` → _pending_

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
