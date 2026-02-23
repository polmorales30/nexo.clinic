"use client";

import { useState, useRef } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff, Lock, User, LogIn } from "lucide-react";

export default function LoginScreen() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError("Por favor introduce usuario y contraseña.");
            triggerShake();
            return;
        }
        setLoading(true);
        setError("");

        // Small delay for UX polish
        await new Promise((r) => setTimeout(r, 600));

        const success = login(username.trim(), password);
        if (!success) {
            setError("Usuario o contraseña incorrectos.");
            triggerShake();
            setPassword("");
        }
        setLoading(false);
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime-400/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-lime-400/8 blur-[100px] rounded-full pointer-events-none" />

            <div
                ref={formRef}
                style={shake ? { animation: "shake 0.55s ease" } : {}}
                className="w-full max-w-md relative z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-lime-400 flex items-center justify-center font-black text-black text-3xl shadow-[0_0_40px_rgba(163,230,53,0.35)] mb-4">
                        N
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        NEXO<span className="text-lime-400">.Clinic</span>
                    </h1>
                    <p className="text-neutral-500 text-sm mt-2 font-medium">
                        Panel de Administración Profesional
                    </p>
                </div>

                {/* Card */}
                <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-white text-xl font-bold mb-1">Iniciar Sesión</h2>
                    <p className="text-neutral-500 text-sm mb-8 font-medium">
                        Accede con tus credenciales de acceso
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral-400 mb-2">
                                Usuario
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Tu nombre de usuario"
                                    autoComplete="username"
                                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-lime-400 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 outline-none transition-colors text-sm font-medium"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral-400 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-lime-400 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-neutral-600 outline-none transition-colors text-sm font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(163,230,53,0.25)] hover:shadow-[0_0_35px_rgba(163,230,53,0.4)] text-sm mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-neutral-700 text-xs mt-6 font-medium">
                    NEXO.Clinic © 2025 · Acceso seguro y privado
                </p>
            </div>

            {/* Shake keyframe */}
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-8px); }
          30%, 70% { transform: translateX(8px); }
        }
      `}</style>
        </div>
    );
}
