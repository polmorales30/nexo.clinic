"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Calendar as CalendarIcon, Activity, ArrowRight,
  Settings, UtensilsCrossed, Clock, Plus, Bell, TrendingUp,
  AlertCircle, CheckCircle2, Cake, CreditCard, ChevronRight,
  Flame
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
  id: number | string;
  name?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  status?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  created_at?: string;
}

interface Appointment {
  id: number | string;
  patient?: string;
  dateStr?: string;
  time?: string;
  type?: string;
  day?: number;
}

interface Alert {
  type: 'red' | 'green';
  title: string;
  description: string;
  icon: 'alert' | 'check' | 'flame';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function patientName(p: Patient): string {
  if (p.name) return p.name;
  const parts = [p.firstName, p.lastName].filter(Boolean);
  return parts.join(' ') || 'Paciente';
}

function formatTime(t?: string): string {
  return t || '--:--';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [stats, setStats] = useState({
    activePatients: 0, inactivePatients: 0, appointmentsToday: 0,
    dietsCount: 0, avgAge: 0, newThisMonth: 0, newLastMonth: 0,
    totalPatients: 0
  });
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [patientApptMap, setPatientApptMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] || '';
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // === Load patients ===
    supabase.from('patients').select('*').order('id', { ascending: false }).then(({ data }) => {
      let patientList: Patient[] = [];
      if (data && data.length > 0) {
        patientList = data as Patient[];
      } else {
        const saved = localStorage.getItem('nexo-patients');
        if (saved) { try { patientList = JSON.parse(saved); } catch { } }
      }

      setAllPatients(patientList);
      const activeCount = patientList.filter(p => p.status === 'Activo').length;
      const inactiveCount = patientList.filter(p => p.status && p.status !== 'Activo').length;
      const totalAge = patientList.reduce((sum: number, p: Patient) => sum + (Number(p.age) || 0), 0);
      const avgAge = patientList.length > 0 ? Math.round(totalAge / patientList.length) : 0;

      // New patients this month / last month
      const newThisMonth = patientList.filter(p => {
        const d = new Date(p.createdAt || p.created_at || 0);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;
      const newLastMonth = patientList.filter(p => {
        const d = new Date(p.createdAt || p.created_at || 0);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      }).length;

      // === Load appointments ===
      let allAppts: Appointment[] = [];
      const savedAppts = localStorage.getItem('nexo-appointments');
      if (savedAppts) { try { allAppts = JSON.parse(savedAppts); } catch { } }

      supabase.from('appointments').select('*').order('dateStr', { ascending: true }).then(({ data: appts }) => {
        if (appts && appts.length > 0) allAppts = appts as Appointment[];

        const todayApts = allAppts.filter(a => a.dateStr === todayStr)
          .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const futureAppts = allAppts.filter(a => (a.dateStr || '') >= todayStr && a.dateStr !== todayStr);
        const todayCount = todayApts.length;

        // Build patient → appt count map (to distinguish first vs follow-up visit)
        const apptCounter: Record<string, number> = {};
        allAppts.forEach(a => {
          if (a.patient) {
            apptCounter[a.patient] = (apptCounter[a.patient] || 0) + 1;
          }
        });
        setPatientApptMap(apptCounter);

        setTodayAppts(todayApts);
        setUpcomingAppts(futureAppts.slice(0, 3));

        // === Weekly chart ===
        const weekly: any[] = [];
        for (let i = 7; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay() + 1);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          const count = allAppts.filter((a: Appointment) => {
            const d = new Date(a.dateStr || '');
            return d >= weekStart && d <= weekEnd;
          }).length;
          weekly.push({ semana: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, citas: count });
        }
        setWeeklyData(weekly);

        // === Diets count ===
        supabase.from('diets').select('*', { count: 'exact', head: true }).then(({ count: dietCount }) => {
          setStats({
            activePatients: activeCount > 0 ? activeCount : patientList.length,
            inactivePatients: inactiveCount,
            appointmentsToday: todayCount,
            dietsCount: dietCount || 0,
            avgAge,
            newThisMonth,
            newLastMonth,
            totalPatients: patientList.length,
          });

          // === Generate Alerts ===
          const generatedAlerts: Alert[] = [];

          // Red alerts: patients with no recent/future appointment
          if (patientList.length > 0) {
            const patientsWithFutureAppts = new Set(futureAppts.map(a => a.patient));
            const patientsAtRisk = patientList
              .filter(p => !patientsWithFutureAppts.has(patientName(p)) && p.status === 'Activo')
              .slice(0, 2);
            patientsAtRisk.forEach(p => {
              generatedAlerts.push({
                type: 'red',
                title: patientName(p),
                description: 'Sin cita programada próximamente. ¿Enviar recordatorio?',
                icon: 'alert',
              });
            });
          }

          // Green alerts: upcoming appointments today
          if (todayCount > 0) {
            generatedAlerts.push({
              type: 'green',
              title: `${todayCount} cita${todayCount > 1 ? 's' : ''} hoy`,
              description: `Tienes ${todayCount} cita${todayCount > 1 ? 's' : ''} programada${todayCount > 1 ? 's' : ''} para hoy`,
              icon: 'check',
            });
          }

          // Green alert: new patients this month
          if (newThisMonth > 0) {
            generatedAlerts.push({
              type: 'green',
              title: `${newThisMonth} nuevo${newThisMonth > 1 ? 's' : ''} paciente${newThisMonth > 1 ? 's' : ''}`,
              description: `En lo que va de mes — ¡sigue así!`,
              icon: 'flame',
            });
          }

          if (generatedAlerts.length === 0) {
            generatedAlerts.push({
              type: 'green',
              title: 'Todo en orden',
              description: 'No hay alertas pendientes. Tu clínica funciona bien.',
              icon: 'check',
            });
          }

          setAlerts(generatedAlerts);
        });
      });
    });
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────
  const donutData = [
    { name: 'Activos', value: stats.activePatients || 0, color: '#a3e635' },
    { name: 'Inactivos', value: stats.inactivePatients || 0, color: '#525252' },
  ];
  const donutTotal = stats.totalPatients || stats.activePatients;
  const activeDonut = activeDonutIndex !== null ? donutData[activeDonutIndex] : null;

  const monthGrowth = stats.newLastMonth > 0
    ? Math.round(((stats.newThisMonth - stats.newLastMonth) / stats.newLastMonth) * 100)
    : stats.newThisMonth > 0 ? 100 : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-[calc(100vh-80px)] bg-neutral-950 p-6 text-neutral-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Buenos días, Dr. Morales 👋</h1>
            <p className="text-neutral-400 mt-1 text-sm font-medium">Panel clínico — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex gap-2 text-sm font-semibold flex-wrap">
            <Link href="/pacientes?action=new" className="bg-neutral-900 border border-neutral-800 hover:border-lime-400/50 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors">
              <Plus size={14} className="text-lime-400" /> Paciente
            </Link>
            <Link href="/calendario?action=new" className="bg-neutral-900 border border-neutral-800 hover:border-blue-400/50 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors">
              <Plus size={14} className="text-blue-400" /> Cita
            </Link>
            <Link href="/creador-dietas" className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.2)]">
              <UtensilsCrossed size={14} /> Crear Dieta
            </Link>
          </div>
        </div>

