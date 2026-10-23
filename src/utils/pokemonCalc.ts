import {
  PokemonBaseData,
  PokemonInstance,
  StatStages,
  PokemonType,
  StatusAilment,
  WeatherType,
  TerrainType,
  PokemonNature,
  IVs,
  EVs,
  MegaEvolutionConfig,
} from '../types/pokemon';
import { getMove, MOVES_DATABASE } from '../data/movesData';
import { getTypeEffectiveness } from '../data/typeChart';
import { STARTERS_AND_POKEMON_DATABASE, getSpriteUrls } from '../data/startersAndPokemon';

// Official 25 Pokémon Natures Table (+10% / -10%)
export const NATURES_TABLE: Record<
  PokemonNature,
  { name: string; increased?: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd'; decreased?: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd' }
> = {
  Hardy: { name: 'Hardy' },
  Lonely: { name: 'Lonely', increased: 'atk', decreased: 'def' },
  Brave: { name: 'Brave', increased: 'atk', decreased: 'spd' },
  Adamant: { name: 'Adamant', increased: 'atk', decreased: 'spAtk' },
  Naughty: { name: 'Naughty', increased: 'atk', decreased: 'spDef' },
  Bold: { name: 'Bold', increased: 'def', decreased: 'atk' },
  Docile: { name: 'Docile' },
  Relaxed: { name: 'Relaxed', increased: 'def', decreased: 'spd' },
  Impish: { name: 'Impish', increased: 'def', decreased: 'spAtk' },
  Lax: { name: 'Lax', increased: 'def', decreased: 'spDef' },
  Timid: { name: 'Timid', increased: 'spd', decreased: 'atk' },
  Hasty: { name: 'Hasty', increased: 'spd', decreased: 'def' },
  Serious: { name: 'Serious' },
  Jolly: { name: 'Jolly', increased: 'spd', decreased: 'spAtk' },
  Naive: { name: 'Naive', increased: 'spd', decreased: 'spDef' },
  Modest: { name: 'Modest', increased: 'spAtk', decreased: 'atk' },
  Mild: { name: 'Mild', increased: 'spAtk', decreased: 'def' },
  Quiet: { name: 'Quiet', increased: 'spAtk', decreased: 'spd' },
  Bashful: { name: 'Bashful' },
  Rash: { name: 'Rash', increased: 'spAtk', decreased: 'spDef' },
  Calm: { name: 'Calm', increased: 'spDef', decreased: 'atk' },
  Gentle: { name: 'Gentle', increased: 'spDef', decreased: 'def' },
  Sassy: { name: 'Sassy', increased: 'spDef', decreased: 'spd' },
  Careful: { name: 'Careful', increased: 'spDef', decreased: 'spAtk' },
  Quirky: { name: 'Quirky' },
};

export const ALL_NATURES = Object.keys(NATURES_TABLE) as PokemonNature[];

export function getNatureMultiplier(nature: PokemonNature | undefined, stat: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd'): number {
  if (!nature || !NATURES_TABLE[nature]) return 1.0;
  const entry = NATURES_TABLE[nature];
  if (entry.increased === stat) return 1.1;
  if (entry.decreased === stat) return 0.9;
  return 1.0;
}

// Gen-accurate stat calculation with Base, IV, EV, Level, and Nature
export function calculateStat(
  base: number,
  level: number,
  isHp: boolean = false,
  iv: number = 31,
  ev: number = 0,
  natureMultiplier: number = 1.0
): number {
  if (isHp) {
    if (base === 1) return 1; // Shedinja rule
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
    const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    return Math.floor(raw * natureMultiplier);
  }
}

export function generateRandomIVs(): IVs {
  return {
    hp: Math.floor(Math.random() * 32),
    atk: Math.floor(Math.random() * 32),
    def: Math.floor(Math.random() * 32),
    spAtk: Math.floor(Math.random() * 32),
    spDef: Math.floor(Math.random() * 32),
    spd: Math.floor(Math.random() * 32),
  };
}

export function generateMaxIVs(): IVs {
  return { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spd: 31 };
}

export const ALL_POKEMON_TYPES: PokemonType[] = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'steel',
  'dark',
  'fairy',
];

export function getRandomTeraType(preferredType?: PokemonType): PokemonType {
  // 50% chance to match primary type for optimal STAB, 50% surprise defensive/offensive Tera
  if (preferredType && Math.random() < 0.5) {
    return preferredType;
  }
  return ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)];
}

