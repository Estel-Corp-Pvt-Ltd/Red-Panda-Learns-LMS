# Fix: Certificate Requests Pagination Errors

## File Changed

- `src/services/certificate-request-service.ts` — `getCertificateRequests()` method

## Errors

### Error 1 — `getCountFromServer` returns 400 Bad Request

```
POST https://firestore.googleapis.com/v1/projects/vizuara-ai-labs/databases/(default)/documents:runAggregationQuery 400 (Bad Request)

RestConnection RPC 'RunAggregationQuery' failed with error: {"code":"invalid-argument","name":"FirebaseError"}
```

**Request payload sent to Firestore:**

```json
{
  "structuredAggregationQuery": {
    "aggregations": [{ "alias": "aggregate_0", "count": {} }],
    "structuredQuery": {
      "from": [{ "collectionId": "CertificateRequests" }],
      "limit": 10,
      "startAt": {
        "before": false,
        "values": [
          {
            "referenceValue": "projects/vizuara-ai-labs/databases/(default)/documents/CertificateRequests/TCNLE9Qtb7dCye5QSkbI"
          }
        ]
      }
    }
  }
}
```

**Cause:** Firestore's `RunAggregationQuery` API does not support cursor constraints (`startAt`/`startAfter`/`endBefore`) or `limit`. The count query was built with these constraints included, causing Firestore to reject it as an invalid argument.

### Error 2 — "Cursor has too many values"

```
[LearningProgressService.getPendingCertificateRequests] Cursor has too many values.
```

**Cause:** After building query `q` with cursor + limit constraints, the code added cursor and limit constraints **a second time** on top of the same query (`query(q, startAfter(cursor), limit(...))`), resulting in duplicate cursor values.

### Error 3 — "limitToLast() requires specifying at least one orderBy() clause"

```
[LearningProgressService.getPendingCertificateRequests] limitToLast() queries require specifying at least one orderBy() clause
```

**Cause:** When navigating to a previous page, the code used `limitToLast()` without any `orderBy()` clause. Firestore requires an explicit `orderBy` when using `limitToLast` so it knows how to traverse documents in reverse.

## Root Cause (Broken Code)

```ts
// A single set of constraints was used for BOTH count and pagination
const constraints: QueryConstraint[] = [];

if (status && status !== "ALL") {
    constraints.push(where("status", "==", status));
}

// Cursor added here...
if (cursor) {
    constraints.push(
        pageDirection === "next" ? startAfter(cursor) : endBefore(cursor)
    );
}

constraints.push(limit(itemsPerPage));

let q = query(collection(db, COLLECTION.CERTIFICATE_REQUESTS), ...constraints);

// BUG 1: Count query includes cursor + limit — Firestore rejects this
const countSnapshot = await getCountFromServer(q);

// BUG 2: Cursor + limit added AGAIN on top of q (which already has them)
// BUG 3: limitToLast() used without any orderBy()
if (pageDirection === "previous" && cursor) {
    q = query(q, endBefore(cursor), limitToLast(itemsPerPage));
}
```

## Fix Applied

Split into two separate queries:

1. **Count query** — uses only `where` filter constraints (no cursor, no limit, no orderBy)
2. **Paginated query** — uses filter + `orderBy(documentId())` + cursor + limit, built once cleanly

```ts
const collectionRef = collection(db, COLLECTION.CERTIFICATE_REQUESTS);

// 1. Count query — filter constraints only (safe for aggregation API)
const filterConstraints: QueryConstraint[] = [];
if (status && status !== "ALL") {
    filterConstraints.push(where("status", "==", status));
}

const countQuery = query(collectionRef, ...filterConstraints);
const countSnapshot = await getCountFromServer(countQuery);
const totalCount = countSnapshot.data().count;

// 2. Paginated query — orderBy required for cursors and limitToLast
const paginationConstraints: QueryConstraint[] = [
    ...filterConstraints,
    orderBy(documentId()),
];

if (pageDirection === "previous" && cursor) {
    paginationConstraints.push(endBefore(cursor));
    paginationConstraints.push(limitToLast(itemsPerPage));
} else if (cursor) {
    paginationConstraints.push(startAfter(cursor));
    paginationConstraints.push(limit(itemsPerPage));
} else {
    paginationConstraints.push(limit(itemsPerPage));
}

const q = query(collectionRef, ...paginationConstraints);
```

### Why `orderBy(documentId())` is needed

- `limitToLast()` requires Firestore to know the ordering to fetch the "last N" documents. Without `orderBy`, Firestore doesn't know what "last" means.
- `startAfter()` / `endBefore()` cursors also rely on a defined ordering to position correctly.
- `documentId()` is a built-in Firestore sentinel that orders by the document's auto-generated ID, which is the natural default ordering.

## Imports Added

```ts
// Added: documentId, orderBy
import {
    collection, doc, documentId, endBefore, getCountFromServer,
    getDoc, getDocs, limit, limitToLast, orderBy, query,
    QueryConstraint, setDoc, startAfter, updateDoc, where
} from "firebase/firestore";
```
