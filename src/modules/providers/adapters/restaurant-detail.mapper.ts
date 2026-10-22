export interface RawRestaurantDetail {
  id?: unknown;
  name?: unknown;
  logo?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  rate?: unknown;
  totalReviews?: unknown;
  totalRatings?: unknown;
  deliveryFee?: unknown;
  DeliveryTime?: unknown;
  'Minimum Order'?: unknown;
  'Restaurant Address'?: unknown;
  City?: unknown;
  Contact?: unknown;
  outletCode?: unknown;
  category?: unknown;
}

export interface NormalizedRestaurantDetail {
  provider: string;
  providerRestaurantId: string;
  outletCode?: string;
  name: string;
  logo?: string;
  city?: string;
  address?: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  totalReviews?: number;
  totalRatings?: number;
  deliveryFee?: number;
  minimumOrder?: number;
  deliveryTime?: string;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const result = String(value).trim();
  return result || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : undefined;
}

export function mapRestaurantDetail(
  input: RawRestaurantDetail,
  provider: string,
  restaurantUrl: string,
): NormalizedRestaurantDetail | null {
  let providerRestaurantId: string | undefined;

  try {
    const url = new URL(restaurantUrl);

    if (
      url.protocol !== 'https:' ||
      !['talabat.com', 'www.talabat.com'].includes(url.hostname)
    ) {
      return null;
    }

    providerRestaurantId = url.pathname.match(
      /^\/[^/]+\/restaurant\/(\d+)(?:\/|$)/,
    )?.[1];
  } catch {
    return null;
  }

  const name = optionalString(input.name);

  if (!providerRestaurantId || !name || !provider.trim()) {
    return null;
  }

  return {
    provider,
    providerRestaurantId,
    outletCode: optionalString(input.outletCode),
    name,
    logo: optionalString(input.logo),
    city: optionalString(input.City),
    address: optionalString(input['Restaurant Address']),
    contact: optionalString(input.Contact),
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    rating: optionalNumber(input.rate),
    totalReviews: optionalNumber(input.totalReviews),
    totalRatings: optionalNumber(input.totalRatings),
    deliveryFee: optionalNumber(input.deliveryFee),
    minimumOrder: optionalNumber(input['Minimum Order']),
    deliveryTime: optionalString(input.DeliveryTime),
  };
}
