"use client";

import { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, UtensilsCrossed, LogOut, Apple, ChevronDown, ChevronUp, ClipboardList, Plus, X, CheckCircle2, Replace, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import foodDatabase from '../../data/foodDatabase.json';
import { calculateSwapQuantity, detectPrimaryMacro } from '../../lib/swapping';

// ─── Types ───────────────────────────────────────────────────────────────────
type PatientSession = { id: number; name: string } | null;
type Tab = 'dieta' | 'compra' | 'checkin' | 'chat';

type CheckIn = {
    id: number;
    date: string;
    weight?: string;
    chest?: string;
    waist?: string;
    hip?: string;
    biceps?: string;
    clavicle?: string;
    quadriceps?: string;
    fat_percent?: string;
    photo_front_url?: string;
    photo_back_url?: string;
    notes?: string;
};

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
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className={`w-full max-w-md ${shake ? 'animate-bounce' : ''}`}>
                <div className="text-center mb-10">
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-b-3xl border-b border-slate-200 pointer-events-none relative z-10 w-full mb-8">
                        <img src="/logo.png" alt="Noya Centre Logo" className="h-16 w-auto mb-2 drop-shadow-lg" />
                    </div>
                    <p className="text-slate-600 font-medium">Portal del Paciente</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido</h2>
                    <p className="text-slate-500 text-sm mb-8">Accede para ver tu plan nutricional personalizado.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Usuario</label>
                            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-colors placeholder-neutral-700"
                                placeholder="Tu nombre de usuario" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Contraseña</label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 focus:outline-none focus:border-red-400 transition-colors placeholder-neutral-700"
                                    placeholder="Tu contraseña" />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && <div className="bg-red-50 border border-red-500/30 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">{error}</div>}

                        <button type="submit" disabled={loading}
                            className="w-full bg-red-600 text-black font-bold py-4 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2">
                            {loading ? <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><LogIn size={18} /> Entrar</>}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-500 text-sm mt-6">¿No tienes acceso? Contacta con tu dietista.</p>
            </div>
        </div>
    );
}

// ─── Diet View ────────────────────────────────────────────────────────────
const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Meal display order: Desayuno → Media Mañana → Comida → Merienda → Cena → Recena
const MEAL_ORDER = ['desayuno', 'media', 'mañana', 'comida', 'almuerzo', 'merienda', 'cena', 'recena'];
const getMealOrder = (mealKey: string) => {
    const k = mealKey.toLowerCase();
    const idx = MEAL_ORDER.findIndex(m => k.includes(m));
    return idx === -1 ? 99 : idx;
};

