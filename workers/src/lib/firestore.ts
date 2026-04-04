/**
 * firestore.ts
 *
 * Thin Firestore REST API client for Cloudflare Workers.
 * Replaces firebase-admin Firestore usage.
 *
 * Docs: https://firebase.google.com/docs/firestore/reference/rest
 */

import { getAccessToken } from "./service-account";

// ─── Sentinel values (replicate firebase-admin FieldValue) ─────────────────

export const SERVER_TIMESTAMP = { __type: "serverTimestamp" } as const;
export const DELETE_FIELD = { __type: "deleteField" } as const;

export function increment(n: number) {
  return { __type: "increment", value: n } as const;
}

type FieldSentinel =
  | typeof SERVER_TIMESTAMP
  | typeof DELETE_FIELD
  | ReturnType<typeof increment>;

// ─── Firestore typed-value serialisation ───────────────────────────────────

type FSValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FSValue> } }
  | { arrayValue: { values: FSValue[] } };

function toFSValue(v: unknown): FSValue | null {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return {
      arrayValue: {
        values: v
          .map(toFSValue)
          .filter((x): x is FSValue => x !== null),
      },
    };
  }
  if (typeof v === "object") {
    // Skip sentinels — they are extracted separately
    if ("__type" in (v as any)) return null;
    const fields: Record<string, FSValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined && !isSentinel(val)) {
        const fsv = toFSValue(val);
        if (fsv !== null) fields[k] = fsv;
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function isSentinel(v: unknown): v is FieldSentinel {
  return (
    typeof v === "object" &&
    v !== null &&
    "__type" in v &&
    ["serverTimestamp", "deleteField", "increment"].includes((v as any).__type)
  );
}

function fromFSValue(v: FSValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("mapValue" in v) {
    const obj: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      obj[k] = fromFSValue(val);
    }
    return obj;
  }
  if ("arrayValue" in v) {
    return (v.arrayValue.values || []).map(fromFSValue);
  }
  return null;
}

/** Convert a Firestore REST document into a plain JS object */
export function fromFirestoreDoc(doc: any): Record<string, unknown> {
  if (!doc || !doc.fields) return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields as Record<string, FSValue>)) {
    result[k] = fromFSValue(v);
  }
  return result;
}

/** Extract the document ID from a Firestore document name */
export function docIdFromName(name: string): string {
  return name.split("/").pop() ?? "";
}

// ─── Build updateTransforms from sentinel values in a data object ───────────

function extractTransforms(
  data: Record<string, unknown>,
  prefix = ""
): Array<{ fieldPath: string; transform: object }> {
  const transforms: Array<{ fieldPath: string; transform: object }> = [];
  for (const [k, v] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isSentinel(v)) {
      const s = v as FieldSentinel;
      if (s.__type === "serverTimestamp") {
        transforms.push({ fieldPath: path, transform: { setToServerValue: "REQUEST_TIME" } });
      } else if (s.__type === "increment") {
        const val = (s as ReturnType<typeof increment>).value;
        transforms.push({
          fieldPath: path,
          transform: Number.isInteger(val)
            ? { increment: { integerValue: String(val) } }
            : { increment: { doubleValue: val } },
        });
      }
      // DELETE_FIELD is handled by updateMask
    } else if (
      typeof v === "object" &&
      v !== null &&
      !Array.isArray(v) &&
      !(v instanceof Date)
    ) {
      transforms.push(...extractTransforms(v as Record<string, unknown>, path));
    }
  }
  return transforms;
}

// ─── Firestore client ───────────────────────────────────────────────────────

export class Firestore {
  private baseUrl: string;
  private tokenFn: () => Promise<string>;

  constructor(projectId: string, serviceAccountJson: string) {
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    this.tokenFn = () => getAccessToken(serviceAccountJson);
  }