export function createPokemonInstance(
  baseData: PokemonBaseData,
  level: number = 1,
  isShinyForce?: boolean
): PokemonInstance {
  // 1/4096 base shiny chance or 3% wild event roll
  const isShiny = isShinyForce !== undefined ? isShinyForce : Math.random() < 0.03;
  
  // Random Nature
  const nature: PokemonNature = ALL_NATURES[Math.floor(Math.random() * ALL_NATURES.length)];
  
  // High IVs for restricted/boss/shinies, random for regular
  const ivs: IVs = (isShiny || baseData.isRestricted || baseData.id === 0 || baseData.id === 666)
    ? generateMaxIVs()
    : generateRandomIVs();
  
  const evs: EVs = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };
  
  const maxHp = calculateStat(baseData.baseStats.hp, level, true, ivs.hp, evs.hp);
  const calculatedStats = {
    hp: maxHp,
    atk: calculateStat(baseData.baseStats.atk, level, false, ivs.atk, evs.atk, getNatureMultiplier(nature, 'atk')),
    def: calculateStat(baseData.baseStats.def, level, false, ivs.def, evs.def, getNatureMultiplier(nature, 'def')),
    spAtk: calculateStat(baseData.baseStats.spAtk, level, false, ivs.spAtk, evs.spAtk, getNatureMultiplier(nature, 'spAtk')),
    spDef: calculateStat(baseData.baseStats.spDef, level, false, ivs.spDef, evs.spDef, getNatureMultiplier(nature, 'spDef')),
    spd: calculateStat(baseData.baseStats.spd, level, false, ivs.spd, evs.spd, getNatureMultiplier(nature, 'spd')),
  };

  const teraType = getRandomTeraType(baseData.types[0]);

  // Determine moves known at this level or pick up to 4 moves from baseData.levelUpMoves
  let selectedMoves = baseData.levelUpMoves.filter((m) => m.level <= level);
  
  // If fewer than 4 moves available at this level, fill up to 4 from baseData.levelUpMoves (highest level moves first)
  if (selectedMoves.length < 4 && baseData.levelUpMoves.length > 0) {
    const sortedDesc = [...baseData.levelUpMoves].sort((a, b) => b.level - a.level);
    for (const m of sortedDesc) {
      if (!selectedMoves.some((sm) => sm.moveId === m.moveId)) {
        selectedMoves.push(m);
      }
      if (selectedMoves.length >= 4) break;
    }
  }

  // Fallback default moves by primary/secondary type if still under 4
  const FALLBACK_MOVES_BY_TYPE: Record<string, string[]> = {
    grass: ['vine_whip', 'razor_leaf', 'giga_drain', 'growl'],
    fire: ['ember', 'flame_wheel', 'flamethrower', 'growl'],
    water: ['water_gun', 'bubble', 'water_pulse', 'surf'],
    electric: ['thunder_shock', 'spark', 'thunderbolt', 'thunder_wave'],
    psychic: ['confusion', 'psybeam', 'psychic', 'calm_mind'],
    fighting: ['mach_punch', 'rock_smash', 'close_combat', 'bulk_up'],
    normal: ['quick_attack', 'headbutt', 'scratch', 'body_slam'],
    poison: ['acid', 'poison_sting', 'sludge_bomb', 'toxic'],
    flying: ['peck', 'gust', 'air_slash', 'brave_bird'],
    ground: ['mud_slap', 'bulldoze', 'earthquake', 'rock_slide'],
    rock: ['rock_throw', 'rock_tomb', 'rock_slide', 'stone_edge'],
    ghost: ['astonish', 'shadow_sneak', 'shadow_ball', 'shadow_claw'],
    dragon: ['twister', 'dragon_breath', 'dragon_claw', 'dragon_pulse'],
    steel: ['metal_claw', 'iron_head', 'flash_cannon', 'quick_attack'],
    ice: ['powder_snow', 'ice_shard', 'ice_beam', 'blizzard'],
    bug: ['bug_bite', 'signal_beam', 'bug_buzz', 'quiver_dance'],
    dark: ['bite', 'snarl', 'crunch', 'dark_pulse'],
    fairy: ['disarming_voice', 'fairy_wind', 'dazzling_gleam', 'play_rough'],
  };

  const primaryType = baseData.types[0] || 'normal';
  const secondaryType = baseData.types[1];

  const primaryFallbacks = FALLBACK_MOVES_BY_TYPE[primaryType] || FALLBACK_MOVES_BY_TYPE.normal;
  const secondaryFallbacks = secondaryType ? (FALLBACK_MOVES_BY_TYPE[secondaryType] || []) : [];

  // Interleave primary and secondary fallbacks
  const combinedFallbacks = [...primaryFallbacks];
  secondaryFallbacks.forEach((mId, idx) => {
    combinedFallbacks.splice(idx * 2 + 1, 0, mId);
  });

  for (const fallbackId of combinedFallbacks) {
    if (selectedMoves.length >= 4) break;
    if (!selectedMoves.some((sm) => sm.moveId === fallbackId)) {
      selectedMoves.push({ level: 1, moveId: fallbackId });
    }
  }

  // Deduplicate and take top 4
  const uniqueMoves: Array<{ level: number; moveId: string }> = [];
  for (const m of selectedMoves) {
    if (!uniqueMoves.some((um) => um.moveId === m.moveId)) {
      uniqueMoves.push(m);
    }
  }

  // Guarantee STAB moves for primary & secondary types so Pokémon always have type-appropriate attacks
  const hasPrimaryStab = uniqueMoves.some((m) => getMove(m.moveId).type === primaryType);
  if (!hasPrimaryStab && primaryFallbacks[0]) {
    if (uniqueMoves.length >= 4) {
      uniqueMoves[3] = { level: 1, moveId: primaryFallbacks[0] };
    } else {
      uniqueMoves.push({ level: 1, moveId: primaryFallbacks[0] });
    }
  }

  if (secondaryType) {
    const hasSecondaryStab = uniqueMoves.some((m) => getMove(m.moveId).type === secondaryType);
    if (!hasSecondaryStab && secondaryFallbacks[0]) {
      if (uniqueMoves.length >= 4) {
        uniqueMoves[2] = { level: 1, moveId: secondaryFallbacks[0] };
      } else {
        uniqueMoves.push({ level: 1, moveId: secondaryFallbacks[0] });
      }
    }
  }

  // Prioritize STAB & elemental attacks over generic Tackle
  uniqueMoves.sort((a, b) => {
    const aData = getMove(a.moveId);
    const bData = getMove(b.moveId);
    const aIsStab = baseData.types.includes(aData.type) && a.moveId !== 'tackle';
    const bIsStab = baseData.types.includes(bData.type) && b.moveId !== 'tackle';
    if (aIsStab && !bIsStab) return -1;
    if (!aIsStab && bIsStab) return 1;
    if (a.moveId === 'tackle') return 1;
    if (b.moveId === 'tackle') return -1;
    return 0;
  });

  const finalMoves = uniqueMoves.slice(0, 4);

  let movesInstances = finalMoves.map((m) => {
    const moveData = getMove(m.moveId);
    return {
      moveId: m.moveId,
      pp: moveData.pp,
      maxPp: moveData.maxPp,
    };
  });

  if (baseData.id === 0 || baseData.name === 'missingno') {
    const allMoveKeys = Object.keys(MOVES_DATABASE);
    const shuffled = [...allMoveKeys].sort(() => 0.5 - Math.random());
    movesInstances = shuffled.slice(0, 4).map((mId) => {
      const mData = getMove(mId);
      return {
        moveId: mId,
        pp: mData.pp,
        maxPp: mData.maxPp,
      };
    });
  } else if (baseData.id === 666 || baseData.name === 'ghost') {
    const ghostMoves = ['steal_curse', 'shadow_ball', 'dark_pulse', 'night_shade'];
    movesInstances = ghostMoves.map((mId) => {
      const mData = getMove(mId);
      return {
        moveId: mId,
        pp: mData.pp,
        maxPp: mData.maxPp,
      };
    });
  }

  const expCurrent = Math.pow(level, 3);
  const expToNext = Math.pow(level + 1, 3);

  // If shiny, use shiny sprite URLs (or base sprites for special boss/glitch pokemon)
  let sprites = baseData.sprites;
  if (isShiny) {
    if (baseData.id === 0 || baseData.id === 666 || baseData.name === 'missingno' || baseData.name === 'ghost') {
      sprites = { ...baseData.sprites };
    } else {
      sprites = getSpriteUrls(baseData.id, baseData.name, true);
    }
  }

  return {
    instanceId: generateInstanceId(),
    pokedexId: baseData.id,
    name: baseData.name,
    displayName: baseData.displayName,
    level,
    currentHp: maxHp,
    maxHp,
    baseStats: baseData.baseStats,
    calculatedStats,
    statStages: { atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0, accuracy: 0, evasion: 0 },
    types: [...baseData.types],
    moves: movesInstances,
    status: 'none',
    exp: expCurrent,
    expToNext,
    ability: baseData.abilities[0] || 'Overgrow',
    sprites,
    isShiny,
    isPseudoLegendary: (baseData as any).isPseudoLegendary ?? false,
    isRestricted: baseData.isRestricted ?? false,
    evolution: baseData.evolution,
    nature,
    ivs,
    evs,
    teraType,
  };
}

