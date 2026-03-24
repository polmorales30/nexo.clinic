"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, X, LineChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from "../../lib/supabase";
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

type ProgressEntry = {
    id: number;
    // Admin-side entries use `dateStr`, portal patient entries use `date`
    dateStr?: string;
    date?: string;
    weight: string;
    chest: string;
    waist: string;
    hip: string;
    clavicle: string;
    quadriceps: string;
    biceps: string;
    fat_percent?: string; // from portal
    photoFrontal: string | null;
    photoBack: string | null;
    notes: string;
};

type Patient = {
    id: number;
    name: string;
    age: number;
    goal: string;
    lastVisit: string;
    nextVisit: string;
    status: string;
    progress?: ProgressEntry[];
};

export default function ProgresoPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'datos' | 'fotos'>('datos');

    // Helper to normalize the date field (admin uses `dateStr`, portal uses `date`)
    const getEntryDate = (entry: ProgressEntry): string => entry.dateStr || entry.date || '';

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newProgress, setNewProgress] = useState<ProgressEntry>({
        id: 0, dateStr: '', weight: '', chest: '', waist: '', hip: '', clavicle: '', quadriceps: '', biceps: '', photoFrontal: null, photoBack: null, notes: ''
    });

    useEffect(() => {
        setNewProgress(prev => ({ ...prev, dateStr: new Date().toISOString().split('T')[0] || '' }));

        async function loadPatients() {
            const { data, error } = await supabase
                .from('patients')
                .select('id, name, age, goal, last_visit, next_visit, status')
                .order('id', { ascending: false });

            if (!error && data) {
                // Map DB snake_case to frontend camelCase if necessary, or just use as is
                const mapped = data.map((p: any) => ({
                    ...p,
                    lastVisit: p.last_visit,
                    nextVisit: p.next_visit
                }));
                setPatients(mapped);
            }
            setIsLoaded(true);
        }

        loadPatients();
    }, []);

    useEffect(() => {
        if (!selectedPatientId) return;

        async function loadProgress() {
            const { data, error } = await supabase
                .from('patient_check_ins')
                .select('*')
                .eq('patient_id', selectedPatientId)
                .order('id', { ascending: true });

            if (!error && data) {
                // Map the new column names (photo_front_url, photo_back_url) to the older frontend names
                const mappedData = data.map((d: any) => ({
                    ...d,
                    photoFrontal: d.photo_front_url || d.photoFrontal,
                    photoBack: d.photo_back_url || d.photoBack,
                    fat: d.fat_percent || d.fat
                }));

                setPatients(prev => prev.map(p => {
                    if (p.id === selectedPatientId) {
                        return { ...p, progress: mappedData };
                    }
                    return p;
                }));
            }
        }

        loadProgress();
    }, [selectedPatientId]);

    const handleAddProgress = async () => {
        if (!selectedPatientId) return;
        const hasData = newProgress.weight || newProgress.notes || newProgress.chest || newProgress.waist || newProgress.hip || newProgress.clavicle || newProgress.quadriceps || newProgress.biceps || newProgress.photoFrontal || newProgress.photoBack;
        if (!hasData) return;

        const entry = {
            patient_id: selectedPatientId,
            dateStr: newProgress.dateStr,
            weight: newProgress.weight,
            chest: newProgress.chest,
            waist: newProgress.waist,
            hip: newProgress.hip,
            clavicle: newProgress.clavicle,
            quadriceps: newProgress.quadriceps,
            biceps: newProgress.biceps,
            photo_front_url: newProgress.photoFrontal,
            photo_back_url: newProgress.photoBack,
            notes: newProgress.notes
        };

        const { data, error } = await supabase
            .from('patient_check_ins')
            .insert([entry])
            .select();

        if (!error && data) {
            setPatients(patients.map(p => {
                if (p.id === selectedPatientId) {
                    const currentProgress = p.progress || [];
                    return { ...p, progress: [...currentProgress, data[0]] };
                }
                return p;
            }));

            setNewProgress({
                id: 0, dateStr: new Date().toISOString().split('T')[0] || '', weight: '', chest: '', waist: '', hip: '', clavicle: '', quadriceps: '', biceps: '', photoFrontal: null, photoBack: null, notes: ''
            });
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'frontal' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewProgress(prev => ({
                    ...prev,
                    [side === 'frontal' ? 'photoFrontal' : 'photoBack']: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteProgress = async (entryId: number) => {
        if (!selectedPatientId) return;

        const { error } = await supabase
            .from('patient_check_ins')
            .delete()
            .eq('id', entryId);

        if (!error) {
            setPatients(patients.map(p => {
                if (p.id === selectedPatientId) {
                    return { ...p, progress: (p.progress || []).filter(e => e.id !== entryId) };
                }
                return p;
            }));
        }
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const patientProgress = selectedPatient?.progress || [];

    return (
        <div className="min-h-[calc(100vh-80px)] bg-white text-slate-900 p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Seguimiento y Progreso</h1>
                    <p className="text-slate-600 mt-1">Registra medidas y analiza la evolución de tus pacientes</p>
                </div>

                <div className="w-64">
                    <select
                        value={selectedPatientId || ''}
                        onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 appearance-none font-medium text-sm"
                    >
                        <option value="" disabled>Seleccionar Paciente...</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedPatient ? (
                <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-white text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 text-slate-500">
                        <LineChart size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Selecciona un Paciente</h2>
                    <p className="text-slate-600 max-w-sm">
                        Para registrar o visualizar el progreso, por favor selecciona un paciente en el menú superior.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Nuevo Registro */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Plus className="text-red-600" size={20} />
                            Añadir Nuevo Registro
                        </h3>

                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                            <div className="relative">
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Fecha</label>
                                <button
                                    type="button"
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors text-left hover:border-red-400"
                                >
                                    {newProgress.dateStr || 'Seleccionar...'}
                                </button>
                                {showDatePicker && (
                                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xl">
                                        <input
                                            type="date"
                                            value={newProgress.dateStr}
                                            onChange={e => {
                                                setNewProgress({ ...newProgress, dateStr: e.target.value });
                                                setShowDatePicker(false);
                                            }}
                                            className="bg-white text-slate-900 px-4 py-3 text-sm focus:outline-none w-full"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Peso (kg)</label>
                                <input type="number" step="0.1" value={newProgress.weight} onChange={e => setNewProgress({ ...newProgress, weight: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Pecho (cm)</label>
                                <input type="number" step="0.1" value={newProgress.chest} onChange={e => setNewProgress({ ...newProgress, chest: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Cintura (cm)</label>
                                <input type="number" step="0.1" value={newProgress.waist} onChange={e => setNewProgress({ ...newProgress, waist: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Cadera (cm)</label>
                                <input type="number" step="0.1" value={newProgress.hip} onChange={e => setNewProgress({ ...newProgress, hip: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Bíceps (cm)</label>
                                <input type="number" step="0.1" value={newProgress.biceps} onChange={e => setNewProgress({ ...newProgress, biceps: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Clavícula (cm)</label>
                                <input type="number" step="0.1" value={newProgress.clavicle} onChange={e => setNewProgress({ ...newProgress, clavicle: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Cuádriceps (cm)</label>
                                <input type="number" step="0.1" value={newProgress.quadriceps} onChange={e => setNewProgress({ ...newProgress, quadriceps: e.target.value })} onFocus={e => e.target.select()} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" placeholder="0.0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-6 border-t border-slate-200/50">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-2 uppercase tracking-wider">📸 Foto: Frontal Relajado</label>
                                <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e, 'frontal')} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-red-600 hover:file:bg-slate-100 transition-colors cursor-pointer" />
                                {newProgress.photoFrontal && <img src={newProgress.photoFrontal} alt="Preview" className="mt-2 h-20 rounded-md object-cover border border-slate-300" />}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-2 uppercase tracking-wider">📸 Foto: Espalda Relajado</label>
                                <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e, 'back')} className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-red-600 hover:file:bg-slate-100 transition-colors cursor-pointer" />
                                {newProgress.photoBack && <img src={newProgress.photoBack} alt="Preview" className="mt-2 h-20 rounded-md object-cover border border-slate-300" />}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <input type="text" placeholder="Observaciones o notas de la consulta..." value={newProgress.notes} onChange={e => setNewProgress({ ...newProgress, notes: e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors" />
                            <button type="button" onClick={handleAddProgress} className="bg-red-600 text-black px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-sm">
                                Guardar Registro
                            </button>
                        </div>
                    </div>

                    {/* Historial de Registros */}
                    <div>
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <LineChart className="text-red-600" size={24} />
                                Historial Clínico
                            </h3>
                            {patientProgress.length > 0 && (
                                <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                                    <button
                                        onClick={() => setActiveTab('datos')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'datos' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                                        Datos y Gráficas
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('fotos')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'fotos' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                                        Comparativa Visual
                                    </button>
                                </div>
                            )}
                        </div>

                        {patientProgress.length === 0 ? (
                            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                                <p className="text-slate-500 font-medium">Aún no hay registros guardados para {selectedPatient.name}.</p>
                            </div>
                        ) : activeTab === 'fotos' ? (
                            <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900 px-2">
                                {patientProgress.filter(p => p.photoFrontal || p.photoBack).sort((a, b) => new Date(getEntryDate(a)).getTime() - new Date(getEntryDate(b)).getTime()).map((entry, idx) => (
                                    <div key={entry.id} className="bg-white border border-slate-200 rounded-3xl p-5 shrink-0 w-72 snap-center flex flex-col gap-4 shadow-xl hover:border-slate-300 transition-colors">
                                        <div className="text-center pb-4 border-b border-slate-200/50">
                                            <span className="bg-white text-slate-600 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block">Mes {idx + 1}</span>
                                            <div className="font-bold text-lg text-red-600">
                                                {new Date(getEntryDate(entry)).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </div>
                                            {entry.weight && <div className="text-slate-900 font-medium mt-1">{entry.weight} kg</div>}
                                        </div>
                                        {entry.photoFrontal ? (
                                            <div>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block text-center">Frontal</span>
                                                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-white relative group">
                                                    <img src={entry.photoFrontal} alt="Frontal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-[3/4] border-2 border-dashed border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-500 font-medium text-sm text-center p-4 bg-white/30">Sin foto<br />frontal</div>
                                        )}
                                        {entry.photoBack ? (
                                            <div>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 block text-center mt-2">Espalda</span>
                                                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-white relative group">
                                                    <img src={entry.photoBack} alt="Espalda" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-[3/4] border-2 border-dashed border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-500 font-medium text-sm text-center p-4 bg-white/30 mt-2">Sin foto<br />espalda</div>
                                        )}
                                    </div>
                                ))}
                                {patientProgress.filter(p => p.photoFrontal || p.photoBack).length === 0 && (
                                    <div className="w-full text-center py-16 text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                                        No hay ningún registro clínico que incluya fotografías para poder comparar.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                        <h4 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wider text-center">Evolución del Peso</h4>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsLineChart data={[...patientProgress].map(p => ({ ...p, dateStr: getEntryDate(p as any), weight: parseFloat(p.weight) || 0, fat: parseFloat((p as any).fat) || 0 })).sort((a, b) => new Date(getEntryDate(a as any)).getTime() - new Date(getEntryDate(b as any)).getTime())}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                                    <XAxis dataKey="dateStr" stroke="#525252" fontSize={12} tickMargin={10} tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} />
                                                    <YAxis domain={['auto', 'auto']} stroke="#525252" fontSize={12} tickFormatter={(val) => `${val}kg`} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#dc2626' }} />
                                                    <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                    <Line type="monotone" dataKey="fat" name="% Grasa" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                </RechartsLineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                        <h4 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wider text-center">Evolución de Perímetros</h4>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsLineChart data={[...patientProgress].map(p => ({ ...p, dateStr: getEntryDate(p as any), chest: parseFloat(p.chest) || 0, waist: parseFloat(p.waist) || 0, hip: parseFloat(p.hip) || 0, clavicle: parseFloat(p.clavicle) || 0, quadriceps: parseFloat(p.quadriceps) || 0, biceps: parseFloat(p.biceps) || 0 })).sort((a, b) => new Date(getEntryDate(a as any)).getTime() - new Date(getEntryDate(b as any)).getTime())}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                                    <XAxis dataKey="dateStr" stroke="#525252" fontSize={12} tickMargin={10} tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} />
                                                    <YAxis domain={['auto', 'auto']} stroke="#525252" fontSize={12} tickFormatter={(val) => `${val}cm`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', color: '#fff' }}
                                                        labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                    <Line type="monotone" dataKey="chest" name="Pecho" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="waist" name="Cintura" stroke="#f472b6" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="hip" name="Cadera" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="clavicle" name="Clavícula" stroke="#d946ef" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="quadriceps" name="Cuádriceps" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="biceps" name="Bíceps" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                                                </RechartsLineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-4">
                                    {patientProgress.slice().reverse().map((entry, index) => {
                                        // Calculate diff from previous (chronologically previous is next index since we reversed array)
                                        const reversedArray = patientProgress.slice().reverse();
                                        const previousEntry = reversedArray[index + 1];

                                        let weightDiff = 0;
                                        if (previousEntry && previousEntry.weight && entry.weight) {
                                            weightDiff = parseFloat(entry.weight) - parseFloat(previousEntry.weight);
                                        }

                                        return (
                                            <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl p-6 relative hover:border-slate-300 transition-colors group">
                                                <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                                                    <button onClick={() => handleDeleteProgress(entry.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10">
                                                        <X size={18} />
                                                    </button>

                                                    <div className="lg:w-48 shrink-0">
                                                        <span className="text-red-600 font-bold text-sm block mb-1 tracking-wider uppercase">{new Date(getEntryDate(entry)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-4xl font-black text-slate-900">{entry.weight || '-'}<span className="text-lg font-medium text-slate-500 ml-1">kg</span></span>
                                                            {weightDiff !== 0 && (
                                                                <span className={`text-sm font-bold flex items-center ${weightDiff > 0 ? 'text-red-600' : 'text-red-600'}`}>
                                                                    {weightDiff > 0 ? <TrendingUp size={14} className="mr-0.5" /> : <TrendingDown size={14} className="mr-0.5" />}
                                                                    {Math.abs(weightDiff).toFixed(1)}
                                                                </span>
                                                            )}
                                                            {weightDiff === 0 && previousEntry && (
                                                                <span className="text-sm font-bold flex items-center text-slate-500">
                                                                    <Minus size={14} className="mr-0.5" /> 0.0
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-3 lg:grid-cols-6 gap-3 lg:border-l border-slate-200 lg:pl-6">
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Pecho</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.chest || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Cintura</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.waist || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Cadera</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.hip || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Clavícula</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.clavicle || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Cuádriceps</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.quadriceps || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50">
                                                            <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Bíceps</span>
                                                            <span className="text-lg font-bold text-slate-900">{entry.biceps || '-'} <span className="text-slate-500 text-xs">cm</span></span>
                                                        </div>
                                                    </div>

                                                    {entry.notes && (
                                                        <div className="lg:w-1/4 bg-white/50 p-4 rounded-xl border border-slate-200/50 text-sm text-slate-600 italic leading-relaxed">
                                                            "{entry.notes}"
                                                        </div>
                                                    )}
                                                </div>

                                                {(entry.photoFrontal || entry.photoBack) && (
                                                    <div className="mt-6 pt-6 border-t border-slate-200/50 flex gap-4 overflow-x-auto">
                                                        {entry.photoFrontal && (
                                                            <div className="flex flex-col gap-2 shrink-0">
                                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Frontal Relajado</span>
                                                                <div className="w-48 h-64 rounded-xl overflow-hidden border border-slate-200 bg-white">
                                                                    <img src={entry.photoFrontal} alt="Frontal" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {entry.photoBack && (
                                                            <div className="flex flex-col gap-2 shrink-0">
                                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Espalda Relajado</span>
                                                                <div className="w-48 h-64 rounded-xl overflow-hidden border border-slate-200 bg-white">
                                                                    <img src={entry.photoBack} alt="Espalda" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
