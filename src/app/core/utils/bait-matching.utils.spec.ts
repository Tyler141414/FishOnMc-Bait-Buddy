import { speciesMatchesTargets } from './bait-matching.utils';

describe('speciesMatchesTargets', () => {
  it('does not match temperate perches when bait targets perches', () => {
    expect(speciesMatchesTargets({
      Species: 'Australian Bass',
      'Fish Group': 'Temperate Perches',
      Lifestyle: 'Demersal',
    }, ['Perches'])).toBeFalse();
  });

  it('matches perches and temperate perches as separate fish groups', () => {
    expect(speciesMatchesTargets({
      Species: 'Walleye',
      'Fish Group': 'Perches',
      Lifestyle: 'Benthopelagic',
    }, ['Perches'])).toBeTrue();

    expect(speciesMatchesTargets({
      Species: 'Golden Perch',
      'Fish Group': 'Temperate Perches',
      Lifestyle: 'Demersal',
    }, ['Temperate Perches'])).toBeTrue();
  });
});
