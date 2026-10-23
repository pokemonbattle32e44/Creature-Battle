import { MegaEvolutionConfig, PokemonType } from '../types/pokemon';

export const MEGA_EVOLUTIONS: Record<string, MegaEvolutionConfig> = {
  // Venusaur Mega
  'venusaur-mega': {
    id: 'venusaur-mega',
    name: 'Mega Venusaur',
    baseSpeciesId: 3,
    requiredMegaStone: 'venusaurite',
    types: ['grass', 'poison'],
    baseStats: {
      hp: 80,
      atk: 100,
      def: 123,
      spAtk: 122,
      spDef: 120,
      spd: 80,
    },
    ability: 'Thick Fat',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10033.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10033.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10033.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10033.gif',
    },
  },

  // Charizard Mega X
  'charizard-mega-x': {
    id: 'charizard-mega-x',
    name: 'Mega Charizard X',
    baseSpeciesId: 6,
    requiredMegaStone: 'charizardite_x',
    types: ['fire', 'dragon'],
    baseStats: {
      hp: 78,
      atk: 130,
      def: 111,
      spAtk: 130,
      spDef: 85,
      spd: 100,
    },
    ability: 'Tough Claws',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10034.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10034.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10034.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10034.gif',
    },
  },

  // Charizard Mega Y
  'charizard-mega-y': {
    id: 'charizard-mega-y',
    name: 'Mega Charizard Y',
    baseSpeciesId: 6,
    requiredMegaStone: 'charizardite_y',
    types: ['fire', 'flying'],
    baseStats: {
      hp: 78,
      atk: 104,
      def: 78,
      spAtk: 159,
      spDef: 115,
      spd: 100,
    },
    ability: 'Drought',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10035.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10035.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10035.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10035.gif',
    },
  },

  // Blastoise Mega
  'blastoise-mega': {
    id: 'blastoise-mega',
    name: 'Mega Blastoise',
    baseSpeciesId: 9,
    requiredMegaStone: 'blastoisinite',
    types: ['water'],
    baseStats: {
      hp: 79,
      atk: 103,
      def: 120,
      spAtk: 135,
      spDef: 115,
      spd: 78,
    },
    ability: 'Mega Launcher',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10036.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10036.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10036.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10036.gif',
    },
  },

  // Alakazam Mega
  'alakazam-mega': {
    id: 'alakazam-mega',
    name: 'Mega Alakazam',
    baseSpeciesId: 65,
    requiredMegaStone: 'alakazite',
    types: ['psychic'],
    baseStats: {
      hp: 55,
      atk: 50,
      def: 65,
      spAtk: 175,
      spDef: 105,
      spd: 150,
    },
    ability: 'Trace',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10037.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10037.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10037.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10037.gif',
    },
  },

  // Gengar Mega
  'gengar-mega': {
    id: 'gengar-mega',
    name: 'Mega Gengar',
    baseSpeciesId: 94,
    requiredMegaStone: 'gengarite',
    types: ['ghost', 'poison'],
    baseStats: {
      hp: 60,
      atk: 65,
      def: 80,
      spAtk: 170,
      spDef: 95,
      spd: 130,
    },
    ability: 'Shadow Tag',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10038.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10038.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10038.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10038.gif',
    },
  },

  // Gyarados Mega
  'gyarados-mega': {
    id: 'gyarados-mega',
    name: 'Mega Gyarados',
    baseSpeciesId: 130,
    requiredMegaStone: 'gyaradosite',
    types: ['water', 'dark'],
    baseStats: {
      hp: 95,
      atk: 155,
      def: 109,
      spAtk: 70,
      spDef: 130,
      spd: 81,
    },
    ability: 'Mold Breaker',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10041.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10041.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10041.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10041.gif',
    },
  },

  // Mewtwo Mega X
  'mewtwo-mega-x': {
    id: 'mewtwo-mega-x',
    name: 'Mega Mewtwo X',
    baseSpeciesId: 150,
    requiredMegaStone: 'mewtwonite_x',
    types: ['psychic', 'fighting'],
    baseStats: {
      hp: 106,
      atk: 190,
      def: 100,
      spAtk: 154,
      spDef: 100,
      spd: 130,
    },
    ability: 'Steadfast',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10043.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10043.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10043.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10043.gif',
    },
  },

  // Mewtwo Mega Y
  'mewtwo-mega-y': {
    id: 'mewtwo-mega-y',
    name: 'Mega Mewtwo Y',
    baseSpeciesId: 150,
    requiredMegaStone: 'mewtwonite_y',
    types: ['psychic'],
    baseStats: {
      hp: 106,
      atk: 150,
      def: 70,
      spAtk: 194,
      spDef: 120,
      spd: 140,
    },
    ability: 'Insomnia',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10044.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10044.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10044.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10044.gif',
    },
  },

  // Blaziken Mega
  'blaziken-mega': {
    id: 'blaziken-mega',
    name: 'Mega Blaziken',
    baseSpeciesId: 257,
    requiredMegaStone: 'blazikenite',
    types: ['fire', 'fighting'],
    baseStats: {
      hp: 80,
      atk: 160,
      def: 80,
      spAtk: 130,
      spDef: 80,
      spd: 100,
    },
    ability: 'Speed Boost',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10050.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10050.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10050.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10050.gif',
    },
  },

  // Gardevoir Mega
  'gardevoir-mega': {
    id: 'gardevoir-mega',
    name: 'Mega Gardevoir',
    baseSpeciesId: 282,
    requiredMegaStone: 'gardevoirite',
    types: ['psychic', 'fairy'],
    baseStats: {
      hp: 68,
      atk: 85,
      def: 65,
      spAtk: 165,
      spDef: 135,
      spd: 100,
    },
    ability: 'Pixilate',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10051.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10051.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10051.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10051.gif',
    },
  },

  // Tyranitar Mega
  'tyranitar-mega': {
    id: 'tyranitar-mega',
    name: 'Mega Tyranitar',
    baseSpeciesId: 248,
    requiredMegaStone: 'tyranitarite',
    types: ['rock', 'dark'],
    baseStats: {
      hp: 100,
      atk: 164,
      def: 150,
      spAtk: 95,
      spDef: 120,
      spd: 71,
    },
    ability: 'Sand Stream',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10049.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10049.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10049.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10049.gif',
    },
  },

  // Salamence Mega
  'salamence-mega': {
    id: 'salamence-mega',
    name: 'Mega Salamence',
    baseSpeciesId: 373,
    requiredMegaStone: 'salamencite',
    types: ['dragon', 'flying'],
    baseStats: {
      hp: 95,
      atk: 145,
      def: 130,
      spAtk: 120,
      spDef: 90,
      spd: 120,
    },
    ability: 'Aerilate',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10089.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10089.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10089.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10089.gif',
    },
  },

  // Lucario Mega
  'lucario-mega': {
    id: 'lucario-mega',
    name: 'Mega Lucario',
    baseSpeciesId: 448,
    requiredMegaStone: 'lucarionite',
    types: ['fighting', 'steel'],
    baseStats: {
      hp: 70,
      atk: 145,
      def: 88,
      spAtk: 140,
      spDef: 70,
      spd: 112,
    },
    ability: 'Adaptability',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10059.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10059.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10059.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10059.gif',
    },
  },

  // Garchomp Mega
  'garchomp-mega': {
    id: 'garchomp-mega',
    name: 'Mega Garchomp',
    baseSpeciesId: 445,
    requiredMegaStone: 'garchompite',
    types: ['dragon', 'ground'],
    baseStats: {
      hp: 108,
      atk: 170,
      def: 115,
      spAtk: 120,
      spDef: 95,
      spd: 92,
    },
    ability: 'Sand Force',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10058.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10058.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10058.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10058.gif',
    },
  },

  // Rayquaza Mega
  'rayquaza-mega': {
    id: 'rayquaza-mega',
    name: 'Mega Rayquaza',
    baseSpeciesId: 384,
    requiredMegaStone: 'meteorite',
    types: ['dragon', 'flying'],
    baseStats: {
      hp: 105,
      atk: 180,
      def: 100,
      spAtk: 180,
      spDef: 100,
      spd: 115,
    },
    ability: 'Delta Stream',
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10065.gif',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10065.gif',
      animatedFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10065.gif',
      animatedBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10065.gif',
    },
  },
};

/**
 * Checks if a Pokémon can Mega Evolve given the player's inventory and held item
 */
export function getAvailableMegaEvolution(
  pokedexId: number,
  heldItem?: string,
  inventory?: Record<string, number>
): MegaEvolutionConfig | null {
  // Player must possess the Key Stone (or have it in inventory)
  const hasKeyStone = !inventory || (inventory['key_stone'] || 0) > 0;
  if (!hasKeyStone) return null;

  for (const mega of Object.values(MEGA_EVOLUTIONS)) {
    if (mega.baseSpeciesId === pokedexId) {
      if (heldItem && heldItem === mega.requiredMegaStone) {
        return mega;
      }
    }
  }
  return null;
}
