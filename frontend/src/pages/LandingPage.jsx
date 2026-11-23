import React from 'react';
import {
  GraduationCap,
  Sparkles,
  Trophy,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  School,
  Brain,
  Zap,
} from 'lucide-react';

export default function LandingPage({ onGoToAuth }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-green-100 selection:text-green-800">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-green-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              EduMate<span className="text-green-600">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToAuth}
              className="text-xs font-semibold px-4 py-2 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onGoToAuth}
              className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-50 border border-green-200/80 text-green-800 text-xs font-bold mb-6">
          <Sparkles className="w-4 h-4 text-green-600" />
          <span>Classroom Learning Platform with Live Leaderboards</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight sm:leading-tight mb-6">
          Learn with an AI buddy, prove it in the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
            daily quiz
          </span>
          , and climb your class leaderboard.
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          No more passive chatbot scrolling. EduMate turns classroom study into a friendly, fair daily competition with shared quizzes, server-scored points, and live rank updates.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onGoToAuth}
            className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-green-600/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Preview Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 text-left relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐘</span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg">Edu the Elephant</h4>
                <p className="text-xs text-slate-500 font-medium">Ready to explain the Water Cycle in Story Mode!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> 5-Day Streak
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Rank #2 in Class 6-A
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Shared Quiz</div>
              <div className="text-base font-extrabold text-slate-900">5 Questions • 30s Timer</div>
              <div className="text-xs text-green-600 font-semibold mt-1">Ready to take (+70 pts max)</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Class Leaderboard</div>
              <div className="text-base font-extrabold text-slate-900">Live Realtime Updates</div>
              <div className="text-xs text-purple-600 font-semibold mt-1">15 pts behind #1 (Bella_Star)</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teacher Insights</div>
              <div className="text-base font-extrabold text-slate-900">Weak Topics Highlighted</div>
              <div className="text-xs text-blue-600 font-semibold mt-1">Evaporation vs Condensation</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Fair, Simple & Fun</h2>
            <h3 className="text-3xl font-extrabold text-slate-900">How EduMate Works in 4 Steps</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StepCard
              step="1"
              icon={<School className="w-6 h-6 text-emerald-600" />}
              title="Join Your Class"
              desc="Enter the 6-character code from your teacher to enter your private, safe classroom space."
            />
            <StepCard
              step="2"
              icon={<Brain className="w-6 h-6 text-blue-600" />}
              title="Learn with AI Buddy"
              desc="Ask via text, voice, or PDF notes in 30+ languages. Enjoy word-by-word streaming answers."
            />
            <StepCard
              step="3"
              icon={<Zap className="w-6 h-6 text-amber-600" />}
              title="Take Daily Quiz"
              desc="5 questions with a countdown timer. Answers checked on server only—points are 100% trustworthy."
            />
            <StepCard
              step="4"
              icon={<Trophy className="w-6 h-6 text-purple-600" />}
              title="Climb Leaderboard"
              desc="Earn daily streak bonuses and climb the live class leaderboard as classmates submit!"
            />
          </div>
        </div>
      </section>

      {/* Architecture & Security Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Designed for Interview Excellence</h2>
          <h3 className="text-3xl font-extrabold text-slate-900">Engineered with Production Integrity</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<ShieldCheck className="w-7 h-7 text-green-600" />}
            title="Server-Side Fair Scoring"
            points={[
              "Browser never receives answer key prior to submission",
              "One scored attempt enforced with database unique constraints",
              "Dynamic leaderboard computed over attempts to prevent drift",
            ]}
          />
          <FeatureCard
            icon={<Sparkles className="w-7 h-7 text-blue-600" />}
            title="Free Gemini Quota Strategy"
            points={[
              "1 shared quiz per class per day (40 calls become 1)",
              "Multi-model fallback chain (Flash -> Flash-Lite -> Question Bank)",
              "Structured Pydantic JSON outputs with exponential backoff",
            ]}
          />
          <FeatureCard
            icon={<Trophy className="w-7 h-7 text-amber-600" />}
            title="Realtime Class Engagement"
            points={[
              "Supabase Realtime websockets for instantaneous rank changes",
              "Privacy first: only student nicknames shown, never emails",
              "Teacher insights group struggling questions by topic",
            ]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <GraduationCap className="w-5 h-5 text-green-500" />
            <span>EduMate AI</span>
          </div>
          <div>
            Built with React, FastAPI, Supabase & Google Gemini • Prepared for vinayraavula03
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ step, icon, title, desc }) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 relative">
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center mb-4">
        {step}
      </div>
      <div className="mb-3">{icon}</div>
      <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon, title, points }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-3 bg-slate-50 rounded-xl inline-block mb-4">{icon}</div>
      <h4 className="text-base font-extrabold text-slate-900 mb-3">{title}</h4>
      <ul className="space-y-2 text-xs text-slate-600">
        {points.map((pt, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <span>{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
