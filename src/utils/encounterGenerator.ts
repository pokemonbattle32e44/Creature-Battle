import { PokemonInstance } from '../types/pokemon';
import { NATIONAL_POKEDEX_INDEX, NationalPokedexEntry } from '../data/nationalPokedex';
import { ITEMS_DATABASE } from '../data/itemsData';
import { fetchPokemonData } from './apiFetcher';
import { createPokemonInstance } from './pokemonCalc';

export async function generateWildEncounter(
  leadLevel: number,
  activeIncenseId?: string | null
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

  // 1. Shiny Roll
  const baseShinyChance = isShinyIncense ? 0.50 : 0.005; // 50% with Shiny Incense, 0.5% base
  const isShiny = Math.random() < baseShinyChance;

  // 2. Rarity Tier Roll
  let chosenTier: 'legendary' | 'pseudo' | 'regular' = 'regular';
  const rTier = Math.random();

  if (isLegendaryIncense) {
    chosenTier = rTier < 0.10 ? 'legendary' : 'regular';
  } else if (isPseudoIncense) {
    chosenTier = rTier < 0.20 ? 'pseudo' : 'regular';
  } else if (isShiny) {
    // Chances decrease if shiny (0.001% legendary, 0.01% pseudo)
    if (rTier < 0.00001) {
      chosenTier = 'legendary';
    } else if (rTier < 0.0001) {
      chosenTier = 'pseudo';
    } else {
      chosenTier = 'regular';
    }
  } else {
    // Base chances: 0.01% legendary (0.0001), 0.1% pseudo-legendary (0.001)
    if (rTier < 0.0001) {
      chosenTier = 'legendary';
    } else if (rTier < 0.001) {
      chosenTier = 'pseudo';
    } else {
      chosenTier = 'regular';
    }
  }

  // 3. Filter Candidate Species from National Dex (1025 species)
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
      // Fallback: any species with that type
      candidatePool = NATIONAL_POKEDEX_INDEX.filter((e) => e.types.includes(typeFilter as any));
    }
  }

  if (candidatePool.length === 0) {
    candidatePool = NATIONAL_POKEDEX_INDEX;
  }

  const chosenSpecies = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  // 4. Wild level scaling
  let wildLevel: number;
  if (leadLevel < 10) {
    // Below level 10: wild encounters are always level 1 to 3
    wildLevel = Math.floor(Math.random() * 3) + 1;
  } else {
    wildLevel = Math.max(1, leadLevel + (Math.floor(Math.random() * 5) - 2));
  }

  // 5. Fetch Full Base Data & Instantiate
  const baseData = await fetchPokemonData(chosenSpecies.id);
  if (!baseData) {
    // Ultimate fallback if network/fetch fails
    const fallbackBase = await fetchPokemonData(25); // Pikachu
    const wildInstance = createPokemonInstance(fallbackBase!, wildLevel, isShiny);
    return { wildInstance, consumedIncense };
  }

  const wildInstance = createPokemonInstance(baseData, wildLevel, isShiny);

  return { wildInstance, consumedIncense };
}
