export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'steel'
  | 'dark'
  | 'fairy';

export type MoveCategory = 'physical' | 'special' | 'status';

export type StatusAilment =
  | 'none'
  | 'paralyzed'
  | 'burned'
  | 'poisoned'
  | 'badly_poisoned'
  | 'asleep'
  | 'frozen'
  | 'confused';

export type StatName = 'hp' | 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd' | 'accuracy' | 'evasion';

export type WeatherType = 'none' | 'sun' | 'rain' | 'sandstorm' | 'snow';

export type TerrainType = 'none' | 'electric' | 'grassy' | 'misty' | 'psychic';

export interface StatStages {
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
  accuracy: number;
  evasion: number;
}

export interface StatChange {
  stat: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd' | 'accuracy' | 'evasion';
  target: 'user' | 'target';
  stages: number; // e.g. +1, +2, -1
  chance?: number; // 1-100 percentage
}

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number; // 0 for status
  accuracy: number; // 100, 95, 90 etc. (101 or 0 for bypass)
  pp: number;
  maxPp: number;
  description: string;
  priority?: number; // default 0
  drainRatio?: number; // e.g. 0.5 for Giga Drain, -0.25 for recoil
  statChanges?: StatChange[];
  statusEffect?: {
    status: StatusAilment;
    target: 'user' | 'target';
    chance?: number;
  };
  volatileEffect?: {
    effect:
      | 'confusion'
      | 'flinch'
      | 'attract'
      | 'substitute'
      | 'reflect'
      | 'light_screen'
      | 'aurora_veil'
      | 'leech_seed'
      | 'taunt'
      | 'encore'
      | 'protect'
      | 'curse'
      | 'transform';
    target?: 'user' | 'target';
    chance?: number;
  };
  weatherEffect?: WeatherType;
  terrainEffect?: TerrainType;
  healPercent?: number; // 50 for Recover
  minHits?: number;
  maxHits?: number;
  critRatio?: number; // higher critical hit ratio
}

export interface MoveInstance {
  moveId: string;
  pp: number;
  maxPp: number;
}

export interface PokemonBaseData {
  id: number;
  name: string;
  displayName: string;
  types: PokemonType[];
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    spd: number;
  };
  sprites: {
    front: string;
    back: string;
    animatedFront?: string;
    animatedBack?: string;
    artwork?: string;
  };
  abilities: string[];
  isStage1Basic: boolean;
  isRestricted: boolean; // Legendary, Mythical, Ultra Beast, Paradox, Pseudo-legendary
  isFinalEvolution: boolean;
  evolution?: {
    minLevel?: number;
    item?: string;
    targetId: number;
    targetName: string;
  };
  levelUpMoves: Array<{ level: number; moveId: string }>;
  learnableTms?: string[];
  baseExp: number;
  catchRate: number;
}

export interface PokemonInstance {
  instanceId: string;
  pokedexId: number;
  name: string;
  displayName: string;
  nickname?: string;
  level: number;
  currentHp: number;
  maxHp: number;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    spd: number;
  };
  calculatedStats: {
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    spd: number;
  };
  statStages: StatStages;
  types: PokemonType[];
  moves: MoveInstance[];
  status: StatusAilment;
  statusTurns?: number;
  toxicCounter?: number;
  confused?: boolean;
  confusedTurns?: number;
  flinched?: boolean;
  protected?: boolean;
  substituteHp?: number;
  leeched?: boolean;
  exp: number;
  expToNext: number;
  heldItem?: string;
  ability: string;
  disguiseBroken?: boolean;
  sprites: {
    front: string;
    back: string;
    animatedFront?: string;
    animatedBack?: string;
    artwork?: string;
  };
  isShiny?: boolean;
  isPseudoLegendary?: boolean;
  isRestricted?: boolean;
  evolution?: {
    minLevel?: number;
    item?: string;
    targetId: number;
    targetName: string;
  };
  // For Transform move (Ditto)
  transformed?: {
    originalPokedexId: number;
    originalName: string;
    originalTypes: PokemonType[];
    originalSprites: any;
    originalMoves: MoveInstance[];
    originalBaseStats: any;
    originalCalculatedStats: any;
  };
}

export interface Item {
  id: string;
  name: string;
  category: 'ball' | 'medicine' | 'battle' | 'candy' | 'tm' | 'repel' | 'incense';
  price: number;
  description: string;
  sprite: string;
  tmMoveId?: string; // For TMs
  ballMultiplier?: number;
  healAmount?: number; // 20 for Potion, 999 for Max Potion
  healPpAmount?: number;
  cureStatus?: StatusAilment[] | 'all';
  isRevive?: boolean;
  statBoost?: { stat: keyof StatStages; stages: number };
  incenseType?: PokemonType;
  incenseSpecial?: 'shiny' | 'pseudo' | 'legendary';
}

export interface UserSaveData {
  party: PokemonInstance[];
  pcBox?: PokemonInstance[];
  pokedollars: number;
  inventory: Record<string, number>;
  activeIncense?: string | null;
  incenseTimers?: Record<string, number>;
  unlockedBadges?: number;
  battlesWon: number;
  pokemonCaught: number;
  pokedexSeen?: number[];
  pokedexCaught?: number[];
  lastSavedAt: string;
}
