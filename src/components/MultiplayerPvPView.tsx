import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Swords,
  Shield,
  Heart,
  Zap,
  RefreshCw,
  Trophy,
  Sparkles,
  X,
  ChevronRight,
  AlertCircle,
  Globe,
  Lock,
  Copy,
  Check,
  Users,
} from 'lucide-react';
import { PokemonInstance } from '../types/pokemon';
import { UserCloudData, db, syncUserToCloud, addSystemLog, sanitizeData } from '../utils/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { soundEngine } from '../utils/soundEngine';
import { getMove } from '../data/movesData';
import { TYPE_COLORS, TYPE_NAMES_PT } from '../data/typeChart';
import { calculateDamage, getEffectiveStat, normalizePokemonInstance } from '../utils/pokemonCalc';
import { getPokemonSpriteStyle } from '../data/startersAndPokemon';
import { RarityBadge } from './RarityBadge';

interface MultiplayerPvPViewProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onBack: () => void;
}

interface BattleStateDoc {
  id: string;
  isPrivate?: boolean;
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
  const [lobbyTab, setLobbyTab] = useState<'public' | 'create' | 'code'>('public');
  const [battleCode, setBattleCode] = useState('');
  const [createIsPrivate, setCreateIsPrivate] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [openPublicRooms, setOpenPublicRooms] = useState<BattleStateDoc[]>([]);

  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<BattleStateDoc | null>(null);
  const [menuMode, setMenuMode] = useState<'main' | 'moves' | 'pokemon'>('main');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [attackerLunge, setAttackerLunge] = useState<'player' | 'opponent' | null>(null);
  const [pvpFaintTarget, setPvpFaintTarget] = useState<'player' | 'opponent' | null>(null);
  const [floatingText, setFloatingText] = useState<{ text: string; target: 'player' | 'opponent'; color: string } | null>(null);

  const prevMyPkmnKeyRef = useRef<string>('');
  const prevOpponentPkmnKeyRef = useRef<string>('');
  const prevLogsLengthRef = useRef<number>(0);

  // Subscribe to open public rooms in the lobby
  useEffect(() => {
    if (activeBattleId) return;

    const battlesRef = collection(db, 'pvp_battles');
    const unsub = onSnapshot(
      battlesRef,
      (snap) => {
        const rooms: BattleStateDoc[] = [];
        snap.forEach((d) => {
          const item = d.data() as BattleStateDoc;
          if (item.status === 'waiting' && !item.isPrivate && item.hostUid !== userCloudProfile.uid) {
            rooms.push(item);
          }
        });
        rooms.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setOpenPublicRooms(rooms);
      },
      (err) => {
        console.warn('Erro ao carregar salas públicas PvP:', err);
      }
    );

    return () => unsub();
  }, [activeBattleId, userCloudProfile.uid]);

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
        if (latest.includes('usou') || latest.includes('causou') || latest.includes('dano') || latest.includes('acertou')) {
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

  // Host creates room (Public or Private)
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
        isPrivate: createIsPrivate,
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
        logs: [
          createIsPrivate
            ? `Sala Privada #${code} criada! Compartilhe o código para seu oponente entrar.`
            : `Sala Pública #${code} criada! Aberta no lobby para qualquer treinador entrar!`
        ],
        createdAt: new Date().toISOString(),
      };

