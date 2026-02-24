"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Video, X, Trash2, Search, Plus, LineChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from "../../lib/supabase";

// ---------------------------------------------------------------------------
// useDragScroll — Premium drag-to-scroll with momentum / inertia
// direction: 'x' for horizontal (week/day), 'y' for vertical (month)
// ---------------------------------------------------------------------------
function useDragScroll(direction: 'x' | 'y' = 'y') {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let isDown = false;
        let startPos = 0;
        let scrollStart = 0;
        let velHistory: { v: number; t: number }[] = [];
        let rafId: number;

        const getPos = (e: MouseEvent) => direction === 'x' ? e.clientX : e.clientY;
        const getScroll = () => direction === 'x' ? el.scrollLeft : el.scrollTop;
        const setScroll = (v: number) => {
            if (direction === 'x') el.scrollLeft = v;
            else el.scrollTop = v;
        };

        const onMouseDown = (e: MouseEvent) => {
            // Only respond to primary button; ignore clicks on interactive children
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, a, select, input, [draggable="true"]')) return;

            isDown = true;
            startPos = getPos(e);
            scrollStart = getScroll();
            velHistory = [];
            cancelAnimationFrame(rafId);
            el.style.cursor = 'grabbing';
            el.style.userSelect = 'none';
            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            const delta = startPos - getPos(e);
            setScroll(scrollStart + delta);

            const now = performance.now();
            velHistory.push({ v: delta, t: now });
            // Keep only last 100ms of history
            velHistory = velHistory.filter(h => now - h.t < 100);
        };

        const onMouseUp = () => {
            if (!isDown) return;
            isDown = false;
            el.style.cursor = 'grab';
            el.style.userSelect = '';

            // Calculate average velocity
            if (velHistory.length < 2) return;
            const first = velHistory[0]!;
            const last = velHistory[velHistory.length - 1]!;
            const dt = last.t - first.t;
            if (dt === 0) return;
            const velocity = (last.v - first.v) / dt * 16; // px per frame (60fps)

            // Momentum animation
            let momentum = velocity * 8;
            const friction = 0.92;

            const animate = () => {
                if (Math.abs(momentum) < 0.5) return;
                setScroll(getScroll() + momentum);
                momentum *= friction;
                rafId = requestAnimationFrame(animate);
            };
            rafId = requestAnimationFrame(animate);
        };

        const onMouseLeave = () => {
            if (isDown) onMouseUp();
        };

        el.style.cursor = 'grab';
        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        el.addEventListener('mouseleave', onMouseLeave);

        return () => {
            cancelAnimationFrame(rafId);
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [direction]);

    return ref;
}

const timeSlots = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

const getWeekDates = (baseDate: Date = new Date()) => {
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(baseDate);
    monday.setDate(diffToMonday);

    const generatedDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        generatedDays.push(d);
    }
    return generatedDays;
};

const formatDateToStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getMonthYear = (baseDate: Date = new Date()) => {
    const str = baseDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Appointment = {
    id: number;
    patient: string;
    time: string;
    duration: number;
    type: string;
    day: number;
    dateStr?: string;
};

const initialAppointments: Appointment[] = [
    { id: 1, patient: 'Alex Martínez', time: '10:00', duration: 1, type: 'Primera Visita', day: 0 },
    { id: 2, patient: 'María Solares', time: '12:00', duration: 1, type: 'Revisión Online', day: 0 },
    { id: 3, patient: 'Carlos Ruiz', time: '16:00', duration: 1.5, type: 'Seguimiento', day: 1 },
    { id: 4, patient: 'Laura Gómez', time: '09:00', duration: 1, type: 'Revisión Online', day: 2 },
    { id: 5, patient: 'Reunión Equipo', time: '14:00', duration: 1, type: 'Interno', day: 3 },
    { id: 6, patient: 'David Torres', time: '17:00', duration: 1, type: 'Primera Visita', day: 4 },
];

const getAppointmentStyle = (type: string) => {
    switch (type) {
        case 'Primera Visita': return { color: 'bg-lime-500/20 text-lime-400 border-lime-500/50', icon: <User size={14} /> };
        case 'Revisión Online': return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: <Video size={14} /> };
        case 'Interno': return { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: <Clock size={14} /> };
        case 'Seguimiento':
        default: return { color: 'bg-neutral-800 text-neutral-300 border-neutral-700', icon: <MapPin size={14} /> };
    }
}

