export interface RawMenuItem {
  item_id?: unknown;
  item_name?: unknown;
  description?: unknown;
  price?: unknown;
  rating?: unknown;
  image?: unknown;
}

export interface NormalizedMenuItem {
  provider: string;
  providerRestaurantId: string;
  providerCategoryId: string;
  providerItemId: string;
  name: string;
  description?: string;
  price?: number;
  rating?: number;
  image?: string;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim() || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value !== 'string' && typeof value !== 'number')
  ) {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
}

export function mapMenuItem(
  input: RawMenuItem,
  provider: string,
  restaurantId: string,
  categoryId: string,
): NormalizedMenuItem | null {
  const itemId = input.item_id;
  const name = optionalString(input.item_name);

  if (
    (typeof itemId !== 'number' && typeof itemId !== 'string') ||
    !name ||
    !provider.trim() ||
    !restaurantId.trim() ||
    !categoryId.trim()
  ) {
    return null;
  }

  const id = String(itemId).trim();

  if (!id) {
    return null;
  }

  return {
    provider,
    providerRestaurantId: restaurantId,
    providerCategoryId: categoryId,
    providerItemId: id,
    name,
    description: optionalString(input.description),
    price: optionalNumber(input.price),
    rating: optionalNumber(input.rating),
    image: optionalString(input.image),
  };
}
