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
} from 'lucide-react';
import { STARTERS_AND_POKEMON_DATABASE } from '../data/startersAndPokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { createPokemonInstance } from '../utils/pokemonCalc';
import { PokemonInstance, GameEvent, BiomeType, BroadcastEncounter } from '../types/pokemon';
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
} from '../utils/firebase';
import { soundEngine } from '../utils/soundEngine';
import { BIOMES, BIOME_ROTATION_ORDER } from '../data/environments';
import { NATIONAL_POKEDEX_INDEX } from '../data/nationalPokedex';

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
  const [activeTab, setActiveTab] = useState<'resources' | 'events' | 'broadcast'>('resources');
  const [moneyAmount, setMoneyAmount] = useState('50000');
  const [selectedPokedexId, setSelectedPokedexId] = useState<number>(666); // Default to GHOST
  const [level, setLevel] = useState<number>(100);
  const [isShiny, setIsShiny] = useState<boolean>(true);
  const [targetDestination, setTargetDestination] = useState<'team' | 'box'>('team');
  const [selectedItemKey, setSelectedItemKey] = useState<string>('master_ball');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [message, setMessage] = useState<string | null>(null);

  // Events State
  const [eventsList, setEventsList] = useState<GameEvent[]>([]);
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
  const [eventActiveImmediate, setEventActiveImmediate] = useState(true);

  // Global Broadcast Next Wild Encounter State
  const [broadcastSpeciesId, setBroadcastSpeciesId] = useState<number>(25);
  const [broadcastLevel, setBroadcastLevel] = useState<number>(50);
  const [broadcastShiny, setBroadcastShiny] = useState<boolean>(true);
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastEncounter | null>(null);

  useEffect(() => {
    loadEvents();
    const unsub = subscribeToBroadcastEncounter((bc) => {
      setCurrentBroadcast(bc);
    });
    return () => unsub();
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
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin gerou Pokémon ${newPkmn.displayName} Nv.${level}.`);
    onUpdateProfile(updated);
    setMessage(`⚡ ${newPkmn.displayName} Nível ${level} ${isShiny ? '✨ (Shiny)' : ''} gerado com sucesso!`);
  };

  const handleCreateOrUpdateEvent = async () => {
    if (!eventName.trim()) {
      alert('Por favor informe um nome para o evento.');
      return;
    }

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + eventDurationHours * 3600 * 1000).toISOString();

    const newEvent: Partial<GameEvent> = {
      id: editingEventId || `event_${Date.now()}`,
      name: eventName.trim(),
      description: eventDescription.trim() || `Evento especial da Arena com bônus ativos!`,
      startDate,
      endDate,
      active: eventActiveImmediate,
      shinyMultiplier: eventShinyMult,
      expMultiplier: eventExpMult,
      moneyMultiplier: eventMoneyMult,
      itemDropMultiplier: 1.5,
      spawnBoosts: {
        [String(boostedSpeciesId)]: boostPercentage,
      },
      targetBiomes: selectedBiomes.length > 0 ? selectedBiomes : undefined,
      boostedSpeciesBiomes: boostedSpeciesBiomes.length > 0 ? boostedSpeciesBiomes : undefined,
      allowRestrictedSpawns,
      createdBy: userCloudProfile.email,
    };

    await saveGameEvent(newEvent);
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin salvou evento: ${newEvent.name}`);
    soundEngine.playLevelUp();
    setMessage(`Evento "${newEvent.name}" configurado e propagado no servidor com sucesso!`);

    // Reset form
    setEditingEventId(null);
    setEventName('');
    setEventDescription('');
    setBoostedSpeciesBiomes([]);
    setSelectedBiomes([]);
    loadEvents();
  };

  const handleStartBroadcast = async () => {
    soundEngine.playLevelUp();
    const base = STARTERS_AND_POKEMON_DATABASE[broadcastSpeciesId] || STARTERS_AND_POKEMON_DATABASE[25];
    const name = base?.displayName || `Pokémon #${broadcastSpeciesId}`;
    await setBroadcastEncounter({
      speciesId: broadcastSpeciesId,
      speciesName: name,
      level: broadcastLevel,
      isShiny: broadcastShiny,
      adminEmail: userCloudProfile.email,
    });
    await addSystemLog('admin_action', [userCloudProfile.uid], `Admin iniciou transmissão global: ${name} Nv.${broadcastLevel}.`);
    setMessage(`📡 Transmissão iniciada! O próximo encontro na Grama de todos os jogadores online será ${name} Nv.${broadcastLevel}${broadcastShiny ? ' ✨ Shiny' : ''}!`);
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

  const toggleBiomeSelection = (b: BiomeType) => {
    if (selectedBiomes.includes(b)) {
      setSelectedBiomes(selectedBiomes.filter((x) => x !== b));
    } else {
      setSelectedBiomes([...selectedBiomes, b]);
    }
  };

  const pokemonKeys = Object.keys(STARTERS_AND_POKEMON_DATABASE).map(Number);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-2xl rounded-3xl p-5 sm:p-6 relative shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7 text-slate-950" />
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
              Painel de Administrador
            </h3>
            <p className="text-xs text-slate-400">
              Autorizado: <span className="font-mono text-amber-300">{userCloudProfile.email}</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-5">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'resources'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Recursos
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Eventos
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'broadcast'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" /> Encontro Global
          </button>
        </div>

        {message && (
          <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-2xl text-xs text-amber-300 font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* TAB 1: RESOURCES & SPAWNS */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {/* Section 1: Money */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                >
                  Adicionar $
                </button>
              </div>
            </div>

            {/* Section 2: Items */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" /> Adicionar Itens / Mega Stones / Tera Orb
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedItemKey}
                  onChange={(e) => setSelectedItemKey(e.target.value)}
                  className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {Object.entries(ITEMS_DATABASE).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.name} ({item.category})
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

            {/* Section 3: Spawn Special/Any Pokemon */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" /> Gerar Pokémon
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
                <button
                  onClick={() => setSelectedPokedexId(6)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                >
                  🔥 Charizard (#6)
                </button>
                <button
                  onClick={() => setSelectedPokedexId(150)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                >
                  🔮 Mewtwo (#150)
                </button>
                <button
                  onClick={() => setSelectedPokedexId(448)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                >
                  🐺 Lucario (#448)
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
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-95"
              >
                ⚡ GERAR POKÉMON AGORA
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS MANAGER */}
        {activeTab === 'events' && (
          <div className="space-y-5">
            {/* Create Event Card */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-purple-500/30 space-y-4">
              <h4 className="text-sm font-black text-purple-300 uppercase tracking-wide flex items-center gap-2">
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

                {/* Species Boost */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Aumento de Aparição de Espécie Específica:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Espécie Alvo:</label>
                      <select
                        value={boostedSpeciesId}
                        onChange={(e) => setBoostedSpeciesId(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {pokemonKeys.map((id) => (
                          <option key={id} value={id}>
                            #{id} - {STARTERS_AND_POKEMON_DATABASE[id]?.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Aumento de Chance (%):</label>
                      <select
                        value={boostPercentage}
                        onChange={(e) => setBoostPercentage(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value={50}>+50% (1.5x peso relativo)</option>
                        <option value={100}>+100% (2x peso relativo)</option>
                        <option value={200}>+200% (3x peso relativo - Exemplo do Briefing!)</option>
                        <option value={400}>+400% (5x peso relativo)</option>
                        <option value={900}>+900% (10x peso relativo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Area / Biome where this species boost specifically takes place */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-purple-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-400" /> Área / Bioma de Aparição desta Espécie:
                      </label>
                      <button
                        type="button"
                        onClick={() => setBoostedSpeciesBiomes([])}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        {boostedSpeciesBiomes.length === 0 ? '✓ Todas as Áreas' : 'Limpar (Todas)'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2">
                      Selecione os cenários onde este Pokémon aparecerá com a taxa aumentada (se vazio, aparece em todos):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {BIOME_ROTATION_ORDER.map((bId) => {
                        const biome = BIOMES[bId];
                        const isSel = boostedSpeciesBiomes.includes(bId);
                        return (
                          <button
                            key={`sp_biome_${bId}`}
                            type="button"
                            onClick={() => {
                              if (boostedSpeciesBiomes.includes(bId)) {
                                setBoostedSpeciesBiomes(boostedSpeciesBiomes.filter((x) => x !== bId));
                              } else {
                                setBoostedSpeciesBiomes([...boostedSpeciesBiomes, bId]);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                              isSel
                                ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {biome.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Biome Filter Selection */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" /> Ambientes Afetados:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBiomes([])}
                      className="text-[11px] text-teal-400 hover:underline"
                    >
                      {selectedBiomes.length === 0 ? '✓ Todos os Ambientes' : 'Limpar (Todos)'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {BIOME_ROTATION_ORDER.map((bId) => {
                      const biome = BIOMES[bId];
                      const isSel = selectedBiomes.includes(bId);
                      return (
                        <button
                          key={bId}
                          type="button"
                          onClick={() => toggleBiomeSelection(bId)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            isSel
                              ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {biome.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legendary Spawn & Active Toggles */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 flex-1">
                    <input
                      type="checkbox"
                      checked={allowRestrictedSpawns}
                      onChange={(e) => setAllowRestrictedSpawns(e.target.checked)}
                      className="w-4 h-4 accent-purple-500 rounded"
                    />
                    <span className="text-xs font-bold text-purple-300">
                      👑 Permitir Lendários e Míticos Selvagens
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 flex-1">
                    <input
                      type="checkbox"
                      checked={eventActiveImmediate}
                      onChange={(e) => setEventActiveImmediate(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="text-xs font-bold text-emerald-300">
                      🟢 Iniciar Imediatamente
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleCreateOrUpdateEvent}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95"
                >
                  {editingEventId ? '✓ ATUALIZAR EVENTO' : '🚀 PUBLICAR & SALVAR EVENTO'}
                </button>
              </div>
            </div>

            {/* Existing Events List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Histórico de Eventos do Servidor ({eventsList.length})</span>
                {isLoadingEvents && <span className="text-[10px] text-purple-400 animate-pulse">Carregando...</span>}
              </h4>

              {eventsList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                  Nenhum evento registrado ainda. Crie o primeiro evento acima!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {eventsList.map((ev) => {
                    const now = new Date().toISOString();
                    const isRunning = ev.active && (!ev.endDate || now <= ev.endDate);

                    return (
                      <div
                        key={ev.id}
                        className={`p-3.5 rounded-2xl border transition-all bg-slate-950 flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                          isRunning
                            ? 'border-emerald-500/50 shadow-md shadow-emerald-950/30'
                            : 'border-slate-800 opacity-70'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isRunning
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isRunning ? '🟢 AO VIVO' : '⚪ PAUSADO / EXPIRADO'}
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
                            {ev.moneyMultiplier > 1 && (
                              <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                💰 {ev.moneyMultiplier}x $
                              </span>
                            )}
                            {ev.allowRestrictedSpawns && (
                              <span className="text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                                👑 Lendários
                              </span>
                            )}
                            {ev.spawnBoosts && Object.keys(ev.spawnBoosts).length > 0 && (
                              <span className="text-pink-400 font-bold bg-pink-950/40 px-1.5 py-0.5 rounded border border-pink-800/40">
                                🎯 +Spawn #{Object.keys(ev.spawnBoosts)[0]} {ev.boostedSpeciesBiomes && ev.boostedSpeciesBiomes.length > 0 ? `(${ev.boostedSpeciesBiomes.length} biomas)` : '(Todos biomas)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Event Action Controls */}
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
                            onClick={() => {
                              setEditingEventId(ev.id);
                              setEventName(ev.name);
                              setEventDescription(ev.description);
                              setEventShinyMult(ev.shinyMultiplier || 1);
                              setEventExpMult(ev.expMultiplier || 1);
                              setEventMoneyMult(ev.moneyMultiplier || 1);
                              setAllowRestrictedSpawns(!!ev.allowRestrictedSpawns);
                              setSelectedBiomes(ev.targetBiomes || []);
                              setBoostedSpeciesBiomes(ev.boostedSpeciesBiomes || []);
                              if (ev.spawnBoosts && Object.keys(ev.spawnBoosts).length > 0) {
                                const firstKey = Object.keys(ev.spawnBoosts)[0];
                                setBoostedSpeciesId(Number(firstKey) || 25);
                                setBoostPercentage(ev.spawnBoosts[firstKey] || 200);
                              }
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                            title="Editar Evento"
                          >
                            <Edit className="w-4 h-4" />
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
          </div>
        )}

        {/* Global Broadcast Next Wild Encounter Tab */}
        {activeTab === 'broadcast' && (
          <div className="space-y-5">
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
                        O próximo Pokémon selvagem na Grama de <strong>todos os jogadores conectados</strong> será este!
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
                  de todos os jogadores online.
                </p>
              )}
            </div>

            {/* Broadcast Form */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <h4 className="font-bold text-sm text-white">Configurar Novo Encontro Global</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Espécie do Pokémon:</label>
                  <select
                    value={broadcastSpeciesId}
                    onChange={(e) => setBroadcastSpeciesId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {pokemonKeys.map((id) => (
                      <option key={id} value={id}>
                        #{id} - {STARTERS_AND_POKEMON_DATABASE[id]?.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nível do Pokémon (1-100):</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={broadcastLevel}
                    onChange={(e) =>
                      setBroadcastLevel(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={broadcastShiny}
                    onChange={(e) => setBroadcastShiny(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>✨ Garantir Forma Shiny para Todos</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {broadcastShiny ? 'Aparecerá com brilho e cores raras' : 'Aparência comum da espécie'}
                </span>
              </div>

              <button
                onClick={handleStartBroadcast}
                className="w-full py-3 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-950/50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                <span>📡 Transmitir Encontro para Todos os Jogadores Online</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
