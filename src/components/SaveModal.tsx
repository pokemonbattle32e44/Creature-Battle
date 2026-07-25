import React, { useState } from 'react';
import { ArrowLeft, Save, CheckCircle2, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface SaveModalProps {
  lastSavedAt: string | null;
  onSaveGame: () => void;
  onResetGame: () => void;
  onBack: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  lastSavedAt,
  onSaveGame,
  onResetGame,
  onBack,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = () => {
    soundEngine.playCatchSuccess();
    onSaveGame();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleConfirmReset = () => {
    soundEngine.playClick();
    onResetGame();
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

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 font-bold text-xs">
            <Save className="w-4 h-4" /> SALVAR JOGO
          </div>
        </div>

        <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
          
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            Salvar Progresso do Jogo
          </h2>
          <p className="text-slate-400 text-xs mb-6">
            Guarde sua equipe, nível, Pokédólares e inventário no armazenamento do navegador.
          </p>

          {lastSavedAt && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 text-xs text-slate-400 font-mono">
              Último salvamento: <span className="text-emerald-400 font-bold">{new Date(lastSavedAt).toLocaleString('pt-BR')}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="mb-6 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold animate-bounce">
              <CheckCircle2 className="w-4 h-4" /> Progresso salvo com sucesso!
            </div>
          )}

          {!showResetConfirm ? (
            <div className="space-y-3">
              <button
                onClick={handleSave}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" /> Salvar Agora
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setShowResetConfirm(true);
                }}
                className="w-full py-3 bg-slate-950 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl border border-slate-800 hover:border-red-800/50 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Reiniciar Jogo (Apagar Dados)
              </button>
            </div>
          ) : (
            <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-4 text-center space-y-3 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-red-400 font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Tem certeza de que deseja apagar os dados?
              </div>
              <p className="text-xs text-red-200/80">
                Todo o seu progresso, Pokémon capturados e itens serão completamente excluídos!
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-lg transition-all active:scale-95 shadow-lg"
                >
                  SIM, APAGAR E REINICIAR
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
