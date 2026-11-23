import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyClasses,
  createClass,
  fetchClassDetails,
  regenerateJoinCode,
  removeStudentFromClass,
  setDailyQuizTopic,
} from '../api/client';
import {
  School,
  Plus,
  Copy,
  Check,
  RefreshCw,
  UserX,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';

export default function TeacherDashboard({ onGoToInsights, onGoToLeaderboard }) {
  const { token, activeClass, setActiveClass } = useAuth();

  const [classes, setClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadClasses();
  }, [token]);

  async function loadClasses() {
    setLoading(true);
    try {
      const resp = await fetchMyClasses(token);
      const clsList = resp.classes || [];
      setClasses(clsList);

      if (clsList.length > 0) {
        const selected = activeClass ? clsList.find((c) => c.id === activeClass.id) || clsList[0] : clsList[0];
        setCurrentClass(selected);
        setActiveClass(selected);
        loadDetails(selected.id);
      }
    } catch (err) {
      console.warn('Load classes error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(classId) {
    try {
      const details = await fetchClassDetails(classId, token);
      setClassDetails(details);
    } catch (err) {
      console.warn('Class details error:', err);
    }
  }

  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const created = await createClass(newClassName.trim(), token);
      setShowCreateModal(false);
      setNewClassName('');
      setMsg(`Class "${created.name}" created with join code ${created.join_code}!`);
      loadClasses();
    } catch (err) {
      alert(err.message || 'Failed to create class');
    }
  }

  async function handleRegenerateCode() {
    if (!currentClass) return;
    if (!confirm('Are you sure you want to regenerate the join code? The old code will expire.')) return;

    try {
      const res = await regenerateJoinCode(currentClass.id, token);
      setCurrentClass((prev) => ({ ...prev, join_code: res.new_join_code }));
      setActiveClass((prev) => ({ ...prev, join_code: res.new_join_code }));
      setMsg(`Join code regenerated: ${res.new_join_code}`);
    } catch (err) {
      alert('Failed to regenerate code.');
    }
  }

  async function handleRemoveStudent(userId, name) {
    if (!confirm(`Are you sure you want to remove ${name} from this class?`)) return;

    try {
      await removeStudentFromClass(currentClass.id, userId, token);
      loadDetails(currentClass.id);
      setMsg(`Student ${name} removed.`);
    } catch (err) {
      alert('Failed to remove student.');
    }
  }

  async function handleSetTopic(topicToSet) {
    if (!currentClass) return;
    setTopicLoading(true);
    try {
      const res = await setDailyQuizTopic(currentClass.id, topicToSet, token);
      setMsg(res.message);
      setCustomTopic('');
      loadDetails(currentClass.id);
    } catch (err) {
      alert('Failed to set topic.');
    } finally {
      setTopicLoading(false);
    }
  }

  function copyCode() {
    if (!currentClass?.join_code) return;
    navigator.clipboard.writeText(currentClass.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Class Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create classes, share join codes, set daily quiz topics, and track student completion.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Class</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-2xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="font-bold text-green-600">✕</button>
        </div>
      )}

      {/* Class Selector Row if teacher has multiple */}
      {classes.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCurrentClass(c);
                setActiveClass(c);
                loadDetails(c.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                currentClass?.id === c.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {currentClass && (
        <>
          {/* Class Hero Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Classroom
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {currentClass.name}
              </h2>
              <p className="text-xs text-slate-500">
                Created: {new Date(currentClass.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>

            {/* Join Code Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Student Join Code
                </span>
                <span className="text-2xl font-mono font-extrabold text-green-700 tracking-wider">
                  {currentClass.join_code}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyCode}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Copy join code"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Regenerate join code"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats & Action */}
            <div className="flex items-center justify-between md:justify-end gap-3">
              <button
                onClick={onGoToInsights}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors"
              >
                Weak-Topic Insights 🔍
              </button>
              <button
                onClick={onGoToLeaderboard}
                className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors"
              >
                Class Leaderboard 🏆
              </button>
            </div>
          </div>

          {/* Daily Quiz Topic Controller */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Daily Quiz Topic Controller
                </h3>
                <p className="text-xs text-slate-500">
                  Current topic:{' '}
                  <span className="font-bold text-green-700">
                    {classDetails?.today_quiz_topic || 'Water Cycle & Weather'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetTopic('Photosynthesis and Plant Cells')}
                  disabled={topicLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI Pick Topic 🤖</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter custom topic: e.g. Solar System, Fractions, World War II..."
                className="flex-1 text-xs font-semibold py-2.5 px-3.5 border border-slate-200 rounded-xl focus:border-green-500 focus:outline-hidden"
              />
              <button
                onClick={() => handleSetTopic(customTopic)}
                disabled={topicLoading || !customTopic.trim()}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
              >
                {topicLoading ? 'Generating Quiz...' : 'Set Quiz Topic 🎯'}
              </button>
            </div>
          </div>

          {/* Enrolled Students Table & Completion Status */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Enrolled Students</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track who completed today's quiz in real time.
                </p>
              </div>

              <span className="px-3 py-1 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-200">
                {classDetails?.today_quiz_completed_count || 0} of{' '}
                {classDetails?.students?.length || 0} Completed Today
              </span>
            </div>

            {classDetails?.students?.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No students joined yet</p>
                <p className="text-xs text-slate-400">
                  Share join code <code className="font-mono font-bold text-green-600">{currentClass.join_code}</code> with your class!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-6">Student Nickname</th>
                      <th className="py-3.5 px-6">Joined</th>
                      <th className="py-3.5 px-6">Today's Quiz Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {classDetails?.students?.map((s) => (
                      <tr key={s.user_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {s.display_name}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : 'Active'}
                        </td>
                        <td className="py-4 px-6">
                          {s.completed_today ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed ({s.today_score ?? 5}/5)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Today</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleRemoveStudent(s.user_id, s.display_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove student from class"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative">
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">Create a New Class</h3>
            <p className="text-xs text-slate-500 mb-6">
              A 6-character unique join code will be auto-generated for your students.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 6-A or Science Club"
                  required
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 rounded-xl focus:border-green-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md shadow-green-600/20"
                >
                  Create Class 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
