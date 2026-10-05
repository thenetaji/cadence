import { pushRecentSearch } from './recent-searches';

describe('pushRecentSearch', () => {
  it('adds newest first and dedupes ignoring case', () => {
    expect(pushRecentSearch(['rent', 'Swiggy'], 'swiggy')).toEqual(['swiggy', 'rent']);
  });
  it('caps at five and ignores blanks', () => {
    expect(pushRecentSearch(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(pushRecentSearch(['a'], '  ')).toEqual(['a']);
  });
});
