import React, { useState, useMemo } from 'react';
import { Search, Sparkles, X, ChevronRight, Hash } from 'lucide-react';
import { NATIONAL_POKEDEX_INDEX, NationalPokedexEntry } from '../data/nationalPokedex';
import { STARTERS_AND_POKEMON_DATABASE, getSpriteUrls, getPokemonSpriteStyle } from '../data/startersAndPokemon';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { formatPokedexId } from '../types/pokemon';
import { soundEngine } from '../utils/soundEngine';

interface PokemonSearchPickerProps {
  selectedId: number;
  onSelect: (speciesId: number, speciesName: string) => void;
  label?: string;
  allowBosses?: boolean;
}

// Special species (MissingNO. #0, GHOST #9999)
const SPECIAL_BOSS_SPECIES: NationalPokedexEntry[] = [
  {
    id: 9999,
    name: 'ghost',
    displayName: 'GHOST',
    types: ['ghost', 'dark'],
    isStage1Basic: false,
    isPseudoLegendary: false,
    isRestricted: true,
    gen: 1,
  },
  {
    id: 0,
    name: 'missingno',
    displayName: 'MissingNO.',
    types: ['normal', 'flying'],
    isStage1Basic: false,
    isPseudoLegendary: false,
    isRestricted: true,
    gen: 1,
  },
];

export const PokemonSearchPicker: React.FC<PokemonSearchPickerProps> = ({
  selectedId,
  onSelect,
  label = 'Selecionar Pokémon',
  allowBosses = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [genFilter, setGenFilter] = useState<number | 'all' | 'special'>('all');

  // Combined species list: All 1025 Pokémon + Special Bosses
  const allSpecies = useMemo(() => {
    if (allowBosses) {
      return [...SPECIAL_BOSS_SPECIES, ...NATIONAL_POKEDEX_INDEX];
    }
    return NATIONAL_POKEDEX_INDEX;
  }, [allowBosses]);

  // Current selected metadata
  const currentSelected = useMemo(() => {
    const found = allSpecies.find((p) => p.id === selectedId);
    if (found) return found;
    // Fallback if ID is in database
    const dbEntry = STARTERS_AND_POKEMON_DATABASE[selectedId];
    if (dbEntry) {
      return {
        id: dbEntry.id,
        name: dbEntry.name,
        displayName: dbEntry.displayName,
        types: dbEntry.types,
      };
    }
    return {
      id: selectedId,
      name: `pokemon-${selectedId}`,
      displayName: `Pokémon #${selectedId}`,
      types: ['normal' as const],
    };
  }, [allSpecies, selectedId]);

  // Filtered search results
  const filteredSpecies = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return allSpecies.filter((pkmn) => {
      if (genFilter === 'special') {
        if (pkmn.id !== 0 && pkmn.id !== 9999) return false;
      } else if (genFilter !== 'all') {
        if (pkmn.gen !== genFilter) return false;
      }

      if (!query) return true;

      // Match exact pokedex number
      if (String(pkmn.id) === query) return true;
      if (query.startsWith('#') && String(pkmn.id) === query.slice(1)) return true;
      if (query === '???' && (pkmn.id === 9999 || pkmn.id === 0 || pkmn.name === 'ghost')) return true;

      // Match name or display name
      return (
        pkmn.name.toLowerCase().includes(query) ||
        pkmn.displayName.toLowerCase().includes(query)
      );
    });
  }, [allSpecies, searchTerm, genFilter]);

  const handlePick = (pkmn: { id: number; displayName: string; name: string }) => {
    soundEngine.playClick();
    onSelect(pkmn.id, pkmn.displayName || pkmn.name);
    setIsOpen(false);
  };

  const getSprite = (id: number, name: string) => {
    if (id === 9999 || name === 'ghost') {
      return 'https://static.wikia.nocookie.net/fcoc-vs-battles/images/a/a2/MissingNo.2.png/revision/latest?cb=20200404195138';
    }
    if (id === 0 || name === 'missingno') {
      return 'https://static.wikia.nocookie.net/fcoc-vs-battles/images/e/e0/MissingNo.1.png/revision/latest?cb=20200404195127';
    }
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>}

      {/* Trigger Button showing current selection */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playClick();
          setIsOpen(true);
        }}
        className="w-full flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all group active:scale-[0.99] text-left shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center p-1 relative overflow-hidden shrink-0">
            <img
              src={getSprite(currentSelected.id, currentSelected.name)}
              alt={currentSelected.displayName}
              className="w-full h-full object-contain filter drop-shadow"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentSelected.id}.png`;
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                {formatPokedexId(currentSelected.id, currentSelected.name)}
              </span>
              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                {currentSelected.displayName}
              </span>
            </div>
            <div className="flex gap-1 mt-1">
              {currentSelected.types?.map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.2 rounded font-semibold text-white uppercase tracking-wider"
                  style={{ backgroundColor: TYPE_COLORS[t] || '#64748b' }}
                >
                  {TYPE_NAMES_PT[t] || t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
          <span>Pesquisar</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Modal Picker */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  Pesquisar na Pokédex Nacional (1 a 1025)
                </h3>
                <p className="text-xs text-slate-400">
                  Pesquise pelo número exato da Pokédex ou pelo nome da espécie.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input & Gen Filters */}
            <div className="py-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite número da Pokédex (ex: 25, 150, 666, 9999, 0) ou nome..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Gen filter chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setGenFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${
                    genFilter === 'all'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Todas (1025)
                </button>
                {allowBosses && (
                  <button
                    type="button"
                    onClick={() => setGenFilter('special')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${
                      genFilter === 'special'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                    }`}
                  >
                    👾 Especiais (Ghost / MissingNO.)
                  </button>
                )}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setGenFilter(gen)}
                    className={`px-2 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all ${
                      genFilter === gen
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Gen {gen}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-[280px] max-h-[50vh]">
              <div className="text-[11px] text-slate-400 font-semibold mb-1 flex justify-between">
                <span>Resultados ({filteredSpecies.length})</span>
                {filteredSpecies.length > 80 && (
                  <span className="text-amber-400">Exibindo os primeiros 80 resultados</span>
                )}
              </div>

              {filteredSpecies.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhum Pokémon encontrado para &quot;{searchTerm}&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredSpecies.slice(0, 80).map((pkmn) => {
                    const isCurrent = pkmn.id === selectedId;
                    return (
                      <button
                        key={`${pkmn.id}-${pkmn.name}`}
                        type="button"
                        onClick={() => handlePick(pkmn)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all ${
                          isCurrent
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                          <img
                            src={getSprite(pkmn.id, pkmn.name)}
                            alt={pkmn.displayName}
                            className="w-full h-full object-contain filter drop-shadow"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.id}.png`;
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">
                            {formatPokedexId(pkmn.id, pkmn.name)}
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {pkmn.displayName}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {pkmn.types?.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="text-[8px] px-1 py-0.2 rounded font-bold text-white uppercase"
                                style={{ backgroundColor: TYPE_COLORS[t] || '#64748b' }}
                              >
                                {TYPE_NAMES_PT[t] || t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
