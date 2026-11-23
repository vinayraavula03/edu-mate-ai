import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await applySession(session);
        }
      } catch (err) {
        console.warn('Session init error:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await applySession(session);
      } else {
        setUser(null);
        setToken(null);
        setRole('student');
        setDisplayName('');
        setActiveClass(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function applySession(session) {
    const u = session.user;
    setUser(u);
    setToken(session.access_token);

    let userRole = u.user_metadata?.role || 'student';
    let userDisplayName = u.user_metadata?.display_name || u.user_metadata?.nickname || u.email?.split('@')[0] || 'Learner';

    // Fetch confirmed profile from Supabase profiles table
    try {
      const { data: profile } = await supabase
        .table('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      if (profile) {
        if (profile.role) userRole = profile.role;
        if (profile.display_name) userDisplayName = profile.display_name;
      }
    } catch {
      // Profiles query error ignored
    }

    setRole(userRole);
    setDisplayName(userDisplayName);

    // Fetch user's class
    try {
      if (userRole === 'teacher') {
        const { data: classes } = await supabase
          .table('classes')
          .select('*')
          .eq('teacher_id', u.id)
          .order('created_at', { ascending: false });

        if (classes && classes.length > 0) {
          setActiveClass(classes[0]);
        }
      } else {
        const { data: memberships } = await supabase
          .table('class_members')
          .select('class_id, classes(*)')
          .eq('user_id', u.id)
          .order('joined_at', { ascending: false });

        if (memberships && memberships.length > 0 && memberships[0].classes) {
          setActiveClass(memberships[0].classes);
        }
      }
    } catch {
      // Class query error ignored
    }
  }

  async function login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.session) {
        await applySession(data.session);
        return { success: true };
      }
      return { success: false, error: 'Could not establish session.' };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  }

  async function signup({ email, password, role: selectedRole, nickname }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            display_name: nickname || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        await applySession(data.session);
        return { success: true, message: 'Account created successfully!' };
      }

      return {
        success: true,
        message: 'Sign up successful! Please check your email inbox to confirm your account.',
      };
    } catch (err) {
      return { success: false, error: err.message || 'Signup failed.' };
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Password reset link sent to your email.' };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to send reset email.' };
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setRole('student');
    setDisplayName('');
    setToken(null);
    setActiveClass(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        displayName,
        token,
        activeClass,
        setActiveClass,
        loading,
        login,
        signup,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
