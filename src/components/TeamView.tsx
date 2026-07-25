import React, { useState } from 'react';
import { ArrowLeft, Users, ArrowUp, ArrowDown, Sparkles, BookOpen, Heart, Zap, Shield, Swords, Package, ArrowRightLeft } from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { getMove } from '../data/movesData';
import { soundEngine } from '../utils/soundEngine';
import { RarityBadge } from './RarityBadge';
import { getPokemonSpriteStyle } from '../data/startersAndPokemon';

interface TeamViewProps {
  playerTeam: PokemonInstance[];
  pcBox: PokemonInstance[];
  onUpdateTeamAndBox: (team: PokemonInstance[], box: PokemonInstance[]) => void;
  onBack: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  playerTeam,
  pcBox,
  onUpdateTeamAndBox,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'box'>('team');
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(0); // Box 1 to 5
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBoxPkmnIndex, setSelectedBoxPkmnIndex] = useState<number | null>(null);

  const safeTeam = Array.isArray(playerTeam) ? playerTeam.filter(Boolean) : [];
  const safePcBox = Array.isArray(pcBox) ? pcBox.filter(Boolean) : [];

  const selectedPokemon = activeTab === 'team'
    ? safeTeam[selectedIndex] || safeTeam[0] || null
    : selectedBoxPkmnIndex !== null ? safePcBox[selectedBoxPkmnIndex] || null : null;

  const handleSwapOrder = (index: number, direction: 'up' | 'down') => {
    soundEngine.playClick();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= safeTeam.length) return;

    const newTeam = [...safeTeam];
    const temp = newTeam[index];
    newTeam[index] = newTeam[newIndex];
    newTeam[newIndex] = temp;

    onUpdateTeamAndBox(newTeam, safePcBox);
    setSelectedIndex(newIndex);
  };

  const handleDepositToBox = (teamIdx: number) => {
    if (safeTeam.length <= 1) {
      soundEngine.playHit('notVery');
      alert('Você precisa ter pelo menos 1 Pokémon no seu time!');
      return;
    }
    soundEngine.playClick();
    const target = safeTeam[teamIdx];
    const newTeam = safeTeam.filter((_, idx) => idx !== teamIdx);
    const newBox = [...safePcBox, target];

    onUpdateTeamAndBox(newTeam, newBox);
    setSelectedIndex(0);
  };

  const handleWithdrawToTeam = (boxIdx: number) => {
    if (safeTeam.length >= 6) {
      soundEngine.playHit('notVery');
      alert('Sua equipe já está cheia (máximo 6 Pokémon)!');
      return;
    }
    soundEngine.playClick();
    const target = safePcBox[boxIdx];
    if (!target) return;
    const newBox = safePcBox.filter((_, idx) => idx !== boxIdx);
    const newTeam = [...safeTeam, target];

    onUpdateTeamAndBox(newTeam, newBox);
    setSelectedBoxPkmnIndex(null);
  };

  // 30 per box
  const boxPageStart = selectedBoxIndex * 30;
  const currentBoxPokemon = safePcBox.slice(boxPageStart, boxPageStart + 30);

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

          <div className="flex gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('team');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'team' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Equipe ({playerTeam.length}/6)
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveTab('box');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'box' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 text-amber-400" /> PC Box ({pcBox.length})
            </button>
          </div>
        </div>

        {activeTab === 'team' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto">
            {/* Party Cards List (5 cols) */}
            <div className="md:col-span-5 space-y-2.5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Seus Pokémon da Equipe ({playerTeam.length})
              </div>

              {playerTeam.map((pkmn, idx) => {
                const isSelected = selectedIndex === idx;
                const isLead = idx === 0;

                return (
                  <div
                    key={pkmn.instanceId || idx}
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
                      <img
                        src={pkmn.sprites?.front || ''}
                        alt={pkmn.displayName}
                        style={getPokemonSpriteStyle(pkmn)}
                        className="w-12 h-12 object-contain"
                      />
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

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDepositToBox(idx)}
                        title="Enviar para a PC Box"
                        className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/30"
                      >
                        Mover ao PC
                      </button>

                      {/* Move Up / Down controls */}
                      <div className="flex flex-col gap-1">
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
                  </div>
                );
              })}
            </div>

            {/* Selected Pokemon Detail View (7 cols) */}
            <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              {selectedPokemon && (
                <div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                    <div className="flex justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                      <img
                        src={selectedPokemon.sprites?.artwork || selectedPokemon.sprites?.animatedFront || selectedPokemon.sprites?.front || ''}
                        alt={selectedPokemon.displayName}
                        style={getPokemonSpriteStyle(selectedPokemon)}
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
        ) : (
          /* PC Box Storage View */
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((boxNum) => (
                  <button
                    key={boxNum}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedBoxIndex(boxNum);
                      setSelectedBoxPkmnIndex(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedBoxIndex === boxNum
                        ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Caixa {boxNum + 1}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-400">
                Total na Nuvem: {pcBox.length} Pokémon
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Box Pokemon Grid (7 cols) */}
              <div className="md:col-span-7 bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Caixa {selectedBoxIndex + 1} (30 Espaços)
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
                  {currentBoxPokemon.map((pkmn, idx) => {
                    const realIndex = boxPageStart + idx;
                    const isSelected = selectedBoxPkmnIndex === realIndex;
                    return (
                      <button
                        key={pkmn.instanceId || idx}
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedBoxPkmnIndex(realIndex);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={pkmn.sprites?.front || ''} alt={pkmn.displayName} style={getPokemonSpriteStyle(pkmn)} className="w-10 h-10 object-contain" />
                        <span className="text-[10px] font-bold text-white truncate w-full text-center">{pkmn.displayName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">Nv.{pkmn.level}</span>
                      </button>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 30 - currentBoxPokemon.length) }).map((_, i) => (
                    <div key={i} className="border border-dashed border-slate-800/60 rounded-xl h-20 flex items-center justify-center text-[10px] text-slate-700">
                      Vazio
                    </div>
                  ))}
                </div>
              </div>

              {/* Box Selected Detail (5 cols) */}
              <div className="md:col-span-5 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                {selectedPokemon ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                      <img src={selectedPokemon.sprites?.front || ''} alt={selectedPokemon.displayName} style={getPokemonSpriteStyle(selectedPokemon)} className="w-16 h-16 object-contain bg-slate-950 rounded-2xl border border-slate-800" />
                      <div>
                        <h3 className="text-lg font-black text-white capitalize">{selectedPokemon.displayName}</h3>
                        <p className="text-xs text-slate-400 font-mono">Nível {selectedPokemon.level}</p>
                        <p className="text-[10px] text-slate-500">Habilidade: {selectedPokemon.ability}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">HP:</span>
                        <span className="font-bold text-white">{selectedPokemon.maxHp}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Ataque:</span>
                        <span className="font-bold text-white">{selectedPokemon.calculatedStats.atk}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Defesa:</span>
                        <span className="font-bold text-white">{selectedPokemon.calculatedStats.def}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Velocidade:</span>
                        <span className="font-bold text-white">{selectedPokemon.calculatedStats.spd}</span>
                      </div>
                    </div>

                    {selectedBoxPkmnIndex !== null && (
                      <button
                        onClick={() => handleWithdrawToTeam(selectedBoxPkmnIndex)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="w-4 h-4" /> Trazer para a Equipe
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 text-xs text-slate-500">
                    Selecione um Pokémon da Caixa ao lado para ver os detalhes
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
