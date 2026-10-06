import { anchorLabel, anchorOptions, budgetStatus, daysLeft, defaultAnchor, displayName, editableName, ordinal, paceMarker, perDayLeft, periodCaption } from './logic';

const october = { from: '2026-10-01', to: '2026-10-31' };

describe('budgetStatus', () => {
  it('is ok below 90%', () => {
    expect(budgetStatus(8999, 10000)).toBe('ok');
    expect(budgetStatus(0, 10000)).toBe('ok');
  });
  it('warns from 90% up to and including the limit', () => {
    expect(budgetStatus(9000, 10000)).toBe('warning');
    expect(budgetStatus(10000, 10000)).toBe('warning');
  });
  it('is over only past the limit', () => {
    expect(budgetStatus(10001, 10000)).toBe('over');
  });
  it('tolerates a zero amount', () => {
    expect(budgetStatus(500, 0)).toBe('ok');
  });
});

describe('daysLeft and perDayLeft', () => {
  it('counts today', () => {
    expect(daysLeft(october, '2026-10-05')).toBe(27);
    expect(daysLeft(october, '2026-10-31')).toBe(1);
  });
  it('spans the whole period before it starts and is 0 after it ends', () => {
    expect(daysLeft(october, '2026-09-20')).toBe(31);
    expect(daysLeft(october, '2026-11-01')).toBe(0);
  });
  it('divides what is left by the days left, rounding down', () => {
    expect(perDayLeft(1760000, october, '2026-10-05')).toBe(65185);
    expect(perDayLeft(10000, october, '2026-10-31')).toBe(10000);
  });
  it('is 0 when over budget or out of days', () => {
    expect(perDayLeft(-500, october, '2026-10-05')).toBe(0);
    expect(perDayLeft(500, october, '2026-11-02')).toBe(0);
  });
});

describe('labels', () => {
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 28].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '28th']);
  });
  it('labels anchors per period', () => {
    expect(anchorLabel('weekly', 1)).toBe('Monday');
    expect(anchorLabel('monthly', 5)).toBe('5th');
    expect(anchorLabel('yearly', 4)).toBe('April');
    expect(anchorOptions('weekly')).toHaveLength(7);
    expect(anchorOptions('monthly')).toHaveLength(28);
    expect(anchorOptions('yearly')).toHaveLength(12);
  });
  it('defaults the anchor from settings', () => {
    expect(defaultAnchor('weekly', { weekStart: 7, monthStart: 3 })).toBe(7);
    expect(defaultAnchor('monthly', { weekStart: 7, monthStart: 3 })).toBe(3);
    expect(defaultAnchor('yearly', { weekStart: 7, monthStart: 3 })).toBe(1);
  });
  it('shows categories for generic names only', () => {
    expect(displayName({ name: 'Monthly budget', scope: 'categories' }, ['Groceries'])).toBe('Groceries');
    expect(displayName({ name: 'Monthly budget', scope: 'categories' }, ['Groceries', 'Food', 'Bills'])).toBe('Groceries +2');
    expect(displayName({ name: 'Eating out', scope: 'categories' }, ['Food'])).toBe('Eating out');
    expect(displayName({ name: 'Monthly budget', scope: 'all' }, [])).toBe('Monthly budget');
    expect(editableName({ name: 'Monthly budget' })).toBe('');
    expect(editableName({ name: 'Eating out' })).toBe('Eating out');
  });
});

describe('pace marker and caption', () => {
  it('places today in the middle of its day', () => {
    expect(paceMarker(october, '2026-10-01')).toBeCloseTo(0.5 / 31);
    expect(paceMarker(october, '2026-10-16')).toBeCloseTo(15.5 / 31);
    expect(paceMarker(october, '2026-11-01')).toBeUndefined();
    expect(paceMarker(october, '2026-09-30')).toBeUndefined();
  });
  it('names the month once it is not current', () => {
    expect(periodCaption('monthly', october, true)).toBe('This month');
    expect(periodCaption('monthly', { from: '2026-09-01', to: '2026-09-30' }, false)).toBe('September');
    expect(periodCaption('yearly', { from: '2025-01-01', to: '2025-12-31' }, false)).toBe('2025');
  });
});
