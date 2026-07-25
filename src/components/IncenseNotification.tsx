import React from 'react';
import { Flame, Sparkles, Pause, Play } from 'lucide-react';
import { ITEMS_DATABASE } from '../data/itemsData';

interface IncenseNotificationProps {
  activeIncenseId: string | null;
  remainingSeconds: number;
  onToggleDeactivate: () => void;
}

export const IncenseNotification: React.FC<IncenseNotificationProps> = ({
  activeIncenseId,
  remainingSeconds,
  onToggleDeactivate,
}) => {
  if (!activeIncenseId || !ITEMS_DATABASE[activeIncenseId]) return null;

  const item = ITEMS_DATABASE[activeIncenseId];
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes} min ${seconds < 10 ? '0' : ''}${seconds}s`;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 border border-emerald-500/60 shadow-2xl shadow-emerald-950/60 rounded-2xl p-3 px-4 flex items-center gap-3 backdrop-blur-md text-white animate-bounce-short border-l-4 border-l-emerald-400">
      <div className="relative flex items-center justify-center">
        <img src={item.sprite} alt={item.name} className="w-9 h-9 object-contain" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>Incenso Ativo ({item.name.replace('Incenso de ', '').replace('Incenso ', '')})</span>
        </div>
        <div className="text-sm font-black font-mono text-white tracking-wide flex items-center gap-2">
          <span>{formattedTime}</span>
          <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            Efeito na Grama
          </span>
        </div>
      </div>

      <button
        onClick={onToggleDeactivate}
        title="Pausar / Desativar Incenso e guardar tempo"
        className="ml-2 p-2 bg-slate-800 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 rounded-xl transition-all active:scale-95 flex items-center justify-center"
      >
        <Pause className="w-4 h-4" />
      </button>
    </div>
  );
};