export function generateInstanceId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 6)}`;
}

export function ensureUniquePokemonInstances(list: any[]): PokemonInstance[] {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  return list.filter(Boolean).map((pkmn) => {
    const normalized = normalizePokemonInstance(pkmn);
    if (!normalized.instanceId || seenIds.has(normalized.instanceId)) {
      const freshId = generateInstanceId();
      seenIds.add(freshId);
      return { ...normalized, instanceId: freshId };
    }
    seenIds.add(normalized.instanceId);
    return normalized;
  });
}

export function normalizePokemonInstance(pkmn: any): PokemonInstance {
  if (!pkmn || typeof pkmn !== 'object') return pkmn;
  const id = pkmn.pokedexId ?? pkmn.id ?? 1;
  const baseData = STARTERS_AND_POKEMON_DATABASE[id] || null;
  const isSpecial = id === 0 || id === 666 || pkmn.name === 'missingno' || pkmn.name === 'ghost';

  let sprites = pkmn.sprites;
  if (isSpecial) {
    sprites = getSpriteUrls(id, pkmn.name || (id === 0 ? 'missingno' : 'ghost'), false);
  } else if (!sprites || !sprites.front) {
    sprites = getSpriteUrls(id, pkmn.name || 'pokemon', pkmn.isShiny);
  }

  const nature: PokemonNature = pkmn.nature || 'Hardy';
  const ivs: IVs = pkmn.ivs || generateMaxIVs();
  const evs: EVs = pkmn.evs || { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };
  const teraType: PokemonType = pkmn.teraType || (baseData?.types[0] || 'normal');

  const maxHp = pkmn.maxHp || (baseData ? calculateStat(baseData.baseStats.hp, pkmn.level || 1, true, ivs.hp, evs.hp) : 50);

  return {
    instanceId: pkmn.instanceId || generateInstanceId(),
    pokedexId: id,
    name: pkmn.name || baseData?.name || 'pokemon',
    displayName: pkmn.displayName || baseData?.displayName || (pkmn.name ? pkmn.name.charAt(0).toUpperCase() + pkmn.name.slice(1) : `Pokémon #${id}`),
    level: pkmn.level || 1,
    currentHp: typeof pkmn.currentHp === 'number' ? pkmn.currentHp : maxHp,
    maxHp: maxHp,
    baseStats: pkmn.baseStats || baseData?.baseStats || { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, spd: 45 },
    calculatedStats: pkmn.calculatedStats || {
      hp: maxHp,
      atk: calculateStat(baseData?.baseStats?.atk || 45, pkmn.level || 1, false, ivs.atk, evs.atk, getNatureMultiplier(nature, 'atk')),
      def: calculateStat(baseData?.baseStats?.def || 45, pkmn.level || 1, false, ivs.def, evs.def, getNatureMultiplier(nature, 'def')),
      spAtk: calculateStat(baseData?.baseStats?.spAtk || 65, pkmn.level || 1, false, ivs.spAtk, evs.spAtk, getNatureMultiplier(nature, 'spAtk')),
      spDef: calculateStat(baseData?.baseStats?.spDef || 65, pkmn.level || 1, false, ivs.spDef, evs.spDef, getNatureMultiplier(nature, 'spDef')),
      spd: calculateStat(baseData?.baseStats?.spd || 45, pkmn.level || 1, false, ivs.spd, evs.spd, getNatureMultiplier(nature, 'spd')),
    },
    statStages: pkmn.statStages || { atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0, accuracy: 0, evasion: 0 },
    types: Array.isArray(pkmn.types) && pkmn.types.length > 0 ? pkmn.types : (baseData?.types || ['normal']),
    moves: Array.isArray(pkmn.moves) ? pkmn.moves : [],
    status: pkmn.status || 'none',
    exp: pkmn.exp || Math.pow(pkmn.level || 1, 3),
    expToNext: pkmn.expToNext || Math.pow((pkmn.level || 1) + 1, 3),
    ability: pkmn.ability || baseData?.abilities?.[0] || 'Overgrow',
    sprites: sprites,
    isShiny: !!pkmn.isShiny,
    isPseudoLegendary: !!pkmn.isPseudoLegendary,
    isRestricted: !!pkmn.isRestricted,
    evolution: pkmn.evolution || baseData?.evolution,
    nature,
    ivs,
    evs,
    teraType,
    isTerastallized: !!pkmn.isTerastallized,
    isMega: !!pkmn.isMega,
    megaFormId: pkmn.megaFormId,
    heldItem: pkmn.heldItem,
  };
}

