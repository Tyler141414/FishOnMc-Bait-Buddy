export type RarityFilter = 'any' | 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';

export interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface LocationInfo {
  name: string;
  waterType: string;
  slug?: string;
}

export interface LinkInfo {
  rel?: string;
  href?: string;
}

export interface Bait {
  id?: string;
  kind?: 'Bait' | 'Lure' | string;
  lureType?: string;
  color?: string;
  name: string;
  rarity?: string;
  type?: string;
  likelihood?: number;
  sizeBonus?: number;
  uses?: number;
  sizes?: string[];
  targets?: string[];
  icon?: string | null;
  desc?: string;
  image?: string;
  links?: LinkInfo[];
  Links?: LinkInfo[];
}

export interface Species {
  Species?: string;
  species?: string;
  Rarity?: string;
  rarity?: string;
  'Fish Group'?: string;
  fishGroup?: string;
  group?: string;
  Lifestyle?: string;
  lifestyle?: string;
  'Ecosystem Role'?: string;
  ecosystemRole?: string;
  image?: string;
  links?: LinkInfo[];
  Links?: LinkInfo[];
}

export interface BaitViewModel extends Bait {
  imageCandidates: string[];
  rarityClass: string;
  meta: string;
}

export interface SpeciesViewModel extends Species {
  displayName: string;
  displayRarity: string;
  details: string;
  imageCandidates: string[];
  rarityClass: string;
}

export interface BaitFinderState {
  locations: LocationInfo[];
  selectedLocationName: string;
  selectedRarity: RarityFilter;
  baits: BaitViewModel[];
  selectedBait?: BaitViewModel;
  selectedSpecies: SpeciesViewModel[];
  isLoading: boolean;
  loadError: string;
  isModalOpen: boolean;
}