  private async headers() {
    const token = await this.tokenFn();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /** GET a single document. Returns null if not found. */
  async getDoc(
    collection: string,
    docId: string
  ): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`;
    const resp = await fetch(url, { headers: await this.headers() });

    if (resp.status === 404) return null;
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Firestore getDoc(${collection}/${docId}) failed: ${resp.status} ${text}`);
    }

    const doc = await resp.json() as any;
    return fromFirestoreDoc(doc);
  }

  /** SET (create or overwrite) a document */
  async setDoc(
    collection: string,
    docId: string,
    data: Record<string, unknown>,
    merge = false
  ): Promise<void> {
    const fields: Record<string, FSValue> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!isSentinel(v) && v !== undefined) {
        const fsv = toFSValue(v);
        if (fsv !== null) fields[k] = fsv;
      }
    }

    const transforms = extractTransforms(data);
    const writes: object[] = [];

    const write: any = {
      update: {
        name: `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`,
        fields,
      },
    };

    if (merge) {
      write.updateMask = { fieldPaths: Object.keys(fields) };
    }

    if (transforms.length > 0) {
      write.updateTransforms = transforms.map((t) => ({
        fieldPath: t.fieldPath,
        ...t.transform,
      }));
    }

    writes.push(write);
    await this.commit(writes);
  }

  /** UPDATE (merge/partial update) an existing document */
  async updateDoc(
    collection: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const fields: Record<string, FSValue> = {};
    const deletePaths: string[] = [];

    for (const [k, v] of Object.entries(data)) {
      if (isSentinel(v)) {
        if ((v as FieldSentinel).__type === "deleteField") {
          deletePaths.push(k);
        }
        // serverTimestamp and increment handled via transforms
      } else if (v !== undefined) {
        const fsv = toFSValue(v);
        if (fsv !== null) fields[k] = fsv;
      }
    }

    const transforms = extractTransforms(data);
    const updatePaths = [...Object.keys(fields), ...deletePaths];

    const write: any = {
      update: {
        name: `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`,
        fields,
      },
      updateMask: { fieldPaths: updatePaths },
    };

    if (transforms.length > 0) {
      write.updateTransforms = transforms.map((t) => ({
        fieldPath: t.fieldPath,
        ...t.transform,
      }));
    }

    await this.commit([write]);
  }

  /** DELETE a document */
  async deleteDoc(collection: string, docId: string): Promise<void> {
    const url = `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`;
    const resp = await fetch(url, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!resp.ok && resp.status !== 404) {
      const text = await resp.text();
      throw new Error(`Firestore deleteDoc failed: ${resp.status} ${text}`);
    }
  }

  /** Query a collection. Returns array of { id, data } */
  async query(
    collection: string,
    where: Array<{ field: string; op: string; value: unknown }> = [],
    orderBy?: { field: string; direction?: "ASCENDING" | "DESCENDING" },
    limit?: number
  ): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const structuredQuery: any = {
      from: [{ collectionId: collection }],
    };

    if (where.length > 0) {
      const filters = where.map((w) => ({
        fieldFilter: {
          field: { fieldPath: w.field },
          op: fsOp(w.op),
          value: toFSValue(w.value),
        },
      }));
      structuredQuery.where =
        filters.length === 1
          ? filters[0]
          : { compositeFilter: { op: "AND", filters } };
    }

    if (orderBy) {
      structuredQuery.orderBy = [
        {
          field: { fieldPath: orderBy.field },
          direction: orderBy.direction ?? "ASCENDING",
        },
      ];
    }

    if (limit !== undefined) {
      structuredQuery.limit = limit;
    }

    const url = `${this.baseUrl}:runQuery`;
    const resp = await fetch(url, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ structuredQuery }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Firestore query(${collection}) failed: ${resp.status} ${text}`);
    }

    const results: any[] = await resp.json();
    const docs: Array<{ id: string; data: Record<string, unknown> }> = [];

    for (const r of results) {
      if (r.document) {
        docs.push({
          id: docIdFromName(r.document.name),
          data: fromFirestoreDoc(r.document),
        });
      }
    }

    return docs;
  }

  /**
   * Commit a batch of writes.
   * Each write is a raw Firestore REST write object.
   */
  async commit(writes: object[]): Promise<void> {
    if (writes.length === 0) return;
    const url = `${this.baseUrl}:commit`;
    const resp = await fetch(url, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify({ writes }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Firestore commit failed: ${resp.status} ${text}`);
    }
  }

  /**
   * Run a Firestore transaction.
   * fn receives a thin transaction helper. Returns fn's return value.
   */
  async runTransaction<T>(
    fn: (tx: FirestoreTransaction) => Promise<T>
  ): Promise<T> {
    const token = await this.tokenFn();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Begin transaction
    const beginUrl = `${this.baseUrl.replace("/documents", "")}:beginTransaction`;
    const beginResp = await fetch(beginUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ options: { readWrite: {} } }),
    });

    if (!beginResp.ok) {
      const text = await beginResp.text();
      throw new Error(`beginTransaction failed: ${beginResp.status} ${text}`);
    }

    const { transaction: txId } = await beginResp.json() as any;

    const tx = new FirestoreTransaction(this.baseUrl, txId, headers);

    const result = await fn(tx);

    // Commit transaction writes
    const commitUrl = `${this.baseUrl}:commit`;
    const commitResp = await fetch(commitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transaction: txId,
        writes: tx.pendingWrites,
      }),
    });

    if (!commitResp.ok) {
      const text = await commitResp.text();
      throw new Error(`commitTransaction failed: ${commitResp.status} ${text}`);
    }

    return result;
  }

  /** Generate a random document ID (same entropy as Firestore auto-IDs) */
  newDocId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    const rand = new Uint8Array(20);
    crypto.getRandomValues(rand);
    for (const b of rand) {
      id += chars[b % chars.length];
    }
    return id;
  }
}

