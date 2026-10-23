import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';

import { transformMenus } from '../pipeline/menu.pipeline.js';
import { IngestionErrorService } from '../ingestion/ingestion-error.service.js';
import { IngestionRun } from '../ingestion/schemas/ingestion-run.schema.js';

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

interface DocumentStats {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  restaurants: number;
  categories: number;
  items: number;
}

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

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(IngestionRun.name, 'normalized')
    private readonly runModel: Model<IngestionRun>,
  ) {}

  async processMenus(runId: string) {
    const run = await this.runModel.findById(runId).lean();

    if (!run) {
      throw new Error(`Ingestion run ${runId} not found`);
    }

    // Configurable MongoDB cursor batch size
    const configuredBatchSize = Number(
      this.configService.get('INGESTION_BATCH_SIZE', 50),
    );

    const batchSize =
      Number.isSafeInteger(configuredBatchSize) && configuredBatchSize > 0
        ? Math.min(configuredBatchSize, 500)
        : 50;

    // Resume from the last successfully processed document
    const filter = run.lastProcessedId
      ? {
          _id: {
            $gt: new Types.ObjectId(run.lastProcessedId),
          },
        }
      : {};

    const cursor = this.rawMenuModel
      .find(filter)
      .sort({ _id: 1 })
      .lean()
      .batchSize(batchSize)
      .cursor();

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
      const documentStats: DocumentStats = {
        processed: 1,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        restaurants: 0,
        categories: 0,
        items: 0,
      };

      const provider = document.domain?.trim() || 'unknown';
      const sourceId = String(document._id);

      stats.read++;

      // 1. Provider returned an error response
      if (document.payload?.Message) {
        documentStats.skipped++;
        stats.skipped++;
      } else {
        const results = document.payload?.results;

        // 2. Invalid payload
        if (!Array.isArray(results)) {
          documentStats.failed++;
          stats.invalid++;

          await this.ingestionErrorService.saveError(
            runId,
            provider,
            'menu',
            'Missing or invalid payload.results',
            sourceId,
            'payload.results',
          );
        } else {
          // 3. Transform restaurant, categories and items
          const restaurantUrl = document.params?.restaurant_url ?? '';

          const transformed = transformMenus(results, provider, restaurantUrl);

          documentStats.failed += transformed.errors.length;
          stats.invalid += transformed.errors.length;

          // 4. Save validation errors
          for (const [errorIndex, error] of transformed.errors.entries()) {
            await this.ingestionErrorService.saveError(
              runId,
              provider,
              error.stage,
              error.reason,
              sourceId,
              `payload.results:error:${errorIndex}`,
            );
          }

          // 5. Upsert restaurants
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

            const count = transformed.restaurants.length;

            documentStats.restaurants += count;
            documentStats.succeeded += count;

            stats.restaurants += count;
          }

          // 6. Upsert menu categories
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

            const count = transformed.categories.length;

            documentStats.categories += count;
            documentStats.succeeded += count;

            stats.categories += count;
          }

          // 7. Upsert menu items
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

            const count = transformed.items.length;

            documentStats.items += count;
            documentStats.succeeded += count;

            stats.items += count;
          }
        }
      }

      // 8. Save cumulative counters and checkpoint together
      // Only execute after the document has been handled.
      const checkpoint = await this.runModel.updateOne(
        {
          _id: runId,
          $or: [
            { lastProcessedId: null },
            { lastProcessedId: { $exists: false } },
            { lastProcessedId: { $lt: sourceId } },
          ],
        },
        {
          $set: {
            lastProcessedId: sourceId,
          },
          $inc: {
            processed: documentStats.processed,
            succeeded: documentStats.succeeded,
            failed: documentStats.failed,
            skipped: documentStats.skipped,
            restaurants: documentStats.restaurants,
            categories: documentStats.categories,
            items: documentStats.items,
            batchNumber: 1,
          },
        },
      );

      if (checkpoint.modifiedCount !== 1) {
        throw new Error(
          `Failed to save checkpoint for source document ${sourceId}`,
        );
      }
    }

    stats.written = stats.restaurants + stats.categories + stats.items;

    return stats;
  }
}
