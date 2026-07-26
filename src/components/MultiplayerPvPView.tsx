import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Swords, Shield, Heart, Zap, RefreshCw, Trophy, Sparkles, X, ChevronRight, AlertCircle } from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { UserCloudData, db, syncUserToCloud, addSystemLog, sanitizeData } from '../utils/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { soundEngine } from '../utils/soundEngine';
import { getMove } from '../data/movesData';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { calculateDamage, getEffectiveStat, normalizePokemonInstance } from '../utils/pokemonCalc';
import { getPokemonSpriteStyle } from '../data/startersAndPokemon';

interface MultiplayerPvPViewProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onBack: () => void;
}

interface BattleStateDoc {
  id: string;
  hostUid: string;
  hostNickname: string;
  hostAvatar: string;
  hostElo: number;
  hostTeam: PokemonInstance[];
  hostActiveIndex: number;
  hostAction: { type: 'move' | 'switch'; moveId?: string; switchIndex?: number } | null;

  guestUid: string;
  guestNickname: string;
  guestAvatar: string;
  guestElo: number;
  guestTeam: PokemonInstance[];
  guestActiveIndex: number;
  guestAction: { type: 'move' | 'switch'; moveId?: string; switchIndex?: number } | null;

  status: 'waiting' | 'in_progress' | 'finished';
  winnerUid?: string;
  logs: string[];
  createdAt: string;
}

