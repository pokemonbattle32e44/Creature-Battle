import React, { useState } from 'react';
import { ArrowLeft, Backpack, Heart, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { PokemonInstance, Item } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { getMove } from '../data/movesData';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { calculateStat } from '../utils/pokemonCalc';
import { soundEngine } from '../utils/soundEngine';

interface BagViewProps {
  playerTeam: PokemonInstance[];
  userInventory: Record<string, number>;
  activeIncense?: string | null;
  incenseTimers?: Record<string, number>;
  onUpdateTeam: (team: PokemonInstance[]) => void;
  onUpdateInventory: (inventory: Record<string, number>) => void;
  onToggleIncense?: (incenseId: string) => void;
  onBack: () => void;
}

export const BagView: React.FC<BagViewProps> = ({
  playerTeam,
  userInventory,
  activeIncense,
  incenseTimers = {},
  onUpdateTeam,
  onUpdateInventory,
  onToggleIncense,
  onBack,
}) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedPokemonIndex, setSelectedPokemonIndex] = useState<number | null>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const ownedItems = Object.entries(ITEMS_DATABASE)
    .map(([id, item]) => {
      const count = userInventory[id] || 0;
      const remTimer = incenseTimers[id] || 0;
      const isIncenseWithTime = item.category === 'incense' && (remTimer > 0 || activeIncense === id);
      return { item, count, isIncenseWithTime };
    })
    .filter(({ count, isIncenseWithTime }) => count > 0 || isIncenseWithTime);

  const handleUseItemOnPokemon = (item: Item, pkmnIndex: number) => {
    const updatedTeam = [...playerTeam];
    const target = { ...updatedTeam[pkmnIndex] };

    // Handle Medicine / Potions
    if (item.category === 'medicine') {
      if (item.isRevive) {
        if (target.currentHp > 0) {
          showToast(`${target.displayName} não está desmaiado!`);
          return;
        }
        const healHp = Math.floor((target.maxHp * (item.healAmount || 50)) / 100);
        target.currentHp = healHp;
        soundEngine.playCatchSuccess();
        showToast(`${target.displayName} foi revivido com ${healHp} HP!`);
      } else {
        if (target.currentHp <= 0) {
          showToast(`${target.displayName} está desmaiado! Use um Reviver.`);
          return;
        }
        if (item.healAmount) {
          if (target.currentHp >= target.maxHp) {
            showToast(`O HP de ${target.displayName} já está cheio!`);
            return;
          }
          target.currentHp = Math.min(target.maxHp, target.currentHp + item.healAmount);
          soundEngine.playCatchSuccess();
          showToast(`HP de ${target.displayName} foi restaurado!`);
        }
        if (item.cureStatus) {
          target.status = 'none';
          soundEngine.playCatchSuccess();
          showToast(`O status de ${target.displayName} foi curado!`);
        }
      }
    }

    // Handle Rare Candy
    if (item.category === 'candy') {
      target.level += 1;
      const newMaxHp = calculateStat(target.baseStats.hp, target.level, true);
      target.maxHp = newMaxHp;
      target.currentHp = target.maxHp;
      target.calculatedStats = {
        hp: newMaxHp,
        atk: calculateStat(target.baseStats.atk, target.level),
        def: calculateStat(target.baseStats.def, target.level),
        spAtk: calculateStat(target.baseStats.spAtk, target.level),
        spDef: calculateStat(target.baseStats.spDef, target.level),
        spd: calculateStat(target.baseStats.spd, target.level),
      };
      target.exp = Math.pow(target.level, 3);
      target.expToNext = Math.pow(target.level + 1, 3);

      // Move learning check
      const baseData = STARTERS_AND_POKEMON_DATABASE[target.pokedexId];
      if (baseData && baseData.levelUpMoves) {
        const movesForThisLevel = baseData.levelUpMoves.filter((m) => m.level === target.level);
        for (const nm of movesForThisLevel) {
          if (!target.moves.some((m) => m.moveId === nm.moveId)) {
            const newMoveData = getMove(nm.moveId);
            if (target.moves.length < 4) {
              target.moves.push({ moveId: nm.moveId, pp: newMoveData.pp, maxPp: newMoveData.maxPp });
            } else {
              target.moves = [...target.moves.slice(1), { moveId: nm.moveId, pp: newMoveData.pp, maxPp: newMoveData.maxPp }];
            }
          }
        }
      }

      soundEngine.playLevelUp();
      showToast(`✨ ${target.isShiny ? '✨ ' : ''}${target.displayName} subiu para o NÍVEL ${target.level}!`);
    }

    // Handle TMs (Teach move)
    if (item.category === 'tm' && item.tmMoveId) {
      const moveData = getMove(item.tmMoveId);
      const alreadyHasMove = target.moves.some((m) => m.moveId === item.tmMoveId);

      if (alreadyHasMove) {
        showToast(`${target.displayName} já conhece o golpe ${moveData.name}!`);
        return;
      }

      if (target.moves.length < 4) {
        target.moves.push({ moveId: item.tmMoveId, pp: moveData.pp, maxPp: moveData.maxPp });
        soundEngine.playCatchSuccess();
        showToast(`${target.displayName} aprendeu ${moveData.name}!`);
      } else {
        // Replace first move for simplicity or prompt
        target.moves[0] = { moveId: item.tmMoveId, pp: moveData.pp, maxPp: moveData.maxPp };
        soundEngine.playCatchSuccess();
        showToast(`${target.displayName} aprendeu ${moveData.name}!`);
      }
    }

    // Update state
    updatedTeam[pkmnIndex] = target;
    onUpdateTeam(updatedTeam);

    // Consume inventory item
    const newInv = { ...userInventory, [item.id]: userInventory[item.id] - 1 };
    onUpdateInventory(newInv);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between select-none">
      
      {/* Top Bar */}
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

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-teal-400 font-bold text-xs">
            <Backpack className="w-4 h-4" /> MOCHILA DE ITENS
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="max-w-md mx-auto mb-4 p-3 bg-slate-900 border border-teal-500/50 rounded-xl text-center text-teal-300 text-xs font-bold animate-bounce shadow-xl">
            {toastMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto">
          
          {/* Item List (7 cols) */}
          <div className="md:col-span-7 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Itens em Posse ({ownedItems.length})
            </div>

            {ownedItems.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Sua mochila está vazia. Visite a Loja para comprar itens!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ownedItems.map(({ item, count, isIncenseWithTime }) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isActive = activeIncense === item.id;
                  const remSec = incenseTimers[item.id] ?? 1800;
                  const mins = Math.floor(remSec / 60);
                  const secs = remSec % 60;
                  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedItem(item);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-teal-500 ring-2 ring-teal-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={item.sprite} alt={item.name} referrerPolicy="no-referrer" className="w-8 h-8 object-contain shrink-0" />
                        <div>
                          <h4 className="font-bold text-xs text-white capitalize leading-tight">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[10px] sm:text-xs text-teal-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 shrink-0">
                        {isActive
                          ? `Ativo (${timeFormatted})`
                          : isIncenseWithTime
                          ? `Pausado (${timeFormatted})`
                          : `x${count}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Target Pokemon Selector Panel (5 cols) */}
          <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Usar Item na Equipe
              </div>

              {selectedItem ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={selectedItem.sprite} alt={selectedItem.name} className="w-10 h-10 object-contain" />
                    <div>
                      <h3 className="font-bold text-xs text-white capitalize">{selectedItem.name}</h3>
                      <p className="text-[10px] text-slate-400">{selectedItem.description}</p>
                    </div>
                  </div>

                  {selectedItem.category === 'incense' && (() => {
                    const isActive = activeIncense === selectedItem.id;
                    const remSec = incenseTimers[selectedItem.id] ?? 1800;
                    const mins = Math.floor(remSec / 60);
                    const secs = remSec % 60;
                    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                    return (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            if (onToggleIncense) {
                              soundEngine.playCatchSuccess();
                              onToggleIncense(selectedItem.id);
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                            isActive
                              ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 shadow-amber-950/50'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          {isActive
                            ? `Pausar / Desativar (${timeFormatted})`
                            : remSec < 1800
                            ? `Retomar Incenso (${timeFormatted} restantes)`
                            : `Ativar ${selectedItem.name} (30:00)`}
                        </button>
                        <p className="text-[10px] text-slate-400 text-center">
                          {isActive
                            ? 'Clique para pausar o cronômetro e guardar o tempo restante para mais tarde.'
                            : 'Cada incenso possui 30 minutos de duração total ativada.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-500 mb-4 text-center">
                  Selecione um item da mochila à esquerda para usá-lo.
                </div>
              )}

              {/* Party Member List */}
              <div className="space-y-2">
                {playerTeam.map((pkmn, idx) => (
                  <button
                    key={pkmn.instanceId}
                    onClick={() => {
                      if (selectedItem) {
                        handleUseItemOnPokemon(selectedItem, idx);
                      }
                    }}
                    disabled={!selectedItem}
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/50 p-2.5 rounded-xl flex items-center justify-between transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={pkmn.sprites.front} alt={pkmn.displayName} className="w-10 h-10 object-contain" />
                      <div className="text-left">
                        <div className="font-bold text-xs text-white capitalize">
                          {pkmn.isShiny ? `✨ ${pkmn.displayName}` : pkmn.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Nv. {pkmn.level} • {pkmn.currentHp}/{pkmn.maxHp} HP
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-teal-400 group-hover:translate-x-1 transition-transform">
                      Usar
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