// Showdown-accurate Stat Stage Multipliers (-6 to +6)
export function getStatMultiplier(stage: number): number {
  if (stage >= 0) {
    return (2 + stage) / 2; // 0->1.0, +1->1.5, +2->2.0, +3->2.5, +4->3.0, +5->3.5, +6->4.0
  } else {
    return 2 / (2 + Math.abs(stage)); // -1->0.67, -2->0.5, -3->0.4, -4->0.33, -5->0.29, -6->0.25
  }
}

// Showdown-accurate Accuracy / Evasion Multipliers (-6 to +6)
export function getAccuracyMultiplier(accuracyStage: number, evasionStage: number): number {
  const netStage = Math.max(-6, Math.min(6, accuracyStage - evasionStage));
  if (netStage >= 0) {
    return (3 + netStage) / 3; // 0->1.0, +1->1.33, +2->1.67, +3->2.0, +4->2.33, +5->2.67, +6->3.0
  } else {
    return 3 / (3 + Math.abs(netStage)); // -1->0.75, -2->0.6, -3->0.5, -4->0.43, -5->0.38, -6->0.33
  }
}

export function getEffectiveStat(
  pokemon: PokemonInstance,
  statName: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd',
  ignoreNegativeStages: boolean = false,
  ignorePositiveStages: boolean = false,
  weather: WeatherType = 'none'
): number {
  const baseValue = pokemon.calculatedStats[statName];
  let stage = pokemon.statStages[statName] || 0;

  if (ignoreNegativeStages && stage < 0) stage = 0;
  if (ignorePositiveStages && stage > 0) stage = 0;

  let val = Math.floor(baseValue * getStatMultiplier(stage));

  // Paralysis reduces Speed by 50%
  if (statName === 'spd' && pokemon.status === 'paralyzed') {
    val = Math.floor(val * 0.5);
  }

  // Choice items
  if (pokemon.heldItem === 'Choice Scarf' && statName === 'spd') val = Math.floor(val * 1.5);
  if (pokemon.heldItem === 'Choice Band' && statName === 'atk') val = Math.floor(val * 1.5);
  if (pokemon.heldItem === 'Choice Specs' && statName === 'spAtk') val = Math.floor(val * 1.5);
  if (pokemon.heldItem === 'Eviolite' && (statName === 'def' || statName === 'spDef') && pokemon.evolution) {
    val = Math.floor(val * 1.5);
  }

  // Weather bonuses
  if (weather === 'sandstorm' && statName === 'spDef' && pokemon.types.includes('rock')) {
    val = Math.floor(val * 1.5);
  }
  if (weather === 'snow' && statName === 'def' && pokemon.types.includes('ice')) {
    val = Math.floor(val * 1.5);
  }

  // Ability Speed weather multipliers
  if (statName === 'spd') {
    if (weather === 'sun' && pokemon.ability === 'Chlorophyll') val *= 2;
    if (weather === 'rain' && pokemon.ability === 'Swift Swim') val *= 2;
    if (weather === 'sandstorm' && pokemon.ability === 'Sand Rush') val *= 2;
    if (weather === 'snow' && pokemon.ability === 'Slush Rush') val *= 2;
  }

  return Math.max(1, val);
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  typeEffectiveness: number;
  stab: boolean;
  missed: boolean;
  logMessage: string;
}