        {/* ── Metric Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Pacientes Activos', value: stats.activePatients, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Citas Hoy', value: stats.appointmentsToday, icon: CalendarIcon, color: 'text-lime-400', bg: 'bg-lime-400/10' },
            { label: 'Dietas Asignadas', value: stats.dietsCount, icon: UtensilsCrossed, color: 'text-pink-400', bg: 'bg-pink-400/10' },
            { label: 'Edad Media', value: `${stats.avgAge} a.`, icon: Activity, color: 'text-[#60D3A6]', bg: 'bg-[#60D3A6]/10' },
          ].map((card) => (
            <div key={card.label} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon size={20} className={card.color} />
              </div>
              <p className="text-2xl font-black text-white">{card.value}</p>
              <p className="text-xs font-medium text-neutral-500 mt-1 uppercase tracking-wider">{card.label}</p>
            </div>
          ))}
        </div>

        {/* ── Semáforo de Adherencia ────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-neutral-400" />
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Semáforo de Adherencia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${alert.type === 'red'
                    ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                    : 'bg-lime-400/5 border-lime-400/20 hover:bg-lime-400/10'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.type === 'red' ? 'bg-red-500/20' : 'bg-lime-400/20'
                  }`}>
                  {alert.icon === 'alert' && <AlertCircle size={16} className="text-red-400" />}
                  {alert.icon === 'check' && <CheckCircle2 size={16} className="text-lime-400" />}
                  {alert.icon === 'flame' && <Flame size={16} className="text-lime-400" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${alert.type === 'red' ? 'text-red-400' : 'text-lime-400'}`}>
                    {alert.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agenda de Hoy + KPIs ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Agenda de Hoy */}
          <div className="lg:col-span-2 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-neutral-400" />
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Agenda de Hoy</h2>
              </div>
              <Link href="/calendario" className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 font-medium transition-colors">
                Ver todo <ChevronRight size={12} />
              </Link>
            </div>

            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarIcon size={32} className="text-neutral-700 mb-3" />
                <p className="text-sm font-medium text-neutral-500">Sin citas hoy</p>
                <p className="text-xs text-neutral-600 mt-1">Añade una nueva cita para empezar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppts.map((cita, i) => {
                  const isFirstVisit = (patientApptMap[cita.patient || ''] || 0) <= 1;
                  return (
                    <div key={cita.id || i} className="flex items-center gap-4 bg-neutral-800/40 hover:bg-neutral-800/70 border border-neutral-800 rounded-xl px-4 py-3 transition-colors group cursor-pointer">
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="text-sm font-black text-white">{formatTime(cita.time)}</span>
                      </div>
                      <div className="w-px h-8 bg-neutral-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{cita.patient || 'Paciente'}</p>
                        <p className="text-xs text-neutral-400 mt-0.5 truncate">{cita.type || 'Consulta'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shrink-0 ${isFirstVisit
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                        {isFirstVisit ? '1ª Visita' : 'Revisión'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Próximas citas row */}
            {upcomingAppts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-2">Próximas</p>
                <div className="flex gap-2 flex-wrap">
                  {upcomingAppts.map((cita, i) => (
                    <div key={i} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                      <span className="text-xs font-medium text-neutral-300">{cita.patient}</span>
                      <span className="text-[10px] text-neutral-500">{cita.dateStr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KPIs de Negocio */}
          <div className="space-y-4">
            {/* Donut: Activos vs Inactivos */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-neutral-400" />
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Pacientes</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={28} outerRadius={42}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                        strokeWidth={0}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            opacity={activeDonutIndex === null || activeDonutIndex === index ? 1 : 0.3}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black text-white leading-none" style={{ color: activeDonut?.color }}>
                      {activeDonut?.value ?? donutTotal}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-medium">{activeDonut?.name ?? 'Total'}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {donutData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between cursor-pointer" onMouseEnter={() => setActiveDonutIndex(index)} onMouseLeave={() => setActiveDonutIndex(null)}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-neutral-400">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nuevos este mes */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-neutral-400" />
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Nuevos este Mes</h2>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-black text-white">{stats.newThisMonth}</span>
                {monthGrowth !== 0 && (
                  <span className={`text-xs font-bold mb-1 px-2 py-0.5 rounded-full ${monthGrowth > 0
                      ? 'bg-lime-400/15 text-lime-400'
                      : 'bg-red-500/15 text-red-400'
                    }`}>
                    {monthGrowth > 0 ? '+' : ''}{monthGrowth}% vs mes anterior
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {stats.newLastMonth} ingresaron el mes pasado
              </p>
            </div>

            {/* Citas pendientes de cobro (placeholder visual) */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-neutral-400" />
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Pendientes de Cobro</h2>
              </div>
              <p className="text-3xl font-black text-white">{upcomingAppts.length}</p>
              <p className="text-xs text-neutral-500 mt-1">Citas futuras a facturar</p>
              <p className="text-[10px] text-neutral-700 mt-2 leading-snug">Módulo de pagos próximamente</p>
            </div>
          </div>
        </div>

        {/* ── Citas por Semana + Actividad Rápida ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Citas por Semana</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="semana" stroke="#525252" fontSize={10} tickMargin={8} />
                  <YAxis stroke="#525252" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '10px', color: '#fff' }}
                    itemStyle={{ color: '#a3e635' }}
                    cursor={{ fill: 'rgba(163,230,53,0.05)' }}
                  />
                  <Bar dataKey="citas" name="Citas" fill="#a3e635" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Accesos Directos */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Accesos Directos</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/pacientes', icon: Users, label: 'Gestión Pacientes', sub: 'Perfiles y analíticas', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'hover:border-blue-400/40' },
                { href: '/creador-dietas', icon: UtensilsCrossed, label: 'Creador Dietas', sub: 'Drag & drop + IA', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'hover:border-pink-400/40' },
                { href: '/calendario', icon: CalendarIcon, label: 'Calendario', sub: 'Agenda semanal', color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'hover:border-lime-400/40' },
                { href: '/ajustes', icon: Settings, label: 'Ajustes', sub: 'Configuración', color: 'text-neutral-400', bg: 'bg-neutral-800', border: 'hover:border-neutral-600' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-neutral-900 border border-neutral-800 ${item.border} rounded-xl p-4 transition-all flex flex-col gap-2`}
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon size={18} className={item.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-1">
                      {item.label}
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </p>
                    <p className="text-[11px] text-neutral-500">{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
