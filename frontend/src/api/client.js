import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gemqtoireurviztxghep.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_B1soirW2kLwxXY6g1MiSbw_6ZDa-6R8';
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchMyClasses(token) {
  const res = await fetch(`${API_BASE}/classes/my`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch classes');
  return res.json();
}

export async function createClass(name, token) {
  const res = await fetch(`${API_BASE}/classes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create class');
  return res.json();
}

export async function joinClass(joinCode, token) {
  const res = await fetch(`${API_BASE}/classes/join`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ join_code: joinCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to join class');
  return data;
}

export async function fetchClassDetails(classId, token) {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch class details');
  return res.json();
}

export async function regenerateJoinCode(classId, token) {
  const res = await fetch(`${API_BASE}/classes/${classId}/regenerate-code`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  return res.json();
}

export async function removeStudentFromClass(classId, userId, token) {
  const res = await fetch(`${API_BASE}/classes/${classId}/students/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return res.json();
}

export async function fetchTodayQuiz(classId, token) {
  const res = await fetch(`${API_BASE}/quiz/today?class_id=${classId}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch today\'s quiz');
  return res.json();
}

export async function submitQuizAttempt(quizId, classId, answers, token) {
  const res = await fetch(`${API_BASE}/quiz/submit`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      quiz_id: quizId,
      class_id: classId,
      answers: answers,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to submit quiz');
  return data;
}

export async function generatePracticeQuiz(topic, language = 'English') {
  const res = await fetch(`${API_BASE}/quiz/practice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, language }),
  });
  return res.json();
}

export async function setDailyQuizTopic(classId, topic, token) {
  const res = await fetch(`${API_BASE}/quiz/set-daily`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ class_id: classId, topic }),
  });
  return res.json();
}

export async function createCustomDailyQuiz(classId, topic, questions, token) {
  const res = await fetch(`${API_BASE}/quiz/custom-daily`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ class_id: classId, topic, questions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to publish custom quiz');
  return data;
}

export async function setClassAnnouncement(classId, announcement, token) {
  const res = await fetch(`${API_BASE}/classes/${classId}/announcement`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ announcement }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to post announcement');
  return data;
}

export async function deleteClassAnnouncement(classId, token) {
  const res = await fetch(`${API_BASE}/classes/${classId}/announcement`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return res.json();
}

export async function fetchLeaderboard(classId, range = 'daily', token) {
  const res = await fetch(`${API_BASE}/leaderboard?class_id=${classId}&range=${range}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function fetchTeacherInsights(classId, token) {
  const res = await fetch(`${API_BASE}/teacher/insights?class_id=${classId}`, {
    headers: getHeaders(token),
  });
  return res.json();
}

export async function fetchUserProfile(token) {
  const res = await fetch(`${API_BASE}/profile`, {
    headers: getHeaders(token),
  });
  return res.json();
}

export async function fetchUserHistory(token) {
  const res = await fetch(`${API_BASE}/history`, {
    headers: getHeaders(token),
  });
  return res.json();
}

export async function fetchTopicImage(topic) {
  try {
    const res = await fetch(`${API_BASE}/explain/image?topic=${encodeURIComponent(topic)}`);
    return await res.json();
  } catch {
    return {
      image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop',
      caption: `Learning about ${topic}`,
      source: 'fallback',
    };
  }
}

export async function uploadNotesFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/explain/upload-notes`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function streamExplanation({
  topic,
  notesText,
  language,
  friend,
  mode,
  token,
  onChunk,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        topic,
        notes_text: notesText,
        language,
        friend,
        mode,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to start AI explanation stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // retain incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') {
            if (onDone) onDone();
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.chunk && onChunk) {
              onChunk(parsed.chunk);
            }
          } catch {
            // raw text chunk fallback
            if (onChunk) onChunk(dataStr);
          }
        }
      }
    }

    if (onDone) onDone();
  } catch (err) {
    if (onError) onError(err);
  }
}

export function subscribeToClassAttempts(classId, callback) {
  try {
    const channel = supabase
      .channel(`realtime-attempts-${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          if (callback) callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
