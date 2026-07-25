import React from 'react';
import {
  Leaf,
  ShoppingBag,
  Backpack,
  Users,
  Save,
  Volume2,
  VolumeX,
  Shield,
  Award,
  Sparkles,
  Heart,
  Zap,
  BookOpen,
  Flame,
  Swords,
  Repeat,
  Trophy,
  Crown,
  UserCheck,
  Gift,
} from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { soundEngine } from '../utils/soundEngine';
import { RarityBadge } from './RarityBadge';

interface MainMenuProps {
  leadPokemon: PokemonInstance;
  pokedollars: number;
  soundEnabled: boolean;
  activeIncense?: string | null;
  currentUser?: any;
  userCloudProfile?: any;
  isAdmin?: boolean;
  onToggleSound: () => void;
  onNavigate: (
    view: 'grass' | 'shop' | 'bag' | 'team' | 'save' | 'pokedex' | 'pvp' | 'trade'
  ) => void;
  onOpenAuth: () => void;
  onOpenFriends: () => void;
  onOpenLeaderboard: () => void;
  onOpenAdminPanel: () => void;
  battlesWon: number;
  pokemonCaught: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  leadPokemon,
  pokedollars,
  soundEnabled,
  activeIncense,
  currentUser,
  userCloudProfile,
  isAdmin = false,
  onToggleSound,
  onNavigate,
  onOpenAuth,
  onOpenFriends,
  onOpenLeaderboard,
  onOpenAdminPanel,
  battlesWon,
  pokemonCaught,
}) => {
  const activeIncenseItem = activeIncense ? ITEMS_DATABASE[activeIncense] : null;
  const hpPercent = Math.max(0, Math.min(100, Math.round((leadPokemon.currentHp / leadPokemon.maxHp) * 100)));
  const expPercent = Math.max(0, Math.min(100, Math.round(((leadPokemon.exp - Math.pow(leadPokemon.level, 3)) / (leadPokemon.expToNext - Math.pow(leadPokemon.level, 3))) * 100)));

  const getHpColor = () => {
    if (hpPercent > 50) return 'bg-emerald-500';
    if (hpPercent > 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 px-5 shadow-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
              Pokémon Arena
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Vitórias: <strong className="text-emerald-400 font-mono">{battlesWon}</strong></span>
              <span>•</span>
              <span>Capturados: <strong className="text-teal-400 font-mono">{pokemonCaught}</strong></span>
            </div>
          </div>
        </div>

        {/* Currency, Social, Auth & Audio Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
            <span className="text-amber-400 font-bold text-sm">₽</span>
            <span className="font-mono font-bold text-white text-sm">
              {pokedollars.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenLeaderboard();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Ranking Global"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Ranking</span>
          </button>

          {/* Friends & Gifts Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenFriends();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Social & Presentes"
          >
            <Gift className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Social</span>
          </button>

          {/* Account/Auth Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenAuth();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Sua Conta Firebase"
          >
            <UserCheck className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">{currentUser ? 'Conta' : 'Entrar'}</span>
          </button>

          {/* Admin Panel Button */}
          {isAdmin && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenAdminPanel();
              }}
              className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-extrabold transition-all active:scale-95 flex items-center gap-1.5 text-xs shadow-lg shadow-amber-500/20"
              title="Painel Admin"
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span>ADMIN</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all active:scale-95"
            title="Ativar/Desativar Som"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Main Showcase Section */}
      <main className="flex-1 my-4 flex flex-col items-center justify-center z-10 relative">
        
        {/* Pokémon Showcase Card */}
        <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
          
          {/* Top Info Badge */}
          <div className="w-full flex justify-between items-center border-b border-slate-800/80 pb-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                #{String(leadPokemon.pokedexId).padStart(3, '0')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-wide flex items-center gap-1.5">
                {leadPokemon.displayName}
              </h2>
              <RarityBadge
                isRestricted={leadPokemon.isRestricted}
                isPseudoLegendary={leadPokemon.isPseudoLegendary}
                isShiny={leadPokemon.isShiny}
                size="md"
              />
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                NÍVEL {leadPokemon.level}
              </span>
            </div>
          </div>

          {/* Types */}
          <div className="flex gap-2 my-2">
            {leadPokemon.types.map((type) => (
              <span
                key={type}
                className={`text-xs px-3 py-1 rounded-lg font-bold uppercase tracking-wider shadow-sm ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
              >
                {TYPE_NAMES_PT[type]}
              </span>
            ))}
          </div>

          {/* Animated Main Sprite / Artwork */}
          <div
            className="relative my-4 flex justify-center items-center group cursor-pointer active:scale-90 transition-transform duration-200"
            onClick={() => soundEngine.playCry(leadPokemon.pokedexId)}
            title="Clique para ouvir o som do Pokémon!"
          >
            <div className="absolute w-44 h-44 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
            <img
              src={leadPokemon.sprites.animatedFront || leadPokemon.sprites.front}
              alt={leadPokemon.displayName}
              referrerPolicy="no-referrer"
              className={`w-48 h-48 sm:w-56 sm:h-56 object-contain relative z-10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300 ${
                leadPokemon.pokedexId === 0 || leadPokemon.name.toLowerCase() === 'missingno' ? 'missingno-pixel-glitch' : ''
              } ${
                leadPokemon.pokedexId === 666 || leadPokemon.name.toLowerCase() === 'ghost' ? 'ghost-aura' : ''
              }`}
            />
          </div>

          {/* Bars (HP & Experience) */}
          <div className="w-full space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {/* HP Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-red-400"><Heart className="w-3.5 h-3.5" /> HP</span>
                <span className="font-mono">{leadPokemon.currentHp} / {leadPokemon.maxHp}</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className={`h-full ${getHpColor()} rounded-full transition-all duration-500`}
                  style={{ width: `${hpPercent}%` }}
                ></div>
              </div>
            </div>

            {/* EXP Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-teal-400"><Zap className="w-3.5 h-3.5" /> EXPERIÊNCIA</span>
                <span className="font-mono">{expPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${expPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Active Incense Banner */}
      {activeIncenseItem && (
        <div className="w-full max-w-xl mx-auto mb-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-2.5 px-4 flex items-center justify-between text-xs z-10 animate-pulse shadow-lg">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>Incenso Ativo: <strong className="text-white">{activeIncenseItem.name}</strong></span>
          </div>
          <span className="text-[10px] text-emerald-400/80 bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-700/50">
            Efeito Ativado na Grama
          </span>
        </div>
      )}

      {/* Main Action Buttons Grid */}
      <footer className="w-full max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 z-10">
        
        {/* Grama Alta Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('grass');
          }}
          className="py-3 px-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group border border-emerald-400/30"
        >
          <div className="p-1.5 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
            <Leaf className="w-4 h-4" />
          </div>
          <span>Grama</span>
        </button>

        {/* PvP Online Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('pvp');
          }}
          className="py-3 px-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-red-950/60 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group border border-red-400/30"
        >
          <div className="p-1.5 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
            <Swords className="w-4 h-4" />
          </div>
          <span>Batalha PvP</span>
        </button>

        {/* Trocas Online Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('trade');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-sky-500/40 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-sky-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <Repeat className="w-4 h-4 text-sky-400" />
          </div>
          <span>Trocas</span>
        </button>

        {/* Pokédex Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('pokedex');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-emerald-500/40 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <span>Pokédex</span>
        </button>

        {/* Loja Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('shop');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-amber-500/40 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <span>Loja</span>
        </button>

        {/* Mochila Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('bag');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-teal-500/40 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-teal-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <Backpack className="w-4 h-4 text-teal-400" />
          </div>
          <span>Mochila</span>
        </button>

        {/* Equipe Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('team');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-indigo-500/40 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <span>Equipe</span>
        </button>

        {/* Salvar Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onNavigate('save');
          }}
          className="py-3 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl border border-slate-800 hover:border-slate-700 shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
            <Save className="w-4 h-4 text-slate-300" />
          </div>
          <span>Salvar</span>
        </button>

      </footer>

    </div>
  );
};
