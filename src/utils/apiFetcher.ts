import { PokemonBaseData, PokemonType } from '../types/pokemon';
import { STARTERS_AND_POKEMON_DATABASE, RESTRICTED_SPECIES_IDS, getSpriteUrls } from '../data/startersAndPokemon';
import { NATIONAL_POKEDEX_INDEX } from '../data/nationalPokedex';
import { MOVES_DATABASE } from '../data/movesData';

const pokemonCache: Record<string | number, PokemonBaseData> = { ...STARTERS_AND_POKEMON_DATABASE };

// List of Portuguese or English move mappings to our internal move IDs
const MOVE_MAPPING: Record<string, string> = {
  tackle: 'tackle',
  scratch: 'scratch',
  pound: 'pound',
  'quick-attack': 'quick_attack',
  'body-slam': 'body_slam',
  'hyper-beam': 'hyper_beam',
  'swords-dance': 'swords_dance',
  growl: 'growl',
  'tail-whip': 'tail_whip',
  recover: 'recover',
  protect: 'protect',
  substitute: 'substitute',
  ember: 'ember',
  flamethrower: 'flamethrower',
  'fire-blast': 'fire_blast',
  'fire-punch': 'fire_punch',
  'flare-blitz': 'flare_blitz',
  'sunny-day': 'sunny_day',
  'water-gun': 'water_gun',
  surf: 'surf',
  'hydro-pump': 'hydro_pump',
  'water-pulse': 'water_pulse',
  waterfall: 'waterfall',
  'rain-dance': 'rain_dance',
  'vine-whip': 'vine_whip',
  'razor-leaf': 'razor_leaf',
  'giga-drain': 'giga_drain',
  'energy-ball': 'energy_ball',
  'leech-seed': 'leech_seed',
  spore: 'spore',
  'thunder-shock': 'thunder_shock',
  thunderbolt: 'thunderbolt',
  thunder: 'thunder',
  'thunder-wave': 'thunder_wave',
  'volt-tackle': 'volt_tackle',
  'ice-beam': 'ice_beam',
  blizzard: 'blizzard',
  'ice-shard': 'ice_shard',
  'icicle-spear': 'icicle_spear',
  'karate-chop': 'karate_chop',
  'close-combat': 'close_combat',
  'aura-sphere': 'aura_sphere',
  'bulk-up': 'bulk_up',
  'poison-sting': 'poison_sting',
  'sludge-bomb': 'sludge_bomb',
  toxic: 'toxic',
  'mud-slap': 'mud_slap',
  earthquake: 'earthquake',
  'earth-power': 'earth_power',
  gust: 'gust',
  'air-slash': 'air_slash',
  'brave-bird': 'brave_bird',
  roost: 'roost',
  confusion: 'confusion',
  psychic: 'psychic',
  'calm-mind': 'calm_mind',
  'nasty-plot': 'nasty_plot',
  'bug-bite': 'bug_bite',
  'bug-buzz': 'bug_buzz',
  'quiver-dance': 'quiver_dance',
  'rock-throw': 'rock_throw',
  'rock-slide': 'rock_slide',
  'stone-edge': 'stone_edge',
  'shadow-ball': 'shadow_ball',
  'shadow-claw': 'shadow_claw',
  curse: 'curse',
  'dragon-claw': 'dragon_claw',
  'dragon-pulse': 'dragon_pulse',
  'dragon-dance': 'dragon_dance',
  'iron-head': 'iron_head',
  'flash-cannon': 'flash_cannon',
  bite: 'bite',
  crunch: 'crunch',
  'dark-pulse': 'dark_pulse',
  'fairy-wind': 'fairy_wind',
  'dazzling-gleam': 'dazzling_gleam',
  moonblast: 'moonblast',
  'play-rough': 'play_rough',
  astonish: 'astonish',
  lick: 'lick',
  'shadow-sneak': 'shadow_sneak',
  'night-shade': 'night_shade',
  hex: 'hex',
  peck: 'peck',
  'drill-peck': 'drill_peck',
  absorb: 'absorb',
  'mega-drain': 'mega_drain',
  'flame-wheel': 'flame_wheel',
  bubble: 'bubble',
  acid: 'acid',
  smog: 'smog',
  'poison-jab': 'poison_jab',
  'rock-smash': 'rock_smash',
  'mach-punch': 'mach_punch',
  'drain-punch': 'drain_punch',
  pursuit: 'pursuit',
  snarl: 'snarl',
  'disarming-voice': 'disarming_voice',
  'draining-kiss': 'draining_kiss',
  'metal-claw': 'metal_claw',
  'powder-snow': 'powder_snow',
  twister: 'twister',
  'dragon-breath': 'dragon_breath',
  'fury-swipes': 'fury_swipes',
  headbutt: 'headbutt',
  swift: 'swift',
  'mud-shot': 'mud_shot',
  bulldoze: 'bulldoze',
  'rock-tomb': 'rock_tomb',
  psybeam: 'psybeam',
  spark: 'spark',
  transform: 'transform',
};

