import { PokemonInstance, BiomeType, GameEvent } from '../types/pokemon';
import { NATIONAL_POKEDEX_INDEX, NationalPokedexEntry } from '../data/nationalPokedex';
import { ITEMS_DATABASE } from '../data/itemsData';
import { fetchPokemonData } from './apiFetcher';
import { createPokemonInstance } from './pokemonCalc';
import { getBiomeConfig } from '../data/environments';

export async function generateWildEncounter(
  leadLevel: number,
  activeIncenseId?: string | null,
  currentBiome: BiomeType = 'forest',
  activeEvents: GameEvent[] = []
): Promise<{ wildInstance: PokemonInstance; consumedIncense: boolean }> {
  let consumedIncense = false;
  let isShinyIncense = false;
  let isPseudoIncense = false;
  let isLegendaryIncense = false;
  let typeFilter: string | null = null;

  if (activeIncenseId && ITEMS_DATABASE[activeIncenseId]) {
    const item = ITEMS_DATABASE[activeIncenseId];
    if (item.category === 'incense') {
      consumedIncense = true;
      if (item.incenseSpecial === 'shiny') isShinyIncense = true;
      if (item.incenseSpecial === 'pseudo') isPseudoIncense = true;
      if (item.incenseSpecial === 'legendary') isLegendaryIncense = true;
      if (item.incenseType) typeFilter = item.incenseType;
    }
  }

  // Active Events calculation
  let eventShinyMult = 1.0;
  let allowRestrictedSpawns = false;
  const eventBoostedSpecies: Record<string, number> = {};

  for (const ev of activeEvents) {
    if (!ev.active) continue;
    // Check if event targets this biome specifically
    if (ev.targetBiomes && ev.targetBiomes.length > 0 && !ev.targetBiomes.includes(currentBiome)) {
      continue;
    }
    if (ev.shinyMultiplier && ev.shinyMultiplier > eventShinyMult) {
      eventShinyMult = ev.shinyMultiplier;
    }
    if (ev.allowRestrictedSpawns) {
      allowRestrictedSpawns = true;
    }
    if (ev.spawnBoosts) {
      for (const [key, pct] of Object.entries(ev.spawnBoosts)) {
        eventBoostedSpecies[key] = (eventBoostedSpecies[key] || 0) + pct;
      }
    }
  }

  // 1. Shiny Roll (Official Gen 6+ base is 1/4096 ~ 0.000244, default in arena is 0.5% base, with event & incense multipliers)
  let baseShinyChance = isShinyIncense ? 0.50 : 0.005;
  baseShinyChance = Math.min(0.95, baseShinyChance * eventShinyMult);
  const isShiny = Math.random() < baseShinyChance;

  // 2. Rarity Tier Roll
  let chosenTier: 'legendary' | 'pseudo' | 'regular' = 'regular';
  const rTier = Math.random();

  if (isLegendaryIncense || allowRestrictedSpawns) {
    const threshold = isLegendaryIncense ? 0.25 : 0.05;
    if (rTier < threshold) chosenTier = 'legendary';
  } else if (isPseudoIncense) {
    chosenTier = rTier < 0.20 ? 'pseudo' : 'regular';
  } else if (isShiny) {
    if (rTier < 0.00002) chosenTier = 'legendary';
    else if (rTier < 0.0002) chosenTier = 'pseudo';
    else chosenTier = 'regular';
  } else {
    if (rTier < 0.0001) chosenTier = 'legendary';
    else if (rTier < 0.001) chosenTier = 'pseudo';
    else chosenTier = 'regular';
  }

  const biomeConfig = getBiomeConfig(currentBiome);
  let chosenSpeciesId: number | null = null;

  // If no special incense is active and tier is regular, check biome encounter table first (65% chance to encounter biome native)
  if (!isLegendaryIncense && !isPseudoIncense && !typeFilter && chosenTier === 'regular' && Math.random() < 0.65) {
    const table = [...biomeConfig.encounterPool];
    // Apply event spawn boosts to weights:
    // e.g. +200% boost -> multiplier is 1 + 200/100 = 3.0x
    const weightedTable = table.map((entry) => {
      let weight = entry.weight;
      const boostPct = eventBoostedSpecies[String(entry.id)] || eventBoostedSpecies[entry.name.toLowerCase()];
      if (boostPct) {
        weight = Math.floor(weight * (1 + boostPct / 100));
      }
      return { id: entry.id, weight };
    });

    const totalWeight = weightedTable.reduce((acc, curr) => acc + curr.weight, 0);
    let randWeight = Math.random() * totalWeight;

    for (const item of weightedTable) {
      if (randWeight < item.weight) {
        chosenSpeciesId = item.id;
        break;
      }
      randWeight -= item.weight;
    }
  }

  // Fallback to National Pokedex filtering if not chosen via biome table
  if (!chosenSpeciesId) {
    let candidatePool = NATIONAL_POKEDEX_INDEX.filter((entry) => {
      if (chosenTier === 'legendary') return entry.isRestricted;
      if (chosenTier === 'pseudo') return entry.isPseudoLegendary;
      return !entry.isRestricted && !entry.isPseudoLegendary;
    });

    // If player lead is below level 10 and tier is regular, prefer basic (unevolved) species for balanced early game
    if (leadLevel < 10 && chosenTier === 'regular') {
      const basicPool = candidatePool.filter((e) => e.isStage1Basic);
      if (basicPool.length > 0) {
        candidatePool = basicPool;
      }
    }

    // Apply Type Incense filter if active
    if (typeFilter) {
      const typeMatched = candidatePool.filter((e) => e.types.includes(typeFilter as any));
      if (typeMatched.length > 0) {
        candidatePool = typeMatched;
      } else {
        candidatePool = NATIONAL_POKEDEX_INDEX.filter((e) => e.types.includes(typeFilter as any));
      }
    }

    if (candidatePool.length === 0) {
      candidatePool = NATIONAL_POKEDEX_INDEX;
    }

    // Weight candidate pool by event boosts if any
    const poolWithWeights = candidatePool.map((c) => {
      let weight = 10;
      const boostPct = eventBoostedSpecies[String(c.id)] || eventBoostedSpecies[c.name.toLowerCase()];
      if (boostPct) {
        weight = Math.floor(weight * (1 + boostPct / 100));
      }
      return { id: c.id, weight };
    });

    const totalPoolWeight = poolWithWeights.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * totalPoolWeight;
    for (const entry of poolWithWeights) {
      if (r < entry.weight) {
        chosenSpeciesId = entry.id;
        break;
      }
      r -= entry.weight;
    }

    if (!chosenSpeciesId) {
      chosenSpeciesId = candidatePool[0]?.id || 25;
    }
  }

  // 4. Wild level scaling bounded by biome min/max
  let wildLevel: number;
  if (leadLevel < 10) {
    // Below level 10: wild encounters are level 1 to 3
    wildLevel = Math.floor(Math.random() * 3) + 1;
  } else {
    const rawLevel = leadLevel + (Math.floor(Math.random() * 5) - 2);
    // Soft clamp within biome range for immersive progression
    wildLevel = Math.max(1, Math.min(100, rawLevel));
  }

  // 5. Fetch Full Base Data & Instantiate
  const baseData = await fetchPokemonData(chosenSpeciesId);
  if (!baseData) {
    const fallbackBase = await fetchPokemonData(25); // Pikachu
    const wildInstance = createPokemonInstance(fallbackBase!, wildLevel, isShiny);
    return { wildInstance, consumedIncense };
  }

  const wildInstance = createPokemonInstance(baseData, wildLevel, isShiny);

  return { wildInstance, consumedIncense };
}
