import React from 'react';
import {
  Compass,
  Trophy,
  CheckCircle2,
  Gift,
  X,
  Sparkles,
  Zap,
  Coins,
  Swords,
  Footprints,
  ShieldAlert,
} from 'lucide-react';
import { GameMission, PokemonInstance, formatPokedexId } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { NATIONAL_POKEDEX_INDEX } from '../data/nationalPokedex';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { fetchPokemonData } from '../utils/apiFetcher';
import { soundEngine } from '../utils/soundEngine';
import confetti from 'canvas-confetti';

interface MissionsModalProps {
  missions: GameMission[];
  missionProgress: Record<string, { current: number; completed: boolean; claimed: boolean }>;
  onClaimMission: (
    mission: GameMission,
    rewards: {
      xp?: number;
      balls?: Record<string, number>;
      money?: number;
      pokemonInstance?: PokemonInstance;
    }
  ) => void;
  onStartSpecialEncounter?: (instance: PokemonInstance) => void;
  onClose: () => void;
}

export const DEFAULT_MISSIONS: GameMission[] = [
  {
    id: 'mission_starter_wins',
    title: 'Glória na Arena: Vencedor Nato',
    description: 'Vença 3 batalhas contra Pokémon selvagens ou oponentes.',
    category: 'battle',
    targetType: 'win_battles',
    targetValue: 3,
    rewardType: 'battle_pass_xp',
    rewardAmount: 350,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mission_catcher',
    title: 'Caçador de Espécies',
    description: 'Capture 2 novos Pokémon para sua coleção.',
    category: 'capture',
    targetType: 'catch_pokemon',
    targetValue: 2,
    rewardType: 'ball',
    rewardAmount: 5,
    rewardItemId: 'ultra_ball',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mission_tactical',
    title: 'Estrategista Elemental',
    description: 'Acerte 4 golpes super efetivos em combate.',
    category: 'battle',
    targetType: 'super_effective',
    targetValue: 4,
    rewardType: 'money',
    rewardAmount: 4000,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mission_special_encounter',
    title: 'Desafio Elétrico: Encontro Raro',
    description: 'Vença 5 batalhas para atrair um Raichu de Alola especial!',
    category: 'special',
    targetType: 'win_battles',
    targetValue: 5,
    rewardType: 'pokemon_encounter',
    rewardPokemonId: 26, // Raichu
    rewardPokemonLevel: 25,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions = [],
  missionProgress = {},
  onClaimMission,
  onStartSpecialEncounter,
  onClose,
}) => {
  // Use passed active missions combined with defaults if none in DB
  const displayMissions = missions.length > 0 ? missions.filter((m) => m.active) : DEFAULT_MISSIONS;

  const handleClaim = async (mission: GameMission) => {
    soundEngine.playLevelUp();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    let xp: number | undefined;
    let balls: Record<string, number> | undefined;
    let money: number | undefined;
    let pokemonInstance: PokemonInstance | undefined;

    if (mission.rewardType === 'battle_pass_xp') {
      xp = mission.rewardAmount || 300;
    } else if (mission.rewardType === 'ball' && mission.rewardItemId) {
      balls = { [mission.rewardItemId]: mission.rewardAmount || 5 };
    } else if (mission.rewardType === 'money') {
      money = mission.rewardAmount || 3000;
    } else if (mission.rewardType === 'pokemon_encounter' && mission.rewardPokemonId) {
      const baseData =
        (await fetchPokemonData(mission.rewardPokemonId)) ||
        STARTERS_AND_POKEMON_DATABASE[mission.rewardPokemonId];
      if (baseData) {
        const isShiny = Math.random() < 0.1;
        pokemonInstance = createPokemonInstance(
          baseData,
          mission.rewardPokemonLevel || 25,
          isShiny
        );
        pokemonInstance.displayName = `${baseData.displayName} (Missão)`;
        if (isShiny) {
          soundEngine.playShinyAppear();
        }
      }
    }

    onClaimMission(mission, {
      xp,
      balls,
      money,
      pokemonInstance,
    });
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'win_battles':
        return <Swords className="w-4 h-4 text-rose-400" />;
      case 'catch_pokemon':
        return <Gift className="w-4 h-4 text-emerald-400" />;
      case 'super_effective':
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <Trophy className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black shrink-0">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Missões do Treinador
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                  Recompensas Ativas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete missões para resgatar <span className="text-yellow-400 font-bold">XP de Passe</span>, Pokébolas raras e <span className="text-emerald-400 font-bold">Encontros com Pokémon</span>!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Missions List */}
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-3 custom-scrollbar">
          {displayMissions.map((mission) => {
            const progress = missionProgress[mission.id] || {
              current: 0,
              completed: false,
              claimed: false,
            };
            const currentCount = Math.min(mission.targetValue, progress.current || 0);
            const isCompleted = currentCount >= mission.targetValue || progress.completed;
            const isClaimed = !!progress.claimed;
            const canClaim = isCompleted && !isClaimed;
            const percent = Math.min(100, Math.round((currentCount / mission.targetValue) * 100));

            return (
              <div
                key={mission.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isClaimed
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                    : canClaim
                    ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                {/* Left: Info */}
                <div className="w-full sm:w-auto flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1 rounded-lg bg-slate-800 border border-slate-700/80">
                      {getTargetIcon(mission.targetType)}
                    </span>
                    <h3 className="text-sm font-bold text-white">{mission.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{mission.description}</p>

                  {/* Progress bar */}
                  <div className="max-w-md">
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-400">Progresso</span>
                      <span className={isCompleted ? 'text-emerald-400' : 'text-slate-300'}>
                        {currentCount} / {mission.targetValue}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Center: Reward preview badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {mission.rewardType === 'battle_pass_xp' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-bold">
                      <Zap className="w-4 h-4 fill-current text-yellow-400" />
                      <span>+{mission.rewardAmount || 300} XP Passe</span>
                    </div>
                  )}

                  {mission.rewardType === 'ball' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                      <img
                        src={
                          ITEMS_DATABASE[mission.rewardItemId || 'ultra_ball']?.sprite ||
                          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png'
                        }
                        alt="Ball"
                        className="w-5 h-5 object-contain"
                      />
                      <span>
                        {mission.rewardAmount || 5}x{' '}
                        {ITEMS_DATABASE[mission.rewardItemId || 'ultra_ball']?.name || 'Pokébolas'}
                      </span>
                    </div>
                  )}

                  {mission.rewardType === 'money' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                      <Coins className="w-4 h-4" />
                      <span>+${(mission.rewardAmount || 3000).toLocaleString()}</span>
                    </div>
                  )}

                  {mission.rewardType === 'pokemon_encounter' && mission.rewardPokemonId && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-bold">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mission.rewardPokemonId}.png`}
                        alt="Pokemon"
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
                        }}
                      />
                      <div>
                        <div>Encontro Pokémon</div>
                        <div className="text-[10px] text-purple-400 font-semibold">
                          {formatPokedexId(mission.rewardPokemonId)} (Lv.{mission.rewardPokemonLevel || 25})
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Claim Action */}
                <div className="w-full sm:w-auto flex justify-end shrink-0">
                  {isClaimed ? (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Resgatada
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => handleClaim(mission)}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Gift className="w-4 h-4" />
                      Resgatar Recompensa
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Em andamento ({currentCount}/{mission.targetValue})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div>Novas missões podem ser publicadas pelo Administrador em tempo real!</div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
