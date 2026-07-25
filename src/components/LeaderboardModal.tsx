import React, { useState, useEffect } from 'react';
import { Trophy, Award, Crown, Flame, Shield, X, RefreshCw } from 'lucide-react';
import { UserCloudData, getTopRankedPlayers } from '../utils/firebase';
import { soundEngine } from '../utils/soundEngine';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [topPlayers, setTopPlayers] = useState<UserCloudData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    setLoading(true);
    const list = await getTopRankedPlayers(30);
    setTopPlayers(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 relative shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                Ranking Global de Treinadores
              </h3>
              <p className="text-xs text-slate-400">Classificação Oficial de Liga Competitiva PvP</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              fetchRankings();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs font-bold">
              Carregando ranking global...
            </div>
          ) : topPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-bold">
              Nenhum jogador ranqueado no momento.
            </div>
          ) : (
            topPlayers.map((player, idx) => {
              const rank = idx + 1;
              let rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                  #{rank}
                </span>
              );

              if (rank === 1) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/30">
                    🥇 #1
                  </span>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                    🥈 #2
                  </span>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-lg">
                    🥉 #3
                  </span>
                );
              }

              return (
                <div
                  key={player.uid}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    rank === 1
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-lg'
                      : rank <= 3
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-slate-950 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <img src={player.avatar} alt={player.nickname} className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800" />
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {player.nickname}
                        {player.isAdmin && <Crown className="w-4 h-4 text-amber-400 inline" />}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {player.wins || 0} Vitórias | {player.losses || 0} Derrotas
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-300 block">
                      {player.league || 'Ouro'}
                    </span>
                    <span className="text-sm font-mono font-black text-sky-400">
                      {player.elo || 1000} ELO
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
