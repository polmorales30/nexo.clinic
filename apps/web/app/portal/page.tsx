"use client";

import { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, UtensilsCrossed, LogOut, Apple, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
type PatientSession = { id: number; name: string } | null;

// ─── Login Screen ─────────────────────────────────────────────────────────
function PatientLogin({ onLogin }: { onLogin: (s: { id: number; name: string }) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { data, error: err } = await supabase
            .from('patients')
            .select('id, name')
            .eq('portal_username', username.trim())
            .eq('portal_password', password)
            .single();
        setLoading(false);
        if (data) {
            onLogin({ id: data.id, name: data.name });
        } else {
            console.error(err);
            setError('Usuario o contraseña incorrectos.');
            setShake(true);
            setTimeout(() => setShake(false), 600);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
            <div className={`w-full max-w-md ${shake ? 'animate-bounce' : ''}`}>
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-lime-400 flex items-center justify-center font-black text-black text-2xl">N</div>
                        <span className="text-3xl font-black text-white tracking-tight">NEXO<span className="text-lime-400">.Clinic</span></span>
                    </div>
                    <p className="text-neutral-400 font-medium">Portal del Paciente</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-2">Bienvenido</h2>
                    <p className="text-neutral-500 text-sm mb-8">Accede para ver tu plan nutricional personalizado.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">Usuario</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoComplete="username"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors placeholder-neutral-700"
                                placeholder="Tu nombre de usuario"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-lime-400 transition-colors placeholder-neutral-700"
                                    placeholder="Tu contraseña"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-lime-400 text-black font-bold py-4 rounded-xl hover:bg-lime-500 disabled:opacity-60 transition-colors shadow-[0_0_30px_rgba(163,230,53,0.2)] flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><LogIn size={18} /> Entrar</>}
                        </button>
                    </form>
                </div>

                <p className="text-center text-neutral-600 text-sm mt-6">
                    ¿No tienes acceso? Contacta con tu dietista.
                </p>
            </div>
        </div>
    );
}

// ─── Diet View ────────────────────────────────────────────────────────────
const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function PatientDietView({ session, onLogout }: { session: NonNullable<PatientSession>; onLogout: () => void }) {
    const [diet, setDiet] = useState<any>(null);
    const [dietLoading, setDietLoading] = useState(true);
    const [currentDay, setCurrentDay] = useState(daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Lunes');
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from('diets')
            .select('data')
            .eq('patient_id', session.id)
            .single()
            .then(({ data }) => {
                if (data) setDiet(data.data);
                setDietLoading(false);
            });
    }, [session.id]);

    const meals = diet ? diet[currentDay] : null;

    let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
    if (meals) {
        Object.values(meals).forEach((meal: any) => {
            meal.items?.forEach((item: any) => {
                const r = (item.grams || 100) / 100;
                totalKcal += item.kcal * r;
                totalP += item.p * r;
                totalC += item.c * r;
                totalF += item.f * r;
            });
        });
    }

    if (dietLoading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Navbar */}
            <nav className="h-16 border-b border-neutral-800 flex items-center px-6 justify-between bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-lime-400 flex items-center justify-center font-bold text-black text-sm">N</div>
                    <span className="font-bold text-white">NEXO<span className="text-lime-400">.Clinic</span></span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-white">{session.name}</p>
                        <p className="text-xs text-neutral-500">Paciente</p>
                    </div>
                    <button onClick={onLogout} title="Cerrar sesión" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 hover:border-red-500/50 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-all">
                        <LogOut size={15} />
                    </button>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white">Hola, {session.name.split(' ')[0]} 👋</h1>
                    <p className="text-neutral-400 mt-1">Este es tu plan nutricional personalizado para esta semana.</p>
                </div>

                {!diet ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
                        <UtensilsCrossed size={48} className="mx-auto text-neutral-700 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Dieta no asignada</h2>
                        <p className="text-neutral-500">Tu dietista aún no ha asignado un plan nutricional. Contacta con tu clínica.</p>
                    </div>
                ) : (
                    <>
                        {/* Macros summary */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {[
                                { label: 'Kcal', value: totalKcal.toFixed(0), color: 'text-red-400', bg: 'bg-red-400/10' },
                                { label: 'Proteína', value: `${totalP.toFixed(0)}g`, color: 'text-pink-400', bg: 'bg-pink-400/10' },
                                { label: 'Carbos', value: `${totalC.toFixed(0)}g`, color: 'text-lime-400', bg: 'bg-lime-400/10' },
                                { label: 'Grasas', value: `${totalF.toFixed(0)}g`, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className={`${bg} border border-neutral-800 rounded-2xl p-4 text-center`}>
                                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                                    <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mt-1">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Day tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                            {daysOfWeek.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setCurrentDay(day)}
                                    className={`px-4 py-2 text-xs rounded-full font-bold transition-all whitespace-nowrap ${currentDay === day ? 'bg-lime-400 text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'}`}
                                >
                                    {day.slice(0, 3).toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Meals */}
                        {meals && Object.keys(meals).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(meals).map(([mealKey, meal]: [string, any]) => {
                                    const isOpen = expandedMeal === mealKey;
                                    let mKcal = 0;
                                    meal.items?.forEach((i: any) => { mKcal += i.kcal * ((i.grams || 100) / 100); });

                                    return (
                                        <div key={mealKey} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                                            <button
                                                className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-800/50 transition-colors"
                                                onClick={() => setExpandedMeal(isOpen ? null : mealKey)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                                                        <Apple size={18} className="text-lime-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{meal.name}</p>
                                                        {meal.subName && <p className="text-xs text-neutral-500 italic mt-0.5">{meal.subName}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-neutral-400">{mKcal.toFixed(0)} kcal</span>
                                                    {isOpen ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
                                                </div>
                                            </button>

                                            {isOpen && meal.items?.length > 0 && (
                                                <div className="border-t border-neutral-800 divide-y divide-neutral-800">
                                                    {meal.items.map((item: any, idx: number) => {
                                                        const r = (item.grams || 100) / 100;
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between px-5 py-3">
                                                                <div>
                                                                    <p className="font-medium text-white text-sm">{item.name}</p>
                                                                    <p className="text-xs text-neutral-500 mt-0.5">
                                                                        <span className="text-pink-400">{(item.p * r).toFixed(1)}P</span> ·{' '}
                                                                        <span className="text-lime-400">{(item.c * r).toFixed(1)}C</span> ·{' '}
                                                                        <span className="text-orange-400">{(item.f * r).toFixed(1)}G</span>
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-white text-sm">{item.grams || 100}g</p>
                                                                    <p className="text-xs text-neutral-500">{(item.kcal * r).toFixed(0)} kcal</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {isOpen && (!meal.items || meal.items.length === 0) && (
                                                <div className="border-t border-neutral-800 px-5 py-4 text-sm text-neutral-500 italic">
                                                    No hay alimentos en esta comida.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-neutral-600">
                                <p className="font-medium">No hay comidas para {currentDay}.</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// ─── Main Portal Page ─────────────────────────────────────────────────────
export default function PortalPage() {
    const [session, setSession] = useState<PatientSession>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const saved = sessionStorage.getItem('nexo-patient-session');
        if (saved) {
            try { setSession(JSON.parse(saved)); } catch { /* ignore */ }
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (s: NonNullable<PatientSession>) => {
        setSession(s);
        sessionStorage.setItem('nexo-patient-session', JSON.stringify(s));
    };

    const handleLogout = () => {
        setSession(null);
        sessionStorage.removeItem('nexo-patient-session');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) return <PatientLogin onLogin={handleLogin} />;
    return <PatientDietView session={session} onLogout={handleLogout} />;
}
