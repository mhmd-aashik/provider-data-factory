import {
  mapRestaurantDetail,
  type RawRestaurantDetail,
  type NormalizedRestaurantDetail,
} from '../providers/adapters/restaurant-detail.mapper.js';

import {
  mapMenuCategory,
  type RawMenuCategory,
  type NormalizedMenuCategory,
} from '../providers/adapters/menu-category.mapper.js';

import {
  mapMenuItem,
  type RawMenuItem,
  type NormalizedMenuItem,
} from '../providers/adapters/menu-item.mapper.js';

export interface MenuPipelineError {
  stage: 'restaurant' | 'category' | 'item';
  reason: string;
  index: number;
  record: unknown;
}

export interface MenuPipelineResult {
  restaurants: NormalizedRestaurantDetail[];
  categories: NormalizedMenuCategory[];
  items: NormalizedMenuItem[];
  errors: MenuPipelineError[];
}

export function transformMenus(
  input: unknown[],
  provider: string,
  restaurantUrl: string,
): MenuPipelineResult {
  const restaurants = new Map<string, NormalizedRestaurantDetail>();
  const categories = new Map<string, NormalizedMenuCategory>();
  const items = new Map<string, NormalizedMenuItem>();
  const errors: MenuPipelineError[] = [];

  for (const [restaurantIndex, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({
        stage: 'restaurant',
        reason: 'Restaurant must be an object',
        index: restaurantIndex,
        record: raw,
      });
      continue;
    }

    const restaurantData = raw as RawRestaurantDetail;

    const restaurant = mapRestaurantDetail(
      restaurantData,
      provider,
      restaurantUrl,
    );

    if (!restaurant) {
      errors.push({
        stage: 'restaurant',
        reason: 'Invalid restaurant details or restaurant URL',
        index: restaurantIndex,
        record: raw,
      });
      continue;
    }

    const restaurantKey = [
      restaurant.provider,
      restaurant.providerRestaurantId,
    ].join(':');

    restaurants.set(restaurantKey, restaurant);

    if (!Array.isArray(restaurantData.category)) {
      errors.push({
        stage: 'category',
        reason: 'Restaurant category field must be an array',
        index: restaurantIndex,
        record: restaurantData.category,
      });
      continue;
    }

    for (const [
      categoryIndex,
      rawCategory,
    ] of restaurantData.category.entries()) {
      if (
        !rawCategory ||
        typeof rawCategory !== 'object' ||
        Array.isArray(rawCategory)
      ) {
        errors.push({
          stage: 'category',
          reason: 'Category must be an object',
          index: categoryIndex,
          record: rawCategory,
        });
        continue;
      }

      const categoryData = rawCategory as RawMenuCategory;

      const category = mapMenuCategory(
        categoryData,
        provider,
        restaurant.providerRestaurantId,
      );

      if (!category) {
        errors.push({
          stage: 'category',
          reason: 'Invalid category ID or name',
          index: categoryIndex,
          record: rawCategory,
        });
        continue;
      }

      const categoryKey = [
        category.provider,
        category.providerRestaurantId,
        category.providerCategoryId,
      ].join(':');

      categories.set(categoryKey, category);

      if (!Array.isArray(categoryData.items)) {
        errors.push({
          stage: 'item',
          reason: 'Category items field must be an array',
          index: categoryIndex,
          record: categoryData.items,
        });
        continue;
      }

      for (const [itemIndex, rawItem] of categoryData.items.entries()) {
        if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
          errors.push({
            stage: 'item',
            reason: 'Menu item must be an object',
            index: itemIndex,
            record: rawItem,
          });
          continue;
        }

        const item = mapMenuItem(
          rawItem as RawMenuItem,
          provider,
          restaurant.providerRestaurantId,
          category.providerCategoryId,
        );

        if (!item) {
          errors.push({
            stage: 'item',
            reason: 'Invalid menu item ID or name',
            index: itemIndex,
            record: rawItem,
          });
          continue;
        }

        const itemKey = [
          item.provider,
          item.providerRestaurantId,
          item.providerCategoryId,
          item.providerItemId,
        ].join(':');

        items.set(itemKey, item);
      }
    }
  }

  return {
    restaurants: [...restaurants.values()],
    categories: [...categories.values()],
    items: [...items.values()],
    errors,
  };
}
