import { Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { LocationDocument } from './schemas/location.schema.js';
import { InjectModel } from '@nestjs/mongoose';
import {
  LOCATION_MODEL_TOKEN,
  NORMALIZED_DATABASE_NAME,
  RAW_LOCATION_MODEL_TOKEN,
  RAW_DATABASE_NAME,
} from '../constants/location.constants.js';
import { transformLocations } from '../pipeline/location.pipeline.js';

interface RawLocationDocument {
  domain: string;
  payload?: {
    results?: unknown[];
  };
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(LOCATION_MODEL_TOKEN, NORMALIZED_DATABASE_NAME)
    private readonly locationModel: Model<LocationDocument>,

    @InjectModel(RAW_LOCATION_MODEL_TOKEN, RAW_DATABASE_NAME)
    private readonly rawLocationModel: Model<RawLocationDocument>,
  ) {}

  async processLocations() {
    const rowLocations = await this.rawLocationModel
      .find()
      .sort({ _id: -1 })
      .lean()
      .cursor();

    let read = 0;
    let written = 0;

    for await (const document of rowLocations) {
      read++;

      const locations = transformLocations(
        document.payload?.results ?? [],
        document.domain,
      );

      if (locations.length === 0) {
        continue;
      }

      const operations = locations.map((location) => ({
        updateOne: {
          filter: {
            provider: location.provider,
            providerLocationId: location.providerLocationId,
          },
          update: {
            $set: location,
          },
          upset: true,
        },
      }));

      const result = await this.locationModel.bulkWrite(operations);

      written += result.upsertedCount + result.modifiedCount;
    }

    return { read, written };
  }
}