export function calculateDamage(
  attacker: PokemonInstance,
  defender: PokemonInstance,
  moveId: string,
  weather: WeatherType = 'none',
  terrain: TerrainType = 'none'
): DamageResult {
  const move = getMove(moveId);

  // Psychic Terrain blocks priority moves against grounded targets
  const isTargetGrounded = !defender.types.includes('flying') && defender.ability !== 'Levitate';
  if (terrain === 'psychic' && isTargetGrounded && (move.priority || 0) > 0) {
    return {
      damage: 0,
      isCritical: false,
      typeEffectiveness: 1,
      stab: false,
      missed: true,
      logMessage: `${attacker.displayName} usou ${move.name}, mas o Terreno Psíquico bloqueou o ataque prioritário!`,
    };
  }

  // Accuracy check
  if (move.accuracy <= 100) {
    let accMult = getAccuracyMultiplier(
      attacker.statStages.accuracy || 0,
      defender.statStages.evasion || 0
    );

    // Rain makes Thunder & Hurricane 100% accurate
    let baseAccuracy = move.accuracy;
    if (weather === 'rain' && (move.id === 'thunder' || move.id === 'hurricane')) {
      baseAccuracy = 100;
      accMult = 1;
    }

    const finalAccuracy = Math.min(100, Math.floor(baseAccuracy * accMult));
    const roll = Math.random() * 100;
    if (roll > finalAccuracy) {
      return {
        damage: 0,
        isCritical: false,
        typeEffectiveness: 1,
        stab: false,
        missed: true,
        logMessage: `${attacker.displayName} usou ${move.name}, mas o ataque errou!`,
      };
    }
  }

  if (move.category === 'status') {
    return {
      damage: 0,
      isCritical: false,
      typeEffectiveness: 1,
      stab: false,
      missed: false,
      logMessage: `${attacker.displayName} usou ${move.name}!`,
    };
  }

  // Type Effectiveness (Defending Pokémon uses Tera Type defensively if Terastallized!)
  const effectiveDefenderTypes = (defender.isTerastallized && defender.teraType)
    ? [defender.teraType]
    : defender.types;

  let typeEffectiveness = getTypeEffectiveness(move.type, effectiveDefenderTypes);

  // Levitate ability immune to Ground moves (unless grounded)
  if (defender.ability === 'Levitate' && move.type === 'ground' && !defender.types.includes('flying')) {
    typeEffectiveness = 0;
  }

  if (typeEffectiveness === 0) {
    return {
      damage: 0,
      isCritical: false,
      typeEffectiveness: 0,
      stab: false,
      missed: false,
      logMessage: `${attacker.displayName} usou ${move.name}, mas não teve efeito em ${defender.displayName}!`,
    };
  }

  // Critical Hit (Stage 0 = 1/24 ~ 4.17%, High Crit = 1/8 = 12.5%)
  const critChance = move.critRatio ? 0.125 : 0.0417;
  const isCritical = Math.random() < critChance;

  // Showdown Critical Rule:
  // Critical hits ignore attacker's negative Attack stages and defender's positive Defense stages!
  let attackVal = 0;
  let defenseVal = 0;

  if (move.category === 'physical') {
    attackVal = getEffectiveStat(attacker, 'atk', isCritical, false, weather);
    defenseVal = getEffectiveStat(defender, 'def', false, isCritical, weather);

    // Burn penalty on physical attacks (50% reduction unless Guts ability)
    if (attacker.status === 'burned' && attacker.ability !== 'Guts') {
      attackVal = Math.floor(attackVal * 0.5);
    }
    if (attacker.ability === 'Guts' && attacker.status !== 'none') {
      attackVal = Math.floor(attackVal * 1.5);
    }
  } else {
    attackVal = getEffectiveStat(attacker, 'spAtk', isCritical, false, weather);
    defenseVal = getEffectiveStat(defender, 'spDef', false, isCritical, weather);
  }

  // STAB & Terastallization STAB (Gen 9 SV official rules)
  let isStab = false;
  let stabMultiplier = 1.0;
  let effectiveMovePower = move.power;

  if (attacker.isTerastallized && attacker.teraType) {
    const isTeraType = move.type === attacker.teraType;
    const originalTypes = attacker.originalFormBeforeMega?.types || attacker.types;
    const isOriginalType = originalTypes.includes(move.type);

    if (isTeraType && isOriginalType) {
      isStab = true;
      stabMultiplier = 2.0; // Adaptability-style Tera Boost
    } else if (isTeraType || isOriginalType) {
      isStab = true;
      stabMultiplier = 1.5;
    }

    // Gen 9 SV low-BP boost: Moves of the Tera type with BP < 60 boosted to 60 (excluding priority and multi-hit)
    if (isTeraType && effectiveMovePower > 0 && effectiveMovePower < 60 && (!move.priority || move.priority <= 0) && !move.minHits) {
      effectiveMovePower = 60;
    }
  } else {
    isStab = attacker.types.includes(move.type);
    stabMultiplier = isStab ? (attacker.ability === 'Adaptability' ? 2.0 : 1.5) : 1.0;
  }

  // Weather modifier
  let weatherMod = 1.0;
  if (weather === 'sun') {
    if (move.type === 'fire') weatherMod = 1.5;
    if (move.type === 'water') weatherMod = 0.5;
  } else if (weather === 'rain') {
    if (move.type === 'water') weatherMod = 1.5;
    if (move.type === 'fire') weatherMod = 0.5;
  }

  // Terrain modifier
  let terrainMod = 1.0;
  if (isTargetGrounded) {
    if (terrain === 'electric' && move.type === 'electric') terrainMod = 1.3;
    if (terrain === 'grassy' && move.type === 'grass') terrainMod = 1.3;
    if (terrain === 'grassy' && move.id === 'earthquake') terrainMod = 0.5;
    if (terrain === 'psychic' && move.type === 'psychic') terrainMod = 1.3;
    if (terrain === 'misty' && move.type === 'dragon') terrainMod = 0.5;
  }

  // Ability Overgrow / Blaze / Torrent bonus when HP <= 33%
  let abilityMod = 1.0;
  const hpRatio = attacker.currentHp / attacker.maxHp;
  if (hpRatio <= 0.33) {
    if (attacker.ability === 'Overgrow' && move.type === 'grass') abilityMod = 1.5;
    if (attacker.ability === 'Blaze' && move.type === 'fire') abilityMod = 1.5;
    if (attacker.ability === 'Torrent' && move.type === 'water') abilityMod = 1.5;
    if (attacker.ability === 'Swarm' && move.type === 'bug') abilityMod = 1.5;
  }

  // Life Orb item multiplier
  let itemMod = 1.0;
  if (attacker.heldItem === 'Life Orb') itemMod = 1.3;

  // Critical multiplier (1.5x in Gen 6+)
  const critMod = isCritical ? 1.5 : 1.0;

  // Random factor 0.85 - 1.00
  const randomMod = 0.85 + Math.random() * 0.15;

  // Official Showdown Damage Formula:
  // Base Damage = (((2 * Level / 5 + 2) * Power * Attack / Defense) / 50) + 2
  const levelPart = Math.floor((2 * attacker.level) / 5) + 2;
  const baseDamage = Math.floor((levelPart * effectiveMovePower * attackVal) / Math.max(1, defenseVal)) / 50 + 2;

  let finalDamage = Math.floor(
    baseDamage *
      stabMultiplier *
      typeEffectiveness *
      weatherMod *
      terrainMod *
      abilityMod *
      itemMod *
      critMod *
      randomMod
  );

  if (typeEffectiveness > 0 && finalDamage < 1) {
    finalDamage = 1;
  }

  let log = `${attacker.displayName} usou ${move.name}!`;
  if (isCritical) log += ' Um acerto crítico!';
  if (typeEffectiveness > 1) log += ' Foi super efetivo!';
  if (typeEffectiveness > 0 && typeEffectiveness < 1) log += ' Não foi muito efetivo...';

  return {
    damage: finalDamage,
    isCritical,
    typeEffectiveness,
    stab: isStab,
    missed: false,
    logMessage: log,
  };
}

