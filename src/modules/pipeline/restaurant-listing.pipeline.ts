import {
  mapRestaurantListing,
  type RawRestaurantListing,
  type NormalizedRestaurantListing,
} from '../providers/adapters/restaurant-listing.mapper.js';

export interface RestaurantListingPipelineResult {
  valid: NormalizedRestaurantListing[];
  invalid: Array<{
    index: number;
    reason: string;
    record: unknown;
  }>;
}

export function transformRestaurantListings(
  input: unknown[],
  provider: string,
  locationId: string,
): RestaurantListingPipelineResult {
  const valid = new Map<string, NormalizedRestaurantListing>();
  const invalid: RestaurantListingPipelineResult['invalid'] = [];

  for (const [index, record] of input.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      invalid.push({
        index,
        reason: 'Restaurant listing must be an object',
        record,
      });
      continue;
    }

    const mapped = mapRestaurantListing(
      record as RawRestaurantListing,
      provider,
      locationId,
    );

    if (!mapped) {
      invalid.push({
        index,
        reason: 'Invalid restaurant name, URL, or location ID',
        record,
      });
      continue;
    }

    const key = [
      mapped.provider,
      mapped.providerRestaurantId,
      mapped.providerLocationId,
    ].join(':');

    valid.set(key, mapped);
  }

  return {
    valid: [...valid.values()],
    invalid,
  };
}
