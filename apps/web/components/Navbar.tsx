"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";

export default function Navbar() {
    const pathname = usePathname();
    const { logout, currentUser } = useAuth();
    const [avatar, setAvatar] = useState('');
    const [profileName, setProfileName] = useState('');

    useEffect(() => {
        const loadProfile = () => {
            const saved = localStorage.getItem('nexo-ajustes');
            if (saved) {
                const parsed = JSON.parse(saved);
                setAvatar(parsed.avatar || '');
                setProfileName(parsed.name || '');
            }
        };
        loadProfile();
        window.addEventListener('storage', loadProfile);
        return () => window.removeEventListener('storage', loadProfile);
    }, []);

    const displayName = profileName || currentUser || '';
    const initials = displayName.split(' ')
        .filter((w: string) => w.length > 1 && w[0] === w[0]?.toUpperCase())
        .slice(0, 2).map((w: string) => w[0]).join('')
        || displayName.charAt(0).toUpperCase();

    return (
        <nav className="h-16 border-b border-slate-200 flex items-center px-6 justify-between bg-white shadow-sm">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="Noya Centre Logo" className="h-9 w-auto" />
            </Link>

            <div className="flex gap-1 text-sm font-semibold text-slate-600">
                <Link href="/pacientes" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/pacientes" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Pacientes</Link>
                <Link href="/" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Panel Principal</Link>
                <Link href="/creador-dietas" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/creador-dietas" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Creador Dietas</Link>
                <Link href="/progreso" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/progreso" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Progreso</Link>
                <Link href="/calendario" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/calendario" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Calendario</Link>
                <Link href="/ajustes" className={`cursor-pointer px-4 py-2 rounded-lg transition-all ${pathname === "/ajustes" ? "bg-red-600 text-slate-900 font-bold" : "hover:text-slate-900 hover:bg-slate-50"}`}>Ajustes</Link>
            </div>

            <div className="flex items-center gap-3">
                {displayName && (
                    <span className="text-xs text-slate-600 font-medium hidden md:block">{displayName.split(' ')[0]}</span>
                )}
                <div className="w-10 h-10 rounded-full border-2 border-red-500 overflow-hidden bg-slate-50 flex items-center justify-center font-bold text-red-600 text-sm shrink-0">
                    {avatar
                        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        : <span>{initials}</span>
                    }
                </div>
                <button
                    onClick={logout}
                    title="Cerrar sesión"
                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 hover:border-red-400 hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-all"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </nav>
    );
}