      await setDoc(battleRef, sanitizeData(initialDoc));
      setActiveBattleId(code);
      setBattleCode(code);
      setStatusMessage(
        createIsPrivate
          ? `Sala Privada #${code} criada com sucesso! Passe o código para seu amigo.`
          : `Sala Pública #${code} criada com sucesso! Aguardando oponente no lobby...`
      );
    } catch (err: any) {
      console.error('Erro ao criar sala PvP:', err);
      setStatusMessage(`Erro ao criar sala: ${err.message || 'Erro no banco de dados. Tente novamente.'}`);
    }
  };

  // Join Public Room with 1 tap
  const handleJoinPublicRoom = async (room: BattleStateDoc) => {
    soundEngine.playClick();
    if (!userCloudProfile?.team || userCloudProfile.team.length === 0) {
      setStatusMessage('Você precisa de pelo menos 1 Pokémon na sua equipe para entrar na batalha!');
      return;
    }
    try {
      setStatusMessage(`Entrando na sala de ${room.hostNickname}...`);
      const battleRef = doc(db, 'pvp_battles', room.id);
      const normalizedTeam = userCloudProfile.team.map(normalizePokemonInstance);

      const payload = {
        guestUid: userCloudProfile.uid || 'anon',
        guestNickname: userCloudProfile.nickname || 'Treinador Convidado',
        guestAvatar: userCloudProfile.avatar || '',
        guestElo: userCloudProfile.elo || 1000,
        guestTeam: normalizedTeam as any,
        guestActiveIndex: 0,
        status: 'in_progress',
        logs: [`${userCloudProfile.nickname || 'Treinador Convidado'} entrou no duelo contra ${room.hostNickname}!`],
      };

      await updateDoc(battleRef, sanitizeData(payload));
      setActiveBattleId(room.id);
      setStatusMessage(`Você entrou na Arena #${room.id}! O duelo começou!`);
    } catch (err: any) {
      console.error('Erro ao entrar na sala pública:', err);
      setStatusMessage(`Erro ao entrar na sala: ${err.message || 'Sala indisponível.'}`);
    }
  };

  // Guest joins private room with 6-digit code
  const handleJoinPrivateRoom = async () => {
    if (!battleCode.trim()) {
      setStatusMessage('Por favor, digite o código de 6 dígitos da sala privada.');
      return;
    }
    soundEngine.playClick();
    if (!userCloudProfile?.team || userCloudProfile.team.length === 0) {
      setStatusMessage('Você precisa de pelo menos 1 Pokémon na sua equipe para entrar na batalha!');
      return;
    }
    try {
      setStatusMessage('Entrando na sala privada...');
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
        logs: [`${userCloudProfile.nickname || 'Treinador Convidado'} entrou na sala privada #${code}!`],
      };

      await updateDoc(battleRef, sanitizeData(payload));
      setActiveBattleId(code);
      setStatusMessage(`Entrou na Arena Privada #${code}! Batalha em andamento!`);
    } catch (err: any) {
      console.error('Erro ao entrar na sala PvP:', err);
      setStatusMessage(`Erro ao entrar na sala: ${err.message || 'Código incorreto ou sala indisponível.'}`);
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

  // Resolve Turn Logic (Host side authoritative)
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
      if (hostTeam[hostActiveIdx].currentHp <= 0) {
        const nextAlive = hostTeam.findIndex((p) => p.currentHp > 0);
        if (nextAlive !== -1) {
          hostActiveIdx = nextAlive;
          logs.push(`${data.hostNickname} enviou ${hostTeam[nextAlive].displayName} para a batalha!`);
        }
      }
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
      logs: logs.slice(-14),
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
  const opponentAvatar = isHost ? battleData?.guestAvatar : battleData?.hostAvatar;
  const opponentElo = isHost ? battleData?.guestElo : battleData?.hostElo;
  const opponentTeam = isHost ? battleData?.guestTeam : battleData?.hostTeam;
  const opponentActiveIdx = isHost ? battleData?.guestActiveIndex : battleData?.hostActiveIndex;
  const opponentActivePkmn = opponentTeam && opponentActiveIdx !== undefined ? opponentTeam[opponentActiveIdx] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-4 flex flex-col justify-between select-none">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-3 max-w-4xl mx-auto w-full">
        <button
          onClick={() => {
            soundEngine.playClick();
            if (activeBattleId) handleForfeit();
            onBack();
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-bold transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Menu
        </button>

        <div className="flex items-center gap-2 bg-slate-900/90 border border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-indigo-300 font-bold text-xs shadow-md">
          <Swords className="w-4 h-4 text-indigo-400" />
          <span>ARENA MULTIPLAYER ONLINE</span>
          {activeBattleId && (
            <span className="text-[10px] bg-indigo-950 border border-indigo-500/50 px-2 py-0.5 rounded-md font-mono text-amber-300 font-black">
              #{activeBattleId}
            </span>
          )}
        </div>
      </div>

      {/* LOBBY VIEW */}
      {!activeBattleId || !battleData || battleData.status === 'waiting' ? (
        <div className="max-w-2xl mx-auto my-auto w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl backdrop-blur-md">
          
          <div className="text-center space-y-1.5">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Swords className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Duelos Pokémon em Tempo Real</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Desafie outros treinadores online em batalhas síncronas valendo ELO e recompensas de ₽ 2.500!
            </p>
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-xs font-bold rounded-xl text-center">
              {statusMessage}
            </div>
          )}

          {activeBattleId && (!battleData || battleData.status === 'waiting') ? (
            /* Created room waiting screen */
            <div className="p-6 bg-slate-950 rounded-2xl border border-indigo-500/40 text-center space-y-4 shadow-inner">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold">
                {createIsPrivate ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                {createIsPrivate ? 'SALA PRIVADA' : 'SALA PÚBLICA NO LOBBY'}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Código de Acesso da Arena:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-wider">
                    #{activeBattleId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeBattleId);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                      soundEngine.playClick();
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {createIsPrivate
                  ? 'Compartilhe o código de 6 dígitos com um amigo para ele entrar na partida.'
                  : 'Sua sala já está listada no lobby público! Qualquer treinador online pode entrar agora.'}
              </p>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleForfeit}
                  className="px-5 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  Cancelar e Fechar Sala
                </button>
              </div>
            </div>
          ) : (
            /* Lobby tabs */
            <div>
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800 mb-4">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setLobbyTab('public');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    lobbyTab === 'public'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Salas Públicas ({openPublicRooms.length})</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setLobbyTab('create');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    lobbyTab === 'create'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Criar Partida</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setLobbyTab('code');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    lobbyTab === 'code'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Código Privado</span>
                </button>
              </div>

              {/* Tab 1: Public Rooms List */}
              {lobbyTab === 'public' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span>Treinadores Aguardando Duelo</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Ao Vivo
                    </span>
                  </div>

                  {openPublicRooms.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                      <Users className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">
                        Nenhuma sala pública aberta no momento.
                      </p>
                      <button
                        onClick={() => {
                          setCreateIsPrivate(false);
                          setLobbyTab('create');
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                      >
                        Seja o primeiro a Criar uma Sala Pública!
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {openPublicRooms.map((room) => {
                        const leadPkmn = room.hostTeam?.[0];
                        return (
                          <div
                            key={room.id}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              {room.hostAvatar ? (
                                <img
                                  src={room.hostAvatar}
                                  alt={room.hostNickname}
                                  className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300">
                                  {room.hostNickname.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span>{room.hostNickname}</span>
                                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                                    🏆 {room.hostElo || 1000} ELO
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>Equipe: {room.hostTeam?.length || 1} Pokémon</span>
                                  {leadPkmn && (
                                    <span className="text-slate-300">
                                      • Líder: {leadPkmn.displayName} (Nv. {leadPkmn.level})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleJoinPublicRoom(room)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                            >
                              ⚔️ Desafiar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Create Room with Privacy Toggle */}
              {lobbyTab === 'create' && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-400 mb-1">Configuração da Partida</h3>
                    <p className="text-xs text-slate-400">
                      Escolha se sua sala será aberta para qualquer jogador ou restrita por código.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCreateIsPrivate(false)}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                        !createIsPrivate
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <Globe className="w-4 h-4" />
                        <span>Partida Pública</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Aparece na lista de salas abertas para qualquer pessoa entrar com 1 clique.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateIsPrivate(true)}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                        createIsPrivate
                          ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow-md shadow-purple-950/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-purple-400">
                        <Lock className="w-4 h-4" />
                        <span>Partida Privada</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Exige um código de 6 dígitos para o oponente se conectar diretamente.
                      </p>
                    </button>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    🚀 Criar {createIsPrivate ? 'Sala Privada' : 'Sala Pública'}
                  </button>
                </div>
              )}

              {/* Tab 3: Join Private Room by Code */}
              {lobbyTab === 'code' && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 mb-1">Entrar com Código Privado</h3>
                    <p className="text-xs text-slate-400">
                      Insira o código de 6 dígitos que seu amigo ou adversário compartilhou.
                    </p>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={battleCode}
                    onChange={(e) => setBattleCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex: 584920"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg text-amber-300 font-mono tracking-widest focus:outline-none focus:border-purple-500"
                  />

                  <button
                    onClick={handleJoinPrivateRoom}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    ⚔️ Entrar no Duelo Privado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* REAL-TIME WILD-STYLE MULTIPLAYER PVP BATTLE VIEW */
        <div className="max-w-4xl mx-auto w-full space-y-3">
          
          {/* Battle Stage Container (Identical to BattleView style) */}
          <div className="relative w-full h-[360px] sm:h-[400px] bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950/40 rounded-3xl border border-slate-800 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-2xl">
            
            {/* Stage Ambient Glow & Arena Atmosphere */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12)_0%,transparent_60%)] pointer-events-none"></div>

            {/* TOP STAGE: OPPONENT STATUS CARD & SPRITE */}
            <div className="flex justify-between items-start gap-3 z-10">
              
              {/* Opponent Status HUD Card */}
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl min-w-[210px] sm:min-w-[250px]">
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap truncate">
                    <span className="capitalize text-white font-extrabold">
                      {opponentActivePkmn?.displayName || 'Oponente'}
                    </span>
                    <RarityBadge
                      isRestricted={opponentActivePkmn?.isRestricted}
                      isPseudoLegendary={opponentActivePkmn?.isPseudoLegendary}
                      isShiny={opponentActivePkmn?.isShiny}
                      size="sm"
                    />
                  </div>
                  <span className="text-emerald-400 font-mono shrink-0">
                    Nv. {opponentActivePkmn?.level}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                  <span className="text-red-400 font-extrabold flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" /> HP
                  </span>
                  <span className="font-mono text-white">
                    {opponentActivePkmn?.currentHp} / {opponentActivePkmn?.maxHp}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
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

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span className="truncate max-w-[120px]">Treinador: {opponentNickname}</span>
                  <span className="text-amber-400 font-bold">🏆 {opponentElo}</span>
                </div>
              </div>

              {/* Opponent Sprite Stage Platform */}
              {opponentActivePkmn && (
                <div
                  key={`opp_${opponentActivePkmn.pokedexId}_${opponentActiveIdx}`}
                  className="relative flex flex-col justify-center items-center w-36 h-36 sm:w-44 sm:h-44 pr-2 pt-1"
                >
                  <div className="absolute bottom-1 w-32 h-8 rounded-full bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/30 shadow-lg opacity-90 blur-[1px]"></div>
                  <img
                    src={opponentActivePkmn.sprites?.animatedFront || opponentActivePkmn.sprites?.front || ''}
                    alt={opponentActivePkmn.displayName}
                    referrerPolicy="no-referrer"
                    style={getPokemonSpriteStyle(opponentActivePkmn)}
                    className={`w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10 transition-all duration-300 animate-intro-enemy ${
                      attackerLunge === 'opponent' ? 'animate-lunge-enemy' : ''
                    } ${pvpFaintTarget === 'opponent' ? 'animate-faint-defeat' : ''} ${
                      opponentActivePkmn.pokedexId === 0 || opponentActivePkmn.name.toLowerCase() === 'missingno'
                        ? 'missingno-pixel-glitch'
                        : ''
                    } ${
                      opponentActivePkmn.pokedexId === 666 || opponentActivePkmn.name.toLowerCase() === 'ghost'
                        ? 'ghost-aura'
                        : ''
                    }`}
                  />
                </div>
              )}
            </div>

            {/* BOTTOM STAGE: PLAYER STATUS CARD & SPRITE */}
            <div className="flex justify-between items-end gap-3 z-10">
              
              {/* Player Sprite Stage Platform (Back View) */}
              {myActivePkmn && (
                <div
                  key={`my_${myActivePkmn.pokedexId}_${myActiveIdx}`}
                  className="relative flex flex-col justify-center items-center w-36 h-36 sm:w-44 sm:h-44 pl-2 pb-1"
                >
                  <div className="absolute bottom-1 w-32 h-8 rounded-full bg-gradient-to-r from-teal-950 to-emerald-950 border border-teal-500/30 shadow-lg opacity-90 blur-[1px]"></div>
                  <img
                    src={myActivePkmn.sprites?.animatedBack || myActivePkmn.sprites?.back || myActivePkmn.sprites?.front || ''}
                    alt={myActivePkmn.displayName}
                    referrerPolicy="no-referrer"
                    style={getPokemonSpriteStyle(myActivePkmn)}
                    className={`w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10 scale-110 transition-all duration-300 animate-intro-player ${
                      attackerLunge === 'player' ? 'animate-lunge-player' : ''
                    } ${pvpFaintTarget === 'player' ? 'animate-faint-defeat' : ''} ${
                      myActivePkmn.pokedexId === 0 || myActivePkmn.name.toLowerCase() === 'missingno'
                        ? 'missingno-pixel-glitch'
                        : ''
                    } ${
                      myActivePkmn.pokedexId === 666 || myActivePkmn.name.toLowerCase() === 'ghost'
                        ? 'ghost-aura'
                        : ''
                    }`}
                  />
                </div>
              )}

              {/* Player Status HUD Card */}
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl min-w-[210px] sm:min-w-[250px]">
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap truncate">
                    <span className="capitalize text-white font-extrabold">
                      {myActivePkmn?.displayName}
                    </span>
                    <RarityBadge
                      isRestricted={myActivePkmn?.isRestricted}
                      isPseudoLegendary={myActivePkmn?.isPseudoLegendary}
                      isShiny={myActivePkmn?.isShiny}
                      size="sm"
                    />
                  </div>
                  <span className="text-emerald-400 font-mono shrink-0">
                    Nv. {myActivePkmn?.level}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-0.5">
                  <span className="text-red-400 font-extrabold flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" /> HP
                  </span>
                  <span className="font-mono text-white">
                    {myActivePkmn?.currentHp} / {myActivePkmn?.maxHp}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
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

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span className="truncate max-w-[120px]">Você ({userCloudProfile.nickname})</span>
                  <span className="text-amber-400 font-bold">🏆 {userCloudProfile.elo || 1000}</span>
                </div>
              </div>

            </div>
          </div>

          {/* BATTLE CONTROLS & LOG SECTION (Identical to BattleView) */}
          <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-20">
            
            {/* Battle Log Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 h-20 overflow-y-auto font-sans text-xs text-slate-300 mb-3 leading-relaxed">
              {(battleData?.logs || []).slice(-4).map((log, i) => (
                <p key={i} className="text-emerald-300 font-medium pb-0.5 border-b border-slate-900/50">
                  {log}
                </p>
              ))}
            </div>

            {/* Action Buttons Panel */}
            {battleData?.status === 'finished' ? (
              <div className="text-center p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
                <h3 className="text-xl font-black text-amber-400">Duelo Encerrado!</h3>
                <p className="text-xs text-slate-200">
                  {battleData?.winnerUid === userCloudProfile.uid
                    ? '🎉 Vitória! Você ganhou +25 pontos de ELO e ₽ 2.500!'
                    : ' Derrota... Você perdeu -15 pontos de ELO.'}
                </p>
                <button
                  onClick={handleForfeit}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                >
                  Voltar ao Lobby PvP
                </button>
              </div>
            ) : myActionLocked ? (
              <div className="text-center p-6 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-indigo-300">Ação Confirmada!</p>
                <p className="text-[10px] text-slate-400">Aguardando a decisão do outro treinador na arena...</p>
              </div>
            ) : menuMode === 'main' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setMenuMode('moves');
                  }}
                  disabled={!myActivePkmn || myActivePkmn.currentHp <= 0}
                  className="py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Swords className="w-4 h-4" /> LUTAR
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setMenuMode('pokemon');
                  }}
                  className="py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" /> POKÉMON
                </button>

                <button
                  onClick={handleForfeit}
                  className="col-span-2 sm:col-span-1 py-3.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-xl border border-slate-800 transition-all active:scale-95"
                >
                  FUGIR / RENDIÇÃO
                </button>
              </div>
            ) : menuMode === 'moves' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Escolha o Golpe de Ataque:
                  </span>
                  <button
                    onClick={() => setMenuMode('main')}
                    className="text-[10px] text-indigo-400 hover:underline font-bold"
                  >
                    Voltar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {myActivePkmn?.moves.map((m, mIdx) => {
                    const mData = getMove(m.moveId);
                    return (
                      <button
                        key={`${m.moveId}_${mIdx}`}
                        disabled={m.pp <= 0}
                        onClick={() => handleSendAction({ type: 'move', moveId: m.moveId })}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-left flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className="font-bold text-xs text-white capitalize truncate">{mData.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${TYPE_COLORS[mData.type].bg} ${TYPE_COLORS[mData.type].text}`}>
                            {TYPE_NAMES_PT[mData.type]}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono w-full">
                          <span>{mData.power > 0 ? `Poder: ${mData.power}` : 'Status'}</span>
                          <span>PP: {m.pp}/{m.maxPp}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Switch Pokemon Submenu */
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Substituir Pokémon Ativo:
                  </span>
                  <button
                    onClick={() => setMenuMode('main')}
                    className="text-[10px] text-indigo-400 hover:underline font-bold"
                  >
                    Voltar
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {myTeam?.map((pkmn, idx) => (
                    <button
                      key={`${pkmn.instanceId || 'pvp_my'}_${idx}`}
                      disabled={idx === myActiveIdx || pkmn.currentHp <= 0}
                      onClick={() => handleSendAction({ type: 'switch', switchIndex: idx })}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        idx === myActiveIdx
                          ? 'bg-indigo-600/20 border-indigo-500 opacity-60'
                          : pkmn.currentHp <= 0
                          ? 'bg-slate-950 border-slate-800 opacity-30 cursor-not-allowed'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 active:scale-95'
                      }`}
                    >
                      <img
                        src={pkmn.sprites.front}
                        alt={pkmn.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-contain"
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{pkmn.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {pkmn.currentHp}/{pkmn.maxHp} HP
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};
