import React, { useState, useEffect } from 'react';
import { generatePracticeQuiz } from '../api/client';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function PracticeQuiz({ initialTopic = '' }) {
  const [topic, setTopic] = useState(initialTopic || 'Solar System');
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      loadPractice(initialTopic);
    }
  }, [initialTopic]);

  async function loadPractice(customTopic) {
    const t = customTopic || topic;
    if (!t.trim()) return;

    setLoading(true);
    setQuizData(null);
    setSelectedAnswers({});
    setRevealed(false);

    try {
      const data = await generatePracticeQuiz(t);
      setQuizData(data);
    } catch (err) {
      console.warn('Practice quiz error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(qIdx, oIdx) {
    if (revealed) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: oIdx,
    }));
  }

  function calculateScore() {
    if (!quizData?.questions) return 0;
    return quizData.questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correct_index ? 1 : 0);
    }, 0);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Unlimited Practice Quizzes</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Test Your Knowledge Without Pressure
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Practice quizzes provide instant answers and explanations. They do not affect your class leaderboard rank!
        </p>
      </div>

      {/* Topic Input Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter any topic: Fractions, Ancient Rome, Photosynthesis..."
          className="flex-1 text-xs font-semibold py-3 px-4 border border-slate-200 rounded-2xl focus:border-blue-500 focus:outline-hidden"
        />
        <button
          onClick={() => loadPractice()}
          disabled={loading || !topic.trim()}
          className="py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Creating Quiz...' : 'Generate Practice 🎯'}</span>
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-semibold">Generating practice questions on "{topic}"...</p>
        </div>
      )}

      {quizData && !loading && (
        <div className="space-y-6 animate-in fade-in">
          {/* Anti-gaming info badge */}
          <div className="p-3 bg-slate-100 rounded-2xl text-[11px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Practice Mode: No leaderboard points awarded.</span>
            </span>
            <span className="font-bold text-slate-800">
              {Object.keys(selectedAnswers).length} of {quizData.questions.length} Answered
            </span>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {quizData.questions.map((q, qIdx) => {
              const selected = selectedAnswers[qIdx];
              const isCorrect = selected === q.correct_index;

              return (
                <div
                  key={qIdx}
                  className={`bg-white p-6 rounded-3xl border transition-all ${
                    revealed
                      ? isCorrect
                        ? 'border-green-300 bg-green-50/20'
                        : 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <h4 className="font-extrabold text-sm text-slate-900 mb-4">
                    {qIdx + 1}. {q.question}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oIdx) => {
                      const isOptionSelected = selected === oIdx;
                      let btnStyle = 'border-slate-200 hover:border-slate-300 text-slate-700';

                      if (revealed) {
                        if (oIdx === q.correct_index) {
                          btnStyle = 'border-green-500 bg-green-100 text-green-900 font-bold';
                        } else if (isOptionSelected && !isCorrect) {
                          btnStyle = 'border-rose-400 bg-rose-100 text-rose-900 line-through';
                        }
                      } else if (isOptionSelected) {
                        btnStyle = 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/20';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelect(qIdx, oIdx)}
                          className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${btnStyle}`}
                        >
                          {oIdx + 1}) {opt}
                        </button>
                      );
                    })}
                  </div>

                  {revealed && (
                    <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                      <span className="font-extrabold text-slate-900 block mb-0.5">Explanation:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                disabled={Object.keys(selectedAnswers).length < quizData.questions.length}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all"
              >
                Check My Practice Answers 📝
              </button>
            ) : (
              <div className="w-full flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200">
                <span className="text-sm font-extrabold text-slate-900">
                  Practice Result: {calculateScore()} / {quizData.questions.length} Correct ⭐
                </span>
                <button
                  onClick={() => loadPractice()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Another Quiz</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
