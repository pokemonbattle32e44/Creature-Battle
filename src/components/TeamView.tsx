import React, { useState } from 'react';
import { ArrowLeft, Users, ArrowUp, ArrowDown, Sparkles, BookOpen, Heart, Zap, Shield, Swords } from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { getMove } from '../data/movesData';
import { soundEngine } from '../utils/soundEngine';
import { RarityBadge } from './RarityBadge';

interface TeamViewProps {
  playerTeam: PokemonInstance[];
  onUpdateTeam: (team: PokemonInstance[]) => void;
  onBack: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  playerTeam,
  onUpdateTeam,
  onBack,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedPokemon = playerTeam[selectedIndex] || playerTeam[0];

  const handleSwapOrder = (index: number, direction: 'up' | 'down') => {
    soundEngine.playClick();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= playerTeam.length) return;

    const newTeam = [...playerTeam];
    const temp = newTeam[index];
    newTeam[index] = newTeam[newIndex];
    newTeam[newIndex] = temp;

    onUpdateTeam(newTeam);
    setSelectedIndex(newIndex);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between select-none">
      
      {/* Top Header */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              soundEngine.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Menu Principal
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-indigo-400 font-bold text-xs">
            <Users className="w-4 h-4" /> GESTÃO DE EQUIPE ({playerTeam.length}/6)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto">
          
          {/* Party Cards List (5 cols) */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Seus Pokémon ({playerTeam.length})
            </div>

            {playerTeam.map((pkmn, idx) => {
              const isSelected = selectedIndex === idx;
              const isLead = idx === 0;

              return (
                <div
                  key={pkmn.instanceId}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedIndex(idx);
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={pkmn.sprites.front} alt={pkmn.displayName} className="w-12 h-12 object-contain" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-white capitalize">
                          {pkmn.displayName}
                        </span>
                        <RarityBadge
                          isRestricted={pkmn.isRestricted}
                          isPseudoLegendary={pkmn.isPseudoLegendary}
                          isShiny={pkmn.isShiny}
                          size="sm"
                        />
                        {isLead && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                            LÍDER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Nv. {pkmn.level} • {pkmn.currentHp}/{pkmn.maxHp} HP
                      </div>
                    </div>
                  </div>

                  {/* Move Up / Down controls */}
                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSwapOrder(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSwapOrder(idx, 'down')}
                      disabled={idx === playerTeam.length - 1}
                      className="p-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Pokemon Detail View (7 cols) */}
          <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            {selectedPokemon && (
              <div>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <span className="text-xs font-mono text-slate-400">#{String(selectedPokemon.pokedexId).padStart(3, '0')}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-black text-white capitalize">
                        {selectedPokemon.displayName}
                      </h2>
                      <RarityBadge
                        isRestricted={selectedPokemon.isRestricted}
                        isPseudoLegendary={selectedPokemon.isPseudoLegendary}
                        isShiny={selectedPokemon.isShiny}
                        size="md"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {selectedPokemon.types.map((t) => (
                      <span key={t} className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text}`}>
                        {TYPE_NAMES_PT[t]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Big Sprite & Ability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                  <div className="flex justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                    <img
                      src={selectedPokemon.sprites.artwork || selectedPokemon.sprites.animatedFront || selectedPokemon.sprites.front}
                      alt={selectedPokemon.displayName}
                      className="w-32 h-32 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-0.5">Habilidade</span>
                      <span className="font-bold text-white capitalize">{selectedPokemon.ability}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-0.5">Experiência</span>
                      <span className="font-mono text-teal-400 font-bold">{selectedPokemon.exp} / {selectedPokemon.expToNext} EXP</span>
                    </div>
                  </div>
                </div>

                {/* Calculated Stats Grid */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Estatísticas de Batalha (Nível {selectedPokemon.level})
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-red-400 text-[10px] block font-sans">HP MÁX</span>
                      <span className="font-bold text-white">{selectedPokemon.maxHp}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-400 text-[10px] block font-sans">ATAQUE</span>
                      <span className="font-bold text-white">{selectedPokemon.calculatedStats.atk}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-blue-400 text-[10px] block font-sans">DEFESA</span>
                      <span className="font-bold text-white">{selectedPokemon.calculatedStats.def}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-purple-400 text-[10px] block font-sans">ATQ. ESP.</span>
                      <span className="font-bold text-white">{selectedPokemon.calculatedStats.spAtk}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-indigo-400 text-[10px] block font-sans">DEF. ESP.</span>
                      <span className="font-bold text-white">{selectedPokemon.calculatedStats.spDef}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-pink-400 text-[10px] block font-sans">VELOCIDADE</span>
                      <span className="font-bold text-white">{selectedPokemon.calculatedStats.spd}</span>
                    </div>
                  </div>
                </div>

                {/* Known Moves List */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ataques Conhecidos ({selectedPokemon.moves.length}/4)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPokemon.moves.map((mInst) => {
                      const moveData = getMove(mInst.moveId);
                      return (
                        <div key={mInst.moveId} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-xs text-white capitalize">{moveData.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Poder: {moveData.power || '—'}</div>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${TYPE_COLORS[moveData.type].bg} ${TYPE_COLORS[moveData.type].text}`}>
                            {TYPE_NAMES_PT[moveData.type]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
