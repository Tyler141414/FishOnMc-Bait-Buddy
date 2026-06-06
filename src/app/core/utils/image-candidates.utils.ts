import { Bait, LinkInfo, Species } from '../models/bait.models';
import { fileSlug } from './text.utils';

export function baitImageCandidates(bait: Bait): string[] {
  const candidates = linkCandidates(bait);
  const slug = fileSlug(bait.name || '');

  candidates.push(
    `resources/images/baits/${slug}.png`,
    `resources/images/baits/${slug}.jpg`,
    `resources/images/baits/${slug}.webp`,
  );

  return candidates.filter(Boolean);
}

export function speciesImageCandidates(species: Species): string[] {
  const name = species.Species || species.species || '';
  const dirName = name.replace(/[\\/:*?"<>|]/g, '-');
  const slug = fileSlug(name);
  const candidates = linkCandidates(species);

  candidates.push(
    `resources/images/${dirName}/fish_${slug}.png`,
    `resources/images/${dirName}/fish_${slug}.jpg`,
    `resources/images/${dirName}/${slug}.png`,
    `resources/images/${dirName}/${slug}.jpg`,
    `resources/images/${dirName}/${slug}.webp`,
    `resources/images/${dirName}/fish_${slug}.webp`,
  );

  return candidates.filter(Boolean);
}

function linkCandidates(item: { image?: string; links?: LinkInfo[]; Links?: LinkInfo[] }): string[] {
  const candidates: string[] = [];

  if (item.image) {
    candidates.push(item.image);
  }

  for (const link of item.links || item.Links || []) {
    if (link.rel === 'image' && link.href) {
      candidates.push(link.href);
    }
  }

  return candidates;
}