function DietTab({ session }: { session: NonNullable<PatientSession> }) {
    const [diet, setDiet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentDay, setCurrentDay] = useState(daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Lunes');
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

    // Swap Modal State
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [itemToSwap, setItemToSwap] = useState<{ mealKey: string, index: number, item: any } | null>(null);
    const [swapOptions, setSwapOptions] = useState<any[]>([]);

    useEffect(() => {
        supabase.from('diets').select('data').eq('patient_id', session.id).maybeSingle().then(({ data }) => {
            if (data?.data) setDiet(data.data);
            setLoading(false);
        });
    }, [session.id]);

    const openSwapModal = (mealKey: string, index: number, item: any) => {
        setItemToSwap({ mealKey, index, item });

        const foodItem = { name: item.name, p: item.p, c: item.c, f: item.f, kcal: item.kcal };
        const primaryMacro = detectPrimaryMacro(foodItem);

        const options = (foodDatabase as any[]).filter(dbItem =>
            dbItem.name !== item.name &&
            detectPrimaryMacro(dbItem) === primaryMacro
        ).map(dbItem => {
            const newGrams = calculateSwapQuantity(foodItem, item.grams || 100, dbItem, primaryMacro);
            return { ...dbItem, suggestedGrams: newGrams };
        }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 12);

        setSwapOptions(options);
        setSwapModalOpen(true);
    };

    const confirmSwap = async (selectedOption: any) => {
        if (!itemToSwap || !diet) return;
        const { mealKey, index } = itemToSwap;

        const updatedDiet = JSON.parse(JSON.stringify(diet));

        const newItem = {
            id: selectedOption.id || Date.now().toString(),
            name: selectedOption.name,
            grams: selectedOption.suggestedGrams,
            p: selectedOption.p,
            c: selectedOption.c,
            f: selectedOption.f,
            kcal: selectedOption.kcal,
            isSwappable: true
        };

        if (updatedDiet.weeklyDiet) {
            updatedDiet.weeklyDiet[currentDay][mealKey].items[index] = newItem;
        } else {
            updatedDiet[currentDay][mealKey].items[index] = newItem;
        }

        setDiet(updatedDiet);
        setSwapModalOpen(false);
        setItemToSwap(null);

        await supabase.from('diets').update({ data: updatedDiet }).eq('patient_id', session.id);
    };

    const weeklyDiet = diet?.weeklyDiet || (diet && !diet.chatHistory && !diet.userGoals ? diet : null);
    const meals = weeklyDiet ? weeklyDiet[currentDay] : null;
    let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
    if (meals) {
        Object.values(meals).forEach((meal: any) => {
            meal.items?.forEach((item: any) => {
                const r = (item.grams || 100) / 100;
                totalKcal += item.kcal * r; totalP += item.p * r; totalC += item.c * r; totalF += item.f * r;
            });
        });
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /></div>;

    return !weeklyDiet ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <UtensilsCrossed size={48} className="mx-auto text-neutral-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Dieta no asignada</h2>
            <p className="text-slate-500">Tu dietista aún no ha asignado un plan nutricional.</p>
        </div>
    ) : (
        <>
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Kcal', value: totalKcal.toFixed(0), color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Proteína', value: `${totalP.toFixed(0)}g`, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { label: 'Carbos', value: `${totalC.toFixed(0)}g`, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Grasas', value: `${totalF.toFixed(0)}g`, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} border border-slate-200 rounded-2xl p-4 text-center`}>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{label}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {daysOfWeek.map(day => (
                    <button key={day} onClick={() => setCurrentDay(day)}
                        className={`px-4 py-2 text-xs rounded-full font-bold transition-all whitespace-nowrap ${currentDay === day ? 'bg-red-600 text-black shadow-sm' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}`}>
                        {day.slice(0, 3).toUpperCase()}
                    </button>
                ))}
            </div>

            {meals && Object.keys(meals).length > 0 ? (
                <div className="space-y-4">
                    {Object.entries(meals).sort(([a], [b]) => getMealOrder(a) - getMealOrder(b)).map(([mealKey, meal]: [string, any]) => {
                        const isOpen = expandedMeal === mealKey;
                        let mKcal = 0;
                        meal.items?.forEach((i: any) => { mKcal += i.kcal * ((i.grams || 100) / 100); });
                        return (
                            <div key={mealKey} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                <button className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedMeal(isOpen ? null : mealKey)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-400/20 flex items-center justify-center">
                                            <Apple size={18} className="text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{meal.name}</p>
                                            {meal.subName && <p className="text-xs text-slate-500 italic mt-0.5">{meal.subName}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-600">{mKcal.toFixed(0)} kcal</span>
                                        {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                                    </div>
                                </button>
                                {isOpen && meal.items?.length > 0 && (
                                    <div className="border-t border-slate-200 divide-y divide-neutral-800">
                                        {meal.items.map((item: any, idx: number) => {
                                            const r = (item.grams || 100) / 100;
                                            return (
                                                <div key={idx} className="flex items-center justify-between px-5 py-3">
                                                    <div>
                                                        <p className="font-medium text-slate-900 text-sm flex items-center gap-2">
                                                            {item.name}
                                                            {item.isSwappable && (
                                                                <button onClick={() => openSwapModal(mealKey, idx, item)} className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors uppercase flex items-center gap-1 border border-red-100">
                                                                    <Replace size={10} /> Swap
                                                                </button>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            <span className="text-pink-600">{(item.p * r).toFixed(1)}P</span> · <span className="text-red-600">{(item.c * r).toFixed(1)}C</span> · <span className="text-orange-600">{(item.f * r).toFixed(1)}G</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-900 text-sm">{item.grams || 100}g</p>
                                                        <p className="text-xs text-slate-500">{(item.kcal * r).toFixed(0)} kcal</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {isOpen && (!meal.items || meal.items.length === 0) && (
                                    <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500 italic">No hay alimentos en esta comida.</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <p className="font-medium">No hay comidas para {currentDay}.</p>
                </div>
            )}

            {/* Swap Modal */}
            {swapModalOpen && itemToSwap && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-900">Intercambio Inteligente</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Sustituyendo: <span className="font-medium text-slate-900">{itemToSwap.item.name} ({itemToSwap.item.grams || 100}g)</span></p>
                            </div>
                            <button onClick={() => setSwapModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-500 hover:text-slate-900 border border-slate-200 shadow-sm"><X size={16} /></button>
                        </div>
                        <div className="overflow-y-auto p-4 flex-1 bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Opciones equivalentes</p>
                            <div className="grid gap-2">
                                {swapOptions.map((opt, i) => (
                                    <button key={i} onClick={() => confirmSwap(opt)} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-red-400 hover:shadow-md transition-all text-left">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm whitespace-normal pr-4">{opt.name}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="bg-red-50 text-red-600 font-black text-sm px-3 py-1 rounded-lg border border-red-100">
                                                {opt.suggestedGrams} g
                                            </span>
                                        </div>
                                    </button>
                                ))}
                                {swapOptions.length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-8">No se encontraron equivalencias directas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Shopping List Tab ──────────────────────────────────────────────────────
function ShoppingListTab({ session }: { session: NonNullable<PatientSession> }) {
    const [diet, setDiet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        supabase.from('diets').select('data').eq('patient_id', session.id).single().then(({ data }) => {
            if (data && data.data) {
                setDiet(data.data);
                if (data.data.shoppingListState) {
                    setCheckedItems(data.data.shoppingListState);
                }
            }
            setLoading(false);
        });
    }, [session.id]);

    const toggleItem = async (itemName: string) => {
        const newChecked = { ...checkedItems, [itemName]: !checkedItems[itemName] };
        setCheckedItems(newChecked);

        // Update DB
        if (diet) {
            const updatedDiet = { ...diet, shoppingListState: newChecked };
            setDiet(updatedDiet);
            await supabase.from('diets').update({ data: updatedDiet }).eq('patient_id', session.id);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /></div>;

    if (!diet) return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <ClipboardList size={48} className="mx-auto text-neutral-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Lista no disponible</h2>
            <p className="text-slate-500">Tu dietista aún no ha asignado un plan nutricional.</p>
        </div>
    );

    // Aggregate items
    const itemMap = new Map<string, { qty: number, category: string }>();
    const weeklyDietData = diet.weeklyDiet || diet;
    Object.values(weeklyDietData).forEach((dayMeals: any) => {
        if (typeof dayMeals !== 'object' || !dayMeals) return;
        Object.values(dayMeals).forEach((meal: any) => {
            meal.items?.forEach((item: any) => {
                const name = item.name.toLowerCase().trim();
                const display = name.charAt(0).toUpperCase() + name.slice(1);
                const q = item.grams || 100;

                let category = 'Otros';
                if (name.match(/pollo|ternera|cerdo|pavo|merluza|salmón|bacalao|atún|pescado|lomo/i)) {
                    category = 'Carnes y Pescados';
                } else if (name.match(/lechuga|tomate|cebolla|ajo|zanahoria|brócoli|espinaca|patata|pimiento|calabacín|berenjena|fruta|manzana|plátano/i)) {
                    category = 'Frutas y Verduras';
                } else if (name.match(/arroz|pasta|pan|avena|quinoa|lentejas|garbanzos|alubias|macarrones/i)) {
                    category = 'Cereales y Legumbres';
                } else if (name.match(/leche|queso|yogur|huevo/i)) {
                    category = 'Lácteos y Huevos';
                } else if (name.match(/aceite|nuez|almendra|cacahuete/i)) {
                    category = 'Grasas y Frutos Secos';
                }

                const existing = itemMap.get(display);
                if (existing) {
                    existing.qty += q;
                } else {
                    itemMap.set(display, { qty: q, category });
                }
            });
        });
    });

    const categories: Record<string, { name: string, qty: number }[]> = {};
    itemMap.forEach((val, key) => {
        if (!categories[val.category]) {
            categories[val.category] = [];
        }
        categories[val.category]!.push({ name: key, qty: val.qty });
    });

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Lista de la Compra</h2>
                    <p className="text-sm text-slate-500">Generada automáticamente a de tu plan semanal.</p>
                </div>
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <ClipboardList size={24} />
                </div>
            </div>

            {Object.entries(categories).map(([catName, items]) => (
                <div key={catName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 font-bold text-slate-700 text-sm tracking-wider uppercase">
                        {catName}
                    </div>
                    <div className="divide-y divide-slate-100">
                        {items.map(item => {
                            const isChecked = checkedItems[item.name] || false;
                            return (
                                <button key={item.name} onClick={() => toggleItem(item.name)} className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${isChecked ? 'opacity-50 bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'}`}>
                                            {isChecked && <CheckCircle2 size={14} strokeWidth={3} />}
                                        </div>
                                        <span className={`font-medium ${isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${isChecked ? 'text-slate-400' : 'text-slate-600'}`}>{item.qty.toFixed(0)} g</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Check-In Tab ─────────────────────────────────────────────────────────
function CheckInTab({ session }: { session: NonNullable<PatientSession> }) {
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [photoFront, setPhotoFront] = useState<File | null>(null);
    const [photoBack, setPhotoBack] = useState<File | null>(null);
    const emptyForm = { date: new Date().toISOString().split('T')[0] ?? '', weight: '', chest: '', waist: '', hip: '', biceps: '', clavicle: '', quadriceps: '', fat_percent: '', notes: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        supabase.from('patient_check_ins').select('*').eq('patient_id', session.id).order('date', { ascending: false }).then(({ data }) => {
            if (data) setCheckIns(data as CheckIn[]);
            setLoading(false);
        });
    }, [session.id]);

    const uploadPhoto = async (file: File, side: 'front' | 'back'): Promise<string | null> => {
        const path = `check-ins/${session.id}/${Date.now()}_${side}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('patient-photos').upload(path, file, { upsert: true });
        if (error) {
            console.error('Error subiendo foto:', error);
            alert(`Error subiendo foto ${side}: ${error.message}`);
            return null;
        }
        const { data } = supabase.storage.from('patient-photos').getPublicUrl(path);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        let photo_front_url: string | null = null;
        let photo_back_url: string | null = null;
        if (photoFront) photo_front_url = await uploadPhoto(photoFront, 'front');
        if (photoBack) photo_back_url = await uploadPhoto(photoBack, 'back');

        const { data, error } = await supabase.from('patient_check_ins').insert({
            patient_id: session.id,
            date: form.date,
            weight: form.weight || null,
            chest: form.chest || null,
            waist: form.waist || null,
            hip: form.hip || null,
            biceps: form.biceps || null,
            clavicle: form.clavicle || null,
            quadriceps: form.quadriceps || null,
            fat_percent: form.fat_percent || null,
            photo_front_url,
            photo_back_url,
            notes: form.notes || null,
        }).select().maybeSingle();

        if (error) {
            console.error('Error guardando revisión:', error);
            alert('Error guardando revisión: ' + error.message);
        } else if (data) {
            setCheckIns([data as CheckIn, ...checkIns]);
            setForm(emptyForm);
            setPhotoFront(null);
            setPhotoBack(null);
            setShowForm(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            // Fallback if select() returns null (e.g. strict RLS)
            setForm(emptyForm);
            setPhotoFront(null);
            setPhotoBack(null);
            setShowForm(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            alert('Revisión enviada, recarga la página para verla si no aparece.');
        }
        setSaving(false);
    };

    const field = (label: string, key: keyof typeof emptyForm, placeholder?: string) => (
        <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
            <input type="number" step="0.1" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder ?? '0.0'} onFocus={e => e.target.select()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-red-400 transition-colors text-sm" />
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Mis Revisiones</h2>
                    <p className="text-slate-500 text-sm mt-1">Registra tus medidas y seguimiento personal.</p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && <span className="text-red-600 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={16} /> Guardado</span>}
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-red-600 text-black font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
                        {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Añadir Nuevo Registro</>}
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-6">

                    {/* Section: Fecha */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Fecha</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-400 transition-colors text-sm" />
                        </div>
                    </div>

                    {/* Section: Medidas */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Medidas Corporales</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {field('Peso', 'weight')}
                            {field('Pecho', 'chest')}
                            {field('Cintura', 'waist')}
                            {field('Cadera', 'hip')}
                            {field('Bíceps', 'biceps')}
                            {field('Clavícula', 'clavicle')}
                            {field('Cuádriceps', 'quadriceps')}
                            {field('% Grasa', 'fat_percent')}
                        </div>
                    </div>

                    {/* Section: Fotos */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fotos de Seguimiento</p>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-5 cursor-pointer transition-colors ${photoFront ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-red-300'}`}>
                                <span className="text-2xl">{photoFront ? '✅' : '📸'}</span>
                                <span className="text-xs font-bold text-slate-600 text-center">Frontal Relajado</span>
                                <span className="text-[11px] text-slate-400 text-center truncate max-w-full px-2">{photoFront ? photoFront.name : 'Seleccionar archivo'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFront(e.target.files?.[0] || null)} />
                            </label>
                            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-5 cursor-pointer transition-colors ${photoBack ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-red-300'}`}>
                                <span className="text-2xl">{photoBack ? '✅' : '📸'}</span>
                                <span className="text-xs font-bold text-slate-600 text-center">Espalda Relajado</span>
                                <span className="text-[11px] text-slate-400 text-center truncate max-w-full px-2">{photoBack ? photoBack.name : 'Seleccionar archivo'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoBack(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                    </div>

                    {/* Section: Notas */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notas</p>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                            placeholder="Observaciones o notas de la consulta..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-colors text-sm resize-none placeholder:text-slate-400" />
                    </div>

                    <div className="flex justify-end pt-1">
                        <button type="submit" disabled={saving}
                            className="bg-red-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors text-sm flex items-center gap-2 shadow-sm shadow-red-200">
                            {saving ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : 'Guardar Registro'}
                        </button>
                    </div>
                </form>
            )}


            {loading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : checkIns.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                    <ClipboardList size={40} className="mx-auto text-neutral-700 mb-3" />
                    <p className="text-slate-900 font-semibold">Sin revisiones</p>
                    <p className="text-slate-500 text-sm mt-1">Registra tu primera revisión usando el botón de arriba.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {checkIns.map(c => (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-slate-900 font-bold">{new Date(c.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="flex gap-3 flex-wrap mb-3">
                                {[['Peso', c.weight, 'kg'], ['Pecho', c.chest, 'cm'], ['Cintura', c.waist, 'cm'], ['Cadera', c.hip, 'cm'], ['Bíceps', c.biceps, 'cm'], ['Clavícula', c.clavicle, 'cm'], ['Cuádriceps', c.quadriceps, 'cm'], ['Grasa', c.fat_percent, '%']].map(([label, val, unit]) =>
                                    val ? <div key={label} className="bg-slate-50 rounded-xl px-3 py-2 text-center min-w-[70px]">
                                        <p className="text-sm font-bold text-slate-900">{val}{unit}</p>
                                        <p className="text-xs text-slate-500">{label}</p>
                                    </div> : null
                                )}
                            </div>
                            {(c.photo_front_url || c.photo_back_url) && (
                                <div className="flex gap-3 mb-3">
                                    {c.photo_front_url && <img src={c.photo_front_url} alt="Frontal" className="w-24 h-32 object-cover rounded-xl border border-slate-200" />}
                                    {c.photo_back_url && <img src={c.photo_back_url} alt="Espalda" className="w-24 h-32 object-cover rounded-xl border border-slate-200" />}
                                </div>
                            )}
                            {c.notes && <p className="text-slate-600 text-sm italic border-t border-slate-100 pt-2">"{c.notes}"</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Chat Tab ───────────────────────────────────────────────────────────────
function ChatTab({ session }: { session: NonNullable<PatientSession> }) {
    const [messages, setMessages] = useState<{ id: string, sender: 'nutritionist' | 'patient', text: string, time: string }[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [dietData, setDietData] = useState<any>(null);
    const [dietExists, setDietExists] = useState(false);

    // Initial Load & Realtime Sync
    useEffect(() => {
        supabase.from('diets').select('data').eq('patient_id', session.id).maybeSingle().then(({ data }) => {
            if (data?.data) {
                setDietData(data.data);
                setDietExists(true);
                if (data.data.chatHistory) {
                    setMessages(data.data.chatHistory);
                }
            }
            setLoading(false);
        });

        // Realtime Subscription
        const channel = supabase.channel('realtime:patient-chat')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'diets', filter: `patient_id=eq.${session.id}` }, (payload: any) => {
                if (payload.new?.data) {
                    setDietData(payload.new.data);
                    setDietExists(true);
                    if (payload.new.data.chatHistory) {
                        setMessages(payload.new.data.chatHistory);
                    }
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [session.id]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const msg = {
            id: Date.now().toString(),
            sender: 'patient' as const,
            text: newMessage.trim(),
            time: new Date().toISOString()
        };

        const newChatHistory = [...messages, msg];
        setMessages(newChatHistory);
        setNewMessage('');

        const updatedData = { ...(dietData || {}), chatHistory: newChatHistory };
        setDietData(updatedData);

        if (dietExists) {
            await supabase.from('diets')
                .update({ data: updatedData })
                .eq('patient_id', session.id);
        } else {
            const { error } = await supabase.from('diets')
                .insert({ patient_id: session.id, data: updatedData });
            if (!error) setDietExists(true);
        }
        setSending(false);
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex flex-col h-[600px] max-h-[70vh] bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center border border-red-200">
                        <MessageCircle size={18} className="text-red-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">Tu Nutricionista</h2>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Conectado</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p>No hay mensajes aún.</p>
                        <p className="text-xs mt-1">Envía el primer mensaje a tu nutricionista.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isPatient = msg.sender === 'patient';
                        return (
                            <div key={msg.id} className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm shadow-sm ${isPatient
                                    ? 'bg-red-600 text-white rounded-br-sm'
                                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                                    }`}>
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isPatient ? 'text-red-200' : 'text-slate-400'}`}>
                                        {new Date(msg.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-50 disabled:hover:bg-red-600"
                    >
                        {sending ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Main Patient View ─────────────────────────────────────────────────────
function PatientDietView({ session, onLogout }: { session: NonNullable<PatientSession>; onLogout: () => void }) {
    const [tab, setTab] = useState<Tab>('dieta');

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <nav className="h-16 border-b border-slate-200 flex items-center px-6 justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Noya Centre Logo" className="h-6 w-auto" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                        <p className="text-xs text-slate-500">Paciente</p>
                    </div>
                    <button onClick={onLogout} title="Cerrar sesión" className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-red-500/50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-all">
                        <LogOut size={15} />
                    </button>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900">Hola, {session.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-600 mt-1">Tu panel personal de nutrición.</p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl mb-8">
                    <button
                        onClick={() => setTab('dieta')}
                        className={`flex-1 min-w-[120px] py-3 px-3 rounded-lg text-sm font-bold transition-all ${tab === 'dieta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                        Dieta
                    </button>
                    <button
                        onClick={() => setTab('compra')}
                        className={`flex-1 min-w-[120px] py-3 px-3 rounded-lg text-sm font-bold transition-all ${tab === 'compra' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                        Compra
                    </button>
                    <button
                        onClick={() => setTab('checkin')}
                        className={`flex-1 min-w-[120px] py-3 px-3 rounded-lg text-sm font-bold transition-all ${tab === 'checkin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                        Revisiones
                    </button>
                    <button
                        onClick={() => setTab('chat')}
                        className={`flex-1 min-w-[120px] py-3 px-3 rounded-lg text-sm font-bold transition-all ${tab === 'chat' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                        Chat
                    </button>
                </div>

                <div className="pb-10">
                    {tab === 'dieta' && <DietTab session={session} />}
                    {tab === 'compra' && <ShoppingListTab session={session} />}
                    {tab === 'checkin' && <CheckInTab session={session} />}
                    {tab === 'chat' && <ChatTab session={session} />}
                </div>
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
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) return <PatientLogin onLogin={handleLogin} />;
    return <PatientDietView session={session} onLogout={handleLogout} />;
}
