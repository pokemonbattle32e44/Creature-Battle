import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  DollarSign,
  PlusCircle,
  X,
  Package,
  Calendar,
  Zap,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  TrendingUp,
  MapPin,
  CheckCircle,
  Radio,
  Globe,
  Users,
  Compass,
  Gift,
  Search,
} from 'lucide-react';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { fetchPokemonData } from '../utils/apiFetcher';
import { PokemonInstance, GameEvent, BiomeType, BroadcastEncounter, GameMission, formatPokedexId } from '../types/pokemon';
import {
  UserCloudData,
  syncUserToCloud,
  addSystemLog,
  saveGameEvent,
  deleteGameEvent,
  fetchAllEvents,
  setBroadcastEncounter,
  clearBroadcastEncounter,
  subscribeToBroadcastEncounter,
  subscribeOnlineUsers,
  OnlinePresenceUser,
  subscribeMissions,
  saveMission,
  deleteMission,
} from '../utils/firebase';
import { soundEngine } from '../utils/soundEngine';
import { BIOMES, BIOME_ROTATION_ORDER } from '../data/environments';
import { NATIONAL_POKEDEX_INDEX } from '../data/nationalPokedex';
import { PokemonSearchPicker } from './PokemonSearchPicker';

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
  const [activeTab, setActiveTab] = useState<'resources' | 'events' | 'broadcast' | 'missions'>('resources');
  const [moneyAmount, setMoneyAmount] = useState('50000');
  const [selectedPokedexId, setSelectedPokedexId] = useState<number>(9999); // Default to GHOST
  const [level, setLevel] = useState<number>(100);
  const [isShiny, setIsShiny] = useState<boolean>(true);
  const [targetDestination, setTargetDestination] = useState<'team' | 'box'>('team');
  const [selectedItemKey, setSelectedItemKey] = useState<string>('master_ball');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [message, setMessage] = useState<string | null>(null);

  // Events State
  const [eventsList, setEventsList] = useState<GameEvent[]>([]);
  const [eventTabFilter, setEventTabFilter] = useState<'all' | 'active' | 'scheduled'>('all');
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // New Event Form
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventShinyMult, setEventShinyMult] = useState(2.0);
  const [eventExpMult, setEventExpMult] = useState(2.0);
  const [eventMoneyMult, setEventMoneyMult] = useState(2.0);
  const [eventDurationHours, setEventDurationHours] = useState(24);
  const [boostedSpeciesId, setBoostedSpeciesId] = useState<number>(25); // Pikachu
  const [boostPercentage, setBoostPercentage] = useState<number>(200); // +200% = 3x chance
  const [boostedSpeciesBiomes, setBoostedSpeciesBiomes] = useState<BiomeType[]>([]);
  const [selectedBiomes, setSelectedBiomes] = useState<BiomeType[]>([]);
  const [allowRestrictedSpawns, setAllowRestrictedSpawns] = useState(false);
  const [allowInAllBiomes, setAllowInAllBiomes] = useState(false);
  const [eventActiveImmediate, setEventActiveImmediate] = useState(true);

  // Global Broadcast Next Wild Encounter State
  const [broadcastSpeciesId, setBroadcastSpeciesId] = useState<number>(25);
  const [broadcastLevel, setBroadcastLevel] = useState<number>(50);
  const [broadcastShiny, setBroadcastShiny] = useState<boolean>(true);
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastEncounter | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlinePresenceUser[]>([]);
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'subset'>('all');
  const [broadcastTargetCount, setBroadcastTargetCount] = useState<number>(1);

  // Missions Management State
  const [missionsList, setMissionsList] = useState<GameMission[]>([]);
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDesc, setMissionDesc] = useState('');
  const [missionCategory, setMissionCategory] = useState<'daily' | 'battle' | 'capture' | 'special'>('battle');
  const [missionTargetType, setMissionTargetType] = useState<'win_battles' | 'catch_pokemon' | 'super_effective'>('win_battles');
  const [missionTargetValue, setMissionTargetValue] = useState<number>(3);
  const [missionRewardType, setMissionRewardType] = useState<'battle_pass_xp' | 'ball' | 'money' | 'pokemon_encounter'>('battle_pass_xp');
  const [missionRewardAmount, setMissionRewardAmount] = useState<number>(300);
  const [missionRewardItemId, setMissionRewardItemId] = useState<string>('ultra_ball');
  const [missionRewardPokemonId, setMissionRewardPokemonId] = useState<number>(25);
  const [missionRewardPokemonLevel, setMissionRewardPokemonLevel] = useState<number>(25);

  useEffect(() => {
    loadEvents();
    const unsubBroadcast = subscribeToBroadcastEncounter((bc) => {
      setCurrentBroadcast(bc);
    });
    const unsubOnline = subscribeOnlineUsers((users) => {
      setOnlineUsers(users);
    });
    const unsubMissions = subscribeMissions((missions) => {
      setMissionsList(missions);
    });

    return () => {
      unsubBroadcast();
      unsubOnline();
      unsubMissions();
    };
  }, []);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const list = await fetchAllEvents();
      setEventsList(list);
    } catch (e) {
      console.warn('Failed to load events:', e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleAddMoney = async () => {
    soundEngine.playCatchSuccess();
    const add = parseInt(moneyAmount, 10) || 0;
    const updated = { ...userCloudProfile, money: userCloudProfile.money + add };
    await syncUserToCloud(updated);
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin adicionou $${add.toLocaleString()} Pokedólares.`);
    onUpdateProfile(updated);
    setMessage(`+${add.toLocaleString()} Pokedólares adicionados à sua conta!`);
  };

  const handleAddItem = async () => {
    soundEngine.playCatchSuccess();
    const updated = { ...userCloudProfile };
    const currentQty = updated.inventory[selectedItemKey] || 0;
    updated.inventory = {
      ...updated.inventory,
      [selectedItemKey]: currentQty + itemQuantity,
    };
    await syncUserToCloud(updated);
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin adicionou ${itemQuantity}x ${selectedItemKey}.`);
    onUpdateProfile(updated);
    const itemName = ITEMS_DATABASE[selectedItemKey]?.name || selectedItemKey;
    setMessage(`+${itemQuantity}x ${itemName} adicionados ao seu inventário!`);
  };

  const handleSpawnPokemon = async () => {
    soundEngine.playCatchSuccess();
    const baseData =
      (await fetchPokemonData(selectedPokedexId)) ||
      STARTERS_AND_POKEMON_DATABASE[selectedPokedexId] ||
      STARTERS_AND_POKEMON_DATABASE[1];
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
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin gerou Pokémon ${newPkmn.displayName} Nv.${level}.`);
    onUpdateProfile(updated);
    setMessage(`⚡ ${newPkmn.displayName} Nível ${level} ${isShiny ? '✨ (Shiny)' : ''} gerado com sucesso!`);
  };

  const handleCreateOrUpdateEvent = async () => {
    if (!eventName.trim()) {
      alert('Por favor informe um nome para o evento.');
      return;
    }

    soundEngine.playLevelUp();
    const now = new Date();
    const endDate = new Date(now.getTime() + eventDurationHours * 60 * 60 * 1000);

    const payload: Partial<GameEvent> = {
      id: editingEventId || undefined,
      name: eventName,
      description: eventDescription,
      shinyMultiplier: eventShinyMult,
      expMultiplier: eventExpMult,
      moneyMultiplier: eventMoneyMult,
      itemDropMultiplier: 1.5,
      allowRestrictedSpawns,
      allowInAllBiomes,
      targetBiomes: selectedBiomes.length > 0 ? selectedBiomes : undefined,
      boostedSpeciesBiomes: boostedSpeciesBiomes.length > 0 ? boostedSpeciesBiomes : undefined,
      spawnBoosts: boostedSpeciesId ? { [String(boostedSpeciesId)]: boostPercentage } : {},
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      active: eventActiveImmediate,
      createdBy: userCloudProfile.email,
    };

    await saveGameEvent(payload);
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin salvou evento: ${eventName}.`);
    setMessage(`Evento "${eventName}" salvo com sucesso!`);

    // Reset Form
    setEditingEventId(null);
    setEventName('');
    setEventDescription('');
    setBoostedSpeciesBiomes([]);
    setSelectedBiomes([]);
    setAllowInAllBiomes(false);
    loadEvents();
  };

  const handleStartBroadcast = async () => {
    soundEngine.playLevelUp();
    const base =
      (await fetchPokemonData(broadcastSpeciesId)) ||
      STARTERS_AND_POKEMON_DATABASE[broadcastSpeciesId] ||
      STARTERS_AND_POKEMON_DATABASE[25];
    const name = base?.displayName || `Pokémon #${broadcastSpeciesId}`;

    let targetPlayerIds: string[] = [];
    if (broadcastAudience === 'subset' && onlineUsers.length > 0) {
      // Pick random subset of N players from onlineUsers
      const shuffled = [...onlineUsers].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.max(1, Math.min(onlineUsers.length, broadcastTargetCount)));
      targetPlayerIds = selected.map((u) => u.uid);
    }

    await setBroadcastEncounter({
      speciesId: broadcastSpeciesId,
      speciesName: name,
      level: broadcastLevel,
      isShiny: broadcastShiny,
      adminEmail: userCloudProfile.email,
      targetPlayerIds,
      targetCount: targetPlayerIds.length > 0 ? targetPlayerIds.length : undefined,
    });

    const audienceText =
      targetPlayerIds.length > 0
        ? `${targetPlayerIds.length} jogador(es) selecionado(s) online`
        : 'TODOS os jogadores online';

    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin iniciou transmissão global para ${audienceText}: ${name} Nv.${broadcastLevel}.`);
    setMessage(`📡 Transmissão iniciada para ${audienceText}: ${name} Nv.${broadcastLevel}${broadcastShiny ? ' ✨ Shiny' : ''}!`);
  };

  const handleClearBroadcast = async () => {
    soundEngine.playFaint();
    await clearBroadcastEncounter();
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin encerrou a transmissão global.`);
    setMessage('🛑 Transmissão global cancelada com sucesso.');
  };

  const handleToggleEventActive = async (ev: GameEvent) => {
    const updated = { ...ev, active: !ev.active };
    await saveGameEvent(updated);
    soundEngine.playClick();
    loadEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Deseja realmente remover este evento?')) return;
    await deleteGameEvent(id);
    soundEngine.playFaint();
    loadEvents();
  };

  const handleCreateMission = async () => {
    if (!missionTitle.trim()) {
      alert('Informe o título da missão!');
      return;
    }
    soundEngine.playLevelUp();
    const newMission: Partial<GameMission> = {
      title: missionTitle,
      description: missionDesc || 'Complete o objetivo para reivindicar a recompensa!',
      category: missionCategory,
      targetType: missionTargetType,
      targetValue: missionTargetValue || 3,
      rewardType: missionRewardType,
      rewardAmount: missionRewardType !== 'pokemon_encounter' ? missionRewardAmount : undefined,
      rewardItemId: missionRewardType === 'ball' ? missionRewardItemId : undefined,
      rewardPokemonId: missionRewardType === 'pokemon_encounter' ? missionRewardPokemonId : undefined,
      rewardPokemonLevel: missionRewardType === 'pokemon_encounter' ? missionRewardPokemonLevel : undefined,
      active: true,
      createdBy: userCloudProfile.email,
    };

    await saveMission(newMission);
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin criou missão: ${missionTitle}.`);
    setMessage(`Missão "${missionTitle}" publicada com sucesso para todos os jogadores!`);
    setMissionTitle('');
    setMissionDesc('');
  };

  const handleDeleteMission = async (id: string) => {
    if (!confirm('Deseja realmente remover esta missão?')) return;
    await deleteMission(id);
    soundEngine.playFaint();
    setMessage('Missão removida com sucesso.');
  };

  const toggleBiomeSelection = (b: BiomeType) => {
    if (selectedBiomes.includes(b)) {
      setSelectedBiomes(selectedBiomes.filter((x) => x !== b));
    } else {
      setSelectedBiomes([...selectedBiomes, b]);
    }
  };

  // Filter events for scheduled events tab
  const nowIso = new Date().toISOString();
  const filteredEvents = eventsList.filter((e) => {
    if (eventTabFilter === 'active') {
      return e.active && (!e.startDate || e.startDate <= nowIso) && (!e.endDate || e.endDate >= nowIso);
    }
    if (eventTabFilter === 'scheduled') {
      return e.startDate && e.startDate > nowIso;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-3xl rounded-3xl p-5 sm:p-6 relative shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              Painel de Administrador
              <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                Master Admin
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Gerencie recursos, crie eventos e transmita encontros globais para a comunidade.
            </p>
          </div>
        </div>

        {/* Notification Toast */}
        {message && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'resources'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Recursos & Spawns
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" /> Encontro Global
            {onlineUsers.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-400 font-bold border border-slate-700">
                🟢 {onlineUsers.length} online
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Eventos & Agendamentos
          </button>

          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'missions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" /> Missões & Tarefas
          </button>
        </div>

        {/* TAB 1: RESOURCES & SPAWN */}
        {activeTab === 'resources' && (
          <div className="space-y-5">
            {/* Money Injection */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Injetar PokéDólares
              </h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold flex-1"
                />
                <button
                  onClick={handleAddMoney}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Item Injection */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" /> Adicionar Itens à Bolsa
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedItemKey}
                  onChange={(e) => setSelectedItemKey(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {Object.entries(ITEMS_DATABASE).map(([k, item]) => (
                    <option key={k} value={k}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Number(e.target.value))}
                  min={1}
                  max={999}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-sky-400 font-bold"
                />
              </div>
              <button
                onClick={handleAddItem}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
              >
                Adicionar Itens ao Inventário
              </button>
            </div>

            {/* Spawn Any Pokemon (With Universal Search Picker across 1 to 1025) */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" /> Gerar Pokémon
              </h4>

              {/* Universal Search Picker */}
              <PokemonSearchPicker
                selectedId={selectedPokedexId}
                onSelect={(id) => setSelectedPokedexId(id)}
                label="Pesquisar Qualquer Pokémon da Pokédex (1 a 1025) ou Entidades Míticas:"
                allowBosses={true}
              />

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
                    onChange={(e) => setTargetDestination(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="team">Time Atual</option>
                    <option value="box">PC Box</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shiny-check"
                  checked={isShiny}
                  onChange={(e) => setIsShiny(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="shiny-check" className="text-xs font-bold text-amber-300 cursor-pointer">
                  ✨ Gerar como Pokémon Shiny (Variante Rara)
                </label>
              </div>

              <button
                onClick={handleSpawnPokemon}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                Gerar Pokémon e Adicionar
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: GLOBAL BROADCAST ENCOUNTER */}
        {activeTab === 'broadcast' && (
          <div className="space-y-5">
            {/* Online Presence & Target Selection Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Jogadores Conectados no Servidor
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {onlineUsers.length} Online
                </span>
              </div>

              {onlineUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 max-h-24 overflow-y-auto">
                  {onlineUsers.map((u) => (
                    <span
                      key={u.uid}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      🟢 {u.nickname || 'Treinador'}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Nenhum outro jogador detectado recentemente nos últimos segundos.
                </p>
              )}

              {/* Target Audience Toggle */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Destinatários do Encontro Global:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastAudience('all')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      broadcastAudience === 'all'
                        ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>🌍 Todos os Jogadores Online</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Transmite para 100% dos conectados</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastAudience('subset')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      broadcastAudience === 'subset'
                        ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>🎯 Número Específico de Jogadores</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sorteia N jogadores online aleatórios</div>
                  </button>
                </div>

                {broadcastAudience === 'subset' && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300 font-semibold">
                      Quantos jogadores online devem receber?
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, onlineUsers.length)}
                      value={broadcastTargetCount}
                      onChange={(e) => setBroadcastTargetCount(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-rose-400 text-center"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Live Status Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                currentBroadcast && currentBroadcast.active
                  ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-purple-950/80 border-rose-500/50 shadow-xl shadow-rose-950/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Radio
                    className={`w-4 h-4 ${
                      currentBroadcast?.active ? 'text-rose-400 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <span>Status da Transmissão Global</span>
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    currentBroadcast?.active
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {currentBroadcast?.active ? 'AO VIVO • ATIVO NO SERVIDOR' : 'INATIVO'}
                </span>
              </div>

              {currentBroadcast && currentBroadcast.active ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                        currentBroadcast.isShiny ? 'shiny/' : ''
                      }${currentBroadcast.speciesId}.png`}
                      alt={currentBroadcast.speciesName}
                      className="w-16 h-16 object-contain drop-shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
                      }}
                    />
                    <div>
                      <div className="text-base font-black text-white flex items-center gap-2">
                        <span>
                          {currentBroadcast.isShiny
                            ? `✨ ${currentBroadcast.speciesName}`
                            : currentBroadcast.speciesName}
                        </span>
                        <span className="text-xs font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-lg border border-rose-800">
                          Nv. {currentBroadcast.level}
                        </span>
                      </div>
                      <p className="text-xs text-rose-200/90 mt-0.5">
                        Transmitido por <strong className="font-mono text-white">{currentBroadcast.createdBy}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentBroadcast.targetPlayerIds && currentBroadcast.targetPlayerIds.length > 0
                          ? `Transmitido exclusivamente para ${currentBroadcast.targetPlayerIds.length} jogador(es) selecionados!`
                          : 'O próximo encontro selvagem na Grama de todos os jogadores conectados será este!'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClearBroadcast}
                    className="px-4 py-2 bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-rose-600/50 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Cancelar Transmissão
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Nenhum encontro global está ativo no momento. Use o formulário abaixo para forçar o próximo encontro
                  dos jogadores.
                </p>
              )}
            </div>

            {/* Broadcast Form with Universal Picker */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <h4 className="font-bold text-sm text-white">Configurar Novo Encontro Global</h4>
              </div>

              <PokemonSearchPicker
                selectedId={broadcastSpeciesId}
                onSelect={(id) => setBroadcastSpeciesId(id)}
                label="Espécie do Pokémon para Encontro Global (Pesquise qualquer espécie da Pokédex #1 a #1025 ou Míticos):"
                allowBosses={true}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nível do Pokémon (1-100):</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={broadcastLevel}
                    onChange={(e) => setBroadcastLevel(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastShiny}
                      onChange={(e) => setBroadcastShiny(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                    />
                    <span className="text-xs font-bold text-amber-300">✨ Forçar Variante Shiny</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleStartBroadcast}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                Iniciar Transmissão de Encontro Global
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: EVENTS & SCHEDULES */}
        {activeTab === 'events' && (
          <div className="space-y-5">
            {/* Event Form */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                {editingEventId ? 'Editar Evento do Servidor' : 'Criar & Programar Novo Evento'}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nome do Evento:</label>
                  <input
                    type="text"
                    placeholder="Ex: Festival dos Raios de Pikachu"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Descrição & Bônus:</label>
                  <input
                    type="text"
                    placeholder="Ex: Pikachu 3x mais comum, 2x Shiny e dobro de Pokedólares!"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Modifiers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">✨ Shiny Multiplier</label>
                    <select
                      value={eventShinyMult}
                      onChange={(e) => setEventShinyMult(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold"
                    >
                      <option value={1.0}>1x (Padrão)</option>
                      <option value={2.0}>2x Chance</option>
                      <option value={3.0}>3x Chance</option>
                      <option value={5.0}>5x Chance</option>
                    </select>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <label className="block text-[11px] font-bold text-sky-400 mb-1">📈 Bônus EXP</label>
                    <select
                      value={eventExpMult}
                      onChange={(e) => setEventExpMult(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-sky-300 font-bold"
                    >
                      <option value={1.0}>1x (Normal)</option>
                      <option value={1.5}>1.5x (+50%)</option>
                      <option value={2.0}>2x (Dobro)</option>
                      <option value={3.0}>3x (Triplo)</option>
                    </select>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <label className="block text-[11px] font-bold text-emerald-400 mb-1">💰 Bônus Moedas</label>
                    <select
                      value={eventMoneyMult}
                      onChange={(e) => setEventMoneyMult(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-300 font-bold"
                    >
                      <option value={1.0}>1x (Normal)</option>
                      <option value={1.5}>1.5x (+50%)</option>
                      <option value={2.0}>2x (Dobro)</option>
                    </select>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <label className="block text-[11px] font-bold text-indigo-400 mb-1">⏱ Duração (Horas)</label>
                    <select
                      value={eventDurationHours}
                      onChange={(e) => setEventDurationHours(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-bold"
                    >
                      <option value={2}>2 Horas</option>
                      <option value={6}>6 Horas</option>
                      <option value={12}>12 Horas</option>
                      <option value={24}>24 Horas (1 dia)</option>
                      <option value={72}>72 Horas (3 dias)</option>
                      <option value={168}>168 Horas (1 sem)</option>
                    </select>
                  </div>
                </div>

                {/* Species Boost with Universal Picker & All Biomes Option */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Aumento de Aparição de Espécie Específica:
                  </span>

                  <PokemonSearchPicker
                    selectedId={boostedSpeciesId}
                    onSelect={(id) => setBoostedSpeciesId(id)}
                    label="Espécie Alvo em Destaque (Pesquise qualquer espécie da Pokédex #1 a #1025):"
                    allowBosses={false}
                  />

                  {/* Allow in ALL Biomes Checkbox */}
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 cursor-pointer transition-all hover:bg-purple-900/30">
                    <input
                      type="checkbox"
                      checked={allowInAllBiomes}
                      onChange={(e) => setAllowInAllBiomes(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-purple-200">
                        🌍 Permitir espécie em QUALQUER bioma (inclusive oceanos, cavernas e vulcões)
                      </span>
                      <p className="text-[10px] text-purple-300/70">
                        Se ativado, o Pokémon aparecerá em todos os cenários sem restrições de habitat.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleCreateOrUpdateEvent}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingEventId ? 'Atualizar Evento' : 'Publicar Evento no Servidor'}
                </button>
              </div>
            </div>

            {/* Events Sub-Tabs: All, Active, Scheduled */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Eventos Cadastrados no Servidor ({filteredEvents.length})
              </h4>

              <div className="flex gap-1">
                {(['all', 'active', 'scheduled'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setEventTabFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      eventTabFilter === tab
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tab === 'all' ? 'Todos' : tab === 'active' ? '🟢 Ao Vivo' : '📅 Agendados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Events List */}
            {filteredEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                Nenhum evento nesta categoria.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEvents.map((ev) => {
                  const now = new Date().toISOString();
                  const isRunning = ev.active && (!ev.endDate || now <= ev.endDate);
                  const isScheduled = ev.startDate && ev.startDate > now;

                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-2xl border transition-all bg-slate-950 flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                        isRunning
                          ? 'border-emerald-500/50 shadow-md shadow-emerald-950/30'
                          : isScheduled
                          ? 'border-purple-500/50'
                          : 'border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              isRunning
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isScheduled
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isRunning ? '🟢 AO VIVO' : isScheduled ? '📅 AGENDADO' : '⚪ PAUSADO / ENCERRADO'}
                          </span>
                          <h5 className="font-bold text-sm text-white">{ev.name}</h5>
                        </div>

                        <p className="text-xs text-slate-400">{ev.description}</p>

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-slate-400 pt-1">
                          {ev.shinyMultiplier > 1 && (
                            <span className="text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                              ✨ {ev.shinyMultiplier}x Shiny
                            </span>
                          )}
                          {ev.expMultiplier > 1 && (
                            <span className="text-sky-400 font-bold bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
                              📈 {ev.expMultiplier}x EXP
                            </span>
                          )}
                          {ev.allowInAllBiomes && (
                            <span className="text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                              🌍 Qualquer Bioma
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleEventActive(ev)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                            ev.active
                              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                          title={ev.active ? 'Pausar Evento' : 'Ativar Evento'}
                        >
                          {ev.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl border border-red-800/50 transition-colors"
                          title="Excluir Evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MISSIONS MANAGEMENT */}
        {activeTab === 'missions' && (
          <div className="space-y-5">
            {/* Create Mission Form */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">Criar Nova Missão para a Comunidade</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Título da Missão:</label>
                  <input
                    type="text"
                    placeholder="Ex: Mestre das Batalhas"
                    value={missionTitle}
                    onChange={(e) => setMissionTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Descrição do Desafio:</label>
                  <input
                    type="text"
                    placeholder="Ex: Vença 5 batalhas contra Pokémon selvagens."
                    value={missionDesc}
                    onChange={(e) => setMissionDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Objetivo:</label>
                    <select
                      value={missionTargetType}
                      onChange={(e) => setMissionTargetType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="win_battles">Vencer Batalhas</option>
                      <option value="catch_pokemon">Capturar Pokémon</option>
                      <option value="super_effective">Ataques Super Efetivos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Meta Numérica:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={missionTargetValue}
                      onChange={(e) => setMissionTargetValue(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Reward Configuration */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-amber-400">
                    🎁 Configuração da Recompensa:
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Tipo de Recompensa:</label>
                      <select
                        value={missionRewardType}
                        onChange={(e) => setMissionRewardType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="battle_pass_xp">⚡ XP do Passe de Batalha</option>
                        <option value="ball">⚾ Pokébolas</option>
                        <option value="money">💰 PokéDólares</option>
                        <option value="pokemon_encounter">🐾 Encontro com Pokémon</option>
                      </select>
                    </div>

                    {missionRewardType === 'battle_pass_xp' && (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Quantidade de XP:</label>
                        <input
                          type="number"
                          value={missionRewardAmount}
                          onChange={(e) => setMissionRewardAmount(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-yellow-400 font-bold"
                        />
                      </div>
                    )}

                    {missionRewardType === 'money' && (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Valor em $:</label>
                        <input
                          type="number"
                          value={missionRewardAmount}
                          onChange={(e) => setMissionRewardAmount(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold"
                        />
                      </div>
                    )}

                    {missionRewardType === 'ball' && (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Tipo de Pokébola:</label>
                        <select
                          value={missionRewardItemId}
                          onChange={(e) => setMissionRewardItemId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="poke_ball">Poké Bola</option>
                          <option value="great_ball">Great Bola</option>
                          <option value="ultra_ball">Ultra Bola</option>
                          <option value="master_ball">Master Bola</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {missionRewardType === 'pokemon_encounter' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <PokemonSearchPicker
                        selectedId={missionRewardPokemonId}
                        onSelect={(id) => setMissionRewardPokemonId(id)}
                        label="Pokémon da Recompensa (Pesquise qualquer espécie da Pokédex #1 a #1025):"
                        allowBosses={true}
                      />
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nível do Pokémon:</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={missionRewardPokemonLevel}
                          onChange={(e) => setMissionRewardPokemonLevel(Number(e.target.value))}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-purple-300 font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateMission}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Publicar Missão para Todos os Jogadores
                </button>
              </div>
            </div>

            {/* Existing Missions List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Missões Ativas no Banco ({missionsList.length})
              </h4>

              {missionsList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                  Nenhuma missão personalizada salva no Firestore. As missões padrão do sistema serão exibidas aos jogadores.
                </div>
              ) : (
                <div className="space-y-2">
                  {missionsList.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h5 className="font-bold text-sm text-white">{m.title}</h5>
                        <p className="text-xs text-slate-400">{m.description}</p>
                        <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                          Meta: {m.targetValue} ({m.targetType}) • Recompensa: {m.rewardType}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMission(m.id)}
                        className="p-2 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors"
                        title="Excluir Missão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
