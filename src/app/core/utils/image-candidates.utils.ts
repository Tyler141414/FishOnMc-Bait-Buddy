import { Bait, Species } from '../models/bait.models';
import { assetUrl } from './asset-url.utils';
import { fileSlug } from './text.utils';

export function baitImageCandidates(bait: Bait): string[] {
  const candidates: string[] = [];
  const slug = fileSlug(bait.name || '');

  if (bait.image) {
    candidates.push(bait.image);
  }

  candidates.push(
    `resources/images/baits/${slug}.png`,
    `resources/images/baits/${slug}.jpg`,
    `resources/images/baits/${slug}.webp`,
  );

  return candidates.filter(Boolean).map(assetUrl);
}

export function speciesImageCandidates(species: Species): string[] {
  const name = species.Species || species.species || '';
  const dirName = name.replace(/[\\/:*?"<>|]/g, '-');
  const slug = fileSlug(name);
  const candidates: string[] = [];

  if (species.image) {
    candidates.push(species.image);
  }

  candidates.push(
    `resources/images/${dirName}/fish_${slug}.png`,
    `resources/images/${dirName}/fish_${slug}.jpg`,
    `resources/images/${dirName}/${slug}.png`,
    `resources/images/${dirName}/${slug}.jpg`,
    `resources/images/${dirName}/${slug}.webp`,
    `resources/images/${dirName}/fish_${slug}.webp`,
  );

  return candidates.filter(Boolean).map(assetUrl);
}