export default function CalendarioPage() {
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [patients, setPatients] = useState<{ id: number, name: string }[]>([]);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

    const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
    const weekDates = getWeekDates(currentWeekDate);
    const monthYear = getMonthYear(currentWeekDate);
    const currentDayDate = new Date(currentWeekDate);
    const displayDates = viewMode === 'day' ? [currentDayDate] : weekDates;
    const viewTitle = viewMode === 'day' ? 'Vista Diaria' : viewMode === 'week' ? 'Vista Semanal' : '';

    const [currentTimePercent, setCurrentTimePercent] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Premium drag-scroll refs
    const weekScrollRef = useDragScroll('y');   // week/day view: vertical scroll
    const monthScrollRef = useDragScroll('y');  // month view: vertical scroll

    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const timeIndex = (hours - 6) + (minutes / 60);
            setCurrentTimePercent(Math.max(0, Math.min(100, (timeIndex / timeSlots.length) * 100)));
        };

        updateCurrentTime();
        const interval = setInterval(updateCurrentTime, 60000);

        async function loadData() {
            // Load Patients — same pattern as DietBuilder which works
            supabase.from('patients').select('id, name').order('id', { ascending: false }).then(({ data: pts, error: pError }) => {
                if (!pError && pts && pts.length > 0) {
                    setPatients(pts.map((p: any) => ({ id: p.id, name: p.name })));
                } else {
                    // Fallback: localStorage
                    const saved = localStorage.getItem('nexo-patients');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setPatients(parsed.map((p: any) => ({ id: p.id, name: p.name })));
                    }
                }
            });

            // Load Appointments from Supabase, fallback to localStorage
            supabase.from('appointments').select('*').then(({ data: appts, error: aError }) => {
                if (!aError && appts && appts.length > 0) {
                    setAppointments(appts);
                } else {
                    const savedAppts = localStorage.getItem('nexo-appointments');
                    if (savedAppts) {
                        try { setAppointments(JSON.parse(savedAppts)); } catch { }
                    }
                    // If nothing in localStorage either, keep initialAppointments
                }
                setIsLoaded(true);
            });
        }

        loadData();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // We will save to Supabase directly on handleSave, so no need for this specific effect
    }, [appointments, isLoaded]);

    const [formData, setFormData] = useState({
        patient: '', date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Revisión Online'
    });
    const [editingAppointment, setEditingAppointment] = useState<number | null>(null);
    const [deletingAppointment, setDeletingAppointment] = useState<number | null>(null);

    const openEditModal = (apt: Appointment) => {
        setEditingAppointment(apt.id);
        setFormData({
            patient: apt.patient,
            date: apt.dateStr || new Date().toISOString().split('T')[0],
            time: apt.time,
            type: apt.type
        });
        setIsModalOpen(true);
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const dateStr = formData.date || new Date().toISOString().split('T')[0] || '';
        const payload = {
            patient: formData.patient,
            dateStr,
            time: formData.time,
            type: formData.type,
            duration: 1,
            day: new Date(dateStr + 'T12:00:00').getDay()
        };

        if (editingAppointment) {
            const { data, error } = await supabase
                .from('appointments')
                .update(payload)
                .eq('id', editingAppointment)
                .select();

            if (!error && data && data.length > 0) {
                const updated = appointments.map(apt => apt.id === editingAppointment ? { ...apt, ...payload } : apt);
                setAppointments(updated);
                localStorage.setItem('nexo-appointments', JSON.stringify(updated));
            } else {
                // Supabase not available — update locally
                const updated = appointments.map(apt => apt.id === editingAppointment ? { ...apt, ...payload } : apt);
                setAppointments(updated);
                localStorage.setItem('nexo-appointments', JSON.stringify(updated));
            }
        } else {
            const { data, error } = await supabase
                .from('appointments')
                .insert([payload])
                .select();

            if (!error && data && data.length > 0) {
                const newList = [...appointments, data[0]];
                setAppointments(newList);
                localStorage.setItem('nexo-appointments', JSON.stringify(newList));
            } else {
                // Supabase not available — save locally
                const localAppt = { ...payload, id: Date.now() };
                const newList = [...appointments, localAppt];
                setAppointments(newList);
                localStorage.setItem('nexo-appointments', JSON.stringify(newList));
            }
        }
        setIsModalOpen(false);
    };

    const prevWeek = () => {
        const d = new Date(currentWeekDate);
        if (viewMode === 'month') {
            d.setMonth(d.getMonth() - 1);
        } else {
            d.setDate(d.getDate() - 7);
        }
        setCurrentWeekDate(d);
    };

    const nextWeek = () => {
        const d = new Date(currentWeekDate);
        if (viewMode === 'month') {
            d.setMonth(d.getMonth() + 1);
        } else {
            d.setDate(d.getDate() + 7);
        }
        setCurrentWeekDate(d);
    };

    const goToday = () => setCurrentWeekDate(new Date());

    const handleDelete = async (id: number) => {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        // Always remove locally regardless of Supabase outcome
        const updated = appointments.filter(a => a.id !== id);
        setAppointments(updated);
        localStorage.setItem('nexo-appointments', JSON.stringify(updated));
        setDeletingAppointment(null);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, aptId: number) => {
        e.dataTransfer.setData('text/plain', aptId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dayIndex: number) => {
        e.preventDefault();
        const aptIdStr = e.dataTransfer.getData('text/plain');
        if (!aptIdStr) return;
        const aptId = Number(aptIdStr);

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percent = y / rect.height;
        let newHourIndex = Math.floor(percent * timeSlots.length);
        if (newHourIndex < 0) newHourIndex = 0;
        if (newHourIndex >= timeSlots.length) newHourIndex = timeSlots.length - 1;

        const newTime = timeSlots[newHourIndex] || '06:00';
        const targetDate = weekDates[dayIndex];
        const newDateStr = formatDateToStr(targetDate!);

        // Always update locally first
        const updated = appointments.map(apt =>
            apt.id === aptId
                ? { ...apt, time: newTime, dateStr: newDateStr, day: dayIndex }
                : apt
        );
        setAppointments(updated);
        localStorage.setItem('nexo-appointments', JSON.stringify(updated));

        // Try to sync with Supabase (optional, non-blocking)
        supabase
            .from('appointments')
            .update({ time: newTime, dateStr: newDateStr, day: dayIndex })
            .eq('id', aptId)
            .then(() => { });
    };
    return (
        <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white p-8 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{monthYear}</h1>
                    <p className="text-neutral-400 mt-1">{viewTitle || 'Vista Mensual'}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-2 transition-colors border-r border-neutral-800 ${viewMode === 'day' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 transition-colors ${viewMode === 'week' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                            Semana
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-2 transition-colors border-l border-neutral-800 ${viewMode === 'month' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                            Mes
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={prevWeek} className="p-2 border border-neutral-800 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={goToday} className="px-4 py-2 border border-neutral-800 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors">
                            Hoy
                        </button>
                        <button onClick={nextWeek} className="p-2 border border-neutral-800 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button onClick={() => {
                        setEditingAppointment(null);
                        setFormData({ patient: '', date: new Date().toISOString().split('T')[0] || '', time: '10:00', type: 'Revisión Online' });
                        setIsModalOpen(true);
                    }} className="bg-lime-400 text-black px-4 py-2 rounded-xl font-bold hover:bg-lime-500 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.3)] ml-4">
                        Nueva Cita
                    </button>
                </div>
            </div>

            {/* Calendar Grid - Month, Week or Day */}
            {viewMode === 'month' ? (
                // ---- MONTH VIEW ----
                (() => {
                    const year = currentWeekDate.getFullYear();
                    const month = currentWeekDate.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    // Start grid on Monday
                    const startOffset = (firstDay.getDay() + 6) % 7;
                    const cells: (Date | null)[] = [];
                    for (let i = 0; i < startOffset; i++) cells.push(null);
                    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
                    while (cells.length % 7 !== 0) cells.push(null);
                    const weeks: (Date | null)[][] = [];
                    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
                    const today = formatDateToStr(new Date());
                    const monthDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

                    return (
                        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
                            <div className="grid grid-cols-7 border-b border-neutral-800">
                                {monthDayNames.map(d => (
                                    <div key={d} className="py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-800 last:border-0">{d}</div>
                                ))}
                            </div>
                            <div
                                ref={monthScrollRef}
                                className="flex-1 grid overflow-y-auto"
                                style={{
                                    gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
                                    // Hide scrollbar visually but keep functionality
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                    WebkitOverflowScrolling: 'touch',
                                } as React.CSSProperties}
                            >
                                {weeks.map((week, wi) => (
                                    <div key={wi} className="grid grid-cols-7 border-b border-neutral-800 last:border-0" style={{ minHeight: '100px' }}>
                                        {week.map((date, di) => {
                                            if (!date) return <div key={di} className="border-r border-neutral-800 last:border-0 bg-neutral-950/30" />;
                                            const dateStr = formatDateToStr(date);
                                            const isToday = dateStr === today;
                                            const dayAppts = appointments.filter(a => a.dateStr === dateStr);
                                            return (
                                                <div
                                                    key={di}
                                                    className={`border-r border-neutral-800 last:border-0 p-2 hover:bg-neutral-800/40 transition-colors flex flex-col gap-1`}
                                                    style={{ cursor: 'default' }}
                                                    onClick={() => {
                                                        setCurrentWeekDate(date);
                                                        setViewMode('day');
                                                    }}
                                                >
                                                    <span className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${isToday ? 'bg-lime-400 text-black' : 'text-neutral-400 hover:text-white'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                    <div className="flex flex-col gap-1 overflow-hidden">
                                                        {dayAppts.slice(0, 3).map(apt => {
                                                            const { color } = getAppointmentStyle(apt.type);
                                                            return (
                                                                <div key={apt.id} className={`text-[10px] font-semibold rounded px-1.5 py-0.5 truncate border ${color}`}>
                                                                    {apt.time} {apt.patient}
                                                                </div>
                                                            );
                                                        })}
                                                        {dayAppts.length > 3 && (
                                                            <span className="text-[10px] text-neutral-500 font-medium pl-1">+{dayAppts.length - 3} más</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()
            ) : (
                // ---- WEEK / DAY VIEW ----
                <div className="flex-1 bg-neutral-950 border border-neutral-800/50 rounded-2xl flex flex-col min-h-0 overflow-hidden">
                    {/* Days Header */}
                    <div
                        className="border-b border-neutral-800/60 bg-neutral-950 shrink-0 grid"
                        style={{ gridTemplateColumns: viewMode === 'day' ? '56px 1fr' : '56px repeat(7, 1fr)' }}
                    >
                        <div className="w-14 border-r border-neutral-800/60 flex items-end justify-center pb-3">
                            <span className="text-[9px] font-medium text-neutral-600">GMT+1</span>
                        </div>
                        {displayDates.map((date, i) => {
                            const isToday = formatDateToStr(new Date()) === formatDateToStr(date);
                            return (
                                <div key={i} className={`py-3 border-r border-neutral-800/60 flex flex-col items-center ${i === displayDates.length - 1 ? 'border-r-0' : ''}`}>
                                    <div className="text-[11px] font-medium text-neutral-500 mb-1 uppercase tracking-wider">{(dayNames[date.getDay()] ?? '').slice(0, 3)}</div>
                                    <div className={`text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-full ${isToday ? 'bg-lime-400 text-black' : 'text-neutral-200'
                                        }`}>{date.getDate()}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid — drag-scrollable vertically */}
                    <div
                        ref={weekScrollRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch',
                        } as React.CSSProperties}
                    >
                        <div
                            className="relative grid h-[1260px]"
                            style={{ gridTemplateColumns: viewMode === 'day' ? '56px 1fr' : '56px repeat(7, 1fr)' }}
                        >
                            {/* Hour lines + alternating row backgrounds */}
                            <div className="absolute inset-0 pointer-events-none">
                                {timeSlots.map((time, i) => (
                                    <div
                                        key={time}
                                        className="absolute left-0 right-0"
                                        style={{ top: `${(i / timeSlots.length) * 100}%`, height: `${(1 / timeSlots.length) * 100}%` }}
                                    >
                                        {/* Alternating row background */}
                                        {i % 2 === 1 && <div className="absolute inset-0 bg-neutral-900/30" />}
                                        {/* Hour divider line */}
                                        <div className="absolute bottom-0 left-14 right-0 border-b border-neutral-800/40" />
                                        {/* Half-hour divider */}
                                        <div className="absolute border-b border-neutral-800/20 border-dashed left-14 right-0" style={{ top: '50%' }} />
                                    </div>
                                ))}
                            </div>

                            {/* Time Labels Column */}
                            <div className="border-r border-neutral-800/60 relative z-10 w-16">
                                {timeSlots.map((time, i) => {
                                    const hour = parseInt(time.split(':')[0] || '0');
                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                    const hour12 = hour % 12 || 12;
                                    const displayTime = `${hour12} ${ampm}`;

                                    return (
                                        <div key={time} className="h-[70px] relative">
                                            <span className="absolute -top-[9px] right-3 text-[11px] font-medium text-neutral-400 select-none uppercase whitespace-nowrap tabular-nums tracking-tight">
                                                {i === 0 ? '' : displayTime}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Days Columns */}
                            {displayDates.map((date, arrayIndex) => {
                                const dayIndex = viewMode === 'day' ? date.getDay() === 0 ? 6 : date.getDay() - 1 : arrayIndex;
                                const dateString = formatDateToStr(date);
                                const isToday = formatDateToStr(new Date()) === dateString;

                                return (
                                    <div
                                        key={dayIndex}
                                        className={`border-r border-neutral-800/40 relative last:border-r-0 ${isToday ? 'bg-lime-400/[0.02]' : ''
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, dayIndex)}
                                    >
                                        {/* Current Time Indicator (only on current day) */}
                                        {isToday && (
                                            <div
                                                className="absolute left-0 right-0 border-t-2 border-lime-400 z-10 w-full"
                                                style={{ top: `${currentTimePercent}%` }}
                                            >
                                                <div className="absolute -left-2 -top-[5px] w-2 h-2 rounded-full bg-lime-400" />
                                            </div>
                                        )}

                                        {/* Appointments Overlay for this specific date */}
                                        {appointments.filter(a => a.dateStr === dateString || (!a.dateStr && a.day === dayIndex && Math.abs(currentWeekDate.getTime() - new Date().getTime()) < 604800000)).map(apt => {
                                            const hourIndex = timeSlots.indexOf(apt.time);
                                            const topPercent = (hourIndex / timeSlots.length) * 100;
                                            const heightPercent = (apt.duration / timeSlots.length) * 100;
                                            const { color } = getAppointmentStyle(apt.type);

                                            return (() => {
                                                const iconSize = 10;
                                                const currentIcon = apt.type.toLowerCase().includes('online') ? <Video size={iconSize} className="text-blue-400" /> :
                                                    apt.type.toLowerCase().includes('presencial') ? <MapPin size={iconSize} className="text-emerald-400" /> :
                                                        <Clock size={iconSize} className="text-yellow-400" />;

                                                return (
                                                    <div
                                                        key={apt.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, apt.id)}
                                                        onClick={() => openEditModal(apt)}
                                                        className={`absolute inset-x-0.5 rounded-lg border px-2 py-1.5 flex flex-col cursor-grab hover:opacity-90 hover:scale-[1.02] shadow-sm hover:shadow-md transition-all z-20 min-h-[66px] overflow-hidden ${color}`}
                                                        style={{ top: `${topPercent}%`, height: `calc(${heightPercent}% - 2px)` }}
                                                    >
                                                        {/* Top row: Patient Name & Delete Button */}
                                                        <div className="flex justify-between items-center gap-2 w-full leading-none mb-0.5">
                                                            <div className="font-bold text-[11.5px] text-white leading-tight" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 22px)' }}>{apt.patient}</div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setDeletingAppointment(apt.id);
                                                                }}
                                                                className="shrink-0 w-4 h-4 flex items-center justify-center bg-black/10 hover:bg-black/30 rounded text-white/40 hover:text-red-400 transition-colors z-10"
                                                                title="Eliminar Cita"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>

                                                        {/* Middle row: Type */}
                                                        <div className="flex items-center gap-1.5 leading-none mb-0.5" style={{ minHeight: '12px' }}>
                                                            <span className="shrink-0 opacity-80">{currentIcon}</span>
                                                            <span className="text-[10px] font-medium text-white/75" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.type}</span>
                                                        </div>

                                                        {/* Bottom row: Time */}
                                                        <div className="mt-auto text-[10px] font-semibold text-white/90 leading-none">
                                                            {apt.time} - {timeSlots[timeSlots.indexOf(apt.time) + Math.floor(apt.duration)] || '23:59'}
                                                        </div>
                                                    </div>
                                                );
                                            })();
                                        })}
                                    </div>
                                );
                            })}

                        </div>
                    </div>
                </div>
            )}

            {/* Add Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingAppointment ? 'Editar Cita' : 'Agendar Nueva Cita'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Paciente / Título</label>
                                {formData.type === 'Interno' ? (
                                    <input
                                        type="text"
                                        required
                                        value={formData.patient}
                                        onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                        placeholder="Ej. Juan Pérez o Título Evento"
                                    />
                                ) : (
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.patient}
                                            onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 appearance-none"
                                        >
                                            <option value="" disabled>Seleccionar Paciente...</option>
                                            {patients.map(p => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                            {formData.patient && !patients.some(p => p.name === formData.patient) && (
                                                <option value={formData.patient}>{formData.patient} (Sin Registro)</option>
                                            )}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                            <ChevronLeft className="-rotate-90" size={16} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Hora</label>
                                    <select
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                    >
                                        {timeSlots.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Tipo de Cita</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400"
                                >
                                    <option value="Primera Visita">Primera Visita (Presencial)</option>
                                    <option value="Seguimiento">Seguimiento (Presencial)</option>
                                    <option value="Revisión Online">Revisión Online</option>
                                    <option value="Interno">Reunión / Interno</option>
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
                                    {editingAppointment ? 'Guardar Cambios' : 'Agendar Cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingAppointment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">¿Eliminar Cita?</h2>
                        <p className="text-neutral-400 mb-6 text-sm">Esta cita se eliminará permanentemente de tu calendario.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingAppointment(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(deletingAppointment)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
