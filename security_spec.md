# Security Specification - Kalos Billar Club POS

## 1. Data Invariants
1. **Table Invariant**: A billiard table cannot have an active tab unless its status is `ocupada` or `pausada`. When `libre`, `limpieza`, or `mantenimiento`, `activeTabId` must be null.
2. **Tab Invariant**: A tab belongs to a valid venue and table. `openedAt` is immutable and cannot be in the future.
3. **Rental Immutability**: Once a tab is closed (`cerrada`) or cancelled (`anulada`), it enters terminal state; no further modifications, item additions, or payment alterations are allowed.
4. **Audit Trail Invariant**: Audit log entries (`audit_logs`) are append-only. No user (not even admin) may update or delete existing audit log documents.
5. **Product Price Integrity**: Only authenticated staff with `admin` role or bootstrapped owner email (`softkalosbillar@gmail.com`) can create or modify product prices, categories, and tax rates.
6. **Cash Shift Accountability**: A shift once closed cannot be re-opened or have its `closingCash` altered.
7. **Identity Verification**: All write actions require an authenticated user (`request.auth != null`).

## 2. The Dirty Dozen Payloads (Negative Security Test Matrix)
1. **Unauthenticated Read on Cuentas/Tabs**: Anonymous/unauthenticated client attempting to read active or historical financial tabs -> REJECT.
2. **Terminal State Violation**: Attempting to add a product item to a tab whose status is `cerrada` -> REJECT.
3. **Audit Log Deletion**: Staff attempting to delete an audit record to hide a manual price discount or cash deficit -> REJECT.
4. **Audit Log Modification**: Modifying an existing audit log timestamp or operator name -> REJECT.
5. **Product Price Hijack by Cajero**: Cajero role attempting to edit beer price from $50.00 to $0.01 -> REJECT (Admin only).
6. **Negative Quantity Attack**: Injecting `{ qty: -10, unitPrice: 5000 }` to subtract from tab total -> REJECT.
7. **Giant String / Denial of Wallet**: Injecting 1MB payload string into table name or tab notes -> REJECT via string size limits.
8. **Orphaned Tab Injection**: Creating a tab referencing a non-existent or invalid table ID -> REJECT.
9. **Fake Owner / Admin Privilege Escalation**: User modifying their own role in `/users/{uid}` to `'admin'` without authorization -> REJECT.
10. **Timestamp Manipulation**: Client providing a fake `openedAt` 2 days in the past to artificially inflate billing -> REJECT.
11. **Negative Payment Amount**: Adding a payment with negative amount to bypass balance reconciliation -> REJECT.
12. **Double Active Tab on Same Table**: Creating a second tab on a table that is already occupied -> REJECT.
