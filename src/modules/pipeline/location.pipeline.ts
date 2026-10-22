import {
  normalizeLocation,
  type NormalizedLocation,
  type RawLocation,
} from '../providers/adapters/location.mapper.js';

export function transformLocations(
  input: unknown[],
  provider: string,
): NormalizedLocation[] {
  const unique = new Map<string, NormalizedLocation>();

  for (const value of input) {
    if (!isRawLocation(value)) {
      continue;
    }

    const location = normalizeLocation(value, provider);

    if (!location.providerLocationId || !location.name || !location.slug) {
      continue;
    }

    const key = `${location.provider}:${location.providerLocationId}`;

    unique.set(key, location);
  }

  return [...unique.values()];
}

function isRawLocation(value: unknown): value is RawLocation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    (typeof item.location_id === 'string' ||
      typeof item.location_id === 'number') &&
    typeof item.location_name === 'string' &&
    typeof item.location_slug === 'string'
  );
}
