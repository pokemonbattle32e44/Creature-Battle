import React from 'react';
import { Settings, Sun, Moon, Volume2, VolumeX, X, Shield, Smartphone, Info, Check } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface SettingsModalProps {
  theme: 'dark' | 'light';
  onToggleTheme: (theme: 'dark' | 'light') => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  theme,
  onToggleTheme,
  onClose,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configurações do Jogo</h2>
              <p className="text-xs text-slate-400">Ajuste tema visual e áudio da arena</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-4">
          
          {/* Theme Option (Modo Claro vs Modo Escuro) */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              Aparência / Tema Visual
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onToggleTheme('dark');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Modo Escuro</span>
                {isDark && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onToggleTheme('light');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  !isDark
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Modo Claro</span>
                {!isDark && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Alterne entre o tema noturno cibernético e o tema claro de alta nitidez.
            </p>
          </div>

          {/* Sound Controls */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Efeitos Sonoros & Cries
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-slate-300">Efeitos de Batalha e Ataques</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  soundEngine.playHit('super');
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold"
              >
                Testar Som
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Pokémon Arena Battle
            </div>
            <div>Pokédex Nacional: 1025 Pokémon (Gerações 1 a 9) + Entidades Míticas.</div>
            <div>Passe de Batalha com tema de Pikachu ativo na Temporada 1.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
