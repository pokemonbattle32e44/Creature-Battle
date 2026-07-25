import React, { useState } from 'react';
import { ArrowLeft, ShoppingBag, Plus, Minus, Check, Disc, HeartPulse, Sparkles, BookOpen, ShieldAlert } from 'lucide-react';
import { Item } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { soundEngine } from '../utils/soundEngine';

interface ShopViewProps {
  pokedollars: number;
  userInventory: Record<string, number>;
  isAdmin?: boolean;
  onBuyItem: (itemId: string, quantity: number, totalCost: number) => void;
  onChallengeMissingNo?: () => void;
  onChallengeGhost?: () => void;
  onBack: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  pokedollars,
  userInventory,
  isAdmin = false,
  onBuyItem,
  onChallengeMissingNo,
  onChallengeGhost,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'ball' | 'medicine' | 'candy' | 'battle' | 'tm' | 'incense'>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const itemList = Object.values(ITEMS_DATABASE).filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  const handleQtyChange = (itemId: string, delta: number) => {
    soundEngine.playClick();
    const curr = quantities[itemId] || 1;
    const next = Math.max(1, curr + delta);
    setQuantities({ ...quantities, [itemId]: next });
  };

  const handlePurchase = (item: Item) => {
    const qty = quantities[item.id] || 1;
    const totalCost = item.price * qty;

    if (pokedollars < totalCost) {
      soundEngine.playHit('notVery');
      showToast(`Pokédólares insuficientes para comprar ${qty}x ${item.name}!`);
      return;
    }

    if (item.id === 'missingno_ticket') {
      if (!isAdmin) {
        soundEngine.playHit('notVery');
        showToast('🔒 Apenas administradores podem invocar o MissingNO. diretamente!');
        return;
      }
      soundEngine.playCatchSuccess();
      onBuyItem(item.id, 1, item.price);
      if (onChallengeMissingNo) {
        onChallengeMissingNo();
      }
      return;
    }

    if (item.id === 'ghost_ticket') {
      if (!isAdmin) {
        soundEngine.playHit('notVery');
        showToast('🔒 Apenas administradores podem invocar o GHOST diretamente!');
        return;
      }
      soundEngine.playCatchSuccess();
      onBuyItem(item.id, 1, item.price);
      if (onChallengeGhost) {
        onChallengeGhost();
      }
      return;
    }

    soundEngine.playCatchSuccess();
    onBuyItem(item.id, qty, totalCost);
    showToast(`Comprado com sucesso: ${qty}x ${item.name}!`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
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

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="text-amber-400 font-bold text-sm">₽</span>
            <span className="font-mono font-bold text-white text-base">
              {pokedollars.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShoppingBag className="w-3.5 h-3.5" /> Loja de Itens Pokémon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Poké Mart Oficial
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Compre Poké Bolas, Poções, TMs e itens de fortalecimento para suas batalhas.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-6 justify-center">
          {[
            { id: 'all', label: 'Todos os Itens' },
            { id: 'incense', label: '🌸 Incensos' },
            { id: 'ball', label: 'Poké Bolas' },
            { id: 'medicine', label: 'Medicamentos' },
            { id: 'candy', label: 'Doces' },
            { id: 'battle', label: 'Batalha' },
            { id: 'tm', label: 'TMs (Ataques)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundEngine.playClick();
                setActiveCategory(cat.id as any);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="max-w-md mx-auto mb-4 p-3 bg-slate-900 border border-amber-500/50 rounded-xl text-center text-amber-300 text-xs font-bold animate-bounce shadow-xl">
            {toastMsg}
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          {itemList.map((item) => {
            const qty = quantities[item.id] || 1;
            const totalCost = item.price * qty;
            const canAfford = pokedollars >= totalCost;
            const ownedCount = userInventory[item.id] || 0;

            return (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center shrink-0">
                        <img
                          src={item.sprite}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (item.id === 'missingno_ticket') {
                              target.src = 'https://play.pokemonshowdown.com/sprites/gen1/missingno.png';
                            }
                          }}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white capitalize leading-tight">{item.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">Em posse: {ownedCount}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-amber-400 font-extrabold text-sm">₽{item.price.toLocaleString('pt-BR')}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 my-2 leading-relaxed">{item.description}</p>
                </div>

                {/* Purchase Controls */}
                <div className="border-t border-slate-800/80 pt-3 mt-2 flex items-center justify-between gap-3">
                  {/* Quantity Counter */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                    <button
                      onClick={() => handleQtyChange(item.id, -1)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-white">{qty}</span>
                    <button
                      onClick={() => handleQtyChange(item.id, 1)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    }`}
                  >
                    <span>Comprar</span>
                    <span className="font-mono text-[11px] opacity-90">(₽{totalCost.toLocaleString('pt-BR')})</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