/** Thin wrapper used inside runTransaction */
export class FirestoreTransaction {
  pendingWrites: object[] = [];

  constructor(
    private baseUrl: string,
    private txId: string,
    private headers: Record<string, string>
  ) {}

  /** Read a document inside the transaction */
  async getDoc(
    collection: string,
    docId: string
  ): Promise<{ exists: boolean; data: Record<string, unknown> }> {
    const url = `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}?transaction=${this.txId}`;
    const resp = await fetch(url, { headers: this.headers });

    if (resp.status === 404) return { exists: false, data: {} };
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`TX getDoc failed: ${resp.status} ${text}`);
    }

    const doc = await resp.json() as any;
    return { exists: true, data: fromFirestoreDoc(doc) };
  }

  /** Queue a set inside the transaction */
  setDoc(collection: string, docId: string, data: Record<string, unknown>): void {
    const fields: Record<string, FSValue> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!isSentinel(v) && v !== undefined) {
        const fsv = toFSValue(v);
        if (fsv !== null) fields[k] = fsv;
      }
    }

    const transforms = extractTransforms(data);
    const write: any = {
      update: {
        name: `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`,
        fields,
      },
    };
    if (transforms.length > 0) {
      write.updateTransforms = transforms.map((t) => ({
        fieldPath: t.fieldPath,
        ...t.transform,
      }));
    }
    this.pendingWrites.push(write);
  }

  /** Queue an update inside the transaction */
  updateDoc(collection: string, docId: string, data: Record<string, unknown>): void {
    const fields: Record<string, FSValue> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!isSentinel(v) && v !== undefined) {
        const fsv = toFSValue(v);
        if (fsv !== null) fields[k] = fsv;
      }
    }
    const transforms = extractTransforms(data);
    const write: any = {
      update: {
        name: `${this.baseUrl}/${collection}/${encodeURIComponent(docId)}`,
        fields,
      },
      updateMask: { fieldPaths: Object.keys(fields) },
    };
    if (transforms.length > 0) {
      write.updateTransforms = transforms.map((t) => ({
        fieldPath: t.fieldPath,
        ...t.transform,
      }));
    }
    this.pendingWrites.push(write);
  }
}

function fsOp(op: string): string {
  const map: Record<string, string> = {
    "==": "EQUAL",
    "!=": "NOT_EQUAL",
    "<": "LESS_THAN",
    "<=": "LESS_THAN_OR_EQUAL",
    ">": "GREATER_THAN",
    ">=": "GREATER_THAN_OR_EQUAL",
    "array-contains": "ARRAY_CONTAINS",
    in: "IN",
    "not-in": "NOT_IN",
  };
  return map[op] ?? op;
}
