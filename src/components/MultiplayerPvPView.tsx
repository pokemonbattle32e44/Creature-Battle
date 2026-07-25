import React, { useState, useEffect } from 'react';
import { ArrowLeft, Swords, ShieldAlert, Sparkles, X, Trophy, RefreshCw, Flame, Heart } from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { UserCloudData, db, syncUserToCloud, addSystemLog, calculateLeague } from '../utils/firebase';
import { doc, setDoc, updateDoc, onSnapshot, deleteDoc, collection, addDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { soundEngine } from '../utils/soundEngine';

interface MultiplayerPvPViewProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onBack: () => void;
}

export const MultiplayerPvPView: React.FC<MultiplayerPvPViewProps> = ({
  userCloudProfile,
  onUpdateProfile,
  onBack,
}) => {
  const [battleMode, setBattleMode] = useState<'casual' | 'ranked' | 'private'>('casual');
  const [roomCode, setRoomCode] = useState('');
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [battleState, setBattleState] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Active turn action selection
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);

  // Subscribe to Battle Room
  useEffect(() => {
    if (!activeBattleId) return;

    const battleRef = doc(db, 'battles', activeBattleId);
    const unsub = onSnapshot(battleRef, async (snap) => {
      if (!snap.exists()) {
        setStatusMessage('A batalha foi encerrada.');
        setActiveBattleId(null);
        setBattleState(null);
        return;
      }

      const data = snap.data();
      setBattleState(data);

      const isHost = data.hostUid === userCloudProfile.uid;
      const myMove = isHost ? data.hostCurrentMove : data.guestCurrentMove;
      const partnerMove = isHost ? data.guestCurrentMove : data.hostCurrentMove;

      // When both players submitted their moves for this turn -> process turn
      if (myMove !== null && partnerMove !== null && data.status === 'in_progress') {
        if (isHost) {
          // Host executes round logic to keep state deterministic
          await processTurnRound(data);
        }
      }
    });

    return () => unsub();
  }, [activeBattleId, userCloudProfile.uid]);

  const processTurnRound = async (data: any) => {
    const hostPkmn = data.hostTeam[data.hostActiveIndex];
    const guestPkmn = data.guestTeam[data.guestActiveIndex];

    const hostMove = hostPkmn.moves[data.hostCurrentMove] || hostPkmn.moves[0];
    const guestMove = guestPkmn.moves[data.guestCurrentMove] || guestPkmn.moves[0];

    let logs: string[] = [...(data.logs || [])];

    // Determine turn order by Speed
    const hostFirst = hostPkmn.stats.spd >= guestPkmn.stats.spd;

    let updatedHostHp = hostPkmn.currentHp;
    let updatedGuestHp = guestPkmn.currentHp;

    if (hostFirst) {
      // Host attacks first
      const dmgToGuest = Math.max(10, Math.floor((hostPkmn.stats.atk / (guestPkmn.stats.def || 1)) * 15));
      updatedGuestHp = Math.max(0, updatedGuestHp - dmgToGuest);
      logs.push(`${hostPkmn.displayName} usou ${hostMove.name} e causou ${dmgToGuest} de dano!`);

      if (updatedGuestHp > 0) {
        const dmgToHost = Math.max(10, Math.floor((guestPkmn.stats.atk / (hostPkmn.stats.def || 1)) * 15));
        updatedHostHp = Math.max(0, updatedHostHp - dmgToHost);
        logs.push(`${guestPkmn.displayName} usou ${guestMove.name} e causou ${dmgToHost} de dano!`);
      }
    } else {
      // Guest attacks first
      const dmgToHost = Math.max(10, Math.floor((guestPkmn.stats.atk / (hostPkmn.stats.def || 1)) * 15));
      updatedHostHp = Math.max(0, updatedHostHp - dmgToHost);
      logs.push(`${guestPkmn.displayName} usou ${guestMove.name} e causou ${dmgToHost} de dano!`);

      if (updatedHostHp > 0) {
        const dmgToGuest = Math.max(10, Math.floor((hostPkmn.stats.atk / (guestPkmn.stats.def || 1)) * 15));
        updatedGuestHp = Math.max(0, updatedGuestHp - dmgToGuest);
        logs.push(`${hostPkmn.displayName} usou ${hostMove.name} e causou ${dmgToGuest} de dano!`);
      }
    }

    const updatedHostTeam = [...data.hostTeam];
    updatedHostTeam[data.hostActiveIndex] = { ...hostPkmn, currentHp: updatedHostHp };

    const updatedGuestTeam = [...data.guestTeam];
    updatedGuestTeam[data.guestActiveIndex] = { ...guestPkmn, currentHp: updatedGuestHp };

    let newStatus = 'in_progress';
    let winnerUid = '';

    if (updatedHostHp <= 0) {
      logs.push(`${hostPkmn.displayName} foi derrotado!`);
      newStatus = 'finished';
      winnerUid = data.guestUid;
    } else if (updatedGuestHp <= 0) {
      logs.push(`${guestPkmn.displayName} foi derrotado!`);
      newStatus = 'finished';
      winnerUid = data.hostUid;
    }

    // Update Firestore battle doc
    const battleRef = doc(db, 'battles', data.id);
    await updateDoc(battleRef, {
      hostTeam: updatedHostTeam,
      guestTeam: updatedGuestTeam,
      hostCurrentMove: null,
      guestCurrentMove: null,
      turn: data.turn + 1,
      logs,
      status: newStatus,
      winnerUid,
    });

    if (newStatus === 'finished') {
      await handleBattleFinish(winnerUid);
    }
  };

  const handleBattleFinish = async (winnerUid: string) => {
    const isWinner = winnerUid === userCloudProfile.uid;
    soundEngine.playVictory();

    const updated = { ...userCloudProfile };
    if (isWinner) {
      updated.wins += 1;
      updated.winStreak += 1;
      updated.elo += 25;
      updated.money += 2500;
    } else {
      updated.losses += 1;
      updated.winStreak = 0;
      updated.elo = Math.max(0, updated.elo - 15);
    }
    updated.league = calculateLeague(updated.elo);

    await syncUserToCloud(updated);
    onUpdateProfile(updated);
    setStatusMessage(isWinner ? '🏆 VITÓRIA! Você ganhou +25 ELO e $2.500!' : '💔 DERROTA! Treine mais para a próxima!');
  };

  const handleCreateBattleRoom = async () => {
    soundEngine.playClick();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const battleRef = doc(db, 'battles', code);

    await setDoc(battleRef, {
      id: code,
      hostUid: userCloudProfile.uid,
      hostNickname: userCloudProfile.nickname,
      hostAvatar: userCloudProfile.avatar,
      hostTeam: userCloudProfile.team,
      hostActiveIndex: 0,
      hostCurrentMove: null,

      guestUid: '',
      guestNickname: '',
      guestAvatar: '',
      guestTeam: [],
      guestActiveIndex: 0,
      guestCurrentMove: null,

      status: 'waiting',
      mode: battleMode,
      turn: 1,
      logs: [`Sala de Batalha #${code} criada por ${userCloudProfile.nickname}`],
      createdAt: new Date().toISOString(),
    });

    setActiveBattleId(code);
    setStatusMessage(`Sala de Batalha #${code} criada! Aguardando oponente...`);
  };

  const handleJoinBattleRoom = async () => {
    if (!roomCode.trim()) return;
    soundEngine.playClick();
    const battleRef = doc(db, 'battles', roomCode.trim());

    await updateDoc(battleRef, {
      guestUid: userCloudProfile.uid,
      guestNickname: userCloudProfile.nickname,
      guestAvatar: userCloudProfile.avatar,
      guestTeam: userCloudProfile.team,
      status: 'in_progress',
      logs: [`${userCloudProfile.nickname} entrou na batalha! A partida começou!`],
    });

    setActiveBattleId(roomCode.trim());
    setStatusMessage('Partida iniciada em tempo real!');
  };

  const handleSubmitMove = async (moveIndex: number) => {
    if (!activeBattleId || !battleState) return;
    soundEngine.playClick();
    setSelectedMoveIndex(moveIndex);

    const isHost = battleState.hostUid === userCloudProfile.uid;
    const battleRef = doc(db, 'battles', activeBattleId);

    if (isHost) {
      await updateDoc(battleRef, { hostCurrentMove: moveIndex });
    } else {
      await updateDoc(battleRef, { guestCurrentMove: moveIndex });
    }
  };

  const isHost = battleState?.hostUid === userCloudProfile.uid;
  const myTeam = isHost ? battleState?.hostTeam : battleState?.guestTeam;
  const partnerTeam = isHost ? battleState?.guestTeam : battleState?.hostTeam;

  const myActiveIndex = isHost ? battleState?.hostActiveIndex : battleState?.guestActiveIndex;
  const partnerActiveIndex = isHost ? battleState?.guestActiveIndex : battleState?.hostActiveIndex;

  const myActivePkmn = myTeam?.[myActiveIndex || 0];
  const partnerActivePkmn = partnerTeam?.[partnerActiveIndex || 0];

  const myMoveSubmitted = isHost ? battleState?.hostCurrentMove !== null : battleState?.guestCurrentMove !== null;

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

          <div className="flex items-center gap-2 bg-slate-900 border border-red-500/30 px-4 py-2 rounded-xl text-red-400 font-bold text-xs">
            <Swords className="w-4 h-4" /> ARENA BOH - BATALHAS PVP MULTIPLAYER
          </div>
        </div>

        {statusMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-950/80 border border-red-500/40 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {!activeBattleId ? (
          /* Lobby Selection */
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-red-600 to-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-red-600/20">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">Lobby de Batalha PvP</h2>
              <p className="text-xs text-slate-400">
                Enfrente outros treinadores online para subir de liga no ranking global!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-red-400">Criar Sala de Batalha</h3>
                <p className="text-xs text-slate-400">Gere uma sala online e aguarde seu oponente entrar.</p>
                <button
                  onClick={handleCreateBattleRoom}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  Criar Arena de Batalha
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-sky-400">Entrar via Código</h3>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Código da Sala (Ex: 849201)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={handleJoinBattleRoom}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Entrar na Arena
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Battle Stage */
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400">
                Turno #{battleState?.turn || 1} | Status: {battleState?.status}
              </span>
              <span className="text-xs font-bold text-red-400">Sala #{activeBattleId}</span>
            </div>

            {/* Arena View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 relative">
              {/* Opponent Active Pokemon */}
              <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-red-400">
                    {isHost ? battleState?.guestNickname : battleState?.hostNickname}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    HP: {partnerActivePkmn?.currentHp || 0} / {partnerActivePkmn?.stats.hp || 100}
                  </span>
                </div>
                {partnerActivePkmn && (
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <img src={partnerActivePkmn.sprites.front} alt={partnerActivePkmn.displayName} className="w-16 h-16 object-contain" />
                    <div>
                      <p className="text-sm font-bold text-white">{partnerActivePkmn.displayName}</p>
                      <p className="text-xs text-slate-400">Nível {partnerActivePkmn.level}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* My Active Pokemon */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400">Seu Pokémon ({userCloudProfile.nickname})</span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    HP: {myActivePkmn?.currentHp || 0} / {myActivePkmn?.stats.hp || 100}
                  </span>
                </div>
                {myActivePkmn && (
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <img src={myActivePkmn.sprites.back || myActivePkmn.sprites.front} alt={myActivePkmn.displayName} className="w-16 h-16 object-contain" />
                    <div>
                      <p className="text-sm font-bold text-white">{myActivePkmn.displayName}</p>
                      <p className="text-xs text-slate-400">Nível {myActivePkmn.level}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Moves Action Controls */}
            {battleState?.status === 'in_progress' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Escolha seu Movimento para este Turno:
                </h4>
                {myMoveSubmitted ? (
                  <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-center text-xs font-bold text-amber-300">
                    ⚡ Movimento selecionado! Aguardando a jogada do oponente...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {myActivePkmn?.moves.map((move: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmitMove(idx)}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500 rounded-xl text-left transition-all"
                      >
                        <p className="text-xs font-bold text-white">{move.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Poder: {move.power || 50} | Tipo: {move.type}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Battle Logs */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-400">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Histórico da Batalha:</p>
              {battleState?.logs?.map((log: string, i: number) => (
                <div key={i}>&gt; {log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
