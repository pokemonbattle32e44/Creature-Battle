import React, { useState, useEffect } from 'react';
import { ArrowLeft, Repeat, CheckCircle, ShieldAlert, Sparkles, X, Lock, Flame } from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { UserCloudData, db, syncUserToCloud, addSystemLog } from '../utils/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { soundEngine } from '../utils/soundEngine';

interface TradeViewProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onBack: () => void;
}

export const TradeView: React.FC<TradeViewProps> = ({
  userCloudProfile,
  onUpdateProfile,
  onBack,
}) => {
  const [tradeCode, setTradeCode] = useState('');
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [tradeState, setTradeState] = useState<any>(null);
  const [selectedMyPokemon, setSelectedMyPokemon] = useState<PokemonInstance | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Subscribe to trade session in Firestore
  useEffect(() => {
    if (!activeTradeId) return;

    const tradeRef = doc(db, 'trades', activeTradeId);
    const unsub = onSnapshot(tradeRef, async (snap) => {
      if (!snap.exists()) {
        setStatusMessage('A sala de troca foi encerrada pelo outro jogador.');
        setActiveTradeId(null);
        setTradeState(null);
        setIsLocked(false);
        return;
      }

      const data = snap.data();
      setTradeState(data);

      const isHost = data.hostUid === userCloudProfile.uid;
      const myPokemon = isHost ? data.hostPokemon : data.guestPokemon;
      const partnerPokemon = isHost ? data.guestPokemon : data.hostPokemon;
      const myConfirmed = isHost ? data.hostConfirmed : data.guestConfirmed;
      const partnerConfirmed = isHost ? data.guestConfirmed : data.hostConfirmed;

      // Check if both confirmed -> initiate countdown & execute swap
      if (myConfirmed && partnerConfirmed && data.status === 'pending') {
        setStatusMessage('Ambos confirmaram! Realizando troca em 3 segundos...');
        setCountdown(3);
      }
    });

    return () => unsub();
  }, [activeTradeId, userCloudProfile.uid]);

  // Countdown handler
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      executeTradeSwap();
    }
  }, [countdown]);

  const handleCreateRoom = async () => {
    soundEngine.playClick();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tradeRef = doc(db, 'trades', code);
    await setDoc(tradeRef, {
      hostUid: userCloudProfile.uid,
      hostNickname: userCloudProfile.nickname,
      guestUid: '',
      guestNickname: '',
      hostPokemon: null,
      guestPokemon: null,
      hostConfirmed: false,
      guestConfirmed: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    setActiveTradeId(code);
    setTradeCode(code);
    setStatusMessage(`Sala de Troca #${code} criada! Compartilhe este código com um amigo.`);
  };

  const handleJoinRoom = async () => {
    if (!tradeCode.trim()) return;
    soundEngine.playClick();
    const tradeRef = doc(db, 'trades', tradeCode.trim());
    await updateDoc(tradeRef, {
      guestUid: userCloudProfile.uid,
      guestNickname: userCloudProfile.nickname,
    });

    setActiveTradeId(tradeCode.trim());
    setStatusMessage(`Você entrou na Sala de Troca #${tradeCode.trim()}!`);
  };

  const handleSelectPokemonForTrade = async (pkmn: PokemonInstance) => {
    if (!activeTradeId || isLocked) return;
    soundEngine.playClick();
    setSelectedMyPokemon(pkmn);

    const isHost = tradeState?.hostUid === userCloudProfile.uid;
    const tradeRef = doc(db, 'trades', activeTradeId);

    if (isHost) {
      await updateDoc(tradeRef, { hostPokemon: pkmn, hostConfirmed: false });
    } else {
      await updateDoc(tradeRef, { guestPokemon: pkmn, guestConfirmed: false });
    }
  };

  const handleToggleConfirm = async () => {
    if (!activeTradeId || !selectedMyPokemon) return;
    soundEngine.playClick();
    const isHost = tradeState?.hostUid === userCloudProfile.uid;
    const currentConfirmed = isHost ? tradeState?.hostConfirmed : tradeState?.guestConfirmed;
    const newConfirmed = !currentConfirmed;

    setIsLocked(newConfirmed);
    const tradeRef = doc(db, 'trades', activeTradeId);
    if (isHost) {
      await updateDoc(tradeRef, { hostConfirmed: newConfirmed });
    } else {
      await updateDoc(tradeRef, { guestConfirmed: newConfirmed });
    }
  };

  const executeTradeSwap = async () => {
    if (!activeTradeId || !tradeState) return;
    soundEngine.playCatchSuccess();

    const isHost = tradeState.hostUid === userCloudProfile.uid;
    const sentPokemon = isHost ? tradeState.hostPokemon : tradeState.guestPokemon;
    const receivedPokemon = isHost ? tradeState.guestPokemon : tradeState.hostPokemon;

    if (!sentPokemon || !receivedPokemon) return;

    // Update player profile
    const updated = { ...userCloudProfile };
    // Remove sent
    updated.team = updated.team.filter((p) => p.id !== sentPokemon.id);
    updated.pcBox = updated.pcBox.filter((p) => p.id !== sentPokemon.id);

    // Add received
    updated.pcBox = [...updated.pcBox, receivedPokemon];
    if (!updated.pokedexCaught.includes(receivedPokemon.pokedexId)) {
      updated.pokedexCaught = [...updated.pokedexCaught, receivedPokemon.pokedexId];
    }

    await syncUserToCloud(updated);
    onUpdateProfile(updated);

    await addSystemLog('trade', [tradeState.hostUid, tradeState.guestUid], `Troca concluída: ${sentPokemon.displayName} por ${receivedPokemon.displayName}.`);

    // Clean up trade session if host
    if (isHost) {
      await deleteDoc(doc(db, 'trades', activeTradeId));
    }

    setStatusMessage(`🎉 Troca concluída! Você recebeu ${receivedPokemon.displayName} (Nv. ${receivedPokemon.level})!`);
    setCountdown(null);
    setActiveTradeId(null);
    setTradeState(null);
    setIsLocked(false);
  };

  const handleCancelTrade = async () => {
    soundEngine.playClick();
    if (activeTradeId) {
      await deleteDoc(doc(db, 'trades', activeTradeId));
    }
    setActiveTradeId(null);
    setTradeState(null);
    setIsLocked(false);
    setStatusMessage('Troca cancelada.');
  };

  const isHost = tradeState?.hostUid === userCloudProfile.uid;
  const partnerNickname = isHost ? tradeState?.guestNickname : tradeState?.hostNickname;
  const partnerPokemon = isHost ? tradeState?.guestPokemon : tradeState?.hostPokemon;
  const partnerConfirmed = isHost ? tradeState?.guestConfirmed : tradeState?.hostConfirmed;
  const myConfirmed = isHost ? tradeState?.hostConfirmed : tradeState?.guestConfirmed;

  const allAvailablePokemon = [...userCloudProfile.team, ...userCloudProfile.pcBox];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col justify-between select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              soundEngine.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 px-4 py-2 rounded-xl text-amber-400 font-bold text-xs">
            <Repeat className="w-4 h-4" /> TROCAS ONLINE EM TEMPO REAL
          </div>
        </div>

        {statusMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-indigo-950/80 border border-indigo-500/40 rounded-2xl text-xs text-indigo-300 font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {!activeTradeId ? (
          /* Lobby: Create or Join Room */
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Repeat className="w-8 h-8 text-slate-950" />
              </div>
              <h2 className="text-2xl font-black text-white">Centro de Trocas Pokémon</h2>
              <p className="text-xs text-slate-400">
                Troque seus Pokémon com qualquer jogador online do mundo com total segurança.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-amber-400">Criar Nova Sala de Troca</h3>
                <p className="text-xs text-slate-400">Gere um código exclusivo para compartilhar com seu amigo.</p>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  Criar Sala de Troca
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-sky-400">Entrar em uma Sala Existente</h3>
                <input
                  type="text"
                  value={tradeCode}
                  onChange={(e) => setTradeCode(e.target.value)}
                  placeholder="Digite o Código da Sala (Ex: 582910)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Entrar na Sala
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Trade Room UI */
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Sala de Troca</span>
                <h3 className="text-xl font-black text-amber-400">#{activeTradeId}</h3>
              </div>

              <button
                onClick={handleCancelTrade}
                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Cancelar Troca
              </button>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-center space-y-1">
                <span className="text-xs font-bold text-amber-300 uppercase">Confirmando Troca em</span>
                <p className="text-4xl font-black text-amber-400 font-mono animate-pulse">{countdown}</p>
              </div>
            )}

            {/* Two Side-by-Side Trade Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Offer */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Seu Pokémon (Você)</span>
                  {myConfirmed ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Confirmado
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400">Aguardando Confirmação</span>
                  )}
                </div>

                {selectedMyPokemon ? (
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <img
                      src={selectedMyPokemon.sprites.front}
                      alt={selectedMyPokemon.displayName}
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {selectedMyPokemon.displayName}
                        {selectedMyPokemon.isShiny && <span className="text-amber-400 text-xs">✨</span>}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">Nível {selectedMyPokemon.level}</p>
                      <p className="text-[10px] text-slate-500">Nature: {selectedMyPokemon.nature}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    Selecione um Pokémon abaixo para oferecer
                  </div>
                )}

                <button
                  onClick={handleToggleConfirm}
                  disabled={!selectedMyPokemon}
                  className={`w-full py-3 font-bold text-xs rounded-xl shadow-lg transition-all ${
                    myConfirmed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {myConfirmed ? 'Desfazer Confirmação' : 'Confirmar Este Pokémon'}
                </button>
              </div>

              {/* Partner Offer */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Parceiro: {partnerNickname || 'Aguardando jogador...'}
                  </span>
                  {partnerConfirmed ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Confirmado
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">Aguardando Confirmação</span>
                  )}
                </div>

                {partnerPokemon ? (
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <img
                      src={partnerPokemon.sprites.front}
                      alt={partnerPokemon.displayName}
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {partnerPokemon.displayName}
                        {partnerPokemon.isShiny && <span className="text-amber-400 text-xs">✨</span>}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">Nível {partnerPokemon.level}</p>
                      <p className="text-[10px] text-slate-500">Nature: {partnerPokemon.nature}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    {partnerNickname ? 'O outro jogador está escolhendo um Pokémon...' : 'Aguardando o segundo jogador entrar na sala...'}
                  </div>
                )}
              </div>
            </div>

            {/* Selection List */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Escolha o Pokémon que deseja oferecer:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {allAvailablePokemon.map((pkmn) => (
                  <button
                    key={pkmn.id}
                    onClick={() => handleSelectPokemonForTrade(pkmn)}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center transition-all ${
                      selectedMyPokemon?.id === pkmn.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <img src={pkmn.sprites.front} alt={pkmn.displayName} className="w-12 h-12 object-contain" />
                    <span className="text-[10px] font-bold truncate w-full">{pkmn.displayName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">Nv.{pkmn.level}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
