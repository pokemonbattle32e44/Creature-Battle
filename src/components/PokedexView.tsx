import React, { useState } from 'react';
import { ArrowLeft, Search, CheckCircle2, Eye, HelpCircle, Sparkles, Heart, Zap, Shield, Swords, BookOpen, Filter, X } from 'lucide-react';
import { PokemonBaseData, PokemonType } from '../types/pokemon';
import { NATIONAL_POKEDEX_INDEX, NationalPokedexEntry } from '../data/nationalPokedex';
import { fetchPokemonData } from '../utils/apiFetcher';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { getMove } from '../data/movesData';
import { soundEngine } from '../utils/soundEngine';
import { RarityBadge } from './RarityBadge';

interface PokedexViewProps {
  pokedexSeen: number[];
  pokedexCaught: number[];
  onBack: () => void;
}

export const PokedexView: React.FC<PokedexViewProps> = ({
  pokedexSeen,
  pokedexCaught,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'caught' | 'seen' | 'unknown'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonBaseData | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const allEntries = NATIONAL_POKEDEX_INDEX;
  const totalInDb = 1025;

  const caughtSet = new Set(pokedexCaught);
  const seenSet = new Set(pokedexSeen);

  const totalCaught = pokedexCaught.length;
  const totalSeen = pokedexSeen.length;
  const caughtPercent = Math.round((totalCaught / totalInDb) * 100);

  const handleSelectPokemon = async (entry: NationalPokedexEntry) => {
    soundEngine.playClick();
    setLoadingSelected(true);
    const fullData = await fetchPokemonData(entry.id);
    setLoadingSelected(false);
    if (fullData) setSelectedPokemon(fullData);
  };

  // Filter entries
  const filteredEntries = allEntries.filter((p) => {
    const isCaught = caughtSet.has(p.id);
    const isSeen = seenSet.has(p.id);

    // Status filter
    if (statusFilter === 'caught' && !isCaught) return false;
    if (statusFilter === 'seen' && (!isSeen || isCaught)) return false;
    if (statusFilter === 'unknown' && (isSeen || isCaught)) return false;

    // Type filter
    if (typeFilter !== 'all') {
      if (!isSeen && !isCaught) return false; // hide unknown if filtering by type
      if (!p.types.includes(typeFilter as PokemonType)) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      const matchId = String(p.id).includes(query);
      const matchName = isSeen || isCaught ? p.displayName.toLowerCase().includes(query) : false;
      if (!matchId && !matchName) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between select-none">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              soundEngine.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all active:scale-95 self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Menu Principal
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-emerald-400 font-bold text-xs">
            <BookOpen className="w-4 h-4" /> POKÉDEX NACIONAL
          </div>
        </div>

        {/* Progress Bar Card */}
        <div className="max-w-6xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Progresso da Pokédex
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe os Pokémon descobertos e capturados na sua jornada.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="bg-emerald-950/80 border border-emerald-800/80 px-3 py-1.5 rounded-xl text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Capturados: <strong className="font-mono text-white">{totalCaught}</strong></span>
              </div>
              <div className="bg-sky-950/80 border border-sky-800/80 px-3 py-1.5 rounded-xl text-sky-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-400" />
                <span>Vistos: <strong className="font-mono text-white">{totalSeen}</strong></span>
              </div>
              <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300">
                Total: <strong className="font-mono text-white">{totalInDb}</strong>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 font-mono">
              <span>0%</span>
              <span className="text-emerald-400 font-extrabold">{caughtPercent}% Completo</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${caughtPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="max-w-6xl mx-auto space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou N.º (#)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
              <button
                onClick={() => { soundEngine.playClick(); setStatusFilter('all'); }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  statusFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({allEntries.length})
              </button>
              <button
                onClick={() => { soundEngine.playClick(); setStatusFilter('caught'); }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  statusFilter === 'caught' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Capturados ({totalCaught})
              </button>
              <button
                onClick={() => { soundEngine.playClick(); setStatusFilter('seen'); }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  statusFilter === 'seen' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vistos ({totalSeen - totalCaught})
              </button>
              <button
                onClick={() => { soundEngine.playClick(); setStatusFilter('unknown'); }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  statusFilter === 'unknown' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Não Encontrados ({totalInDb - totalSeen})
              </button>
            </div>
          </div>
        </div>

        {/* Grid List */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-10">
          {filteredEntries.map((pkmn) => {
            const isCaught = caughtSet.has(pkmn.id);
            const isSeen = seenSet.has(pkmn.id);

            return (
              <div
                key={pkmn.id}
                onClick={() => {
                  if (isCaught || isSeen) {
                    handleSelectPokemon(pkmn);
                  }
                }}
                className={`rounded-2xl border p-3 flex flex-col items-center text-center relative transition-all duration-200 select-none ${
                  isCaught
                    ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60 hover:scale-105 cursor-pointer shadow-lg'
                    : isSeen
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-sky-500/60 hover:scale-102 cursor-pointer'
                    : 'bg-slate-950/80 border-slate-900 opacity-60'
                }`}
              >
                {/* ID Badge */}
                <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                  <span>#{pkmn.id === 666 ? '???' : String(pkmn.id).padStart(4, '0')}</span>
                  {isCaught ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Pego
                    </span>
                  ) : isSeen ? (
                    <span className="text-sky-400 font-bold flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> Visto
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold">
                      <HelpCircle className="w-3 h-3 inline" /> ???
                    </span>
                  )}
                </div>

                {/* Sprite / Silhouette */}
                <div className="w-20 h-20 my-1 flex items-center justify-center relative">
                  {isCaught || isSeen ? (
                    <img
                      src={
                        pkmn.id === 666
                          ? 'https://static.wikia.nocookie.net/fcoc-vs-battles/images/a/a2/MissingNo.2.png/revision/latest?cb=20200404195138'
                          : pkmn.id === 0
                          ? 'https://static.wikia.nocookie.net/fcoc-vs-battles/images/e/e0/MissingNo.1.png/revision/latest?cb=20200404195127'
                          : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.id}.png`
                      }
                      alt={pkmn.displayName}
                      className={`w-full h-full object-contain ${
                        !isCaught && isSeen ? 'brightness-0 opacity-40 blur-[0.5px]' : ''
                      } ${pkmn.id === 666 ? 'ghost-aura' : ''} ${pkmn.id === 0 ? 'missingno-pixel-glitch' : ''}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-800/50 flex items-center justify-center text-slate-700 text-2xl font-black">
                      ?
                    </div>
                  )}
                </div>

                {/* Name & Badge */}
                <div className="flex flex-col items-center gap-1 w-full mt-1">
                  <span className="font-bold text-xs text-white capitalize truncate max-w-full">
                    {isCaught || isSeen ? pkmn.displayName : '???'}
                  </span>
                  {(isCaught || isSeen) && (
                    <RarityBadge
                      isRestricted={pkmn.isRestricted}
                      isPseudoLegendary={pkmn.isPseudoLegendary}
                      size="sm"
                    />
                  )}
                </div>

                {/* Types */}
                <div className="flex gap-1 mt-1.5 flex-wrap justify-center">
                  {isCaught || isSeen ? (
                    pkmn.types.map((type) => (
                      <span
                        key={type}
                        className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
                      >
                        {TYPE_NAMES_PT[type]}
                      </span>
                    ))
                  ) : (
                    <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-slate-900 text-slate-600">
                      ???
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhum Pokémon encontrado para esses filtros.
          </div>
        )}
      </div>

      {/* Pokémon Detail Modal */}
      {selectedPokemon && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl flex flex-col items-center max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPokemon(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                #{String(selectedPokemon.id).padStart(3, '0')}
              </span>
              <h3 className="text-2xl font-black text-white capitalize">
                {selectedPokemon.displayName}
              </h3>
              <RarityBadge
                isRestricted={selectedPokemon.isRestricted}
                isPseudoLegendary={(selectedPokemon as any).isPseudoLegendary}
                size="md"
              />
            </div>

            {/* Types */}
            <div className="flex gap-2 my-2">
              {selectedPokemon.types.map((type) => (
                <span
                  key={type}
                  className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
                >
                  {TYPE_NAMES_PT[type]}
                </span>
              ))}
            </div>

            {/* Main Sprite */}
            <div className="w-40 h-40 my-3 relative flex items-center justify-center">
              <img
                src={selectedPokemon.sprites.artwork || selectedPokemon.sprites.front}
                alt={selectedPokemon.displayName}
                className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              {caughtSet.has(selectedPokemon.id) ? (
                <span className="text-xs bg-emerald-950 border border-emerald-700 text-emerald-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Capturado na Pokédex
                </span>
              ) : (
                <span className="text-xs bg-sky-950 border border-sky-700 text-sky-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-sky-400" /> Registrado como Visto
                </span>
              )}
            </div>

            {/* Base Stats Grid */}
            {caughtSet.has(selectedPokemon.id) ? (
              <div className="w-full space-y-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs mb-4">
                <div className="font-extrabold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
                  Estatísticas Base
                </div>
                {Object.entries(selectedPokemon.baseStats).map(([stat, rawVal]) => {
                  const val = Number(rawVal);
                  const labelMap: Record<string, string> = {
                    hp: 'Vida (HP)',
                    atk: 'Ataque',
                    def: 'Defesa',
                    spAtk: 'Atq. Especial',
                    spDef: 'Def. Especial',
                    spd: 'Velocidade',
                  };
                  return (
                    <div key={stat} className="flex items-center gap-3">
                      <span className="w-28 text-slate-400 font-bold">{labelMap[stat] || stat}</span>
                      <span className="w-10 font-mono font-bold text-white text-right">{val}</span>
                      <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (val / 160) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center text-xs text-slate-400 mb-4">
                Estatísticas detalhadas ficam disponíveis após capturar este Pokémon!
              </div>
            )}

            {/* Evolution Info */}
            {selectedPokemon.evolution && (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 text-center mb-4">
                <strong>Evolução:</strong> Evolui no Nível {selectedPokemon.evolution.minLevel || 'Especial'} para{' '}
                <span className="capitalize font-bold text-emerald-400">{selectedPokemon.evolution.targetName}</span>
              </div>
            )}

            {/* Learnable Moves Preview */}
            {caughtSet.has(selectedPokemon.id) && selectedPokemon.levelUpMoves.length > 0 && (
              <div className="w-full text-left">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Ataques Aprendidos por Nível
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPokemon.levelUpMoves.slice(0, 6).map((m) => {
                    const moveData = getMove(m.moveId);
                    return (
                      <div
                        key={m.moveId}
                        className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-white block">{moveData.name}</span>
                          <span className={`text-[9px] px-1 rounded font-bold uppercase ${TYPE_COLORS[moveData.type].bg} ${TYPE_COLORS[moveData.type].text}`}>
                            {TYPE_NAMES_PT[moveData.type]}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">Nv. {m.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
