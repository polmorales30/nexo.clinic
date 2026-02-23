"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Calendar as CalendarIcon, Activity, ArrowRight, Settings, UtensilsCrossed, TrendingUp, Clock, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Home() {
  const [stats, setStats] = useState({ activePatients: 0, appointmentsToday: 0, dietsCount: 0, avgAge: 0 });
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    // Load Patients
    const savedPatients = localStorage.getItem("nexo-patients");
    let parsedPatients: any[] = [];
    if (savedPatients) {
      parsedPatients = JSON.parse(savedPatients);
    }

    const activeCount = parsedPatients.filter(p => p.status === "Activo").length;
    const totalAge = parsedPatients.reduce((sum, p) => sum + (p.age || 0), 0);
    const avgAge = parsedPatients.length > 0 ? Math.round(totalAge / parsedPatients.length) : 0;

    // Load Appointments
    const savedAppts = localStorage.getItem("nexo-appointments");
    let parsedAppts: any[] = [];
    if (savedAppts) {
      parsedAppts = JSON.parse(savedAppts);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Upcoming appointments
    const futureAppts = parsedAppts
      .filter(a => new Date(a.dateStr).getTime() >= today.getTime())
      .sort((a, b) => {
        const dateA = new Date(`${a.dateStr}T${a.time || "00:00"} `);
        const dateB = new Date(`${b.dateStr}T${b.time || "00:00"} `);
        return dateA.getTime() - dateB.getTime();
      });

    const todayCount = futureAppts.filter(a => a.dateStr === todayStr).length;

    // Count Diets
    let dietCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexo-diet-')) {
        dietCount++;
      }
    }

    setStats({
      activePatients: activeCount,
      appointmentsToday: todayCount,
      dietsCount: dietCount,
      avgAge: avgAge
    });

    setUpcomingAppts(futureAppts.slice(0, 4));

    // Build weekly appointments chart (last 8 weeks)
    const weekly: any[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const count = parsedAppts.filter(a => {
        const d = new Date(a.dateStr);
        return d >= weekStart && d <= weekEnd;
      }).length;
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      weekly.push({ semana: label, citas: count });
    }
    setWeeklyData(weekly);

    // Generate recent activities
    const activities = [];

    let pIndex = parsedPatients.length - 1;
    if (pIndex >= 0) {
      const p1 = parsedPatients[pIndex];
      activities.push({ icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Paciente registrado', desc: `${p1.name} añadido al sistema`, time: 'Reciente' });
    }
    if (futureAppts.length > 0) {
      const a1 = futureAppts[0];
      activities.push({ icon: CalendarIcon, color: 'text-lime-400', bg: 'bg-lime-400/10', title: 'Próxima Cita Programada', desc: `Cita con ${a1.patient} el ${a1.dateStr} a las ${a1.time} `, time: 'Próximamente' });
    }
    if (dietCount > 0 && parsedPatients.length > 1) {
      const p2 = parsedPatients[1];
      activities.push({ icon: UtensilsCrossed, color: 'text-pink-500', bg: 'bg-pink-500/10', title: 'Dieta asignada', desc: `Plan nutricional configurado en el sistema`, time: 'Reciente' });
    }

    if (activities.length === 0) {
      activities.push({ icon: Settings, color: 'text-neutral-400', bg: 'bg-neutral-800', title: 'Sistema Inicializado', desc: 'Configuración lista para empezar', time: 'Sistema' });
    }

    setRecentActivities(activities);

    // Check if there's any alerts
    const alerts = [];
    const inactiveCount = parsedPatients.length - activeCount;
    if (inactiveCount > 0) {
      alerts.push({
        title: `${inactiveCount} paciente(s) inactivo(s)`,
        desc: `Hay pacientes marcados como inactivos en la base de datos que podrían requerir seguimiento.`
      })
    }
    setSystemAlerts(alerts);

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
          {/* Weekly appointments bar chart */}
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

          {/* Patient distribution donut alternative: status line */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-6">Resumen de Pacientes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-lime-400" />
                  <span className="text-sm text-neutral-300 font-medium">Activos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 w-40 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-400 rounded-full" style={{ width: stats.activePatients > 0 ? '100%' : '0%' }} />
                  </div>
                  <span className="text-white font-bold text-sm w-6 text-right">{stats.activePatients}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-lime-400/40" />
                  <span className="text-sm text-neutral-300 font-medium">Dietas asignadas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 w-40 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-400/60 rounded-full" style={{ width: stats.dietsCount > 0 ? `${Math.min(100, (stats.dietsCount / Math.max(stats.activePatients, 1)) * 100)}%` : '0%' }} />
                  </div>
                  <span className="text-white font-bold text-sm w-6 text-right">{stats.dietsCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-sm text-neutral-300 font-medium">Citas hoy</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 w-40 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: stats.appointmentsToday > 0 ? `${Math.min(100, stats.appointmentsToday * 20)}%` : '0%' }} />
                  </div>
                  <span className="text-white font-bold text-sm w-6 text-right">{stats.appointmentsToday}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#60D3A6]" />
                  <span className="text-sm text-neutral-300 font-medium">Edad media</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 w-40 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#60D3A6] rounded-full" style={{ width: `${Math.min(100, (stats.avgAge / 70) * 100)}%` }} />
                  </div>
                  <span className="text-white font-bold text-sm w-8 text-right">{stats.avgAge} a.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Actions Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Access Grid */}
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

            {/* Recent Activity */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                Actividad Reciente
              </h3>
              <div className="space-y-4">
                {recentActivities.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 hover:bg-neutral-800/50 rounded-2xl transition-colors cursor-pointer group">
                    <div className={`w - 12 h - 12 rounded - 2xl flex items - center justify - center shrink - 0 ${item.bg} `}>
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

          {/* Right Column: Mini Calendar & Reminders */}
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

            {/* Alerts */}
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
