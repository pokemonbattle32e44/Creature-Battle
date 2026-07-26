import React, { useState, useEffect } from 'react';
import { StarterSelectModal } from './components/StarterSelectModal';
import { MainMenu } from './components/MainMenu';
import { BattleView } from './components/BattleView';
import { ShopView } from './components/ShopView';
import { BagView } from './components/BagView';
import { TeamView } from './components/TeamView';
import { EvolutionModal } from './components/EvolutionModal';
import { SaveModal } from './components/SaveModal';
import { PokedexView } from './components/PokedexView';
import { IncenseNotification } from './components/IncenseNotification';

// Multiplayer & Social Modals / Views
import { AuthModal } from './components/AuthModal';
import { FriendsAndGiftsModal } from './components/FriendsAndGiftsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { TradeView } from './components/TradeView';
import { MultiplayerPvPView } from './components/MultiplayerPvPView';

import { PokemonBaseData, PokemonInstance, UserSaveData } from './types/pokemon';
import { createPokemonInstance, normalizePokemonInstance } from './utils/pokemonCalc';
import { generateWildEncounter } from './utils/encounterGenerator';
import { STARTERS_AND_POKEMON_DATABASE } from './data/startersAndPokemon';
import { soundEngine } from './utils/soundEngine';
import {
  onAuthChange,
  getUserCloudData,
  syncUserToCloud,
  checkIsAdmin,
  UserCloudData,
} from './utils/firebase';

const SAVE_KEY = 'POKEMON_ARENA_SAVE_V2';

