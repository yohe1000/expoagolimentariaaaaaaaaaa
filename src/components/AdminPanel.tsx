import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Store,
  Users,
  Handshake,
  Calendar,
  TrendingUp,
  Settings,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  BarChart3,
  QrCode,
} from 'lucide-react';
import {
  getCurrentProfile,
  loginWithEmail,
  logoutAdmin,
  getProfiles,
  getStandsPublic,
  getStandRequests,
  getExhibitors,
  getVisitors,
  getB2BRegistrations,
  getAgendaItems,
  getBolsaPrices,
  getEventConfig,
  getSecurityAuditLogs,
  confirmStandRequestInAdmin,
  releaseStandRequestInAdmin,
  extendStandHoldInAdmin,
  updateStandInAdmin,
  updateExhibitorInAdmin,
  createExhibitorInAdmin,
  toggleVisitorCheckInAdmin,
  updateB2BStatusInAdmin,
  upsertAgendaItemInAdmin,
  deleteAgendaItemInAdmin,
  upsertBolsaPriceInAdmin,
  updateEventConfigInAdmin,
  exportRecordsToCsv,
  downloadCsvFile,
  subscribeToStoreChanges,
  computeAdminAnalytics,
} from '../data/store';
import { STAND_TYPE_META, STAND_STATUS_META, StandStatus } from '../config/venue';
import { ExhibitorRecord } from '../data/seed';

interface AdminPanelProps {
  onBackHome: () => void;
  onOpenCheckin?: () => void;
}

type AdminTab =
  | 'stands'
  | 'analitica'
  | 'expositores'
  | 'visitantes'
  | 'b2b'
  | 'agenda'
  | 'bolsa'
  | 'config';

function exportTableAsCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    downloadCsvFile(filename, '\uFEFFsin_registros\r\n');
    return;
  }
  const headers = Object.keys(rows[0]).map((key) => ({ key, label: key }));
  const csv = exportRecordsToCsv(headers, rows);
  downloadCsvFile(filename, csv);
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackHome, onOpenCheckin }) => {
  const [profile, setProfile] = useState(() => getCurrentProfile());
  const [loginEmail, setLoginEmail] = useState('admin@cenexpo.com.ve');
  const [loginPassword, setLoginPassword] = useState('cenexpo2026');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('stands');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Reactive store snapshots
  const [stands, setStands] = useState(() => getStandsPublic());
  const [standRequests, setStandRequests] = useState(() => getStandRequests());
  const [exhibitors, setExhibitors] = useState(() => getExhibitors());
  const [visitors, setVisitors] = useState(() => getVisitors());
  const [b2bList, setB2bList] = useState(() => getB2BRegistrations());
  const [agendaItems, setAgendaItems] = useState(() => getAgendaItems());
  const [bolsaPrices, setBolsaPrices] = useState(() => getBolsaPrices());
  const [eventConfig, setEventConfig] = useState(() => getEventConfig());
  const [profilesList, setProfilesList] = useState(() => getProfiles());
  const [auditLogs, setAuditLogs] = useState(() => getSecurityAuditLogs());

  // Filter states inside tabs
  const [standSearch, setStandSearch] = useState('');
  const [exhibitorFilter, setExhibitorFilter] = useState<'todos' | ExhibitorRecord['status']>('todos');
  const [visitorSearch, setVisitorSearch] = useState('');

  // New exhibitor form state
  const [newExhName, setNewExhName] = useState('');
  const [newExhSector, setNewExhSector] = useState('Insumos agrícolas');
  const [newExhLevel] = useState<ExhibitorRecord['level']>('expositor');
  const [newExhStatus, setNewExhStatus] = useState<ExhibitorRecord['status']>('confirmado');
  const [newExhStand, setNewExhStand] = useState('');
  const [newExhIg] = useState('@');

  // New agenda item form state
  const [newAgendaDay, setNewAgendaDay] = useState<'2026-11-20' | '2026-11-21' | '2026-11-22'>('2026-11-20');
  const [newAgendaStart, setNewAgendaStart] = useState('09:30');
  const [newAgendaEnd] = useState('10:30');
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaSpeaker, setNewAgendaSpeaker] = useState('');
  const [newAgendaRoom] = useState('Salón de Conferencias');

  // New Bolsa price form state
  const [newBolsaItem, setNewBolsaItem] = useState('');
  const [newBolsaUnit, setNewBolsaUnit] = useState('Saco (50 kg)');
  const [newBolsaUsd, setNewBolsaUsd] = useState('25');
  const [newBolsaVes] = useState('1125');
  const [newBolsaCop, setNewBolsaCop] = useState('105000');

  const refreshAll = () => {
    setProfile(getCurrentProfile());
    setStands(getStandsPublic());
    setStandRequests(getStandRequests());
    setExhibitors(getExhibitors());
    setVisitors(getVisitors());
    setB2bList(getB2BRegistrations());
    setAgendaItems(getAgendaItems());
    setBolsaPrices(getBolsaPrices());
    setEventConfig(getEventConfig());
    setProfilesList(getProfiles());
    setAuditLogs(getSecurityAuditLogs());
  };

  useEffect(() => {
    const unsub = subscribeToStoreChanges(() => {
      refreshAll();
    });
    return unsub;
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginWithEmail(loginEmail, loginPassword);
    if (!res.ok || !res.profile) {
      setLoginError(res.error || 'Error de autenticación.');
      return;
    }
    setProfile(res.profile);
    refreshAll();
  };

  const handleLogout = () => {
    logoutAdmin();
    setProfile(null);
    setFeedbackBanner(null);
  };

  // Dashboard KPIs
  const kpis = useMemo(() => {
    const counts = { disponible: 0, reservado: 0, vendido: 0, bloqueado: 0 };
    let soldUsd = 0;
    let reservedUsd = 0;
    stands.forEach((s) => {
      counts[s.effective_status] = (counts[s.effective_status] || 0) + 1;
      const price = s.price_usd ?? STAND_TYPE_META[s.type].priceUsd;
      if (s.effective_status === 'vendido') soldUsd += price;
      if (s.effective_status === 'reservado') reservedUsd += price;
    });
    const pendingRequests = standRequests.filter((r) => r.status === 'pendiente').length;
    const confirmedExhibitorsCount = exhibitors.filter((e) => e.status === 'confirmado').length;
    const checkedInVisitors = visitors.filter((v) => Boolean(v.checked_in_at)).length;
    return {
      counts,
      soldUsd,
      reservedUsd,
      pendingRequests,
      confirmedExhibitorsCount,
      checkedInVisitors,
    };
  }, [stands, standRequests, exhibitors, visitors]);

  const analytics = useMemo(() => computeAdminAnalytics(), [stands, visitors]);

  // Unauthenticated View: Login Form
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#EEF2EF] px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-[500px] rounded-[12px] border border-[#1F2421]/20 bg-white p-6 sm:p-8 shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-[#1F2421]/15 pb-4">
            <div className="flex items-center gap-2 text-[#0F3D22]">
              <ShieldCheck className="h-5 w-5 text-[#1E7A34]" aria-hidden="true" />
              <span className="font-display-wide text-scale-16">
                Cenexpo C.A. · Acceso Administrativo
              </span>
            </div>
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1 text-scale-14 font-semibold text-[#1F4E9C] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a la web
            </button>
          </div>

          <h1 className="mt-4 font-display-wide text-scale-25 sm:text-scale-31 text-[#1F2421]">
            Panel de Administración · Fase 2
          </h1>
          <p className="mt-1 text-scale-14 text-[#1F2421]/80">
            Inicia sesión con tu correo autorizado en la tabla <code className="font-mono">profiles</code> (roles{' '}
            <strong>admin</strong> o <strong>staff</strong> protegidos por RLS).
          </p>

          {loginError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-[4px] border border-[#B23A2E] bg-[#FBECEB] p-3 text-scale-14 text-[#B23A2E]"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-scale-14 font-semibold text-[#1F2421]">
                Correo electrónico institucional
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-scale-14 font-semibold text-[#1F2421]">
                Contraseña de acceso
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-[4px] bg-[#1E7A34] px-5 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
            >
              Iniciar sesión en el panel
            </button>
          </form>

          {/* Quick Profile Switcher for verification */}
          <div className="mt-6 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-4">
            <p className="text-scale-14 font-semibold text-[#0F3D22]">
              Cuentas sembradas en <code className="font-mono">profiles</code> (clic para autocompletar):
            </p>
            <div className="mt-2.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@cenexpo.com.ve');
                  setLoginPassword('cenexpo2026');
                }}
                className="flex items-center justify-between rounded-[4px] border border-[#1F2421]/20 bg-white px-3 py-2 text-left text-[13px] hover:border-[#1E7A34]"
              >
                <span className="font-mono font-semibold text-[#1F2421]">admin@cenexpo.com.ve</span>
                <span className="rounded-[3px] bg-[#0F3D22] px-2 py-0.5 text-[11px] font-bold text-[#F4C20D]">
                  ROL: ADMIN (Total)
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('yohe.098@gmail.com');
                  setLoginPassword('cenexpo2026');
                }}
                className="flex items-center justify-between rounded-[4px] border border-[#1F2421]/20 bg-white px-3 py-2 text-left text-[13px] hover:border-[#1E7A34]"
              >
                <span className="font-mono font-semibold text-[#1F2421]">yohe.098@gmail.com</span>
                <span className="rounded-[3px] bg-[#0F3D22] px-2 py-0.5 text-[11px] font-bold text-[#F4C20D]">
                  ROL: ADMIN (Dirección)
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('staff@cenexpo.com.ve');
                  setLoginPassword('cenexpo2026');
                }}
                className="flex items-center justify-between rounded-[4px] border border-[#1F2421]/20 bg-white px-3 py-2 text-left text-[13px] hover:border-[#1F4E9C]"
              >
                <span className="font-mono font-semibold text-[#1F2421]">staff@cenexpo.com.ve</span>
                <span className="rounded-[3px] bg-[#1F4E9C] px-2 py-0.5 text-[11px] font-bold text-white">
                  ROL: STAFF (Operativo / Check-in)
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredStandsList = stands.filter((s) => {
    if (!standSearch.trim()) return true;
    const q = standSearch.trim().toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.location_label.toLowerCase().includes(q) ||
      (s.exhibitor?.name.toLowerCase().includes(q) ?? false)
    );
  });

  const filteredExhibitorsList = exhibitors.filter((e) => {
    if (exhibitorFilter !== 'todos' && e.status !== exhibitorFilter) return false;
    return true;
  });

  const filteredVisitorsList = visitors.filter((v) => {
    if (!visitorSearch.trim()) return true;
    const q = visitorSearch.trim().toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.whatsapp.toLowerCase().includes(q) ||
      v.municipality.toLowerCase().includes(q) ||
      v.qr_token.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#EEF2EF] text-[#1F2421] pb-16">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-[#1F2421]/15 bg-[#0F3D22] text-[#EEF2EF]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display-wide text-scale-20 text-white">
              Panel Admin · Expo Agroalimentaria La Grita 2026
            </span>
            <span
              className={`rounded-[4px] px-2.5 py-0.5 text-[12px] font-bold uppercase ${
                profile.role === 'admin'
                  ? 'bg-[#F4C20D] text-[#1F2421]'
                  : 'bg-[#1F4E9C] text-white'
              }`}
            >
              ROL: {profile.role.toUpperCase()} ({profile.email})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenCheckin && (
              <button
                type="button"
                onClick={onOpenCheckin}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] bg-[#F4C20D] px-3.5 py-1.5 text-scale-14 font-bold text-[#1F2421] hover:bg-[#e5b408]"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Escáner Puerta (/admin/checkin)
              </button>
            )}
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/30 bg-[#144A29] px-3.5 py-1.5 text-scale-14 font-semibold text-white hover:bg-[#1E7A34]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al plano 2D
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] bg-[#B23A2E] px-3.5 py-1.5 text-scale-14 font-semibold text-white hover:bg-[#8f2c22]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6">
        {/* Dashboard KPI Strip */}
        <section aria-label="Indicadores clave del evento" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-[8px] border border-[#1F2421]/15 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#1F2421]/70">Stands Disponibles</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#1E7A34]">
              {kpis.counts.disponible} <span className="text-scale-14 text-[#1F2421]/60">/ 59</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[#D9822B]/40 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#9A5512]">Reservados (48 h)</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#D9822B]">
              {kpis.counts.reservado}{' '}
              <span className="text-scale-14 font-normal text-[#1F2421]/70">(${kpis.reservedUsd})</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[#1F4E9C]/40 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#1F4E9C]">Stands Vendidos</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#1F4E9C]">
              {kpis.counts.vendido}{' '}
              <span className="text-scale-14 font-normal text-[#0F3D22]">(${kpis.soldUsd})</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[#1F2421]/15 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#1F2421]/70">Solicitudes Stand</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#1F2421]">
              {standRequests.length}{' '}
              <span className="text-scale-14 text-[#D9822B]">({kpis.pendingRequests} pend.)</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[#1F2421]/15 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#1F2421]/70">Expositores Conf.</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#0F3D22]">
              {kpis.confirmedExhibitorsCount}{' '}
              <span className="text-scale-14 text-[#1F2421]/60">/ {exhibitors.length}</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[#1F2421]/15 bg-white p-3.5">
            <p className="text-[12px] font-semibold uppercase text-[#1F2421]/70">Pases Visitantes</p>
            <p className="mt-1 font-display-wide text-scale-25 tabular-nums text-[#1F2421]">
              {visitors.length}{' '}
              <span className="text-scale-14 text-[#1E7A34]">({kpis.checkedInVisitors} en sala)</span>
            </p>
          </div>
        </section>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <div
            role="status"
            className={`mt-4 flex items-center justify-between gap-3 rounded-[8px] border px-4 py-3 text-scale-14 font-semibold ${
              feedbackBanner.type === 'success'
                ? 'border-[#1E7A34] bg-[#EAF5EC] text-[#0F3D22]'
                : 'border-[#B23A2E] bg-[#FBECEB] text-[#B23A2E]'
            }`}
          >
            <span>{feedbackBanner.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-scale-14 underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav
          aria-label="Secciones de administración"
          className="mt-6 flex flex-wrap gap-2 border-b border-[#1F2421]/15 pb-3"
        >
          {[
            { id: 'stands', label: `1. Solicitudes y Stands (${standRequests.length})`, icon: Store },
            { id: 'analitica', label: '2. Analítica en Vivo', icon: BarChart3 },
            { id: 'expositores', label: `3. Expositores (${exhibitors.length})`, icon: Building2 },
            { id: 'visitantes', label: `4. Visitantes QR (${visitors.length})`, icon: Users },
            { id: 'b2b', label: `5. Rueda B2B (${b2bList.length})`, icon: Handshake },
            { id: 'agenda', label: `6. Agenda (${agendaItems.length})`, icon: Calendar },
            { id: 'bolsa', label: `7. Bolsa Agrícola (${bolsaPrices.length})`, icon: TrendingUp },
            { id: 'config', label: '8. Configuración, Roles y RLS', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as AdminTab)}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-[4px] px-3.5 py-2 text-scale-14 font-semibold transition-colors ${
                  active
                    ? 'bg-[#0F3D22] text-[#F4C20D]'
                    : 'border border-[#1F2421]/20 bg-white text-[#1F2421] hover:bg-[#1F2421]/5'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* TAB ANALÍTICA: REGISTRATIONS PER DAY & CHANNEL, CHECK-INS PER HOUR, STANDS BY STATUS */}
        {activeTab === 'analitica' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. Registrations per Day */}
              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                  Registros de Visitantes por Día
                </h2>
                <p className="mt-1 text-[13px] text-[#1F2421]/75">
                  Evolución diaria de pases digitales emitidos ({analytics.totalVisitors} pases totales).
                </p>
                <div className="mt-4 space-y-3">
                  {analytics.registrationsByDay.map((row) => {
                    const maxCount = Math.max(
                      1,
                      ...analytics.registrationsByDay.map((r) => r.count)
                    );
                    const widthPct = Math.round((row.count / maxCount) * 100);
                    return (
                      <div key={row.date} className="space-y-1">
                        <div className="flex items-center justify-between text-scale-14">
                          <span className="font-mono font-semibold text-[#1F2421]">{row.date}</span>
                          <span className="font-display-wide tabular-nums text-[#0F3D22]">
                            {row.count} registros
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-[4px] bg-[#EEF2EF]">
                          <div
                            className="h-full bg-[#1E7A34]"
                            style={{ width: `${Math.max(widthPct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Registrations per Channel */}
              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                  Registros por Canal de Adquisición (<code className="font-mono">heard_from / utm</code>)
                </h2>
                <p className="mt-1 text-[13px] text-[#1F2421]/75">
                  Distribución por canal reportado al solicitar el pase QR.
                </p>
                <div className="mt-4 space-y-3">
                  {analytics.registrationsByChannel.map((row) => (
                    <div key={row.channel} className="space-y-1">
                      <div className="flex items-center justify-between text-scale-14">
                        <span className="font-semibold text-[#1F2421]">{row.channel}</span>
                        <span className="font-mono font-bold tabular-nums text-[#1F4E9C]">
                          {row.count} ({row.pct}%)
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-[4px] bg-[#EEF2EF]">
                        <div
                          className="h-full bg-[#1F4E9C]"
                          style={{ width: `${Math.max(row.pct, 6)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Check-ins per Hour */}
              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                      Ingresos Check-in en Puerta por Hora
                    </h2>
                    <p className="mt-1 text-[13px] text-[#1F2421]/75">
                      Flujo horario en el acceso de Vía Llano Los Zambranos ({analytics.totalCheckedIn} acreditados · {analytics.checkInRatePct}% tasa de asistencia).
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 items-end pt-4">
                  {analytics.checkInsByHour.map((slot) => {
                    const maxHr = Math.max(1, ...analytics.checkInsByHour.map((s) => s.count));
                    const barH = Math.max(12, Math.round((slot.count / maxHr) * 110));
                    return (
                      <div key={slot.hourLabel} className="flex flex-col items-center">
                        <span className="font-mono text-[12px] font-bold tabular-nums text-[#0F3D22]">
                          {slot.count}
                        </span>
                        <div className="mt-1 flex h-[115px] w-full items-end justify-center rounded-[4px] bg-[#EEF2EF] p-1">
                          <div
                            className={`w-full rounded-[3px] ${
                              slot.count > 0 ? 'bg-[#1E7A34]' : 'bg-[#1F2421]/15'
                            }`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                        <span className="mt-1.5 font-mono text-[11px] text-[#1F2421]/80">
                          {slot.hourLabel.slice(0, 2)}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Stands by Status */}
              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                  Ocupación de Stands por Estado (59 Espacios)
                </h2>
                <p className="mt-1 text-[13px] text-[#1F2421]/75">
                  Consolidado del Salón de Exposiciones (51 stands) + Expoauto (8 zonas) a Tasa BCV.
                </p>
                <div className="mt-4 space-y-3.5">
                  {analytics.standsByStatus.map((st) => (
                    <div
                      key={st.status}
                      className="rounded-[8px] border border-[#1F2421]/10 bg-[#EEF2EF]/60 p-3"
                    >
                      <div className="flex items-center justify-between text-scale-14">
                        <span className="inline-flex items-center gap-2 font-bold text-[#1F2421]">
                          <span
                            className="h-3.5 w-3.5 rounded-[2px]"
                            style={{ backgroundColor: st.color }}
                            aria-hidden="true"
                          />
                          {st.label}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-[#0F3D22]">
                          {st.count} espacios ({st.pct}%) · ${st.usdTotal.toLocaleString('es-VE')} USD
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-[4px] bg-white">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(st.pct, 4)}%`,
                            backgroundColor: st.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: SOLICITUDES DE STAND Y CONTROL DE 59 STANDS */}
        {activeTab === 'stands' && (
          <div className="mt-6 space-y-8">
            {/* Sub-section 1A: Stand Requests Queue (48h Holds) */}
            <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
                <div>
                  <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                    Solicitudes de Stand y Bloqueos de 48 Horas
                  </h2>
                  <p className="text-scale-14 text-[#1F2421]/75">
                    Confirma el pago de una solicitud para pasar el stand a estado <strong>Vendido</strong> en tiempo real y publicar la empresa en el directorio de expositores.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    exportTableAsCsv(
                      'solicitudes-stands-la-grita-2026.csv',
                      standRequests as unknown as Array<Record<string, unknown>>
                    )
                  }
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white transition-colors"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar Solicitudes CSV
                </button>
              </div>

              {standRequests.length === 0 ? (
                <div className="mt-4 rounded-[8px] bg-[#EEF2EF] p-6 text-scale-14 text-[#1F2421]/80">
                  No hay solicitudes de stand registradas todavía. Selecciona un stand disponible en el plano 2D (por ejemplo, el stand <strong>B05</strong>) para probar el bloqueo automático de 48 horas.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-scale-14">
                    <thead className="bg-[#0F3D22] text-white">
                      <tr>
                        <th className="py-3 px-3.5 font-semibold">Stand</th>
                        <th className="py-3 px-3.5 font-semibold">Empresa / RIF</th>
                        <th className="py-3 px-3.5 font-semibold">Contacto / WhatsApp</th>
                        <th className="py-3 px-3.5 font-semibold">Vence Bloqueo 48h</th>
                        <th className="py-3 px-3.5 font-semibold">Estado Solicitud</th>
                        <th className="py-3 px-3.5 font-semibold">Acciones (Rol Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2421]/10">
                      {standRequests.map((req) => {
                        const holdFormatted = new Date(req.hold_until).toLocaleString('es-VE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        });
                        return (
                          <tr key={req.id} className="hover:bg-[#EEF2EF]/50">
                            <td className="py-3 px-3.5 font-display-wide text-scale-16 text-[#0F3D22]">
                              Stand {req.stand_code}
                            </td>
                            <td className="py-3 px-3.5">
                              <p className="font-semibold text-[#1F2421]">{req.company_name}</p>
                              <p className="text-[12px] text-[#1F2421]/70">
                                {req.rif} · {req.sector}
                              </p>
                            </td>
                            <td className="py-3 px-3.5">
                              <p className="font-medium text-[#1F2421]">{req.contact_name}</p>
                              <p className="font-mono text-[12px] text-[#1F2421]/80">{req.whatsapp}</p>
                            </td>
                            <td className="py-3 px-3.5 tabular-nums text-[13px] text-[#9A5512] font-semibold">
                              {holdFormatted}
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-[4px] px-2.5 py-0.5 text-[12px] font-bold uppercase ${
                                  req.status === 'confirmada'
                                    ? 'bg-[#1F4E9C]/15 text-[#1F4E9C]'
                                    : req.status === 'pendiente'
                                    ? 'bg-[#D9822B]/20 text-[#9A5512]'
                                    : 'bg-[#1F2421]/10 text-[#1F2421]/70'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex flex-wrap items-center gap-2">
                                {req.status !== 'confirmada' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        const res = confirmStandRequestInAdmin(req.id);
                                        refreshAll();
                                        showMessage(
                                          'success',
                                          `Stand ${res.stand.code} confirmado como VENDIDO y asignado a ${res.exhibitor.name}.`
                                        );
                                      } catch (err) {
                                        showMessage(
                                          'error',
                                          err instanceof Error ? err.message : 'Error al confirmar.'
                                        );
                                      }
                                    }}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0F3D22]"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Confirmar venta (Vendido)
                                  </button>
                                )}

                                {req.status === 'pendiente' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        try {
                                          extendStandHoldInAdmin(req.stand_code, 48);
                                          refreshAll();
                                          showMessage(
                                            'success',
                                            `Bloqueo del stand ${req.stand_code} extendido por 48 horas adicionales.`
                                          );
                                        } catch (err) {
                                          showMessage(
                                            'error',
                                            err instanceof Error ? err.message : 'Error al extender.'
                                          );
                                        }
                                      }}
                                      className="inline-flex min-h-[36px] items-center gap-1 rounded-[4px] border border-[#D9822B] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#9A5512] hover:bg-[#D9822B]/10"
                                    >
                                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                      +48h
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        try {
                                          releaseStandRequestInAdmin(req.id);
                                          refreshAll();
                                          showMessage(
                                            'success',
                                            `Stand ${req.stand_code} liberado nuevamente a estado Disponible.`
                                          );
                                        } catch (err) {
                                          showMessage(
                                            'error',
                                            err instanceof Error ? err.message : 'Error al liberar.'
                                          );
                                        }
                                      }}
                                      className="inline-flex min-h-[36px] items-center gap-1 rounded-[4px] border border-[#B23A2E] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#B23A2E] hover:bg-[#FBECEB]"
                                    >
                                      Liberar stand
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sub-section 1B: Direct Editable Table of all 59 Stands */}
            <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
                <div>
                  <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                    Inventario Editable de los 59 Espacios (Salón + Expoauto)
                  </h2>
                  <p className="text-scale-14 text-[#1F2421]/75">
                    Cambia el estado en tiempo real (<code className="font-mono">disponible</code>,{' '}
                    <code className="font-mono">reservado</code>, <code className="font-mono">vendido</code>,{' '}
                    <code className="font-mono">bloqueado</code>) o ajusta tarifas a Tasa BCV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={standSearch}
                    onChange={(e) => setStandSearch(e.target.value)}
                    placeholder="Filtrar stand (ej. B05, 01, EA-01)..."
                    className="min-h-[40px] rounded-[4px] border border-[#1F2421]/25 bg-[#EEF2EF]/60 px-3 py-1.5 text-scale-14 text-[#1F2421]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      exportTableAsCsv(
                        'inventario-59-stands-la-grita-2026.csv',
                        stands.map((s) => ({
                          id: s.id,
                          code: s.code,
                          type: s.type,
                          dimensions: STAND_TYPE_META[s.type].dimensionsLabel,
                          price_usd: s.price_usd,
                          effective_status: s.effective_status,
                          hold_until: s.hold_until || '',
                          exhibitor_name: s.exhibitor?.name || '',
                          location_label: s.location_label,
                        }))
                      )
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar Stands CSV
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-[520px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-scale-14">
                  <thead className="sticky top-0 bg-[#0F3D22] text-white">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Código</th>
                      <th className="py-3 px-3.5 font-semibold">Medidas Oficiales</th>
                      <th className="py-3 px-3.5 font-semibold">Precio USD (BCV)</th>
                      <th className="py-3 px-3.5 font-semibold">Estado en Tiempo Real</th>
                      <th className="py-3 px-3.5 font-semibold">Expositor Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2421]/10">
                    {filteredStandsList.map((st) => {
                      const meta = STAND_TYPE_META[st.type];
                      const statusMeta = STAND_STATUS_META[st.effective_status];
                      return (
                        <tr key={st.id} className="hover:bg-[#EEF2EF]/50">
                          <td className="py-2.5 px-3.5 font-display-wide tabular-nums text-[#1F2421]">
                            {st.code}
                          </td>
                          <td className="py-2.5 px-3.5 text-[13px] text-[#1F2421]/85">
                            {meta.dimensionsLabel}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <input
                              type="number"
                              aria-label={`Precio USD para stand ${st.code}`}
                              value={st.price_usd ?? meta.priceUsd}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!Number.isNaN(val) && val >= 0) {
                                  try {
                                    updateStandInAdmin(st.code, { price_usd: val });
                                    refreshAll();
                                  } catch (err) {
                                    showMessage(
                                      'error',
                                      err instanceof Error ? err.message : 'Error de permisos RLS.'
                                    );
                                  }
                                }
                              }}
                              className="w-24 rounded-[4px] border border-[#1F2421]/25 bg-white px-2.5 py-1 font-mono font-bold tabular-nums text-[#0F3D22]"
                            />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <select
                              aria-label={`Estado para stand ${st.code}`}
                              value={st.effective_status}
                              onChange={(e) => {
                                const nextStatus = e.target.value as StandStatus;
                                try {
                                  updateStandInAdmin(st.code, {
                                    status: nextStatus,
                                    hold_until:
                                      nextStatus === 'reservado'
                                        ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
                                        : null,
                                  });
                                  refreshAll();
                                  showMessage(
                                    'success',
                                    `Stand ${st.code} actualizado a "${STAND_STATUS_META[nextStatus].label}" en tiempo real.`
                                  );
                                } catch (err) {
                                  showMessage(
                                    'error',
                                    err instanceof Error ? err.message : 'Error de permisos RLS.'
                                  );
                                }
                              }}
                              className="rounded-[4px] border px-2.5 py-1 text-[13px] font-semibold"
                              style={{
                                backgroundColor: statusMeta.bgTint,
                                borderColor: statusMeta.borderTint,
                                color: statusMeta.color,
                              }}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="reservado">Reservado (48 h)</option>
                              <option value="vendido">Vendido</option>
                              <option value="bloqueado">Bloqueado</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <select
                              aria-label={`Expositor asignado a stand ${st.code}`}
                              value={st.exhibitor_id || ''}
                              onChange={(e) => {
                                const exhId = e.target.value || null;
                                try {
                                  updateStandInAdmin(st.code, { exhibitor_id: exhId });
                                  refreshAll();
                                } catch (err) {
                                  showMessage(
                                    'error',
                                    err instanceof Error ? err.message : 'Error de permisos RLS.'
                                  );
                                }
                              }}
                              className="w-full max-w-[240px] rounded-[4px] border border-[#1F2421]/25 bg-white px-2.5 py-1 text-[13px] text-[#1F2421]"
                            >
                              <option value="">— Sin expositor asignado —</option>
                              {exhibitors.map((ex) => (
                                <option key={ex.id} value={ex.id}>
                                  {ex.name} ({ex.status})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPOSITORES (24 SEMBRADOS + NUEVOS) */}
        {activeTab === 'expositores' && (
          <div className="mt-6 space-y-6">
            <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
                <div>
                  <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                    Directorio de Organizaciones y Expositores ({exhibitors.length})
                  </h2>
                  <p className="text-scale-14 text-[#1F2421]/75">
                    Las 24 organizaciones anunciadas previamente están sembradas como{' '}
                    <code className="font-mono">por_reconfirmar</code>. Solo las marcadas como{' '}
                    <strong>confirmado</strong> se muestran públicamente en la portada.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={exhibitorFilter}
                    onChange={(e) =>
                      setExhibitorFilter(e.target.value as 'todos' | ExhibitorRecord['status'])
                    }
                    className="min-h-[40px] rounded-[4px] border border-[#1F2421]/25 bg-[#EEF2EF] px-3 py-1.5 text-scale-14 font-medium"
                  >
                    <option value="todos">Todos ({exhibitors.length})</option>
                    <option value="confirmado">
                      Confirmados públicos ({exhibitors.filter((x) => x.status === 'confirmado').length})
                    </option>
                    <option value="por_reconfirmar">
                      Por reconfirmar ({exhibitors.filter((x) => x.status === 'por_reconfirmar').length})
                    </option>
                    <option value="retirado">
                      Retirados ({exhibitors.filter((x) => x.status === 'retirado').length})
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      exportTableAsCsv(
                        'expositores-la-grita-2026.csv',
                        exhibitors as unknown as Array<Record<string, unknown>>
                      )
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar Expositores CSV
                  </button>
                </div>
              </div>

              {/* Add new exhibitor inline */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newExhName.trim()) return;
                  try {
                    createExhibitorInAdmin({
                      name: newExhName.trim(),
                      sector: newExhSector,
                      level: newExhLevel,
                      status: newExhStatus,
                      stand_code: newExhStand.trim().toUpperCase() || null,
                      instagram: newExhIg.trim() !== '@' ? newExhIg.trim() : null,
                      whatsapp: '+58 414 7589270',
                      logo_url: null,
                      description: `${newExhSector} en la Expo Agroalimentaria La Grita 2026.`,
                    });
                    setNewExhName('');
                    setNewExhStand('');
                    refreshAll();
                    showMessage('success', 'Expositor agregado correctamente.');
                  } catch (err) {
                    showMessage('error', err instanceof Error ? err.message : 'Error al crear.');
                  }
                }}
                className="mt-4 grid grid-cols-1 gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-4 sm:grid-cols-6"
              >
                <input
                  type="text"
                  placeholder="Nombre de empresa o institución..."
                  value={newExhName}
                  onChange={(e) => setNewExhName(e.target.value)}
                  className="sm:col-span-2 rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
                />
                <input
                  type="text"
                  placeholder="Sector / Rubro"
                  value={newExhSector}
                  onChange={(e) => setNewExhSector(e.target.value)}
                  className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
                />
                <input
                  type="text"
                  placeholder="Stand (ej. B05)"
                  value={newExhStand}
                  onChange={(e) => setNewExhStand(e.target.value)}
                  className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14 uppercase"
                />
                <select
                  value={newExhStatus}
                  onChange={(e) => setNewExhStatus(e.target.value as ExhibitorRecord['status'])}
                  className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
                >
                  <option value="confirmado">Confirmado</option>
                  <option value="por_reconfirmar">Por reconfirmar</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Agregar
                </button>
              </form>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-scale-14">
                  <thead className="bg-[#0F3D22] text-white">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Organización / Marca</th>
                      <th className="py-3 px-3.5 font-semibold">Categoría</th>
                      <th className="py-3 px-3.5 font-semibold">Sector</th>
                      <th className="py-3 px-3.5 font-semibold">Stand Asignado</th>
                      <th className="py-3 px-3.5 font-semibold">Estado Público</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2421]/10">
                    {filteredExhibitorsList.map((ex) => (
                      <tr key={ex.id} className="hover:bg-[#EEF2EF]/50">
                        <td className="py-2.5 px-3.5">
                          <p className="font-semibold text-[#1F2421]">{ex.name}</p>
                          {ex.instagram && (
                            <span className="text-[12px] text-[#1F4E9C]">{ex.instagram}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 capitalize text-[#1F2421]/80">{ex.level}</td>
                        <td className="py-2.5 px-3.5 text-[#1F2421]/85">{ex.sector}</td>
                        <td className="py-2.5 px-3.5">
                          <input
                            type="text"
                            value={ex.stand_code || ''}
                            placeholder="Sin stand"
                            onChange={(e) => {
                              try {
                                updateExhibitorInAdmin(ex.id, {
                                  stand_code: e.target.value.trim().toUpperCase() || null,
                                });
                                refreshAll();
                              } catch (err) {
                                showMessage(
                                  'error',
                                  err instanceof Error ? err.message : 'Error de permisos RLS.'
                                );
                              }
                            }}
                            className="w-24 rounded-[4px] border border-[#1F2421]/25 bg-white px-2.5 py-1 font-mono uppercase text-[13px]"
                          />
                        </td>
                        <td className="py-2.5 px-3.5">
                          <select
                            value={ex.status}
                            onChange={(e) => {
                              const next = e.target.value as ExhibitorRecord['status'];
                              try {
                                updateExhibitorInAdmin(ex.id, { status: next });
                                refreshAll();
                                showMessage(
                                  'success',
                                  `Estado de ${ex.name} actualizado a "${next}".`
                                );
                              } catch (err) {
                                showMessage(
                                  'error',
                                  err instanceof Error ? err.message : 'Error de permisos RLS.'
                                );
                              }
                            }}
                            className={`rounded-[4px] border px-2.5 py-1 text-[13px] font-semibold ${
                              ex.status === 'confirmado'
                                ? 'border-[#1E7A34] bg-[#EAF5EC] text-[#0F3D22]'
                                : ex.status === 'por_reconfirmar'
                                ? 'border-[#D9822B] bg-[#FDF3E8] text-[#9A5512]'
                                : 'border-[#1F2421]/30 bg-[#EEF1EF] text-[#1F2421]/70'
                            }`}
                          >
                            <option value="por_reconfirmar">por_reconfirmar (Oculto)</option>
                            <option value="confirmado">confirmado (Visible en web)</option>
                            <option value="retirado">retirado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VISITANTES Y PASES QR */}
        {activeTab === 'visitantes' && (
          <div className="mt-6 rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
              <div>
                <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                  Registro de Visitantes y Pases QR ({visitors.length})
                </h2>
                <p className="text-scale-14 text-[#1F2421]/75">
                  Tanto <strong>admin</strong> como <strong>staff</strong> pueden verificar pases QR y marcar el ingreso en puerta.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="search"
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  placeholder="Buscar por nombre, WhatsApp o token QR..."
                  className="min-h-[40px] rounded-[4px] border border-[#1F2421]/25 bg-[#EEF2EF] px-3 py-1.5 text-scale-14"
                />
                <button
                  type="button"
                  onClick={() =>
                    exportTableAsCsv(
                      'visitantes-pases-qr-la-grita-2026.csv',
                      visitors as unknown as Array<Record<string, unknown>>
                    )
                  }
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar Visitantes CSV
                </button>
              </div>
            </div>

            {filteredVisitorsList.length === 0 ? (
              <div className="mt-4 rounded-[8px] bg-[#EEF2EF] p-6 text-scale-14 text-[#1F2421]/80">
                No hay visitantes registrados aún con ese criterio.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-scale-14">
                  <thead className="bg-[#0F3D22] text-white">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Token QR</th>
                      <th className="py-3 px-3.5 font-semibold">Nombre y Apellido</th>
                      <th className="py-3 px-3.5 font-semibold">WhatsApp / Municipio</th>
                      <th className="py-3 px-3.5 font-semibold">Perfil y Rubros</th>
                      <th className="py-3 px-3.5 font-semibold">Check-in en Puerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2421]/10">
                    {filteredVisitorsList.map((v) => (
                      <tr key={v.id} className="hover:bg-[#EEF2EF]/50">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#0F3D22]">
                          {v.qr_token}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-[#1F2421]">{v.name}</td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-mono text-[13px]">{v.whatsapp}</p>
                          <p className="text-[12px] text-[#1F2421]/70">{v.municipality}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-medium">{v.profile}</p>
                          <p className="text-[12px] text-[#1F2421]/70">{v.interests.join(', ')}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                toggleVisitorCheckInAdmin(v.id);
                                refreshAll();
                              } catch (err) {
                                showMessage(
                                  'error',
                                  err instanceof Error ? err.message : 'Error en check-in.'
                                );
                              }
                            }}
                            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] px-3 py-1 text-[13px] font-semibold ${
                              v.checked_in_at
                                ? 'bg-[#1E7A34] text-white'
                                : 'border border-[#1F2421]/25 bg-white text-[#1F2421]'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {v.checked_in_at ? 'Ingresó en puerta' : 'Marcar entrada'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RUEDA DE NEGOCIOS B2B */}
        {activeTab === 'b2b' && (
          <div className="mt-6 rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
              <div>
                <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                  Inscritos en la Rueda de Negocios B2B ({b2bList.length})
                </h2>
                <p className="text-scale-14 text-[#1F2421]/75">
                  Empresas compradoras, productores oferentes y agroindustrias registradas para las mesas de negocio.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  exportTableAsCsv(
                    'rueda-negocios-b2b-la-grita-2026.csv',
                    b2bList as unknown as Array<Record<string, unknown>>
                  )
                }
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar Rueda B2B CSV
              </button>
            </div>

            {b2bList.length === 0 ? (
              <div className="mt-4 rounded-[8px] bg-[#EEF2EF] p-6 text-scale-14 text-[#1F2421]/80">
                No hay empresas inscritas en la Rueda de Negocios todavía.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-scale-14">
                  <thead className="bg-[#0F3D22] text-white">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Empresa / RIF</th>
                      <th className="py-3 px-3.5 font-semibold">Representante / WhatsApp</th>
                      <th className="py-3 px-3.5 font-semibold">Rol y Oferta/Demanda</th>
                      <th className="py-3 px-3.5 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2421]/10">
                    {b2bList.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 px-3.5">
                          <p className="font-semibold">{b.company_name}</p>
                          <p className="text-[12px] text-[#1F2421]/70">{b.rif}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p>{b.contact_name}</p>
                          <p className="font-mono text-[12px]">{b.whatsapp}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-semibold text-[#0F3D22]">{b.role_type}</p>
                          <p className="text-[12px]">{b.offer_or_demand}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <select
                            value={b.status}
                            onChange={(e) => {
                              updateB2BStatusInAdmin(
                                b.id,
                                e.target.value as 'inscrito' | 'verificado'
                              );
                              refreshAll();
                            }}
                            className="rounded-[4px] border border-[#1F2421]/25 bg-white px-2.5 py-1 text-[13px] font-semibold"
                          >
                            <option value="inscrito">Inscrito</option>
                            <option value="verificado">Verificado para mesa</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AGENDA */}
        {activeTab === 'agenda' && (
          <div className="mt-6 rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
              <div>
                <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                  Cronograma y Ponencias de la Agenda ({agendaItems.length})
                </h2>
                <p className="text-scale-14 text-[#1F2421]/75">
                  Agrega o edita conferencias para los días Vie 20, Sáb 21 y Dom 22 de noviembre.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  exportTableAsCsv(
                    'agenda-expo-la-grita-2026.csv',
                    agendaItems as unknown as Array<Record<string, unknown>>
                  )
                }
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar Agenda CSV
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAgendaTitle.trim()) return;
                try {
                  upsertAgendaItemInAdmin({
                    day: newAgendaDay,
                    starts_at: newAgendaStart,
                    ends_at: newAgendaEnd,
                    title: newAgendaTitle.trim(),
                    speaker: newAgendaSpeaker.trim() || 'Ponente invitado Cenexpo',
                    room: newAgendaRoom,
                  });
                  setNewAgendaTitle('');
                  setNewAgendaSpeaker('');
                  refreshAll();
                  showMessage('success', 'Actividad publicada en la agenda.');
                } catch (err) {
                  showMessage('error', err instanceof Error ? err.message : 'Error de permisos.');
                }
              }}
              className="mt-4 grid grid-cols-1 gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-4 sm:grid-cols-6"
            >
              <select
                value={newAgendaDay}
                onChange={(e) =>
                  setNewAgendaDay(e.target.value as '2026-11-20' | '2026-11-21' | '2026-11-22')
                }
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
              >
                <option value="2026-11-20">Vie 20 Nov</option>
                <option value="2026-11-21">Sáb 21 Nov</option>
                <option value="2026-11-22">Dom 22 Nov</option>
              </select>
              <input
                type="text"
                value={newAgendaStart}
                onChange={(e) => setNewAgendaStart(e.target.value)}
                placeholder="09:30"
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14 font-mono"
              />
              <input
                type="text"
                value={newAgendaTitle}
                onChange={(e) => setNewAgendaTitle(e.target.value)}
                placeholder="Título de la conferencia..."
                className="sm:col-span-2 rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
              />
              <input
                type="text"
                value={newAgendaSpeaker}
                onChange={(e) => setNewAgendaSpeaker(e.target.value)}
                placeholder="Ponente / Institución"
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Publicar
              </button>
            </form>

            {agendaItems.length > 0 && (
              <ul className="mt-4 divide-y divide-[#1F2421]/10">
                {agendaItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <span className="font-mono text-[13px] font-bold text-[#1E7A34]">
                        {item.day} · {item.starts_at} - {item.ends_at}
                      </span>
                      <p className="font-semibold text-[#1F2421]">{item.title}</p>
                      <p className="text-[13px] text-[#1F2421]/75">
                        {item.speaker} · {item.room}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteAgendaItemInAdmin(item.id);
                        refreshAll();
                      }}
                      className="inline-flex items-center gap-1 rounded-[4px] border border-[#B23A2E] px-2.5 py-1 text-[12px] font-semibold text-[#B23A2E] hover:bg-[#FBECEB]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* TAB 6: PRECIOS DE LA BOLSA AGRÍCOLA (AGROMARKET) */}
        {activeTab === 'bolsa' && (
          <div className="mt-6 rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
              <div>
                <h2 className="font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                  Precios Oficiales · Bolsa Agrícola de La Grita ({bolsaPrices.length} rubros)
                </h2>
                <p className="text-scale-14 text-[#1F2421]/75">
                  Actualiza los precios dominicales en USD, VES y COP que publica AgroMarket en la portada.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  exportTableAsCsv(
                    'precios-bolsa-agricola-la-grita-2026.csv',
                    bolsaPrices as unknown as Array<Record<string, unknown>>
                  )
                }
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-[#EEF2EF] px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar Precios CSV
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBolsaItem.trim()) return;
                try {
                  upsertBolsaPriceInAdmin({
                    report_date: '2026-11-22',
                    item: newBolsaItem.trim(),
                    unit: newBolsaUnit.trim(),
                    price_usd: Number(newBolsaUsd) || 0,
                    price_ves: Number(newBolsaVes) || 0,
                    price_cop: Number(newBolsaCop) || 0,
                    is_sample: false,
                  });
                  setNewBolsaItem('');
                  refreshAll();
                  showMessage('success', 'Rubro agregado a la Bolsa Agrícola.');
                } catch (err) {
                  showMessage('error', err instanceof Error ? err.message : 'Error de permisos.');
                }
              }}
              className="mt-4 grid grid-cols-1 gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-4 sm:grid-cols-6"
            >
              <input
                type="text"
                placeholder="Rubro (ej. Ajo Morado)"
                value={newBolsaItem}
                onChange={(e) => setNewBolsaItem(e.target.value)}
                className="sm:col-span-2 rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
              />
              <input
                type="text"
                placeholder="Unidad (ej. Saco 50 kg)"
                value={newBolsaUnit}
                onChange={(e) => setNewBolsaUnit(e.target.value)}
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14"
              />
              <input
                type="number"
                step="0.01"
                placeholder="USD"
                value={newBolsaUsd}
                onChange={(e) => setNewBolsaUsd(e.target.value)}
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14 font-mono"
              />
              <input
                type="number"
                step="1"
                placeholder="COP"
                value={newBolsaCop}
                onChange={(e) => setNewBolsaCop(e.target.value)}
                className="rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 text-scale-14 font-mono"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar
              </button>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-scale-14">
                <thead className="bg-[#0F3D22] text-white">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">Rubro</th>
                    <th className="py-3 px-3.5 font-semibold">Unidad</th>
                    <th className="py-3 px-3.5 font-semibold">USD ($)</th>
                    <th className="py-3 px-3.5 font-semibold">VES (Bs.)</th>
                    <th className="py-3 px-3.5 font-semibold">COP (Pesos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2421]/10">
                  {bolsaPrices.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 px-3.5 font-semibold">{row.item}</td>
                      <td className="py-2.5 px-3.5">{row.unit}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[#0F3D22]">
                        ${row.price_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono">Bs. {row.price_ves.toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 font-mono">
                        ${row.price_cop.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: CONFIGURACIÓN, ROLES PROFILES Y SEGURIDAD RLS */}
        {activeTab === 'config' && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Event Config Form */}
            <div className="lg:col-span-6 rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                Parámetros Oficiales (<code className="font-mono">event_config</code>)
              </h2>
              <div className="mt-4 space-y-4 text-scale-14">
                <label className="flex items-center justify-between gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-3.5 cursor-pointer">
                  <span>
                    <strong className="block text-[#1F2421]">Insignia «Fecha confirmada»</strong>
                    <span className="text-[12px] text-[#1F2421]/75">
                      Muestra el sello verde junto al 20, 21 y 22 de noviembre de 2026
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={eventConfig.date_confirmed}
                    onChange={(e) => {
                      try {
                        updateEventConfigInAdmin({ date_confirmed: e.target.checked });
                        refreshAll();
                      } catch (err) {
                        showMessage('error', err instanceof Error ? err.message : 'Error RLS');
                      }
                    }}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-3.5 cursor-pointer">
                  <span>
                    <strong className="block text-[#1F2421]">
                      Habilitar Galería Post-Expo (<code className="font-mono">gallery_enabled</code>)
                    </strong>
                    <span className="text-[12px] text-[#1F2421]/75">
                      Oculta por defecto hasta finalizar la Expo; al activarla se muestra la sección de memoria fotográfica en la portada
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Habilitar Galería Post-Expo (gallery_enabled)"
                    checked={eventConfig.gallery_enabled}
                    onChange={(e) => {
                      try {
                        updateEventConfigInAdmin({ gallery_enabled: e.target.checked });
                        refreshAll();
                        showMessage(
                          'success',
                          e.target.checked
                            ? 'Galería Post-Expo activada públicamente en la portada.'
                            : 'Galería Post-Expo ocultada en la portada.'
                        );
                      } catch (err) {
                        showMessage('error', err instanceof Error ? err.message : 'Error RLS');
                      }
                    }}
                    className="h-5 w-5"
                  />
                </label>

                <div>
                  <label className="block font-semibold text-[#1F2421]">
                    Horario de atención en puertas (<code className="font-mono">hours_text</code>)
                  </label>
                  <input
                    type="text"
                    value={eventConfig.hours_text}
                    onChange={(e) => {
                      try {
                        updateEventConfigInAdmin({ hours_text: e.target.value });
                        refreshAll();
                      } catch (err) {
                        showMessage('error', err instanceof Error ? err.message : 'Error RLS');
                      }
                    }}
                    className="mt-1 w-full min-h-[42px] rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1F2421]">Latitud Casino Militar</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={eventConfig.venue_lat}
                      onChange={(e) => {
                        updateEventConfigInAdmin({ venue_lat: Number(e.target.value) });
                        refreshAll();
                      }}
                      className="mt-1 w-full min-h-[42px] rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1F2421]">Longitud Casino Militar</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={eventConfig.venue_lng}
                      onChange={(e) => {
                        updateEventConfigInAdmin({ venue_lng: Number(e.target.value) });
                        refreshAll();
                      }}
                      className="mt-1 w-full min-h-[42px] rounded-[4px] border border-[#1F2421]/25 bg-white px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profiles RBAC + RLS SQL Download + Security Audit Log */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                    Roles en <code className="font-mono">profiles</code> y Seguridad RLS
                  </h2>
                  <a
                    href="/supabase-phase2-rls.sql"
                    download="supabase-phase2-rls.sql"
                    className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#0F3D22] px-3 py-1.5 text-[12px] font-semibold text-[#F4C20D]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Descargar SQL RLS
                  </a>
                </div>
                <ul className="mt-3 divide-y divide-[#1F2421]/10 text-scale-14">
                  {profilesList.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-mono font-semibold text-[#1F2421]">{p.email}</p>
                        <p className="text-[12px] text-[#1F2421]/70">{p.full_name}</p>
                      </div>
                      <span
                        className={`rounded-[4px] px-2.5 py-0.5 text-[12px] font-bold uppercase ${
                          p.role === 'admin'
                            ? 'bg-[#0F3D22] text-[#F4C20D]'
                            : 'bg-[#1F4E9C] text-white'
                        }`}
                      >
                        {p.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display-wide text-scale-16 text-[#1F2421]">
                    Bitácora de Seguridad (Honeypot, Rate Limit y RLS)
                  </h3>
                  <button
                    type="button"
                    onClick={refreshAll}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F4E9C]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Refrescar
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#1F2421]/70">
                    Sin eventos registrados en esta sesión.
                  </p>
                ) : (
                  <ul className="mt-3 max-h-48 overflow-y-auto divide-y divide-[#1F2421]/10 text-[12px]">
                    {auditLogs.slice(0, 15).map((log) => (
                      <li key={log.id} className="py-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[#1F2421]">{log.detail}</span>
                        <span
                          className={`rounded-[3px] px-1.5 py-0.5 font-bold uppercase ${
                            log.event_type === 'auth_login' ||
                            log.event_type === 'stand_hold_48h' ||
                            log.event_type === 'stand_confirmed'
                              ? 'bg-[#EAF5EC] text-[#1E7A34]'
                              : 'bg-[#FBECEB] text-[#B23A2E]'
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
