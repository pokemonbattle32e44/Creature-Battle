import React, { useState } from 'react';
import { Shield, User, Key, Mail, LogIn, UserPlus, Sparkles, X, Globe, Crown } from 'lucide-react';
import {
  auth,
  checkIsAdmin,
  syncUserToCloud,
  fetchUserFromCloud,
  UserCloudData,
} from '../utils/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { soundEngine } from '../utils/soundEngine';

interface AuthModalProps {
  currentUser: any;
  userCloudProfile: UserCloudData | null;
  onUpdateProfile: (profile: UserCloudData) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  userCloudProfile,
  onUpdateProfile,
  onClose,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = checkIsAdmin(currentUser?.email || userCloudProfile?.email);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    soundEngine.playClick();

    try {
      if (isRegister) {
        if (!nickname.trim()) {
          setError('Por favor, digite um apelido para o seu Treinador.');
          setLoading(false);
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const isAdminUser = checkIsAdmin(email);
        const newProfile: UserCloudData = {
          uid: res.user.uid,
          email: res.user.email || email,
          nickname: nickname.trim(),
          avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png',
          money: isAdminUser ? 1000000 : 3500,
          isAdmin: isAdminUser,
          elo: 1000,
          league: 'Ouro',
          wins: 0,
          losses: 0,
          winStreak: 0,
          team: userCloudProfile?.team || [],
          pcBox: userCloudProfile?.pcBox || [],
          inventory: userCloudProfile?.inventory || { master_ball: 2, ultra_ball: 10, poke_ball: 30 },
          pokedexCaught: userCloudProfile?.pokedexCaught || [1],
          pokedexSeen: userCloudProfile?.pokedexSeen || [1],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        await syncUserToCloud(newProfile);
        onUpdateProfile(newProfile);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        const cloudData = await fetchUserFromCloud(res.user.uid);
        if (cloudData) {
          onUpdateProfile(cloudData);
        } else {
          const isAdminUser = checkIsAdmin(res.user.email);
          const fallbackProfile: UserCloudData = {
            uid: res.user.uid,
            email: res.user.email || '',
            nickname: res.user.email?.split('@')[0] || 'Treinador',
            avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png',
            money: isAdminUser ? 1000000 : 3500,
            isAdmin: isAdminUser,
            elo: 1000,
            league: 'Ouro',
            wins: 0,
            losses: 0,
            winStreak: 0,
            team: userCloudProfile?.team || [],
            pcBox: userCloudProfile?.pcBox || [],
            inventory: userCloudProfile?.inventory || { master_ball: 2, ultra_ball: 10, poke_ball: 30 },
            pokedexCaught: userCloudProfile?.pokedexCaught || [1],
            pokedexSeen: userCloudProfile?.pokedexSeen || [1],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          await syncUserToCloud(fallbackProfile);
          onUpdateProfile(fallbackProfile);
        }
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    soundEngine.playClick();
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const cloudData = await fetchUserFromCloud(res.user.uid);
      if (cloudData) {
        onUpdateProfile(cloudData);
      } else {
        const isAdminUser = checkIsAdmin(res.user.email);
        const profile: UserCloudData = {
          uid: res.user.uid,
          email: res.user.email || '',
          nickname: res.user.displayName || res.user.email?.split('@')[0] || 'Treinador Google',
          avatar: res.user.photoURL || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png',
          money: isAdminUser ? 1000000 : 3500,
          isAdmin: isAdminUser,
          elo: 1000,
          league: 'Ouro',
          wins: 0,
          losses: 0,
          winStreak: 0,
          team: userCloudProfile?.team || [],
          pcBox: userCloudProfile?.pcBox || [],
          inventory: userCloudProfile?.inventory || { master_ball: 2, ultra_ball: 10, poke_ball: 30 },
          pokedexCaught: userCloudProfile?.pokedexCaught || [1],
          pokedexSeen: userCloudProfile?.pokedexSeen || [1],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        await syncUserToCloud(profile);
        onUpdateProfile(profile);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao entrar com Conta Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    soundEngine.playClick();
    await signOut(auth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 relative shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              Conta de Treinador {isAdmin && <Crown className="w-5 h-5 text-amber-400" />}
            </h3>
            <p className="text-xs text-slate-400">Sincronização em Nuvem Firebase & Multiplayer</p>
          </div>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  ● Conectado
                </span>
              </div>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>{userCloudProfile?.nickname || currentUser.email}</span>
                {isAdmin && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    ADMINISTRADOR
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-500 break-all">
                UID: {currentUser.uid}
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Liga Competitiva:</span>
                <span className="font-bold text-amber-300">{userCloudProfile?.league || 'Ouro'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pontuação ELO:</span>
                <span className="font-bold text-sky-400">{userCloudProfile?.elo || 1000}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Batalhas (V / D):</span>
                <span className="font-bold text-emerald-400">
                  {userCloudProfile?.wins || 0}V / {userCloudProfile?.losses || 0}D
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-3 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 font-bold text-xs rounded-xl transition-all"
            >
              Sair da Conta
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 font-medium">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Apelido do Treinador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: AshKetchum"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="treinador@pokemon.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Senha</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Processando...</span>
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" /> Criar Conta Grátis
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Entrar no Jogo
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-emerald-400" /> Entrar com Conta Google
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-sky-400 hover:underline font-bold"
              >
                {isRegister
                  ? 'Já possui uma conta? Faça login'
                  : 'Não possui conta? Cadastre-se agora'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