export const MultiplayerPvPView: React.FC<MultiplayerPvPViewProps> = ({
  userCloudProfile,
  onUpdateProfile,
  onBack,
}) => {
  const [battleCode, setBattleCode] = useState('');
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<BattleStateDoc | null>(null);
  const [menuMode, setMenuMode] = useState<'main' | 'moves' | 'pokemon'>('main');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [attackerLunge, setAttackerLunge] = useState<'player' | 'opponent' | null>(null);
  const [floatingText, setFloatingText] = useState<{ text: string; target: 'player' | 'opponent'; color: string } | null>(null);

  const prevMyPkmnKeyRef = useRef<string>('');
  const prevOpponentPkmnKeyRef = useRef<string>('');
  const prevLogsLengthRef = useRef<number>(0);

  // Trigger Pokemon Entrance Cries & Ball Throw SFX
  useEffect(() => {
    if (battleData?.status === 'in_progress') {
      const isHost = battleData.hostUid === userCloudProfile.uid;
      const myTeam = isHost ? battleData.hostTeam : battleData.guestTeam;
      const myActiveIdx = isHost ? battleData.hostActiveIndex : battleData.guestActiveIndex;
      const myActive = myTeam?.[myActiveIdx];

      const oppTeam = isHost ? battleData.guestTeam : battleData.hostTeam;
      const oppActiveIdx = isHost ? battleData.guestActiveIndex : battleData.hostActiveIndex;
      const oppActive = oppTeam?.[oppActiveIdx];

      if (myActive) {
        const myKey = `${myActive.pokedexId}_${myActive.displayName}_${myActiveIdx}`;
        if (myKey !== prevMyPkmnKeyRef.current) {
          prevMyPkmnKeyRef.current = myKey;
          soundEngine.playBallThrow();
          setTimeout(() => {
            if (myActive.pokedexId !== undefined) {
              soundEngine.playCry(myActive.pokedexId);
            }
          }, 150);
        }
      }

      if (oppActive) {
        const oppKey = `${oppActive.pokedexId}_${oppActive.displayName}_${oppActiveIdx}`;
        if (oppKey !== prevOpponentPkmnKeyRef.current) {
          prevOpponentPkmnKeyRef.current = oppKey;
          soundEngine.playBallThrow();
          setTimeout(() => {
            if (oppActive.pokedexId !== undefined) {
              soundEngine.playCry(oppActive.pokedexId);
            }
          }, 250);
        }
      }
    }
  }, [battleData?.status, battleData?.hostActiveIndex, battleData?.guestActiveIndex, battleData?.hostTeam, battleData?.guestTeam, userCloudProfile.uid]);

  // Trigger Hit SFX and Attack Lunge animations when new logs arrive
  useEffect(() => {
    if (battleData?.logs && battleData.logs.length > prevLogsLengthRef.current) {
      const newLogs = battleData.logs.slice(prevLogsLengthRef.current);
      prevLogsLengthRef.current = battleData.logs.length;

      const latest = newLogs[newLogs.length - 1];
      if (latest) {
        if (latest.includes('usou') || latest.includes('causou') || latest.includes('dano')) {
          soundEngine.playHit('physical');

          const isHost = battleData.hostUid === userCloudProfile.uid;
          const myNickname = userCloudProfile.nickname || '';
          const oppNickname = isHost ? battleData.guestNickname : battleData.hostNickname;

          if (latest.includes(`[${myNickname}]`)) {
            setAttackerLunge('player');
            setTimeout(() => setAttackerLunge(null), 400);
          } else if (latest.includes(`[${oppNickname}]`)) {
            setAttackerLunge('opponent');
            setTimeout(() => setAttackerLunge(null), 400);
          }
        }
      }
    }
  }, [battleData?.logs, battleData?.hostUid, battleData?.guestNickname, battleData?.hostNickname, userCloudProfile.nickname, userCloudProfile.uid]);

  // Subscribe to real-time battle doc
  useEffect(() => {
    if (!activeBattleId) return;

    const battleRef = doc(db, 'pvp_battles', activeBattleId);
    const unsub = onSnapshot(battleRef, async (snap) => {
      if (!snap.exists()) {
        setStatusMessage('A sala de batalha foi encerrada.');
        setActiveBattleId(null);
        setBattleData(null);
        return;
      }

      const data = snap.data() as BattleStateDoc;
      setBattleData(data);

      // Handle Turn Resolution if Host and both actions locked in
      if (
        data.status === 'in_progress' &&
        data.hostUid === userCloudProfile.uid &&
        data.hostAction &&
        data.guestAction &&
        !isProcessingTurn
      ) {
        setIsProcessingTurn(true);
        await resolveTurn(battleRef, data);
        setIsProcessingTurn(false);
      }
    }, (err) => {
      console.warn('PvP battle snapshot error:', err);
    });

    return () => unsub();
  }, [activeBattleId, userCloudProfile.uid, isProcessingTurn]);

  // Host creates room
  const handleCreateRoom = async () => {
    soundEngine.playClick();
    if (!userCloudProfile?.team || userCloudProfile.team.length === 0) {
      setStatusMessage('Você precisa de pelo menos 1 Pokémon na sua equipe para criar uma batalha!');
      return;
    }
    try {
      setStatusMessage('Criando sala de batalha...');
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const battleRef = doc(db, 'pvp_battles', code);

      const normalizedTeam = userCloudProfile.team.map(normalizePokemonInstance);

      const initialDoc: BattleStateDoc = {
        id: code,
        hostUid: userCloudProfile.uid || 'anon',
        hostNickname: userCloudProfile.nickname || 'Treinador Host',
        hostAvatar: userCloudProfile.avatar || '',
        hostElo: userCloudProfile.elo || 1000,
        hostTeam: normalizedTeam,
        hostActiveIndex: 0,
        hostAction: null,

        guestUid: '',
        guestNickname: '',
        guestAvatar: '',
        guestElo: 1000,
        guestTeam: [],
        guestActiveIndex: 0,
        guestAction: null,

        status: 'waiting',
        logs: [`Sala de Arena PvP #${code} criada! Aguardando um oponente...`],
        createdAt: new Date().toISOString(),
      };

      await setDoc(battleRef, sanitizeData(initialDoc));
      setActiveBattleId(code);
      setBattleCode(code);
      setStatusMessage(`Sala de Arena #${code} criada! Compartilhe o código para seu oponente entrar.`);
    } catch (err: any) {
      console.error('Erro ao criar sala PvP:', err);
      setStatusMessage(`Erro ao criar sala: ${err.message || 'Erro no banco de dados. Tente novamente.'}`);
    }
  };

  // Guest joins room
  const handleJoinRoom = async () => {
    if (!battleCode.trim()) {
      setStatusMessage('Por favor, digite o código de 6 dígitos da sala.');
      return;
    }
    soundEngine.playClick();
    if (!userCloudProfile?.team || userCloudProfile.team.length === 0) {
      setStatusMessage('Você precisa de pelo menos 1 Pokémon na sua equipe para entrar na batalha!');
      return;
    }
    try {
      setStatusMessage('Entrando na sala...');
      const code = battleCode.trim();
      const battleRef = doc(db, 'pvp_battles', code);

      const normalizedTeam = userCloudProfile.team.map(normalizePokemonInstance);

      const payload = {
        guestUid: userCloudProfile.uid || 'anon',
        guestNickname: userCloudProfile.nickname || 'Treinador Convidado',
        guestAvatar: userCloudProfile.avatar || '',
        guestElo: userCloudProfile.elo || 1000,
        guestTeam: normalizedTeam as any,
        guestActiveIndex: 0,
        status: 'in_progress',
        logs: [`${userCloudProfile.nickname || 'Treinador Convidado'} entrou na batalha! A arena Pokémon começou!`],
      };

      await updateDoc(battleRef, sanitizeData(payload));
      setActiveBattleId(code);
      setStatusMessage(`Entrou na Arena #${code}! Batalha em andamento!`);
    } catch (err: any) {
      console.error('Erro ao entrar na sala PvP:', err);
      setStatusMessage(`Erro ao entrar na sala: ${err.message || 'Sala não encontrada ou indisponível.'}`);
    }
  };

  // Submit move or switch action
  const handleSendAction = async (action: { type: 'move' | 'switch'; moveId?: string; switchIndex?: number }) => {
    if (!activeBattleId || !battleData) return;
    soundEngine.playClick();

    const isHost = battleData.hostUid === userCloudProfile.uid;
    const battleRef = doc(db, 'pvp_battles', activeBattleId);

    if (isHost) {
      await updateDoc(battleRef, { hostAction: action });
    } else {
      await updateDoc(battleRef, { guestAction: action });
    }

    setMenuMode('main');
  };

  // Resolve Turn Logic (Host side)
  const resolveTurn = async (battleRef: any, data: BattleStateDoc) => {
    let hostTeam = [...data.hostTeam];
    let guestTeam = [...data.guestTeam];
    let hostActiveIdx = data.hostActiveIndex;
    let guestActiveIdx = data.guestActiveIndex;

    const hostPkmn = hostTeam[hostActiveIdx];
    const guestPkmn = guestTeam[guestActiveIdx];
    const logs = [...(data.logs || [])];

    const hostAct = data.hostAction!;
    const guestAct = data.guestAction!;

    // 1. Process switches first
    if (hostAct.type === 'switch' && hostAct.switchIndex !== undefined) {
      hostActiveIdx = hostAct.switchIndex;
      logs.push(`${data.hostNickname} substituiu ${hostPkmn.displayName} por ${hostTeam[hostActiveIdx].displayName}!`);
    }

    if (guestAct.type === 'switch' && guestAct.switchIndex !== undefined) {
      guestActiveIdx = guestAct.switchIndex;
      logs.push(`${data.guestNickname} substituiu ${guestPkmn.displayName} por ${guestTeam[guestActiveIdx].displayName}!`);
    }

    // 2. Determine move turn order
    if (hostAct.type === 'move' && guestAct.type === 'move') {
      const hPkmnCurrent = hostTeam[hostActiveIdx];
      const gPkmnCurrent = guestTeam[guestActiveIdx];

      const hMove = getMove(hostAct.moveId!);
      const gMove = getMove(guestAct.moveId!);

      const hSpd = getEffectiveStat(hPkmnCurrent, 'spd');
      const gSpd = getEffectiveStat(gPkmnCurrent, 'spd');

      const hPrio = hMove.priority || 0;
      const gPrio = gMove.priority || 0;

      let hostGoesFirst = true;
      if (hPrio !== gPrio) {
        hostGoesFirst = hPrio > gPrio;
      } else if (hSpd !== gSpd) {
        hostGoesFirst = hSpd > gSpd;
      } else {
        hostGoesFirst = Math.random() < 0.5;
      }

      const executeAttack = (attackerPkmn: PokemonInstance, defenderPkmn: PokemonInstance, mId: string, attackerName: string) => {
        if (attackerPkmn.currentHp <= 0) return;
        const res = calculateDamage(attackerPkmn, defenderPkmn, mId);
        defenderPkmn.currentHp = Math.max(0, defenderPkmn.currentHp - res.damage);
        logs.push(`[${attackerName}] ${res.logMessage}`);
      };

      if (hostGoesFirst) {
        executeAttack(hPkmnCurrent, gPkmnCurrent, hostAct.moveId!, data.hostNickname);
        if (gPkmnCurrent.currentHp > 0) {
          executeAttack(gPkmnCurrent, hPkmnCurrent, guestAct.moveId!, data.guestNickname);
        }
      } else {
        executeAttack(gPkmnCurrent, hPkmnCurrent, guestAct.moveId!, data.guestNickname);
        if (hPkmnCurrent.currentHp > 0) {
          executeAttack(hPkmnCurrent, gPkmnCurrent, hostAct.moveId!, data.hostNickname);
        }
      }
    } else if (hostAct.type === 'move' && guestAct.type === 'switch') {
      const hPkmnCurrent = hostTeam[hostActiveIdx];
      const gPkmnCurrent = guestTeam[guestActiveIdx];
      const res = calculateDamage(hPkmnCurrent, gPkmnCurrent, hostAct.moveId!);
      gPkmnCurrent.currentHp = Math.max(0, gPkmnCurrent.currentHp - res.damage);
      logs.push(`[${data.hostNickname}] ${res.logMessage}`);
    } else if (guestAct.type === 'move' && hostAct.type === 'switch') {
      const hPkmnCurrent = hostTeam[hostActiveIdx];
      const gPkmnCurrent = guestTeam[guestActiveIdx];
      const res = calculateDamage(gPkmnCurrent, hPkmnCurrent, guestAct.moveId!);
      hPkmnCurrent.currentHp = Math.max(0, hPkmnCurrent.currentHp - res.damage);
      logs.push(`[${data.guestNickname}] ${res.logMessage}`);
    }

    // 3. Check fainted active pokemon & auto-switch if possible
    let newStatus = 'in_progress';
    let winnerUid = undefined;

    const hostHasAlive = hostTeam.some((p) => p.currentHp > 0);
    const guestHasAlive = guestTeam.some((p) => p.currentHp > 0);

    if (!hostHasAlive) {
      newStatus = 'finished';
      winnerUid = data.guestUid;
      logs.push(`🏆 ${data.guestNickname} venceu a batalha Pokémon!`);
    } else if (!guestHasAlive) {
      newStatus = 'finished';
      winnerUid = data.hostUid;
      logs.push(`🏆 ${data.hostNickname} venceu a batalha Pokémon!`);
    } else {
      // Auto switch fainted host pokemon
      if (hostTeam[hostActiveIdx].currentHp <= 0) {
        const nextAlive = hostTeam.findIndex((p) => p.currentHp > 0);
        if (nextAlive !== -1) {
          hostActiveIdx = nextAlive;
          logs.push(`${data.hostNickname} enviou ${hostTeam[nextAlive].displayName} para a batalha!`);
        }
      }
      // Auto switch fainted guest pokemon
      if (guestTeam[guestActiveIdx].currentHp <= 0) {
        const nextAlive = guestTeam.findIndex((p) => p.currentHp > 0);
        if (nextAlive !== -1) {
          guestActiveIdx = nextAlive;
          logs.push(`${data.guestNickname} enviou ${guestTeam[nextAlive].displayName} para a batalha!`);
        }
      }
    }

    // 4. Update doc & clear actions
    await updateDoc(battleRef, {
      hostTeam: hostTeam as any,
      guestTeam: guestTeam as any,
      hostActiveIndex: hostActiveIdx,
      guestActiveIndex: guestActiveIdx,
      hostAction: null,
      guestAction: null,
      status: newStatus,
      winnerUid,
      logs: logs.slice(-12),
    });

    // Award winner / penalize loser
    if (newStatus === 'finished' && winnerUid) {
      const isWinner = winnerUid === userCloudProfile.uid;
      const updated = { ...userCloudProfile };

      if (isWinner) {
        soundEngine.playCatchSuccess();
        updated.elo = (updated.elo || 1000) + 25;
        updated.wins = (updated.wins || 0) + 1;
        updated.winStreak = (updated.winStreak || 0) + 1;
        updated.money = (updated.money || 0) + 2500;
      } else {
        soundEngine.playFaint();
        updated.elo = Math.max(100, (updated.elo || 1000) - 15);
        updated.losses = (updated.losses || 0) + 1;
        updated.winStreak = 0;
      }

      await syncUserToCloud(updated);
      onUpdateProfile(updated);
    }
  };

  const handleForfeit = async () => {
    soundEngine.playClick();
    if (activeBattleId) {
      await deleteDoc(doc(db, 'pvp_battles', activeBattleId));
    }
    setActiveBattleId(null);
    setBattleData(null);
    setStatusMessage('Batalha encerrada.');
  };

  const isHost = battleData?.hostUid === userCloudProfile.uid;
  const myTeam = isHost ? battleData?.hostTeam : battleData?.guestTeam;
  const myActiveIdx = isHost ? battleData?.hostActiveIndex : battleData?.guestActiveIndex;
  const myActivePkmn = myTeam && myActiveIdx !== undefined ? myTeam[myActiveIdx] : null;
  const myActionLocked = isHost ? !!battleData?.hostAction : !!battleData?.guestAction;

  const opponentNickname = isHost ? battleData?.guestNickname : battleData?.hostNickname;
  const opponentTeam = isHost ? battleData?.guestTeam : battleData?.hostTeam;
  const opponentActiveIdx = isHost ? battleData?.guestActiveIndex : battleData?.hostActiveIndex;
  const opponentActivePkmn = opponentTeam && opponentActiveIdx !== undefined ? opponentTeam[opponentActiveIdx] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            soundEngine.playClick();
            if (activeBattleId) handleForfeit();
            onBack();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
        </button>

        <div className="flex items-center gap-2 bg-slate-900 border border-indigo-500/30 px-4 py-2 rounded-xl text-indigo-400 font-bold text-xs">
          <Swords className="w-4 h-4" /> ARENA MULTIPLAYER PVP
        </div>
      </div>

      {!activeBattleId || !battleData || battleData.status === 'waiting' ? (
        /* Lobby */
        <div className="max-w-2xl mx-auto my-auto w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">Batalhas de Treinadores em Tempo Real</h2>
            <p className="text-xs text-slate-400">
              Enfrente outros jogadores em duelos síncronos valendo ELO e Pokedólares!
            </p>
          </div>

          {statusMessage && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl text-center animate-pulse">
              {statusMessage}
            </div>
          )}

          {activeBattleId && (!battleData || battleData.status === 'waiting') ? (
            <div className="p-6 bg-slate-950 rounded-2xl border border-indigo-500/40 text-center space-y-3">
              <p className="text-xs font-bold text-indigo-300 uppercase">
                {!battleData ? 'Conectando à sala...' : 'Aguardando oponente entrar na sala'}
              </p>
              <h3 className="text-3xl font-black text-amber-400 font-mono">#{activeBattleId}</h3>
              <p className="text-[11px] text-slate-400">Passe este código para o seu amigo para dar início à partida.</p>
              <button
                onClick={handleForfeit}
                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-xl font-bold text-xs"
              >
                Cancelar Sala
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-indigo-400">Criar Sala PvP</h3>
                <p className="text-xs text-slate-400">Gere um código de duelo para desafiar um amigo.</p>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  Criar Sala
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-purple-400">Entrar em uma Sala</h3>
                <input
                  type="text"
                  value={battleCode}
                  onChange={(e) => setBattleCode(e.target.value)}
                  placeholder="Digite o Código da Arena"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Entrar no Duelo
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Real-Time Wild-Style PvP Battle View */
        <div className="max-w-4xl mx-auto w-full space-y-4">
          
          {/* Battle Stage Container */}
          <div className="relative w-full h-[360px] bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950/40 rounded-3xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xl">
            
            {/* Top Stage: Enemy HUD & Sprite */}
            <div className="flex justify-between items-start">
              {/* Opponent Status HUD */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-xl min-w-[200px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-white capitalize">{opponentActivePkmn?.displayName || 'Oponente'}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">Nv. {opponentActivePkmn?.level}</span>
                </div>
                {/* HP Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ((opponentActivePkmn?.currentHp || 0) / (opponentActivePkmn?.maxHp || 1)) > 0.5
                        ? 'bg-emerald-500'
                        : ((opponentActivePkmn?.currentHp || 0) / (opponentActivePkmn?.maxHp || 1)) > 0.2
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, ((opponentActivePkmn?.currentHp || 0) / (opponentActivePkmn?.maxHp || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>{opponentNickname}</span>
                  <span>{opponentActivePkmn?.currentHp}/{opponentActivePkmn?.maxHp} HP</span>
                </div>
              </div>

              {/* Opponent Sprite Stage */}
              {opponentActivePkmn && (
                <div
                  key={`opp_${opponentActivePkmn.pokedexId}_${opponentActiveIdx}`}
                  className="relative flex justify-center items-center w-36 h-36 pr-4 pt-2"
                >
                  <div className="absolute bottom-2 w-28 h-8 bg-black/40 rounded-full blur-md"></div>
                  <img
                    src={opponentActivePkmn.sprites?.front || ''}
                    alt={opponentActivePkmn.displayName}
                    referrerPolicy="no-referrer"
                    style={getPokemonSpriteStyle(opponentActivePkmn)}
                    className={`w-32 h-32 object-contain relative z-10 transition-all duration-300 animate-intro-enemy ${
                      attackerLunge === 'opponent' ? 'animate-lunge-enemy' : ''
                    } ${
                      opponentActivePkmn.pokedexId === 0 || opponentActivePkmn.name.toLowerCase() === 'missingno' ? 'missingno-pixel-glitch' : ''
                    } ${
                      opponentActivePkmn.pokedexId === 666 || opponentActivePkmn.name.toLowerCase() === 'ghost' ? 'ghost-aura' : ''
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Bottom Stage: Player HUD & Sprite */}
            <div className="flex justify-between items-end">
              {/* Player Active Sprite Stage */}
              {myActivePkmn && (
                <div
                  key={`my_${myActivePkmn.pokedexId}_${myActiveIdx}`}
                  className="relative flex justify-center items-center w-36 h-36 pl-4 pb-2"
                >
                  <div className="absolute bottom-2 w-28 h-8 bg-black/40 rounded-full blur-md"></div>
                  <img
                    src={myActivePkmn.sprites?.back || myActivePkmn.sprites?.front || ''}
                    alt={myActivePkmn.displayName}
                    referrerPolicy="no-referrer"
                    style={getPokemonSpriteStyle(myActivePkmn)}
                    className={`w-36 h-36 object-contain relative z-10 transition-all duration-300 animate-intro-player scale-110 ${
                      attackerLunge === 'player' ? 'animate-lunge-player' : ''
                    } ${
                      myActivePkmn.pokedexId === 0 || myActivePkmn.name.toLowerCase() === 'missingno' ? 'missingno-pixel-glitch' : ''
                    } ${
                      myActivePkmn.pokedexId === 666 || myActivePkmn.name.toLowerCase() === 'ghost' ? 'ghost-aura' : ''
                    }`}
                  />
                </div>
              )}

              {/* Player Status HUD */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-xl min-w-[220px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-white capitalize">{myActivePkmn?.displayName}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">Nv. {myActivePkmn?.level}</span>
                </div>
                {/* HP Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ((myActivePkmn?.currentHp || 0) / (myActivePkmn?.maxHp || 1)) > 0.5
                        ? 'bg-emerald-500'
                        : ((myActivePkmn?.currentHp || 0) / (myActivePkmn?.maxHp || 1)) > 0.2
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, ((myActivePkmn?.currentHp || 0) / (myActivePkmn?.maxHp || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Você ({userCloudProfile.nickname})</span>
                  <span>{myActivePkmn?.currentHp}/{myActivePkmn?.maxHp} HP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Battle Controls & Log Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Battle Log (7 cols) */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 h-48 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Relatório do Duelo</span>
              <div className="overflow-y-auto space-y-1 text-xs font-mono text-slate-300 pr-1 flex-1">
                {(battleData?.logs || []).map((log, i) => (
                  <p key={i} className="leading-tight text-[11px] border-b border-slate-800/40 pb-1">{log}</p>
                ))}
              </div>
            </div>

            {/* Battle Controls (5 cols) */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              {battleData?.status === 'finished' ? (
                <div className="text-center space-y-3 my-auto">
                  <h3 className="text-xl font-black text-amber-400">Batalha Finalizada!</h3>
                  <p className="text-xs text-slate-300">
                    {battleData?.winnerUid === userCloudProfile.uid ? '🎉 Você Venceu! (+25 ELO / +$2.500)' : ' Derrota... (-15 ELO)'}
                  </p>
                  <button
                    onClick={handleForfeit}
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg"
                  >
                    Voltar ao Lobby
                  </button>
                </div>
              ) : myActionLocked ? (
                <div className="text-center space-y-2 my-auto">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-indigo-300">Ação Confirmada!</p>
                  <p className="text-[10px] text-slate-400">Aguardando a decisão do outro treinador...</p>
                </div>
              ) : menuMode === 'main' ? (
                <div className="grid grid-cols-2 gap-2 my-auto">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setMenuMode('moves');
                    }}
                    className="py-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    <Swords className="w-5 h-5" /> LUTAR
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setMenuMode('pokemon');
                    }}
                    className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-5 h-5" /> POKÉMON
                  </button>

                  <button
                    onClick={handleForfeit}
                    className="col-span-2 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-800"
                  >
                    FUGIR / RENDIÇÃO
                  </button>
                </div>
              ) : menuMode === 'moves' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Escolha o Golpe</span>
                    <button onClick={() => setMenuMode('main')} className="text-[10px] text-indigo-400 hover:underline">Voltar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {myActivePkmn?.moves.map((m) => {
                      const mData = getMove(m.moveId);
                      return (
                        <button
                          key={m.moveId}
                          onClick={() => handleSendAction({ type: 'move', moveId: m.moveId })}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex flex-col justify-between"
                        >
                          <span className="font-bold text-xs text-white capitalize truncate">{mData.name}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase w-fit ${TYPE_COLORS[mData.type].bg} ${TYPE_COLORS[mData.type].text}`}>
                            {TYPE_NAMES_PT[mData.type]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Switch Pokemon Submenu */
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Trocar Pokémon</span>
                    <button onClick={() => setMenuMode('main')} className="text-[10px] text-indigo-400 hover:underline">Voltar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {myTeam?.map((pkmn, idx) => (
                      <button
                        key={pkmn.instanceId || idx}
                        disabled={idx === myActiveIdx || pkmn.currentHp <= 0}
                        onClick={() => handleSendAction({ type: 'switch', switchIndex: idx })}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 ${
                          idx === myActiveIdx
                            ? 'bg-indigo-600/20 border-indigo-500 opacity-50'
                            : pkmn.currentHp <= 0
                            ? 'bg-slate-950 border-slate-800 opacity-30'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800'
                        }`}
                      >
                        <img src={pkmn.sprites.front} alt={pkmn.displayName} className="w-8 h-8 object-contain" />
                        <div>
                          <p className="text-[10px] font-bold text-white truncate">{pkmn.displayName}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{pkmn.currentHp}/{pkmn.maxHp} HP</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
