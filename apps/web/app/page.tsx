"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Calendar as CalendarIcon, Activity, ArrowRight, Settings, UtensilsCrossed, Clock, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from "../lib/supabase";

export default function Home() {
  const [stats, setStats] = useState({ activePatients: 0, appointmentsToday: 0, dietsCount: 0, avgAge: 0 });
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] || '';

    // === STEP 1: Load patients (same pattern as pacientes/page.tsx which works) ===
    supabase.from('patients').select('*').order('id', { ascending: false }).then(({ data }) => {
      let patientList: any[] = [];
      if (data && data.length > 0) {
        patientList = data;
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('nexo-patients');
        if (saved) { try { patientList = JSON.parse(saved); } catch { } }
      }

      const activeCount = patientList.filter((p: any) => p.status === 'Activo').length;
      const totalAge = patientList.reduce((sum: number, p: any) => sum + (Number(p.age) || 0), 0);
      const avgAge = patientList.length > 0 ? Math.round(totalAge / patientList.length) : 0;

      // === STEP 2: Load appointments ===
      let allAppts: any[] = [];
      const savedAppts = localStorage.getItem('nexo-appointments');
      if (savedAppts) { try { allAppts = JSON.parse(savedAppts); } catch { } }

      supabase.from('appointments').select('*').order('dateStr', { ascending: true }).then(({ data: appts }) => {
        if (appts && appts.length > 0) allAppts = appts;

        const futureAppts = allAppts.filter((a: any) => (a.dateStr || '') >= todayStr);
        const todayCount = allAppts.filter((a: any) => a.dateStr === todayStr).length;

        // === STEP 3: Load diets count ===
        supabase.from('diets').select('*', { count: 'exact', head: true }).then(({ count: dietCount }) => {

          // Update stats
          setStats({
            activePatients: activeCount > 0 ? activeCount : patientList.length,
            appointmentsToday: todayCount,
            dietsCount: dietCount || 0,
            avgAge
          });

          setUpcomingAppts(futureAppts.slice(0, 4));

          // Weekly chart
          const weekly: any[] = [];
          for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay() + 1);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            const count = allAppts.filter((a: any) => {
              const d = new Date(a.dateStr);
              return d >= weekStart && d <= weekEnd;
            }).length;
            weekly.push({ semana: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, citas: count });
          }
          setWeeklyData(weekly);

          // Recent Activities
          const activities: any[] = [];
          if (patientList.length > 0) {
            activities.push({ icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Pacientes registrados', desc: `${patientList.length} total · ${activeCount} activos`, time: 'Ahora' });
          }
          if (futureAppts.length > 0) {
            const a1 = futureAppts[0];
            activities.push({ icon: CalendarIcon, color: 'text-lime-400', bg: 'bg-lime-400/10', title: 'Próxima Cita', desc: `${a1.patient} · ${a1.dateStr}`, time: 'Próximamente' });
          }
          if ((dietCount || 0) > 0) {
            activities.push({ icon: UtensilsCrossed, color: 'text-pink-500', bg: 'bg-pink-500/10', title: 'Planes activos', desc: `${dietCount} dietas guardadas`, time: 'Reciente' });
          }
          if (activities.length === 0) {
            activities.push({ icon: Settings, color: 'text-neutral-400', bg: 'bg-neutral-800', title: 'Sistema listo', desc: 'Añade tu primer paciente para empezar', time: 'Sistema' });
          }
          setRecentActivities(activities);

          const inactiveCount = patientList.filter((p: any) => p.status && p.status !== 'Activo').length;
          const alerts: any[] = [];
          if (inactiveCount > 0) alerts.push({ title: `${inactiveCount} paciente(s) inactivo(s)`, desc: 'Podrían requerir seguimiento.' });
          setSystemAlerts(alerts);
        });
      });
    });
  }, []);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-neutral-950 p-8 text-neutral-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Buenos días, Dr. Morales 👋</h1>
            <p className="text-neutral-400 mt-2 font-medium">Aquí está el resumen de tu clínica basada en tus datos.</p>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <Link href="/pacientes" className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Plus size={16} className="text-lime-400" />
              Gestión Pacientes
            </Link>
            <Link href="/creador-dietas" className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(163,230,53,0.2)]">
              <UtensilsCrossed size={16} />
              Crear Dieta
            </Link>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Users size={24} className="text-blue-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{stats.activePatients}</p>
              <p className="text-xs font-medium text-neutral-500 mt-1 uppercase tracking-wider">Pacientes Activos</p>
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center">
                <CalendarIcon size={24} className="text-lime-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{stats.appointmentsToday}</p>
              <p className="text-xs font-medium text-neutral-500 mt-1 uppercase tracking-wider">Citas Pendientes Hoy</p>
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                <UtensilsCrossed size={24} className="text-pink-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{stats.dietsCount}</p>
              <p className="text-xs font-medium text-neutral-500 mt-1 uppercase tracking-wider">Dietas Asignadas</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#44A081]/10 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-[#44A081]/20 transition-all"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#44A081]/20 flex items-center justify-center border border-[#44A081]/30">
                <Activity size={24} className="text-[#60D3A6]" />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <p className="text-3xl font-black text-white">{stats.avgAge}</p>
              <p className="text-xs font-medium text-neutral-400 mt-1 uppercase tracking-wider">Edad Media Global</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-6">Citas por Semana</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="semana" stroke="#525252" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#525252" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#a3e635' }}
                    cursor={{ fill: 'rgba(163,230,53,0.05)' }}
                  />
                  <Bar dataKey="citas" name="Citas" fill="#a3e635" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">Resumen de Pacientes</h3>
            {(() => {
              const donutData = [
                { name: 'Activos', value: stats.activePatients || 0, color: '#a3e635' },
                { name: 'Dietas', value: stats.dietsCount || 0, color: '#ec4899' },
                { name: 'Citas hoy', value: stats.appointmentsToday || 0, color: '#60a5fa' },
                { name: 'Edad media', value: stats.avgAge || 0, color: '#60D3A6' },
              ];
              const total = donutData.reduce((s, d) => s + d.value, 0);
              const active = activeDonutIndex !== null ? donutData[activeDonutIndex] : null;
              return (
                <div className="flex items-center gap-4">
                  <div className="relative w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%" cy="50%"
                          innerRadius={46} outerRadius={66}
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
                              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {active ? (
                        <>
                          <span className="text-xl font-black leading-none" style={{ color: active.color }}>{active.value}</span>
                          <span className="text-[10px] text-neutral-400 font-medium mt-0.5 text-center leading-tight max-w-[60px] truncate">{active.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-black text-white leading-none">{total}</span>
                          <span className="text-[10px] text-neutral-500 font-medium mt-0.5">Total</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {donutData.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between cursor-pointer group"
                        onMouseEnter={() => setActiveDonutIndex(index)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: item.color }} />
                          <span className={`text-sm font-medium transition-colors ${activeDonutIndex === index ? 'text-white' : 'text-neutral-400'}`}>{item.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: activeDonutIndex === index ? item.color : '#9ca3af' }}>
                          {item.name === 'Edad media' ? `${item.value} a.` : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/pacientes" className="group bg-neutral-900/40 border border-neutral-800 hover:border-lime-400/50 rounded-3xl p-6 transition-all relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-4 translate-y-4">
                  <Users size={100} />
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-12 border border-neutral-700">
                  <Users size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  Gestión Pacientes <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-lime-400" />
                </h3>
                <p className="text-sm text-neutral-500 font-medium">Bases de datos, analíticas y perfiles</p>
              </Link>

              <Link href="/creador-dietas" className="group bg-neutral-900/40 border border-neutral-800 hover:border-lime-400/50 rounded-3xl p-6 transition-all relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-4 translate-y-4">
                  <UtensilsCrossed size={100} />
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-12 border border-neutral-700">
                  <UtensilsCrossed size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  Creador Dietas <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-lime-400" />
                </h3>
                <p className="text-sm text-neutral-500 font-medium">Generador drag & drop e IA</p>
              </Link>
            </div>

            <div className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Actividad Reciente</h3>
              <div className="space-y-4">
                {recentActivities.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 hover:bg-neutral-800/50 rounded-2xl transition-colors cursor-pointer group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg}`}>
                      <item.icon size={20} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{item.title}</p>
                      <p className="text-xs text-neutral-500 truncate">{item.desc}</p>
                    </div>
                    <div className="text-[10px] font-bold text-neutral-600 uppercase">
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1c2c26] border border-[#2d473e] rounded-3xl p-6 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-40 h-40 bg-lime-400/10 blur-3xl rounded-full -mr-10 -mt-10"></div>

              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <CalendarIcon size={20} className="text-lime-400" />
                Próximas Citas
              </h3>

              <div className="space-y-3 relative z-10">
                {upcomingAppts.length === 0 ? (
                  <p className="text-sm text-neutral-400">No hay citas registradas para los próximos días.</p>
                ) : (
                  upcomingAppts.map((cita, i) => {
                    const isToday = cita.dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <div key={i} className="bg-black/20 border border-white/5 hover:bg-black/30 rounded-2xl p-4 transition-colors cursor-pointer flex gap-4">
                        <div className="flex flex-col items-center justify-center border-r border-white/10 pr-4">
                          <span className="text-sm font-black tracking-tight">{cita.time || '--:--'}</span>
                          {isToday && <span className="text-[9px] uppercase font-bold text-neutral-400 mt-1 flex items-center gap-1"><Clock size={10} /> Hoy</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{cita.patient || 'Paciente'}</p>
                          <p className="text-xs text-lime-400/80 mt-0.5">{cita.dateStr}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Link href="/calendario">
                <button className="w-full mt-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold transition-colors">
                  Ir al Calendario Completo
                </button>
              </Link>
            </div>

            {systemAlerts.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Avisos del Sistema</h3>
                {systemAlerts.map((alert, i) => (
                  <div key={i} className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex gap-3 mb-3 last:mb-0">
                    <Activity size={20} className="text-orange-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-orange-500 mb-1">{alert.title}</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
