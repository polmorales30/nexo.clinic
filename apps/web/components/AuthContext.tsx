"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "nexo2025";
const SESSION_KEY = "nexo-session";
const CREDENTIALS_KEY = "nexo-credentials";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    currentUser: string | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    changeCredentials: (newUsername: string, newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    useEffect(() => {
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed.authenticated && parsed.username) {
                    setIsAuthenticated(true);
                    setCurrentUser(parsed.username);
                }
            } catch {
                localStorage.removeItem(SESSION_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const getCredentials = () => {
        const stored = localStorage.getItem(CREDENTIALS_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
            }
        }
        return { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
    };

    const login = (username: string, password: string): boolean => {
        const creds = getCredentials();
        if (username === creds.username && password === creds.password) {
            const session = { authenticated: true, username };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            setIsAuthenticated(true);
            setCurrentUser(username);
            return true;
        }
        return false;
    };

    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    const changeCredentials = (newUsername: string, newPassword: string) => {
        localStorage.setItem(
            CREDENTIALS_KEY,
            JSON.stringify({ username: newUsername, password: newPassword })
        );
        // Update session with new username
        const session = { authenticated: true, username: newUsername };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setCurrentUser(newUsername);
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, isLoading, currentUser, login, logout, changeCredentials }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
