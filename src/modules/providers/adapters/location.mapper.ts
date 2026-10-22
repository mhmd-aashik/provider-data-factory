export interface RawLocation {
  location_id: string | number;
  location_name: string;
  location_slug: string;
}

export interface NormalizedLocation {
  provider: string;
  providerLocationId: string;
  name: string;
  slug: string;
}

export function normalizeLocation(
  raw: RawLocation,
  provider: string,
): NormalizedLocation {
  return {
    provider,
    providerLocationId: String(raw.location_id),
    name: raw.location_name.trim(),
    slug: raw.location_slug.trim(),
  };
}
