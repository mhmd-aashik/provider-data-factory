import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { transformRestaurantListings } from '../pipeline/restaurant-listing.pipeline.js';

interface RawRestaurantDocument {
  domain?: string;
  params?: {
    areaId?: string | number;
  };
  payload?: {
    results?: unknown[];
  };
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel('RawRestaurant', 'raw')
    private readonly rawRestaurantModel: Model<RawRestaurantDocument>,

    @InjectModel('RestaurantLocation', 'normalized')
    private readonly restaurantLocationModel: Model<any>,
  ) {}

  async processRestaurantListings() {
    const cursor = this.rawRestaurantModel
      .find()
      .sort({ _id: 1 })
      .lean()
      .cursor();

    let read = 0;
    let written = 0;
    let invalid = 0;

    for await (const document of cursor) {
      read++;

      const provider = document.domain?.trim() ?? '';
      const locationId = String(document.params?.areaId ?? '');

      const results = Array.isArray(document.payload?.results)
        ? document.payload.results
        : [];

      const transformed = transformRestaurantListings(
        results,
        provider,
        locationId,
      );

      invalid += transformed.invalid.length;

      if (transformed.valid.length === 0) {
        continue;
      }

      const operations = transformed.valid.map((restaurant) => ({
        updateOne: {
          filter: {
            provider: restaurant.provider,
            providerRestaurantId: restaurant.providerRestaurantId,
            providerLocationId: restaurant.providerLocationId,
          },
          update: {
            $set: {
              provider: restaurant.provider,
              providerRestaurantId: restaurant.providerRestaurantId,
              providerLocationId: restaurant.providerLocationId,
            },
          },
          upsert: true,
        },
      }));

      const result = await this.restaurantLocationModel.bulkWrite(operations, {
        ordered: false,
      });

      written += result.upsertedCount + result.modifiedCount;
    }

    return {
      read,
      written,
      invalid,
    };
  }
}