export default function App() {
  // Game state
  const [currentView, setCurrentView] = useState<
    | 'starter_select'
    | 'main'
    | 'grass'
    | 'shop'
    | 'bag'
    | 'team'
    | 'save'
    | 'pokedex'
    | 'pvp'
    | 'trade'
  >('starter_select');

  const [playerTeam, setPlayerTeam] = useState<PokemonInstance[]>([]);
  const [pcBox, setPcBox] = useState<PokemonInstance[]>([]);
  const [pokedollars, setPokedollars] = useState<number>(1000);
  const [userInventory, setUserInventory] = useState<Record<string, number>>({
    poke_ball: 5,
    potion: 3,
  });
  const [activeIncense, setActiveIncense] = useState<string | null>(null);
  const [incenseTimers, setIncenseTimers] = useState<Record<string, number>>({});
  const [battlesWon, setBattlesWon] = useState<number>(0);
  const [pokemonCaught, setPokemonCaught] = useState<number>(1);
  const [pokedexSeen, setPokedexSeen] = useState<number[]>([]);
  const [pokedexCaught, setPokedexCaught] = useState<number[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Active battle state
  const [wildPokemon, setWildPokemon] = useState<PokemonInstance | null>(null);

  // Evolution queue
  const [evolvingPokemonIndex, setEvolvingPokemonIndex] = useState<number | null>(null);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Multiplayer Modals & Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userCloudProfile, setUserCloudProfile] = useState<UserCloudData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        const adminStatus = checkIsAdmin(user.email);
        setIsAdmin(adminStatus);

        const profile = await getUserCloudData(user.uid);
        if (profile) {
          const safeProfile = {
            ...profile,
            team: (profile.team || []).map(normalizePokemonInstance),
            pcBox: (profile.pcBox || []).map(normalizePokemonInstance),
          };
          setUserCloudProfile(safeProfile);
          if (safeProfile.team.length > 0) setPlayerTeam(safeProfile.team);
          setPcBox(safeProfile.pcBox);
        } else {
          // Initialize user profile in Firestore
          const newProfile: UserCloudData = {
            uid: user.uid,
            email: user.email || '',
            nickname: user.displayName || user.email?.split('@')[0] || 'Treinador',
            avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
            money: pokedollars,
            team: playerTeam,
            pcBox: [],
            inventory: userInventory,
            pokedexCaught: pokedexCaught,
            pokedexSeen: pokedexSeen,
            pokedexCount: pokedexCaught.length,
            wins: battlesWon,
            losses: 0,
            elo: 1000,
            winStreak: 0,
            isAdmin: adminStatus,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          await syncUserToCloud(newProfile);
          setUserCloudProfile(newProfile);
        }
      } else {
        setUserCloudProfile(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state changes to cloud whenever player team or stats change
  useEffect(() => {
    if (currentUser && userCloudProfile) {
      const updatedProfile: UserCloudData = {
        ...userCloudProfile,
        money: pokedollars,
        team: playerTeam,
        pokedexCount: pokedexCaught.length,
        wins: battlesWon,
        isAdmin,
        updatedAt: new Date().toISOString(),
      };
      setUserCloudProfile(updatedProfile);
      syncUserToCloud(updatedProfile);
    }
  }, [playerTeam, pokedollars, battlesWon, pokedexCaught.length]);

  // Active incense countdown timer tick (decrements remaining seconds)
  useEffect(() => {
    if (!activeIncense) return;

    const interval = setInterval(() => {
      setIncenseTimers((prev) => {
        const currentRem = prev[activeIncense] ?? 1800;
        if (currentRem <= 1) {
          setActiveIncense(null);
          soundEngine.playFaint();
          return { ...prev, [activeIncense]: 0 };
        }
        return { ...prev, [activeIncense]: currentRem - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeIncense]);

  // Load saved game on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed: UserSaveData = JSON.parse(saved);
        if (parsed.party && parsed.party.length > 0) {
          setPlayerTeam(parsed.party.map(normalizePokemonInstance));
          if (parsed.pcBox) setPcBox(parsed.pcBox.map(normalizePokemonInstance));
          setPokedollars(parsed.pokedollars || 1000);
          setUserInventory(parsed.inventory || { poke_ball: 5, potion: 3 });
          setActiveIncense(parsed.activeIncense || null);
          setIncenseTimers(parsed.incenseTimers || {});
          setBattlesWon(parsed.battlesWon || 0);
          setPokemonCaught(parsed.pokemonCaught || parsed.party.length);
          
          const partyPokedexIds = parsed.party.map((p) => p.pokedexId);
          const initialSeen = Array.from(new Set([...(parsed.pokedexSeen || []), ...partyPokedexIds]));
          const initialCaught = Array.from(new Set([...(parsed.pokedexCaught || []), ...partyPokedexIds]));

          setPokedexSeen(initialSeen);
          setPokedexCaught(initialCaught);
          setLastSavedAt(parsed.lastSavedAt || null);
          setCurrentView('main');
        }
      }
    } catch (e) {
      console.error('Failed to load save data:', e);
    }
  }, []);

  // Toggle Incense Handler
  const handleToggleIncense = (incenseId: string) => {
    if (activeIncense === incenseId) {
      // Pause/deactivate current incense (saves remaining time)
      setActiveIncense(null);
    } else {
      // Activate new incense (must have time left or consume 1 item)
      const currentTimer = incenseTimers[incenseId] ?? 0;
      if (currentTimer <= 0) {
        const qty = userInventory[incenseId] || 0;
        if (qty <= 0) {
          alert('Você não tem esse tipo de incenso na mochila. Compre na loja!');
          return;
        }
        // Deduct 1 item and set full 30 min duration (1800s)
        setUserInventory((prev) => ({ ...prev, [incenseId]: Math.max(0, qty - 1) }));
        setIncenseTimers((prev) => ({ ...prev, [incenseId]: 1800 }));
      }
      setActiveIncense(incenseId);
    }
  };

  // Save game helper
  const handleSaveGame = () => {
    const timestamp = new Date().toISOString();
    const saveData: UserSaveData = {
      party: playerTeam,
      pcBox: pcBox,
      pokedollars,
      inventory: userInventory,
      activeIncense,
      incenseTimers,
      battlesWon,
      pokemonCaught,
      pokedexSeen,
      pokedexCaught,
      lastSavedAt: timestamp,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    setLastSavedAt(timestamp);
  };

  const handleResetGame = () => {
    localStorage.removeItem(SAVE_KEY);
    setPlayerTeam([]);
    setPokedollars(1000);
    setUserInventory({ poke_ball: 5, potion: 3 });
    setBattlesWon(0);
    setPokemonCaught(0);
    setPokedexSeen([]);
    setPokedexCaught([]);
    setLastSavedAt(null);
    setCurrentView('starter_select');
  };

  // Starter Selection
  const handleSelectStarter = (baseData: PokemonBaseData) => {
    const randomLevel = Math.floor(Math.random() * 3) + 5; // Level 5, 6, or 7
    const starterInstance = createPokemonInstance(baseData, randomLevel);
    const newTeam = [starterInstance];
    setPlayerTeam(newTeam);
    setPokemonCaught(1);

    const newSeen = [baseData.id];
    const newCaught = [baseData.id];
    setPokedexSeen(newSeen);
    setPokedexCaught(newCaught);

    setCurrentView('main');

    // Auto save initial state
    setTimeout(() => {
      const timestamp = new Date().toISOString();
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          party: newTeam,
          pokedollars: 1000,
          inventory: { poke_ball: 5, potion: 3 },
          battlesWon: 0,
          pokemonCaught: 1,
          pokedexSeen: newSeen,
          pokedexCaught: newCaught,
          lastSavedAt: timestamp,
        })
      );
      setLastSavedAt(timestamp);
    }, 100);
  };

  const handleStartMissingNoBattle = () => {
    const missingNoBase = STARTERS_AND_POKEMON_DATABASE[0];
    if (missingNoBase) {
      const missingNoInstance = createPokemonInstance(missingNoBase, 100);
      if (!pokedexSeen.includes(0)) {
        setPokedexSeen((prev) => [...prev, 0]);
      }
      setWildPokemon(missingNoInstance);
      setCurrentView('grass');
    }
  };

  const handleStartGhostBattle = () => {
    const ghostBase = STARTERS_AND_POKEMON_DATABASE[666];
    if (ghostBase) {
      const ghostInstance = createPokemonInstance(ghostBase, 100);
      if (!pokedexSeen.includes(666)) {
        setPokedexSeen((prev) => [...prev, 666]);
      }
      setWildPokemon(ghostInstance);
      setCurrentView('grass');
    }
  };

  // Generate Wild Pokemon and start battle
  const handleStartWildBattle = async () => {
    const lead = playerTeam[0];
    const baseLevel = lead ? lead.level : 1;

    const { wildInstance } = await generateWildEncounter(baseLevel, activeIncense);

    // Track seen in pokedex
    if (!pokedexSeen.includes(wildInstance.pokedexId)) {
      setPokedexSeen((prev) => [...prev, wildInstance.pokedexId]);
    }

    setWildPokemon(wildInstance);
    setCurrentView('grass');
  };

  // Handle Win Battle
  const handleWinBattle = (finalTeam: PokemonInstance[], moneyGained: number, caughtPokemon?: PokemonInstance) => {
    const updatedPokedollars = pokedollars + moneyGained;
    const updatedBattlesWon = battlesWon + 1;
    const updatedCaughtCount = pokemonCaught + (caughtPokemon ? 1 : 0);

    setPokedollars(updatedPokedollars);
    setBattlesWon(updatedBattlesWon);

    let updatedTeam = [...finalTeam];
    let updatedBox = [...pcBox];
    let newSeen = [...pokedexSeen];
    let newCaught = [...pokedexCaught];

    if (caughtPokemon) {
      if (updatedTeam.length < 6) {
        updatedTeam.push(caughtPokemon);
      } else {
        updatedBox.push(caughtPokemon);
        setPcBox(updatedBox);
      }
      setPokemonCaught(updatedCaughtCount);
      if (!newSeen.includes(caughtPokemon.pokedexId)) newSeen.push(caughtPokemon.pokedexId);
      if (!newCaught.includes(caughtPokemon.pokedexId)) newCaught.push(caughtPokemon.pokedexId);
      setPokedexSeen(newSeen);
      setPokedexCaught(newCaught);
    }

    setPlayerTeam(updatedTeam);

    if (userCloudProfile) {
      const updatedProfile: UserCloudData = {
        ...userCloudProfile,
        money: updatedPokedollars,
        team: updatedTeam,
        pcBox: updatedBox,
        wins: updatedBattlesWon,
        pokedexCount: newCaught.length,
        pokedexCaught: newCaught,
        pokedexSeen: newSeen,
      };
      setUserCloudProfile(updatedProfile);
      syncUserToCloud(updatedProfile);
    }

    // Check for evolution in team
    const evolvableIndex = updatedTeam.findIndex(
      (p) => p.evolution && p.evolution.minLevel && p.level >= p.evolution.minLevel
    );

    if (evolvableIndex !== -1) {
      setEvolvingPokemonIndex(evolvableIndex);
    } else {
      setCurrentView('main');
    }

    // Persist save data immediately with latest state
    const timestamp = new Date().toISOString();
    const saveData: UserSaveData = {
      party: updatedTeam,
      pokedollars: updatedPokedollars,
      inventory: userInventory,
      battlesWon: updatedBattlesWon,
      pokemonCaught: updatedCaughtCount,
      pokedexSeen: newSeen,
      pokedexCaught: newCaught,
      lastSavedAt: timestamp,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    setLastSavedAt(timestamp);
  };

  const handleCompleteEvolution = (evolvedPokemon: PokemonInstance) => {
    if (evolvingPokemonIndex !== null) {
      const updatedTeam = [...playerTeam];
      updatedTeam[evolvingPokemonIndex] = evolvedPokemon;
      setPlayerTeam(updatedTeam);

      const newSeen = Array.from(new Set([...pokedexSeen, evolvedPokemon.pokedexId]));
      const newCaught = Array.from(new Set([...pokedexCaught, evolvedPokemon.pokedexId]));
      setPokedexSeen(newSeen);
      setPokedexCaught(newCaught);

      setEvolvingPokemonIndex(null);
      setCurrentView('main');

      const timestamp = new Date().toISOString();
      const saveData: UserSaveData = {
        party: updatedTeam,
        pokedollars,
        inventory: userInventory,
        battlesWon,
        pokemonCaught,
        pokedexSeen: newSeen,
        pokedexCaught: newCaught,
        lastSavedAt: timestamp,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      setLastSavedAt(timestamp);
    }
  };

  const handleCancelEvolution = () => {
    setEvolvingPokemonIndex(null);
    setCurrentView('main');
  };

  // Navigation router
  const leadPokemon = playerTeam[0];

  const effectiveCloudProfile: UserCloudData = userCloudProfile || {
    uid: currentUser?.uid || 'guest_' + (currentUser?.uid || 'local_player'),
    email: currentUser?.email || 'guest@arena.local',
    nickname: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Treinador',
    avatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    money: pokedollars,
    isAdmin: isAdmin,
    elo: 1000,
    wins: battlesWon,
    losses: 0,
    winStreak: 0,
    team: playerTeam,
    pcBox: pcBox,
    inventory: userInventory,
    pokedexCaught: pokedexCaught,
    pokedexSeen: pokedexSeen,
    pokedexCount: pokedexCaught.length,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      
      {/* Starter Select Screen */}
      {currentView === 'starter_select' && (
        <StarterSelectModal onSelectStarter={handleSelectStarter} />
      )}

      {/* Main Menu Dashboard */}
      {currentView === 'main' && leadPokemon && (
        <MainMenu
          leadPokemon={leadPokemon}
          pokedollars={pokedollars}
          soundEnabled={soundEnabled}
          activeIncense={activeIncense}
          currentUser={currentUser}
          userCloudProfile={userCloudProfile}
          isAdmin={isAdmin}
          onToggleSound={() => setSoundEnabled(soundEngine.toggleSound())}
          onNavigate={(view) => {
            if (view === 'grass') {
              handleStartWildBattle();
            } else {
              setCurrentView(view);
            }
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          battlesWon={battlesWon}
          pokemonCaught={pokemonCaught}
        />
      )}

      {/* Battle View */}
      {currentView === 'grass' && wildPokemon && leadPokemon && (
        <BattleView
          playerTeam={playerTeam}
          wildPokemon={wildPokemon}
          userInventory={userInventory}
          onUpdateTeam={setPlayerTeam}
          onUpdateInventory={setUserInventory}
          onWinBattle={handleWinBattle}
          onRunAway={() => setCurrentView('main')}
        />
      )}

      {/* PvP Multiplayer Battle View */}
      {currentView === 'pvp' && (
        <MultiplayerPvPView
          userCloudProfile={effectiveCloudProfile}
          onUpdateProfile={(updated) => {
            setUserCloudProfile(updated);
            setPokedollars(updated.money);
            setPlayerTeam(updated.team);
            if (updated.pcBox) setPcBox(updated.pcBox);
          }}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Trade View */}
      {currentView === 'trade' && (
        <TradeView
          userCloudProfile={effectiveCloudProfile}
          onUpdateProfile={(updated) => {
            setUserCloudProfile(updated);
            setPlayerTeam(updated.team);
            if (updated.pcBox) setPcBox(updated.pcBox);
          }}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Shop View */}
      {currentView === 'shop' && (
        <ShopView
          pokedollars={pokedollars}
          userInventory={userInventory}
          isAdmin={isAdmin}
          onBuyItem={(itemId, qty, cost) => {
            setPokedollars((prev) => prev - cost);
            setUserInventory((prev) => ({
              ...prev,
              [itemId]: (prev[itemId] || 0) + qty,
            }));
            handleSaveGame();
          }}
          onChallengeMissingNo={handleStartMissingNoBattle}
          onChallengeGhost={handleStartGhostBattle}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Bag / Inventory View */}
      {currentView === 'bag' && (
        <BagView
          playerTeam={playerTeam}
          userInventory={userInventory}
          activeIncense={activeIncense}
          incenseTimers={incenseTimers}
          onToggleIncense={(incenseId) => {
            handleToggleIncense(incenseId);
            handleSaveGame();
          }}
          onUpdateTeam={(newTeam) => {
            setPlayerTeam(newTeam);
            handleSaveGame();
          }}
          onUpdateInventory={(newInv) => {
            setUserInventory(newInv);
            handleSaveGame();
          }}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Team Management & PC Box View */}
      {currentView === 'team' && (
        <TeamView
          playerTeam={playerTeam}
          pcBox={pcBox}
          onUpdateTeamAndBox={(newTeam, newBox) => {
            setPlayerTeam(newTeam);
            setPcBox(newBox);
            if (userCloudProfile) {
              const updated = { ...userCloudProfile, team: newTeam, pcBox: newBox };
              setUserCloudProfile(updated);
              syncUserToCloud(updated);
            }
            handleSaveGame();
          }}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Save / Reset View */}
      {currentView === 'save' && (
        <SaveModal
          lastSavedAt={lastSavedAt}
          onSaveGame={handleSaveGame}
          onResetGame={handleResetGame}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Pokédex View */}
      {currentView === 'pokedex' && (
        <PokedexView
          pokedexSeen={pokedexSeen}
          pokedexCaught={pokedexCaught}
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* Evolution Modal Overlay */}
      {evolvingPokemonIndex !== null && playerTeam[evolvingPokemonIndex] && (
        <EvolutionModal
          pokemon={playerTeam[evolvingPokemonIndex]}
          onCompleteEvolution={handleCompleteEvolution}
          onCancelEvolution={handleCancelEvolution}
        />
      )}

      {/* Floating Incense Timer Notification (Always visible when active) */}
      <IncenseNotification
        activeIncenseId={activeIncense}
        remainingSeconds={activeIncense ? (incenseTimers[activeIncense] ?? 1800) : 0}
        onToggleDeactivate={() => {
          if (activeIncense) handleToggleIncense(activeIncense);
        }}
      />

      {/* Auth Modal */}
      {isAuthOpen && (
        <AuthModal
          currentUser={currentUser}
          userCloudProfile={userCloudProfile}
          onUpdateProfile={(updated) => {
            setUserCloudProfile(updated);
            if (updated.team) setPlayerTeam(updated.team);
            if (typeof updated.money === 'number') setPokedollars(updated.money);
          }}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {/* Friends and Gifts Modal */}
      {isFriendsOpen && userCloudProfile && (
        <FriendsAndGiftsModal
          userCloudProfile={userCloudProfile}
          onUpdateProfile={(updated) => {
            setUserCloudProfile(updated);
            if (updated.team) setPlayerTeam(updated.team);
            if (typeof updated.money === 'number') setPokedollars(updated.money);
          }}
          onClose={() => setIsFriendsOpen(false)}
        />
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          currentUid={userCloudProfile?.uid}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

      {/* Admin Panel Modal */}
      {isAdminPanelOpen && userCloudProfile && (
        <AdminPanelModal
          userCloudProfile={userCloudProfile}
          onUpdateProfile={(updated) => {
            setUserCloudProfile(updated);
            if (updated.team) setPlayerTeam(updated.team);
            if (typeof updated.money === 'number') setPokedollars(updated.money);
          }}
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}

    </div>
  );
}
