import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

const uri = process.env.MONGO_RAW_URI!;

if (!uri) {
  throw new Error('MONGO_RAW_URI is not set');
}

const datasets = [
  { file: 'locations.json', collection: 'raw_locations' },
  { file: 'restaurant-details.json', collection: 'raw_restaurant_details' },
  { file: 'restaurant-listings.json', collection: 'raw_restaurant_listings' },
];

async function seedDatabase() {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection unavailable');
  }

  for (const dataset of datasets) {
    const content = await readFile(`data/${dataset.file}`, 'utf8');

    const parsed: unknown = JSON.parse(content);

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

  await mongoose.disconnect();
}

seedDatabase().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
