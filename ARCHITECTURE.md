
# Provider Data Factory — System Architecture

## 1. Overview

Provider Data Factory is a NestJS backend application that ingests raw restaurant-provider data, validates and transforms it, and stores normalized records in MongoDB.

The application uses background processing to keep ingestion independent from HTTP request execution.

### Technology Stack

- NestJS 12 and TypeScript
- MongoDB 7 and Mongoose
- Redis 7 and BullMQ
- Vitest and mongodb-memory-server
- Docker Compose

## 2. High-Level Architecture

```text
                  REST API
                     |
                     v
             IngestionController
                     |
                     v
              IngestionService
                     |
                     v
                BullMQ Queue
                     |
                     v
              IngestionProcessor
                     |
          +----------+----------+
          |          |          |
          v          v          v
      Locations  Restaurants   Menus
       Service     Service     Service
          |          |          |
          +----------+----------+
                     |
                     v
              MongoDB (RAW)
                     |
                     v
             Data Transformation
              and Validation
                     |
                     v
             Mongoose Bulk Upsert
                     |
                     v
           MongoDB (NORMALIZED)
```

## 3. Database Architecture

Two MongoDB databases separate original provider responses from normalized records.

### provider_raw

Source collections:

- `raw_locations`
- `raw_restaurant_listings`
- `raw_menus`

Raw data is preserved for reprocessing and debugging.

### provider_normalized

Target collections:

- `locations`
- `restaurants`
- `restaurant_locations`
- `menu_categories`
- `menu_items`
- `ingestion_runs`
- `ingestion_errors`

These collections support normalized queries, run monitoring and error investigation.

## 4. Ingestion Workflow

### Step 1: Create an ingestion run

A client calls:

`POST /runs`

Example request:

```json
{
  "type": "menus"
}
```

The service creates an ingestion-run record and queues the appropriate BullMQ job.

Supported types:

- `locations`
- `restaurant-listings`
- `menus`

### Step 2: Process background job

The ingestion worker handles the job and invokes the appropriate domain service.

The API request does not need to wait for the entire dataset to finish processing.

### Step 3: Read raw records

The domain service reads source documents from `provider_raw` using a MongoDB cursor.

Cursor batch size can be configured.

### Step 4: Transform records

The processing pipeline maps provider-specific fields to normalized records.

For menu data, the pipeline:

1. Validates the incoming payload.
2. Extracts restaurant information.
3. Extracts menu categories.
4. Extracts menu items.
5. Constructs normalized records.
6. Identifies invalid or unusable data.

### Step 5: Persist normalized data

Mongoose bulk upserts insert new records or update existing matching records.

### Step 6: Update ingestion progress

The application records processing counters and completion status.

Menu ingestion also uses a source-document checkpoint to support continuation.

## 5. Data Relationships

The normalized model separates restaurants, locations, categories and items.

```text
Location
   |
   | many-to-many
   |
Restaurant
   |
   | one-to-many
   v
MenuCategory
   |
   | one-to-many
   v
MenuItem
```

The restaurant-location association is represented by `restaurant_locations`.

Provider identifiers are retained to support matching and deduplication.

## 6. Embedding vs Referencing

Menu categories and items are stored separately rather than embedding entire menus into restaurant documents.

Benefits:

- Independent menu item updates
- Smaller restaurant documents
- Efficient item-level queries
- Clearer deduplication boundaries
- Easier handling of large menus

Tradeoff:

- Reconstructing a complete menu requires additional queries or aggregation.

## 7. Idempotency and Deduplication

The pipeline uses deterministic matching keys derived from provider identifiers.

MongoDB upsert operations allow the same raw data to be processed repeatedly without continually creating duplicate normalized documents.

Unique and compound indexes should enforce the matching rules at the database level.

The exact index definitions must be verified against the implemented Mongoose schemas.

## 8. Error Handling

Invalid or unusable source records are recorded in the ingestion-error collection.

The design separates data-quality errors from background job execution failures.

BullMQ supports retry attempts with exponential backoff.

Failed jobs can be routed to a dead-letter queue for investigation.

## 9. Checkpoint and Recovery

Menu ingestion tracks the last processed source document ID.

If processing stops, a resumed run can continue after the recorded checkpoint.

Combined with idempotent upserts, this reduces duplicate-write risks during recovery.

## 10. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/runs` | Create ingestion run |
| GET | `/runs/:id` | Retrieve run status |
| GET | `/runs/:id/errors` | Inspect paginated errors |
| GET | `/health` | Check dependencies |

## 11. Testing

The project uses Vitest.

Menu integration tests use `mongodb-memory-server` and exercise the actual menu service against a temporary MongoDB instance.

Five verified tests cover:

- Raw-to-normalized persistence
- Idempotent reprocessing
- Invalid payload quarantine
- Checkpoint persistence
- Checkpoint-based continuation

The existing integration suite does not verify complete BullMQ dispatch or retry behavior.

## 12. Deployment

Docker Compose defines three services:

- `mongodb` — MongoDB 7
- `redis` — Redis 7
- `app` — NestJS application

MongoDB and Redis use persistent Docker volumes.

The NestJS application connects to these services through their Docker Compose service names.

Full application startup and health checks must be verified before submission.

## 13. Current Limitations

- Independent BullMQ batch jobs have not been verified.
- The provider adapter extension mechanism requires confirmation.
- Exact database indexes require verification.
- End-to-end queue retry and dead-letter behavior need dedicated tests.
- Fresh-environment seeding and Docker startup need final verification.

## 14. Future Improvements

- Separate batch dispatcher and worker responsibilities
- Support additional providers through reusable adapters
- Expand integration tests for queue failures and retries
- Add structured correlation IDs and per-stage metrics
- Improve operational monitoring
```
