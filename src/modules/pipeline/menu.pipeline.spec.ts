import { describe, expect, it } from 'vitest';
import { transformMenus } from './menu.pipeline.js';

const provider = 'xbyte';

const restaurantUrl = 'https://www.talabat.com/uae/restaurant/648607/example';

const validRestaurant = {
  id: 1001,
  name: 'Test Restaurant',
  logo: 'https://example.com/logo.png',
  category: [
    {
      category_id: 10,
      category_name: 'Burgers',
      items: [
        {
          item_id: 101,
          item_name: 'Cheese Burger',
          description: 'Beef burger with cheese',
          price: 25,
          rating: 4.5,
          image: 'https://example.com/burger.png',
        },
      ],
    },
  ],
};

describe('transformMenus', () => {
  it('should transform a valid restaurant', () => {
    const result = transformMenus([validRestaurant], provider, restaurantUrl);

    expect(result.errors).toHaveLength(0);
    expect(result.restaurants).toHaveLength(1);
    expect(result.categories).toHaveLength(1);
    expect(result.items).toHaveLength(1);
  });

  it('should use the restaurant ID from the URL', () => {
    const result = transformMenus([validRestaurant], provider, restaurantUrl);

    expect(result.restaurants[0]?.providerRestaurantId).toBe('648607');

    expect(result.items[0]?.providerRestaurantId).toBe('648607');
  });

  it('should remove duplicate menu items', () => {
    const duplicatedRestaurant = {
      ...validRestaurant,
      category: [
        {
          category_id: 10,
          category_name: 'Burgers',
          items: [
            validRestaurant.category[0].items[0],
            validRestaurant.category[0].items[0],
          ],
        },
      ],
    };

    const result = transformMenus(
      [duplicatedRestaurant],
      provider,
      restaurantUrl,
    );

    expect(result.items).toHaveLength(1);
  });

  it('should handle empty input', () => {
    const result = transformMenus([], provider, restaurantUrl);

    expect(result.restaurants).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
    expect(result.items).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should quarantine an invalid restaurant', () => {
    const result = transformMenus([{ name: '' }], provider, restaurantUrl);

    expect(result.restaurants).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should deduplicate identical restaurant records', () => {
    const result = transformMenus(
      [validRestaurant, validRestaurant],
      provider,
      restaurantUrl,
    );

    expect(result.restaurants).toHaveLength(1);
    expect(result.categories).toHaveLength(1);
    expect(result.items).toHaveLength(1);
  });
});