export async function fetchPokemonData(nameOrId: string | number): Promise<PokemonBaseData | null> {
  const key = String(nameOrId).toLowerCase().trim();

  // Check local cache
  if (pokemonCache[key]) {
    return pokemonCache[key];
  }

  // Find in starters database by name if needed
  const localMatch = Object.values(STARTERS_AND_POKEMON_DATABASE).find(
    (p) => p.name.toLowerCase() === key || p.displayName.toLowerCase() === key || p.id === Number(key)
  );
  if (localMatch) {
    pokemonCache[key] = localMatch;
    return localMatch;
  }

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    const speciesRes = await fetch(data.species.url);
    const speciesData = speciesRes.ok ? await speciesRes.json() : null;

    const id = data.id;
    const name = data.name;
    const displayName = speciesData
      ? speciesData.names.find((n: any) => n.language.name === 'en' || n.language.name === 'pt-BR')?.name || name
      : name.charAt(0).toUpperCase() + name.slice(1);

    const types: PokemonType[] = data.types.map((t: any) => t.type.name as PokemonType);

    const statsObj = { hp: 45, atk: 45, def: 45, spAtk: 45, spDef: 45, spd: 45 };
    data.stats.forEach((s: any) => {
      if (s.stat.name === 'hp') statsObj.hp = s.base_stat;
      if (s.stat.name === 'attack') statsObj.atk = s.base_stat;
      if (s.stat.name === 'defense') statsObj.def = s.base_stat;
      if (s.stat.name === 'special-attack') statsObj.spAtk = s.base_stat;
      if (s.stat.name === 'special-defense') statsObj.spDef = s.base_stat;
      if (s.stat.name === 'speed') statsObj.spd = s.base_stat;
    });

    const isLegendaryOrMythical = speciesData
      ? speciesData.is_legendary || speciesData.is_mythical
      : false;
    const isRestricted = isLegendaryOrMythical || RESTRICTED_SPECIES_IDS.has(id);

    const evolvesFrom = speciesData ? speciesData.evolves_from_species : null;
    const isStage1Basic = !evolvesFrom;

    // Determine evolution target from local DB or PokeAPI species evolution chain
    let evolutionData = STARTERS_AND_POKEMON_DATABASE[id]?.evolution;
    if (!evolutionData && speciesData?.evolution_chain?.url) {
      try {
        const evoRes = await fetch(speciesData.evolution_chain.url);
        if (evoRes.ok) {
          const evoChain = await evoRes.json();
          let curr = evoChain.chain;
          while (curr) {
            const speciesUrl = curr.species.url || '';
            const matches = speciesUrl.match(/\/pokemon-species\/(\d+)\//);
            const nodeSpeciesId = matches ? parseInt(matches[1], 10) : 0;

            if (nodeSpeciesId === id || curr.species.name.toLowerCase() === name.toLowerCase()) {
              if (curr.evolves_to && curr.evolves_to.length > 0) {
                const nextEvo = curr.evolves_to[0];
                const nextUrl = nextEvo.species.url || '';
                const nextMatches = nextUrl.match(/\/pokemon-species\/(\d+)\//);
                const targetId = nextMatches ? parseInt(nextMatches[1], 10) : id + 1;
                const targetName = nextEvo.species.name;
                const minLevel = nextEvo.evolution_details?.[0]?.min_level || 16;
                evolutionData = { minLevel, targetId, targetName };
              }
              break;
            }
            if (curr.evolves_to && curr.evolves_to.length > 0) {
              curr = curr.evolves_to[0];
            } else {
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch evolution chain for ${name}:`, e);
      }
    }

    // Check level-up moves
    const levelUpMoves: Array<{ level: number; moveId: string }> = [];
    data.moves.forEach((m: any) => {
      const levelDetail = m.version_group_details.find(
        (v: any) => v.move_learn_method.name === 'level-up'
      );
      if (levelDetail) {
        const moveName = m.move.name;
        const normalizedName = moveName.replace(/-/g, '_');
        const mappedId = MOVE_MAPPING[moveName] || (MOVES_DATABASE[normalizedName] ? normalizedName : null);
        if (mappedId && !levelUpMoves.some((lm) => lm.moveId === mappedId && lm.level === levelDetail.level_learned_at)) {
          levelUpMoves.push({
            level: levelDetail.level_learned_at,
            moveId: mappedId,
          });
        }
      }
    });

    // Fallback moves if none found
    if (levelUpMoves.length === 0) {
      levelUpMoves.push({ level: 1, moveId: 'tackle' });
    }

    // Sort by level
    levelUpMoves.sort((a, b) => a.level - b.level);

    const baseData: PokemonBaseData = {
      id,
      name,
      displayName,
      types,
      baseStats: statsObj,
      sprites: getSpriteUrls(id, name),
      abilities: data.abilities.map((a: any) => a.ability.name),
      isStage1Basic,
      isRestricted,
      isFinalEvolution: false, // Default
      levelUpMoves,
      baseExp: data.base_experience || 64,
      catchRate: speciesData ? speciesData.capture_rate || 45 : 45,
      evolution: evolutionData,
    };

    // Update national pokedex index entry in memory
    if (NATIONAL_POKEDEX_INDEX[id - 1]) {
      NATIONAL_POKEDEX_INDEX[id - 1].displayName = displayName;
      NATIONAL_POKEDEX_INDEX[id - 1].name = name;
      NATIONAL_POKEDEX_INDEX[id - 1].types = types;
    }

    pokemonCache[key] = baseData;
    pokemonCache[id] = baseData;
    return baseData;
  } catch (_err) {
    // Network or API offline fallback using National Pokedex Index & Local DB
    const numId = Number(key);
    const dexEntry = NATIONAL_POKEDEX_INDEX.find(
      (e) => e.id === numId || e.name.toLowerCase() === key || e.displayName.toLowerCase() === key
    );

    if (dexEntry) {
      const typeMoves: Record<string, string> = {
        fire: 'ember',
        water: 'water_gun',
        grass: 'vine_whip',
        electric: 'thunder_shock',
        psychic: 'confusion',
        ice: 'ice_shard',
        fighting: 'karate_chop',
        poison: 'poison_sting',
        ground: 'mud_slap',
        flying: 'gust',
        bug: 'bug_bite',
        rock: 'rock_throw',
        ghost: 'shadow_ball',
        dragon: 'dragon_claw',
        steel: 'iron_head',
        dark: 'bite',
        fairy: 'fairy_wind',
        normal: 'tackle',
      };
      const primaryType = dexEntry.types[0] || 'normal';
      const mainMove = typeMoves[primaryType] || 'tackle';

      const rawDisplayName = dexEntry.displayName || dexEntry.name;
      const cleanFormattedName = dexEntry.name && !dexEntry.name.startsWith('pokemon-')
        ? dexEntry.name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
        : rawDisplayName;

      const fallbackData: PokemonBaseData = {
        id: dexEntry.id,
        name: dexEntry.name,
        displayName: rawDisplayName.startsWith('Pokémon #') ? cleanFormattedName : rawDisplayName,
        types: dexEntry.types,
        baseStats: dexEntry.isRestricted
          ? { hp: 100, atk: 110, def: 100, spAtk: 110, spDef: 100, spd: 100 }
          : dexEntry.isPseudoLegendary
          ? { hp: 85, atk: 95, def: 85, spAtk: 95, spDef: 85, spd: 85 }
          : { hp: 60, atk: 60, def: 60, spAtk: 60, spDef: 60, spd: 60 },
        sprites: getSpriteUrls(dexEntry.id, dexEntry.name),
        abilities: ['Overgrow'],
        isStage1Basic: true,
        isRestricted: dexEntry.isRestricted,
        isFinalEvolution: false,
        levelUpMoves: [
          { level: 1, moveId: 'tackle' },
          { level: 5, moveId: mainMove },
          { level: 12, moveId: 'quick_attack' },
          { level: 25, moveId: 'hyper_beam' },
        ],
        baseExp: dexEntry.isRestricted ? 250 : 100,
        catchRate: dexEntry.isRestricted ? 3 : 45,
      };

      pokemonCache[key] = fallbackData;
      pokemonCache[dexEntry.id] = fallbackData;
      return fallbackData;
    }

    // Ultimate local database fallback (Bulbasaur)
    return STARTERS_AND_POKEMON_DATABASE[1];
  }
}

export function getAllBundledStarters(): PokemonBaseData[] {
  return Object.values(STARTERS_AND_POKEMON_DATABASE).filter(
    (p) => p.isStage1Basic && !p.isRestricted
  );
}
