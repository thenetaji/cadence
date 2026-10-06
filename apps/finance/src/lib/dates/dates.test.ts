import { addDays, addMonths, diffDays, toDateKey, weekday, keyToLocalMs, listDays } from './keys';
import { customPeriod, dayLabel, fullDayLabel, nextPeriod, periodFor, periodLabel, previousPeriod, recentMonthPeriods } from './periods';

describe('date keys', () => {
  it('formats local dates', () => {
    expect(toDateKey(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(toDateKey(keyToLocalMs('2026-03-08', 9))).toBe('2026-03-08');
  });
  it('does arithmetic across month and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
    expect(diffDays('2026-02-28', '2026-03-01')).toBe(1);
    expect(listDays('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
  it('computes ISO weekdays', () => {
    expect(weekday('2026-10-05')).toBe(1);
    expect(weekday('2026-10-11')).toBe(7);
  });
});

describe('periods', () => {
  it('weeks honour week_start', () => {
    expect(periodFor('week', '2026-10-08', { weekStart: 1, monthStart: 1 })).toEqual({ type: 'week', from: '2026-10-05', to: '2026-10-11' });
    expect(periodFor('week', '2026-10-08', { weekStart: 7, monthStart: 1 })).toEqual({ type: 'week', from: '2026-10-04', to: '2026-10-10' });
    expect(periodFor('week', '2026-10-04', { weekStart: 7, monthStart: 1 }).from).toBe('2026-10-04');
    expect(periodFor('week', '2026-10-04', { weekStart: 1, monthStart: 1 }).from).toBe('2026-09-28');
  });

  it('months honour month_start', () => {
    const s = { weekStart: 1, monthStart: 15 };
    expect(periodFor('month', '2026-10-20', s)).toEqual({ type: 'month', from: '2026-10-15', to: '2026-11-14' });
    expect(periodFor('month', '2026-10-05', s)).toEqual({ type: 'month', from: '2026-09-15', to: '2026-10-14' });
    expect(periodFor('month', '2026-02-10', { weekStart: 1, monthStart: 1 })).toEqual({ type: 'month', from: '2026-02-01', to: '2026-02-28' });
    expect(periodFor('month', '2027-01-03', { weekStart: 1, monthStart: 28 })).toEqual({ type: 'month', from: '2026-12-28', to: '2027-01-27' });
  });

  it('years and custom ranges', () => {
    expect(periodFor('year', '2026-10-05')).toEqual({ type: 'year', from: '2026-01-01', to: '2026-12-31' });
    expect(customPeriod('2026-02-01', '2026-01-01')).toEqual({ type: 'custom', from: '2026-01-01', to: '2026-02-01' });
  });

  it('steps to previous and next periods', () => {
    const month = periodFor('month', '2026-03-10');
    expect(previousPeriod(month)).toEqual({ type: 'month', from: '2026-02-01', to: '2026-02-28' });
    expect(nextPeriod(month)).toEqual({ type: 'month', from: '2026-04-01', to: '2026-04-30' });
    const shifted = periodFor('month', '2026-10-20', { weekStart: 1, monthStart: 15 });
    expect(nextPeriod(shifted)).toEqual({ type: 'month', from: '2026-11-15', to: '2026-12-14' });
    expect(previousPeriod(periodFor('week', '2026-10-05'))).toEqual({ type: 'week', from: '2026-09-28', to: '2026-10-04' });
    expect(nextPeriod(periodFor('year', '2026-10-05'))).toEqual({ type: 'year', from: '2027-01-01', to: '2027-12-31' });
    expect(previousPeriod(customPeriod('2026-10-01', '2026-10-10'))).toEqual({ type: 'custom', from: '2026-09-21', to: '2026-09-30' });
    expect(nextPeriod(customPeriod('2026-10-01', '2026-10-10'))).toEqual({ type: 'custom', from: '2026-10-11', to: '2026-10-20' });
  });

  it('labels periods', () => {
    expect(periodLabel(periodFor('month', '2026-10-05'))).toBe('October 2026');
    expect(periodLabel(periodFor('week', '2026-10-08'))).toBe('Week of 5 Oct');
    expect(periodLabel(periodFor('year', '2026-10-05'))).toBe('2026');
    expect(periodLabel(periodFor('month', '2026-10-20', { weekStart: 1, monthStart: 15 }))).toBe('15 Oct – 14 Nov');
    expect(periodLabel(customPeriod('2026-10-01', '2026-10-10'))).toBe('1 Oct – 10 Oct 2026');
    expect(periodLabel(customPeriod('2025-12-01', '2026-01-10'))).toBe('1 Dec 2025 – 10 Jan 2026');
  });

  it('labels days', () => {
    expect(dayLabel('2026-10-05', '2026-10-05')).toBe('Today');
    expect(dayLabel('2026-10-04', '2026-10-05')).toBe('Yesterday');
    expect(dayLabel('2026-10-03', '2026-10-05')).toBe('Sat 3 Oct');
    expect(fullDayLabel('2026-10-05')).toBe('Mon 5 Oct 2026');
  });

  it('lists recent month periods newest first', () => {
    const list = recentMonthPeriods('2026-10-05', 3);
    expect(list.map((p) => p.from)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01']);
  });
});
