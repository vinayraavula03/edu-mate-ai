import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { streamExplanation, fetchTopicImage, uploadNotesFile } from '../api/client';
import {
  Sparkles,
  Mic,
  MicOff,
  Upload,
  Volume2,
  VolumeX,
  Send,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

const CHARACTERS = [
  { id: 'Edu the Elephant 🐘', name: 'Edu the Elephant', emoji: '🐘', desc: 'Wise, playful and warm analogies' },
  { id: 'Zara the Curious Robot 🤖', name: 'Zara the Robot', emoji: '🤖', desc: 'Tech logic circuits & beep-boop fun' },
  { id: 'Leo the Lion 🦁', name: 'Leo the Lion', emoji: '🦁', desc: 'Brave, cheerful champion energy' },
  { id: 'Mia the Magic Butterfly 🦋', name: 'Mia Butterfly', emoji: '🦋', desc: 'Sparkly wonders & enchanted adventures' },
];

const LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Tamil', 'Telugu',
  'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi',
  'Arabic', 'Japanese', 'Korean', 'Chinese', 'Russian', 'Portuguese',
  'Italian', 'Dutch', 'Turkish', 'Vietnamese', 'Thai', 'Indonesian',
  'Polish', 'Swedish', 'Greek', 'Hebrew', 'Urdu'
];

export default function LearnBuddy({ onStartPracticeWithTopic }) {
  const { token } = useAuth();

  // Inputs
  const [topic, setTopic] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractedNotes, setExtractedNotes] = useState('');
  const [language, setLanguage] = useState('English');
  const [selectedFriend, setSelectedFriend] = useState(CHARACTERS[0].id);
  const [mode, setMode] = useState('Explain Normally');
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);

  // States
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [topicImage, setTopicImage] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');

  const responseEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Setup Web Speech API for Mic
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTopic(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  function toggleSpeechRecognition() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your topic.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  }

  // Text to speech (browser Web Speech API)
  function speakResponse(text) {
    if (!voiceSpeechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 1500));
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadedFileName(file.name);
    try {
      const res = await uploadNotesFile(file);
      setExtractedNotes(res.text || '');
      setTopic(file.name.replace(/\.[^/.]+$/, ''));
    } catch {
      setExtractedNotes('Failed to read file.');
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAskAI(e) {
    e?.preventDefault();
    if (!topic.trim() && !extractedNotes.trim()) return;

    setIsStreaming(true);
    setStreamedResponse('');
    setError('');
    window.speechSynthesis?.cancel();

    // Fetch educational image concurrently
    fetchTopicImage(topic || 'Science').then((img) => setTopicImage(img));

    let accumulatedText = '';

    await streamExplanation({
      topic: topic.trim(),
      notesText: extractedNotes.trim(),
      language,
      friend: selectedFriend,
      mode,
      token,
      onChunk: (chunk) => {
        accumulatedText += chunk;
        setStreamedResponse((prev) => prev + chunk);
      },
      onDone: () => {
        setIsStreaming(false);
        if (voiceSpeechEnabled && accumulatedText) {
          speakResponse(accumulatedText);
        }
      },
      onError: (err) => {
        setIsStreaming(false);
        setError(err.message || 'Error communicating with AI buddy.');
      },
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive AI Study Buddy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Learn Any Topic in Your Own Style
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Pick your favorite character, language, and mode. Answers stream word-by-word with zero wait!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column (Left) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Character Selector */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Choose Your Buddy
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedFriend(char.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedFriend === char.id
                      ? 'border-green-500 bg-green-50 shadow-xs ring-2 ring-green-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{char.emoji}</div>
                  <div className="font-extrabold text-xs text-slate-900">{char.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{char.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language & Mode Controls */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Language (30+)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-2.5 border border-slate-200 rounded-xl focus:border-green-500 focus:outline-hidden bg-white"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Voice Speech
                </label>
                <button
                  type="button"
                  onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
                  className={`w-full py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    voiceSpeechEnabled
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {voiceSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{voiceSpeechEnabled ? 'Sound ON' : 'Sound OFF'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Explanation Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('Explain Normally')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    mode === 'Explain Normally'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  📘 Clear & Simple
                </button>
                <button
                  type="button"
                  onClick={() => setMode('Explain as a Story')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    mode === 'Explain as a Story'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🏰 Adventure Story
                </button>
              </div>
            </div>
          </div>

          {/* Ask Input Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. What Do You Want to Learn?
            </label>

            <div className="relative">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why is the sky blue? or How does the water cycle work?"
                rows={3}
                className="w-full text-xs font-medium p-3.5 border border-slate-200 rounded-2xl focus:border-green-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Quick Voice & PDF Upload Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isRecording
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-500" />}
                <span>{isRecording ? 'Listening...' : 'Speak Question'}</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-blue-500" />
                <span>{uploadLoading ? 'Reading PDF...' : 'Upload Notes / PDF'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedFileName && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{uploadedFileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setUploadedFileName(''); setExtractedNotes(''); }}
                  className="text-blue-500 hover:text-blue-700 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={handleAskAI}
              disabled={isStreaming || (!topic.trim() && !extractedNotes.trim())}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isStreaming ? 'Streaming Explanation...' : 'Ask EduMate 🚀'}</span>
            </button>
          </div>
        </div>

        {/* Output Column (Right) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between">
            <div>
              {/* Header inside response */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">
                    {CHARACTERS.find((c) => c.id === selectedFriend)?.emoji || '🐘'}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {selectedFriend}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {mode} • {language}
                    </p>
                  </div>
                </div>

                {streamedResponse && (
                  <button
                    onClick={() => speakResponse(streamedResponse)}
                    className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                    title="Listen to this explanation"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Streaming Content */}
              {streamedResponse ? (
                <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {streamedResponse}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse" />
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 space-y-3">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold">
                    Type a question or speak above to start learning!
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Try "What is photosynthesis?" or upload your science chapter notes.
                  </p>
                </div>
              )}

              {/* Topic Educational Image */}
              {topicImage?.image_url && streamedResponse && (
                <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                  <img
                    src={topicImage.image_url}
                    alt={topicImage.caption}
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-2.5 bg-slate-50 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                    <span className="truncate">{topicImage.caption}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      {topicImage.source}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {streamedResponse && !isStreaming && (
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Saved to your History</span>
                </span>

                <button
                  onClick={() => onStartPracticeWithTopic(topic)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Take Practice Quiz on This Topic</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
