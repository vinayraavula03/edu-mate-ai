import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import JoinClassModal from './components/JoinClassModal';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import LearnBuddy from './pages/LearnBuddy';
import DailyQuiz from './pages/DailyQuiz';
import PracticeQuiz from './pages/PracticeQuiz';
import Leaderboard from './pages/Leaderboard';
import HistoryPage from './pages/HistoryPage';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherInsights from './pages/TeacherInsights';

function MainApp() {
  const { user, role, loading } = useAuth();
  const [authView, setAuthView] = useState('landing'); // 'landing' or 'auth'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [practiceTopic, setPracticeTopic] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Initializing EduMate AI...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onGoToAuth={() => setAuthView('auth')}
        />
      );
    }
    return <AuthPage onBackToLanding={() => setAuthView('landing')} />;
  }

  // Logged in
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-green-100 selection:text-green-800">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
      />

      <main className="flex-1 pb-16">
        {role === 'student' ? (
          <>
            {activeTab === 'dashboard' && (
              <StudentDashboard
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenJoinModal={() => setIsJoinModalOpen(true)}
              />
            )}
            {activeTab === 'learn' && (
              <LearnBuddy
                onStartPracticeWithTopic={(t) => {
                  setPracticeTopic(t);
                  setActiveTab('practice');
                }}
              />
            )}
            {activeTab === 'quiz' && (
              <DailyQuiz
                onGoToLeaderboard={() => setActiveTab('leaderboard')}
                onOpenJoinModal={() => setIsJoinModalOpen(true)}
              />
            )}
            {activeTab === 'practice' && (
              <PracticeQuiz initialTopic={practiceTopic} />
            )}
            {activeTab === 'leaderboard' && (
              <Leaderboard onOpenJoinModal={() => setIsJoinModalOpen(true)} />
            )}
            {activeTab === 'history' && <HistoryPage />}
          </>
        ) : (
          <>
            {activeTab === 'teacher_dash' && (
              <TeacherDashboard
                onGoToInsights={() => setActiveTab('teacher_insights')}
                onGoToLeaderboard={() => setActiveTab('leaderboard')}
              />
            )}
            {activeTab === 'teacher_insights' && (
              <TeacherInsights
                onSetQuizOnTopic={(t) => {
                  setActiveTab('teacher_dash');
                }}
              />
            )}
            {activeTab === 'leaderboard' && <Leaderboard />}
          </>
        )}
      </main>

      <JoinClassModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoined={() => setActiveTab('dashboard')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
