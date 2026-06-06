import { Bait, LocationInfo, Species } from '../models/bait.models';
import { tokensOf } from './text.utils';

export function baitMatchesLocation(bait: Bait, location: LocationInfo, species: Species[]): boolean {
  return baitTypeMatchesLocation(bait, location)
    && species.length > 0
    && species.some((item) => speciesMatchesTargets(item, bait.targets || []));
}

export function baitTypeMatchesLocation(bait: Bait, location: LocationInfo): boolean {
  const type = (bait.type || '').toString();

  return type === 'Universal'
    || type === 'any'
    || type === location.waterType
    || type === location.name;
}

export function speciesMatchesTargets(species: Species, targets: string[]): boolean {
  if (targets.length === 0) {
    return true;
  }

  const nameTokens = tokensOf(species.Species || species.species);
  const groupTokens = tokensOf(species['Fish Group'] || species.fishGroup || species.group);
  const lifestyleTokens = tokensOf(species.Lifestyle || species.lifestyle);

  return targets.some((target) => {
    const targetTokens = tokensOf(target);

    if (targetTokens.length === 0) {
      return false;
    }

    return [nameTokens, groupTokens, lifestyleTokens]
      .some((fieldTokens) => targetTokens.every((token) => fieldTokens.includes(token)));
  });
}
