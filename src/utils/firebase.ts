import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  setLogLevel,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { PokemonInstance, GameEvent, BroadcastEncounter, GameMission } from '../types/pokemon';

// Initialize Firebase
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  firebaseConfigJson.firestoreDatabaseId || '(default)'
);
setLogLevel('error');

export function sanitizeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export const ADMIN_EMAILS = ['abacate2035@gmail.com', 'canalcondominio7@gmail.com'];

export function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export interface UserCloudData {
  uid: string;
  email: string;
  nickname: string;
  avatar: string;
  money: number;
  isAdmin: boolean;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  team: PokemonInstance[];
  pcBox: PokemonInstance[];
  inventory: Record<string, number>;
  pokedexCaught: number[];
  pokedexSeen: number[];
  pokedexCount?: number;
  favoritePokemonId?: number;
  battlePassXp?: number;
  claimedBattlePassTiers?: number[];
  missionProgress?: Record<string, { current: number; completed: boolean; claimed: boolean }>;
  createdAt: string;
  lastLogin: string;
}

// User Profile Functions
export async function syncUserToCloud(userProfile: UserCloudData): Promise<void> {
  if (!userProfile.uid) return;
  const userRef = doc(db, 'users', userProfile.uid);
  const rawData = {
    ...userProfile,
    isAdmin: checkIsAdmin(userProfile.email),
    lastLogin: new Date().toISOString(),
  };
  const dataToSave = sanitizeData(rawData);
  await setDoc(userRef, dataToSave, { merge: true });
}

export async function fetchUserFromCloud(uid: string): Promise<UserCloudData | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserCloudData;
  }
  return null;
}

export const getUserCloudData = fetchUserFromCloud;

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Search users
export async function searchUserByNicknameOrUid(searchQuery: string): Promise<UserCloudData[]> {
  if (!searchQuery.trim()) return [];
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('nickname', '>=', searchQuery),
    where('nickname', '<=', searchQuery + '\uf8ff'),
    limit(10)
  );
  const snap = await getDocs(q);
  const results: UserCloudData[] = [];
  snap.forEach((d) => {
    results.push(d.data() as UserCloudData);
  });
  return results;
}

// Top Players / Leaderboard
export async function getTopRankedPlayers(limitNum = 20): Promise<UserCloudData[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('elo', 'desc'), limit(limitNum));
  const snap = await getDocs(q);
  const players: UserCloudData[] = [];
  snap.forEach((d) => {
    players.push(d.data() as UserCloudData);
  });
  return players;
}

