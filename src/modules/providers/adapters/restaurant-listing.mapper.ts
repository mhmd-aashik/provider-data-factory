export interface RawRestaurantListing {
  area_name?: unknown;
  restaurant_name?: unknown;
  restaurant_url?: unknown;
}

export interface NormalizedRestaurantListing {
  provider: string;
  providerRestaurantId: string;
  providerLocationId: string;
  name: string;
}

export function mapRestaurantListing(
  input: RawRestaurantListing,
  provider: string,
  locationId: string,
): NormalizedRestaurantListing | null {
  if (
    typeof input.restaurant_name !== 'string' ||
    typeof input.restaurant_url !== 'string'
  ) {
    return null;
  }

  let restaurantId: string | undefined;

  try {
    const url = new URL(input.restaurant_url);

    if (
      url.protocol !== 'https:' ||
      !['talabat.com', 'www.talabat.com'].includes(url.hostname)
    ) {
      return null;
    }

    const match = url.pathname.match(/^\/[^/]+\/restaurant\/(\d+)(?:\/|$)/);

    restaurantId = match?.[1];
  } catch {
    return null;
  }

  const name = input.restaurant_name.trim();

  if (!restaurantId || !name || !locationId.trim()) {
    return null;
  }

  return {
    provider,
    providerRestaurantId: restaurantId,
    providerLocationId: locationId,
    name,
  };
}
