import { categoryIconNames } from '@/components/app/symbolFallbacks';
import { filterIcons, iconWords } from './icons';

describe('category icons', () => {
  it('splits names into search words without "fill"', () => {
    expect(iconWords('cart.fill')).toEqual(['cart']);
    expect(iconWords('takeoutbag.and.cup.and.straw.fill')).toEqual(['takeoutbag', 'and', 'cup', 'and', 'straw']);
  });

  it('returns the whole curated set for an empty query', () => {
    expect(filterIcons('')).toEqual([...categoryIconNames]);
  });

  it('matches every typed word', () => {
    expect(filterIcons('car')).toContain('car.fill');
    expect(filterIcons('cup straw')).toEqual(['takeoutbag.and.cup.and.straw.fill']);
    expect(filterIcons('zzzz')).toEqual([]);
  });

  it('keeps a non-curated current icon first', () => {
    expect(filterIcons('', 'moon.stars')[0]).toBe('moon.stars');
    expect(filterIcons('car', 'moon.stars')).not.toContain('moon.stars');
  });

  it('offers about 70 curated icons', () => {
    expect(categoryIconNames.length).toBeGreaterThanOrEqual(60);
  });
});
