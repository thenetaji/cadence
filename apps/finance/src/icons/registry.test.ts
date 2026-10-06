import { categoryIconNames, symbolFallbacks } from '@/components/app/symbolFallbacks';

import { conceptMeta } from './generated/concepts';
import { conceptFor, FALLBACK_CONCEPT, iconXml, isKnownIcon, sfSymbolFor } from './registry';
import { ICON_STYLES } from './types';

describe('icon registry', () => {
  it('curates a broad concept list', () => {
    expect(conceptMeta.length).toBeGreaterThanOrEqual(200);
  });

  it('has artwork for every concept in every svg style', () => {
    for (const style of ICON_STYLES.filter((s) => s !== 'sf')) {
      for (const c of conceptMeta) {
        const xml = iconXml(style, c.id);
        expect(xml).toContain('<svg');
        expect(xml.length).toBeGreaterThan(80);
      }
    }
  });

  it('resolves every legacy SF Symbol and fallback name to a concept', () => {
    for (const name of [...Object.keys(symbolFallbacks), ...categoryIconNames]) {
      expect(isKnownIcon(name)).toBe(true);
    }
  });

  it('resolves seeded category and account icons', () => {
    expect(conceptFor('fork.knife')).toBe('food');
    expect(conceptFor('cart.fill')).toBe('groceries');
    expect(conceptFor('building.columns.fill')).toBe('bank');
    expect(conceptFor('banknote')).toBe('cash');
    expect(conceptFor('groceries')).toBe('groceries');
  });

  it('falls back to a tag for unknown names', () => {
    expect(conceptFor('definitely.not.a.symbol')).toBe(FALLBACK_CONCEPT);
    expect(conceptFor('')).toBe(FALLBACK_CONCEPT);
    expect(sfSymbolFor('definitely.not.a.symbol')).toBe('tag.fill');
  });

  it('keeps SF names and maps concept ids to symbols', () => {
    expect(sfSymbolFor('cart.fill')).toBe('cart.fill');
    expect(sfSymbolFor('groceries')).toBe('cart.fill');
  });

  it('recolours the duotone layer', () => {
    const plain = iconXml('phosphor-duotone', 'food');
    const tinted = iconXml('phosphor-duotone', 'food', '#ff0000', 0.9);
    expect(plain).toContain('opacity=".2"');
    expect(tinted).toContain('fill="#ff0000" opacity="0.9"');
  });
});
