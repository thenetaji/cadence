import { nextDueDate, occurrencesBetween, defaultAnchorDay, type RecurrenceRule } from './next-due';
import { weekday } from '../dates';

const rule = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: 'monthly',
  interval: 1,
  anchorDay: null,
  startDate: '2026-01-31',
  ...over,
});

describe('nextDueDate', () => {
  it('advances daily and weekly by interval', () => {
    expect(nextDueDate(rule({ frequency: 'daily', interval: 3 }), '2026-02-27')).toBe('2026-03-02');
    expect(nextDueDate(rule({ frequency: 'weekly', interval: 2 }), '2026-10-05')).toBe('2026-10-19');
  });

  it('clamps a 31st anchor to short months and returns to the 31st', () => {
    const r = rule({ anchorDay: 31 });
    const seen: string[] = [];
    let due = '2026-01-31';
    for (let i = 0; i < 5; i++) {
      due = nextDueDate(r, due);
      seen.push(due);
    }
    expect(seen).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
  });

  it('clamps to Feb 29 in leap years', () => {
    expect(nextDueDate(rule({ anchorDay: 31 }), '2028-01-31')).toBe('2028-02-29');
    expect(nextDueDate(rule({ anchorDay: 30 }), '2028-01-30')).toBe('2028-02-29');
  });

  it('derives the anchor from the start date when missing', () => {
    expect(nextDueDate(rule({ anchorDay: null, startDate: '2026-01-30' }), '2026-02-28')).toBe('2026-03-30');
  });

  it('supports monthly intervals across years', () => {
    expect(nextDueDate(rule({ anchorDay: 15, interval: 3 }), '2026-11-15')).toBe('2027-02-15');
  });

  it('handles Feb 29 yearly rules', () => {
    const r = rule({ frequency: 'yearly', startDate: '2024-02-29' });
    expect(nextDueDate(r, '2024-02-29')).toBe('2025-02-28');
    expect(nextDueDate(r, '2027-02-28')).toBe('2028-02-29');
    expect(nextDueDate(rule({ frequency: 'yearly', interval: 4, startDate: '2024-02-29' }), '2024-02-29')).toBe('2028-02-29');
  });

  it('treats interval below 1 as 1', () => {
    expect(nextDueDate(rule({ frequency: 'daily', interval: 0 }), '2026-01-01')).toBe('2026-01-02');
  });
});

describe('occurrencesBetween', () => {
  it('respects until, endDate and limit', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-01-01' });
    expect(occurrencesBetween(r, '2026-01-01', '2026-01-04')).toHaveLength(4);
    expect(occurrencesBetween(r, '2026-01-01', '2026-01-10', { endDate: '2026-01-02' })).toEqual(['2026-01-01', '2026-01-02']);
    expect(occurrencesBetween(r, '2026-01-01', '2027-01-01', { limit: 5 })).toHaveLength(5);
  });
  it('derives default anchors', () => {
    expect(defaultAnchorDay('weekly', '2026-10-05', weekday)).toBe(1);
    expect(defaultAnchorDay('monthly', '2026-10-31', weekday)).toBe(31);
    expect(defaultAnchorDay('daily', '2026-10-31', weekday)).toBeNull();
  });
});
