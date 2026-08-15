import {
  speciesBelongsToGroup,
  speciesMatchesTargets,
  targetsMatchGroup,
  targetsMatchSpeciesGroup,
} from './bait-matching.utils';

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

describe('speciesBelongsToGroup', () => {
  it('normalizes casing and whitespace when comparing a species group', () => {
    const species = { Species: 'Bluegill', 'Fish Group': 'Panfishes' };

    expect(speciesBelongsToGroup(species, '  PANFISHES  ')).toBeTrue();
  });

  it('does not match a different group', () => {
    const species = { Species: 'Largemouth Bass', 'Fish Group': 'Basses' };

    expect(speciesBelongsToGroup(species, 'Panfishes')).toBeFalse();
  });
});

describe('targetsMatchGroup', () => {
  it('matches a target to its group with normalized casing and whitespace', () => {
    expect(targetsMatchGroup(['  PANFISHES  '], 'Panfishes')).toBeTrue();
  });

  it('keeps similarly named target groups separate', () => {
    expect(targetsMatchGroup(['Perches'], 'Temperate Perches')).toBeFalse();
  });
});

describe('targetsMatchSpeciesGroup', () => {
  const species = [
    { Species: 'Bluegill', 'Fish Group': 'Panfishes' },
    { Species: 'Largemouth Bass', 'Fish Group': 'Basses' },
    { Species: 'Golden Perch', 'Fish Group': 'Temperate Perches' },
  ];

  it('matches a bait that targets a specific member of the selected group', () => {
    expect(targetsMatchSpeciesGroup(species, 'Panfishes', ['Bluegill'])).toBeTrue();
  });

  it('continues to match a bait that targets the selected group directly', () => {
    expect(targetsMatchSpeciesGroup(species, 'Panfishes', ['Panfishes'])).toBeTrue();
  });

  it('does not match a species target from another group', () => {
    expect(targetsMatchSpeciesGroup(species, 'Panfishes', ['Largemouth Bass'])).toBeFalse();
  });

  it('does not treat a broad lifestyle target as a specific group or species target', () => {
    const demersalSpecies = [
      { Species: 'Bluegill', 'Fish Group': 'Panfishes', Lifestyle: 'Demersal' },
    ];

    expect(targetsMatchSpeciesGroup(demersalSpecies, 'Panfishes', ['Demersal'])).toBeFalse();
  });

  it('keeps similarly named groups separate', () => {
    expect(targetsMatchSpeciesGroup(species, 'Temperate Perches', ['Perches'])).toBeFalse();
  });
});
