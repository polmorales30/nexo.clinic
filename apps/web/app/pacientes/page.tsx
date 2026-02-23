"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Calendar as CalendarIcon, FileText, X, Key, ClipboardList, ChevronDown, ChevronUp, ExternalLink, CheckCircle2 } from 'lucide-react';

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
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('nexo-patients');
        if (saved) {
            setPatients(JSON.parse(saved));
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('nexo-patients', JSON.stringify(patients));
        }
    }, [patients, isLoaded]);

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

    const handleDelete = (id: number) => {
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

        setIsHistoryModalOpen(true);
    };

    const handleSaveHistory = () => {
        if (!viewingPatient) return;
        setPatients(patients.map(p => p.id === viewingPatient.id ? { ...p, clinicalData, consultRecords } : p));
        setIsHistoryModalOpen(false);
    };

    const handleSavePortalCreds = () => {
        if (!viewingPatient) return;
        setPatients(patients.map(p => p.id === viewingPatient.id ? { ...p, portalUsername: portalCreds.username, portalPassword: portalCreds.password } : p));
        setPortalSaved(true);
        setTimeout(() => setPortalSaved(false), 2000);
    };

    const handleAddConsult = () => {
        if (!newConsult.date) return;
        const record: ConsultRecord = { ...newConsult, id: Date.now() };
        const updated = [...consultRecords, record];
        setConsultRecords(updated);
        setPatients(patients.map(p => p.id === viewingPatient?.id ? { ...p, consultRecords: updated } : p));
        setNewConsult({ date: new Date().toISOString().split('T')[0] || '', type: 'Primera Visita', weight: '', fatPercent: '', muscleMass: '', waist: '', bloodPressure: '', notes: '' });
        setShowConsultForm(false);
    };

    const handleDeleteConsult = (id: number) => {
        const updated = consultRecords.filter(r => r.id !== id);
        setConsultRecords(updated);
        setPatients(patients.map(p => p.id === viewingPatient?.id ? { ...p, consultRecords: updated } : p));
    };

    const handleClinicalDataChange = (field: keyof ClinicalData, value: string) => {
        setClinicalData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingPatient) {
            // Edit
            setPatients(patients.map(p => p.id === editingPatient.id ? {
                ...p,
                name: formData.name,
                age: Number(formData.age),
                goal: formData.goal,
                status: formData.status
            } : p));
        } else {
            // Add
            const newPatient: Patient = {
                id: Date.now(),
                name: formData.name,
                age: Number(formData.age),
                goal: formData.goal,
                lastVisit: '-',
                nextVisit: '-',
                status: formData.status
            };
            setPatients([...patients, newPatient]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Pacientes</h1>
                    <p className="text-neutral-400 mt-1">Gestiona tu cartera de pacientes y sus planes nutricionales</p>
                </div>
                <button onClick={openAddModal} className="bg-lime-400 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)]">
                    <Plus size={20} />
                    Nuevo Paciente
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, objetivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                </select>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                >
                    <option value="recent">Más recientes</option>
                    <option value="name">Por nombre (A-Z)</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-900/50">
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Nombre</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Edad</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Objetivo</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Última Visita</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Próxima Visita</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm">Estado</th>
                            <th className="p-4 font-semibold text-neutral-400 text-sm text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredPatients.map(patient => (
                            <tr key={patient.id} className="hover:bg-neutral-800/50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lime-400 border border-neutral-700">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-white">{patient.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-neutral-300">{patient.age} años</td>
                                <td className="p-4 text-neutral-300">{patient.goal}</td>
                                <td className="p-4 text-neutral-300">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-neutral-500" />
                                        {patient.lastVisit}
                                    </div>
                                </td>
                                <td className="p-4 text-neutral-300">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-neutral-500" />
                                        {patient.nextVisit}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${patient.status === 'Activo'
                                        ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                        }`}>
                                        {patient.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openHistoryModal(patient)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors" title="Ver Historial">
                                            <FileText size={18} />
                                        </button>
                                        <button onClick={() => openEditModal(patient)} className="p-2 text-neutral-400 hover:text-lime-400 hover:bg-neutral-800 rounded-lg transition-colors" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredPatients.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-neutral-500">
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
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Edad</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                        placeholder="Ej. 30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Objetivo Principal</label>
                                <select
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                >
                                    <option value="Pérdida de peso">Pérdida de peso</option>
                                    <option value="Aumento de masa">Aumento de masa</option>
                                    <option value="Recomposición">Recomposición física</option>
                                    <option value="Hipertrofia">Hipertrofia</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Salud">Mejora de salud</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-8 pt-4 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-700 text-white font-semibold hover:bg-neutral-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)]"
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
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex gap-2 items-center">
                                    Expediente del Paciente
                                </h2>
                                <p className="text-neutral-400 mt-1">Información personal, clínica y dietética de {viewingPatient.name}.</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleSaveHistory}
                                    className="px-6 py-2 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                                >
                                    Guardar Cambios
                                </button>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors bg-neutral-800 p-2 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 flex-1">

                            {/* Datos Personales */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Datos Personales</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
                                        <input type="email" value={clinicalData.email || ''} onChange={(e) => handleClinicalDataChange('email', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Teléfono</label>
                                        <input type="tel" value={clinicalData.phone || ''} onChange={(e) => handleClinicalDataChange('phone', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Ocupación</label>
                                        <input type="text" value={clinicalData.occupation || ''} onChange={(e) => handleClinicalDataChange('occupation', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Estilo de Vida */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Estilo de Vida</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Consumo de Agua (L/día)</label>
                                        <input type="text" value={clinicalData.water || ''} onChange={(e) => handleClinicalDataChange('water', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Horas de Sueño</label>
                                        <input type="text" value={clinicalData.sleep || ''} onChange={(e) => handleClinicalDataChange('sleep', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Deporte / Actividad</label>
                                        <input type="text" value={clinicalData.activity || ''} onChange={(e) => handleClinicalDataChange('activity', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Frecuencia Entrenamiento</label>
                                        <input type="text" value={clinicalData.trainingFreq || ''} onChange={(e) => handleClinicalDataChange('trainingFreq', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Salud Clínica */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Salud Clínica</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Patologías / Lesiones</label>
                                        <textarea value={clinicalData.pathologies || ''} onChange={(e) => handleClinicalDataChange('pathologies', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Alergias / Intolerancias</label>
                                        <textarea value={clinicalData.allergies || ''} onChange={(e) => handleClinicalDataChange('allergies', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Medicación Actual</label>
                                        <textarea value={clinicalData.medications || ''} onChange={(e) => handleClinicalDataChange('medications', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Antecedentes Familiares</label>
                                        <textarea value={clinicalData.familyHistory || ''} onChange={(e) => handleClinicalDataChange('familyHistory', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Perfil Nutricional */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Perfil Nutricional</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Número de Comidas al Día</label>
                                        <input type="text" value={clinicalData.mealsPerDay || ''} onChange={(e) => handleClinicalDataChange('mealsPerDay', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Recordatorio 24 Horas (¿Qué comió ayer?)</label>
                                        <textarea value={clinicalData.recall24h || ''} onChange={(e) => handleClinicalDataChange('recall24h', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-28" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Alimentos Preferidos</label>
                                        <textarea value={clinicalData.preferences || ''} onChange={(e) => handleClinicalDataChange('preferences', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Alimentos Odiados / Aversiones</label>
                                        <textarea value={clinicalData.aversions || ''} onChange={(e) => handleClinicalDataChange('aversions', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Suplementación</label>
                                        <textarea value={clinicalData.supplements || ''} onChange={(e) => handleClinicalDataChange('supplements', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-20" />
                                    </div>
                                </div>
                            </div>

                            {/* Notas Adicionales */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Notas Adicionales</h3>
                                <textarea value={clinicalData.additionalNotes || ''} onChange={(e) => handleClinicalDataChange('additionalNotes', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-32" />
                            </div>

                            {/* Portal de Acceso */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                                        <Key size={18} className="text-lime-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Portal del Paciente</h3>
                                        <p className="text-xs text-neutral-500">Credenciales para acceder a <a href="/portal" target="_blank" className="text-lime-400 hover:text-lime-300 inline-flex items-center gap-1">nexo.clinic/portal <ExternalLink size={10} /></a></p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Usuario</label>
                                        <input
                                            type="text"
                                            value={portalCreds.username}
                                            onChange={e => setPortalCreds({ ...portalCreds, username: e.target.value })}
                                            placeholder={viewingPatient?.name.split(' ')[0]?.toLowerCase() || 'usuario'}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña</label>
                                        <input
                                            type="text"
                                            value={portalCreds.password}
                                            onChange={e => setPortalCreds({ ...portalCreds, password: e.target.value })}
                                            placeholder="Ej. alex1234"
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSavePortalCreds}
                                        className="bg-lime-400 text-black px-5 py-2 rounded-xl font-bold text-sm hover:bg-lime-500 transition-colors flex items-center gap-2"
                                    >
                                        <Key size={14} /> Guardar Acceso
                                    </button>
                                    {portalSaved && <span className="text-lime-400 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={14} /> Guardado</span>}
                                </div>
                            </div>

                            {/* Consultas / Seguimientos */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                                            <ClipboardList size={18} className="text-blue-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Consultas / Seguimientos</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowConsultForm(!showConsultForm)}
                                        className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:border-lime-400 transition-colors"
                                    >
                                        <Plus size={14} /> Nueva Consulta
                                        {showConsultForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>

                                {/* New consult form */}
                                {showConsultForm && (
                                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 mb-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Fecha</label>
                                                <input type="date" value={newConsult.date} onChange={e => setNewConsult({ ...newConsult, date: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Tipo</label>
                                                <select value={newConsult.type} onChange={e => setNewConsult({ ...newConsult, type: e.target.value as any })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 text-sm">
                                                    <option value="Primera Visita">Primera Visita</option>
                                                    <option value="Seguimiento">Seguimiento</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1">Peso (kg)</label>
                                                <input type="number" step="0.1" value={newConsult.weight} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, weight: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1">% Grasa</label>
                                                <input type="number" step="0.1" value={newConsult.fatPercent} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, fatPercent: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1">Masa Muscular (kg)</label>
                                                <input type="number" step="0.1" value={newConsult.muscleMass} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, muscleMass: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1">Cintura (cm)</label>
                                                <input type="number" step="0.1" value={newConsult.waist} onFocus={e => e.target.select()} onChange={e => setNewConsult({ ...newConsult, waist: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1">T. Arterial</label>
                                                <input type="text" value={newConsult.bloodPressure} onChange={e => setNewConsult({ ...newConsult, bloodPressure: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-400 text-sm" placeholder="120/80" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">Observaciones / Notas</label>
                                            <textarea value={newConsult.notes} onChange={e => setNewConsult({ ...newConsult, notes: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400 resize-none h-24 text-sm" placeholder="Evolución, cambios, objetivos, recomendaciones..." />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={handleAddConsult} className="bg-lime-400 text-black px-5 py-2 rounded-xl font-bold text-sm hover:bg-lime-500 transition-colors flex items-center gap-2">
                                                <Plus size={14} /> Guardar Consulta
                                            </button>
                                            <button onClick={() => setShowConsultForm(false)} className="bg-neutral-800 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-neutral-700 transition-colors">
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Consultation records list */}
                                {consultRecords.length === 0 && !showConsultForm ? (
                                    <p className="text-neutral-500 text-sm">No hay consultas registradas aún. Pulsa "Nueva Consulta" para añadir.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {[...consultRecords].reverse().map(r => (
                                            <div key={r.id} className={`border rounded-xl p-4 ${r.type === 'Primera Visita' ? 'bg-lime-400/5 border-lime-400/20' : 'bg-blue-400/5 border-blue-400/20'}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.type === 'Primera Visita' ? 'bg-lime-400/20 text-lime-400' : 'bg-blue-400/20 text-blue-400'}`}>{r.type}</span>
                                                        <p className="font-bold text-white text-sm mt-1">{new Date(r.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                    </div>
                                                    <button onClick={() => handleDeleteConsult(r.id)} className="text-neutral-600 hover:text-red-400 transition-colors p-1">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2 mb-3">
                                                    {[['Peso', r.weight, 'kg'], ['Grasa', r.fatPercent, '%'], ['Músculo', r.muscleMass, 'kg'], ['Cintura', r.waist, 'cm'], ['T.A.', r.bloodPressure, '']].map(([label, val, unit]) =>
                                                        val ? <div key={label} className="bg-neutral-900 rounded-lg p-2 text-center">
                                                            <p className="text-xs text-neutral-500">{label}</p>
                                                            <p className="font-bold text-white text-sm">{val}{unit}</p>
                                                        </div> : null
                                                    )}
                                                </div>
                                                {r.notes && <p className="text-sm text-neutral-400 italic border-t border-neutral-800 pt-2">{r.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Start Zona de Peligro */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Zona de Peligro</h3>
                                <button
                                    onClick={() => {
                                        if (viewingPatient) {
                                            setDeletingPatient(viewingPatient.id);
                                        }
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Paciente
                                </button>
                                <p className="text-xs text-red-500/70 mt-3">Esta acción es permanente y no se puede deshacer.</p>
                            </div>

                            {/* Historial de Citas (Pasadas y Próximas) */}
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <CalendarIcon className="text-lime-400" size={20} />
                                    Historial de Citas
                                </h3>

                                {patientAppointments.length === 0 ? (
                                    <p className="text-neutral-500 text-sm">Este paciente aún no tiene citas programadas.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {patientAppointments.map((appt, idx) => {
                                            const isPast = appt.dateStr ? new Date(`${appt.dateStr}T${appt.time}:00`) < new Date() : false;
                                            return (
                                                <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${isPast ? 'bg-neutral-900 border-neutral-800 opacity-60' : 'bg-lime-400/5 border-lime-400/20'}`}>
                                                    <div>
                                                        <p className={`font-bold ${isPast ? 'text-neutral-400' : 'text-lime-400'}`}>{appt.dateStr ? new Date(appt.dateStr).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha desconocida'}</p>
                                                        <p className="text-sm text-neutral-500">{appt.type}</p>
                                                    </div>
                                                    <div className={`font-bold text-lg ${isPast ? 'text-neutral-500' : 'text-white'}`}>
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

            {/* Delete Confirmation Modal */}
            {deletingPatient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">¿Eliminar Paciente?</h2>
                        <p className="text-neutral-400 mb-6 text-sm">Esta acción eliminará todos sus datos e historial. No se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingPatient(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(deletingPatient)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