// Mega Evolution & Terastallization Helper Functions
export function applyMegaEvolution(pokemon: PokemonInstance, megaConfig: MegaEvolutionConfig): PokemonInstance {
  const ivs = pokemon.ivs || generateMaxIVs();
  const evs = pokemon.evs || { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };
  const nature = pokemon.nature || 'Hardy';

  const originalFormBeforeMega = {
    name: pokemon.name,
    displayName: pokemon.displayName,
    types: [...pokemon.types],
    baseStats: { ...pokemon.baseStats },
    sprites: { ...pokemon.sprites },
    ability: pokemon.ability,
  };

  const calculatedStats = {
    hp: pokemon.maxHp, // HP stat remains identical upon Mega Evolution in official games
    atk: calculateStat(megaConfig.baseStats.atk, pokemon.level, false, ivs.atk, evs.atk, getNatureMultiplier(nature, 'atk')),
    def: calculateStat(megaConfig.baseStats.def, pokemon.level, false, ivs.def, evs.def, getNatureMultiplier(nature, 'def')),
    spAtk: calculateStat(megaConfig.baseStats.spAtk, pokemon.level, false, ivs.spAtk, evs.spAtk, getNatureMultiplier(nature, 'spAtk')),
    spDef: calculateStat(megaConfig.baseStats.spDef, pokemon.level, false, ivs.spDef, evs.spDef, getNatureMultiplier(nature, 'spDef')),
    spd: calculateStat(megaConfig.baseStats.spd, pokemon.level, false, ivs.spd, evs.spd, getNatureMultiplier(nature, 'spd')),
  };

  return {
    ...pokemon,
    name: megaConfig.id,
    displayName: megaConfig.name,
    types: [...megaConfig.types],
    baseStats: { ...megaConfig.baseStats, hp: pokemon.baseStats.hp },
    calculatedStats,
    ability: megaConfig.ability,
    sprites: {
      ...pokemon.sprites,
      front: megaConfig.sprites.front,
      back: megaConfig.sprites.back,
      animatedFront: megaConfig.sprites.animatedFront || megaConfig.sprites.front,
      animatedBack: megaConfig.sprites.animatedBack || megaConfig.sprites.back,
    },
    isMega: true,
    megaFormId: megaConfig.id,
    originalFormBeforeMega,
  };
}

