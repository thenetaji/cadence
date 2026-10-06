import { cadenceSummary } from './cadence';

const base = { interval: 1, anchorDay: null, startDate: '2026-03-05' } as const;

describe('cadenceSummary', () => {
  it('summarises monthly rules by day of month', () => {
    expect(cadenceSummary({ ...base, frequency: 'monthly', anchorDay: 5 })).toBe('Monthly · 5th');
    expect(cadenceSummary({ ...base, frequency: 'monthly', anchorDay: 22 })).toBe('Monthly · 22nd');
    expect(cadenceSummary({ ...base, frequency: 'monthly', interval: 3, anchorDay: 1 })).toBe('Every 3 months · 1st');
  });
  it('summarises weekly rules by weekday', () => {
    expect(cadenceSummary({ ...base, frequency: 'weekly', interval: 2, anchorDay: 1 })).toBe('Every 2 weeks · Mon');
    expect(cadenceSummary({ ...base, frequency: 'weekly', anchorDay: 7 })).toBe('Weekly · Sun');
  });
  it('falls back to the start date when there is no anchor', () => {
    expect(cadenceSummary({ ...base, frequency: 'weekly' })).toBe('Weekly · Thu');
    expect(cadenceSummary({ ...base, frequency: 'monthly' })).toBe('Monthly · 5th');
  });
  it('summarises daily and yearly rules', () => {
    expect(cadenceSummary({ ...base, frequency: 'daily' })).toBe('Daily');
    expect(cadenceSummary({ ...base, frequency: 'daily', interval: 2 })).toBe('Every 2 days');
    expect(cadenceSummary({ ...base, frequency: 'yearly' })).toBe('Yearly · 5 Mar');
    expect(cadenceSummary({ ...base, frequency: 'yearly', interval: 2 })).toBe('Every 2 years · 5 Mar');
  });
});
