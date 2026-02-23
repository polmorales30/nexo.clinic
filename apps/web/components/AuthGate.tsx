"use client";

import { useAuth } from "./AuthContext";
import LoginScreen from "./LoginScreen";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function AuthGate({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();

    // Patient portal has its own auth — don't block it
    if (pathname?.startsWith('/portal')) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-lime-400 flex items-center justify-center font-black text-black text-2xl animate-pulse">
                        N
                    </div>
                    <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    return <>{children}</>;
}
