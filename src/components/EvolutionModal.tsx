import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, X } from 'lucide-react';
import { PokemonInstance, PokemonBaseData } from '../types/pokemon';
import { fetchPokemonData } from '../utils/apiFetcher';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { soundEngine } from '../utils/soundEngine';
import confetti from 'canvas-confetti';

interface EvolutionModalProps {
  pokemon: PokemonInstance;
  onCompleteEvolution: (evolvedPokemon: PokemonInstance) => void;
  onCancelEvolution: () => void;
}

export const EvolutionModal: React.FC<EvolutionModalProps> = ({
  pokemon,
  onCompleteEvolution,
  onCancelEvolution,
}) => {
  const [targetBaseData, setTargetBaseData] = useState<PokemonBaseData | null>(null);
  const [stage, setStage] = useState<'intro' | 'glowing' | 'done'>('intro');

  useEffect(() => {
    async function loadEvolutionTarget() {
      let targetId = pokemon.evolution?.targetId;
      if (!targetId) {
        const base = await fetchPokemonData(pokemon.pokedexId);
        if (base?.evolution?.targetId) {
          targetId = base.evolution.targetId;
        }
      }
      if (targetId) {
        const data = await fetchPokemonData(targetId);
        if (data) setTargetBaseData(data);
      }
    }
    loadEvolutionTarget();
  }, [pokemon]);

  const handleStartEvolution = () => {
    soundEngine.playLevelUp();
    setStage('glowing');

    setTimeout(() => {
      if (targetBaseData) {
        soundEngine.playCatchSuccess();
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
        setStage('done');
      }
    }, 2500);
  };

  const handleFinish = () => {
    if (targetBaseData) {
      const evolved = createPokemonInstance(targetBaseData, pokemon.level, pokemon.isShiny);
      evolved.heldItem = pokemon.heldItem;
      evolved.moves = [...pokemon.moves];
      evolved.exp = pokemon.exp;
      evolved.expToNext = pokemon.expToNext;
      onCompleteEvolution(evolved);
    }
  };

  if (!targetBaseData) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl flex flex-col items-center relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2 z-10">
          <Sparkles className="w-3.5 h-3.5" /> Evolução Pokémon
        </div>

        {stage === 'intro' && (
          <div className="z-10 w-full">
            <h2 className="text-2xl font-black text-white mb-2">
              O que?! {pokemon.displayName} está evoluindo!
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Seu Pokémon atingiu o nível necessário para evoluir para uma nova forma mais poderosa.
            </p>

            <div className="py-6 flex justify-center items-center">
              <img
                src={pokemon.sprites.artwork || pokemon.sprites.front}
                alt={pokemon.displayName}
                className="w-40 h-40 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-pulse"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={onCancelEvolution}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all"
              >
                Cancelar (Pressionar B)
              </button>
              <button
                onClick={handleStartEvolution}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
              >
                Evoluir Agora!
              </button>
            </div>
          </div>
        )}

        {stage === 'glowing' && (
          <div className="z-10 py-8">
            <h2 className="text-xl font-bold text-emerald-400 animate-pulse mb-6">
              A transformação está acontecendo...
            </h2>
            <div className="relative flex justify-center items-center my-6">
              <div className="absolute w-44 h-44 bg-white/30 rounded-full blur-2xl animate-ping"></div>
              <img
                src={pokemon.sprites.front}
                alt={pokemon.displayName}
                className="w-44 h-44 object-contain brightness-200 animate-spin transition-all duration-1000"
              />
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="z-10 w-full animate-fade-in">
            <h2 className="text-2xl font-black text-white mb-1">
              PARABÉNS!
            </h2>
            <p className="text-emerald-400 font-bold text-sm mb-6">
              Seu {pokemon.displayName} evoluiu para <span className="capitalize">{targetBaseData.displayName}</span>!
            </p>

            <div className="py-4 flex justify-center items-center">
              <img
                src={targetBaseData.sprites.artwork || targetBaseData.sprites.front}
                alt={targetBaseData.displayName}
                className="w-48 h-48 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] animate-bounce"
              />
            </div>

            <button
              onClick={handleFinish}
              className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Continuar Jornada
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
