import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  School,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function AuthPage({ onBackToLanding }) {
  const { login, signup, resetPassword, setDemoAccount } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [nickname, setNickname] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      if (!res?.success) {
        setError(res?.error || 'Login failed. Please check credentials.');
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      if (role === 'student' && !nickname.trim()) {
        setError('Please choose a friendly nickname for your class leaderboard.');
        setLoading(false);
        return;
      }
      const res = await signup({ email, password, role, nickname });
      if (res?.success) {
        setSuccess(res.message || 'Account created successfully!');
      } else {
        setError(res?.error || 'Signup failed.');
      }
    }
    setLoading(false);
  }

  async function handleForgot() {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);
    if (res.success) {
      setForgotSent(true);
      setSuccess('Password reset link sent to your email.');
    } else {
      setError(res.error || 'Failed to send reset link.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 mb-6 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-7 h-7" />
          </div>
        </button>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {isLogin ? 'Welcome back to EduMate' : 'Join Your AI Classroom'}
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          {isLogin
            ? 'Sign in to access your daily class quiz and leaderboard'
            : 'Create your account and select your classroom role'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200/80 sm:px-10 relative">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 mb-6 pb-2 gap-4">
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`pb-2 text-sm font-bold transition-all relative ${
                isLogin ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`pb-2 text-sm font-bold transition-all relative ${
                !isLogin ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        role === 'student'
                          ? 'border-green-500 bg-green-50 text-green-800 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <User className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <span className="text-xs">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        role === 'teacher'
                          ? 'border-green-500 bg-green-50 text-green-800 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <School className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                      <span className="text-xs">Teacher</span>
                    </button>
                  </div>
                </div>

                {/* Nickname for Students */}
                {role === 'student' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Choose Your Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Vinay_Ace, Cosmic_Tiger"
                      required
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-300 rounded-xl focus:border-green-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      🔒 Privacy first: Only your nickname is shown on the class leaderboard. Never your email!
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  required
                  className="w-full text-xs py-2.5 pl-9 pr-3 border border-slate-300 rounded-xl focus:border-green-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="text-[11px] text-green-600 hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs py-2.5 pl-9 pr-3 border border-slate-300 rounded-xl focus:border-green-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Processing...' : isLogin ? 'Sign In 🚀' : 'Create Account ✨'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
