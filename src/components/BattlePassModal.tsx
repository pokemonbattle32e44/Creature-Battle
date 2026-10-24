import React from 'react';
import {
  Trophy,
  Zap,
  Sparkles,
  Gift,
  CheckCircle2,
  Lock,
  X,
  Coins,
  Swords,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { soundEngine } from '../utils/soundEngine';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { fetchPokemonData } from '../utils/apiFetcher';
import confetti from 'canvas-confetti';

export interface BattlePassTier {
  tier: number;
  requiredXp: number;
  title: string;
  isPikachuTier: boolean;
  pikachuLevel?: number;
  pikachuShinyChance?: number;
  pikachuTitle?: string;
  pikachuSpecialMove?: string;
  items?: Record<string, number>;
  money?: number;
  badge?: string;
}

export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  {
    tier: 1,
    requiredXp: 200,
    title: 'Kit Inicial do Treinador',
    isPikachuTier: false,
    items: { poke_ball: 10, potion: 5 },
    money: 1000,
  },
  {
    tier: 2,
    requiredXp: 450,
    title: 'Suprimentos de Batalha',
    isPikachuTier: false,
    items: { super_potion: 5, revive: 2 },
    money: 1500,
  },
  {
    tier: 3,
    requiredXp: 750,
    title: '⚡ Encontro com Pikachu Elétrico',
    isPikachuTier: true,
    pikachuLevel: 15,
    pikachuShinyChance: 0.08,
    pikachuTitle: 'Pikachu Elétrico Fagulha',
    items: { great_ball: 5 },
    money: 2000,
  },
  {
    tier: 4,
    requiredXp: 1100,
    title: 'Pedra Evolutiva do Trovão',
    isPikachuTier: false,
    items: { thunder_stone: 1, great_ball: 8 },
    money: 2500,
  },
  {
    tier: 5,
    requiredXp: 1500,
    title: 'Doces de Crescimento',
    isPikachuTier: false,
    items: { rare_candy: 2, ultra_ball: 5 },
    money: 3000,
  },
  {
    tier: 6,
    requiredXp: 1950,
    title: '🏄 Encontro com Pikachu Surfista',
    isPikachuTier: true,
    pikachuLevel: 25,
    pikachuShinyChance: 0.10,
    pikachuTitle: 'Pikachu Surfista (Move Especial: Surf)',
    pikachuSpecialMove: 'surf',
    items: { ultra_ball: 5 },
    money: 3500,
  },
  {
    tier: 7,
    requiredXp: 2450,
    title: 'Arsenal de Ultra Bolas',
    isPikachuTier: false,
    items: { ultra_ball: 10, max_potion: 3 },
    money: 4000,
  },
  {
    tier: 8,
    requiredXp: 3000,
    title: 'Doces Raros Fortalecedores',
    isPikachuTier: false,
    items: { rare_candy: 3, max_revive: 2 },
    money: 5000,
  },
  {
    tier: 9,
    requiredXp: 3600,
    title: '🎈 Encontro com Pikachu Voador',
    isPikachuTier: true,
    pikachuLevel: 35,
    pikachuShinyChance: 0.12,
    pikachuTitle: 'Pikachu Voador Balão (Move: Fly)',
    pikachuSpecialMove: 'fly',
    items: { ultra_ball: 8 },
    money: 6000,
  },
  {
    tier: 10,
    requiredXp: 4250,
    title: '🟣 Master Ball de Campeão',
    isPikachuTier: false,
    items: { master_ball: 1, rare_candy: 3 },
    money: 10000,
    badge: '🏆 Marco Nível 10',
  },
  {
    tier: 11,
    requiredXp: 4950,
    title: 'Bolsa de Batalhas Pesadas',
    isPikachuTier: false,
    items: { ultra_ball: 12, full_heal: 5 },
    money: 8000,
  },
  {
    tier: 12,
    requiredXp: 5700,
    title: '⚡ Encontro com Pikachu Volt Tackle',
    isPikachuTier: true,
    pikachuLevel: 45,
    pikachuShinyChance: 0.15,
    pikachuTitle: 'Pikachu Turbinado (Volt Tackle & Thunderbolt)',
    pikachuSpecialMove: 'volt_tackle',
    items: { ultra_ball: 10 },
    money: 10000,
  },
  {
    tier: 13,
    requiredXp: 6500,
    title: 'Banquete de Doces Raros',
    isPikachuTier: false,
    items: { rare_candy: 5, max_elixir: 3 },
    money: 12000,
  },
  {
    tier: 14,
    requiredXp: 7350,
    title: 'Preparação Suprema',
    isPikachuTier: false,
    items: { max_revive: 5, ultra_ball: 15 },
    money: 15000,
  },
  {
    tier: 15,
    requiredXp: 8250,
    title: '🧢 Encontro com Pikachu Ash Hat',
    isPikachuTier: true,
    pikachuLevel: 55,
    pikachuShinyChance: 0.18,
    pikachuTitle: 'Pikachu Chapéu de Ash (Trovão Supremo)',
    pikachuSpecialMove: 'thunder',
    items: { ultra_ball: 15 },
    money: 18000,
  },
  {
    tier: 16,
    requiredXp: 9200,
    title: 'Fortuna da Liga Pokémon',
    isPikachuTier: false,
    items: { rare_candy: 6 },
    money: 25000,
  },
  {
    tier: 17,
    requiredXp: 10200,
    title: 'Arsenal Pesado de Ultra Bolas',
    isPikachuTier: false,
    items: { ultra_ball: 25, max_potion: 10 },
    money: 20000,
  },
  {
    tier: 18,
    requiredXp: 11250,
    title: '⚡ Encontro com Pikachu Gigamax Alfa',
    isPikachuTier: true,
    pikachuLevel: 65,
    pikachuShinyChance: 0.22,
    pikachuTitle: 'Pikachu Gigamax Titânico',
    pikachuSpecialMove: 'zap_cannon',
    items: { rare_candy: 5 },
    money: 30000,
  },
  {
    tier: 19,
    requiredXp: 12350,
    title: 'Bênção Suprema do Trovão',
    isPikachuTier: false,
    items: { rare_candy: 8, max_revive: 10 },
    money: 40000,
  },
  {
    tier: 20,
    requiredXp: 13500,
    title: '👑 COROA DO PASSE: Pikachu Dourado Mítico',
    isPikachuTier: true,
    pikachuLevel: 75,
    pikachuShinyChance: 0.28, // Altíssima chance de vir Shiny!
    pikachuTitle: 'Pikachu Dourado Mítico (Chance Shiny Altíssima)',
    items: { master_ball: 2, rare_candy: 10 },
    money: 60000,
    badge: '👑 Campeão do Passe',
  },
];