// Friend Requests
export async function sendFriendRequest(fromUser: UserCloudData, toUid: string): Promise<void> {
  const reqRef = collection(db, 'friendRequests');
  await addDoc(reqRef, {
    fromUid: fromUser.uid,
    fromNickname: fromUser.nickname,
    fromAvatar: fromUser.avatar,
    toUid,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export function subscribeFriendRequests(uid: string, callback: (reqs: any[]) => void) {
  const reqRef = collection(db, 'friendRequests');
  const q = query(reqRef, where('toUid', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => {
    const reqs: any[] = [];
    snap.forEach((d) => reqs.push({ id: d.id, ...d.data() }));
    callback(reqs);
  }, (err) => {
    console.warn('Friend requests snapshot error:', err);
  });
}

export async function respondFriendRequest(requestId: string, fromUid: string, toUid: string, accept: boolean): Promise<void> {
  const reqRef = doc(db, 'friendRequests', requestId);
  if (accept) {
    await updateDoc(reqRef, { status: 'accepted' });
    // Add to friends collection
    await addDoc(collection(db, 'friends'), {
      userA: fromUid,
      userB: toUid,
      createdAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(reqRef, { status: 'declined' });
  }
}

export function subscribeFriendsList(uid: string, callback: (friendUids: string[]) => void) {
  const friendsRef = collection(db, 'friends');
  const q1 = query(friendsRef, where('userA', '==', uid));
  const q2 = query(friendsRef, where('userB', '==', uid));

  const friendUids = new Set<string>();

  const unsub1 = onSnapshot(q1, (snap) => {
    snap.forEach((d) => {
      const data = d.data();
      friendUids.add(data.userB);
    });
    callback(Array.from(friendUids));
  }, (err) => console.warn('Friends list snapshot error 1:', err));

  const unsub2 = onSnapshot(q2, (snap) => {
    snap.forEach((d) => {
      const data = d.data();
      friendUids.add(data.userA);
    });
    callback(Array.from(friendUids));
  }, (err) => console.warn('Friends list snapshot error 2:', err));

  return () => {
    unsub1();
    unsub2();
  };
}

// Gifts System
export interface GiftData {
  id?: string;
  fromUid: string;
  fromNickname: string;
  toUid: string;
  type: 'pokemon' | 'item' | 'money';
  pokemon?: PokemonInstance;
  itemKey?: string;
  itemQty?: number;
  amount?: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export async function sendGiftToUser(gift: GiftData): Promise<void> {
  const giftRef = collection(db, 'gifts');
  const payload = sanitizeData({
    ...gift,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  await addDoc(giftRef, payload);
  await addSystemLog('gift', [gift.fromUid, gift.toUid], `${gift.fromNickname} enviou um presente (${gift.type}) para o amigo.`);
}

export function subscribeIncomingGifts(uid: string, callback: (gifts: GiftData[]) => void) {
  const giftsRef = collection(db, 'gifts');
  const q = query(giftsRef, where('toUid', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => {
    const list: GiftData[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as GiftData) }));
    callback(list);
  }, (err) => console.warn('Incoming gifts snapshot error:', err));
}

export async function acceptGift(gift: GiftData, recipientProfile: UserCloudData): Promise<UserCloudData> {
  if (!gift.id) return recipientProfile;
  const giftRef = doc(db, 'gifts', gift.id);
  await updateDoc(giftRef, { status: 'accepted' });

  const updated = { ...recipientProfile };
  if (gift.type === 'pokemon' && gift.pokemon) {
    updated.pcBox = [...updated.pcBox, gift.pokemon];
    if (!updated.pokedexCaught.includes(gift.pokemon.pokedexId)) {
      updated.pokedexCaught = [...updated.pokedexCaught, gift.pokemon.pokedexId];
    }
  } else if (gift.type === 'item' && gift.itemKey && gift.itemQty) {
    updated.inventory = {
      ...updated.inventory,
      [gift.itemKey]: (updated.inventory[gift.itemKey] || 0) + gift.itemQty,
    };
  } else if (gift.type === 'money' && gift.amount) {
    updated.money += gift.amount;
  }

  await syncUserToCloud(updated);
  return updated;
}

// System Logs
export async function addSystemLog(type: string, participants: string[], detail: string) {
  try {
    await addDoc(collection(db, 'logs'), {
      type,
      participants,
      detail,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to log system event:', e);
  }
}

// Admin Events Management System


export async function fetchAllEvents(): Promise<GameEvent[]> {
  try {
    const eventsRef = collection(db, 'events');
    const snap = await getDocs(eventsRef);
    const list: GameEvent[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<GameEvent, 'id'>) });
    });
    return list;
  } catch (e) {
    console.warn('Failed to fetch events from Firestore:', e);
    return [];
  }
}

export function subscribeToEvents(callback: (events: GameEvent[]) => void) {
  try {
    const eventsRef = collection(db, 'events');
    return onSnapshot(
      eventsRef,
      (snap) => {
        const list: GameEvent[] = [];
        const now = new Date().toISOString();
        snap.forEach((d) => {
          const data = d.data() as Omit<GameEvent, 'id'>;
          // Auto check active window if startDate/endDate exist
          let isActive = data.active;
          if (data.startDate && now < data.startDate) isActive = false;
          if (data.endDate && now > data.endDate) isActive = false;

          list.push({
            id: d.id,
            ...data,
            active: isActive,
          });
        });
        callback(list);
      },
      (err) => console.warn('Events snapshot error:', err)
    );
  } catch (e) {
    console.warn('Failed to subscribe to events:', e);
    return () => {};
  }
}

export async function saveGameEvent(event: Partial<GameEvent>): Promise<string> {
  const eventsRef = collection(db, 'events');
  const eventId = event.id || `event_${Date.now()}`;
  const docRef = doc(eventsRef, eventId);
  const payload = sanitizeData({
    ...event,
    id: eventId,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, payload, { merge: true });
  return eventId;
}

export async function deleteGameEvent(eventId: string): Promise<void> {
  const docRef = doc(db, 'events', eventId);
  await deleteDoc(docRef);
}

// Online Presence System
export interface OnlinePresenceUser {
  uid: string;
  nickname: string;
  email?: string;
  lastSeen: number;
}

export async function updateUserPresence(userProfile: { uid: string; nickname: string; email?: string }): Promise<void> {
  if (!userProfile.uid) return;
  try {
    const presenceRef = doc(db, 'presence', userProfile.uid);
    await setDoc(
      presenceRef,
      {
        uid: userProfile.uid,
        nickname: userProfile.nickname || 'Treinador',
        email: userProfile.email || '',
        lastSeen: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Presence update failed:', e);
  }
}

export function subscribeOnlineUsers(callback: (users: OnlinePresenceUser[]) => void) {
  try {
    const presenceCol = collection(db, 'presence');
    return onSnapshot(
      presenceCol,
      (snap) => {
        const now = Date.now();
        const onlineUsers: OnlinePresenceUser[] = [];
        snap.forEach((d) => {
          const data = d.data() as OnlinePresenceUser;
          // Active in the last 75 seconds
          if (data && now - data.lastSeen < 75000) {
            onlineUsers.push(data);
          }
        });
        callback(onlineUsers);
      },
      (err) => console.warn('Online users presence error:', err)
    );
  } catch (e) {
    console.warn('Failed to subscribe to online users:', e);
    return () => {};
  }
}

// Global Broadcast Encounter System (Admin transmits next wild encounter to all or selected online players)
export async function setBroadcastEncounter(broadcast: {
  speciesId: number;
  speciesName: string;
  level: number;
  isShiny: boolean;
  adminEmail: string;
  targetPlayerIds?: string[];
  targetCount?: number;
}): Promise<void> {
  const systemDocRef = doc(db, 'system', 'broadcast_encounter');
  const payload: BroadcastEncounter = {
    speciesId: broadcast.speciesId,
    speciesName: broadcast.speciesName,
    level: Math.max(1, Math.min(100, broadcast.level)),
    isShiny: !!broadcast.isShiny,
    active: true,
    createdBy: broadcast.adminEmail,
    createdAt: new Date().toISOString(),
    broadcastNumber: Date.now(),
    targetPlayerIds: broadcast.targetPlayerIds || [],
    targetCount: broadcast.targetCount,
  };
  await setDoc(systemDocRef, sanitizeData(payload));
}

export async function clearBroadcastEncounter(): Promise<void> {
  const systemDocRef = doc(db, 'system', 'broadcast_encounter');
  await setDoc(systemDocRef, { active: false, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeToBroadcastEncounter(callback: (encounter: BroadcastEncounter | null) => void) {
  try {
    const docRef = doc(db, 'system', 'broadcast_encounter');
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data() as BroadcastEncounter;
        if (!data || !data.active) {
          callback(null);
          return;
        }
        callback({ ...data, id: snap.id });
      },
      (err) => console.warn('Broadcast encounter snapshot error:', err)
    );
  } catch (e) {
    console.warn('Failed to subscribe to broadcast encounter:', e);
    return () => {};
  }
}

// Missions System Management
export async function fetchMissions(): Promise<GameMission[]> {
  try {
    const missionsRef = collection(db, 'missions');
    const snap = await getDocs(missionsRef);
    const list: GameMission[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<GameMission, 'id'>) });
    });
    return list;
  } catch (e) {
    console.warn('Failed to fetch missions:', e);
    return [];
  }
}

export function subscribeMissions(callback: (missions: GameMission[]) => void) {
  try {
    const missionsRef = collection(db, 'missions');
    return onSnapshot(
      missionsRef,
      (snap) => {
        const list: GameMission[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<GameMission, 'id'>) });
        });
        callback(list);
      },
      (err) => console.warn('Missions snapshot error:', err)
    );
  } catch (e) {
    console.warn('Failed to subscribe to missions:', e);
    return () => {};
  }
}

export async function saveMission(mission: Partial<GameMission>): Promise<string> {
  const missionsRef = collection(db, 'missions');
  const missionId = mission.id || `mission_${Date.now()}`;
  const docRef = doc(missionsRef, missionId);
  const payload = sanitizeData({
    ...mission,
    id: missionId,
    active: mission.active !== undefined ? mission.active : true,
    createdAt: mission.createdAt || new Date().toISOString(),
  });
  await setDoc(docRef, payload, { merge: true });
  return missionId;
}

export async function deleteMission(missionId: string): Promise<void> {
  const docRef = doc(db, 'missions', missionId);
  await deleteDoc(docRef);
}

