import { balanceLine, initials, outstandingIn } from './model';

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Rahul Sharma')).toBe('RS');
    expect(initials('rahul')).toBe('R');
    expect(initials('  anna  maria  de souza ')).toBe('AS');
    expect(initials('')).toBe('?');
  });
});

describe('balanceLine', () => {
  it('words the direction and keeps mint for what is owed to you', () => {
    expect(balanceLine([{ currency: 'INR', amount: 240000 }], { locale: 'en-IN', decimals: 0 })).toEqual({ text: 'owes you ₹2,400', tone: 'income' });
    expect(balanceLine([{ currency: 'INR', amount: -80000 }], { locale: 'en-IN', decimals: 0 })).toEqual({ text: 'you owe ₹800', tone: 'secondary' });
  });

  it('joins several currencies and reads settled', () => {
    const line = balanceLine([{ currency: 'INR', amount: 100000 }, { currency: 'USD', amount: -500 }], { locale: 'en-IN' });
    expect(line.text).toBe('owes you ₹1,000.00 · you owe $5.00');
    expect(balanceLine([]).text).toBe('settled');
  });

  it('finds the outstanding amount in a currency', () => {
    expect(outstandingIn([{ currency: 'INR', amount: -700 }], 'INR')).toBe(700);
    expect(outstandingIn([{ currency: 'INR', amount: -700 }], 'USD')).toBe(0);
  });
});
