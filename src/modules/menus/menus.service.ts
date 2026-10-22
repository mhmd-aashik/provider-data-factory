import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { transformMenus } from '../pipeline/menu.pipeline.js';

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
  ) {}

  async processMenus() {
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

      if (document.payload?.Message) {
        stats.skipped++;
        continue;
      }

      const results = document.payload?.results;

      if (!Array.isArray(results)) {
        stats.invalid++;
        continue;
      }

      const provider = document.domain?.trim() ?? '';
      const restaurantUrl = document.params?.restaurant_url ?? '';

      const transformed = transformMenus(results, provider, restaurantUrl);

      stats.invalid += transformed.errors.length;

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
