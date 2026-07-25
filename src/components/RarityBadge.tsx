import React from 'react';
import { Crown, Sparkles, Flame } from 'lucide-react';

interface RarityBadgeProps {
  isRestricted?: boolean;
  isPseudoLegendary?: boolean;
  isShiny?: boolean;
  size?: 'sm' | 'md';
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({
  isRestricted,
  isPseudoLegendary,
  isShiny,
  size = 'md',
}) => {
  if (!isRestricted && !isPseudoLegendary && !isShiny) return null;

  const textSize = size === 'sm' ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5';

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {isRestricted && (
        <span className={`bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-full shadow-md border border-amber-200 flex items-center gap-1 ${textSize}`}>
          <Crown className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          LENDÁRIO
        </span>
      )}
      {isPseudoLegendary && !isRestricted && (
        <span className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-full shadow-md border border-purple-300 flex items-center gap-1 ${textSize}`}>
          <Flame className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          PSEUDO
        </span>
      )}
      {isShiny && (
        <span className={`bg-gradient-to-r from-yellow-300 via-amber-300 to-emerald-300 text-slate-950 font-black rounded-full shadow-md border border-yellow-100 flex items-center gap-1 ${textSize}`}>
          <Sparkles className={size === 'sm' ? 'w-2.5 h-2.5 text-amber-700' : 'w-3 h-3 text-amber-700'} />
          SHINY
        </span>
      )}
    </div>
  );
};
