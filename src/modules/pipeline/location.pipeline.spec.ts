import { describe, expect, it } from 'vitest';
import { transformLocations } from './location.pipeline.js';

describe('transformLocations', () => {
  it('normalizes and deduplicates locations', () => {
    const result = transformLocations(
      [
        {
          location_id: 1468,
          location_name: ' Al Zaab ',
          location_slug: 'al-zaab',
        },
        {
          location_id: 1468,
          location_name: 'Al Zaab',
          location_slug: 'al-zaab',
        },
      ],
      'talabat',
    );

    expect(result).toEqual([
      {
        provider: 'talabat',
        providerLocationId: '1468',
        name: 'Al Zaab',
        slug: 'al-zaab',
      },
    ]);
  });
});
