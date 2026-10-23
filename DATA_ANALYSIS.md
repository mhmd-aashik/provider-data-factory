
# Provider Data Factory — Data Analysis

## 1. Source Data

The application ingests provider data from the `provider_raw` MongoDB database.

Source collections:

- `raw_locations`
- `raw_restaurant_listings`
- `raw_menus`

The original provider records are preserved separately from the normalized data.

## 2. Observed Menu Dataset

The supplied menu dataset contains 500 raw documents.

Observed characteristics:

- 345 documents contain `payload.results`.
- 329 documents contain category information.
- 155 documents represent provider-error responses.

These observations show why the pipeline must validate source records before normalization.

## 3. Data Quality Challenges

### Missing or Incomplete Data

Some provider responses lack the fields required to construct normalized menu records.

The pipeline must distinguish valid records from incomplete or unusable responses.

### Provider Errors

Some raw documents contain error responses instead of menu data.

These should not become normalized restaurant or menu records.

### Duplicate Records

Repeated ingestion may encounter the same provider identifiers.

The pipeline uses deterministic identifiers and upserts to prevent duplicate normalized records.

### Inconsistent Source Shapes

Provider payloads may contain different nested structures.

Transformation functions isolate source-specific formats from the normalized persistence model.

## 4. Normalized Collections

The target database is `provider_normalized`.

| Collection | Purpose |
|---|---|
| locations | Normalized geographic locations |
| restaurants | Restaurant records |
| restaurant_locations | Restaurant-to-location associations |
| menu_categories | Restaurant menu categories |
| menu_items | Individual menu items |
| ingestion_runs | Run status, counters, and checkpoints |
| ingestion_errors | Invalid records and processing errors |

## 5. Relationships

- One restaurant can be associated with multiple locations.
- One restaurant can have multiple menu categories.
- One menu category can contain multiple items.

The restaurant-location association is modeled separately.

## 6. Embedding vs Referencing

Menu categories and menu items are stored in separate collections.

Reasons:

- Menu items can be updated independently.
- Restaurant documents remain smaller.
- Individual items can be queried without loading complete menus.
- Deduplication can operate on provider-level item identifiers.

The tradeoff is additional queries when reconstructing a complete menu.

## 7. Deduplication and Idempotency

Normalized records are matched using provider identifiers and relevant parent identifiers.

MongoDB upserts allow repeated ingestion without continually inserting new documents.

The exact unique indexes must be checked against the Mongoose schemas before submission.

## 8. Error Quarantine

Invalid source records are recorded separately for investigation.

This allows valid records to continue through the pipeline without silently discarding errors.

## 9. Verified Menu Results

| Collection | Documents |
|---|---:|
| restaurants | 345 |
| menu_categories | 4,135 |
| menu_items | 30,936 |

A subsequent completed menu ingestion run preserved these collection counts.

## 10. Testing Evidence

Five menu integration tests passed using Vitest and mongodb-memory-server.

The tests cover persistence, idempotency, invalid payload handling, checkpoint persistence, and continuation.

## 11. Remaining Verification

Before submission:

- Confirm the exact source-field mappings.
- Document actual unique and compound indexes.
- Verify the provider adapter extension mechanism.
- Confirm independent BullMQ batch jobs and dispatcher behavior.
- Verify full Docker startup and seed commands.
