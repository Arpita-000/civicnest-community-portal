"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import api, { clearApiCache } from "../lib/api";

export interface DbUser {
  _id?: string;
  uid?: string;
  email: string;
  name?: string;
  role?: string;
  isVolunteer?: boolean;
  points?: number;
  photoURL?: string;
  coverPhoto?: string;
  phone?: string;
  area?: string;
  streetAddress?: string;
  apartmentNumber?: string;
  bio?: string;
  memberId?: string;
  badges?: string[];
  streak?: { current: number; best: number; lastActiveDate?: string | null };
  createdAt?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  role: string;
  isMember: boolean;
  /** true until Firebase has told us whether someone is signed in */
  loading: boolean;
  registerUser: (email: string, pass: string, name?: string, photoURL?: string) => Promise<any>;
  signInUser: (email: string, pass: string) => Promise<any>;
  signInGoogle: () => Promise<any>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncProfile: (extra?: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const CACHE_KEY = "civicnest_cached_user";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Set while registerUser() is running so the auth listener doesn't create the profile
  // before the display name has been written.
  const registering = useRef(false);

  const remember = (u: DbUser | null) => {
    setDbUser(u);
    try {
      if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
      else localStorage.removeItem(CACHE_KEY);
    } catch {}
  };

  /** Create the MongoDB profile on first sign-in, otherwise just touch lastLogin. One request. */
  const syncProfile = useCallback(async (extra: Record<string, any> = {}) => {
    try {
      const res = await api.post("/users", extra);
      if (res.data?.user) remember(res.data.user);
    } catch (err) {
      console.warn("Profile sync failed:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get("/users/my", { fresh: true });
      if (res.data) remember(res.data);
    } catch (err) {
      console.warn("Profile refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    // Paint the navbar avatar instantly from the last session while Firebase initialises.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setDbUser(JSON.parse(cached));
    } catch {}

    return onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setLoading(false);
      clearApiCache();
      if (!fbUser) {
        remember(null);
        return;
      }
      if (!registering.current) void syncProfile();
    });
  }, [syncProfile]);

  const registerUser = async (email: string, pass: string, name?: string, photoURL?: string) => {
    registering.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name || photoURL) await updateProfile(cred.user, { ...(name && { displayName: name }), ...(photoURL && { photoURL }) });
      await cred.user.getIdToken(true); // refresh so the token carries the new display name
      await syncProfile({ ...(name && { name }), ...(photoURL && { photoURL }) });
      setUser(auth.currentUser);
      return cred;
    } finally {
      registering.current = false;
    }
  };

  const signInUser = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
  const signInGoogle = () => signInWithPopup(auth, googleProvider);

  const signOutUser = async () => {
    await signOut(auth);
    remember(null);
    clearApiCache();
  };

  const role = dbUser?.role || "guest";
  const value = useMemo(
    () => ({
      user,
      dbUser,
      role,
      isMember: role === "member" || role === "admin" || !!dbUser?.isVolunteer,
      loading,
      registerUser,
      signInUser,
      signInGoogle,
      signOutUser,
      refreshProfile,
      syncProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, dbUser, role, loading, refreshProfile, syncProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
