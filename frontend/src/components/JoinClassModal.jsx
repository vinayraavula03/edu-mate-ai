import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { joinClass } from '../api/client';
import { School, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JoinClassModal({ isOpen, onClose, onJoined }) {
  const { token, setActiveClass } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await joinClass(code.trim().toUpperCase(), token);
      setSuccess(res.message);
      setActiveClass({ id: res.class_id, name: res.class_name, join_code: code.trim().toUpperCase() });
      setTimeout(() => {
        if (onJoined) onJoined(res);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Could not join class. Please check code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
          <School className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">Join Your Class</h3>
        <p className="text-sm text-slate-500 mb-6">
          Enter the 6-character class join code provided by your teacher (e.g. <code>EDU6A</code>).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Class Join Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. EDU6A"
              maxLength={8}
              required
              className="w-full text-center text-2xl font-mono tracking-widest uppercase font-bold py-3 px-4 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:outline-hidden transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-green-600/20 transition-all"
            >
              {loading ? 'Joining...' : 'Join Class 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
