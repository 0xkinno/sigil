/**
 * Thin abstraction over ethers.js `JsonRpcProvider`. Normalizes a raw RPC
 * response into a `ProviderTxResult` so the dual-RPC layer never touches
 * ethers types directly.
 */
import { JsonRpcProvider, type TransactionReceipt } from 'ethers';
import type { ProviderTxResult, RawLog, TxStatus } from '../types/index.js';

const providerCache = new Map<string, JsonRpcProvider>();

function getProvider(rpcUrl: string): JsonRpcProvider {
  const cached = providerCache.get(rpcUrl);
  if (cached !== undefined) {
    return cached;
  }
  const provider = new JsonRpcProvider(rpcUrl);
  providerCache.set(rpcUrl, provider);
  return provider;
}

export class RpcTimeoutError extends Error {
  public constructor(rpcUrl: string, timeoutMs: number) {
    super(`RPC request to ${rpcUrl} timed out after ${timeoutMs}ms`);
    this.name = 'RpcTimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, rpcUrl: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new RpcTimeoutError(rpcUrl, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function mapLogs(receipt: TransactionReceipt): RawLog[] {
  return receipt.logs.map((log) => ({
    address: log.address.toLowerCase(),
    topics: log.topics.map((topic) => topic.toLowerCase()),
    data: log.data.toLowerCase(),
    logIndex: log.index,
  }));
}

export async function isProviderReachable(rpcUrl: string, timeoutMs: number): Promise<boolean> {
  if (rpcUrl.length === 0) {
    return false;
  }
  try {
    const provider = getProvider(rpcUrl);
    await withTimeout(provider.getBlockNumber(), timeoutMs, rpcUrl);
    return true;
  } catch {
    return false;
  }
}

export async function queryTransaction(
  rpcUrl: string,
  txHash: string,
  timeoutMs: number,
): Promise<ProviderTxResult> {
  const provider = getProvider(rpcUrl);

  const [tx, receipt, currentBlockNumber, network] = await withTimeout(
    Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
      provider.getBlockNumber(),
      provider.getNetwork(),
    ]),
    timeoutMs,
    rpcUrl,
  );

  const chainId = Number(network.chainId);

  if (tx === null) {
    return {
      found: false,
      status: 'not_found',
      blockNumber: null,
      from: null,
      to: null,
      valueWei: null,
      logs: [],
      chainId,
      currentBlockNumber,
    };
  }

  if (receipt === null) {
    return {
      found: true,
      status: 'pending',
      blockNumber: null,
      from: tx.from.toLowerCase(),
      to: tx.to === null ? null : tx.to.toLowerCase(),
      valueWei: tx.value.toString(),
      logs: [],
      chainId,
      currentBlockNumber,
    };
  }

  // Pre-Byzantium receipts have `status === null`; none of Sigil's 5 chains
  // predate Byzantium, so a null status is treated the same as success (1)
  // rather than introducing a fourth branch that can never be reached in practice.
  const status: TxStatus = receipt.status === 0 ? 'reverted' : 'confirmed';

  return {
    found: true,
    status,
    blockNumber: receipt.blockNumber,
    from: receipt.from.toLowerCase(),
    to: receipt.to === null ? null : receipt.to.toLowerCase(),
    valueWei: tx.value.toString(),
    logs: mapLogs(receipt),
    chainId,
    currentBlockNumber,
  };
}
