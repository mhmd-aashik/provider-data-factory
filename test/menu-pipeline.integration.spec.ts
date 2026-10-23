import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Schema, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { MenusService } from '../src/modules/menus/menus.service.js';
import { IngestionErrorService } from '../src/modules/ingestion/ingestion-error.service.js';

import {
  Restaurant,
  RestaurantSchema,
} from '../src/modules/restaurants/schemas/restaurant.schema.js';

import {
  MenuCategory,
  MenuCategorySchema,
} from '../src/modules/menus/schemas/menu-category.schema.js';

import {
  MenuItem,
  MenuItemSchema,
} from '../src/modules/menus/schemas/menu-item.schema.js';

import {
  IngestionRun,
  IngestionRunSchema,
} from '../src/modules/ingestion/schemas/ingestion-run.schema.js';

import {
  IngestionError,
  IngestionErrorSchema,
} from '../src/modules/ingestion/schemas/ingestion-error.schema.js';

describe('Menu pipeline MongoDB integration', () => {
  let mongo: MongoMemoryServer;
  let rawConnection: mongoose.Connection;
  let normalizedConnection: mongoose.Connection;

  let rawMenuModel: any;
  let restaurantModel: any;
  let categoryModel: any;
  let itemModel: any;
  let runModel: any;
  let errorModel: any;
  let menusService: MenusService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();

    rawConnection = await mongoose
      .createConnection(mongo.getUri('provider_raw'))
      .asPromise();

    normalizedConnection = await mongoose
      .createConnection(mongo.getUri('provider_normalized'))
      .asPromise();

    rawMenuModel = rawConnection.model(
      'RawMenu',
      new Schema({}, { strict: false, collection: 'raw_menus' }),
    );

    restaurantModel = normalizedConnection.model(
      Restaurant.name,
      RestaurantSchema,
    );

    categoryModel = normalizedConnection.model(
      MenuCategory.name,
      MenuCategorySchema,
    );

    itemModel = normalizedConnection.model(MenuItem.name, MenuItemSchema);

    runModel = normalizedConnection.model(
      IngestionRun.name,
      IngestionRunSchema,
    );

    errorModel = normalizedConnection.model(
      IngestionError.name,
      IngestionErrorSchema,
    );

    await Promise.all([
      restaurantModel.init(),
      categoryModel.init(),
      itemModel.init(),
      errorModel.init(),
    ]);

    const ingestionErrorService = new IngestionErrorService(errorModel);

    const configService = {
      get: (_key: string, defaultValue: unknown) => defaultValue,
    } as ConfigService;

    menusService = new MenusService(
      rawMenuModel,
      restaurantModel,
      categoryModel,
      itemModel,
      ingestionErrorService,
      configService,
      runModel,
    );
  }, 120_000);

  beforeEach(async () => {
    await Promise.all([
      rawMenuModel.deleteMany({}),
      restaurantModel.deleteMany({}),
      categoryModel.deleteMany({}),
      itemModel.deleteMany({}),
      runModel.deleteMany({}),
      errorModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await rawConnection?.close();
    await normalizedConnection?.close();
    await mongo?.stop();
  });

  async function createRun() {
    return runModel.create({
      provider: 'xbyte',
      status: 'pending',
    });
  }

  const restaurantUrl =
    'https://www.talabat.com/uae/restaurant/648607/test-restaurant';

  function validRawMenu() {
    return {
      domain: 'xbyte',
      params: {
        restaurant_url: restaurantUrl,
      },
      payload: {
        results: [
          {
            id: 648607,
            name: 'Test Restaurant',
            category: [
              {
                category_id: 10,
                category_name: 'Pizza',
                items: [
                  {
                    item_id: 101,
                    item_name: 'Margherita Pizza',
                    price: 35,
                  },
                ],
              },
            ],
          },
        ],
      },
    };
  }

  it('reads raw data and persists normalized restaurant, category and item', async () => {
    await rawMenuModel.create(validRawMenu());

    const run = await createRun();
    await menusService.processMenus(String(run._id));

    expect(await restaurantModel.countDocuments()).toBe(1);
    expect(await categoryModel.countDocuments()).toBe(1);
    expect(await itemModel.countDocuments()).toBe(1);

    const restaurant = await restaurantModel.findOne().lean();
    const category = await categoryModel.findOne().lean();
    const item = await itemModel.findOne().lean();

    expect(restaurant.providerRestaurantId).toBe('648607');
    expect(category.providerRestaurantId).toBe('648607');
    expect(item.providerRestaurantId).toBe('648607');
  });

  it('does not create duplicates when ingestion runs again', async () => {
    await rawMenuModel.create(validRawMenu());

    const firstRun = await createRun();
    await menusService.processMenus(String(firstRun._id));

    const secondRun = await createRun();
    await menusService.processMenus(String(secondRun._id));

    expect(await restaurantModel.countDocuments()).toBe(1);
    expect(await categoryModel.countDocuments()).toBe(1);
    expect(await itemModel.countDocuments()).toBe(1);
  });

  it('quarantines invalid payloads without blocking valid documents', async () => {
    await rawMenuModel.create({
      domain: 'xbyte',
      payload: {
        results: 'invalid',
      },
    });

    await rawMenuModel.create(validRawMenu());

    const run = await createRun();
    await menusService.processMenus(String(run._id));

    expect(
      await errorModel.countDocuments({
        runId: String(run._id),
      }),
    ).toBe(1);

    expect(await restaurantModel.countDocuments()).toBe(1);
    expect(await categoryModel.countDocuments()).toBe(1);
    expect(await itemModel.countDocuments()).toBe(1);
  });

  it('saves a checkpoint after processing raw documents', async () => {
    const raw = await rawMenuModel.create(validRawMenu());
    const run = await createRun();

    await menusService.processMenus(String(run._id));

    const updatedRun = await runModel.findById(run._id).lean();

    expect(updatedRun.lastProcessedId).toBe(String(raw._id));
    expect(updatedRun.processed).toBe(1);
  });

  it('resumes without processing checkpointed documents again', async () => {
    const first = await rawMenuModel.create(validRawMenu());

    const run = await createRun();
    await menusService.processMenus(String(run._id));

    const second = validRawMenu();
    second.payload.results[0].name = 'Updated Restaurant';

    await rawMenuModel.create(second);

    await menusService.processMenus(String(run._id));

    const updatedRun = await runModel.findById(run._id).lean();

    expect(updatedRun.processed).toBe(2);
    expect(updatedRun.lastProcessedId).not.toBe(String(first._id));

    expect(await restaurantModel.countDocuments()).toBe(1);
    expect(await categoryModel.countDocuments()).toBe(1);
    expect(await itemModel.countDocuments()).toBe(1);
  });
});