export function revertMegaEvolution(pokemon: PokemonInstance): PokemonInstance {
  if (!pokemon.isMega || !pokemon.originalFormBeforeMega) return pokemon;
  const orig = pokemon.originalFormBeforeMega;
  const ivs = pokemon.ivs || generateMaxIVs();
  const evs = pokemon.evs || { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };
  const nature = pokemon.nature || 'Hardy';

  const calculatedStats = {
    hp: pokemon.maxHp,
    atk: calculateStat(orig.baseStats.atk, pokemon.level, false, ivs.atk, evs.atk, getNatureMultiplier(nature, 'atk')),
    def: calculateStat(orig.baseStats.def, pokemon.level, false, ivs.def, evs.def, getNatureMultiplier(nature, 'def')),
    spAtk: calculateStat(orig.baseStats.spAtk, pokemon.level, false, ivs.spAtk, evs.spAtk, getNatureMultiplier(nature, 'spAtk')),
    spDef: calculateStat(orig.baseStats.spDef, pokemon.level, false, ivs.spDef, evs.spDef, getNatureMultiplier(nature, 'spDef')),
    spd: calculateStat(orig.baseStats.spd, pokemon.level, false, ivs.spd, evs.spd, getNatureMultiplier(nature, 'spd')),
  };

  return {
    ...pokemon,
    name: orig.name,
    displayName: orig.displayName,
    types: [...orig.types],
    baseStats: { ...orig.baseStats },
    calculatedStats,
    ability: orig.ability,
    sprites: { ...orig.sprites },
    isMega: false,
    megaFormId: undefined,
    originalFormBeforeMega: undefined,
  };
}

