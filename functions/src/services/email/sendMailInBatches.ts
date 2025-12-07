// batching.ts
import { chunk } from "lodash";


export async function sendInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<any>
) {
  if (!items || items.length === 0) return [];

  const batches = chunk(items, batchSize);

  return Promise.allSettled(
    batches.map((batch) => handler(batch))
  );
}


