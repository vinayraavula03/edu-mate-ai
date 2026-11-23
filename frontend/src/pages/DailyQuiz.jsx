import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTodayQuiz, submitQuizAttempt } from '../api/client';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  Award,
  Sparkles,
  AlertCircle,
  School,
} from 'lucide-react';

const TIMER_SECONDS = 30;

export default function DailyQuiz({ onGoToLeaderboard, onOpenJoinModal }) {
  const { token, activeClass } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousResult, setPreviousResult] = useState(null);

  // In-quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuiz() {
      if (!activeClass?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await fetchTodayQuiz(activeClass.id, token);
        setQuizData(data);
        if (data.already_completed) {
          setAlreadyCompleted(true);
          setPreviousResult({
            score: data.previous_score ?? 5,
            points: data.previous_points ?? 70,
          });
        }
      } catch (err) {
        setError(err.message || 'Could not load quiz.');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [activeClass, token]);

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || submissionResult || alreadyCompleted) return;

    if (timeLeft <= 0) {
      handleNextQuestion();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeLeft, submissionResult, alreadyCompleted, currentIdx]);

  function handleOptionSelect(optIndex) {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIndex,
    }));
  }

  function handleNextQuestion() {
    if (!quizData) return;
    const questions = quizData.questions || [];

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setTimeLeft(TIMER_SECONDS);
    } else {
      // Last question reached - submit to server
      handleSubmitQuiz();
    }
  }

  async function handleSubmitQuiz() {
    if (!quizData) return;
    setSubmitting(true);
    setError('');

    const questions = quizData.questions || [];
    const answersArray = questions.map((_, i) =>
      selectedAnswers[i] !== undefined ? selectedAnswers[i] : -1
    );

    try {
      const result = await submitQuizAttempt(
        quizData.quiz_id,
        quizData.class_id,
        answersArray,
        token
      );
      setSubmissionResult(result);
    } catch (err) {
      setError(err.message || 'Error submitting quiz.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeClass) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Please Join a Class First</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Daily quizzes are shared inside your class. Enter the 6-character code given by your teacher to unlock your quiz!
        </p>
        <button
          onClick={onOpenJoinModal}
          className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/20"
        >
          Enter Join Code 🏫
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Loading today's class quiz...</p>
      </div>
    );
  }

  // View: Already completed earlier today
  if (alreadyCompleted && !submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Quiz Already Completed Today! 🎉
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              You scored <span className="font-bold text-green-600">{previousResult?.score ?? 5}/5</span> on today's challenge.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 max-w-sm mx-auto">
            🔒 Fairness rule: Only 1 scored attempt is allowed per student per day to keep class points completely trustworthy.
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={onGoToLeaderboard}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Check Class Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Completed right now with submission result
  if (submissionResult) {
    const { score, total, points, accuracy, points_breakdown, question_details } = submissionResult;
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
        {/* Results Hero Header */}
        <div className="bg-gradient-to-tr from-green-600 to-emerald-600 rounded-3xl p-8 text-white text-center shadow-xl shadow-green-600/15 relative overflow-hidden">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">
            Superstar Effort!
          </h2>
          <p className="text-xs text-green-100">
            Answers scored server-side • Points credited to your class standing
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-6">
            <div className="bg-white/20 backdrop-blur-xs p-3.5 rounded-2xl">
              <div className="text-xs uppercase font-bold text-green-100">Score</div>
              <div className="text-2xl font-extrabold">{score} / {total}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xs p-3.5 rounded-2xl">
              <div className="text-xs uppercase font-bold text-green-100">Accuracy</div>
              <div className="text-2xl font-extrabold">{accuracy}%</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xs p-3.5 rounded-2xl">
              <div className="text-xs uppercase font-bold text-green-100">Earned</div>
              <div className="text-2xl font-extrabold">+{points} pts</div>
            </div>
          </div>
        </div>

        {/* Points Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Points Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Correct Answers:</span>
              <span className="font-extrabold text-slate-900">+{points_breakdown.base_points} pts</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Completion Bonus:</span>
              <span className="font-extrabold text-slate-900">+{points_breakdown.completion_bonus} pts</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Perfect 5/5 Bonus:</span>
              <span className="font-extrabold text-slate-900">+{points_breakdown.perfect_bonus} pts</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">First Quiz of Day:</span>
              <span className="font-extrabold text-slate-900">+{points_breakdown.first_attempt_bonus} pts</span>
            </div>
          </div>
        </div>

        {/* Question by question explanations */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Review & Explanations</h3>
          {question_details.map((q, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border text-xs ${
                q.is_correct ? 'bg-green-50/50 border-green-200' : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="font-bold text-slate-900">
                  Q{idx + 1}: {q.question}
                </span>
                {q.is_correct ? (
                  <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded font-bold shrink-0">
                    Correct (+10)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-bold shrink-0">
                    Incorrect
                  </span>
                )}
              </div>

              <div className="space-y-1 mb-3">
                {q.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className={`px-3 py-1.5 rounded-lg font-medium ${
                      oIdx === q.correct_index
                        ? 'bg-green-200/80 font-bold text-green-900'
                        : oIdx === q.selected_index && !q.is_correct
                        ? 'bg-rose-200/80 text-rose-900 line-through'
                        : 'text-slate-600'
                    }`}
                  >
                    {oIdx + 1}) {opt} {oIdx === q.correct_index && '✓ (Correct Answer)'}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/60 text-slate-700">
                <span className="font-bold text-slate-900 block mb-0.5">Explanation:</span>
                {q.explanation}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onGoToLeaderboard}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-purple-600/20 transition-all inline-flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            <span>See Your Live Rank on Class Leaderboard 🚀</span>
          </button>
        </div>
      </div>
    );
  }

  // View: Ready to Start Quiz Intro
  if (!quizStarted) {
    const questions = quizData?.questions || [];
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Shared Daily Challenge
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
              Today's Quiz: {quizData?.topic || 'Science & Wonders'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              All students in <span className="font-bold text-slate-700">{activeClass.name}</span> answer the same questions!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left max-w-md mx-auto text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Questions</span>
              <span className="font-extrabold text-slate-900">{questions.length} Questions</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Timer</span>
              <span className="font-extrabold text-slate-900">30s / Question</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Points</span>
              <span className="font-extrabold text-green-700">+70 Points</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs rounded-2xl text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Anti-Gaming Rules</span>
            </div>
            <p className="text-[11px] text-amber-800">
              • Only one scored attempt per quiz per day.<br />
              • Answers are evaluated server-side.<br />
              • Ties on leaderboard broken by higher accuracy, then earlier submission time.
            </p>
          </div>

          <button
            onClick={() => {
              setQuizStarted(true);
              setTimeLeft(TIMER_SECONDS);
            }}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-green-600/25 transition-all transform hover:-translate-y-0.5"
          >
            Start Quiz Now 🚀
          </button>
        </div>
      </div>
    );
  }

  // View: Active Question Solving
  const questions = quizData?.questions || [];
  const currentQ = questions[currentIdx];
  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Quiz Top Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>Question {currentIdx + 1} of {questions.length}</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
          <span className={`font-mono text-sm ${timeLeft <= 5 ? 'text-rose-600 font-extrabold' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Progress & Countdown Bar */}
      <div className="space-y-1">
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-green-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 12 ? 'bg-amber-400' : 'bg-blue-400'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
          {currentQ?.question}
        </h3>

        <div className="space-y-3">
          {currentQ?.options?.map((opt, oIdx) => {
            const isSelected = selectedAnswers[currentIdx] === oIdx;
            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleOptionSelect(oIdx)}
                className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-green-500 bg-green-50 text-green-900 shadow-sm ring-2 ring-green-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>{opt}</span>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                    isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {isSelected && '✓'}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleNextQuestion}
            disabled={submitting}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>
              {submitting
                ? 'Submitting & Scoring...'
                : currentIdx + 1 === questions.length
                ? 'Submit Quiz 🏁'
                : 'Next Question ➡️'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
