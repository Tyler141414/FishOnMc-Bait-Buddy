import { Bait, BaitViewModel, Species, SpeciesViewModel } from '../models/bait.models';
import { baitImageCandidates, speciesImageCandidates } from './image-candidates.utils';
import { cssModifier } from './text.utils';

export function toBaitViewModel(bait: Bait): BaitViewModel {
  return {
    ...bait,
    imageCandidates: baitImageCandidates(bait),
    rarityClass: rarityClass(bait.rarity),
    meta: baitMeta(bait),
  };
}

export function toSpeciesViewModel(species: Species): SpeciesViewModel {
  const displayName = species.Species || species.species || 'Unknown';
  const displayRarity = species.Rarity || species.rarity || 'Unknown';
  const group = species['Fish Group'] || species.fishGroup || species.group || '';
  const lifestyle = species.Lifestyle || species.lifestyle || '';
  const role = species['Ecosystem Role'] || species.ecosystemRole || '';

  return {
    ...species,
    displayName,
    displayRarity,
    details: [group, lifestyle, role].filter(Boolean).join(' • '),
    imageCandidates: speciesImageCandidates(species),
    rarityClass: rarityClass(displayRarity),
  };
}

function rarityClass(value?: string): string {
  return `rarity-${cssModifier(value)}`;
}

function baitMeta(bait: Bait): string {
  const parts: string[] = [];
  const kind = bait.kind || 'Bait';

  parts.push(kind);

  if (bait.likelihood) {
    parts.push(`Likelihood: ${bait.likelihood}%`);
  }

  if (bait.sizeBonus) {
    parts.push(`Size: +${bait.sizeBonus}%`);
  }

  if (bait.uses) {
    parts.push(`Uses: ${bait.uses}`);
  }

  if (bait.sizes?.length) {
    parts.push(`Sizes: ${bait.sizes.join(', ')}`);
  }

  parts.push(`Water: ${bait.type || 'Unknown'}`);
  return parts.join(' • ');
}
