"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Search, Wand2, Calculator, Save, User, X, Share2, Download } from 'lucide-react';
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
    isSwappable?: boolean;
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
    const [patients, setPatients] = useState<{ id: number, name: string, portal_username?: string, portal_password?: string }[]>([]);

    const [currentDay, setCurrentDay] = useState('Lunes');
    const [weeklyDiet, setWeeklyDiet] = useState<WeeklyDiet>(getInitialWeeklyDiet());
    const [userGoals, setUserGoals] = useState({ kcal: 2000, p: 150, c: 200, f: 65 });



    useEffect(() => {
        supabase.from('patients').select('id, name, portal_username, portal_password').order('id', { ascending: false }).then(({ data }) => {
            if (data) {
                setPatients(data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    portal_username: p.portal_username,
                    portal_password: p.portal_password
                })));
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

            } else {
                setWeeklyDiet(getInitialWeeklyDiet());
                setUserGoals({ kcal: 2000, p: 150, c: 200, f: 65 });

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
        const normalizeStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const f = (q: string): FoodItem => {
            const query = normalizeStr(q);
            const found = db.find(x => normalizeStr(x.name).includes(query));
            if (!found) {
                console.warn(`[AutoIA] Could not find food matching "${q}"`);
                // Safe fallback: Pollo if protein, otherwise Tomate (very low kcal)
                const safeFallback = db.find(x => normalizeStr(x.name) === 'tomate') || db[db.length - 1]!;
                return safeFallback;
            }
            return found;
        };
        const genId = () => `ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const round10 = (g: number) => Math.max(10, Math.round(g / 10) * 10);

        // Scale an ingredient so it provides `targetGrams` of a given macro.
        // Returns the new `grams` to set on the food item.
        const gramsForMacro = (food: FoodItem, macroKey: 'p' | 'c' | 'f', targetGrams: number): number => {
            const macroPer100g = food[macroKey];
            if (!macroPer100g || macroPer100g <= 0) {
                console.warn(`[AutoIA] Food ${food.name} has 0 for macro ${macroKey}. Cannot scale. Returning 10g.`);
                return 10; // Prevent infinite grams
            }
            return round10((targetGrams / macroPer100g) * 100);
        };

        // Each dish template defines:
        //  - name: dish display name
        //  - protein / carb / fat: the MAIN source for each macro (used for scaling)
        //  - veggies: fixed-portion vegetables/aromatics (not scaled)
        //  - extras: other fixed items (sauces, garnishes)
        type DishTemplate = {
            name: string;
            protein?: { food: FoodItem }; // scaled to targetP
            carb?: { food: FoodItem };    // scaled to targetC
            fat?: { food: FoodItem };     // scaled to targetF
            veggies: { food: FoodItem; grams: number }[];
            extras?: { food: FoodItem; grams: number }[];
        };

        // ─── Dish libraries by meal type ─────────────────────────────────────
        const breakfastDishes: DishTemplate[] = [
            {
                name: 'Tortilla de Claras con Tostada',
                protein: { food: f('clara') },
                carb: { food: f('pan') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('tomate'), grams: 100 }],
            },
            {
                name: 'Porridge de Avena con Plátano',
                protein: { food: f('leche') },
                carb: { food: f('avena') },
                fat: { food: f('nuez') },
                veggies: [],
                extras: [{ food: f('plátano'), grams: 80 }],
            },
            {
                name: 'Huevos Revueltos con Aguacate y Pan',
                protein: { food: f('huevo') },
                carb: { food: f('pan') },
                fat: { food: f('aguacate') },
                veggies: [{ food: f('tomate'), grams: 100 }],
            },
            {
                name: 'Yogur Griego con Frutos Secos y Avena',
                protein: { food: f('yogur') },
                carb: { food: f('avena') },
                fat: { food: f('nuez') },
                veggies: [],
                extras: [{ food: f('plátano'), grams: 60 }],
            },
        ];

        const lunchDishes: DishTemplate[] = [
            {
                name: 'Pollo a la Plancha con Arroz y Verduras',
                protein: { food: f('pechuga de pollo') },
                carb: { food: f('arroz') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('brócoli'), grams: 150 }, { food: f('tomate'), grams: 80 }],
            },
            {
                name: 'Pasta con Ternera y Tomate',
                protein: { food: f('carne picada de ter') },
                carb: { food: f('pasta') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('tomate'), grams: 150 }, { food: f('espinaca'), grams: 80 }],
            },
            {
                name: 'Salmón al Horno con Patata y Espinacas',
                protein: { food: f('salmón') },
                carb: { food: f('patata') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('espinaca'), grams: 150 }, { food: f('tomate'), grams: 80 }],
            },
            {
                name: 'Lentejas con Verduras',
                protein: { food: f('lenteja') },
                carb: { food: f('lenteja') }, // lentils cover both
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('zanahoria'), grams: 80 }, { food: f('tomate'), grams: 80 }],
            },
            {
                name: 'Merluza al Vapor con Arroz y Brócoli',
                protein: { food: f('merluza') },
                carb: { food: f('arroz') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('brócoli'), grams: 200 }],
            },
        ];

        const dinnerDishes: DishTemplate[] = [
            {
                name: 'Ensalada Mediterránea con Atún',
                protein: { food: f('atún') },
                carb: { food: f('garbanz') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('lechuga'), grams: 100 }, { food: f('tomate'), grams: 100 }],
            },
            {
                name: 'Revuelto de Claras con Verduras',
                protein: { food: f('clara') },
                carb: { food: f('pan') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('espinaca'), grams: 150 }, { food: f('tomate'), grams: 80 }],
            },
            {
                name: 'Salmón a la Plancha con Ensalada Verde',
                protein: { food: f('salmón') },
                carb: { food: f('patata') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('lechuga'), grams: 100 }, { food: f('tomate'), grams: 100 }],
            },
            {
                name: 'Pollo al Horno con Verduras Asadas',
                protein: { food: f('pechuga de pollo') },
                carb: { food: f('patata') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('brócoli'), grams: 150 }, { food: f('zanahoria'), grams: 80 }],
            },
            {
                name: 'Crema de Verduras con Huevo Duro',
                protein: { food: f('huevo') },
                carb: { food: f('patata') },
                fat: { food: f('aceite de oliva') },
                veggies: [{ food: f('brócoli'), grams: 200 }, { food: f('zanahoria'), grams: 100 }],
            },
        ];

        const snackDishes: DishTemplate[] = [
            {
                name: 'Yogur con Nueces y Plátano',
                protein: { food: f('yogur') },
                carb: { food: f('plátano') },
                fat: { food: f('nuez') },
                veggies: [],
            },
            {
                name: 'Tortita de Avena con Claras',
                protein: { food: f('clara') },
                carb: { food: f('avena') },
                fat: { food: f('nuez') },
                veggies: [],
            },
            {
                name: 'Fruta con Queso Fresco',
                protein: { food: f('queso') },
                carb: { food: f('plátano') },
                fat: { food: f('nuez') },
                veggies: [],
            },
        ];

        setMeals((prev: Meals) => {
            const keys = Object.keys(prev);
            const mealCount = keys.length || 1;
            const newMeals: Meals = {};

            // Per-meal macro targets (split evenly across ALL meals)
            const mealTargetKcal = userGoals.kcal / mealCount;
            const mealTargetP = (userGoals.p || 0) / mealCount;
            const mealTargetC = (userGoals.c || 0) / mealCount;
            const mealTargetF = (userGoals.f || 0) / mealCount;

            // Track which template indices have been used to avoid repeats
            const usedIndices: Record<string, Set<number>> = {
                breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set()
            };

            keys.forEach((key) => {
                const meal = prev[key];
                if (!meal) return;

                const mealName = meal.name.toLowerCase();

                // Identify meal type
                let pool: DishTemplate[];
                let poolKey: string;
                if (mealName.includes('desayuno') || mealName.includes('mañana')) {
                    pool = breakfastDishes; poolKey = 'breakfast';
                } else if (mealName.includes('comida') || mealName.includes('almuerzo')) {
                    pool = lunchDishes; poolKey = 'lunch';
                } else if (mealName.includes('cena')) {
                    pool = dinnerDishes; poolKey = 'dinner';
                } else {
                    pool = snackDishes; poolKey = 'snack';
                }

                // Pick a random dish template (avoid repeats as much as possible)
                let idx = Math.floor(Math.random() * pool.length);
                let tries = 0;
                while (usedIndices[poolKey]!.has(idx) && tries < pool.length) {
                    idx = (idx + 1) % pool.length;
                    tries++;
                }
                usedIndices[poolKey]!.add(idx);
                const dish = pool[idx]!;

                // ── Step 1: build fixed-portion items (veggies + extras) ──────────
                const fixedItems: FoodItem[] = [];
                dish.veggies.forEach(v => fixedItems.push({ ...v.food, instanceId: genId(), grams: v.grams }));
                dish.extras?.forEach(e => fixedItems.push({ ...e.food, instanceId: genId(), grams: e.grams }));
                const fixedKcal = fixedItems.reduce((s, i) => s + i.kcal * (i.grams || 0) / 100, 0);

                // ── Step 2: kcal budget remaining for macro sources ───────────────
                const budgetKcal = Math.max(50, mealTargetKcal - fixedKcal);

                // ── Step 3: normalize p/c/f targets so p*4 + c*4 + f*9 = budgetKcal
                // This keeps the ratio between macros but ensures their combined kcal
                // exactly fills the budget, so no clamp/blowup is needed afterwards.
                const impliedMacroKcal = mealTargetP * 4 + mealTargetC * 4 + mealTargetF * 9;
                const normFactor = impliedMacroKcal > 0 ? budgetKcal / impliedMacroKcal : 1;
                const adjP = mealTargetP * normFactor;
                const adjC = mealTargetC * normFactor;
                const adjF = mealTargetF * normFactor;

                // ── Step 4: scale protein / carb / fat sources ───────────────────
                const macroItems: FoodItem[] = [];
                if (dish.protein) {
                    macroItems.push({ ...dish.protein.food, instanceId: genId(), grams: gramsForMacro(dish.protein.food, 'p', adjP) });
                }
                if (dish.carb && dish.carb.food !== dish.protein?.food) {
                    macroItems.push({ ...dish.carb.food, instanceId: genId(), grams: gramsForMacro(dish.carb.food, 'c', adjC) });
                }
                if (dish.fat) {
                    const g = Math.min(gramsForMacro(dish.fat.food, 'f', adjF), 60);
                    macroItems.push({ ...dish.fat.food, instanceId: genId(), grams: g });
                }

                // ── Step 5: absorb rounding drift on protein source ──────────────
                // round10() can leave ±(kcal of 10g) drift. Correct it on the anchor.
                const macroKcal = macroItems.reduce((s, i) => s + i.kcal * (i.grams || 0) / 100, 0);
                const drift = budgetKcal - macroKcal;
                if (Math.abs(drift) > 1 && macroItems.length > 0) {
                    const anchor = macroItems[0]!;
                    const kcalPer10g = anchor.kcal / 10;
                    if (kcalPer10g > 0) {
                        const driftGrams = Math.round(drift / kcalPer10g) * 10;
                        macroItems[0] = { ...anchor, grams: Math.max(10, (anchor.grams || 10) + driftGrams) };
                    }
                }

                const finalItems = [...macroItems, ...fixedItems];
                const finalP = finalItems.reduce((s, i) => s + i.p * (i.grams || 0) / 100, 0);
                const finalC = finalItems.reduce((s, i) => s + i.c * (i.grams || 0) / 100, 0);
                const finalF = finalItems.reduce((s, i) => s + i.f * (i.grams || 0) / 100, 0);
                const finalKcal = finalItems.reduce((s, i) => s + i.kcal * (i.grams || 0) / 100, 0);

                console.log(`[AutoIA Meal ${mealName}] Targets: Kcal=${mealTargetKcal.toFixed(0)}, P=${mealTargetP.toFixed(0)}, C=${mealTargetC.toFixed(0)}, F=${mealTargetF.toFixed(0)}`);
                console.log(`[AutoIA Meal ${mealName}] Actual: Kcal=${finalKcal.toFixed(0)}, P=${finalP.toFixed(0)}, C=${finalC.toFixed(0)}, F=${finalF.toFixed(0)}`);
                console.log(`[AutoIA Meal ${mealName}] Items:`, finalItems.map(i => `${i.grams}g ${i.name}`));

                newMeals[key] = { name: meal.name, subName: dish.name, items: finalItems };
            });

            return newMeals;
        });
    };




    const handleAssignDiet = async () => {
        if (!selectedPatient) {
            alert('Selecciona un paciente en el menú superior para guardar su dieta.');
            return;
        }

        // Fetch existing data to preserve chatHistory and other fields
        const { data: existing } = await supabase.from('diets').select('data').eq('patient_id', Number(selectedPatient)).maybeSingle();
        const existingData = existing?.data || {};
        const payload = { ...existingData, weeklyDiet, userGoals };

        if (existing) {
            const { error } = await supabase.from('diets')
                .update({ data: payload })
                .eq('patient_id', Number(selectedPatient));
            if (error) {
                console.error('Error saving diet to Supabase:', error);
                localStorage.setItem(`nexo-diet-${selectedPatient}`, JSON.stringify(payload));
                alert('Dieta guardada localmente (Supabase no disponible).');
            } else {
                alert('Dieta y objetivos guardados correctamente.');
            }
        } else {
            const { error } = await supabase.from('diets')
                .insert({ patient_id: Number(selectedPatient), data: payload });
            if (error) {
                console.error('Error saving diet to Supabase:', error);
                localStorage.setItem(`nexo-diet-${selectedPatient}`, JSON.stringify(payload));
                alert('Dieta guardada localmente (Supabase no disponible).');
            } else {
                alert('Dieta y objetivos guardados correctamente.');
            }
        }
    };

    const handleShareAccess = async () => {
        const patient = patients.find(p => p.id.toString() === selectedPatient);
        if (!patient) {
            alert('Selecciona un paciente primero.');
            return;
        }

        const portalUrl = `${window.location.origin}/portal`;
        const textToShare = `Hola ${patient.name.split(' ')[0]},\n\nYa tienes disponible tu nueva dieta en tu portal personal.\n\nAccede aquí: ${portalUrl}\nUsuario: ${patient.portal_username}\nContraseña: ${patient.portal_password}\n\n¡A por todas!`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Tu Dieta Semanal - NEXO.Clinic',
                    text: textToShare,
                });
            } catch (err) {
                console.error('Error al compartir', err);
                navigator.clipboard.writeText(textToShare);
                alert('Credenciales copiadas al portapapeles. Ahora puedes pegarlas donde quieras.');
            }
        } else {
            console.log('Web Share API no soportada en este navegador, copiando al portapapeles...');
            navigator.clipboard.writeText(textToShare);
            alert('Credenciales copiadas al portapapeles. Ahora puedes pegarlas donde quieras.');
        }
    };

    const handleExportPDF = async () => {
        const patient = patients.find(p => p.id.toString() === selectedPatient);
        if (!patient) {
            alert('Selecciona un paciente primero.');
            return;
        }

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;

            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
            const pageW = pdf.internal.pageSize.getWidth();  // 297mm
            const pageH = pdf.internal.pageSize.getHeight(); // 210mm

            for (let i = 0; i < daysOfWeek.length; i++) {
                const day = daysOfWeek[i];
                const el = document.getElementById(`print-day-${day}`);
                if (!el) continue;

                const canvas = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    width: el.offsetWidth,
                    windowWidth: el.offsetWidth,
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const ratio = canvas.height / canvas.width;
                const imgW = pageW;
                const imgH = imgW * ratio;

                if (i > 0) pdf.addPage();

                // Fill the whole page black so any empty space below the image is dark
                pdf.setFillColor(10, 10, 10);
                pdf.rect(0, 0, pageW, pageH, 'F');

                pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH > pageH ? pageH : imgH);
            }

            pdf.save(`Dieta_${patient.name.replace(/\s+/g, '_')}_Completa.pdf`);

        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Hubo un error al generar el PDF.');
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

    const toggleSwappable = (mealKey: string, index: number) => {
        setMeals((prev: Meals) => {
            const targetMeal = { ...prev[mealKey] } as Meal;
            targetMeal.items = [...targetMeal.items];
            const currentItem = targetMeal.items[index];
            if (currentItem) {
                targetMeal.items[index] = { ...currentItem, isSwappable: !currentItem.isSwappable } as FoodItem;
            }
            return { ...prev, [mealKey]: targetMeal };
        });
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
            <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-white text-slate-900 font-sans">

                {/* Left Sidebar: Food Bank */}
                <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
                    <div className="p-4 border-b border-slate-200">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-red-600" />
                            Alimentos
                        </h2>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar alimento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-red-400 transition-colors"
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
                                                className="bg-slate-50 border border-slate-300 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-red-500/50 transition-colors group"
                                            >
                                                <div>
                                                    <p className="font-semibold text-sm">{food.name}</p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {food.kcal}kcal • {food.p}P {food.c}C {food.f}F
                                                    </p>
                                                </div>
                                                <GripVertical size={16} className="text-slate-500 group-hover:text-red-600" />
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
                <div className="flex-1 flex flex-col bg-white overflow-y-auto">

                    {/* Top Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white/80 backdrop-blur z-10">
                        <div>
                            <div className="flex items-center gap-2">
                                <User size={20} className="text-red-600" />
                                <select
                                    value={selectedPatient}
                                    onChange={(e) => setSelectedPatient(e.target.value)}
                                    className="bg-transparent text-xl font-bold text-slate-900 focus:outline-none focus:border-b focus:border-red-400 cursor-pointer appearance-none pr-4"
                                >
                                    <option value="" disabled className="bg-white text-slate-500">Seleccionar Paciente...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id.toString()} className="bg-white">{p.name}</option>
                                    ))}
                                    {patients.length === 0 && (
                                        <option value="" disabled className="bg-white">No hay pacientes registrados</option>
                                    )}
                                </select>
                            </div>

                            {/* Days Tabs */}
                            <div className="flex gap-2 mt-4">
                                {daysOfWeek.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setCurrentDay(day)}
                                        className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all ${currentDay === day ? 'bg-red-600 text-black shadow-sm' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}`}
                                    >
                                        {day.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex gap-6">
                                {(() => {
                                    const getColors = (cur: number, tgt: number) => {
                                        if (!tgt) return { text: 'text-slate-500', bg: 'bg-emerald-500' };
                                        const r = cur / tgt;
                                        if (r <= 1.0) return { text: 'text-emerald-600', bg: 'bg-emerald-500' };
                                        if (r <= 1.1) return { text: 'text-amber-500', bg: 'bg-amber-500' };
                                        return { text: 'text-red-600', bg: 'bg-red-600' };
                                    };

                                    const cKcal = getColors(totalKcal, userGoals.kcal);
                                    const cP = getColors(totalP, userGoals.p);
                                    const cC = getColors(totalC, userGoals.c);
                                    const cF = getColors(totalF, userGoals.f);

                                    return (
                                        <>
                                            <div className="text-center w-20">
                                                <div className={`text-lg font-bold mb-1 whitespace-nowrap ${cKcal.text}`}><span>{totalKcal.toFixed(0)}</span> <span className="text-xs text-slate-500 font-normal">/ {userGoals.kcal}</span></div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${cKcal.bg} transition-all`} style={{ width: `${Math.min(100, (totalKcal / (userGoals.kcal || 1)) * 100)}%` }}></div></div>
                                                <div className="text-[10px] font-bold text-slate-500">KCAL</div>
                                            </div>
                                            <div className="text-center w-20">
                                                <div className={`text-lg font-bold mb-1 whitespace-nowrap ${cP.text}`}><span>{totalP.toFixed(0)}</span> <span className="text-xs text-slate-500 font-normal">/ {userGoals.p}</span></div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${cP.bg} transition-all`} style={{ width: `${Math.min(100, (totalP / (userGoals.p || 1)) * 100)}%` }}></div></div>
                                                <div className="text-[10px] font-bold text-slate-500">PRO (g)</div>
                                            </div>
                                            <div className="text-center w-20">
                                                <div className={`text-lg font-bold mb-1 whitespace-nowrap ${cC.text}`}><span>{totalC.toFixed(0)}</span> <span className="text-xs text-slate-500 font-normal">/ {userGoals.c}</span></div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${cC.bg} transition-all`} style={{ width: `${Math.min(100, (totalC / (userGoals.c || 1)) * 100)}%` }}></div></div>
                                                <div className="text-[10px] font-bold text-slate-500">CARB (g)</div>
                                            </div>
                                            <div className="text-center w-20">
                                                <div className={`text-lg font-bold mb-1 whitespace-nowrap ${cF.text}`}><span>{totalF.toFixed(0)}</span> <span className="text-xs text-slate-500 font-normal">/ {userGoals.f}</span></div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-1 overflow-hidden"><div className={`h-full ${cF.bg} transition-all`} style={{ width: `${Math.min(100, (totalF / (userGoals.f || 1)) * 100)}%` }}></div></div>
                                                <div className="text-[10px] font-bold text-slate-500">GRA (g)</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <button onClick={addMeal} className="bg-slate-50 text-slate-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-100 transition-colors border border-slate-300">
                                <Plus size={16} />
                                Añadir Comida
                            </button>

                            <button onClick={handleAutoIA} className="bg-slate-50 text-red-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-100 transition-colors border border-slate-300">
                                <Wand2 size={16} />
                                Auto IA
                            </button>

                            {/* Nuevos botones: Compartir y PDF */}
                            <div className="flex gap-2 ml-4">
                                <button onClick={handleShareAccess} title="Compartir acceso al portal" className="bg-slate-50 text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-300">
                                    <Share2 size={18} />
                                </button>
                                <button onClick={handleExportPDF} title="Exportar dieta a PDF" className="bg-slate-50 text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-300">
                                    <Download size={18} />
                                </button>
                            </div>

                            <button onClick={handleAssignDiet} className="bg-red-600 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-sm">
                                <Save size={16} />
                                Guardar
                            </button>
                        </div>
                    </div>

                    {/* Meals Board (Printable Area) */}
                    <div id="diet-print-area" className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.keys(meals).map((mealKey) => {
                            const meal = meals[mealKey]!;
                            let mKcal = 0, mP = 0, mC = 0, mF = 0;
                            meal.items.forEach(i => {
                                const r = (i.grams || 100) / 100;
                                mKcal += i.kcal * r; mP += i.p * r; mC += i.c * r; mF += i.f * r;
                            });

                            return (
                                <div key={mealKey} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col">
                                    {/* Meal Header */}
                                    <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
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
                                                className="bg-transparent text-lg font-bold text-red-600 focus:outline-none focus:border-b focus:border-red-400 w-full"
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
                                                className="bg-transparent text-sm text-slate-600 mt-1 italic focus:outline-none focus:border-b focus:border-neutral-500 w-full placeholder:text-slate-500"
                                            />
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
                                            <button
                                                onClick={() => removeMeal(mealKey)}
                                                className="text-slate-500 hover:text-red-600 transition-colors p-1"
                                                title="Eliminar comida"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="text-xs text-slate-600 text-right">
                                                {mKcal.toFixed(0)}kcal{'\n'}
                                                {mP.toFixed(0)}p {mC.toFixed(0)}c {mF.toFixed(0)}g
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropzone */}
                                    <Droppable droppableId={mealKey}>
                                        {(provided, snapshot) => (
                                            <div
                                                className={`flex-1 min-h-[200px] rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-red-900/10 border-2 border-dashed border-red-500/50' : 'bg-white border border-neutral-900'
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
                                                                    className="bg-slate-50 border border-slate-300 p-3 rounded-lg flex flex-col mb-2 shadow-sm gap-2"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-semibold text-sm truncate">{food.name}</p>
                                                                            <div className="flex gap-2 items-center mt-1">
                                                                                <p className="text-xs font-bold text-slate-900">{(food.kcal * r).toFixed(0)} kcal</p>
                                                                                <p className="text-[10px] text-pink-600">{(food.p * r).toFixed(1)}p</p>
                                                                                <p className="text-[10px] text-red-600">{(food.c * r).toFixed(1)}c</p>
                                                                                <p className="text-[10px] text-red-600">{(food.f * r).toFixed(1)}g</p>
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
                                                                                    className="w-14 bg-white border border-slate-300 rounded px-1 py-1 text-xs text-right focus:outline-none focus:border-red-400"
                                                                                />
                                                                                <span className="text-xs text-slate-500 ml-1 mr-2">g</span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleSwappable(mealKey, index)}
                                                                                title={food.isSwappable ? "Intercambio permitido" : "Permitir intercambio"}
                                                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${food.isSwappable
                                                                                    ? 'bg-red-50 text-red-600 border-red-200 shadow-sm ring-1 ring-red-400/50'
                                                                                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                SWAP
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removeFood(mealKey, index)}
                                                                                className="text-slate-500 hover:text-red-600 p-1"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {/* Dish Selector */}
                                                                    <div className="flex justify-between items-center border-t border-slate-300/50 pt-2 mt-1">
                                                                        <span className="text-[10px] uppercase font-bold text-slate-500">Plato:</span>
                                                                        <select
                                                                            value={food.dish || ''}
                                                                            onChange={(e) => updateDish(mealKey, index, e.target.value)}
                                                                            className="bg-white border border-slate-300 rounded text-xs px-2 py-1 text-slate-900 focus:outline-none focus:border-red-400 w-32"
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
                                                    <div className="h-full flex items-center justify-center flex-col text-slate-500 pb-10">
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


            {/* === Hidden per-day print divs === */}
            {daysOfWeek.map((day) => {
                const dayMeals = weeklyDiet[day] || initialDailyMeals;
                let dayKcal = 0, dayP = 0, dayC = 0, dayF = 0;
                Object.values(dayMeals).forEach(meal => {
                    meal.items.forEach(item => {
                        const ratio = (item.grams || 100) / 100;
                        dayKcal += item.kcal * ratio;
                        dayP += item.p * ratio;
                        dayC += item.c * ratio;
                        dayF += item.f * ratio;
                    });
                });
                return (
                    <div
                        key={day}
                        id={`print-day-${day}`}
                        style={{
                            position: 'absolute', top: '-99999px', left: '-99999px',
                            width: '1050px', backgroundColor: '#ffffff', color: '#111111',
                            fontFamily: 'sans-serif', padding: '32px', boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#f87171' }}>
                                    {patients.find(p => p.id.toString() === selectedPatient)?.name || 'Paciente'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 700, marginTop: '4px' }}>Día: {day}</div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: '#111111' }}>
                                NOYA<span style={{ color: '#f87171' }}> CENTRE</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                            {Object.keys(dayMeals).map((mealKey) => {
                                const meal = dayMeals[mealKey]!;
                                let mK = 0, mP = 0, mC = 0, mF = 0;
                                meal.items.forEach(i => { const r = (i.grams || 100) / 100; mK += i.kcal * r; mP += i.p * r; mC += i.c * r; mF += i.f * r; });
                                return (
                                    <div key={mealKey} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px' }}>
                                        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '10px' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f87171' }}>{meal.name}</div>
                                            {meal.subName && <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>{meal.subName}</div>}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                                                <span style={{ fontWeight: 700 }}>{mK.toFixed(0)} kcal</span>
                                                <span style={{ color: '#f472b6' }}>{mP.toFixed(1)}p</span>
                                                <span style={{ color: '#f87171' }}>{mC.toFixed(1)}c</span>
                                                <span style={{ color: '#fb923c' }}>{mF.toFixed(1)}g</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {meal.items.map((food, idx) => {
                                                const r = (food.grams || 100) / 100;
                                                return (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ paddingRight: '6px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111111', lineHeight: 1.3 }}>{food.name}</div>
                                                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', marginTop: '2px' }}>
                                                                <span style={{ fontWeight: 600, color: '#374151' }}>{(food.kcal * r).toFixed(0)} kcal</span>
                                                                <span style={{ color: '#f472b6' }}>{(food.p * r).toFixed(1)}p</span>
                                                                <span style={{ color: '#f87171' }}>{(food.c * r).toFixed(1)}c</span>
                                                                <span style={{ color: '#fb923c' }}>{(food.f * r).toFixed(1)}g</span>
                                                            </div>
                                                            {food.dish && <div style={{ fontSize: '9px', color: '#6b7280' }}>Plato: {food.dish}</div>}
                                                        </div>
                                                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#dc2626', flexShrink: 0 }}>{food.grams || 100}g</div>
                                                    </div>
                                                );
                                            })}
                                            {meal.items.length === 0 && <div style={{ fontSize: '11px', color: '#525252', fontStyle: 'italic' }}>Sin alimentos.</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '18px', borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: '24px', backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                                {[['KCAL TOTAL', '#a3a3a3', dayKcal.toFixed(0)], ['PROTEÍNA', '#dc2626', dayP.toFixed(0) + 'g'], ['CARBOS', '#3b82f6', dayC.toFixed(0) + 'g'], ['GRASAS', '#fb923c', dayF.toFixed(0) + 'g']].map(([label, color, val]) => (
                                    <div key={label as string} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '8px', fontWeight: 700, color: color as string, marginBottom: '2px', letterSpacing: '0.05em' }}>{label}</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#111111' }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
            {daysOfWeek.map((day, dayIndex) => {
                const dayMeals = weeklyDiet[day] || initialDailyMeals;
                let dayKcal = 0, dayP = 0, dayC = 0, dayF = 0;
                Object.values(dayMeals).forEach(meal => {
                    meal.items.forEach(item => {
                        const ratio = (item.grams || 100) / 100;
                        dayKcal += item.kcal * ratio;
                        dayP += item.p * ratio;
                        dayC += item.c * ratio;
                        dayF += item.f * ratio;
                    });
                });

                return null; // Rendered by the new per-day print divs above
            })}

        </DragDropContext>
    );
}
