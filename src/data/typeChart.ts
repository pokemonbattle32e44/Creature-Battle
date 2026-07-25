import { PokemonType } from '../types/pokemon';

// Type Effectiveness Matrix (Attacker -> Defender -> Multiplier)
// Multipliers: 0 (No effect), 0.5 (Not very effective), 1 (Normal), 2 (Super effective)
export const TYPE_CHART: Record<PokemonType, Record<PokemonType, number>> = {
  normal: {
    normal: 1, fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 1, poison: 1,
    ground: 1, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0, dragon: 1, steel: 0.5, dark: 1, fairy: 1
  },
  fire: {
    normal: 1, fire: 0.5, water: 0.5, grass: 2, electric: 1, ice: 2, fighting: 1, poison: 1,
    ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 0.5, steel: 2, dark: 1, fairy: 1
  },
  water: {
    normal: 1, fire: 2, water: 0.5, grass: 0.5, electric: 1, ice: 1, fighting: 1, poison: 1,
    ground: 2, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 0.5, steel: 1, dark: 1, fairy: 1
  },
  grass: {
    normal: 1, fire: 0.5, water: 2, grass: 0.5, electric: 1, ice: 1, fighting: 1, poison: 0.5,
    ground: 2, flying: 0.5, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 0.5, steel: 0.5, dark: 1, fairy: 1
  },
  electric: {
    normal: 1, fire: 1, water: 2, grass: 0.5, electric: 0.5, ice: 1, fighting: 1, poison: 1,
    ground: 0, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 0.5, steel: 1, dark: 1, fairy: 1
  },
  ice: {
    normal: 1, fire: 0.5, water: 0.5, grass: 2, electric: 1, ice: 0.5, fighting: 1, poison: 1,
    ground: 2, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, steel: 0.5, dark: 1, fairy: 1
  },
  fighting: {
    normal: 2, fire: 1, water: 1, grass: 1, electric: 1, ice: 2, fighting: 1, poison: 0.5,
    ground: 1, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dragon: 1, steel: 2, dark: 2, fairy: 0.5
  },
  poison: {
    normal: 1, fire: 1, water: 1, grass: 2, electric: 1, ice: 1, fighting: 1, poison: 0.5,
    ground: 0.5, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0.5, dragon: 1, steel: 0, dark: 1, fairy: 2
  },
  ground: {
    normal: 1, fire: 2, water: 1, grass: 0.5, electric: 2, ice: 1, fighting: 1, poison: 2,
    ground: 1, flying: 0, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 1, steel: 2, dark: 1, fairy: 1
  },
  flying: {
    normal: 1, fire: 1, water: 1, grass: 2, electric: 0.5, ice: 1, fighting: 2, poison: 1,
    ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 1, steel: 0.5, dark: 1, fairy: 1
  },
  psychic: {
    normal: 1, fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 2, poison: 2,
    ground: 1, flying: 1, psychic: 0.5, bug: 1, rock: 1, ghost: 1, dragon: 1, steel: 0.5, dark: 0, fairy: 1
  },
  bug: {
    normal: 1, fire: 0.5, water: 1, grass: 2, electric: 1, ice: 1, fighting: 0.5, poison: 0.5,
    ground: 1, flying: 0.5, psychic: 2, bug: 1, rock: 1, ghost: 0.5, dragon: 1, steel: 0.5, dark: 2, fairy: 0.5
  },
  rock: {
    normal: 1, fire: 2, water: 1, grass: 1, electric: 1, ice: 2, fighting: 0.5, poison: 1,
    ground: 0.5, flying: 2, psychic: 1, bug: 2, rock: 1, ghost: 1, dragon: 1, steel: 0.5, dark: 1, fairy: 1
  },
  ghost: {
    normal: 0, fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 1, poison: 1,
    ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, steel: 1, dark: 0.5, fairy: 1
  },
  dragon: {
    normal: 1, fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 1, poison: 1,
    ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, steel: 0.5, dark: 1, fairy: 0
  },
  steel: {
    normal: 1, fire: 0.5, water: 0.5, grass: 1, electric: 0.5, ice: 2, fighting: 1, poison: 1,
    ground: 1, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 1, steel: 0.5, dark: 1, fairy: 2
  },
  dark: {
    normal: 1, fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 0.5, poison: 1,
    ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, steel: 1, dark: 0.5, fairy: 0.5
  },
  fairy: {
    normal: 1, fire: 0.5, water: 1, grass: 1, electric: 1, ice: 1, fighting: 2, poison: 0.5,
    ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, steel: 0.5, dark: 2, fairy: 1
  }
};

export function getTypeEffectiveness(moveType: PokemonType, defenderTypes: PokemonType[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    if (TYPE_CHART[moveType] && TYPE_CHART[moveType][defType] !== undefined) {
      multiplier *= TYPE_CHART[moveType][defType];
    }
  }
  return multiplier;
}

export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  normal: { bg: 'bg-stone-500', text: 'text-stone-100', border: 'border-stone-400' },
  fire: { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-500' },
  water: { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-400' },
  grass: { bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-400' },
  electric: { bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-400' },
  ice: { bg: 'bg-cyan-500', text: 'text-cyan-950', border: 'border-cyan-300' },
  fighting: { bg: 'bg-red-700', text: 'text-red-100', border: 'border-red-600' },
  poison: { bg: 'bg-purple-700', text: 'text-purple-100', border: 'border-purple-500' },
  ground: { bg: 'bg-amber-700', text: 'text-amber-100', border: 'border-amber-600' },
  flying: { bg: 'bg-indigo-500', text: 'text-indigo-100', border: 'border-indigo-400' },
  psychic: { bg: 'bg-pink-600', text: 'text-pink-100', border: 'border-pink-400' },
  bug: { bg: 'bg-lime-600', text: 'text-lime-100', border: 'border-lime-400' },
  rock: { bg: 'bg-yellow-700', text: 'text-yellow-100', border: 'border-yellow-600' },
  ghost: { bg: 'bg-indigo-900', text: 'text-indigo-200', border: 'border-indigo-700' },
  dragon: { bg: 'bg-violet-800', text: 'text-violet-100', border: 'border-violet-600' },
  steel: { bg: 'bg-slate-500', text: 'text-slate-100', border: 'border-slate-400' },
  dark: { bg: 'bg-stone-800', text: 'text-stone-200', border: 'border-stone-600' },
  fairy: { bg: 'bg-pink-400', text: 'text-pink-950', border: 'border-pink-300' },
};

export const TYPE_NAMES_PT: Record<PokemonType, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  grass: 'Grama',
  electric: 'Elétrico',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  steel: 'Aço',
  dark: 'Sombrio',
  fairy: 'Fada',
};
