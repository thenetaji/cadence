/** @jest-environment node */
import { createTestDb } from '../test-helpers';
import { deleteRate, convert, getRate, listRates, setRate } from './fx';
import { DEFAULT_SETTINGS, getAllSettings, getSetting, SETTING_KEYS, setSetting } from './settings';
import { categories, settings } from '../schema';
import { seedDefaults } from '../seed';

describe('settings', () => {
  it('defines a default for every spec key', () => {
    expect(SETTING_KEYS.sort()).toEqual(
      ['display_currency', 'theme', 'haptics', 'show_decimals', 'week_start', 'month_start', 'default_account_id', 'lock_enabled', 'lock_timeout_s', 'last_kind', 'last_account_id', 'onboarding_done', 'schema_seeded', 'recent_searches'].sort(),
    );
  });

  it('round-trips typed values and falls back to defaults', () => {
    const db = createTestDb({ seed: false });
    expect(getSetting(db, 'week_start')).toBe(1);
    expect(getSetting(db, 'recent_searches')).toEqual([]);
    setSetting(db, 'week_start', 7);
    setSetting(db, 'recent_searches', ['swiggy', '340']);
    setSetting(db, 'default_account_id', 'abc');
    setSetting(db, 'week_start', 1);
    expect(getSetting(db, 'week_start')).toBe(1);
    expect(getSetting(db, 'recent_searches')).toEqual(['swiggy', '340']);
    expect(getAllSettings(db)).toEqual({ ...DEFAULT_SETTINGS, recent_searches: ['swiggy', '340'], default_account_id: 'abc' });
  });

  it('survives corrupt stored JSON', () => {
    const db = createTestDb({ seed: false });
    db.insert(settings).values({ key: 'theme', value: '{oops' }).run();
    expect(getSetting(db, 'theme')).toBe('system');
  });

  it('seeds idempotently without clobbering user changes', () => {
    const db = createTestDb();
    setSetting(db, 'theme', 'dark');
    seedDefaults(db);
    seedDefaults(db);
    expect(getSetting(db, 'theme')).toBe('dark');
    expect(getSetting(db, 'schema_seeded')).toBe(true);
    expect(db.select().from(categories).all()).toHaveLength(19);
    expect(db.select().from(settings).all()).toHaveLength(SETTING_KEYS.length);
  });
});

describe('fx', () => {
  it('stores rates, upserts, converts for display and handles the inverse', () => {
    const db = createTestDb();
    expect(getRate(db, 'USD', 'INR')).toBeNull();
    setRate(db, 'USD', 'INR', 83.2, 1);
    setRate(db, 'USD', 'INR', 84, 2);
    expect(listRates(db)).toEqual([{ base: 'USD', quote: 'INR', rate: 84, updatedAt: 2 }]);
    expect(convert(db, 1000, 'USD', 'INR')).toBe(84000);
    expect(getRate(db, 'INR', 'USD')).toBeCloseTo(1 / 84, 10);
    expect(convert(db, 8400, 'INR', 'USD')).toBe(100);
    expect(convert(db, 500, 'EUR', 'INR')).toBe(500);
    expect(convert(db, 500, 'INR', 'INR')).toBe(500);
    deleteRate(db, 'USD', 'INR');
    expect(getRate(db, 'USD', 'INR')).toBeNull();
  });

  it('rejects non-positive rates', () => {
    const db = createTestDb();
    expect(() => setRate(db, 'USD', 'INR', 0)).toThrow(RangeError);
    expect(() => setRate(db, 'USD', 'INR', Number.NaN)).toThrow(RangeError);
  });
});
