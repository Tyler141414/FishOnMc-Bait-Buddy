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

  const labels = [
    species.Species || species.species,
    species['Fish Group'] || species.fishGroup || species.group,
    species.Lifestyle || species.lifestyle,
  ].flatMap(labelVariants);

  return targets.some((target) => {
    const targetLabels = labelVariants(target);

    if (targetLabels.length === 0) {
      return false;
    }

    return targetLabels.some((targetLabel) => labels.includes(targetLabel));
  });
}

function labelVariants(value: unknown): string[] {
  const normalized = tokensOf(value).join(' ');

  if (!normalized) {
    return [];
  }

  const singularized = normalized
    .split(' ')
    .map((token) => token.endsWith('s') ? token.slice(0, -1) : token)
    .join(' ');

  return singularized === normalized ? [normalized] : [normalized, singularized];
}
