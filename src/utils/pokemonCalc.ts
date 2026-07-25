import { PokemonBaseData, PokemonInstance, StatStages, PokemonType, StatusAilment, WeatherType, TerrainType } from '../types/pokemon';
import { getMove, MOVES_DATABASE } from '../data/movesData';
import { getTypeEffectiveness } from '../data/typeChart';
import { STARTERS_AND_POKEMON_DATABASE, getSpriteUrls } from '../data/startersAndPokemon';

// Calculate exact stat for level (assuming neutral nature, 31 IV, 0 EV)
export function calculateStat(base: number, level: number, isHp: boolean = false): number {
  const iv = 31;
  if (isHp) {
    if (base === 1) return 1; // Shedinja rule
    return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
  } else {
    return Math.floor(((2 * base + iv) * level) / 100) + 5;
  }
}

export function createPokemonInstance(
  baseData: PokemonBaseData,
  level: number = 1,
  isShinyForce?: boolean
): PokemonInstance {
  // 3% shiny chance for wild encounters unless specified
  const isShiny = isShinyForce !== undefined ? isShinyForce : Math.random() < 0.03;
  
  const maxHp = calculateStat(baseData.baseStats.hp, level, true);
  const calculatedStats = {
    hp: maxHp,
    atk: calculateStat(baseData.baseStats.atk, level, false),
    def: calculateStat(baseData.baseStats.def, level, false),
    spAtk: calculateStat(baseData.baseStats.spAtk, level, false),
    spDef: calculateStat(baseData.baseStats.spDef, level, false),
    spd: calculateStat(baseData.baseStats.spd, level, false),
  };

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
    instanceId: Math.random().toString(36).substring(2, 9),
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
  };
}

export function normalizePokemonInstance(pkmn: any): PokemonInstance {
  if (!pkmn || typeof pkmn !== 'object') return pkmn;
  const id = pkmn.pokedexId ?? pkmn.id ?? 1;
  const baseData = STARTERS_AND_POKEMON_DATABASE[id] || STARTERS_AND_POKEMON_DATABASE[1];
  const isSpecial = id === 0 || id === 666 || pkmn.name === 'missingno' || pkmn.name === 'ghost';

  let sprites = pkmn.sprites;
  if (!sprites || !sprites.front || (isSpecial && (sprites.front.includes('shiny/') || sprites.front.includes('wikia')))) {
    if (isSpecial) {
      sprites = baseData ? { ...baseData.sprites } : getSpriteUrls(id, pkmn.name || 'missingno', false);
    } else {
      sprites = getSpriteUrls(id, pkmn.name || 'pokemon', pkmn.isShiny);
    }
  }

  const maxHp = pkmn.maxHp || (baseData ? calculateStat(baseData.baseStats.hp, pkmn.level || 1, true) : 50);

  return {
    instanceId: pkmn.instanceId || Math.random().toString(36).substring(2, 9),
    pokedexId: id,
    name: pkmn.name || baseData?.name || 'pokemon',
    displayName: pkmn.displayName || baseData?.displayName || 'Pokémon',
    level: pkmn.level || 1,
    currentHp: typeof pkmn.currentHp === 'number' ? pkmn.currentHp : maxHp,
    maxHp: maxHp,
    baseStats: pkmn.baseStats || baseData?.baseStats || { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, spd: 45 },
    calculatedStats: pkmn.calculatedStats || {
      hp: maxHp,
      atk: calculateStat(baseData?.baseStats?.atk || 45, pkmn.level || 1, false),
      def: calculateStat(baseData?.baseStats?.def || 45, pkmn.level || 1, false),
      spAtk: calculateStat(baseData?.baseStats?.spAtk || 65, pkmn.level || 1, false),
      spDef: calculateStat(baseData?.baseStats?.spDef || 65, pkmn.level || 1, false),
      spd: calculateStat(baseData?.baseStats?.spd || 45, pkmn.level || 1, false),
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

  // Type Effectiveness
  let typeEffectiveness = getTypeEffectiveness(move.type, defender.types);

  // Levitate ability immune to Ground moves
  if (defender.ability === 'Levitate' && move.type === 'ground') {
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

  // STAB (Same Type Attack Bonus = 1.5x)
  const isStab = attacker.types.includes(move.type);
  const stabMultiplier = isStab ? (attacker.ability === 'Adaptability' ? 2.0 : 1.5) : 1.0;

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
  const baseDamage = Math.floor((levelPart * move.power * attackVal) / Math.max(1, defenseVal)) / 50 + 2;

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

