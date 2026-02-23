"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    currentUser: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    changeCredentials: (newEmail: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    const handleUser = (user: User | null) => {
        if (user) {
            setIsAuthenticated(true);
            setCurrentUser(user.email ?? user.id);
        } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return !error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const changeCredentials = async (newEmail: string, newPassword: string): Promise<{ error: string | null }> => {
        const updates: { email?: string; password?: string } = {};
        if (newEmail && newEmail !== currentUser) updates.email = newEmail;
        if (newPassword) updates.password = newPassword;
        if (Object.keys(updates).length === 0) return { error: null };

        const { error } = await supabase.auth.updateUser(updates);
        return { error: error?.message ?? null };
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, currentUser, login, logout, changeCredentials }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
