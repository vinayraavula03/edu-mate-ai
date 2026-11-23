import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  Trophy,
  Flame,
  BookOpen,
  Clock,
  LogOut,
  User,
  School,
  Repeat,
  HelpCircle,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenJoinModal }) {
  const { user, role, displayName, activeClass, logout, setDemoAccount } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab(role === 'teacher' ? 'teacher_dash' : 'dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                  EduMate<span className="text-green-600">AI</span>
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  {role === 'teacher' ? 'Teacher Portal' : 'Classroom Buddy'}
                </span>
              </div>
            </button>

            {/* Class Pill */}
            {activeClass ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-800">
                <School className="w-3.5 h-3.5 text-green-600" />
                <span>{activeClass.name}</span>
                <span className="bg-green-200/80 px-1.5 py-0.5 rounded text-[11px] font-mono tracking-wider">
                  {activeClass.join_code}
                </span>
              </div>
            ) : role === 'student' ? (
              <button
                onClick={onOpenJoinModal}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-full text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <School className="w-3.5 h-3.5 text-amber-600" />
                <span>Join a Class</span>
              </button>
            ) : null}
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {role === 'student' ? (
              <>
                <NavButton
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                  icon={<Flame className="w-4 h-4 text-orange-500" />}
                  label="Dashboard"
                />
                <NavButton
                  active={activeTab === 'learn'}
                  onClick={() => setActiveTab('learn')}
                  icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
                  label="Learn Buddy"
                />
                <NavButton
                  active={activeTab === 'quiz'}
                  onClick={() => setActiveTab('quiz')}
                  icon={<Trophy className="w-4 h-4 text-amber-500" />}
                  label="Daily Quiz"
                />
                <NavButton
                  active={activeTab === 'practice'}
                  onClick={() => setActiveTab('practice')}
                  icon={<BookOpen className="w-4 h-4 text-blue-500" />}
                  label="Practice"
                />
                <NavButton
                  active={activeTab === 'leaderboard'}
                  onClick={() => setActiveTab('leaderboard')}
                  icon={<Trophy className="w-4 h-4 text-purple-500" />}
                  label="Leaderboard"
                />
                <NavButton
                  active={activeTab === 'history'}
                  onClick={() => setActiveTab('history')}
                  icon={<Clock className="w-4 h-4 text-slate-500" />}
                  label="History"
                />
              </>
            ) : (
              <>
                <NavButton
                  active={activeTab === 'teacher_dash'}
                  onClick={() => setActiveTab('teacher_dash')}
                  icon={<School className="w-4 h-4 text-green-600" />}
                  label="My Classes"
                />
                <NavButton
                  active={activeTab === 'teacher_insights'}
                  onClick={() => setActiveTab('teacher_insights')}
                  icon={<HelpCircle className="w-4 h-4 text-rose-500" />}
                  label="Weak-Topic Insights"
                />
                <NavButton
                  active={activeTab === 'leaderboard'}
                  onClick={() => setActiveTab('leaderboard')}
                  icon={<Trophy className="w-4 h-4 text-amber-500" />}
                  label="Class Leaderboard"
                />
              </>
            )}
          </nav>

          {/* Right Actions: User Role, User Nickname, Logout */}
          <div className="flex items-center gap-3">
            {/* User Role Badge */}
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 capitalize border border-slate-200">
              {role}
            </span>

            {/* Display Nickname */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-800">
                {displayName || 'Explorer'}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-200 px-2 py-1.5 bg-slate-50/90 text-xs overflow-x-auto">
        {role === 'student' ? (
          <>
            <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Home" icon={<Flame className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'learn'} onClick={() => setActiveTab('learn')} label="Learn" icon={<Sparkles className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} label="Quiz" icon={<Trophy className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'practice'} onClick={() => setActiveTab('practice')} label="Practice" icon={<BookOpen className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} label="Ranks" icon={<Trophy className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" icon={<Clock className="w-3.5 h-3.5" />} />
          </>
        ) : (
          <>
            <MobileNavButton active={activeTab === 'teacher_dash'} onClick={() => setActiveTab('teacher_dash')} label="Classes" icon={<School className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'teacher_insights'} onClick={() => setActiveTab('teacher_insights')} label="Insights" icon={<HelpCircle className="w-3.5 h-3.5" />} />
            <MobileNavButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} label="Leaderboard" icon={<Trophy className="w-3.5 h-3.5" />} />
          </>
        )}
      </div>
    </header>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
        active
          ? 'bg-green-50 text-green-700 shadow-sm border border-green-200/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
        active ? 'text-green-700 font-bold bg-white shadow-xs' : 'text-slate-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