export function applyTerastallization(pokemon: PokemonInstance): PokemonInstance {
  if (pokemon.isTerastallized) return pokemon;
  const teraType = pokemon.teraType || pokemon.types[0] || 'normal';
  return {
    ...pokemon,
    isTerastallized: true,
    teraType,
  };
}

export function revertTerastallization(pokemon: PokemonInstance): PokemonInstance {
  return {
    ...pokemon,
    isTerastallized: false,
  };
}

export function calculateCatchRate(
  pokemon: PokemonInstance,
  baseCatchRate: number,
  ballMultiplier: number
): { caught: boolean; shakes: number } {
  // Master Ball always succeeds 100%
  if (ballMultiplier >= 255) {
    return { caught: true, shakes: 3 };
  }

  // Status bonus
  let statusBonus = 1.0;
  if (pokemon.status === 'asleep' || pokemon.status === 'frozen') {
    statusBonus = 2.5;
  } else if (
    pokemon.status === 'paralyzed' ||
    pokemon.status === 'burned' ||
    pokemon.status === 'poisoned' ||
    pokemon.status === 'badly_poisoned'
  ) {
    statusBonus = 1.8;
  }

  const effectiveBaseRate = Math.max(70, baseCatchRate);
  const hpFactor = (3 * pokemon.maxHp - 2 * pokemon.currentHp) / (3 * pokemon.maxHp);
  
  const catchValue = hpFactor * effectiveBaseRate * ballMultiplier * statusBonus * 2.2;

  if (catchValue >= 200 || Math.random() * 255 < catchValue) {
    return { caught: true, shakes: 3 };
  }

  const ratio = catchValue / 200;
  let shakes = 0;
  if (ratio > 0.25) shakes = 1;
  if (ratio > 0.55) shakes = 2;
  if (ratio > 0.85) shakes = 2;

  return {
    caught: false,
    shakes,
  };
}

