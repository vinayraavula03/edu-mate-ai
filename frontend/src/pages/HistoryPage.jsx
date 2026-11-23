import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserHistory } from '../api/client';
import { Clock, Trophy, Sparkles, Calendar, BookOpen } from 'lucide-react';

export default function HistoryPage() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'quiz', 'explanation'

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const items = await fetchUserHistory(token);
        setHistory(items);
      } catch (err) {
        console.warn('History load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [token]);

  const filteredItems = history.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Learning History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Past daily quiz attempts, scores, and topics explored with your AI buddy.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilter('quiz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'quiz' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Daily Quizzes
          </button>
          <button
            onClick={() => setFilter('explanation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'explanation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            AI Explanations
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-green-500 rounded-full mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading history...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No activity recorded yet</p>
            <p className="text-xs text-slate-400">Ask your AI buddy a question or complete today's quiz!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-5 sm:px-6 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 ${
                      item.type === 'quiz'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.type === 'quiz' ? (
                      <Trophy className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">{item.details}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                </div>

                {item.type === 'quiz' && (
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold inline-block">
                      +{item.points} pts
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
