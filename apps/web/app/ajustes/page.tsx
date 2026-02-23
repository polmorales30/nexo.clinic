"use client";

import { useState, useEffect, useRef } from 'react';
import { Save, User, Bell, Shield, Wallet, MonitorSmartphone, CheckCircle2, Eye, EyeOff, Lock, Camera } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';

type Section = 'perfil' | 'seguridad' | 'notificaciones' | 'facturacion' | 'app';

export default function AjustesPage() {
    const { changeCredentials, currentUser } = useAuth();
    const [activeSection, setActiveSection] = useState<Section>('perfil');
    const [isSaved, setIsSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: 'Dr. Alejandro Molina',
        specialty: 'Nutrición Deportiva y Clínica',
        email: 'contacto@nutrimadrid.es',
        address: 'Calle Princesa 31, 28008, Madrid, España',
        avatar: ''
    });

    const [secForm, setSecForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [secError, setSecError] = useState('');
    const [secSaved, setSecSaved] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('nexo-ajustes');
        if (saved) {
            setFormData(JSON.parse(saved));
        }
        // Pre-fill the email from current Supabase user
        if (currentUser) {
            setSecForm(f => ({ ...f, email: currentUser }));
        }
    }, [currentUser]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nexo-ajustes', JSON.stringify(formData));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const updated = { ...formData, avatar: reader.result as string };
                setFormData(updated);
                localStorage.setItem('nexo-ajustes', JSON.stringify(updated));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSecuritySave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSecError('');
        if (!secForm.email.trim()) { setSecError('El email no puede estar vacío.'); return; }
        if (secForm.newPassword && secForm.newPassword !== secForm.confirmPassword) { setSecError('Las contraseñas no coinciden.'); return; }
        if (secForm.newPassword && secForm.newPassword.length < 6) { setSecError('La contraseña debe tener al menos 6 caracteres.'); return; }
        const { error } = await changeCredentials(secForm.email.trim(), secForm.newPassword);
        if (error) { setSecError(error); return; }
        setSecSaved(true);
        setSecForm(f => ({ ...f, newPassword: '', confirmPassword: '' }));
        setTimeout(() => setSecSaved(false), 3000);
    };


    const navItems: { id: Section; icon: typeof User; label: string }[] = [
        { id: 'perfil', icon: User, label: 'Perfil Profesional' },
        { id: 'seguridad', icon: Shield, label: 'Seguridad y Acceso' },
        { id: 'notificaciones', icon: Bell, label: 'Notificaciones' },
        { id: 'facturacion', icon: Wallet, label: 'Facturación' },
        { id: 'app', icon: MonitorSmartphone, label: 'App de Pacientes' },
    ];

    // Derive initials from profile name
    const initials = formData.name.split(' ').filter(w => w[0] === w[0]?.toUpperCase() && w.length > 1).slice(0, 2).map(w => w[0]).join('');

    return (
        <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Ajustes</h1>
                <p className="text-neutral-400 mt-1">Configuración del perfil profesional y preferencias de la clínica</p>
            </div>

            <div className="flex gap-8 items-start">
                <aside className="w-64 shrink-0 flex flex-col gap-2">
                    {navItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveSection(id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left transition-colors ${activeSection === id ? 'bg-neutral-900 border border-neutral-800 text-lime-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'}`}
                        >
                            <Icon size={18} />
                            {label}
                        </button>
                    ))}
                </aside>

                <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-3xl">

                    {/* ── PERFIL ── */}
                    {activeSection === 'perfil' && (
                        <>
                            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-neutral-800">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full border-2 border-lime-400 bg-neutral-800 flex items-center justify-center overflow-hidden">
                                        {formData.avatar
                                            ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            : <span className="text-3xl font-bold text-lime-400">{initials || currentUser?.charAt(0).toUpperCase() || 'P'}</span>
                                        }
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{formData.name}</h2>
                                    <p className="text-neutral-400 text-sm mt-1">Suscripción Pro • Renovación: 12 Mar 2026</p>
                                    <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs text-lime-400 hover:text-lime-300 font-medium transition-colors">
                                        Cambiar foto de perfil
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Nombre del Profesional</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Especialidad</label>
                                        <input type="text" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Correo Electrónico de Contacto</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Dirección de la Clínica</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors" />
                                </div>
                                <div className="pt-6 border-t border-neutral-800 flex justify-end items-center gap-4">
                                    {isSaved && <span className="text-lime-400 font-medium flex items-center gap-2 animate-pulse"><CheckCircle2 size={18} /> Guardado correctamente</span>}
                                    <button type="submit" className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)]">
                                        <Save size={18} /> Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* ── SEGURIDAD ── */}
                    {activeSection === 'seguridad' && (
                        <>
                            <div className="mb-8 pb-6 border-b border-neutral-800">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                                        <Lock size={20} className="text-lime-400" />
                                    </div>
                                    <h2 className="text-xl font-bold">Seguridad y Acceso</h2>
                                </div>
                                <p className="text-neutral-500 text-sm mt-1">Cambia tus credenciales de acceso al panel.</p>
                            </div>
                            <form onSubmit={handleSecuritySave} className="space-y-6">
                                <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex items-start gap-3">
                                    <Shield size={18} className="text-lime-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-white">Credenciales activas</p>
                                        <p className="text-xs text-neutral-500 mt-0.5">Usuario actual: <span className="text-neutral-400">{currentUser}</span></p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Email de Acceso</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input type="email" value={secForm.email} onChange={e => setSecForm({ ...secForm, email: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Nueva Contraseña <span className="text-neutral-600">(dejar vacío para mantener la actual)</span></label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input type={showNewPass ? "text" : "password"} value={secForm.newPassword} onChange={e => setSecForm({ ...secForm, newPassword: e.target.value })} placeholder="Nueva contraseña..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors placeholder-neutral-700" />
                                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                </div>
                                {secForm.newPassword && (
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Confirmar Contraseña</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                                            <input type={showConfirmPass ? "text" : "password"} value={secForm.confirmPassword} onChange={e => setSecForm({ ...secForm, confirmPassword: e.target.value })} placeholder="Repite la contraseña..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:border-lime-400 transition-colors placeholder-neutral-700" />
                                            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                    </div>
                                )}
                                {secError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">{secError}</div>}
                                <div className="pt-6 border-t border-neutral-800 flex justify-end items-center gap-4">
                                    {secSaved && <span className="text-lime-400 font-medium flex items-center gap-2 animate-pulse"><CheckCircle2 size={18} /> Credenciales actualizadas</span>}
                                    <button type="submit" className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)]"><Save size={18} /> Guardar Credenciales</button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* ── NOTIFICACIONES ── */}
                    {activeSection === 'notificaciones' && (
                        <>
                            <h2 className="text-xl font-bold mb-2">Notificaciones</h2>
                            <p className="text-neutral-500 text-sm mb-8">Controla qué notificaciones recibes y cómo se muestran.</p>
                            <div className="space-y-4">
                                {[
                                    { id: 'citas', label: 'Recordatorios de citas', desc: 'Aviso 24h antes de cada cita programada', default: true },
                                    { id: 'nuevos', label: 'Nuevos pacientes', desc: 'Notificación al añadir un nuevo paciente', default: true },
                                    { id: 'dietas', label: 'Dietas actualizadas', desc: 'Alerta cuando una dieta es modificada', default: false },
                                    { id: 'inactividad', label: 'Pacientes inactivos', desc: 'Aviso semanal sobre pacientes sin seguimiento', default: true },
                                    { id: 'sistema', label: 'Actualizaciones del sistema', desc: 'Novedades y mejoras de NEXO.Clinic', default: false },
                                ].map(item => (
                                    <NotifToggle key={item.id} label={item.label} desc={item.desc} defaultValue={item.default} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── FACTURACIÓN ── */}
                    {activeSection === 'facturacion' && (
                        <>
                            <h2 className="text-xl font-bold mb-2">Facturación</h2>
                            <p className="text-neutral-500 text-sm mb-8">Gestión de tu suscripción y métodos de pago.</p>
                            <div className="bg-gradient-to-br from-[#1c2c26] to-[#0f1e19] border border-[#2d473e] rounded-2xl p-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-bold text-lime-400 uppercase tracking-wider">Plan Activo</span>
                                        <h3 className="text-2xl font-black text-white mt-1">NEXO Pro</h3>
                                        <p className="text-neutral-400 text-sm mt-1">Próxima renovación: <span className="text-white font-medium">12 de Marzo, 2026</span></p>
                                    </div>
                                    <span className="bg-lime-400/20 border border-lime-400/30 text-lime-400 text-xs font-bold px-3 py-1 rounded-full">Activo</span>
                                </div>
                                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                                    {[['Pacientes', 'Ilimitados'], ['Dietas', 'Ilimitadas'], ['Soporte', 'Prioritario']].map(([k, v]) => (
                                        <div key={k}><p className="text-xs text-neutral-500 font-medium uppercase">{k}</p><p className="font-bold text-white mt-1">{v}</p></div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="font-bold text-white mb-4">Método de pago</h3>
                                <div className="flex items-center gap-4 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                                    <div className="w-12 h-8 bg-neutral-700 rounded flex items-center justify-center text-xs font-black text-white">VISA</div>
                                    <div>
                                        <p className="font-medium text-white text-sm">•••• •••• •••• 4242</p>
                                        <p className="text-xs text-neutral-500">Caduca 08/2027</p>
                                    </div>
                                    <button className="ml-auto text-xs text-lime-400 hover:text-lime-300 font-medium transition-colors">Cambiar</button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── APP PACIENTES ── */}
                    {activeSection === 'app' && (
                        <>
                            <h2 className="text-xl font-bold mb-2">App de Pacientes</h2>
                            <p className="text-neutral-500 text-sm mb-8">Configura lo que tus pacientes pueden ver y hacer desde su app.</p>
                            <div className="space-y-4">
                                {[
                                    { id: 'dieta', label: 'Ver dieta asignada', desc: 'El paciente puede consultar su plan nutricional', default: true },
                                    { id: 'progreso', label: 'Registrar progreso', desc: 'El paciente puede añadir sus propias medidas', default: true },
                                    { id: 'citas', label: 'Ver próximas citas', desc: 'El paciente puede ver las citas programadas', default: true },
                                    { id: 'mensajes', label: 'Mensajería directa', desc: 'Permite mensajes entre profesional y paciente', default: false },
                                    { id: 'fotos', label: 'Subir fotos de progreso', desc: 'El paciente puede añadir fotos desde la app', default: false },
                                ].map(item => (
                                    <NotifToggle key={item.id} label={item.label} desc={item.desc} defaultValue={item.default} />
                                ))}
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

function NotifToggle({ label, desc, defaultValue }: { label: string; desc: string; defaultValue: boolean }) {
    const [enabled, setEnabled] = useState(defaultValue);
    return (
        <div className="flex items-center justify-between p-4 bg-neutral-950/50 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
            <div>
                <p className="font-medium text-white text-sm">{label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
            </div>
            <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${enabled ? 'bg-lime-400' : 'bg-neutral-700'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}
