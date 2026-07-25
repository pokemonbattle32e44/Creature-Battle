import React, { useState, useEffect } from 'react';
import {
  Users,
  Gift,
  Search,
  UserPlus,
  Check,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  Award,
  Heart,
  Package,
  DollarSign,
} from 'lucide-react';
import {
  UserCloudData,
  searchUserByNicknameOrUid,
  sendFriendRequest,
  subscribeFriendRequests,
  respondFriendRequest,
  subscribeFriendsList,
  fetchUserFromCloud,
  sendGiftToUser,
  subscribeIncomingGifts,
  acceptGift,
  syncUserToCloud,
  GiftData,
} from '../utils/firebase';
import { PokemonInstance } from '../types/pokemon';
import { ITEMS_DATABASE } from '../data/itemsData';
import { soundEngine } from '../utils/soundEngine';

interface FriendsAndGiftsModalProps {
  userCloudProfile: UserCloudData;
  onUpdateProfile: (profile: UserCloudData) => void;
  onClose: () => void;
}

export const FriendsAndGiftsModal: React.FC<FriendsAndGiftsModalProps> = ({
  userCloudProfile,
  onUpdateProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'gifts'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCloudData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<UserCloudData[]>([]);
  const [incomingGifts, setIncomingGifts] = useState<GiftData[]>([]);

  // Gift Modal state
  const [selectedFriendForGift, setSelectedFriendForGift] = useState<UserCloudData | null>(null);
  const [giftType, setGiftType] = useState<'pokemon' | 'item' | 'money'>('pokemon');
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonInstance | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [giftMoney, setGiftMoney] = useState<number>(1000);
  const [showGiftConfirm, setShowGiftConfirm] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);

  // Subscribe to requests, friends, and gifts
  useEffect(() => {
    const unsubReqs = subscribeFriendRequests(userCloudProfile.uid, (reqs) => {
      setPendingRequests(reqs);
    });

    const unsubGifts = subscribeIncomingGifts(userCloudProfile.uid, (gifts) => {
      setIncomingGifts(gifts);
    });

    const unsubFriends = subscribeFriendsList(userCloudProfile.uid, async (friendUids) => {
      const list: UserCloudData[] = [];
      for (const fUid of friendUids) {
        const profile = await fetchUserFromCloud(fUid);
        if (profile) list.push(profile);
      }
      setFriendsList(list);
    });

    return () => {
      unsubReqs();
      unsubGifts();
      unsubFriends();
    };
  }, [userCloudProfile.uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    soundEngine.playClick();
    const results = await searchUserByNicknameOrUid(searchQuery.trim());
    setSearchResults(results.filter((u) => u.uid !== userCloudProfile.uid));
    setIsSearching(false);
  };

  const handleAddFriend = async (targetUser: UserCloudData) => {
    soundEngine.playClick();
    await sendFriendRequest(userCloudProfile, targetUser.uid);
    setGiftMessage(`Solicitação de amizade enviada para ${targetUser.nickname}!`);
  };

  const handleRespondRequest = async (req: any, accept: boolean) => {
    soundEngine.playClick();
    await respondFriendRequest(req.id, req.fromUid, userCloudProfile.uid, accept);
  };

  const handleAcceptGift = async (gift: GiftData) => {
    soundEngine.playCatchSuccess();
    const updated = await acceptGift(gift, userCloudProfile);
    onUpdateProfile(updated);
    setGiftMessage('Presente aceito e adicionado à sua conta!');
  };

  const handleSendGiftSubmit = async () => {
    if (!selectedFriendForGift) return;
    soundEngine.playCatchSuccess();

    let payloadGift: GiftData = {
      fromUid: userCloudProfile.uid,
      fromNickname: userCloudProfile.nickname,
      toUid: selectedFriendForGift.uid,
      type: giftType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updatedProfile = { ...userCloudProfile };

    if (giftType === 'pokemon') {
      if (!selectedPokemon) return;
      payloadGift.pokemon = selectedPokemon;
      // Remove from team or box
      updatedProfile.team = updatedProfile.team.filter((p) => p.id !== selectedPokemon.id);
      updatedProfile.pcBox = updatedProfile.pcBox.filter((p) => p.id !== selectedPokemon.id);
    } else if (giftType === 'item') {
      if (!selectedItemKey || !updatedProfile.inventory[selectedItemKey]) return;
      payloadGift.itemKey = selectedItemKey;
      payloadGift.itemQty = itemQty;
      updatedProfile.inventory[selectedItemKey] -= itemQty;
      if (updatedProfile.inventory[selectedItemKey] <= 0) {
        delete updatedProfile.inventory[selectedItemKey];
      }
    } else if (giftType === 'money') {
      if (updatedProfile.money < giftMoney) return;
      payloadGift.amount = giftMoney;
      updatedProfile.money -= giftMoney;
    }

    await sendGiftToUser(payloadGift);
    await syncUserToCloud(updatedProfile);
    onUpdateProfile(updatedProfile);

    setShowGiftConfirm(false);
    setSelectedFriendForGift(null);
    setGiftMessage(`Presente enviado com sucesso para ${selectedFriendForGift.nickname}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 relative shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              Social & Presentes
            </h3>
            <p className="text-xs text-slate-400">Conecte-se com amigos e troque presentes em tempo real</p>
          </div>
        </div>

        {giftMessage && (
          <div className="p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-2xl text-xs text-indigo-300 font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {giftMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('friends');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'friends' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Amigos ({friendsList.length})
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('requests');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${
              activeTab === 'requests' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Solicitações
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('gifts');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${
              activeTab === 'gifts' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-400" /> Presentes
            {incomingGifts.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce">
                {incomingGifts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'friends' && (
            <div className="space-y-6">
              {/* Search Friends */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar jogador por Nickname..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" /> Buscar
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">Resultados da Busca</h4>
                  {searchResults.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt={user.nickname} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-xs font-bold text-white">{user.nickname}</p>
                          <p className="text-[10px] text-slate-400">Liga: {user.league || 'Ouro'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(user)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lista de Amigos
                </h4>
                {friendsList.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-slate-500 text-xs">
                    Nenhum amigo adicionado ainda. Busque jogadores acima!
                  </div>
                ) : (
                  friendsList.map((friend) => (
                    <div
                      key={friend.uid}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img src={friend.avatar} alt={friend.nickname} className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800" />
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            {friend.nickname}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold border border-slate-700">
                              {friend.league || 'Ouro'}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400">ELO: {friend.elo || 1000} | Vitórias: {friend.wins || 0}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedFriendForGift(friend);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <Gift className="w-4 h-4" /> Enviar Presente
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Solicitações de Amizade Pendentes
              </h4>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-slate-500 text-xs">
                  Nenhuma solicitação pendente.
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={req.fromAvatar} alt={req.fromNickname} className="w-10 h-10 rounded-2xl bg-slate-900" />
                      <div>
                        <p className="text-sm font-bold text-white">{req.fromNickname}</p>
                        <p className="text-[10px] text-slate-400">Quer ser seu amigo no jogo!</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondRequest(req, true)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Aceitar
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req, false)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold text-xs flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Recusar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'gifts' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Caixa de Entrada de Presentes
              </h4>
              {incomingGifts.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-slate-500 text-xs">
                  Nenhum presente recebido ainda.
                </div>
              ) : (
                incomingGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-300">
                          De: {gift.fromNickname}
                        </p>
                        {gift.type === 'pokemon' && gift.pokemon && (
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{gift.pokemon.displayName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Nv.{gift.pokemon.level}</span>
                            {gift.pokemon.isShiny && <span className="text-amber-400 text-xs">✨ Shiny</span>}
                          </p>
                        )}
                        {gift.type === 'item' && gift.itemKey && (
                          <p className="text-sm font-bold text-white">
                            {gift.itemQty}x {ITEMS_DATABASE[gift.itemKey]?.name || gift.itemKey}
                          </p>
                        )}
                        {gift.type === 'money' && gift.amount && (
                          <p className="text-sm font-bold text-emerald-400">
                            +${gift.amount.toLocaleString()} Pokedólares
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptGift(gift)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Aceitar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Gift Sending Modal */}
        {selectedFriendForGift && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md rounded-3xl p-6 relative shadow-2xl text-slate-100">
              <button
                onClick={() => setSelectedFriendForGift(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-6 h-6 text-amber-400" />
                <h4 className="text-lg font-black text-white">
                  Presentear {selectedFriendForGift.nickname}
                </h4>
              </div>

              <div className="space-y-4">
                {/* Gift Type */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setGiftType('pokemon')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      giftType === 'pokemon' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Pokémon
                  </button>
                  <button
                    onClick={() => setGiftType('item')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      giftType === 'item' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Item
                  </button>
                  <button
                    onClick={() => setGiftType('money')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      giftType === 'money' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Dinheiro
                  </button>
                </div>

                {giftType === 'pokemon' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Escolha o Pokémon (do seu Time ou Box):
                    </label>
                    <select
                      onChange={(e) => {
                        const allPkmn = [...userCloudProfile.team, ...userCloudProfile.pcBox];
                        const found = allPkmn.find((p) => p.id === e.target.value);
                        setSelectedPokemon(found || null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="">-- Selecione um Pokémon --</option>
                      {[...userCloudProfile.team, ...userCloudProfile.pcBox].map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} (Nv.{p.level}) {p.isShiny ? '✨' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {giftType === 'item' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Escolha o Item:
                    </label>
                    <select
                      value={selectedItemKey}
                      onChange={(e) => setSelectedItemKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="">-- Selecione um Item --</option>
                      {Object.entries(userCloudProfile.inventory).map(([key, qty]) => (
                        <option key={key} value={key}>
                          {ITEMS_DATABASE[key]?.name || key} (Possui: {qty})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {giftType === 'money' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                      Quantia de Pokedólares (Disponível: ${userCloudProfile.money.toLocaleString()}):
                    </label>
                    <input
                      type="number"
                      value={giftMoney}
                      onChange={(e) => setGiftMoney(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-bold"
                    />
                  </div>
                )}

                {showGiftConfirm ? (
                  <div className="bg-amber-950/80 border border-amber-500/50 p-4 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-amber-300">
                      ⚠️ Tem certeza que deseja transferir este presente para {selectedFriendForGift.nickname}? A ação é irreversível!
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSendGiftSubmit}
                        className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                      >
                        Sim, Confirmar Envio
                      </button>
                      <button
                        onClick={() => setShowGiftConfirm(false)}
                        className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGiftConfirm(true)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                  >
                    Continuar Envio
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
