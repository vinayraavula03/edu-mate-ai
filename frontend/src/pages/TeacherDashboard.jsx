import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Download,
  Eye,
  X,
  Target,
  Mail,
  ArrowUpDown,
  BookOpen,
  HelpCircle,
  Award,
} from 'lucide-react';

export default function TeacherDashboard({ onGoToInsights, onGoToLeaderboard }) {
  const { token, activeClass, setActiveClass } = useAuth();

  const [classes, setClasses] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & UI states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);

  // Form & search states
  const [newClassName, setNewClassName] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  // Filtering & sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [sortBy, setSortBy] = useState('points'); // 'points' | 'accuracy' | 'name' | 'recent'

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
    } catch {
      alert('Failed to regenerate code.');
    }
  }

  async function handleRemoveStudent(userId, name) {
    if (!confirm(`Are you sure you want to remove ${name} from this class?`)) return;

    try {
      await removeStudentFromClass(currentClass.id, userId, token);
      loadDetails(currentClass.id);
      setMsg(`Student ${name} removed.`);
    } catch {
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
    } catch {
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

  // Export class data to CSV
  function handleExportCSV() {
    if (!classDetails?.students || classDetails.students.length === 0) {
      alert('No students to export.');
      return;
    }

    const headers = [
      'Student Nickname',
      'Email',
      'Joined Date',
      'Today Quiz Status',
      'Today Score',
      'Total Points',
      'Quizzes Completed',
      'Overall Accuracy %',
    ];

    const rows = classDetails.students.map((s) => [
      `"${s.display_name.replace(/"/g, '""')}"`,
      `"${(s.email || 'N/A').replace(/"/g, '""')}"`,
      s.joined_at ? s.joined_at.slice(0, 10) : 'N/A',
      s.completed_today ? 'Completed' : 'Pending',
      s.today_score !== null && s.today_score !== undefined ? `${s.today_score}/5` : 'N/A',
      s.total_points || 0,
      s.quizzes_completed || 0,
      `${s.accuracy || 0}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentClass.name.replace(/\s+/g, '_')}_Student_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered & Sorted students
  const filteredStudents = useMemo(() => {
    if (!classDetails?.students) return [];

    let list = [...classDetails.students];

    // Filter by search query (nickname or email)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.display_name.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }

    // Filter by completion status
    if (statusFilter === 'completed') {
      list = list.filter((s) => s.completed_today);
    } else if (statusFilter === 'pending') {
      list = list.filter((s) => !s.completed_today);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'points') return (b.total_points || 0) - (a.total_points || 0);
      if (sortBy === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0);
      if (sortBy === 'name') return a.display_name.localeCompare(b.display_name);
      if (sortBy === 'recent') return new Date(b.joined_at || 0) - new Date(a.joined_at || 0);
      return 0;
    });

    return list;
  }, [classDetails?.students, searchQuery, statusFilter, sortBy]);

  const completionPercent = classDetails?.students?.length
    ? Math.round((classDetails.today_quiz_completed_count / classDetails.students.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Class Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage classes, inspect student performance analytics, preview daily quizzes, and track mastery.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Class</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-2xl flex items-center justify-between shadow-xs">
          <span className="font-semibold">{msg}</span>
          <button onClick={() => setMsg('')} className="font-bold text-green-600 hover:text-green-800 cursor-pointer">✕</button>
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                Active Classroom
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                {currentClass.name}
              </h2>
              <p className="text-xs text-slate-500">
                Created on {new Date(currentClass.created_at || Date.now()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>

            {/* Join Code Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Student Join Code
                </span>
                <span className="text-2xl font-mono font-extrabold text-green-700 tracking-widest">
                  {currentClass.join_code}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyCode}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Copy join code"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Regenerate join code"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
              <button
                onClick={onGoToInsights}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Weak-Topic Insights</span>
                <span>🔍</span>
              </button>
              <button
                onClick={onGoToLeaderboard}
                className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Class Leaderboard</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Enrolled Students</span>
              </span>
              <p className="text-2xl font-extrabold text-slate-900">
                {classDetails?.students?.length || 0}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Today's Completion</span>
              </span>
              <p className="text-2xl font-extrabold text-slate-900">
                {classDetails?.today_quiz_completed_count || 0} <span className="text-xs font-semibold text-slate-400">({completionPercent}%)</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-500" />
                <span>Average Accuracy</span>
              </span>
              <p className="text-2xl font-extrabold text-slate-900">
                {classDetails?.average_accuracy || 0}%
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Today's Quiz Topic</span>
              </span>
              <p className="text-sm font-extrabold text-slate-900 truncate" title={classDetails?.today_quiz_topic}>
                {classDetails?.today_quiz_topic || 'General Science'}
              </p>
            </div>
          </div>

          {/* Daily Quiz Topic Controller & Preview */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Daily Quiz Topic Controller
                </h3>
                <p className="text-xs text-slate-500">
                  Current topic for today:{' '}
                  <span className="font-bold text-green-700">
                    {classDetails?.today_quiz_topic || 'General Science'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {classDetails?.today_quiz_questions?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowQuizPreview(true)}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview 5 Questions</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSetTopic('Photosynthesis and Plant Cells')}
                  disabled={topicLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
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
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {topicLoading ? 'Generating Quiz...' : 'Set Quiz Topic 🎯'}
              </button>
            </div>
          </div>

          {/* Enrolled Students Table & Analytics */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            {/* Header & Actions */}
            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Enrolled Students & Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track individual progress, total points, overall accuracy, and quiz attempts.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-200">
                  {classDetails?.today_quiz_completed_count || 0} of{' '}
                  {classDetails?.students?.length || 0} Completed Today
                </span>

                <button
                  onClick={handleExportCSV}
                  disabled={!classDetails?.students?.length}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  title="Download Class Roster and Quiz Results as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-6 pb-2 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search input */}
              <div className="sm:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by nickname or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-green-500 focus:outline-hidden"
                />
              </div>

              {/* Status filter tabs */}
              <div className="sm:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All ({classDetails?.students?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-white text-green-700 shadow-xs'
                      : 'text-slate-500 hover:text-green-700'
                  }`}
                >
                  Completed ({classDetails?.today_quiz_completed_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-500 hover:text-amber-700'
                  }`}
                >
                  Pending ({(classDetails?.students?.length || 0) - (classDetails?.today_quiz_completed_count || 0)})
                </button>
              </div>

              {/* Sort selector */}
              <div className="sm:col-span-3 flex items-center gap-1.5 justify-end">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-2.5 border border-slate-200 rounded-xl bg-white focus:outline-hidden text-slate-700"
                >
                  <option value="points">Sort: Total Points</option>
                  <option value="accuracy">Sort: Highest Accuracy</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="recent">Sort: Recently Joined</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">
                  {classDetails?.students?.length === 0
                    ? 'No students joined yet'
                    : 'No students matching your filter'}
                </p>
                {classDetails?.students?.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Share join code{' '}
                    <code className="font-mono font-bold text-green-600">{currentClass.join_code}</code>{' '}
                    with your class!
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-6">Student</th>
                      <th className="py-3.5 px-4 text-center">Total Points</th>
                      <th className="py-3.5 px-4 text-center">Accuracy</th>
                      <th className="py-3.5 px-4 text-center">Quizzes Done</th>
                      <th className="py-3.5 px-6">Today's Quiz Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s) => (
                      <tr key={s.user_id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Student Name & Email */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                              {s.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{s.display_name}</p>
                              {s.email ? (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                  <Mail className="w-3 h-3 text-slate-300" />
                                  <span>{s.email}</span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 mt-0.5">Joined: {s.joined_at?.slice(0, 10)}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Total Points */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span>{s.total_points || 0} pts</span>
                          </span>
                        </td>

                        {/* Accuracy */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold ${
                            (s.accuracy || 0) >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (s.accuracy || 0) >= 50
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.accuracy || 0}%
                          </span>
                        </td>

                        {/* Quizzes Completed */}
                        <td className="py-4 px-4 text-center text-slate-600 font-semibold">
                          {s.quizzes_completed || 0}
                        </td>

                        {/* Today's Quiz Status */}
                        <td className="py-4 px-6">
                          {s.completed_today ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              <span>Completed ({s.today_score ?? 5}/5)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Pending Today</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedStudentForHistory(s)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="View student quiz history and analytics"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => handleRemoveStudent(s.user_id, s.display_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove student from class"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Daily Quiz Preview Modal */}
      {showQuizPreview && classDetails?.today_quiz_questions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-100 p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                  Quiz Preview
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Today's Quiz: {classDetails.today_quiz_topic || 'General Science'}
                </h3>
                <p className="text-xs text-slate-500">
                  5 Questions shared across your class today.
                </p>
              </div>
              <button
                onClick={() => setShowQuizPreview(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {classDetails.today_quiz_questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-900 leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                    {q.options?.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correct_index;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                              Correct ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="pl-8 pt-1">
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                        💡 <strong className="text-amber-900 not-italic">Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowQuizPreview(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Quiz History & Analytics Modal */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] shadow-2xl border border-slate-100 p-6 flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                  {selectedStudentForHistory.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedStudentForHistory.display_name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    {selectedStudentForHistory.email ? (
                      <>
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{selectedStudentForHistory.email}</span>
                      </>
                    ) : (
                      <span>Enrolled Student</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Points
                </span>
                <span className="text-lg font-extrabold text-amber-600">
                  {selectedStudentForHistory.total_points || 0} pts
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Avg Accuracy
                </span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {selectedStudentForHistory.accuracy || 0}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Completed
                </span>
                <span className="text-lg font-extrabold text-slate-800">
                  {selectedStudentForHistory.quizzes_completed || 0}
                </span>
              </div>
            </div>

            {/* Quiz Attempts List */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Quiz Attempt History
              </h4>

              {(!selectedStudentForHistory.history || selectedStudentForHistory.history.length === 0) ? (
                <div className="p-8 text-center text-slate-400 space-y-1 bg-slate-50 rounded-2xl">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No scored quizzes taken yet</p>
                  <p className="text-[11px] text-slate-400">
                    Results will appear here as soon as the student submits today's quiz.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedStudentForHistory.history.map((h, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Score: {h.score}/{h.total}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                            {h.accuracy}% Acc
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-extrabold rounded-full text-xs border border-amber-200">
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>+{h.points} pts</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 6-A, Physics 101, Python Champs"
                  className="w-full text-sm font-semibold py-3 px-4 border border-slate-200 rounded-2xl focus:border-green-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20 transition-all cursor-pointer"
                >
                  Create Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