interface BattlePassModalProps {
  currentXp: number;
  claimedTiers: number[];
  onClaimTier: (
    tierNum: number,
    rewards: {
      items?: Record<string, number>;
      money?: number;
      pikachuInstance?: PokemonInstance;
    }
  ) => void;
  onStartSpecialEncounter?: (wildInstance: PokemonInstance) => void;
  onClose: () => void;
}

export const BattlePassModal: React.FC<BattlePassModalProps> = ({
  currentXp = 0,
  claimedTiers = [],
  onClaimTier,
  onStartSpecialEncounter,
  onClose,
}) => {
  // Current tier calculation
  let currentTier = 0;
  for (const t of BATTLE_PASS_TIERS) {
    if (currentXp >= t.requiredXp) {
      currentTier = t.tier;
    } else {
      break;
    }
  }

  const nextTierConfig = BATTLE_PASS_TIERS.find((t) => t.tier === currentTier + 1);
  const prevXp = currentTier > 0 ? BATTLE_PASS_TIERS[currentTier - 1].requiredXp : 0;
  const nextXp = nextTierConfig ? nextTierConfig.requiredXp : BATTLE_PASS_TIERS[BATTLE_PASS_TIERS.length - 1].requiredXp;
  const progressPercent = nextTierConfig
    ? Math.min(100, Math.max(0, Math.round(((currentXp - prevXp) / (nextXp - prevXp)) * 100)))
    : 100;

  const handleClaim = async (tier: BattlePassTier) => {
    soundEngine.playLevelUp();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    let pikachuInstance: PokemonInstance | undefined;

    if (tier.isPikachuTier) {
      const pikaBase = await fetchPokemonData(25);
      if (pikaBase) {
        const isShiny = Math.random() < (tier.pikachuShinyChance || 0.1);
        pikachuInstance = createPokemonInstance(pikaBase, tier.pikachuLevel || 20, isShiny);
        pikachuInstance.displayName = tier.pikachuTitle || (isShiny ? 'Pikachu Shiny Especial' : 'Pikachu Especial');
        if (isShiny) {
          soundEngine.playShinyAppear();
        }
      }
    }

    onClaimTier(tier.tier, {
      items: tier.items,
      money: tier.money,
      pikachuInstance,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 relative">
        
        {/* Background lightning ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 text-slate-950 font-black shrink-0">
              <Zap className="w-7 h-7 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Passe de Batalha: Edição Pikachu
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 uppercase">
                  Temporada 1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vença batalhas para acumular <span className="text-yellow-400 font-bold">XP de Batalha</span> e desbloquear encontros épicos com Pikachu, Pokébolas e riquezas!
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

        {/* Current Level Status Card */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-yellow-950/30 border border-yellow-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-bold uppercase text-yellow-400">Nível</span>
              <span className="text-2xl font-black text-white leading-none">{currentTier}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Progresso do Passe</div>
              <div className="text-base font-black text-yellow-400">
                {currentXp} <span className="text-xs font-normal text-slate-400">XP Total de Batalha</span>
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="flex-1 w-full max-w-md">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-400">
                {nextTierConfig ? `Para o Nível ${nextTierConfig.tier}:` : 'Passe Completo!'}
              </span>
              <span className="text-yellow-400">
                {nextTierConfig ? `${currentXp} / ${nextTierConfig.requiredXp} XP` : 'MAX'}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-500 shadow-sm shadow-yellow-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tiers List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {BATTLE_PASS_TIERS.map((tier) => {
            const isUnlocked = currentXp >= tier.requiredXp;
            const isClaimed = claimedTiers.includes(tier.tier);
            const canClaim = isUnlocked && !isClaimed;

            return (
              <div
                key={tier.tier}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isClaimed
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                    : canClaim
                    ? 'bg-gradient-to-r from-yellow-950/40 via-slate-900 to-amber-950/30 border-yellow-500 shadow-lg shadow-yellow-500/10'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                {/* Left: Tier badge & info */}
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      isClaimed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : isUnlocked
                        ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md shadow-yellow-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {isClaimed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      tier.tier
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        {tier.title}
                      </span>
                      {tier.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Requer <span className="text-yellow-400 font-bold">{tier.requiredXp} XP</span> de Batalha
                    </div>
                  </div>
                </div>

                {/* Center: Reward preview */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-center">
                  {tier.isPikachuTier && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-bold">
                      <img
                        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                        alt="Pikachu"
                        className="w-6 h-6 object-contain"
                      />
                      <span>Pikachu Lv.{tier.pikachuLevel}</span>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        ({Math.round((tier.pikachuShinyChance || 0.1) * 100)}% Shiny)
                      </span>
                    </div>
                  )}

                  {tier.items &&
                    Object.entries(tier.items).map(([itemId, qty]) => {
                      const itemMeta = ITEMS_DATABASE[itemId];
                      return (
                        <div
                          key={itemId}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium"
                        >
                          {itemMeta?.sprite && (
                            <img src={itemMeta.sprite} alt={itemMeta.name} className="w-4 h-4 object-contain" />
                          )}
                          <span>
                            {qty}x {itemMeta?.name || itemId}
                          </span>
                        </div>
                      );
                    })}

                  {tier.money && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 font-bold">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+${tier.money.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Right: Claim Action Button */}
                <div className="w-full sm:w-auto flex justify-end shrink-0">
                  {isClaimed ? (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Resgatado
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => handleClaim(tier)}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Gift className="w-4 h-4" />
                      Resgatar Recompensa
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Lock className="w-4 h-4" /> Bloqueado ({tier.requiredXp - currentXp} XP restantes)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div>
            Ganhe XP vencendo batalhas selvagens (<span className="text-yellow-400 font-bold">+100 XP</span>), PvP e completando missões!
          </div>
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
