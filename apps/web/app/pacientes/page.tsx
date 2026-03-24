"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Calendar as CalendarIcon, FileText, X, Key, ClipboardList, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, MessageCircle, Send, Calculator, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type ClinicalData = {
    email?: string;
    phone?: string;
    occupation?: string;
    water?: string;
    sleep?: string;
    activity?: string;
    trainingFreq?: string;
    pathologies?: string;
    allergies?: string;
    medications?: string;
    familyHistory?: string;
    mealsPerDay?: string;
    recall24h?: string;
    consumptionFreq?: string;
    preferences?: string;
    aversions?: string;
    supplements?: string;
    additionalNotes?: string;
};

type ConsultRecord = {
    id: number;
    date: string;
    type: 'Primera Visita' | 'Seguimiento';
    weight?: string;
    fatPercent?: string;
    muscleMass?: string;
    waist?: string;
    bloodPressure?: string;
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
    history?: string;
    clinicalData?: ClinicalData;
    consultRecords?: ConsultRecord[];
    portalUsername?: string;
    portalPassword?: string;
};

const initialPatients: Patient[] = [
    { id: 1, name: 'Alex Martínez', age: 28, goal: 'Pérdida de peso', lastVisit: '15 Feb 2026', nextVisit: '22 Feb 2026', status: 'Activo' },
    { id: 2, name: 'María Solares', age: 34, goal: 'Hipertrofia', lastVisit: '10 Feb 2026', nextVisit: '10 Mar 2026', status: 'Activo' },
    { id: 3, name: 'Carlos Ruiz', age: 45, goal: 'Recomposición', lastVisit: '01 Feb 2026', nextVisit: '01 Mar 2026', status: 'Inactivo' },
    { id: 4, name: 'Laura Gómez', age: 31, goal: 'Mantenimiento', lastVisit: '20 Ene 2026', nextVisit: '-', status: 'Inactivo' },
    { id: 5, name: 'David Torres', age: 25, goal: 'Aumento de masa', lastVisit: '18 Feb 2026', nextVisit: '25 Feb 2026', status: 'Activo' },
];

