# Quick Start — Provider Data Factory

## Prerequisites

- Docker Desktop with Docker Compose
- Git
- Bun (for seeding and running tests locally)

## 1. Clone the repository

```bash
git clone https://github.com/mhmd-aashik/provider-data-factory.git
cd provider-data-factory
```

For a private repository, GitHub access must be granted to the reviewer.

## 2. Install dependencies

```bash
bun install --frozen-lockfile
```

## 3. Start the application

```bash
docker compose up --build -d
```

This starts three services:

- MongoDB 7
- Redis 7
- NestJS application

Check container status:

```bash
docker compose ps
```

## 4. Verify application health

```bash
curl http://localhost:3000/health
```

The response should report `healthy`, with MongoDB and Redis services `up`.

## 5. Seed the raw database

```bash
MONGO_RAW_URI="mongodb://127.0.0.1:27017/provider_raw" bun scripts/seed.ts
```

The script imports the three files in `data/` into:

- `provider_raw.raw_locations`
- `provider_raw.raw_restaurants`
- `provider_raw.raw_menus`

**Important:** Running the seed script deletes existing documents from these three raw collections before importing the source files. Use a dedicated local environment.

Verify the imported records:

```bash
docker compose exec mongodb mongosh --quiet provider_raw --eval '
printjson({
  locations: db.raw_locations.countDocuments({}),
  restaurants: db.raw_restaurants.countDocuments({}),
  menus: db.raw_menus.countDocuments({})
})
'
```

## 6. Trigger ingestion

Process locations:

```bash
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{"type":"locations"}'
```

Process restaurant listings:

```bash
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{"type":"restaurant-listings"}'
```

Process menus:

```bash
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{"type":"menus"}'
```

Each request returns a `runId`.

## 7. Monitor ingestion

Replace `YOUR_RUN_ID` with the ID returned by the API:

```bash
curl http://localhost:3000/runs/YOUR_RUN_ID
```

The run status progresses from `pending` to `running` and finally `completed` or `failed`.

Inspect paginated ingestion errors:

```bash
curl "http://localhost:3000/runs/YOUR_RUN_ID/errors?page=1&limit=10"
```

## 8. Verify normalized data

```bash
docker compose exec mongodb mongosh --quiet provider_normalized --eval '
printjson({
  restaurants: db.restaurants.countDocuments({}),
  menu_categories: db.menu_categories.countDocuments({}),
  menu_items: db.menu_items.countDocuments({})
})
'
```

For the provided dataset, the verified results after menu ingestion are:

| Collection      | Documents |
| --------------- | --------: |
| restaurants     |       345 |
| menu_categories |     4,135 |
| menu_items      |    30,936 |

The normalized database is populated by ingestion, not by the seed script.

## 9. Run tests

```bash
bun run test
bunx tsc --noEmit
bun run build
```

Verified fresh-clone result: 13 tests passed across 4 test files, with successful TypeScript validation and production build.

## 10. Stop the application

```bash
docker compose down
```

This stops the containers while preserving database volumes.

## Current limitations

- Ingestion currently uses one BullMQ job per run, with MongoDB cursor batching for menu processing. Independent BullMQ batch-job dispatch is not implemented.
- Full queue failure recovery and dead-letter handling have not been verified through end-to-end tests.
- Menu ingestion has integration tests for persistence, idempotency, invalid data handling, and checkpoint continuation.
