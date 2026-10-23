import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { transformMenus } from '../pipeline/menu.pipeline.js';
import { IngestionErrorService } from '../ingestion/ingestion-error.service.js';

interface RawMenuDocument {
  domain?: string;
  params?: {
    restaurant_url?: string;
  };
  payload?: {
    Message?: string;
    results?: unknown[];
  };
}

type MenuModel = Model<any>;

@Injectable()
export class MenusService {
  constructor(
    @InjectModel('RawMenu', 'raw')
    private readonly rawMenuModel: Model<RawMenuDocument>,

    @InjectModel('Restaurant', 'normalized')
    private readonly restaurantModel: MenuModel,

    @InjectModel('MenuCategory', 'normalized')
    private readonly categoryModel: MenuModel,

    @InjectModel('MenuItem', 'normalized')
    private readonly itemModel: MenuModel,

    @Inject(IngestionErrorService)
    private readonly ingestionErrorService: IngestionErrorService,
  ) {}

  async processMenus(runId: string) {
    const cursor = this.rawMenuModel.find().sort({ _id: 1 }).lean().cursor();

    const stats = {
      read: 0,
      written: 0,
      invalid: 0,
      skipped: 0,
      restaurants: 0,
      categories: 0,
      items: 0,
    };

    for await (const document of cursor) {
      stats.read++;

      const provider = document.domain?.trim() || 'unknown';
      const sourceId = String(document._id);

      // Skip provider error responses
      if (document.payload?.Message) {
        stats.skipped++;
        continue;
      }

      const results = document.payload?.results;

      // Quarantine invalid payloads
      if (!Array.isArray(results)) {
        stats.invalid++;

        await this.ingestionErrorService.saveError(
          runId,
          provider,
          'menu',
          'Missing or invalid payload.results',
          sourceId,
          'payload.results',
        );

        continue;
      }

      const restaurantUrl = document.params?.restaurant_url ?? '';

      const transformed = transformMenus(results, provider, restaurantUrl);

      // Save validation errors
      stats.invalid += transformed.errors.length;

      for (const error of transformed.errors) {
        await this.ingestionErrorService.saveError(
          runId,
          provider,
          error.stage,
          error.reason,
          sourceId,
          `payload.results[${error.index}]`,
        );
      }

      // 1. Restaurants
      if (transformed.restaurants.length > 0) {
        const operations = transformed.restaurants.map((restaurant) => ({
          updateOne: {
            filter: {
              provider: restaurant.provider,
              providerRestaurantId: restaurant.providerRestaurantId,
            },
            update: {
              $set: restaurant,
            },
            upsert: true,
          },
        }));

        await this.restaurantModel.bulkWrite(operations, {
          ordered: false,
        });

        stats.restaurants += transformed.restaurants.length;
      }

      // 2. Menu categories
      if (transformed.categories.length > 0) {
        const operations = transformed.categories.map((category) => ({
          updateOne: {
            filter: {
              provider: category.provider,
              providerRestaurantId: category.providerRestaurantId,
              providerCategoryId: category.providerCategoryId,
            },
            update: {
              $set: category,
            },
            upsert: true,
          },
        }));

        await this.categoryModel.bulkWrite(operations, {
          ordered: false,
        });

        stats.categories += transformed.categories.length;
      }

      // 3. Menu items
      if (transformed.items.length > 0) {
        const operations = transformed.items.map((item) => ({
          updateOne: {
            filter: {
              provider: item.provider,
              providerRestaurantId: item.providerRestaurantId,
              providerCategoryId: item.providerCategoryId,
              providerItemId: item.providerItemId,
            },
            update: {
              $set: item,
            },
            upsert: true,
          },
        }));

        await this.itemModel.bulkWrite(operations, {
          ordered: false,
        });

        stats.items += transformed.items.length;
      }
    }

    stats.written = stats.restaurants + stats.categories + stats.items;

    return stats;
  }
}