export default function PacientesPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        supabase.from('patients').select('*').order('id', { ascending: false }).then(({ data }) => {
            if (data) {
                setPatients(data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    age: p.age ?? 0,
                    goal: p.goal ?? '',
                    lastVisit: p.last_visit ?? '-',
                    nextVisit: p.next_visit ?? '-',
                    status: p.status ?? 'Activo',
                    history: p.history ?? '',
                    clinicalData: p.clinical_data ?? {},
                    consultRecords: p.consult_records ?? [],
                    portalUsername: p.portal_username ?? '',
                    portalPassword: p.portal_password ?? '',
                })));
            }
            setIsLoaded(true);
        });
    }, []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [deletingPatient, setDeletingPatient] = useState<number | null>(null);

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
    const [clinicalData, setClinicalData] = useState<ClinicalData>({});
    const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
    const [consultRecords, setConsultRecords] = useState<ConsultRecord[]>([]);
    const [newConsult, setNewConsult] = useState<Omit<ConsultRecord, 'id'>>({ date: new Date().toISOString().split('T')[0] || '', type: 'Primera Visita', weight: '', fatPercent: '', muscleMass: '', waist: '', bloodPressure: '', notes: '' });
    const [showConsultForm, setShowConsultForm] = useState(false);
    const [portalCreds, setPortalCreds] = useState({ username: '', password: '' });
    const [portalSaved, setPortalSaved] = useState(false);
    // Portal patient check-ins (revisiones submitted by the patient)
    const [patientCheckIns, setPatientCheckIns] = useState<any[]>([]);

    // Chat Modal State
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatPatient, setChatPatient] = useState<Patient | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [chatDietLoading, setChatDietLoading] = useState(false);
    const [patientDiet, setPatientDiet] = useState<any>(null);
    const [patientDietExists, setPatientDietExists] = useState(false);

    const openChatModal = async (patient: Patient) => {
        setChatPatient(patient);
        setChatMessages([]);
        setPatientDiet(null);
        setPatientDietExists(false);
        setNewChatMessage('');
        setIsChatModalOpen(true);
        setChatDietLoading(true);

        const { data } = await supabase.from('diets').select('data').eq('patient_id', patient.id).maybeSingle();
        if (data && data.data) {
            setPatientDiet(data.data);
            setPatientDietExists(true);
            if (data.data.chatHistory) {
                setChatMessages(data.data.chatHistory);
            }
        }
        setChatDietLoading(false);
    };

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatMessage.trim() || !chatPatient) return;

        const msg = {
            id: Date.now().toString(),
            sender: 'nutritionist',
            text: newChatMessage.trim(),
            time: new Date().toISOString()
        };

        const newHistory = [...chatMessages, msg];
        setChatMessages(newHistory);
        setNewChatMessage('');

        const updatedData = { ...(patientDiet || {}), chatHistory: newHistory };
        setPatientDiet(updatedData);

        if (patientDietExists) {
            await supabase.from('diets')
                .update({ data: updatedData })
                .eq('patient_id', chatPatient.id);
        } else {
            const { error } = await supabase.from('diets')
                .insert({ patient_id: chatPatient.id, data: updatedData });
            if (!error) setPatientDietExists(true);
        }
    };

    // Chat Realtime Sync
    useEffect(() => {
        if (!isChatModalOpen || !chatPatient) return;

        const channel = supabase.channel('realtime:nutritionist-chat')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'diets', filter: `patient_id=eq.${chatPatient.id}` }, (payload: any) => {
                if (payload.new && payload.new.data) {
                    setPatientDiet(payload.new.data);
                    if (payload.new.data.chatHistory) {
                        setChatMessages(payload.new.data.chatHistory);
                    }
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isChatModalOpen, chatPatient]);

    // Calculator State
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [calcData, setCalcData] = useState({
        age: 30, gender: 'Hombre', weight: 75, height: 175,
        activity: 1.2, goal: 0,
        protPercent: 30, fatPercent: 35
    });
    const [userGoals, setUserGoals] = useState({ kcal: 2000, p: 150, c: 200, f: 65 });
    const [tmb, setTmb] = useState(0);
    const [tdee, setTdee] = useState(0);
    const [dailyKcal, setDailyKcal] = useState(0);
    const [patientDietData, setPatientDietData] = useState<any>(null); // To save the full old data during upsert

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
            finalKcal = currentTdee - (currentTdee * Math.abs(calcData.goal));
        } else if (calcData.goal > 0) {
            finalKcal = currentTdee + (currentTdee * calcData.goal);
        }

        setTmb(Math.round(currentTmb));
        setTdee(Math.round(currentTdee));
        setDailyKcal(Math.round(finalKcal));
    }, [calcData]);

    const handleSaveCalculator = async () => {
        if (!viewingPatient) return;

        // Compute final macros based on the user choices in the modal
        const targetProts = Math.round((dailyKcal * (calcData.protPercent / 100)) / 4);
        const targetFats = Math.round((dailyKcal * (calcData.fatPercent / 100)) / 9);
        const targetCarbs = Math.round((dailyKcal - (targetProts * 4) - (targetFats * 9)) / 4);

        const newGoals = { kcal: dailyKcal, p: targetProts, c: targetCarbs, f: targetFats };

        setUserGoals(newGoals);
        setIsCalcOpen(false);

        // Save to supabase
        const payload = { ...patientDietData, userGoals: newGoals, calcData };
        await supabase.from('diets').upsert({
            patient_id: viewingPatient.id,
            data: payload,
            updated_at: new Date().toISOString()
        }, { onConflict: 'patient_id' });

        // Sync back to memory just in case
        setPatientDietData(payload);
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '', age: '', goal: 'Pérdida de peso', status: 'Activo'
    });

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('recent');

    // To compute dynamic lastVisit and nextVisit we need all appointments
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    useEffect(() => {
        const savedAppts = localStorage.getItem('nexo-appointments');
        if (savedAppts) setAllAppointments(JSON.parse(savedAppts));
    }, []);

    const filteredPatients = patients
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(p => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'active') return p.status === 'Activo';
            if (statusFilter === 'inactive') return p.status === 'Inactivo';
            return true;
        })
        .map(p => {
            // Compute dynamic visits
            const pAppts = allAppointments.filter(a => a.patient === p.name && a.dateStr);
            pAppts.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const pastAppts = pAppts.filter(a => new Date(a.dateStr).getTime() < now.getTime());
            const futureAppts = pAppts.filter(a => new Date(a.dateStr).getTime() >= now.getTime());

            let computedLastVisit = p.lastVisit;
            let computedNextVisit = p.nextVisit;

            if (pastAppts.length > 0) {
                const last = pastAppts[pastAppts.length - 1];
                const d = new Date(last.dateStr);
                computedLastVisit = `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })} ${d.getFullYear()}`;
            }

            if (futureAppts.length > 0) {
                const next = futureAppts[0];
                const d = new Date(next.dateStr);
                computedNextVisit = `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })} ${d.getFullYear()} a las ${next.time}`;
            } else if (pAppts.length > 0) {
                computedNextVisit = '-'; // If they had appts but no future ones
            }

            return { ...p, lastVisit: computedLastVisit, nextVisit: computedNextVisit };
        })
        .sort((a, b) => {
            if (sortOrder === 'name') {
                return a.name.localeCompare(b.name);
            }
            // recent (default) - assuming higher ID is more recent
            return b.id - a.id;
        });

    const handleDelete = async (id: number) => {
        await supabase.from('patients').delete().eq('id', id);
        setPatients(patients.filter(p => p.id !== id));
        setDeletingPatient(null);
        setIsHistoryModalOpen(false);
    };

    const openAddModal = () => {
        setEditingPatient(null);
        setFormData({ name: '', age: '', goal: 'Pérdida de peso', status: 'Activo' });
        setIsModalOpen(true);
    };

    const openEditModal = (patient: Patient) => {
        setEditingPatient(patient);
        setFormData({
            name: patient.name,
            age: patient.age.toString(),
            goal: patient.goal,
            status: patient.status
        });
        setIsModalOpen(true);
    };

    const openHistoryModal = (patient: Patient) => {
        setViewingPatient(patient);
        setClinicalData(patient.clinicalData || { additionalNotes: patient.history || '' });
        setConsultRecords(patient.consultRecords || []);
        setPortalCreds({ username: patient.portalUsername || '', password: patient.portalPassword || '' });
        setShowConsultForm(false);
        setPortalSaved(false);
        setPatientCheckIns([]);

        // Load portal check-ins submitted by this patient
        supabase.from('patient_check_ins').select('*').eq('patient_id', patient.id).order('id', { ascending: false }).then(({ data }) => {
            if (data) setPatientCheckIns(data);
        });

        const savedAppts = localStorage.getItem('nexo-appointments');
        if (savedAppts) {
            const parsed = JSON.parse(savedAppts);
            const patAppts = parsed.filter((a: any) => a.patient === patient.name);
            patAppts.sort((a: any, b: any) => {
                if (!a.dateStr || !b.dateStr) return 0;
                return new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime();
            });
            setPatientAppointments(patAppts);
        } else {
            setPatientAppointments([]);
        }

        // Fetch Calculator / Diet Goals for the Anamnesis panel
        supabase.from('diets').select('data').eq('patient_id', patient.id).single().then(({ data }) => {
            if (data && data.data) {
                setPatientDietData(data.data);
                if (data.data.calcData) setCalcData(data.data.calcData);
                if (data.data.userGoals) setUserGoals(data.data.userGoals);
            } else {
                setPatientDietData(null);
                setCalcData({
                    age: patient.age || 30, gender: 'Hombre',
                    weight: 75, height: 175,
                    activity: 1.2, goal: 0,
                    protPercent: 30, fatPercent: 35
                });
                setUserGoals({ kcal: 2000, p: 150, c: 200, f: 65 });
            }
        });

        setIsHistoryModalOpen(true);
    };

    const handleSaveHistory = async () => {
        if (!viewingPatient) return;
        // Persist clinical data and consult records to Supabase
        await supabase.from('patients').update({
            clinical_data: clinicalData,
            consult_records: consultRecords,
        }).eq('id', viewingPatient.id);
        setPatients(patients.map(p => p.id === viewingPatient.id ? { ...p, clinicalData, consultRecords } : p));
        setIsHistoryModalOpen(false);
    };

    const handleSavePortalCreds = async () => {
        if (!viewingPatient) return;
        await supabase.from('patients').update({
            portal_username: portalCreds.username,
            portal_password: portalCreds.password,
        }).eq('id', viewingPatient.id);
        setPatients(patients.map(p => p.id === viewingPatient.id ? { ...p, portalUsername: portalCreds.username, portalPassword: portalCreds.password } : p));
        setPortalSaved(true);
        setTimeout(() => setPortalSaved(false), 2000);
    };

    const handleAddConsult = async () => {
        if (!newConsult.date) return;
        const record: ConsultRecord = { ...newConsult, id: Date.now() };
        const updated = [...consultRecords, record];
        setConsultRecords(updated);
        setPatients(patients.map(p => p.id === viewingPatient?.id ? { ...p, consultRecords: updated } : p));
        // Persist to Supabase immediately
        if (viewingPatient) {
            await supabase.from('patients').update({ consult_records: updated }).eq('id', viewingPatient.id);
        }
        setNewConsult({ date: new Date().toISOString().split('T')[0] || '', type: 'Primera Visita', weight: '', fatPercent: '', muscleMass: '', waist: '', bloodPressure: '', notes: '' });
        setShowConsultForm(false);
    };

    const handleDeleteConsult = async (id: number) => {
        const updated = consultRecords.filter(r => r.id !== id);
        setConsultRecords(updated);
        setPatients(patients.map(p => p.id === viewingPatient?.id ? { ...p, consultRecords: updated } : p));
        if (viewingPatient) {
            await supabase.from('patients').update({ consult_records: updated }).eq('id', viewingPatient.id);
        }
    };

    const handleClinicalDataChange = (field: keyof ClinicalData, value: string) => {
        setClinicalData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingPatient) {
            const { data } = await supabase.from('patients').update({
                name: formData.name,
                age: Number(formData.age),
                goal: formData.goal,
                status: formData.status,
            }).eq('id', editingPatient.id).select().single();
            if (data) {
                setPatients(patients.map(p => p.id === editingPatient.id ? {
                    ...p,
                    name: formData.name,
                    age: Number(formData.age),
                    goal: formData.goal,
                    status: formData.status
                } : p));
            }
        } else {
            const { data } = await supabase.from('patients').insert({
                name: formData.name,
                age: Number(formData.age),
                goal: formData.goal,
                status: formData.status,
                last_visit: '-',
                next_visit: '-',
            }).select().single();
            if (data) {
                const newPatient: Patient = {
                    id: data.id,
                    name: data.name,
                    age: data.age,
                    goal: data.goal,
                    lastVisit: data.last_visit ?? '-',
                    nextVisit: data.next_visit ?? '-',
                    status: data.status,
                };
                setPatients([newPatient, ...patients]);
            }
        }
        setIsModalOpen(false);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-white text-slate-900 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pacientes</h1>
                    <p className="text-slate-600 mt-1">Gestiona tu cartera de pacientes y sus planes nutricionales</p>
                </div>
                <button onClick={openAddModal} className="bg-red-600 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-sm">
                    <Plus size={20} />
                    Nuevo Paciente
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, objetivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-colors"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 cursor-pointer"
                >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                </select>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 cursor-pointer"
                >
                    <option value="recent">Más recientes</option>
                    <option value="name">Por nombre (A-Z)</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 bg-white">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Nombre</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Edad</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Objetivo</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Última Visita</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Próxima Visita</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Estado</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredPatients.map(patient => (
                            <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-red-600 border border-slate-300">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-slate-900">{patient.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-900">{patient.age} años</td>
                                <td className="p-4 text-slate-900">{patient.goal}</td>
                                <td className="p-4 text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-slate-500" />
                                        {patient.lastVisit}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-slate-500" />
                                        {patient.nextVisit}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${patient.status === 'Activo'
                                        ? 'bg-red-50 text-red-600 border border-red-400/20'
                                        : 'bg-slate-50 text-slate-600 border border-slate-300'
                                        }`}>
                                        {patient.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openChatModal(patient)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors" title="Chat Integrado">
                                            <MessageCircle size={18} />
                                        </button>
                                        <button onClick={() => openHistoryModal(patient)} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors" title="Ver Historial">
                                            <FileText size={18} />
                                        </button>
                                        <button onClick={() => openEditModal(patient)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredPatients.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">
                                    No se encontraron pacientes con ese nombre.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add / Edit Patient Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Edad</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400"
                                        placeholder="Ej. 30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400"
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Objetivo Principal</label>
                                <select
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400"
                                >
                                    <option value="Pérdida de peso">Pérdida de peso</option>
                                    <option value="Aumento de masa">Aumento de masa</option>
                                    <option value="Recomposición">Recomposición física</option>
                                    <option value="Hipertrofia">Hipertrofia</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Salud">Mejora de salud</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-8 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-black font-bold hover:bg-red-600 transition-colors shadow-sm"
                                >
                                    {editingPatient ? 'Guardar Cambios' : 'Crear Paciente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal - Expediente del Paciente */}
            {isHistoryModalOpen && viewingPatient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 flex gap-2 items-center">
                                    Expediente del Paciente
                                </h2>
                                <p className="text-slate-600 mt-1">Información personal, clínica y dietética de {viewingPatient.name}.</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleSaveHistory}
                                    className="px-6 py-2 rounded-xl bg-red-600 text-black font-bold hover:bg-red-600 transition-colors shadow-sm"
                                >
                                    Guardar Cambios
                                </button>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors bg-slate-50 p-2 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 flex-1">

                            {/* Datos Personales */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Datos Personales</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                                        <input type="email" value={clinicalData.email || ''} onChange={(e) => handleClinicalDataChange('email', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                                        <input type="tel" value={clinicalData.phone || ''} onChange={(e) => handleClinicalDataChange('phone', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Ocupación</label>
                                        <input type="text" value={clinicalData.occupation || ''} onChange={(e) => handleClinicalDataChange('occupation', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Estilo de Vida */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Estilo de Vida</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Consumo de Agua (L/día)</label>
                                        <input type="text" value={clinicalData.water || ''} onChange={(e) => handleClinicalDataChange('water', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Horas de Sueño</label>
                                        <input type="text" value={clinicalData.sleep || ''} onChange={(e) => handleClinicalDataChange('sleep', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Deporte / Actividad</label>
                                        <input type="text" value={clinicalData.activity || ''} onChange={(e) => handleClinicalDataChange('activity', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Frecuencia Entrenamiento</label>
                                        <input type="text" value={clinicalData.trainingFreq || ''} onChange={(e) => handleClinicalDataChange('trainingFreq', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Salud Clínica */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Salud Clínica</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Patologías / Lesiones</label>
                                        <textarea value={clinicalData.pathologies || ''} onChange={(e) => handleClinicalDataChange('pathologies', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Alergias / Intolerancias</label>
                                        <textarea value={clinicalData.allergies || ''} onChange={(e) => handleClinicalDataChange('allergies', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Medicación Actual</label>
                                        <textarea value={clinicalData.medications || ''} onChange={(e) => handleClinicalDataChange('medications', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Antecedentes Familiares</label>
                                        <textarea value={clinicalData.familyHistory || ''} onChange={(e) => handleClinicalDataChange('familyHistory', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Perfil Nutricional */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Perfil Nutricional</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Número de Comidas al Día</label>
                                        <input type="text" value={clinicalData.mealsPerDay || ''} onChange={(e) => handleClinicalDataChange('mealsPerDay', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Cuestionario de Frecuencia de Consumo</label>
                                        <textarea value={clinicalData.consumptionFreq || ''} onChange={(e) => handleClinicalDataChange('consumptionFreq', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-28" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Recordatorio 24 Horas (¿Qué comió ayer?)</label>
                                        <textarea value={clinicalData.recall24h || ''} onChange={(e) => handleClinicalDataChange('recall24h', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-28" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Alimentos Preferidos</label>
                                        <textarea value={clinicalData.preferences || ''} onChange={(e) => handleClinicalDataChange('preferences', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Alimentos Odiados / Aversiones</label>
                                        <textarea value={clinicalData.aversions || ''} onChange={(e) => handleClinicalDataChange('aversions', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Suplementación</label>
                                        <textarea value={clinicalData.supplements || ''} onChange={(e) => handleClinicalDataChange('supplements', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Notas Adicionales */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Notas Adicionales</h3>
                                <textarea value={clinicalData.additionalNotes || ''} onChange={(e) => handleClinicalDataChange('additionalNotes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-32" />
                            </div>

                            {/* Calculadora Metabólica (Target Macros) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-400/20 flex items-center justify-center">
                                            <Calculator size={18} className="text-pink-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Metabolismo y Dietética</h3>
                                            <p className="text-xs text-slate-500">Objetivos calóricos y macronutrientes asignados.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsCalcOpen(true)}
                                        className="flex items-center gap-2 bg-pink-50 text-pink-600 border border-pink-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-pink-100 transition-colors"
                                    >
                                        <Wand2 size={14} /> Calcular Macros
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="text-center">
                                        <div className="text-xl font-black text-slate-900">{userGoals.kcal.toFixed(0)}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">KCAL Diarias</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-black text-pink-600">{userGoals.p.toFixed(0)}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Proteína (g)</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-black text-slate-900">{userGoals.c.toFixed(0)}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Carbohidratos (g)</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-black text-slate-900">{userGoals.f.toFixed(0)}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Grasas (g)</div>
                                    </div>
                                </div>
                            </div>

                            {/* Portal de Acceso */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-400/20 flex items-center justify-center">
                                        <Key size={18} className="text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Portal del Paciente</h3>
                                        <p className="text-xs text-slate-500">Credenciales para acceder a <a href="/portal" target="_blank" className="text-red-600 hover:text-red-300 inline-flex items-center gap-1">nexo.clinic/portal <ExternalLink size={10} /></a></p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
                                        <input
                                            type="text"
                                            value={portalCreds.username}
                                            onChange={e => setPortalCreds({ ...portalCreds, username: e.target.value })}
                                            placeholder={viewingPatient?.name.split(' ')[0]?.toLowerCase() || 'usuario'}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                                        <input
                                            type="text"
                                            value={portalCreds.password}
                                            onChange={e => setPortalCreds({ ...portalCreds, password: e.target.value })}
                                            placeholder="Ej. alex1234"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSavePortalCreds}
                                        className="bg-red-600 text-black px-5 py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
                                    >
                                        <Key size={14} /> Guardar Acceso
                                    </button>
                                    {portalSaved && <span className="text-red-600 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={14} /> Guardado</span>}
                                </div>
                            </div>

                            {/* Consultas / Seguimientos */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-400/20 flex items-center justify-center">
                                            <ClipboardList size={18} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Consultas / Seguimientos</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowConsultForm(!showConsultForm)}
                                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-900 px-4 py-2 rounded-xl text-sm font-semibold hover:border-red-400 transition-colors"
                                    >
                                        <Plus size={14} /> Nueva Consulta
                                        {showConsultForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>

                                {/* New consult form */}
                                {showConsultForm && (
                                    <div className="bg-white border border-slate-300 rounded-xl p-5 mb-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Fecha</label>
                                                <input type="date" value={newConsult.date} onChange={e => setNewConsult({ ...newConsult, date: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Tipo</label>
                                                <select value={newConsult.type} onChange={e => setNewConsult({ ...newConsult, type: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm">
                                                    <option value="Primera Visita">Primera Visita</option>
                                                    <option value="Seguimiento">Seguimiento</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Peso (kg)</label>
                                                <input type="number" step="0.1" value={newConsult.weight} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, weight: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">% Grasa</label>
                                                <input type="number" step="0.1" value={newConsult.fatPercent} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, fatPercent: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Masa Muscular (kg)</label>
                                                <input type="number" step="0.1" value={newConsult.muscleMass} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, muscleMass: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Cintura (cm)</label>
                                                <input type="number" step="0.1" value={newConsult.waist} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, waist: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">T. Arterial</label>
                                                <input type="text" value={newConsult.bloodPressure} onChange={e => setNewConsult({ ...newConsult, bloodPressure: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-400 text-sm" placeholder="120/80" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">Observaciones / Notas</label>
                                            <textarea value={newConsult.notes} onChange={e => setNewConsult({ ...newConsult, notes: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-red-400 resize-none h-24 text-sm" placeholder="Evolución, cambios, objetivos, recomendaciones..." />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={handleAddConsult} className="bg-red-600 text-black px-5 py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2">
                                                <Plus size={14} /> Guardar Consulta
                                            </button>
                                            <button onClick={() => setShowConsultForm(false)} className="bg-slate-50 text-slate-900 px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors">
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Consultation records list */}
                                {consultRecords.length === 0 && !showConsultForm ? (
                                    <p className="text-slate-500 text-sm">No hay consultas registradas aún. Pulsa "Nueva Consulta" para añadir.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {[...consultRecords].reverse().map(r => (
                                            <div key={r.id} className={`border rounded-xl p-4 ${r.type === 'Primera Visita' ? 'bg-red-600/5 border-red-400/20' : 'bg-blue-400/5 border-blue-400/20'}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.type === 'Primera Visita' ? 'bg-red-50 text-red-600' : 'bg-blue-400/20 text-blue-600'}`}>{r.type}</span>
                                                        <p className="font-bold text-slate-900 text-sm mt-1">{new Date(r.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                    </div>
                                                    <button onClick={() => handleDeleteConsult(r.id)} className="text-slate-500 hover:text-red-600 transition-colors p-1">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2 mb-3">
                                                    {[['Peso', r.weight, 'kg'], ['Grasa', r.fatPercent, '%'], ['Músculo', r.muscleMass, 'kg'], ['Cintura', r.waist, 'cm'], ['T.A.', r.bloodPressure, '']].map(([label, val, unit]) =>
                                                        val ? <div key={label} className="bg-white rounded-lg p-2 text-center">
                                                            <p className="text-xs text-slate-500">{label}</p>
                                                            <p className="font-bold text-slate-900 text-sm">{val}{unit}</p>
                                                        </div> : null
                                                    )}
                                                </div>
                                                {r.notes && <p className="text-sm text-slate-600 italic border-t border-slate-200 pt-2">{r.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Revisiones del Portal (patient-submitted check-ins) */}
                            {patientCheckIns.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-400/20 flex items-center justify-center">
                                            <ClipboardList size={18} className="text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Revisiones del Paciente</h3>
                                            <p className="text-xs text-slate-500">Enviadas desde el portal por el paciente.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {patientCheckIns.map((ci: any) => (
                                            <div key={ci.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                                                    {new Date(((ci.date || ci.dateStr) + 'T00:00:00')).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                <div className="flex gap-3 flex-wrap">
                                                    {ci.weight && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Peso</p><p className="font-bold text-slate-900 text-sm">{ci.weight} kg</p></div>}
                                                    {ci.chest && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Pecho</p><p className="font-bold text-slate-900 text-sm">{ci.chest} cm</p></div>}
                                                    {ci.waist && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Cintura</p><p className="font-bold text-slate-900 text-sm">{ci.waist} cm</p></div>}
                                                    {ci.hip && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Cadera</p><p className="font-bold text-slate-900 text-sm">{ci.hip} cm</p></div>}
                                                    {ci.biceps && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Bíceps</p><p className="font-bold text-slate-900 text-sm">{ci.biceps} cm</p></div>}
                                                    {ci.clavicle && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Clavícula</p><p className="font-bold text-slate-900 text-sm">{ci.clavicle} cm</p></div>}
                                                    {ci.quadriceps && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">Cuádriceps</p><p className="font-bold text-slate-900 text-sm">{ci.quadriceps} cm</p></div>}
                                                    {ci.fat_percent && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center"><p className="text-xs text-slate-500">% Grasa</p><p className="font-bold text-slate-900 text-sm">{ci.fat_percent}%</p></div>}
                                                </div>
                                                {(ci.photo_front_url || ci.photo_back_url) && (
                                                    <div className="flex gap-3 mt-3">
                                                        {ci.photo_front_url && <a href={ci.photo_front_url} target="_blank" rel="noreferrer"><img src={ci.photo_front_url} alt="Frontal" className="w-24 h-32 object-cover rounded-xl border border-slate-200 hover:opacity-80 transition-opacity" /></a>}
                                                        {ci.photo_back_url && <a href={ci.photo_back_url} target="_blank" rel="noreferrer"><img src={ci.photo_back_url} alt="Espalda" className="w-24 h-32 object-cover rounded-xl border border-slate-200 hover:opacity-80 transition-opacity" /></a>}
                                                    </div>
                                                )}
                                                {ci.notes && <p className="text-slate-600 text-sm mt-3 italic">"{ci.notes}"</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Start Zona de Peligro */}
                            <div className="bg-red-50 border border-red-500/20 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-red-600 mb-4 uppercase tracking-wider">Zona de Peligro</h3>
                                <button
                                    onClick={() => {
                                        if (viewingPatient) {
                                            setDeletingPatient(viewingPatient.id);
                                        }
                                    }}
                                    className="bg-red-600 hover:bg-red-600 text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Paciente
                                </button>
                                <p className="text-xs text-red-500/70 mt-3">Esta acción es permanente y no se puede deshacer.</p>
                            </div>

                            {/* Historial de Citas (Pasadas y Próximas) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <CalendarIcon className="text-red-600" size={20} />
                                    Historial de Citas
                                </h3>

                                {patientAppointments.length === 0 ? (
                                    <p className="text-slate-500 text-sm">Este paciente aún no tiene citas programadas.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {patientAppointments.map((appt, idx) => {
                                            const isPast = appt.dateStr ? new Date(`${appt.dateStr}T${appt.time}:00`) < new Date() : false;
                                            return (
                                                <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${isPast ? 'bg-white border-slate-200 opacity-60' : 'bg-red-600/5 border-red-400/20'}`}>
                                                    <div>
                                                        <p className={`font-bold ${isPast ? 'text-slate-600' : 'text-red-600'}`}>{appt.dateStr ? new Date(appt.dateStr).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha desconocida'}</p>
                                                        <p className="text-sm text-slate-500">{appt.type}</p>
                                                    </div>
                                                    <div className={`font-bold text-lg ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
                                                        {appt.time}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {isChatModalOpen && chatPatient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg flex flex-col h-[650px] max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 shrink-0 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center border border-red-200">
                                    <MessageCircle size={18} className="text-red-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900">{chatPatient.name}</h2>
                                    <p className="text-xs text-slate-500">Chat Integrado del Paciente</p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 shadow-sm p-2 rounded-full">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {chatDietLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                                    <MessageCircle size={48} className="mb-4 opacity-20" />
                                    <p>No hay mensajes aún.</p>
                                    <p className="text-xs mt-1">Escribe a tu paciente para abrir el canal de comunicación.</p>
                                </div>
                            ) : (
                                chatMessages.map((msg) => {
                                    const isNutri = msg.sender === 'nutritionist';
                                    return (
                                        <div key={msg.id} className={`flex ${isNutri ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isNutri
                                                ? 'bg-slate-900 text-white rounded-br-sm'
                                                : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                                                }`}>
                                                <p>{msg.text}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isNutri ? 'text-slate-400' : 'text-slate-400'}`}>
                                                    {new Date(msg.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 shrink-0 rounded-b-2xl">
                            <form onSubmit={handleSendChat} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newChatMessage}
                                    onChange={(e) => setNewChatMessage(e.target.value)}
                                    placeholder="Escribe tu mensaje..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-400 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!newChatMessage.trim()}
                                    className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-50 disabled:hover:bg-red-600"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Calculadora Nutricional Modal */}
            {isCalcOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex">
                        <div className="flex-1 p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Calculadora Energética</h2>
                                    <p className="text-slate-500 text-sm">Calcula las necesidades calóricas y de macronutrientes de tu paciente mediante la fórmula de Mifflin-St Jeor.</p>
                                </div>
                                <button onClick={() => setIsCalcOpen(false)} className="text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Basals Variables */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex flex-col after:content-[''] after:w-8 after:h-0.5 after:bg-red-500 after:mt-1">Variables Basales</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Edad</label>
                                            <input type="number" value={calcData.age} onFocus={e => e.target.select()}
                                                onChange={e => setCalcData({ ...calcData, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Sexo</label>
                                            <select value={calcData.gender} onChange={e => setCalcData({ ...calcData, gender: e.target.value as any })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium cursor-pointer">
                                                <option value="Hombre">Hombre</option>
                                                <option value="Mujer">Mujer</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Peso (kg)</label>
                                            <input type="number" step="0.1" value={calcData.weight} onFocus={e => e.target.select()}
                                                onChange={e => setCalcData({ ...calcData, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Altura (cm)</label>
                                            <input type="number" value={calcData.height} onFocus={e => e.target.select()}
                                                onChange={e => setCalcData({ ...calcData, height: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium" />
                                        </div>
                                    </div>
                                </div>

                                {/* Goals & Activity */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex flex-col after:content-[''] after:w-8 after:h-0.5 after:bg-red-500 after:mt-1">Objetivos y Actividad</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nivel de Actividad (NEAT + EAT)</label>
                                        <select value={calcData.activity} onChange={e => setCalcData({ ...calcData, activity: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium cursor-pointer">
                                            <option value={1.2}>Sedentario (Poco o nulo ejercicio)</option>
                                            <option value={1.375}>Ligero (Ejercicio ligero 1-3 días)</option>
                                            <option value={1.55}>Moderado (Ejercicio moderado 3-5 días)</option>
                                            <option value={1.725}>Activo (Fuerte 6-7 días)</option>
                                            <option value={1.9}>Muy Activo (Doble turno/Atleta)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Objetivo Fisiológico</label>
                                        <select value={calcData.goal} onChange={e => setCalcData({ ...calcData, goal: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-400 transition-all font-medium cursor-pointer">
                                            <option value={-0.2}>Pérdida de Grasa Agresiva (-20%)</option>
                                            <option value={-0.1}>Pérdida de Grasa Moderada (-10%)</option>
                                            <option value={0}>Mantenimiento / Recomposición</option>
                                            <option value={0.1}>Superávit Ligero (+10%)</option>
                                            <option value={0.2}>Volumen Agresivo (+20%)</option>
                                        </select>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Results Sidebar */}
                        <div className="w-72 bg-slate-50 p-6 flex flex-col border-l border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Resultados</h3>

                            <div className="space-y-4 mb-6">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">TMB</span>
                                    <span className="font-mono font-bold text-slate-900">{tmb}</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">GED (TDEE)</span>
                                    <span className="font-mono font-bold text-slate-900">{tdee}</span>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-white shadow-lg">
                                    <span className="text-xs font-bold text-slate-400">OBJETIVO</span>
                                    <span className="font-mono font-bold text-xl text-red-400">{dailyKcal} <span className="text-xs text-slate-500 font-normal">kcal</span></span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Distribución (P/G/H)</h4>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-bold text-pink-600 block">% Proteína</label>
                                            <div className="flex items-center gap-1 bg-pink-50 text-pink-600 px-2 py-0.5 rounded-md text-xs border border-pink-400/20">
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="w-10 bg-transparent outline-none text-center font-bold" 
                                                    value={(((dailyKcal * (calcData.protPercent / 100)) / 4) / (calcData.weight || 1)).toFixed(1)}
                                                    onChange={(e) => {
                                                        const g = Number(e.target.value);
                                                        if(dailyKcal > 0) {
                                                            const newPercent = ((g * (calcData.weight || 1) * 4) / dailyKcal) * 100;
                                                            setCalcData({ ...calcData, protPercent: Number(newPercent.toFixed(1)) });
                                                        }
                                                    }}
                                                />
                                                <span>g/kg</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="10" max="80" step="0.1" value={calcData.protPercent} onChange={e => setCalcData({ ...calcData, protPercent: Number(e.target.value) })} className="flex-1 accent-pink-600" />
                                            <div className="w-14 bg-white border border-slate-200 text-slate-900 text-xs py-1 rounded-md text-center font-bold">{Number(calcData.protPercent).toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-bold text-red-600 block">% Grasas</label>
                                            <div className="flex items-center gap-1 bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs border border-slate-300/50">
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="w-10 bg-transparent outline-none text-center font-bold" 
                                                    value={(((dailyKcal * (calcData.fatPercent / 100)) / 9) / (calcData.weight || 1)).toFixed(1)}
                                                    onChange={(e) => {
                                                        const g = Number(e.target.value);
                                                        if(dailyKcal > 0) {
                                                            const newPercent = ((g * (calcData.weight || 1) * 9) / dailyKcal) * 100;
                                                            setCalcData({ ...calcData, fatPercent: Number(newPercent.toFixed(1)) });
                                                        }
                                                    }}
                                                />
                                                <span>g/kg</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="15" max="80" step="0.1" value={calcData.fatPercent} onChange={e => setCalcData({ ...calcData, fatPercent: Number(e.target.value) })} className="flex-1 accent-slate-600" />
                                            <div className="w-14 bg-white border border-slate-200 text-slate-900 text-xs py-1 rounded-md text-center font-bold">{Number(calcData.fatPercent).toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 p-2 rounded-lg mt-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-500">% CH (Restante)</span>
                                            <span className="font-bold text-slate-900">{Number(100 - calcData.protPercent - calcData.fatPercent).toFixed(1)}%</span>
                                        </div>
                                        {100 - calcData.protPercent - calcData.fatPercent < -0.1 && <p className="text-[10px] text-red-500 mt-1 font-bold">¡Los porcentajes superan el 100%!</p>}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveCalculator}
                                disabled={100 - calcData.protPercent - calcData.fatPercent < -0.1}
                                className="w-full mt-4 bg-red-600 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-red-600/20"
                            >
                                <Wand2 size={18} />
                                Aprobar en Anamnesis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingPatient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Paciente?</h2>
                        <p className="text-slate-600 mb-6 text-sm">Esta acción eliminará todos sus datos e historial. No se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingPatient(null)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-900 font-medium py-3 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(deletingPatient)} className="flex-1 bg-red-600 hover:bg-red-600 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-sm">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
