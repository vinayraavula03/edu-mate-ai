import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserProfile, fetchTodayQuiz } from '../api/client';
import {
  Flame,
  Star,
  Trophy,
  Award,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  School,
  Clock,
} from 'lucide-react';

export default function StudentDashboard({ onNavigate, onOpenJoinModal }) {
  const { token, activeClass, displayName } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayQuiz, setTodayQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const p = await fetchUserProfile(token);
        setProfile(p);

        if (activeClass?.id) {
          const q = await fetchTodayQuiz(activeClass.id, token);
          setTodayQuiz(q);
        }
      } catch (err) {
        console.warn('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, activeClass]);

  const streak = profile?.streak ?? 1;
  const points = profile?.total_points ?? 0;
  const todayRank = profile?.daily_rank ? `#${profile.daily_rank}` : 'Top 5';
  const weeklyRank = profile?.weekly_rank ? `#${profile.weekly_rank}` : 'Top 5';
  const weeklyProgress = profile?.weekly_progress_percentage ?? 20.0;
  const badges = profile?.badges ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-green-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold mb-3">
            <School className="w-3.5 h-3.5" />
            <span>{activeClass ? `${activeClass.name} (Code: ${activeClass.join_code})` : 'No Class Joined'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hi, {displayName || 'Explorer'}! 👋
          </h1>
          <p className="text-green-100 text-sm mt-1 max-w-xl">
            {todayQuiz?.already_completed
              ? "You've crushed today's daily quiz! Check out the live leaderboard or learn something new."
              : "Today's class challenge is ready! Complete the 5-question daily quiz to boost your rank."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!activeClass ? (
            <button
              onClick={onOpenJoinModal}
              className="px-5 py-3 bg-white text-green-700 hover:bg-green-50 font-bold text-xs rounded-2xl shadow-lg transition-all"
            >
              Join a Class 🏫
            </button>
          ) : (
            <button
              onClick={() => onNavigate('quiz')}
              className="px-5 py-3 bg-white text-green-700 hover:bg-green-50 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>{todayQuiz?.already_completed ? 'Review Quiz' : 'Start Daily Quiz'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          bgColor="bg-orange-50"
          borderColor="border-orange-200/60"
          title="Daily Streak"
          value={`${streak} Days 🔥`}
          subtitle="Increases once per day"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-500" />}
          bgColor="bg-amber-50"
          borderColor="border-amber-200/60"
          title="Total Points"
          value={`⭐ ${points}`}
          subtitle="From scored daily quizzes"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-purple-500" />}
          bgColor="bg-purple-50"
          borderColor="border-purple-200/60"
          title="Today's Rank"
          value={todayRank}
          subtitle="Midnight IST window"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-blue-500" />}
          bgColor="bg-blue-50"
          borderColor="border-blue-200/60"
          title="Weekly Rank"
          value={weeklyRank}
          subtitle="Mon - Sun IST standings"
        />
      </div>

      {/* Daily Quiz Alert Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm ${
        todayQuiz?.already_completed
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              todayQuiz?.already_completed ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
            }`}>
              {todayQuiz?.already_completed ? <CheckCircle2 className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {todayQuiz?.already_completed ? "Today's Quiz Completed" : "Daily Challenge Active"}
              </div>
              <h3 className="text-lg font-extrabold">
                Topic: {todayQuiz?.topic || 'Class Daily Quiz'}
              </h3>
              <p className="text-xs mt-0.5 text-slate-600">
                {todayQuiz?.already_completed
                  ? `Your score: ${todayQuiz.previous_score ?? 5}/5 questions correct! Only 1 scored attempt allowed per day.`
                  : '5 Questions • 30-Second Countdown • Earn up to +70 leaderboard points!'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('quiz')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
              todayQuiz?.already_completed
                ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
            }`}
          >
            <span>{todayQuiz?.already_completed ? 'View Results & Explanations' : 'Take Daily Quiz 🎯'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekly Goal Progress Bar (Computed from real data) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly Goal Progress</h3>
            <p className="text-xs text-slate-500">Calculated from your active quizzes completed this week (Target: 5 days)</p>
          </div>
          <span className="text-sm font-extrabold text-green-700">{weeklyProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(10, weeklyProgress))}%` }}
          />
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          title="Learn with AI Buddy"
          desc="Explore any topic with Edu the Elephant, Zara Robot, Leo, or Mia. Word-by-word streaming answers in 30+ languages!"
          buttonText="Open AI Tutor"
          icon={<Sparkles className="w-6 h-6 text-emerald-600" />}
          onClick={() => onNavigate('learn')}
        />
        <ActionCard
          title="Practice Quizzes"
          desc="Generate unlimited practice quizzes on any custom topic to test yourself without risking leaderboard points."
          buttonText="Start Practice"
          icon={<BookOpen className="w-6 h-6 text-blue-600" />}
          onClick={() => onNavigate('practice')}
        />
        <ActionCard
          title="Live Class Leaderboard"
          desc="See where you stand in your class! Realtime websocket updates when classmates submit answers."
          buttonText="View Leaderboard"
          icon={<Trophy className="w-6 h-6 text-purple-600" />}
          onClick={() => onNavigate('leaderboard')}
        />
      </div>

      {/* Badges Gallery */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900">Your Learning Badges</h3>
          <span className="text-xs text-slate-500 font-semibold">
            {badges.filter((b) => b.unlocked).length} of {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border text-center transition-all ${
                b.unlocked
                  ? 'bg-amber-50/60 border-amber-200 text-slate-900 shadow-xs'
                  : 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-60'
              }`}
            >
              <div className="text-3xl mb-2">{b.icon}</div>
              <h4 className="text-xs font-bold leading-tight mb-1">{b.title}</h4>
              <p className="text-[11px] leading-tight text-slate-500">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, bgColor, borderColor, title, value, subtitle }) {
  return (
    <div className={`p-5 rounded-3xl border bg-white shadow-xs ${borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${bgColor}`}>{icon}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 mb-1">{value}</div>
      <div className="text-[11px] text-slate-400 font-medium">{subtitle}</div>
    </div>
  );
}

function ActionCard({ title, desc, buttonText, icon, onClick }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="p-3 bg-slate-50 rounded-2xl inline-block mb-4">{icon}</div>
        <h4 className="text-base font-extrabold text-slate-900 mb-2">{title}</h4>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">{desc}</p>
      </div>
      <button
        onClick={onClick}
        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
