import React, { useState, useEffect } from 'react';
import { Swords, Backpack, Disc, Users, Footprints, Shield, Heart, Sparkles, AlertCircle, ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { PokemonInstance, Move, Item, StatusAilment, WeatherType } from '../types/pokemon';
import { calculateDamage, calculateCatchRate, getStatMultiplier, calculateStat, getEffectiveStat } from '../utils/pokemonCalc';
import { getMove } from '../data/movesData';
import { TYPE_COLORS, TYPE_NAMES_PT, getTypeEffectiveness } from '../data/typeChart';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { soundEngine } from '../utils/soundEngine';
import { RarityBadge } from './RarityBadge';
import confetti from 'canvas-confetti';

interface BattleViewProps {
  playerTeam: PokemonInstance[];
  wildPokemon: PokemonInstance;
  userInventory: Record<string, number>;
  onUpdateTeam: (team: PokemonInstance[]) => void;
  onUpdateInventory: (inventory: Record<string, number>) => void;
  onWinBattle: (finalTeam: PokemonInstance[], moneyGained: number, caughtPokemon?: PokemonInstance) => void;
  onRunAway: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  playerTeam,
  wildPokemon: initialWild,
  userInventory,
  onUpdateTeam,
  onUpdateInventory,
  onWinBattle,
  onRunAway,
}) => {
  // Battle state
  const [team, setTeam] = useState<PokemonInstance[]>(playerTeam);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [enemy, setEnemy] = useState<PokemonInstance>(initialWild);
  const [weather, setWeather] = useState<WeatherType>('none');
  const [weatherTurns, setWeatherTurns] = useState(0);

  // Interface state
  const [battleMenu, setBattleMenu] = useState<'main' | 'fight' | 'bag' | 'switch'>('main');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingText, setFloatingText] = useState<{ target: 'player' | 'enemy'; text: string; color: string } | null>(null);
  
  // Pokéball Throw animation state
  const [ballThrowing, setBallThrowing] = useState(false);
  const [shakesCount, setShakesCount] = useState(0);

  // MissingNO Glitch sprite effect state
  const [isPlayerGlitched, setIsPlayerGlitched] = useState(false);
  const [isEnemyGlitched, setIsEnemyGlitched] = useState(false);

  // Attack & Intro animation states
  const [isIntroAnimating, setIsIntroAnimating] = useState(true);
  const [attackerLunge, setAttackerLunge] = useState<'player' | 'enemy' | null>(null);

  // Move learning modal state
  const [pendingMove, setPendingMove] = useState<{ pokemonIndex: number; newMoveId: string } | null>(null);

  const activePlayer = team[activePlayerIndex];

  useEffect(() => {
    setIsAnimating(true);
    setIsIntroAnimating(true);

    // Initial battle intro log & cries
    if (enemy.isShiny) {
      soundEngine.playLevelUp();
      addLog(`✨ ¡RARO! Um ${enemy.displayName} SHINY de Nível ${enemy.level} apareceu! ✨`);
    } else {
      addLog(`Um ${enemy.displayName} selvagem de Nível ${enemy.level} apareceu!`);
    }

    if (enemy.pokedexId === 666 || enemy.name.toLowerCase() === 'ghost') {
      soundEngine.playGlitchSound();
      addLog(`👻 O terrível GHOST manifestou-se! Ele roubou 2 ataques de ${activePlayer.displayName}!`);
      if (activePlayer.moves.length > 0) {
        if (activePlayer.moves[0]) activePlayer.moves[0].pp = 0;
        if (activePlayer.moves[1]) activePlayer.moves[1].pp = 0;
      }
    }

    // Play enemy cry on start
    soundEngine.playCry(enemy.pokedexId);

    // Play player cry after 600ms
    const t1 = setTimeout(() => {
      addLog(`Vai, ${activePlayer.displayName}!`);
      soundEngine.playCry(activePlayer.pokedexId);
    }, 600);

    // End intro sequence
    const t2 = setTimeout(() => {
      setIsIntroAnimating(false);
      setIsAnimating(false);
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const addLog = (msg: string) => {
    setBattleLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const triggerFloatingText = (target: 'player' | 'enemy', text: string, color: string) => {
    setFloatingText({ target, text, color });
    setTimeout(() => setFloatingText(null), 1500);
  };

  // Turn Execution Logic
  const handlePlayerMoveSelect = async (moveId: string) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setBattleMenu('main');

    const playerMove = getMove(moveId);

    // Smart AI move selection for enemy
    const enemyAvailableMoves = enemy.moves.filter((m) => m.pp > 0);
    let chosenEnemyMoveInstance = enemy.moves[0];

    if (enemyAvailableMoves.length > 0) {
      // Step 1: Filter out moves to which the player's active Pokémon is immune
      const nonImmuneMoves = enemyAvailableMoves.filter((mInst) => {
        const mData = getMove(mInst.moveId);
        if (mData.category !== 'status' && mData.power > 0) {
          const eff = getTypeEffectiveness(mData.type, activePlayer.types);
          if (eff === 0) return false; // Completely discard immune moves (e.g. Normal vs Ghost, Electric vs Ground)
        }
        return true;
      });

      // Use non-immune moves if available; if enemy has ONLY immune moves, fall back to available moves
      const poolToConsider = nonImmuneMoves.length > 0 ? nonImmuneMoves : enemyAvailableMoves;

      // Step 2: Score moves based on power, STAB, type effectiveness, and utility
      const isPlayerUnder10 = activePlayer.level < 10;

      const scoredMoves = poolToConsider.map((mInst) => {
        const mData = getMove(mInst.moveId);
        let score = mData.power || 10;

        if (mData.category !== 'status' && mData.power > 0) {
          const eff = getTypeEffectiveness(mData.type, activePlayer.types);

          if (isPlayerUnder10) {
            // Player level < 10: Enemy uses learnable moves, favoring non-super-effective or STAB/elemental attacks
            if (eff < 1) {
              score = 80;
            } else if (eff === 1) {
              score = 60;
            } else {
              score = 30;
            }

            // Give non-tackle or type-specific moves a boost for variety
            if (mData.id !== 'tackle') {
              score += 25;
            }
            if (enemy.types.includes(mData.type)) {
              score += 20;
            }
          } else {
            // Normal smart AI for level >= 10
            score = mData.power * eff;

            // STAB bonus (Same Type Attack Bonus)
            if (enemy.types.includes(mData.type)) {
              score *= 1.5;
            }

            // Type Effectiveness multipliers
            if (eff >= 2) {
              score *= 2.5; // Super effective
            } else if (eff < 1) {
              score *= 0.3; // Not very effective
            }

            // Penalize generic weak normal moves on non-Normal Pokémon when STAB/Elemental moves exist
            if (mData.type === 'normal' && !enemy.types.includes('normal') && mData.power <= 40) {
              score *= 0.4;
            }
          }
        } else if (mData.category === 'status') {
          score = isPlayerUnder10 ? 40 : (mData.statusEffect && activePlayer.status === 'none' ? 50 : 20);
        }

        // Add random variance so ties or close scores rotate through moves dynamically
        score += Math.random() * 25;

        return { mInst, score };
      });

      // Step 3: Sort moves by score in descending order
      scoredMoves.sort((a, b) => b.score - a.score);

      // Step 4: Pick top scoring move (with random variance ensured above)
      chosenEnemyMoveInstance = scoredMoves[0].mInst;
    }

    const enemyMove = getMove(chosenEnemyMoveInstance ? chosenEnemyMoveInstance.moveId : 'tackle');

    // Deduct PP
    const updatedTeam = [...team];
    const currentMoves = updatedTeam[activePlayerIndex].moves.map((m) =>
      m.moveId === moveId ? { ...m, pp: Math.max(0, m.pp - 1) } : m
    );
    updatedTeam[activePlayerIndex] = { ...updatedTeam[activePlayerIndex], moves: currentMoves };
    setTeam(updatedTeam);

    // Determine speed and priority
    const pPriority = playerMove.priority || 0;
    const ePriority = enemyMove.priority || 0;

    let playerGoesFirst = true;
    if (pPriority !== ePriority) {
      playerGoesFirst = pPriority > ePriority;
    } else {
      const pSpeed = getEffectiveStat(activePlayer, 'spd', false, false, weather);
      const eSpeed = getEffectiveStat(enemy, 'spd', false, false, weather);
      if (pSpeed === eSpeed) {
        playerGoesFirst = Math.random() < 0.5;
      } else {
        playerGoesFirst = pSpeed > eSpeed;
      }
    }

    if (playerGoesFirst) {
      // Player attacks first
      const enemyDefeated = await executeAttack(activePlayerIndex, 'player', moveId, true);
      if (!enemyDefeated && enemy.currentHp > 0) {
        await delay(1000);
        await executeAttack(activePlayerIndex, 'enemy', enemyMove.id, false);
      }
    } else {
      // Enemy attacks first
      const playerDefeated = await executeAttack(activePlayerIndex, 'enemy', enemyMove.id, false);
      if (!playerDefeated && activePlayer.currentHp > 0) {
        await delay(1000);
        await executeAttack(activePlayerIndex, 'player', moveId, true);
      }
    }

    // End of turn status damage / weather / item / terrain checks
    await handleEndOfTurnEffects();

    setIsAnimating(false);
  };

  const executeAttack = async (
    pIndex: number,
    attackerType: 'player' | 'enemy',
    moveId: string,
    isPlayerAttacker: boolean
  ): Promise<boolean> => {
    let attacker = isPlayerAttacker ? team[pIndex] : enemy;
    let defender = isPlayerAttacker ? enemy : team[pIndex];

    if (attacker.currentHp <= 0) return false;

    // Reset temporary protection status at start of turn
    attacker.protected = false;

    // Flinch check
    if (attacker.flinched) {
      attacker.flinched = false;
      addLog(`${attacker.displayName} hesitou e não pôde atacar!`);
      return false;
    }

    // Sleep check
    if (attacker.status === 'asleep') {
      const turns = (attacker.statusTurns || 2) - 1;
      if (turns <= 0) {
        addLog(`${attacker.displayName} acordou!`);
        attacker.status = 'none';
        attacker.statusTurns = 0;
      } else {
        attacker.statusTurns = turns;
        addLog(`${attacker.displayName} está dormindo profundamente...`);
        return false;
      }
    }

    // Freeze check
    const move = getMove(moveId);
    if (attacker.status === 'frozen') {
      if (move.type === 'fire' || Math.random() < 0.20) {
        addLog(`${attacker.displayName} descongelou!`);
        attacker.status = 'none';
      } else {
        addLog(`${attacker.displayName} está congelado e não pode se mover!`);
        return false;
      }
    }

    // Paralysis check (25% chance of full paralysis)
    if (attacker.status === 'paralyzed' && Math.random() < 0.25) {
      addLog(`${attacker.displayName} está paralisado! Não conseguiu se mover!`);
      return false;
    }

    // Confusion check (33% self-hit chance)
    if (attacker.confused) {
      const turns = (attacker.confusedTurns || 2) - 1;
      if (turns <= 0) {
        attacker.confused = false;
        addLog(`${attacker.displayName} saiu da confusão!`);
      } else {
        attacker.confusedTurns = turns;
        addLog(`${attacker.displayName} está confuso!`);
        if (Math.random() < 0.33) {
          const selfDamage = Math.max(1, Math.floor((((2 * attacker.level) / 5 + 2) * 40 * attacker.calculatedStats.atk / attacker.calculatedStats.def) / 50 + 2));
          const newHp = Math.max(0, attacker.currentHp - selfDamage);
          addLog(`${attacker.displayName} se machucou na sua confusão! (-${selfDamage} HP)`);
          if (isPlayerAttacker) {
            const updatedTeam = [...team];
            updatedTeam[pIndex].currentHp = newHp;
            setTeam(updatedTeam);
          } else {
            setEnemy((prev) => ({ ...prev, currentHp: newHp }));
          }
          return false;
        }
      }
    }

    // Trigger attack lunge animation
    setAttackerLunge(isPlayerAttacker ? 'player' : 'enemy');
    soundEngine.playHit(move.category === 'special' ? 'super' : 'physical');

    // MissingNO attack glitches defender sprite
    if (attacker.pokedexId === 0 || attacker.name.toLowerCase() === 'missingno') {
      soundEngine.playGlitchSound();
      if (isPlayerAttacker) {
        setIsEnemyGlitched(true);
      } else {
        setIsPlayerGlitched(true);
      }
      addLog(`⚡ O ataque do MissingNO. corrompeu os gráficos de ${defender.displayName}!`);
    }

    // Reset animations after attack completes
    setTimeout(() => {
      setAttackerLunge(null);
      setIsEnemyGlitched(false);
      setIsPlayerGlitched(false);
    }, 900);

    // Handle Weather moves
    if (move.weatherEffect) {
      setWeather(move.weatherEffect);
      setWeatherTurns(5);
      const weatherNamesPt: Record<string, string> = {
        sun: 'O sol ficou muito forte!',
        rain: 'Começou a chover forte!',
        sandstorm: 'Uma tempestade de areia começou a rugir!',
        snow: 'Começou a nevar!',
      };
      addLog(`${attacker.displayName} usou ${move.name}! ${weatherNamesPt[move.weatherEffect] || ''}`);
      return false;
    }

    // Handle Protect move
    if (move.volatileEffect?.effect === 'protect') {
      attacker.protected = true;
      addLog(`${attacker.displayName} se protegeu com um escudo de energia!`);
      return false;
    }

    // If defender is protected, move fails
    if (defender.protected) {
      addLog(`${attacker.displayName} usou ${move.name}, mas ${defender.displayName} se protegeu!`);
      return false;
    }

    // Handle Transform (Ditto)
    if (move.volatileEffect?.effect === 'transform') {
      addLog(`${attacker.displayName} usou Transformação!`);
      if (isPlayerAttacker) {
        const updatedTeam = [...team];
        updatedTeam[pIndex] = {
          ...updatedTeam[pIndex],
          displayName: enemy.displayName,
          types: [...enemy.types],
          sprites: { ...enemy.sprites },
          moves: enemy.moves.map((m) => ({ ...m, pp: 5, maxPp: 5 })),
          baseStats: { ...enemy.baseStats },
          calculatedStats: { ...enemy.calculatedStats },
        };
        setTeam(updatedTeam);
      } else {
        setEnemy((prev) => ({
          ...prev,
          displayName: activePlayer.displayName,
          types: [...activePlayer.types],
          sprites: { ...activePlayer.sprites },
          moves: activePlayer.moves.map((m) => ({ ...m, pp: 5, maxPp: 5 })),
          baseStats: { ...activePlayer.baseStats },
          calculatedStats: { ...activePlayer.calculatedStats },
        }));
      }
      return false;
    }

    // Damage Calculation
    let result = calculateDamage(attacker, defender, moveId, weather);
    addLog(result.logMessage);

    if (result.missed) return false;

    if (result.isCritical) soundEngine.playHit('critical');
    else if (result.typeEffectiveness > 1) soundEngine.playHit('super');
    else if (result.typeEffectiveness > 0 && result.typeEffectiveness < 1) soundEngine.playHit('notVery');

    // Mimikyu Disguise ability block (Absorbs damage ONCE per battle!)
    if (defender.ability === 'Disguise' && !defender.disguiseBroken && result.damage > 0) {
      result.damage = 0;
      defender.disguiseBroken = true;
      addLog(`O Disfarce de ${defender.displayName} se quebrou ao absorver o impacto do golpe!`);
    }

    // MissingNO Invincibility block
    if (defender.pokedexId === 0 || defender.name.toLowerCase() === 'missingno' || defender.ability === 'Invincible') {
      result.damage = 0;
      addLog(`MissingNO. é invencível! O ataque se desfez no erro de código do Glitch!`);
    }

    // Focus Sash / Sturdy survival
    if (
      defender.currentHp === defender.maxHp &&
      result.damage >= defender.currentHp &&
      (defender.heldItem === 'Focus Sash' || defender.ability === 'Sturdy')
    ) {
      result.damage = defender.currentHp - 1;
      addLog(`${defender.displayName} aguentou o golpe devastador com 1 HP!`);
    }

    // Apply Damage
    if (result.damage > 0) {
      const newDefenderHp = Math.max(0, defender.currentHp - result.damage);
      triggerFloatingText(
        isPlayerAttacker ? 'enemy' : 'player',
        `-${result.damage} HP`,
        result.isCritical ? 'text-amber-400 font-extrabold' : 'text-red-400 font-bold'
      );

      // Recoil damage check (e.g. Flare Blitz / Volt Tackle / Brave Bird)
      if (move.drainRatio && move.drainRatio < 0) {
        const recoilDamage = Math.max(1, Math.floor(result.damage * Math.abs(move.drainRatio)));
        const newAttackerHp = Math.max(0, attacker.currentHp - recoilDamage);
        addLog(`${attacker.displayName} sofreu ${recoilDamage} HP de dano de recuo!`);
        if (isPlayerAttacker) {
          const updatedTeam = [...team];
          updatedTeam[pIndex].currentHp = newAttackerHp;
          setTeam(updatedTeam);
        } else {
          setEnemy((prev) => ({ ...prev, currentHp: newAttackerHp }));
        }
      }

      // Draining move check (e.g. Giga Drain)
      if (move.drainRatio && move.drainRatio > 0) {
        const drainHeal = Math.max(1, Math.floor(result.damage * move.drainRatio));
        const newAttackerHp = Math.min(attacker.maxHp, attacker.currentHp + drainHeal);
        addLog(`${attacker.displayName} drenou ${drainHeal} HP do inimigo!`);
        if (isPlayerAttacker) {
          const updatedTeam = [...team];
          updatedTeam[pIndex].currentHp = newAttackerHp;
          setTeam(updatedTeam);
        } else {
          setEnemy((prev) => ({ ...prev, currentHp: newAttackerHp }));
        }
      }

      // Volatile Flinch check
      if (move.volatileEffect?.effect === 'flinch') {
        const chance = move.volatileEffect.chance || 30;
        if (Math.random() * 100 <= chance) {
          defender.flinched = true;
        }
      }

      if (isPlayerAttacker) {
        setEnemy((prev) => ({ ...prev, currentHp: newDefenderHp }));
        if (newDefenderHp <= 0) {
          await delay(800);
          await handleVictory();
          return true;
        }
      } else {
        const updatedTeam = [...team];
        updatedTeam[pIndex] = { ...updatedTeam[pIndex], currentHp: newDefenderHp };
        setTeam(updatedTeam);

        if (newDefenderHp <= 0) {
          addLog(`${activePlayer.displayName} desmaiou!`);
          await delay(800);
          checkPlayerFainted();
          return true;
        }
      }
    }

    // Apply Stat Stage Changes
    if (move.statChanges) {
      move.statChanges.forEach((sc) => {
        const targetIsUser = sc.target === 'user';
        const isSelfTarget = (isPlayerAttacker && targetIsUser) || (!isPlayerAttacker && !targetIsUser);
        const targetName = isSelfTarget ? attacker.displayName : defender.displayName;

        const statNamesPt: Record<string, string> = {
          atk: 'Ataque',
          def: 'Defesa',
          spAtk: 'Atq. Esp.',
          spDef: 'Def. Esp.',
          spd: 'Velocidade',
          accuracy: 'Precisão',
          evasion: 'Evasão',
        };
        const stName = statNamesPt[sc.stat] || sc.stat;
        const changeText = sc.stages > 0 ? (sc.stages >= 2 ? 'subiu muito' : 'subiu') : (sc.stages <= -2 ? 'caiu muito' : 'caiu');

        if (isSelfTarget) {
          if (isPlayerAttacker) {
            const updatedTeam = [...team];
            const currentStage = updatedTeam[pIndex].statStages[sc.stat] || 0;
            updatedTeam[pIndex].statStages[sc.stat] = Math.max(-6, Math.min(6, currentStage + sc.stages));
            setTeam(updatedTeam);
          } else {
            setEnemy((prev) => {
              const currentStage = prev.statStages[sc.stat] || 0;
              return {
                ...prev,
                statStages: {
                  ...prev.statStages,
                  [sc.stat]: Math.max(-6, Math.min(6, currentStage + sc.stages)),
                },
              };
            });
          }
        } else {
          if (isPlayerAttacker) {
            setEnemy((prev) => {
              const currentStage = prev.statStages[sc.stat] || 0;
              return {
                ...prev,
                statStages: {
                  ...prev.statStages,
                  [sc.stat]: Math.max(-6, Math.min(6, currentStage + sc.stages)),
                },
              };
            });
          } else {
            const updatedTeam = [...team];
            const currentStage = updatedTeam[pIndex].statStages[sc.stat] || 0;
            updatedTeam[pIndex].statStages[sc.stat] = Math.max(-6, Math.min(6, currentStage + sc.stages));
            setTeam(updatedTeam);
          }
        }

        addLog(`O ${stName} de ${targetName} ${changeText}! (${sc.stages > 0 ? '+' : ''}${sc.stages})`);
      });
    }

    // Apply Status Effects (Burn, Poison, Toxic, Paralyze, Sleep, Freeze)
    if (move.statusEffect && defender.status === 'none' && defender.currentHp > 0) {
      const roll = Math.random() * 100;
      if (roll <= (move.statusEffect.chance || 100)) {
        const newStatus = move.statusEffect.status;
        const statusNamesPt: Record<string, string> = {
          burned: 'QUEIMADO',
          poisoned: 'ENVENENADO',
          badly_poisoned: 'GRAVEMENTE ENVENENADO (TÓXICO)',
          paralyzed: 'PARALISADO',
          asleep: 'ADORMECIDO',
          frozen: 'CONGELADO',
        };

        if (!isPlayerAttacker) {
          const updatedTeam = [...team];
          updatedTeam[pIndex].status = newStatus;
          updatedTeam[pIndex].statusTurns = newStatus === 'asleep' ? Math.floor(Math.random() * 3) + 1 : 0;
          updatedTeam[pIndex].toxicCounter = 1;
          setTeam(updatedTeam);
        } else {
          setEnemy((prev) => ({
            ...prev,
            status: newStatus,
            statusTurns: newStatus === 'asleep' ? Math.floor(Math.random() * 3) + 1 : 0,
            toxicCounter: 1,
          }));
        }
        addLog(`${defender.displayName} ficou ${statusNamesPt[newStatus] || newStatus.toUpperCase()}!`);
      }
    }

    // Healing moves (Recover / Roost)
    if (move.healPercent && attacker.currentHp > 0) {
      const healAmount = Math.floor((attacker.maxHp * move.healPercent) / 100);
      const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
      if (isPlayerAttacker) {
        const updatedTeam = [...team];
        updatedTeam[pIndex].currentHp = newHp;
        setTeam(updatedTeam);
      } else {
        setEnemy((prev) => ({ ...prev, currentHp: newHp }));
      }
      addLog(`${attacker.displayName} recuperou vida! (+${healAmount} HP)`);
    }

    return false;
  };

  const handleEndOfTurnEffects = async () => {
    let currPlayer = team[activePlayerIndex];

    // End of turn status damage & items for Player
    if (currPlayer.currentHp > 0) {
      let playerHpChange = 0;

      // Status damage
      if (currPlayer.status === 'burned') {
        const burnDmg = Math.max(1, Math.floor(currPlayer.maxHp / 16));
        playerHpChange -= burnDmg;
        addLog(`${currPlayer.displayName} sofreu ${burnDmg} HP de dano da queimadura!`);
      } else if (currPlayer.status === 'poisoned') {
        const poisonDmg = Math.max(1, Math.floor(currPlayer.maxHp / 8));
        playerHpChange -= poisonDmg;
        addLog(`${currPlayer.displayName} sofreu ${poisonDmg} HP de dano do veneno!`);
      } else if (currPlayer.status === 'badly_poisoned') {
        const cnt = currPlayer.toxicCounter || 1;
        const toxicDmg = Math.max(1, Math.floor((currPlayer.maxHp * cnt) / 16));
        playerHpChange -= toxicDmg;
        currPlayer.toxicCounter = cnt + 1;
        addLog(`${currPlayer.displayName} sofreu ${toxicDmg} HP de dano tóxico acumulado!`);
      }

      // Leftovers item healing
      if (currPlayer.heldItem === 'Leftovers' && currPlayer.currentHp < currPlayer.maxHp) {
        const leftoverHeal = Math.max(1, Math.floor(currPlayer.maxHp / 16));
        playerHpChange += leftoverHeal;
        addLog(`${currPlayer.displayName} recuperou HP com seu Leftovers!`);
      }

      if (playerHpChange !== 0) {
        const newHp = Math.max(0, Math.min(currPlayer.maxHp, currPlayer.currentHp + playerHpChange));
        const updatedTeam = [...team];
        updatedTeam[activePlayerIndex].currentHp = newHp;
        setTeam(updatedTeam);
      }
    }

    // End of turn status damage & items for Enemy
    if (enemy.currentHp > 0) {
      let enemyHpChange = 0;

      if (enemy.status === 'burned') {
        const burnDmg = Math.max(1, Math.floor(enemy.maxHp / 16));
        enemyHpChange -= burnDmg;
        addLog(`${enemy.displayName} sofreu ${burnDmg} HP de dano da queimadura!`);
      } else if (enemy.status === 'poisoned') {
        const poisonDmg = Math.max(1, Math.floor(enemy.maxHp / 8));
        enemyHpChange -= poisonDmg;
        addLog(`${enemy.displayName} sofreu ${poisonDmg} HP de dano do veneno!`);
      } else if (enemy.status === 'badly_poisoned') {
        const cnt = enemy.toxicCounter || 1;
        const toxicDmg = Math.max(1, Math.floor((enemy.maxHp * cnt) / 16));
        enemyHpChange -= toxicDmg;
        setEnemy((prev) => ({ ...prev, toxicCounter: cnt + 1 }));
        addLog(`${enemy.displayName} sofreu ${toxicDmg} HP de dano tóxico acumulado!`);
      }

      if (enemyHpChange !== 0) {
        const newHp = Math.max(0, Math.min(enemy.maxHp, enemy.currentHp + enemyHpChange));
        setEnemy((prev) => ({ ...prev, currentHp: newHp }));
        if (newHp <= 0) {
          await handleVictory();
        }
      }
    }
  };

  const handleVictory = async () => {
    soundEngine.playVictory();
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    // EXP Calculation
    const expGained = Math.max(15, Math.floor((enemy.baseStats.hp * enemy.level) / 3));
    const moneyGained = enemy.level * 150 + Math.floor(Math.random() * 50);

    addLog(`O ${enemy.displayName} selvagem desmaiou!`);
    addLog(`${activePlayer.displayName} ganhou ${expGained} pontos de Experiência e ₽${moneyGained}!`);

    // Update active player's EXP
    const updatedTeam = [...team];
    const player = { ...updatedTeam[activePlayerIndex] };
    player.exp += expGained;

    // Check Level Up loop
    let leveledUp = false;
    while (player.exp >= player.expToNext) {
      leveledUp = true;
      player.level += 1;

      const newMaxHp = calculateStat(player.baseStats.hp, player.level, true);
      const hpGain = Math.max(1, newMaxHp - player.maxHp);
      player.maxHp = newMaxHp;
      player.currentHp = Math.min(player.maxHp, player.currentHp + hpGain);

      player.calculatedStats = {
        hp: newMaxHp,
        atk: calculateStat(player.baseStats.atk, player.level),
        def: calculateStat(player.baseStats.def, player.level),
        spAtk: calculateStat(player.baseStats.spAtk, player.level),
        spDef: calculateStat(player.baseStats.spDef, player.level),
        spd: calculateStat(player.baseStats.spd, player.level),
      };
      player.expToNext = Math.pow(player.level + 1, 3);

      addLog(`✨ PARABÉNS! ${player.isShiny ? '✨ ' : ''}${player.displayName} subiu para o NÍVEL ${player.level}!`);

      // Check for new moves learned at this level
      const baseData = STARTERS_AND_POKEMON_DATABASE[player.pokedexId];
      if (baseData && baseData.levelUpMoves) {
        const movesForThisLevel = baseData.levelUpMoves.filter((m) => m.level === player.level);
        for (const nm of movesForThisLevel) {
          if (!player.moves.some((m) => m.moveId === nm.moveId)) {
            const newMoveData = getMove(nm.moveId);
            if (player.moves.length < 4) {
              player.moves.push({
                moveId: nm.moveId,
                pp: newMoveData.pp,
                maxPp: newMoveData.maxPp,
              });
              addLog(`⚡ ${player.displayName} aprendeu ${newMoveData.name}!`);
            } else {
              const oldMove = getMove(player.moves[0].moveId);
              player.moves = [...player.moves.slice(1), { moveId: nm.moveId, pp: newMoveData.pp, maxPp: newMoveData.maxPp }];
              addLog(`⚡ ${player.displayName} esqueceu ${oldMove.name} e aprendeu ${newMoveData.name}!`);
            }
          }
        }
      }
    }

    if (leveledUp) {
      soundEngine.playLevelUp();
    }

    updatedTeam[activePlayerIndex] = player;
    setTeam(updatedTeam);
    onUpdateTeam(updatedTeam);

    await delay(1500);
    onWinBattle(updatedTeam, moneyGained);
  };

  const checkPlayerFainted = () => {
    const hasAvailable = team.some((p) => p.currentHp > 0);
    if (!hasAvailable) {
      addLog(`Todos os seus Pokémon desmaiaram! Você correu até o Centro Pokémon...`);
      const healedTeam = team.map((p) => ({
        ...p,
        currentHp: p.maxHp,
        status: 'none' as StatusAilment,
        moves: p.moves.map((m) => ({ ...m, pp: m.maxPp })),
      }));
      onUpdateTeam(healedTeam);
      setTimeout(() => onRunAway(), 2000);
    } else {
      setBattleMenu('switch');
    }
  };

  // Throw Pokéball Action
  const handleThrowBall = async (ballItemId: string) => {
    if (isAnimating || userInventory[ballItemId] <= 0) return;

    setIsAnimating(true);
    setBattleMenu('main');
    setBallThrowing(true);

    // Consume item
    const newInv = { ...userInventory, [ballItemId]: userInventory[ballItemId] - 1 };
    onUpdateInventory(newInv);

    const isMissingNo = enemy.pokedexId === 0 || enemy.name.toLowerCase() === 'missingno';
    const isGhostBoss = enemy.pokedexId === 666 || enemy.name.toLowerCase() === 'ghost';

    if (isMissingNo && ballItemId !== 'master_ball') {
      addLog(`Você arremessou a Pokébola...`);
      soundEngine.playBallThrow();
      await delay(800);
      addLog(`⚡ O MissingNO. corrompeu a Pokébola! Apenas a MASTER BOLA pode capturar o erro do sistema!`);
      soundEngine.playHit('notVery');
      setBallThrowing(false);
      setShakesCount(0);
      await delay(1200);
      const enemyMove = enemy.moves[0];
      await executeAttack(activePlayerIndex, 'enemy', enemyMove ? enemyMove.moveId : 'tackle', false);
      setIsAnimating(false);
      return;
    }

    if (isGhostBoss && ballItemId !== 'master_ball' && ballItemId !== 'ultra_ball') {
      addLog(`Você arremessou a Pokébola...`);
      soundEngine.playBallThrow();
      await delay(800);
      addLog(`👻 O GHOST repeliu a Pokébola com sua aura mortal! Apenas ULTRA BOLA ou MASTER BOLA podem capturá-lo!`);
      soundEngine.playHit('notVery');
      setBallThrowing(false);
      setShakesCount(0);
      await delay(1200);
      const enemyMove = enemy.moves[0];
      await executeAttack(activePlayerIndex, 'enemy', enemyMove ? enemyMove.moveId : 'steal_curse', false);
      setIsAnimating(false);
      return;
    }

    const ballMult = ballItemId === 'master_ball' ? 255 : ballItemId === 'ultra_ball' ? 2.0 : ballItemId === 'great_ball' ? 1.5 : 1.0;
    addLog(`Você arremessou uma ${ballItemId.replace(/_/g, ' ').toUpperCase()}!`);
    soundEngine.playBallThrow();

    const catchResult = calculateCatchRate(enemy, 45, ballMult);

    for (let i = 1; i <= catchResult.shakes; i++) {
      await delay(800);
      setShakesCount(i);
      soundEngine.playBallShake();
    }

    await delay(800);
    setBallThrowing(false);
    setShakesCount(0);

    if (catchResult.caught) {
      soundEngine.playCatchSuccess();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      addLog(`¡GOTCHA! O ${enemy.displayName} foi capturado com sucesso!`);

      await delay(1500);
      onWinBattle(team, 100, enemy);
    } else {
      addLog(`Ah não! O ${enemy.displayName} escapou da Poké Bola!`);
      await delay(1000);
      // Enemy counter attack
      const enemyMove = enemy.moves[0];
      await executeAttack(activePlayerIndex, 'enemy', enemyMove ? enemyMove.moveId : 'tackle', false);
      setIsAnimating(false);
    }
  };

  // Switch Active Pokémon
  const handleSwitchPokemon = (idx: number) => {
    if (idx === activePlayerIndex || team[idx].currentHp <= 0) return;
    soundEngine.playCry(team[idx].pokedexId);
    setActivePlayerIndex(idx);
    const switched = team[idx];
    addLog(`Vai, ${switched.displayName}! Assuma a batalha!`);

    if (enemy.pokedexId === 666 || enemy.name.toLowerCase() === 'ghost') {
      addLog(`👻 GHOST roubou 2 ataques de ${switched.displayName}!`);
      soundEngine.playGlitchSound();
      if (switched.moves.length > 0) {
        if (switched.moves[0]) switched.moves[0].pp = 0;
        if (switched.moves[1]) switched.moves[1].pp = 0;
      }
    }

    setBattleMenu('main');
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 relative select-none">
      
      {/* Top Bar / Run Away button */}
      <div className="flex justify-between items-center z-20">
        <button
          onClick={onRunAway}
          disabled={isAnimating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar / Fugir
        </button>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 text-xs font-bold text-emerald-400">
          <Swords className="w-4 h-4" /> BATALHA POKÉMON
        </div>
      </div>

      {/* Main Battle Arena Stage */}
      <div className="flex-1 my-3 flex flex-col justify-around max-w-4xl mx-auto w-full relative">
        
        {/* Floating Combat Damage Text */}
        {floatingText && (
          <div
            className={`absolute z-30 font-mono text-lg sm:text-2xl animate-bounce pointer-events-none ${
              floatingText.target === 'enemy' ? 'top-12 right-12' : 'bottom-20 left-12'
            } ${floatingText.color}`}
          >
            {floatingText.text}
          </div>
        )}

        {/* 1. ENEMY POKEMON SECTION (TOP RIGHT) */}
        <div className="flex justify-between items-start gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl w-60 sm:w-72">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <div className="flex items-center gap-1.5 flex-wrap truncate">
                <span className="capitalize text-white font-extrabold">{enemy.displayName}</span>
                <RarityBadge
                  isRestricted={enemy.isRestricted}
                  isPseudoLegendary={enemy.isPseudoLegendary}
                  isShiny={enemy.isShiny}
                  size="sm"
                />
              </div>
              <span className="text-emerald-400 font-mono shrink-0">Nv. {enemy.level}</span>
            </div>
            
            {/* HP Bar with Explicit Label */}
            <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
              <span className="text-red-400 font-extrabold flex items-center gap-1"><Heart className="w-3 h-3 fill-red-500 text-red-500" /> HP</span>
              <span className="font-mono text-white">{enemy.currentHp} / {enemy.maxHp}</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (enemy.currentHp / enemy.maxHp) > 0.5 ? 'bg-emerald-500' : (enemy.currentHp / enemy.maxHp) > 0.2 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (enemy.currentHp / enemy.maxHp) * 100))}%` }}
              ></div>
            </div>

            {/* Badges: Status & Stat Changes */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {enemy.status !== 'none' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-purple-900 text-purple-200 border border-purple-700">
                  {enemy.status.toUpperCase()}
                </span>
              )}
              {Object.entries(enemy.statStages).map(([st, val]) => {
                const numVal = Number(val);
                if (!numVal) return null;
                const isBuff = numVal > 0;
                return (
                  <span
                    key={st}
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isBuff ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-red-950/80 text-red-400 border border-red-700/60'
                    }`}
                  >
                    {st.toUpperCase()} {isBuff ? `+${numVal}` : numVal}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Enemy Sprite Stage */}
          <div className="relative flex justify-center items-center w-36 h-36 sm:w-44 sm:h-44">
            <div className="absolute bottom-2 w-28 h-8 bg-black/40 rounded-full blur-md"></div>
            <img
              src={enemy.sprites.animatedFront || enemy.sprites.front}
              alt={enemy.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== enemy.sprites.front && enemy.sprites.front) {
                  target.src = enemy.sprites.front;
                }
              }}
              className={`w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10 transition-all duration-300 ${
                ballThrowing ? 'scale-0 transition-all duration-700' : ''
              } ${isIntroAnimating ? 'animate-intro-enemy' : ''} ${
                attackerLunge === 'enemy' ? 'animate-lunge-enemy' : ''
              } ${isEnemyGlitched ? 'missingno-glitch-victim' : ''} ${
                enemy.pokedexId === 0 || enemy.name.toLowerCase() === 'missingno' ? 'missingno-pixel-glitch' : ''
              } ${
                enemy.pokedexId === 666 || enemy.name.toLowerCase() === 'ghost' ? 'ghost-aura' : ''
              }`}
            />
          </div>
        </div>

        {/* 2. PLAYER POKEMON SECTION (BOTTOM LEFT) */}
        <div className="flex justify-between items-end gap-4 mt-4">
          {/* Active Player Sprite Stage */}
          <div className="relative flex justify-center items-center w-36 h-36 sm:w-44 sm:h-44">
            <div className="absolute bottom-2 w-28 h-8 bg-black/40 rounded-full blur-md"></div>
            <img
              src={activePlayer.sprites.animatedBack || activePlayer.sprites.back || activePlayer.sprites.front}
              alt={activePlayer.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== activePlayer.sprites.front && activePlayer.sprites.front) {
                  target.src = activePlayer.sprites.front;
                }
              }}
              className={`w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10 scale-110 transition-all duration-300 ${
                isIntroAnimating ? 'animate-intro-player' : ''
              } ${attackerLunge === 'player' ? 'animate-lunge-player' : ''} ${
                isPlayerGlitched ? 'missingno-glitch-victim' : ''
              } ${
                activePlayer.pokedexId === 0 || activePlayer.name.toLowerCase() === 'missingno' ? 'missingno-pixel-glitch' : ''
              } ${
                activePlayer.pokedexId === 666 || activePlayer.name.toLowerCase() === 'ghost' ? 'ghost-aura' : ''
              }`}
            />
          </div>

          {/* Active Player Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl w-60 sm:w-72">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <div className="flex items-center gap-1.5 flex-wrap truncate">
                <span className="capitalize text-white font-extrabold">{activePlayer.displayName}</span>
                <RarityBadge
                  isRestricted={activePlayer.isRestricted}
                  isPseudoLegendary={activePlayer.isPseudoLegendary}
                  isShiny={activePlayer.isShiny}
                  size="sm"
                />
              </div>
              <span className="text-emerald-400 font-mono shrink-0">Nv. {activePlayer.level}</span>
            </div>

            {/* HP Bar with Explicit Label */}
            <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
              <span className="text-red-400 font-extrabold flex items-center gap-1"><Heart className="w-3 h-3 fill-red-500 text-red-500" /> HP (Vida)</span>
              <span className="font-mono text-white">{activePlayer.currentHp} / {activePlayer.maxHp}</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (activePlayer.currentHp / activePlayer.maxHp) > 0.5 ? 'bg-emerald-500' : (activePlayer.currentHp / activePlayer.maxHp) > 0.2 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (activePlayer.currentHp / activePlayer.maxHp) * 100))}%` }}
              ></div>
            </div>

            {/* EXP Bar with Explicit Label */}
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 mb-0.5">
              <span className="text-teal-400 font-extrabold flex items-center gap-1"><Sparkles className="w-3 h-3 text-teal-400" /> XP (Experiência)</span>
              <span className="font-mono text-teal-300">
                {Math.round(
                  ((activePlayer.exp - Math.pow(activePlayer.level, 3)) /
                    Math.max(1, activePlayer.expToNext - Math.pow(activePlayer.level, 3))) *
                    100
                )}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-teal-400 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((activePlayer.exp - Math.pow(activePlayer.level, 3)) /
                        Math.max(1, activePlayer.expToNext - Math.pow(activePlayer.level, 3))) *
                        100
                    )
                  )}%`,
                }}
              ></div>
            </div>

            {/* Badges: Status & Stat Changes */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {activePlayer.status !== 'none' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-purple-900 text-purple-200 border border-purple-700">
                  {activePlayer.status.toUpperCase()}
                </span>
              )}
              {Object.entries(activePlayer.statStages).map(([st, val]) => {
                const numVal = Number(val);
                if (!numVal) return null;
                const isBuff = numVal > 0;
                return (
                  <span
                    key={st}
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isBuff ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-red-950/80 text-red-400 border border-red-700/60'
                    }`}
                  >
                    {st.toUpperCase()} {isBuff ? `+${numVal}` : numVal}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Battle Control Panel */}
      <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-20">
        
        {/* Battle Log Box */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 h-16 overflow-y-auto font-sans text-xs text-slate-300 mb-3 leading-relaxed">
          {battleLog.length > 0 ? (
            <p className="animate-fade-in font-medium text-emerald-300">{battleLog[0]}</p>
          ) : (
            <p className="text-slate-500 italic">O que {activePlayer.displayName} fará?</p>
          )}
        </div>

        {/* Action Views */}
        {battleMenu === 'main' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => {
                soundEngine.playClick();
                setBattleMenu('fight');
              }}
              disabled={isAnimating || activePlayer.currentHp <= 0}
              className="py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Swords className="w-4 h-4" /> Lutar
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setBattleMenu('bag');
              }}
              disabled={isAnimating}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Backpack className="w-4 h-4" /> Mochila
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setBattleMenu('switch');
              }}
              disabled={isAnimating}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Users className="w-4 h-4" /> Trocar
            </button>

            <button
              onClick={onRunAway}
              disabled={isAnimating}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Footprints className="w-4 h-4" /> Fugir
            </button>
          </div>
        )}

        {/* Fight Menu: Move Selector */}
        {battleMenu === 'fight' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escolha o Ataque:</span>
              <button
                onClick={() => setBattleMenu('main')}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                Voltar
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activePlayer.moves.map((mInstance) => {
                const moveData = getMove(mInstance.moveId);
                const isOutOfPp = mInstance.pp <= 0;
                const isStatus = moveData.category === 'status' || !moveData.power;
                const eff = isStatus ? 1 : getTypeEffectiveness(moveData.type, enemy.types);

                // Stat effectiveness comparison
                let statAdvantageText = '';
                if (!isStatus) {
                  if (moveData.category === 'physical') {
                    const pAtk = getEffectiveStat(activePlayer, 'atk', false, false, weather);
                    const eDef = getEffectiveStat(enemy, 'def', false, false, weather);
                    if (pAtk > eDef * 1.2) statAdvantageText = '💪 Atk Superior';
                  } else if (moveData.category === 'special') {
                    const pSpAtk = getEffectiveStat(activePlayer, 'spAtk', false, false, weather);
                    const eSpDef = getEffectiveStat(enemy, 'spDef', false, false, weather);
                    if (pSpAtk > eSpDef * 1.2) statAdvantageText = '✨ Sp.Atk Superior';
                  }
                }

                return (
                  <button
                    key={mInstance.moveId}
                    onClick={() => handlePlayerMoveSelect(mInstance.moveId)}
                    disabled={isOutOfPp || isAnimating}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                      isOutOfPp
                        ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'
                        : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-emerald-500/60 active:scale-95'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-white capitalize truncate">{moveData.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase text-slate-400 bg-slate-950 border border-slate-800 shrink-0">
                          {moveData.category === 'physical' ? 'Fís' : moveData.category === 'special' ? 'Esp' : 'Sta'}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${TYPE_COLORS[moveData.type].bg} ${TYPE_COLORS[moveData.type].text}`}>
                        {TYPE_NAMES_PT[moveData.type]}
                      </span>
                    </div>

                    {/* Effectiveness Badge & Stat Advice */}
                    <div className="flex items-center justify-between mt-1.5">
                      {!isStatus ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${
                          eff >= 2 ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500' :
                          eff > 1 ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600' :
                          eff > 0 && eff < 1 ? 'bg-amber-950/90 text-amber-300 border-amber-600' :
                          eff === 0 ? 'bg-red-950/90 text-red-400 border-red-700' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {eff >= 2 ? '🔥 Super Efetivo (4x)' : eff > 1 ? '⚡ Super Efetivo' : eff > 0 && eff < 1 ? '⚠️ Pouco Efetivo' : eff === 0 ? '🚫 Sem Efeito' : 'Efetivo'}
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium text-slate-400 bg-slate-900 border border-slate-800">
                          Efeito de Status
                        </span>
                      )}

                      {statAdvantageText && (
                        <span className="text-[9px] font-bold text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/60">
                          {statAdvantageText}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                      <span>PODER: {moveData.power || '—'}</span>
                      <span className={mInstance.pp <= 3 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        PP {mInstance.pp}/{mInstance.maxPp}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bag Menu: Pokéballs & Items */}
        {battleMenu === 'bag' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Poké Bolas & Itens na Batalha:</span>
              <button
                onClick={() => setBattleMenu('main')}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                Voltar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['poke_ball', 'great_ball', 'ultra_ball', 'master_ball'].map((ballId) => {
                const count = userInventory[ballId] || 0;
                return (
                  <button
                    key={ballId}
                    onClick={() => handleThrowBall(ballId)}
                    disabled={count <= 0 || isAnimating}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      count <= 0
                        ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'
                        : 'bg-slate-800 border-slate-700 hover:border-amber-500 active:scale-95'
                    }`}
                  >
                    <Disc className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white capitalize truncate">{ballId.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] font-mono text-slate-400">Qtd: {count}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Switch Menu */}
        {battleMenu === 'switch' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trocar de Pokémon:</span>
              <button
                onClick={() => setBattleMenu('main')}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                Voltar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {team.map((pkmn, idx) => {
                const isCurrent = idx === activePlayerIndex;
                const isFainted = pkmn.currentHp <= 0;
                return (
                  <button
                    key={pkmn.instanceId}
                    onClick={() => handleSwitchPokemon(idx)}
                    disabled={isCurrent || isFainted || isAnimating}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/40 border-emerald-600/60 ring-1 ring-emerald-500/30'
                        : isFainted
                        ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'
                        : 'bg-slate-800 border-slate-700 hover:border-indigo-500 active:scale-95'
                    }`}
                  >
                    <img src={pkmn.sprites.front} alt={pkmn.displayName} className="w-10 h-10 object-contain" />
                    <div>
                      <div className="text-xs font-bold text-white capitalize">{pkmn.displayName}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        HP {pkmn.currentHp}/{pkmn.maxHp}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
