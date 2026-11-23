import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLeaderboard, subscribeToClassAttempts } from '../api/client';
import {
  Trophy,
  Flame,
  Award,
  Clock,
  Sparkles,
  Zap,
  School,
  AlertCircle,
  Radio,
} from 'lucide-react';

export default function Leaderboard({ onOpenJoinModal }) {
  const { token, activeClass, user } = useAuth();
  const [range, setRange] = useState('daily'); // 'daily' or 'weekly'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimePulse, setRealtimePulse] = useState(false);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!activeClass?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const resp = await fetchLeaderboard(activeClass.id, range, token);
        setData(resp);
      } catch (err) {
        console.warn('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();

    // Subscribe to Supabase Realtime channel for live classmate submissions
    if (activeClass?.id) {
      const unsubscribe = subscribeToClassAttempts(activeClass.id, () => {
        // Classmate submitted - pulse and refresh!
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 2000);
        fetchLeaderboard(activeClass.id, range, token).then(setData);
      });
      return () => unsubscribe();
    }
  }, [activeClass, range, token]);

  if (!activeClass) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Please Join a Class First</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Leaderboards are private and competitive inside your individual class! Join a class with your code to participate.
        </p>
        <button
          onClick={onOpenJoinModal}
          className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Join a Class 🏫
        </button>
      </div>
    );
  }

  const top10 = data?.top_10 || [];
  const currentEntry = data?.current_user_entry;
  const isUserInTop10 = top10.some((e) => e.is_current_user);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Class Leaderboard
            </h1>
            {/* Live Realtime Pulse Pill */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
              realtimePulse
                ? 'bg-green-500 text-white animate-bounce'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{realtimePulse ? 'New Submission!' : 'Live Sync'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {activeClass.name} • Only nicknames shown • Scored on server
          </p>
        </div>

        {/* Range Tabs: Today vs This Week */}
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setRange('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              range === 'daily'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Today (IST)
          </button>
          <button
            onClick={() => setRange('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              range === 'weekly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            This Week 👑
          </button>
        </div>
      </div>

      {/* Motivational Message Banner */}
      {data?.motivation_message && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200/80 flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-800">
            {data.motivation_message}
          </div>
        </div>
      )}

      {/* Leaderboard Table / Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs font-semibold">Updating live standings...</p>
          </div>
        ) : top10.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No attempts yet for this {range} window!</p>
            <p className="text-xs text-slate-400">Be the first in your class to complete today's quiz.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {top10.map((entry) => {
              const isSelf = entry.is_current_user;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${
                    isSelf
                      ? 'bg-purple-50/70 border-l-4 border-purple-600 font-bold'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Rank & Nickname */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 flex items-center justify-center font-extrabold text-sm">
                      {entry.rank === 1 ? (
                        <span className="text-2xl" title="First Place">🥇</span>
                      ) : entry.rank === 2 ? (
                        <span className="text-2xl" title="Second Place">🥈</span>
                      ) : entry.rank === 3 ? (
                        <span className="text-2xl" title="Third Place">🥉</span>
                      ) : (
                        <span className="text-slate-400">#{entry.rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold ${isSelf ? 'text-purple-950' : 'text-slate-900'}`}>
                          {entry.display_name}
                        </span>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                            You
                          </span>
                        )}
                        {entry.is_champion && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            👑 Champion
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {entry.quizzes_completed} {entry.quizzes_completed === 1 ? 'quiz' : 'quizzes'} completed • {entry.accuracy}% accuracy
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      ⭐ {entry.points}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      points
                    </span>
                  </div>
                </div>
              );
            })}

            {/* If user is outside Top 10, display their highlighted rank row */}
            {currentEntry && !isUserInTop10 && (
              <div className="p-4 sm:px-6 bg-purple-50/80 border-t-2 border-dashed border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="w-8 font-extrabold text-sm text-purple-700 text-center">
                    #{currentEntry.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-purple-950">
                        {currentEntry.display_name} (You)
                      </span>
                    </div>
                    <div className="text-[11px] text-purple-600 font-medium">
                      Keep practicing to climb into the Top 10!
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-purple-900">
                    ⭐ {currentEntry.points}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules Footer */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-bold text-slate-700">Tie-Breaking Rules:</span> Higher quiz accuracy breaks point ties. If accuracy is equal, the earlier submission time takes precedence. Leaderboards are dynamically calculated over verified attempts.
      </div>
    </div>
  );
}
