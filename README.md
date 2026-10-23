
# Provider Data Factory

A NestJS backend application that ingests raw restaurant-provider data, transforms and deduplicates it, and stores normalized records in MongoDB.

## Technology Stack

- NestJS 12 / TypeScript / Node.js
- MongoDB and Mongoose
- BullMQ and Redis
- Vitest
- Docker Compose

## Architecture

The application uses two MongoDB databases:

- `provider_raw` — original provider data
- `provider_normalized` — transformed records and ingestion tracking

Raw collections:
- `raw_locations`
- `raw_restaurant_listings`
- `raw_menus`

Normalized collections:
- `locations`
- `restaurants`
- `restaurant_locations`
- `menu_categories`
- `menu_items`

## Processing Flow

1. An API request creates an ingestion run.
2. BullMQ queues the appropriate ingestion job.
3. A NestJS worker reads raw MongoDB documents.
4. Pipeline functions validate, transform and deduplicate records.
5. Mongoose bulk upserts persist normalized records.
6. Invalid records are recorded for investigation.
7. Run counters and checkpoints track progress.

## Local Setup

Install dependencies:

```bash
bun install
```

Start MongoDB and Redis:

```bash
docker compose up -d mongodb redis
```

Start the application locally:

```bash
bun run start:dev
```

Alternatively, once the Docker image is verified, start the full stack:

```bash
docker compose up --build -d
```

## Database Seeding

Run the repository's existing seed script to populate the raw MongoDB collections.

The exact seed command should be documented after checking `scripts/seed.ts` and its package/runtime requirements.

## API Endpoints

### Start ingestion

```http
POST /runs
Content-Type: application/json

{
  "type": "menus"
}
```

Supported ingestion types:
- `locations`
- `restaurant-listings`
- `menus`

### Check ingestion status

```http
GET /runs/:id
```

### Inspect ingestion errors

```http
GET /runs/:id/errors?page=1&limit=10
```

### Health check

```http
GET /health
```

The health endpoint checks MongoDB and Redis connectivity.

## Testing

Run all tests:

```bash
bun run test
```

Run the menu pipeline integration tests:

```bash
bunx vitest run test/menu-pipeline.integration.spec.ts
```

Check TypeScript:

```bash
bunx tsc --noEmit
```

## Verified Results

Menu ingestion was tested against the provided raw dataset.

Normalized document counts:
- Restaurants: 345
- Menu categories: 4,135
- Menu items: 30,936

A subsequent completed ingestion run preserved these collection counts.

Five MongoDB-backed menu integration tests passed, covering persistence, repeat ingestion, invalid-record handling and checkpoints.

## Engineering Decisions

- Separate raw and normalized databases preserve source records.
- Mongoose upserts support repeatable ingestion.
- Unique business keys help prevent duplicate records.
- Pure transformation functions are independently testable.
- BullMQ separates ingestion requests from background processing.
- Error quarantine allows valid records to continue processing.
- Checkpoints support resuming partially processed menu ingestion.

## Known Limitations

- The current menu integration test exercises the service and MongoDB, not the complete BullMQ dispatch path.
- Cursor batch size is not equivalent to independent BullMQ batch jobs.
- Full Docker startup and fresh-environment seeding require final verification.
- Other pipeline recovery behavior requires separate verification.

## Future Improvements

- Independent dispatcher and batch-worker jobs
- Additional provider adapters and declarative mappings
- Expanded end-to-end queue integration testing
- More detailed per-stage metrics and structured logging
