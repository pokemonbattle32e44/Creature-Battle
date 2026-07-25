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
import { PokemonInstance } from '../types/pokemon';

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
  });

  const unsub2 = onSnapshot(q2, (snap) => {
    snap.forEach((d) => {
      const data = d.data();
      friendUids.add(data.userA);
    });
    callback(Array.from(friendUids));
  });

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
  });
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
