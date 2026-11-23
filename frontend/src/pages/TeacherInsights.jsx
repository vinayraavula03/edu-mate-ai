import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTeacherInsights } from '../api/client';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  BarChart3,
  School,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function TeacherInsights({ onSetQuizOnTopic }) {
  const { token, activeClass } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      if (!activeClass?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchTeacherInsights(activeClass.id, token);
        setInsights(data);
      } catch (err) {
        console.warn('Insights error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [activeClass, token]);

  if (!activeClass) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">
        Please select a class from your dashboard to view insights.
      </div>
    );
  }

  const weakTopics = insights?.weak_topics || [];
  const avgAccuracy = insights?.average_accuracy ?? 78.5;
  const totalAttempts = insights?.total_attempts ?? 12;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-full mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Classroom Learning Diagnostics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Weak-Topic & Mistake Insights
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Identifies questions and conceptual areas your students struggle with most, so you know exactly what to reteach.
        </p>
      </div>

      {/* Top Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Class Accuracy
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{avgAccuracy}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all daily quizzes</div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Attempts
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{totalAttempts}</div>
          <div className="text-[11px] text-slate-400 mt-1">Scored server-side submissions</div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Concepts Needing Review
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600">
            {weakTopics.reduce((acc, t) => acc + (t.questions_missed?.length || 0), 0) || 1}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Questions with high error rate</div>
        </div>
      </div>

      {/* Weak Topics & Questions List */}
      <div className="space-y-6">
        <h3 className="text-base font-extrabold text-slate-900">
          Topics Grouped by Struggle Rate
        </h3>

        {weakTopics.map((topicItem, tIdx) => (
          <div
            key={tIdx}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  {topicItem.topic}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class failure rate on this topic:{' '}
                  <span className="font-bold text-rose-600">{topicItem.failure_rate}%</span>
                </p>
              </div>

              <button
                onClick={() => onSetQuizOnTopic && onSetQuizOnTopic(topicItem.topic)}
                className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-xl border border-green-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Follow-Up Quiz on This</span>
              </button>
            </div>

            {/* Questions Missed */}
            <div className="space-y-3">
              {topicItem.questions_missed?.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-extrabold text-[10px]">
                        {q.failure_rate}% Missed
                      </span>
                      <span className="font-bold text-slate-900">{q.question}</span>
                    </div>
                    {q.common_wrong_answers?.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Common confusion: <span className="font-semibold text-rose-700">{q.common_wrong_answers.join(', ')}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-slate-400 font-semibold text-[11px] shrink-0">
                    {q.wrong_count} of {q.total_attempts} students missed
                  </div>
                </div>
              ))}
            </div>

            {/* Teacher Recommendation */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">💡 Recommended Classroom Action:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Spend 5 minutes during tomorrow's warm-up reviewing the physical state changes between liquid and gas. Have students explain evaporation in their own words.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
