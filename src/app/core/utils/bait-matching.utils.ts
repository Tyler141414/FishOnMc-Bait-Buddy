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

  return targets.some((target) => hasMatchingLabel(target, labels));
}

export function speciesBelongsToGroup(species: Species, group: string): boolean {
  const speciesGroupLabels = labelVariants(
    species['Fish Group'] || species.fishGroup || species.group,
  );

  return hasMatchingLabel(group, speciesGroupLabels);
}

export function targetsMatchGroup(targets: string[], group: string): boolean {
  const groupLabels = labelVariants(group);

  return targets.some((target) => hasMatchingLabel(target, groupLabels));
}

export function targetsMatchSpeciesGroup(
  species: Species[],
  group: string,
  targets: string[],
): boolean {
  if (targets.length === 0) {
    return false;
  }

  const groupSpecies = species.filter((item) => speciesBelongsToGroup(item, group));

  return groupSpecies.length > 0 && (
    targetsMatchGroup(targets, group)
    || groupSpecies.some((item) => {
      const speciesLabels = labelVariants(item.Species || item.species);

      return targets.some((target) => hasMatchingLabel(target, speciesLabels));
    })
  );
}

function hasMatchingLabel(value: unknown, labels: string[]): boolean {
  return labelVariants(value).some((label) => labels.includes(label));
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
