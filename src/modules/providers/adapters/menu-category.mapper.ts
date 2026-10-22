export interface RawMenuCategory {
  category_id?: unknown;
  category_name?: unknown;
  items?: unknown;
}

export interface NormalizedMenuCategory {
  provider: string;
  providerRestaurantId: string;
  providerCategoryId: string;
  name: string;
}

export function mapMenuCategory(
  input: RawMenuCategory,
  provider: string,
  restaurantId: string,
): NormalizedMenuCategory | null {
  const categoryId = input.category_id;
  const categoryName = input.category_name;

  if (
    (typeof categoryId !== 'number' && typeof categoryId !== 'string') ||
    typeof categoryName !== 'string'
  ) {
    return null;
  }

  const id = String(categoryId).trim();
  const name = categoryName.trim();

  if (!id || !name || !provider.trim() || !restaurantId.trim()) {
    return null;
  }

  return {
    provider,
    providerRestaurantId: restaurantId,
    providerCategoryId: id,
    name,
  };
}
