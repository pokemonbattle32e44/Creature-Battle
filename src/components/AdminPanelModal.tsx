import React, { useState } from 'react';
import { Crown, Sparkles, DollarSign, PlusCircle, ShieldAlert, X, Gift, Search } from 'lucide-react';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { PokemonInstance } from '../types/pokemon';
import { UserCloudData, syncUserToCloud } from '../utils/firebase';
import { soundEngine } from '../utils/soundEngine';

interface AdminPanelModalProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  userCloudProfile,
  onUpdateProfile,
  onClose,
}) => {
  const [moneyAmount, setMoneyAmount] = useState('50000');
  const [selectedPokedexId, setSelectedPokedexId] = useState<number>(666); // Default to GHOST
  const [level, setLevel] = useState<number>(100);
  const [isShiny, setIsShiny] = useState<boolean>(true);
  const [targetDestination, setTargetDestination] = useState<'team' | 'box'>('team');
  const [message, setMessage] = useState<string | null>(null);

  const handleAddMoney = async () => {
    soundEngine.playCatchSuccess();
    const add = parseInt(moneyAmount, 10) || 0;
    const updated = { ...userCloudProfile, money: userCloudProfile.money + add };
    await syncUserToCloud(updated);
    onUpdateProfile(updated);
    setMessage(`+${add.toLocaleString()} Pokedólares adicionados à sua conta!`);
  };

  const handleSpawnPokemon = async () => {
    soundEngine.playCatchSuccess();
    const baseData = STARTERS_AND_POKEMON_DATABASE[selectedPokedexId] || STARTERS_AND_POKEMON_DATABASE[1];
    const newPkmn = createPokemonInstance(baseData, level, isShiny);

    const updated = { ...userCloudProfile };
    if (targetDestination === 'team') {
      if (updated.team.length < 6) {
        updated.team = [...updated.team, newPkmn];
      } else {
        updated.pcBox = [...updated.pcBox, newPkmn];
        setMessage(`${newPkmn.displayName} criado e enviado ao PC Box (time cheio).`);
      }
    } else {
      updated.pcBox = [...updated.pcBox, newPkmn];
    }

    if (!updated.pokedexCaught.includes(newPkmn.pokedexId)) {
      updated.pokedexCaught = [...updated.pokedexCaught, newPkmn.pokedexId];
    }
    if (!updated.pokedexSeen.includes(newPkmn.pokedexId)) {
      updated.pokedexSeen = [...updated.pokedexSeen, newPkmn.pokedexId];
    }

    await syncUserToCloud(updated);
    onUpdateProfile(updated);
    setMessage(`⚡ ${newPkmn.displayName} Nível ${level} ${isShiny ? '✨ (Shiny)' : ''} gerado com sucesso!`);
  };

  const pokemonKeys = Object.keys(STARTERS_AND_POKEMON_DATABASE).map(Number);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-lg rounded-3xl p-6 relative shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7 text-slate-950" />
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
              Painel de Administrador Exclusivo
            </h3>
            <p className="text-xs text-slate-400">Poderes Supremos do Servidor</p>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-xs text-amber-300 font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {message}
          </div>
        )}

        {/* Section 1: Money */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Adicionar Dinheiro
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
            />
            <button
              onClick={handleAddMoney}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              Adicionar $
            </button>
          </div>
        </div>

        {/* Section 2: Spawn Special/Any Pokemon */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-amber-400" /> Gerar Pokémon (Qualquer Espécie)
          </h4>

          {/* Quick Admin Legendaries */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPokedexId(666)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedPokedexId === 666
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-lg'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              👻 GHOST (Boss #666)
            </button>
            <button
              onClick={() => setSelectedPokedexId(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedPokedexId === 0
                  ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow-lg'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ⚡ MissingNO. (#0)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Selecione o Pokémon:
            </label>
            <select
              value={selectedPokedexId}
              onChange={(e) => setSelectedPokedexId(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {pokemonKeys.map((id) => {
                const pkmn = STARTERS_AND_POKEMON_DATABASE[id];
                return (
                  <option key={id} value={id}>
                    #{id === 666 ? '???' : id} - {pkmn.displayName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Nível (1 - 100):</label>
              <input
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Destino:</label>
              <select
                value={targetDestination}
                onChange={(e) => setTargetDestination(e.target.value as 'team' | 'box')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="team">Time Principal</option>
                <option value="box">PC Box</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="shinyCheck"
              checked={isShiny}
              onChange={(e) => setIsShiny(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
            <label htmlFor="shinyCheck" className="text-xs font-bold text-amber-300 flex items-center gap-1 cursor-pointer">
              ✨ Versão Shiny (Brilhante)
            </label>
          </div>

          <button
            onClick={handleSpawnPokemon}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all hover:scale-[1.01]"
          >
            ⚡ GERAR POKÉMON AGORA
          </button>
        </div>
      </div>
    </div>
  );
};
