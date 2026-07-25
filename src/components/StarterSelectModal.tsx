import React, { useState, useEffect, useMemo } from 'react';
import { Search, Sparkles, AlertCircle, ShieldAlert, CheckCircle2, Filter } from 'lucide-react';
import { PokemonBaseData } from '../types/pokemon';
import { fetchPokemonData } from '../utils/apiFetcher';
import { NATIONAL_POKEDEX_INDEX, NationalPokedexEntry } from '../data/nationalPokedex';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { soundEngine } from '../utils/soundEngine';

interface StarterSelectModalProps {
  onSelectStarter: (pokemonData: PokemonBaseData) => void;
}

export const StarterSelectModal: React.FC<StarterSelectModalProps> = ({ onSelectStarter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGen, setSelectedGen] = useState<number | 'all'>('all');
  const [selectedStarter, setSelectedStarter] = useState<PokemonBaseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Eligible starters: Stage 1 / single stage species from National Dex
  const stage1Species = useMemo(() => {
    return NATIONAL_POKEDEX_INDEX.filter((entry) => entry.isStage1Basic);
  }, []);

  const filteredSpecies = useMemo(() => {
    return stage1Species.filter((entry) => {
      const matchGen = selectedGen === 'all' || entry.gen === selectedGen;
      const matchSearch =
        !searchTerm.trim() ||
        entry.displayName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        entry.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        String(entry.id) === searchTerm.trim();
      return matchGen && matchSearch;
    });
  }, [stage1Species, selectedGen, searchTerm]);

  // Load initial selection (Bulbasaur #1 or first available)
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      const data = await fetchPokemonData(1);
      if (data) setSelectedStarter(data);
      setLoading(false);
    };
    loadInitial();
  }, []);

  const handleSelectSpecies = async (entry: NationalPokedexEntry) => {
    soundEngine.playClick();
    setLoading(true);
    setErrorMessage(null);
    const data = await fetchPokemonData(entry.id);
    setLoading(false);
    if (data) {
      setSelectedStarter(data);
    } else {
      setErrorMessage(`Erro ao carregar dados de ${entry.displayName}. Tente novamente.`);
    }
  };

  const handleConfirmSelect = () => {
    if (selectedStarter) {
      soundEngine.playLevelUp();
      onSelectStarter(selectedStarter);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Escolha seu Inicial (Todas as Geracões #1 a #1025)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Selecione seu Primeiro Pokémon
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Escolha qualquer Pokémon de 1º estágio ou estágio único entre os <span className="text-emerald-400 font-bold">1025 Pokémon</span> da PokéDex Nacional!
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1 items-center">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquise por nome ou ID (ex: Charmander, Cyndaquil, Froakie, Sprigatito, #25)..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          {/* Gen Selector */}
          <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
            {['all', 1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
              <button
                key={String(gen)}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedGen(gen as any);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGen === gen
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                {gen === 'all' ? 'Todas Gens' : `Gen ${gen}`}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3 p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-300 text-xs animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid & Selected Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-hidden flex-1">
          
          {/* Starters Grid */}
          <div className="md:col-span-7 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
              <span>Opções Disponíveis ({filteredSpecies.length})</span>
              {loading && <span className="text-emerald-400 animate-pulse">Carregando dados...</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredSpecies.slice(0, 150).map((pkmn) => {
                const isSelected = selectedStarter?.id === pkmn.id;
                return (
                  <button
                    key={pkmn.id}
                    onClick={() => handleSelectSpecies(pkmn)}
                    className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col items-center justify-between group ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg scale-[1.02]'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-mono self-start">#{String(pkmn.id).padStart(4, '0')}</div>
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.id}.png`}
                      alt={pkmn.displayName}
                      className="w-14 h-14 object-contain my-1 group-hover:scale-110 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="font-bold text-xs text-white capitalize text-center truncate w-full">
                      {pkmn.displayName}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap justify-center">
                      {pkmn.types.map((type) => (
                        <span
                          key={type}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
                        >
                          {TYPE_NAMES_PT[type]}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredSpecies.length > 150 && (
              <div className="text-center text-[11px] text-slate-500 py-2">
                Mostrando 150 de {filteredSpecies.length} resultados. Use a barra de pesquisa para encontrar Pokémon específicos!
              </div>
            )}
          </div>

          {/* Selected Starter Preview Panel */}
          <div className="md:col-span-5 bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden">
            {selectedStarter ? (
              <>
                <div className="w-full">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-1">
                    <span>NÍVEL 1</span>
                    <span>#{String(selectedStarter.id).padStart(4, '0')}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white capitalize tracking-wide">
                    {selectedStarter.displayName}
                  </h2>
                  <div className="flex justify-center gap-1.5 my-2">
                    {selectedStarter.types.map((type) => (
                      <span
                        key={type}
                        className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
                      >
                        {TYPE_NAMES_PT[type]}
                      </span>
                    ))}
                  </div>

                  {/* Big Image */}
                  <div className="relative py-2 flex justify-center items-center">
                    <div className="absolute w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <img
                      src={selectedStarter.sprites.artwork || selectedStarter.sprites.animatedFront || selectedStarter.sprites.front}
                      alt={selectedStarter.displayName}
                      className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
                    />
                  </div>

                  {/* Base Stats Bars */}
                  <div className="w-full bg-slate-900/80 rounded-lg p-2.5 space-y-1.5 text-xs text-left border border-slate-700/40 my-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">
                      Estatísticas Base
                    </div>
                    <StatBar label="HP" value={selectedStarter.baseStats.hp} color="bg-emerald-500" />
                    <StatBar label="Ataque" value={selectedStarter.baseStats.atk} color="bg-amber-500" />
                    <StatBar label="Defesa" value={selectedStarter.baseStats.def} color="bg-blue-500" />
                    <StatBar label="Atq. Esp." value={selectedStarter.baseStats.spAtk} color="bg-purple-500" />
                    <StatBar label="Def. Esp." value={selectedStarter.baseStats.spDef} color="bg-indigo-500" />
                    <StatBar label="Velocidade" value={selectedStarter.baseStats.spd} color="bg-pink-500" />
                  </div>
                </div>

                <button
                  onClick={handleConfirmSelect}
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Escolher {selectedStarter.displayName}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                Selecione um Pokémon na lista
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const percent = Math.min(100, Math.round((value / 160) * 100));
  return (
    <div className="flex items-center text-[11px] gap-2">
      <span className="w-16 text-slate-400 font-medium truncate">{label}</span>
      <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${percent}%` }}></div>
      </div>
      <span className="w-7 text-right font-mono font-bold text-slate-200">{value}</span>
    </div>
  );
};
