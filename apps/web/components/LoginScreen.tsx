"use client";

import { useState, useRef } from "react";
import { useAuth } from "./AuthContext";
import { LogIn, Eye, EyeOff, User, Lock } from "lucide-react";

export default function LoginScreen() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shake, setShake] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const ok = await login(username, password);
        setLoading(false);
        if (!ok) {
            setError('Email o contraseña incorrectos');
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />

            <div
                ref={formRef}
                style={shake ? { animation: "shake 0.55s ease" } : {}}
                className="w-full max-w-md relative z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-10">
                    <img src="/logo.png" alt="Noya Centre Logo" className="h-20 w-auto mb-4" />
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Panel de Administración Profesional
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
                    <h2 className="text-slate-900 text-xl font-bold mb-1">Iniciar Sesión</h2>
                    <p className="text-slate-500 text-sm mb-8 font-medium">
                        Accede con tus credenciales de acceso
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <User size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl pl-11 pr-4 py-3.5 text-slate-900 placeholder-gray-400 outline-none transition-colors text-sm font-medium"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl pl-11 pr-12 py-3.5 text-slate-900 placeholder-gray-400 outline-none transition-colors text-sm font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-sm mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

                <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                    NOYA CENTRE © 2025 · Acceso seguro y privado
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
