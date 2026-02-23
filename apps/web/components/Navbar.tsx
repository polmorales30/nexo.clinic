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
        <nav className="h-20 border-b border-neutral-800 flex items-center px-6 justify-between bg-neutral-950">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded bg-lime-400 flex items-center justify-center font-bold text-black">N</div>
                <span className="font-bold text-xl text-white tracking-tight">NEXO<span className="text-lime-400">.Clinic</span></span>
            </Link>

            <div className="flex gap-6 text-sm font-medium text-neutral-400">
                <Link href="/pacientes" className={`cursor-pointer ${pathname === "/pacientes" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Pacientes</Link>
                <Link href="/" className={`cursor-pointer ${pathname === "/" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Panel Principal</Link>
                <Link href="/creador-dietas" className={`cursor-pointer ${pathname === "/creador-dietas" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Creador Dietas</Link>
                <Link href="/progreso" className={`cursor-pointer ${pathname === "/progreso" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Progreso</Link>
                <Link href="/calendario" className={`cursor-pointer ${pathname === "/calendario" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Calendario</Link>
                <Link href="/ajustes" className={`cursor-pointer ${pathname === "/ajustes" ? "text-white border-b-2 border-lime-400 pb-1" : "hover:text-white"}`}>Ajustes</Link>
            </div>

            <div className="flex items-center gap-3">
                {displayName && (
                    <span className="text-xs text-neutral-500 font-medium hidden md:block">{displayName.split(' ')[0]}</span>
                )}
                <div className="w-10 h-10 rounded-full border-2 border-lime-400 overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-lime-400 text-sm shrink-0">
                    {avatar
                        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        : <span>{initials}</span>
                    }
                </div>
                <button
                    onClick={logout}
                    title="Cerrar sesión"
                    className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-all"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </nav>
    );
}
