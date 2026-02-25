"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Search, Wand2, Calculator, Save, User, X } from 'lucide-react';
import foodDatabase from '../data/foodDatabase.json';
import { supabase } from '../lib/supabase';

type FoodItem = {
    id: string;
    name: string;
    kcal: number;
    p: number;
    c: number;
    f: number;
    instanceId?: string;
    grams?: number;
    dish?: string;
};

type Meal = {
    name: string;
    subName?: string;
    items: FoodItem[];
};

type Meals = Record<string, Meal>;

type WeeklyDiet = Record<string, Meals>;

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const initialDailyMeals: Meals = {
    desayuno: { name: 'Desayuno', items: [] },
    comida: { name: 'Comida', items: [] },
    cena: { name: 'Cena', items: [] }
};

const getInitialWeeklyDiet = (): WeeklyDiet => {
    const diet: WeeklyDiet = {};
    daysOfWeek.forEach(day => {
        diet[day] = JSON.parse(JSON.stringify(initialDailyMeals));
    });
    return diet;
};

export default function DietBuilder() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [patients, setPatients] = useState<{ id: number, name: string }[]>([]);

    const [currentDay, setCurrentDay] = useState('Lunes');
    const [weeklyDiet, setWeeklyDiet] = useState<WeeklyDiet>(getInitialWeeklyDiet());
    const [userGoals, setUserGoals] = useState({ kcal: 2000, p: 150, c: 200, f: 65 });

    // Calculator State
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [calcData, setCalcData] = useState({
        age: 30, gender: 'Hombre', weight: 75, height: 175,
        activity: 1.2, goal: 0,
        protPercent: 30, fatPercent: 35
    });

    const [tmb, setTmb] = useState(0);
    const [tdee, setTdee] = useState(0);
    const [dailyKcal, setDailyKcal] = useState(0);

    // Calculate TMB, TDEE and Daily Kcal dynamically when calcData changes
    useEffect(() => {
        let currentTmb = 0;
        if (calcData.gender === 'Hombre') {
            currentTmb = (10 * calcData.weight) + (6.25 * calcData.height) - (5 * calcData.age) + 5;
        } else {
            currentTmb = (10 * calcData.weight) + (6.25 * calcData.height) - (5 * calcData.age) - 161;
        }

        const currentTdee = currentTmb * calcData.activity;
        let finalKcal = currentTdee;

        if (calcData.goal < 0) {
            // Percent deduction (e.g. -20%)
            finalKcal = currentTdee - (currentTdee * Math.abs(calcData.goal));
        } else if (calcData.goal > 0) {
            // Percent addition (e.g. +15%)
            finalKcal = currentTdee + (currentTdee * calcData.goal);
        }

        setTmb(Math.round(currentTmb));
        setTdee(Math.round(currentTdee));
        setDailyKcal(Math.round(finalKcal));
    }, [calcData]);

    useEffect(() => {
        supabase.from('patients').select('id, name').order('id', { ascending: false }).then(({ data }) => {
            if (data) {
                setPatients(data.map((p: any) => ({ id: p.id, name: p.name })));
                if (data.length > 0 && !selectedPatient) {
                    setSelectedPatient(data[0]?.id.toString() ?? '');
                }
            }
        });
    }, []);

    useEffect(() => {
        if (!selectedPatient) return;
        supabase.from('diets').select('data').eq('patient_id', selectedPatient).single().then(({ data, error }) => {
            let loaded: any = null;
            if (!error && data?.data) {
                loaded = data.data as any;
            } else {
                const local = localStorage.getItem(`nexo-diet-${selectedPatient}`);
                if (local) { try { loaded = JSON.parse(local); } catch { } }
            }
            if (loaded) {
                setWeeklyDiet(loaded.weeklyDiet ?? getInitialWeeklyDiet());
                setUserGoals(loaded.userGoals ?? { kcal: 2000, p: 150, c: 200, f: 65 });
                setCalcData(loaded.calcData ?? {
                    age: 30, gender: 'Hombre', weight: 75, height: 175,
                    activity: 1.2, goal: 0,
                    protPercent: 30, fatPercent: 35
                });
            } else {
                setWeeklyDiet(getInitialWeeklyDiet());
                setUserGoals({ kcal: 2000, p: 150, c: 200, f: 65 });
                setCalcData({
                    age: 30, gender: 'Hombre', weight: 75, height: 175,
                    activity: 1.2, goal: 0,
                    protPercent: 30, fatPercent: 35
                });
            }
        });
    }, [selectedPatient]);


    const meals = weeklyDiet[currentDay] || initialDailyMeals;

    const setMeals = (updater: any) => {
        setWeeklyDiet(prev => {
            const currentMeals = prev[currentDay] || initialDailyMeals;
            const newMeals = typeof updater === 'function' ? updater(currentMeals) : updater;
            return { ...prev, [currentDay]: newMeals };
        });
    };

    const addMeal = () => {
        const newMealKey = `comida-${Date.now()}`;
        setMeals((prev: Meals) => ({ ...prev, [newMealKey]: { name: 'Nueva Comida', items: [] } }));
    };

    const handleAutoIA = () => {
        const db = foodDatabase as FoodItem[];
        const findFood = (query: string): FoodItem => db.find(f => f.name.toLowerCase().includes(query)) || db[0]!;

        // Essential food items for templates
        const oats = findFood('avena');
        const eggs = findFood('huevo');
        const milk = findFood('leche');
        const banana = findFood('plátano');
        const chicken = findFood('pollo');
        const rice = findFood('arroz');
        const olive = findFood('aceite de oliva');
        const broccoli = findFood('brócoli');
        const salmon = findFood('salmón');
        const potato = findFood('patata');
        const yogurt = findFood('yogur');
        const walnuts = findFood('nuez');
        const spinach = findFood('espinaca');
        const tomato = findFood('tomate');
        const pasta = findFood('pasta');
        const beef = findFood('ternera');

        const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // --- MATH RULES ---
        const calcMacros = (items: FoodItem[]) => {
            let k = 0, p = 0, c = 0, f = 0;
            items.forEach(i => {
                const r = (i.grams || 100) / 100;
                k += i.kcal * r; p += i.p * r; c += i.c * r; f += i.f * r;
            });
            return { k, p, c, f };
        };

        // Scale items to hit targetKcal, keeping all grams as multiples of 10g.
        // Two-pass: (1) round each item, (2) correct drift on the largest-kcal item.
        const scaleToTarget = (items: FoodItem[], targetKcal: number): FoodItem[] => {
            const { k } = calcMacros(items);
            if (k <= 0 || items.length === 0) return items;
            const factor = targetKcal / k;

            // Pass 1: round every item to nearest 10g
            const scaled = items.map(item => {
                const raw = (item.grams || 100) * factor;
                const rounded = Math.max(10, Math.round(raw / 10) * 10);
                return { ...item, grams: rounded };
            });

            // Pass 2: compute drift and correct by adjusting the item with the most kcal/g
            const actualKcal = calcMacros(scaled).k;
            const drift = targetKcal - actualKcal; // positive = need more, negative = need less
            if (Math.abs(drift) > 5) {
                // Find the item with the highest kcal density to absorb drift
                let maxIdx = 0;
                let maxKcalPer10g = 0;
                scaled.forEach((item, i) => {
                    const kcalPer10g = item.kcal * 0.1;
                    if (kcalPer10g > maxKcalPer10g) { maxKcalPer10g = kcalPer10g; maxIdx = i; }
                });
                const targetItem = scaled[maxIdx]!;
                const gramsToAdd = Math.round(drift / (targetItem.kcal / 100) / 10) * 10;
                const newGrams = Math.max(10, (targetItem.grams || 10) + gramsToAdd);
                scaled[maxIdx] = { ...targetItem, grams: newGrams };
            }

            return scaled;
        };

        setMeals((prev: Meals) => {
            const keys = Object.keys(prev);
            const mealCount = keys.length || 1;
            const newMeals: Meals = {};

            keys.forEach((key, idx) => {
                const meal = prev[key];
                if (!meal) return;

                const mealName = meal.name.toLowerCase();
                let itemsToAdd: FoodItem[] = [];
                let suggestedDishName = '';

                // Decide between Option A (1st/2nd) and Option B (Harvard Plate) for main meals
                const isMainMeal = mealName.includes('comida') || mealName.includes('almuerzo') || mealName.includes('cena');
                const useHarvardPlate = Math.random() > 0.5;

                if (mealName.includes('desayuno') || mealName.includes('mañana')) {
                    // Breakfast usually doesn't follow plate method strictly but we ensure rounded grams
                    const variant = Math.floor(Math.random() * 2);
                    if (variant === 0) {
                        suggestedDishName = 'Porridge Energético de Avena';
                        itemsToAdd = [
                            { ...oats, instanceId: genId('ai'), grams: 60 },
                            { ...milk, instanceId: genId('ai'), grams: 250 },
                            { ...banana, instanceId: genId('ai'), grams: 100 },
                            { ...walnuts, instanceId: genId('ai'), grams: 20 },
                        ];
                    } else {
                        suggestedDishName = 'Huevos con Pan y Aguacate';
                        itemsToAdd = [
                            { ...eggs, instanceId: genId('ai'), grams: 150 },
                            { ...findFood('pan'), instanceId: genId('ai'), grams: 60 },
                            { ...findFood('aguacate'), instanceId: genId('ai'), grams: 50 },
                            { ...tomato, instanceId: genId('ai'), grams: 100 }, // veggie abundance
                        ];
                    }
                } else if (isMainMeal) {
                    if (useHarvardPlate) {
                        // Option B: Harvard Plate (50% Veg, 25% Prot, 25% Carb)
                        if (mealName.includes('cena')) {
                            suggestedDishName = 'Plato Harvard: Salmón y Verduras';
                            itemsToAdd = [
                                { ...salmon, instanceId: genId('ai'), grams: 150 }, // Prot
                                { ...potato, instanceId: genId('ai'), grams: 150 }, // Carb
                                { ...broccoli, instanceId: genId('ai'), grams: 300 }, // 50% Veg
                                { ...olive, instanceId: genId('ai'), grams: 10 },
                            ];
                        } else {
                            suggestedDishName = 'Plato Harvard: Pollo con Arroz';
                            itemsToAdd = [
                                { ...chicken, instanceId: genId('ai'), grams: 200 }, // Prot
                                { ...rice, instanceId: genId('ai'), grams: 100 },    // Carb
                                { ...spinach, instanceId: genId('ai'), grams: 200 },  // Veg
                                { ...tomato, instanceId: genId('ai'), grams: 150 },   // Veg (Total ~350g veg)
                                { ...olive, instanceId: genId('ai'), grams: 10 },
                            ];
                        }
                    } else {
                        // Option A: 1st and 2nd Course
                        if (mealName.includes('cena')) {
                            suggestedDishName = '1º Ensalada Mixta / 2º Tortilla';
                            itemsToAdd = [
                                { ...tomato, instanceId: genId('ai'), grams: 200 }, // 1st course (veg)
                                { ...findFood('lechuga'), instanceId: genId('ai'), grams: 100 },
                                { ...eggs, instanceId: genId('ai'), grams: 150 }, // 2nd course
                                { ...olive, instanceId: genId('ai'), grams: 10 },
                            ];
                        } else {
                            suggestedDishName = '1º Pasta con Verduras / 2º Ternera';
                            itemsToAdd = [
                                { ...pasta, instanceId: genId('ai'), grams: 80 }, // Carb
                                { ...broccoli, instanceId: genId('ai'), grams: 200 }, // Veg abundance in 1st
                                { ...beef, instanceId: genId('ai'), grams: 150 },  // 2nd course
                                { ...olive, instanceId: genId('ai'), grams: 10 },
                            ];
                        }
                    }
                } else {
                    // Snacks / Merienda
                    suggestedDishName = 'Snack con Fruta y Frutos Secos';
                    itemsToAdd = [
                        { ...yogurt, instanceId: genId('ai'), grams: 200 },
                        { ...walnuts, instanceId: genId('ai'), grams: 30 },
                        { ...banana, instanceId: genId('ai'), grams: 100 },
                    ];
                }

                // Balance macros: scale each meal so daily total hits userGoals.kcal
                // Since we use the same scale factor for all meals (targets / current), macros stay in proportion.
                const targetKcalForMeal = userGoals.kcal / mealCount;
                itemsToAdd = scaleToTarget(itemsToAdd, targetKcalForMeal);

                newMeals[key] = { name: meal.name, subName: suggestedDishName, items: itemsToAdd };
            });

            return newMeals;
        });
    };

    const handleAssignDiet = async () => {
        if (!selectedPatient) {
            alert('Selecciona un paciente en el menú superior para guardar su dieta.');
            return;
        }
        const payload = { weeklyDiet, userGoals, calcData };

        const { error } = await supabase.from('diets').upsert(
            { patient_id: Number(selectedPatient), data: payload, updated_at: new Date().toISOString() },
            { onConflict: 'patient_id' }
        );

        if (error) {
            console.error('Error saving diet to Supabase:', error);
            // Fallback: save to localStorage
            localStorage.setItem(`nexo-diet-${selectedPatient}`, JSON.stringify(payload));
            alert('Dieta guardada localmente (Supabase no disponible).');
        } else {
            alert('Dieta y objetivos guardados correctamente.');
        }
    };

    const updateGrams = (mealKey: string, index: number, grams: number) => {
        setMeals((prev: Meals) => {
            const targetMeal = { ...prev[mealKey] } as Meal;
            targetMeal.items = [...targetMeal.items];
            targetMeal.items[index] = { ...targetMeal.items[index], grams } as FoodItem;
            return { ...prev, [mealKey]: targetMeal };
        });
    };

    const updateDish = (mealKey: string, index: number, dish: string) => {
        setMeals((prev: Meals) => {
            const targetMeal = { ...prev[mealKey] } as Meal;
            targetMeal.items = [...targetMeal.items];
            targetMeal.items[index] = { ...targetMeal.items[index], dish } as FoodItem;
            return { ...prev, [mealKey]: targetMeal };
        });
    };

    const openCalc = () => {
        if (!selectedPatient) {
            alert('Por favor, selecciona un paciente en el menú superior antes de usar la calculadora.');
            return;
        }
        setIsCalcOpen(true);
    };

    // Filter foods by search term
    const filteredFoodBank = useMemo(() => {
        if (!searchTerm) return foodDatabase as FoodItem[];
        const lowerQuery = searchTerm.toLowerCase();
        return (foodDatabase as FoodItem[]).filter(food =>
            food.name.toLowerCase().includes(lowerQuery)
        );
    }, [searchTerm]);

    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;

        if (source.droppableId === 'foodBank' && destination.droppableId !== 'foodBank') {
            // Copy item from bank to a meal
            const sourceItem = filteredFoodBank[source.index] as FoodItem;
            if (!sourceItem) return;

            const newItem = { ...sourceItem, instanceId: `${sourceItem.id}-${Date.now()}`, grams: 100 } as FoodItem;

            setMeals((prev: Meals) => {
                const targetMeal = { ...prev[destination.droppableId] } as Meal;
                targetMeal.items = [...targetMeal.items]; // clone array
                targetMeal.items.splice(destination.index, 0, newItem);
                return { ...prev, [destination.droppableId]: targetMeal };
            });
        } else if (source.droppableId !== 'foodBank' && destination.droppableId !== 'foodBank') {
            // Move within or between meals
            setMeals((prev: Meals) => {
                const startMeal = { ...prev[source.droppableId] } as Meal;
                const finishMeal = { ...prev[destination.droppableId] } as Meal;

                if (source.droppableId === destination.droppableId) {
                    // Clone the items array before mutating it
                    const newItems = [...startMeal.items];
                    const [movedItem] = newItems.splice(source.index, 1);
                    if (movedItem) newItems.splice(destination.index, 0, movedItem);
                    return { ...prev, [source.droppableId]: { ...startMeal, items: newItems } };
                } else {
                    // Clone both arrays before mutating
                    const startItems = [...startMeal.items];
                    const finishItems = [...finishMeal.items];
                    const [movedItem] = startItems.splice(source.index, 1);
                    if (movedItem) finishItems.splice(destination.index, 0, movedItem);
                    return {
                        ...prev,
                        [source.droppableId]: { ...startMeal, items: startItems },
                        [destination.droppableId]: { ...finishMeal, items: finishItems }
                    };
                }
            });
        }
    };

    const removeFood = (mealKey: string, index: number) => {
        setMeals((prev: Meals) => {
            const newMeal = { ...prev[mealKey] } as Meal;
            newMeal.items = [...newMeal.items];
            newMeal.items.splice(index, 1);
            return { ...prev, [mealKey]: newMeal };
        });
    };

    const removeMeal = (mealKey: string) => {
        setMeals((prev: Meals) => {
            const newMeals = { ...prev };
            delete newMeals[mealKey];
            return newMeals;
        });
    };

    // Calculate Totals
    let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
    Object.values(meals).forEach(meal => {
        meal.items.forEach(item => {
            const ratio = (item.grams || 100) / 100;
            totalKcal += item.kcal * ratio;
            totalP += item.p * ratio;
            totalC += item.c * ratio;
            totalF += item.f * ratio;
        });
    });

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-neutral-950 text-white font-sans">

                {/* Left Sidebar: Food Bank */}
                <div className="w-80 border-r border-neutral-800 flex flex-col bg-neutral-900/50">
                    <div className="p-4 border-b border-neutral-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-lime-400" />
                            Alimentos
                        </h2>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Buscar alimento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-lime-400 transition-colors"
                            />
                        </div>
                    </div>

                    <Droppable droppableId="foodBank" isDropDisabled={true}>
                        {(provided) => (
                            <div
                                className="flex-1 overflow-y-auto p-4 space-y-3"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {filteredFoodBank.map((food, index) => (
                                    <Draggable key={food.id} draggableId={food.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="bg-neutral-800 border border-neutral-700 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-lime-500/50 transition-colors group"
                                            >
                                                <div>
                                                    <p className="font-semibold text-sm">{food.name}</p>
                                                    <p className="text-xs text-neutral-400 mt-1">
                                                        {food.kcal}kcal • {food.p}P {food.c}C {food.f}F
                                                    </p>
                                                </div>
                                                <GripVertical size={16} className="text-neutral-500 group-hover:text-lime-400" />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {/* Right Area: Diet Canvas */}
                <div className="flex-1 flex flex-col bg-neutral-950 overflow-y-auto">

                    {/* Top Header */}
                    <div className="flex justify-between items-center p-6 border-b border-neutral-800 sticky top-0 bg-neutral-950/80 backdrop-blur z-10">
                        <div>
                            <div className="flex items-center gap-2">
                                <User size={20} className="text-lime-400" />
                                <select
                                    value={selectedPatient}
                                    onChange={(e) => setSelectedPatient(e.target.value)}
                                    className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b focus:border-lime-400 cursor-pointer appearance-none pr-4"
                                >
                                    <option value="" disabled className="bg-neutral-900 text-neutral-500">Seleccionar Paciente...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id.toString()} className="bg-neutral-900">{p.name}</option>
                                    ))}
                                    {patients.length === 0 && (
                                        <option value="" disabled className="bg-neutral-900">No hay pacientes registrados</option>
                                    )}
                                </select>
                            </div>

                            {/* Days Tabs */}
                            <div className="flex gap-2 mt-4">
                                {daysOfWeek.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setCurrentDay(day)}
                                        className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all ${currentDay === day ? 'bg-lime-400 text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'}`}
                                    >
                                        {day.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex gap-6">
                                <div className="text-center w-20">
                                    <div className="text-lg font-bold text-red-400 mb-1 whitespace-nowrap"><span className={totalKcal > userGoals.kcal ? 'text-red-500' : ''}>{totalKcal.toFixed(0)}</span> <span className="text-xs text-neutral-500 font-normal">/ {userGoals.kcal}</span></div>
                                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${totalKcal > userGoals.kcal ? 'bg-red-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, (totalKcal / userGoals.kcal) * 100)}%` }}></div></div>
                                    <div className="text-[10px] font-bold text-neutral-500">KCAL</div>
                                </div>
                                <div className="text-center w-20">
                                    <div className="text-lg font-bold text-pink-500 mb-1 whitespace-nowrap"><span className={totalP > userGoals.p ? 'text-pink-600' : ''}>{totalP.toFixed(0)}</span> <span className="text-xs text-neutral-500 font-normal">/ {userGoals.p}</span></div>
                                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${totalP > userGoals.p ? 'bg-pink-600' : 'bg-pink-500'}`} style={{ width: `${Math.min(100, (totalP / userGoals.p) * 100)}%` }}></div></div>
                                    <div className="text-[10px] font-bold text-neutral-500">PRO (g)</div>
                                </div>
                                <div className="text-center w-20">
                                    <div className="text-lg font-bold text-lime-400 mb-1 whitespace-nowrap"><span className={totalC > userGoals.c ? 'text-lime-500' : ''}>{totalC.toFixed(0)}</span> <span className="text-xs text-neutral-500 font-normal">/ {userGoals.c}</span></div>
                                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${totalC > userGoals.c ? 'bg-lime-500' : 'bg-lime-400'}`} style={{ width: `${Math.min(100, (totalC / userGoals.c) * 100)}%` }}></div></div>
                                    <div className="text-[10px] font-bold text-neutral-500">CARB (g)</div>
                                </div>
                                <div className="text-center w-20">
                                    <div className="text-lg font-bold text-red-400 mb-1 whitespace-nowrap"><span className={totalF > userGoals.f ? 'text-red-500' : ''}>{totalF.toFixed(0)}</span> <span className="text-xs text-neutral-500 font-normal">/ {userGoals.f}</span></div>
                                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${totalF > userGoals.f ? 'bg-red-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, (totalF / userGoals.f) * 100)}%` }}></div></div>
                                    <div className="text-[10px] font-bold text-neutral-500">GRA (g)</div>
                                </div>
                            </div>

                            <button onClick={addMeal} className="bg-neutral-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700">
                                <Plus size={16} />
                                Añadir Comida
                            </button>
                            <button onClick={openCalc} className="bg-neutral-800 text-pink-500 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700">
                                <Calculator size={16} />
                                Calc.
                            </button>
                            <button onClick={handleAutoIA} className="bg-neutral-800 text-lime-400 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700">
                                <Wand2 size={16} />
                                Auto IA
                            </button>
                            <button onClick={handleAssignDiet} className="bg-lime-400 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-500 transition-colors ml-4 shadow-[0_0_15px_rgba(163,230,53,0.3)]">
                                <Save size={16} />
                                Guardar Dieta
                            </button>
                        </div>
                    </div>

                    {/* Meals Board */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.keys(meals).map((mealKey) => {
                            const meal = meals[mealKey]!;
                            let mKcal = 0, mP = 0, mC = 0, mF = 0;
                            meal.items.forEach(i => {
                                const r = (i.grams || 100) / 100;
                                mKcal += i.kcal * r; mP += i.p * r; mC += i.c * r; mF += i.f * r;
                            });

                            return (
                                <div key={mealKey} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col">
                                    {/* Meal Header */}
                                    <div className="flex justify-between items-start border-b border-neutral-800 pb-3 mb-4">
                                        <div className="w-1/2 pr-2">
                                            <input
                                                type="text"
                                                value={meal.name}
                                                onChange={(e) => {
                                                    setMeals((prev: Meals) => {
                                                        const target = { ...prev[mealKey], name: e.target.value } as Meal;
                                                        return { ...prev, [mealKey]: target };
                                                    });
                                                }}
                                                className="bg-transparent text-lg font-bold text-lime-400 focus:outline-none focus:border-b focus:border-lime-400 w-full"
                                            />
                                            <input
                                                type="text"
                                                value={meal.subName || ''}
                                                onChange={(e) => {
                                                    setMeals((prev: Meals) => {
                                                        const target = { ...prev[mealKey], subName: e.target.value } as Meal;
                                                        return { ...prev, [mealKey]: target };
                                                    });
                                                }}
                                                placeholder="Ej. Pollo con Arroz..."
                                                className="bg-transparent text-sm text-neutral-400 mt-1 italic focus:outline-none focus:border-b focus:border-neutral-500 w-full placeholder:text-neutral-600"
                                            />
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
                                            <button
                                                onClick={() => removeMeal(mealKey)}
                                                className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                                title="Eliminar comida"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="text-xs text-neutral-400 text-right">
                                                {mKcal.toFixed(0)}kcal{'\n'}
                                                {mP.toFixed(0)}p {mC.toFixed(0)}c {mF.toFixed(0)}g
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropzone */}
                                    <Droppable droppableId={mealKey}>
                                        {(provided, snapshot) => (
                                            <div
                                                className={`flex-1 min-h-[200px] rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-lime-900/10 border-2 border-dashed border-lime-500/50' : 'bg-neutral-950 border border-neutral-900'
                                                    }`}
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                            >
                                                {meal.items.map((food, index) => {
                                                    const r = (food.grams || 100) / 100;
                                                    return (
                                                        <Draggable key={food.instanceId} draggableId={food.instanceId!} index={index}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className="bg-neutral-800 border border-neutral-700 p-3 rounded-lg flex flex-col mb-2 shadow-sm gap-2"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-semibold text-sm truncate">{food.name}</p>
                                                                            <div className="flex gap-2 items-center mt-1">
                                                                                <p className="text-xs font-bold text-white">{(food.kcal * r).toFixed(0)} kcal</p>
                                                                                <p className="text-[10px] text-pink-400">{(food.p * r).toFixed(1)}p</p>
                                                                                <p className="text-[10px] text-lime-400">{(food.c * r).toFixed(1)}c</p>
                                                                                <p className="text-[10px] text-red-400">{(food.f * r).toFixed(1)}g</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <div className="flex items-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={food.grams === undefined ? '' : food.grams}
                                                                                    onChange={(e) => {
                                                                                        const raw = e.target.value;
                                                                                        updateGrams(mealKey, index, raw === '' ? 0 : Number(raw));
                                                                                    }}
                                                                                    onFocus={(e) => e.target.select()}
                                                                                    className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1 py-1 text-xs text-right focus:outline-none focus:border-lime-400"
                                                                                />
                                                                                <span className="text-xs text-neutral-500 ml-1">g</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => removeFood(mealKey, index)}
                                                                                className="text-neutral-500 hover:text-red-400 p-1"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {/* Dish Selector */}
                                                                    <div className="flex justify-between items-center border-t border-neutral-700/50 pt-2 mt-1">
                                                                        <span className="text-[10px] uppercase font-bold text-neutral-500">Plato:</span>
                                                                        <select
                                                                            value={food.dish || ''}
                                                                            onChange={(e) => updateDish(mealKey, index, e.target.value)}
                                                                            className="bg-neutral-900 border border-neutral-700 rounded text-xs px-2 py-1 text-neutral-300 focus:outline-none focus:border-lime-400 w-32"
                                                                        >
                                                                            <option value="">Ninguno</option>
                                                                            <option value="Entrante">Entrante</option>
                                                                            <option value="Primer plato">Primer plato</option>
                                                                            <option value="Segundo plato">Segundo plato</option>
                                                                            <option value="Postre">Postre</option>
                                                                            <option value="Bebida">Bebida</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}

                                                {meal.items.length === 0 && !snapshot.isDraggingOver && (
                                                    <div className="h-full flex items-center justify-center flex-col text-neutral-600 pb-10">
                                                        <Plus size={24} className="mb-2 opacity-50" />
                                                        <p className="text-sm font-medium">Arrastra alimentos aquí</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            {/* Calculadora Nutricional Modal */}
            {isCalcOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden text-white">
                        {/* Header */}
                        <div className="flex justify-between items-center p-8 border-b border-neutral-800 shrink-0">
                            <div>
                                <h2 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Calculadora Energética</h2>
                                <p className="text-sm text-neutral-400 font-medium">
                                    Estimación basada en Mifflin-St Jeor para
                                    <span className="font-bold text-lime-400 ml-1">
                                        {patients.find(p => p.id.toString() === selectedPatient)?.name || 'Paciente'}
                                    </span>
                                </p>
                            </div>
                            <button onClick={() => setIsCalcOpen(false)} className="text-neutral-500 hover:text-white bg-neutral-800 hover:bg-neutral-700 p-2 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col md:flex-row p-8 gap-8 overflow-y-auto">

                            {/* Left Column: Form */}
                            <div className="flex-1 space-y-5 bg-neutral-950/50 p-7 rounded-2xl border border-neutral-800">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Edad</label>
                                        <input type="number" value={calcData.age || ''}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setCalcData({ ...calcData, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Género</label>
                                        <select value={calcData.gender} onChange={e => setCalcData({ ...calcData, gender: e.target.value as any })} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium cursor-pointer">
                                            <option value="Hombre">Hombre</option>
                                            <option value="Mujer">Mujer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Peso (kg)</label>
                                        <input type="number" value={calcData.weight || ''}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setCalcData({ ...calcData, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Altura (cm)</label>
                                        <input type="number" value={calcData.height || ''}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setCalcData({ ...calcData, height: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Nivel de Actividad</label>
                                    <select value={calcData.activity} onChange={e => setCalcData({ ...calcData, activity: Number(e.target.value) })} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium cursor-pointer">
                                        <option value={1.2}>Sedentario (Poco o nada de ejercicio)</option>
                                        <option value={1.375}>Ligero (1-3 días a la semana)</option>
                                        <option value={1.55}>Moderado (3-5 días a la semana)</option>
                                        <option value={1.725}>Activo (6-7 días a la semana)</option>
                                        <option value={1.9}>Muy Activo (2 veces al día)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Objetivo</label>
                                    <select value={calcData.goal} onChange={e => setCalcData({ ...calcData, goal: Number(e.target.value) })} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-all font-medium cursor-pointer">
                                        <option value={-0.2}>Pérdida de Peso Acelerada (-20%)</option>
                                        <option value={-0.1}>Déficit Ligero (-10%)</option>
                                        <option value={0}>Mantenimiento</option>
                                        <option value={0.1}>Superávit Ligero (+10%)</option>
                                        <option value={0.15}>Volumen (+15%)</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => {
                                        const carbPercent = 100 - calcData.protPercent - calcData.fatPercent;
                                        setUserGoals({
                                            kcal: dailyKcal,
                                            p: Math.round((dailyKcal * (calcData.protPercent / 100)) / 4),
                                            f: Math.round((dailyKcal * (calcData.fatPercent / 100)) / 9),
                                            c: Math.round((dailyKcal * (carbPercent / 100)) / 4),
                                        });
                                        setIsCalcOpen(false);
                                    }}
                                    className="w-full py-4 rounded-xl bg-lime-400 text-black font-bold text-base hover:bg-lime-300 transition-colors shadow-[0_0_20px_rgba(163,230,53,0.3)] mt-2 active:scale-[0.98]"
                                >
                                    Calcular y Actualizar Objetivo
                                </button>
                            </div>

                            {/* Right Column: Results & Macros */}
                            <div className="w-full md:w-96 space-y-5">
                                {/* Highlight Card */}
                                <div className="bg-gradient-to-br from-neutral-800 to-neutral-950 p-7 rounded-2xl border border-neutral-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 relative z-10">Objetivo Diario</p>
                                    <div className="flex items-baseline gap-2 relative z-10">
                                        <span className="text-6xl font-black text-lime-400 tracking-tighter">{dailyKcal}</span>
                                        <span className="text-xl font-bold text-neutral-400">kcal</span>
                                    </div>
                                    <div className="mt-6 pt-5 border-t border-neutral-700/50 flex justify-between relative z-10">
                                        <div>
                                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">TMB</p>
                                            <p className="text-2xl font-bold text-white">{tmb}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">TDEE</p>
                                            <p className="text-2xl font-bold text-white">{tdee}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Macros Distribution */}
                                <div className="bg-neutral-950/50 p-6 rounded-2xl border border-neutral-800">
                                    <div className="flex justify-between items-center mb-5">
                                        <h3 className="font-bold text-white">Distribución de Macros</h3>
                                        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${calcData.protPercent + calcData.fatPercent <= 100 ? 'text-lime-400 bg-lime-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                            {calcData.protPercent + calcData.fatPercent + (100 - calcData.protPercent - calcData.fatPercent)}% ✓
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between text-sm font-bold mb-2">
                                                <span className="text-pink-400">Proteína (%)</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-neutral-400">{Math.round((dailyKcal * (calcData.protPercent / 100)) / 4)}g</span>
                                                    <span className="bg-pink-400/10 text-pink-400 px-2 py-0.5 rounded-md text-xs border border-pink-400/20">{(((dailyKcal * (calcData.protPercent / 100)) / 4) / (calcData.weight || 1)).toFixed(1)} g/kg</span>
                                                </div>
                                            </div>
                                            <input type="number" min="0" max="100" value={calcData.protPercent || ''}
                                                onFocus={e => e.target.select()}
                                                onChange={e => setCalcData({ ...calcData, protPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-400 font-bold transition-colors" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm font-bold mb-2">
                                                <span className="text-orange-400">Grasas (%)</span>
                                                <span className="text-neutral-400">{Math.round((dailyKcal * (calcData.fatPercent / 100)) / 9)}g</span>
                                            </div>
                                            <input type="number" min="0" max="100" value={calcData.fatPercent || ''}
                                                onFocus={e => e.target.select()}
                                                onChange={e => setCalcData({ ...calcData, fatPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-400 font-bold transition-colors" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm font-bold mb-2">
                                                <span className="text-lime-400">Carbos (%)</span>
                                                <span className="text-neutral-400">{Math.round((dailyKcal * ((100 - calcData.protPercent - calcData.fatPercent) / 100)) / 4)}g</span>
                                            </div>
                                            <div className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-500 font-bold cursor-not-allowed">
                                                {100 - calcData.protPercent - calcData.fatPercent}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </DragDropContext>
    );
}
