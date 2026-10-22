import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

const uri = process.env.MONGO_RAW_URI;

if (!uri) {
  throw new Error('MONGO_RAW_URI is not set');
}

const datasets = [
  {
    file: 'raw-locations.json',
    collection: 'raw_locations',
  },
  {
    file: 'raw-restaurants.json',
    collection: 'raw_restaurants',
  },
  {
    file: 'raw-menus.json',
    collection: 'raw_menus',
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(uri!);

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('MongoDB connection unavailable');
    }

    for (const dataset of datasets) {
      const content = await readFile(`data/${dataset.file}`, 'utf8');

      // Convert MongoDB Extended JSON to BSON
      const parsed: unknown = EJSON.parse(content);

      if (!Array.isArray(parsed)) {
        throw new Error(`${dataset.file} must contain a JSON array`);
      }

      const collection = db.collection(dataset.collection);

      await collection.deleteMany({});

      if (parsed.length > 0) {
        await collection.insertMany(parsed as Record<string, unknown>[]);
      }

      console.log(`${dataset.collection}: ${parsed.length} documents imported`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
