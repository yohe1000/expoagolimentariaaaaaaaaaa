import React, { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import {
  Cpu,
  Sprout,
  HeartHandshake,
  Factory,
  Hexagon,
  Beef,
  Mountain,
  Truck,
  ChevronDown,
  MessageSquare,
  ExternalLink,
  Search,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  QrCode,
} from 'lucide-react';
import {
  getEventConfig,
  getZones,
  getConfirmedExhibitors,
  getStandsPublic,
  getBolsaPrices,
  getAgendaItems,
  getLastPassToken,
  subscribeToStoreChanges,
} from './data/store';
import {
  THEMATIC_AXES,
  PARTICIPANT_PROFILES,
  WORK_ROUTE_STEPS,
  POST_EVENT_GALLERY_ITEMS,
  VisitorRecord,
} from './data/seed';
import { calculateEventCountdown, buildWhatsAppBookingLink } from './utils/passUtils';
import {
  ExpoOfficialLogo,
  OrganizaPresentaLockup,
  OfficialSponsorsShowcase,
  OfficialPhotoCard,
} from './components/BrandLockups';
import { MaquetteHeroStill } from './components/MaquetteHeroStill';
import { StandPlan2D } from './components/StandPlan2D';
import { ZonesMiniPlan } from './components/ZonesMiniPlan';
import { VisitorPassView } from './components/VisitorPassView';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

const VenueLeafletMap = lazy(() =>
  import('./components/VenueLeafletMap').then((m) => ({ default: m.VenueLeafletMap }))
);
const RegistrationModal = lazy(() =>
  import('./components/RegistrationModal').then((m) => ({ default: m.RegistrationModal }))
);
const StandInquiryModal = lazy(() =>
  import('./components/StandInquiryModal').then((m) => ({ default: m.StandInquiryModal }))
);
const B2BRegistrationModal = lazy(() =>
  import('./components/B2BRegistrationModal').then((m) => ({ default: m.B2BRegistrationModal }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);
const AdminCheckinScanner = lazy(() =>
  import('./components/AdminCheckinScanner').then((m) => ({ default: m.AdminCheckinScanner }))
);

function AxisIcon({ name }: { name: string }) {
  const cls = 'h-6 w-6 shrink-0 text-[#1E7A34]';
  switch (name) {
    case 'cpu':
      return <Cpu className={cls} aria-hidden="true" />;
    case 'sprout':
      return <Sprout className={cls} aria-hidden="true" />;
    case 'heart-handshake':
      return <HeartHandshake className={cls} aria-hidden="true" />;
    case 'factory':
      return <Factory className={cls} aria-hidden="true" />;
    case 'hexagon':
      return <Hexagon className={cls} aria-hidden="true" />;
    case 'beef':
      return <Beef className={cls} aria-hidden="true" />;
    case 'mountain':
      return <Mountain className={cls} aria-hidden="true" />;
    case 'truck':
      return <Truck className={cls} aria-hidden="true" />;
    default:
      return <Sprout className={cls} aria-hidden="true" />;
  }
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isStandInquiryOpen, setIsStandInquiryOpen] = useState(false);
  const [isB2BModalOpen, setIsB2BModalOpen] = useState(false);
  const [inquiryStandCode, setInquiryStandCode] = useState<string>('');
  const [selectedStandCode, setSelectedStandCode] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/stand\/([A-Za-z0-9-]+)$/);
    return match ? match[1].toUpperCase() : '01';
  });

  // Section 5 Exhibitors filter state
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [exhibitorSearch, setExhibitorSearch] = useState<string>('');

  // Section 6 Agenda tab state: "Vie 20", "Sáb 21", "Dom 22"
  const [activeAgendaDay, setActiveAgendaDay] = useState<'2026-11-20' | '2026-11-21' | '2026-11-22'>(
    '2026-11-20'
  );

  // Section 11 FAQ accordion state
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-horario');

  // Force 3D Maquette activation when clicking Hero "Explorar la maqueta 3D"
  const [force3DTrigger, setForce3DTrigger] = useState<number>(0);

  // Sunday Nov 22 "En vivo hoy" Bolsa state preview toggle (auto-enabled on 2026-11-22)
  const [bolsaLiveOverride, setBolsaLiveOverride] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('bolsa') === 'envivo';
  });

  // Last generated pass token for quick access
  const [lastPassToken, setLastPassToken] = useState<string | null>(() => getLastPassToken());

  // Realtime reactive state from store
  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => {
    return subscribeToStoreChanges(() => {
      setStoreVersion((v) => v + 1);
    });
  }, []);

  const eventConfig = useMemo(() => getEventConfig(), [storeVersion]);
  const zones = useMemo(() => getZones(), []);
  const confirmedExhibitors = useMemo(() => getConfirmedExhibitors(), [storeVersion]);
  const standsPublic = useMemo(() => getStandsPublic(), [storeVersion]);
  const bolsaPrices = useMemo(() => getBolsaPrices(), [storeVersion]);
  const agendaItems = useMemo(() => getAgendaItems(), [storeVersion]);

  const countdown = useMemo(() => calculateEventCountdown(), []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
      const standMatch = window.location.pathname.match(/^\/stand\/([A-Za-z0-9-]+)$/);
      if (standMatch) {
        setSelectedStandCode(standMatch[1].toUpperCase());
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPathname(newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStand = (code: string | null) => {
    setSelectedStandCode(code);
    if (code) {
      window.history.replaceState({}, '', `/stand/${code.toUpperCase()}`);
    } else if (window.location.pathname.startsWith('/stand/')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleExploreMaquette = () => {
    setForce3DTrigger((n) => n + 1);
    const el = document.getElementById('recorre-la-expo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRegistrationSuccess = (visitor: VisitorRecord) => {
    setIsRegistrationOpen(false);
    setLastPassToken(visitor.qr_token);
    navigateTo(`/pase/${encodeURIComponent(visitor.qr_token)}`);
  };

  // Confirmed exhibitors filtered for Section 5
  const confirmedOnlyExpositorDirectory = useMemo(
    () =>
      confirmedExhibitors.filter(
        (e) => e.level === 'expositor' || e.level === 'patrocinador' || e.level === 'aliado'
      ),
    [confirmedExhibitors]
  );

  const availableSectors = useMemo(() => {
    const set = new Set<string>(['Todos']);
    confirmedOnlyExpositorDirectory.forEach((e) => set.add(e.sector));
    return Array.from(set);
  }, [confirmedOnlyExpositorDirectory]);

  // Route: /pase/:token
  const passMatch = pathname.match(/^\/pase\/([^/]+)$/);
  if (passMatch) {
    const token = decodeURIComponent(passMatch[1]);
    return <VisitorPassView token={token} onBackHome={() => navigateTo('/')} />;
  }

  // Route: /admin
  if (pathname === '/admin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#EEF2EF] p-8 font-display-wide text-scale-20 text-[#0F3D22]">
            Cargando Panel de Administración...
          </div>
        }
      >
        <OfflineIndicator />
        <AdminPanel
          onBackHome={() => navigateTo('/')}
          onOpenCheckin={() => navigateTo('/admin/checkin')}
        />
      </Suspense>
    );
  }

  // Route: /admin/checkin (Phase 4 offline QR check-in with html5-qrcode + IndexedDB sync queue)
  if (pathname === '/admin/checkin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#EEF2EF] p-8 font-display-wide text-scale-20 text-[#0F3D22]">
            Cargando Escáner QR de Puerta...
          </div>
        }
      >
        <OfflineIndicator />
        <AdminCheckinScanner
          onBackAdmin={() => navigateTo('/admin')}
          onBackHome={() => navigateTo('/')}
        />
      </Suspense>
    );
  }

  const filteredDirectory = confirmedOnlyExpositorDirectory.filter((e) => {
    if (selectedSector !== 'Todos' && e.sector !== selectedSector) return false;
    if (exhibitorSearch.trim() !== '') {
      const q = exhibitorSearch.trim().toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.sector.toLowerCase().includes(q) ||
        (e.stand_code?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const confirmedLodgingAllies = confirmedExhibitors.filter(
    (e) =>
      e.id === 'org-posadas-tachira' ||
      e.id === 'org-capmi-plazza' ||
      e.sector.toLowerCase().includes('alojamiento')
  );

  const dayAgenda = agendaItems.filter((item) => item.day === activeAgendaDay);

  const isBolsaLiveToday = countdown.isBolsaLiveDay || bolsaLiveOverride;

  return (
    <div className="min-h-screen bg-[#EEF2EF] text-[#1F2421] pb-20 md:pb-0">
      <OfflineIndicator />
      {/* Top Bar Contract: [Brand title, one line] — [4–5 nav links, single-line] — [1 primary action] */}
      <header className="sticky top-0 z-30 border-b border-[#1F2421]/15 bg-[#EEF2EF]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 sm:gap-8 px-3 py-2.5 sm:px-6 sm:py-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/');
            }}
            className="whitespace-nowrap shrink-0"
          >
            <ExpoOfficialLogo />
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-scale-14 font-medium text-[#1F2421]"
          >
            <a
              href="#patrocinadores-oficiales"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Patrocinadores
            </a>
            <a
              href="#recorre-la-expo"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Maqueta
            </a>
            <a
              href="#que-vas-a-encontrar"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Ejes
            </a>
            <a
              href="#expositores"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Expositores
            </a>
            <a
              href="#precios-bolsa"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Precios Bolsa
            </a>
            <a
              href="#como-llegar"
              className="hover:text-[#1E7A34] hover:underline whitespace-nowrap shrink-0"
            >
              Cómo llegar
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {lastPassToken ? (
              <button
                type="button"
                onClick={() => navigateTo(`/pase/${encodeURIComponent(lastPassToken)}`)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22] transition-colors whitespace-nowrap shrink-0"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Ver mi pase QR
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRegistrationOpen(true)}
                className="inline-flex min-h-[40px] items-center rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22] transition-colors whitespace-nowrap shrink-0"
              >
                Obtener mi pase
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* SECTION 1: HERO (with Surcos contour motif behind hero only) */}
        <section
          aria-labelledby="hero-heading"
          className="bg-surcos-light border-b border-[#1F2421]/15 py-8 sm:py-12 lg:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              {/* Left 7 columns: H1, date line, venue line, lead, CTAs, countdown, lockups */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                {/* Date line + Conditional "Fecha confirmada" badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display-wide text-scale-20 sm:text-scale-25 text-[#0F3D22] tabular-nums">
                    20, 21 y 22 de noviembre de 2026
                  </p>
                  {eventConfig.date_confirmed && (
                    <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-2.5 py-1 text-scale-14 font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Fecha confirmada
                    </span>
                  )}
                </div>

                {/* H1 */}
                <h1
                  id="hero-heading"
                  className="mt-2 font-display-wide text-scale-31 sm:text-scale-49 lg:text-scale-61 text-[#1F2421] max-w-[18ch] break-words"
                >
                  Expo Agroalimentaria La Grita 2026
                </h1>

                {/* Venue line + Opening hours */}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-scale-16 font-medium text-[#1F2421]/85">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#1E7A34] shrink-0" aria-hidden="true" />
                    Casino Militar de La Grita, Táchira
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#1E7A34] shrink-0" aria-hidden="true" />
                    {eventConfig.hours_text}
                  </span>
                </div>

                {/* Lead */}
                <p className="mt-4 text-scale-20 text-[#1F2421] max-w-[58ch] leading-normal">
                  Productores, insumos, maquinaria y negocios del campo andino en un solo lugar.
                </p>

                <p className="mt-2 text-scale-14 text-[#1F2421]/75 max-w-[62ch]">
                  En el marco de la Semana Nacional de la Alimentación y los 450 años de la fundación de La Grita (1576).
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsRegistrationOpen(true)}
                    className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center rounded-[4px] bg-[#1E7A34] px-6 py-3 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors whitespace-nowrap"
                  >
                    Obtener mi pase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInquiryStandCode('');
                      setIsStandInquiryOpen(true);
                    }}
                    className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center rounded-[4px] border-2 border-[#1F4E9C] bg-white px-6 py-3 text-scale-16 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Quiero un stand
                  </button>
                </div>

                {/* Quiet countdown in days and hours */}
                <div
                  aria-label="Cuenta regresiva para el inicio del evento"
                  className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-[4px] border border-[#1F2421]/15 bg-white px-4 py-2.5 text-scale-14 text-[#1F2421]"
                >
                  <Calendar className="h-4 w-4 text-[#1E7A34] shrink-0" aria-hidden="true" />
                  {countdown.isLive ? (
                    <span className="font-semibold text-[#1E7A34]">
                      Evento en curso hoy en el Casino Militar de La Grita
                    </span>
                  ) : countdown.isEnded ? (
                    <span className="font-medium">
                      Edición realizada del 20 al 22 de noviembre de 2026
                    </span>
                  ) : (
                    <span>
                      Faltan{' '}
                      <strong className="font-display-wide tabular-nums text-[#0F3D22]">
                        {countdown.days} días y {countdown.hours} horas
                      </strong>{' '}
                      para abrir puertas en La Grita
                    </span>
                  )}
                </div>

                {/* Organiza and Presenta lockups */}
                <div className="mt-8 pt-6 border-t border-[#1F2421]/15 w-full">
                  <OrganizaPresentaLockup variant="light" />
                </div>
              </div>

              {/* Right 5 columns: Maquette still with "Explorar la maqueta 3D" */}
              <div className="lg:col-span-5">
                <MaquetteHeroStill onExploreClick={handleExploreMaquette} />
              </div>
            </div>
          </div>
        </section>

        {/* GRAND OFFICIAL SPONSORS & DIGITAL PRESENTER SHOWCASE (BISA, Banco Sofitasa, AgroMarket) */}
        <OfficialSponsorsShowcase
          onSelectStandInPlan={(code) => {
            handleSelectStand(code);
            const el = document.getElementById('recorre-la-expo');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* SECTION 2: RECORRE LA EXPO */}
        <section
          id="recorre-la-expo"
          aria-labelledby="recorre-heading"
          className="border-b border-[#1F2421]/15 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="recorre-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Recorre la Expo · Patrón y Medidas de El Casino Militar
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                Explora la planimetría exacta del Salón de Exposiciones (38,0 × 21,5 m con 51 stands numerados del 01 al 51, 7 mesas de negocios y tarima Show Bisnet) y las 8 zonas exteriores de Expoauto (100 m² a 170 m²).
              </p>
            </div>

            <div className="mt-6">
              <StandPlan2D
                stands={standsPublic}
                selectedStandCode={selectedStandCode}
                onSelectStand={handleSelectStand}
                whatsappPrimary={eventConfig.whatsapp_numbers[0]}
                force3DTrigger={force3DTrigger}
                onRequestStandModal={(code) => {
                  setInquiryStandCode(code || '');
                  setIsStandInquiryOpen(true);
                }}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: QUÉ VAS A ENCONTRAR (8 axes as a two-column list, NOT cards, plus who can participate & work route) */}
        <section
          id="que-vas-a-encontrar"
          aria-labelledby="encontrar-heading"
          className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="encontrar-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Qué vas a encontrar
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                Ocho ejes temáticos que articulan el campo andino con una visión agrosostenible, desde la salud del suelo hasta la logística pesada y el valor agregado.
              </p>
            </div>

            {/* 8 Thematic Axes: Two-column list, each with a simple line icon and one sentence. NOT cards. */}
            <ul className="mt-8 grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
              {THEMATIC_AXES.map((axis) => (
                <li
                  key={axis.id}
                  className="flex items-start gap-4 border-b border-[#1F2421]/10 pb-5"
                >
                  <div className="mt-0.5">
                    <AxisIcon name={axis.icon} />
                  </div>
                  <div>
                    <h3 className="font-display-wide text-scale-20 text-[#1F2421]">
                      {axis.title}
                    </h3>
                    <p className="mt-1 text-scale-16 text-[#1F2421]/85 max-w-[60ch]">
                      {axis.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Who can participate (5 profiles) & Real Photo Placeholder */}
            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start pt-4">
              <div className="lg:col-span-7">
                <h3 className="font-display-wide text-scale-25 text-[#1F2421]">
                  Quiénes participan en el encuentro
                </h3>
                <ul className="mt-4 divide-y divide-[#1F2421]/10 border-t border-b border-[#1F2421]/10">
                  {PARTICIPANT_PROFILES.map((p) => (
                    <li key={p.title} className="py-3.5">
                      <p className="font-semibold text-scale-16 text-[#0F3D22]">{p.title}</p>
                      <p className="mt-0.5 text-scale-14 text-[#1F2421]/80">{p.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <OfficialPhotoCard
                  src="/assets/extracted/la-grita-panoramica-real.jpg"
                  alt="Vista panorámica real de La Grita, Atenas del Táchira, y sus montañas cultivadas"
                  badgeText="La Grita · 1.440 m s. n. m."
                  captionTitle="La Grita, Atenas del Táchira y capital agroalimentaria"
                  captionDetail="Panorámica real del valle del municipio Jáuregui y sus laderas productivas que abastecen a Venezuela."
                  aspectClass="aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: ZONAS */}
        <section
          id="zonas"
          aria-labelledby="zonas-heading"
          className="border-b border-[#1F2421]/15 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="zonas-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Zonas
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                El recinto del Casino Militar de La Grita y su entorno frente a la Vía Llano Los Zambranos se organizan en cinco zonas conectadas por un acceso único.
              </p>
            </div>

            <div className="mt-6">
              <ZonesMiniPlan zones={zones} />
            </div>
          </div>
        </section>

        {/* SECTION 5: EXPOSITORES */}
        <section
          id="expositores"
          aria-labelledby="expositores-heading"
          className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[68ch]">
                <h2
                  id="expositores-heading"
                  className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
                >
                  Expositores
                </h2>
                <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                  Directorio oficial de empresas, instituciones y aliados con participación confirmada para el 20, 21 y 22 de noviembre.
                </p>
              </div>

              {/* Search input */}
              <div className="w-full md:w-72">
                <label htmlFor="exhibitor-search" className="sr-only">
                  Buscar expositor confirmado
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F2421]/60"
                    aria-hidden="true"
                  />
                  <input
                    id="exhibitor-search"
                    type="search"
                    value={exhibitorSearch}
                    onChange={(e) => setExhibitorSearch(e.target.value)}
                    placeholder="Buscar por nombre o sector..."
                    className="w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/25 bg-[#EEF2EF]/60 pl-9 pr-3 py-2 text-scale-14 text-[#1F2421]"
                  />
                </div>
              </div>
            </div>

            {/* Sector filter chips */}
            {availableSectors.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {availableSectors.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSector(sec)}
                    className={`min-h-[38px] rounded-[4px] px-3.5 py-1.5 text-scale-14 font-medium transition-colors ${
                      selectedSector === sec
                        ? 'bg-[#1E7A34] text-white'
                        : 'border border-[#1F2421]/20 bg-[#EEF2EF] text-[#1F2421] hover:border-[#1E7A34]'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            )}

            {/* Confirmed Exhibitors List or Required Empty State */}
            {filteredDirectory.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDirectory.map((exh) => (
                  <article
                    key={exh.id}
                    className={`flex flex-col justify-between rounded-[12px] border p-5 ${
                      exh.level === 'patrocinador'
                        ? 'border-2 border-[#1E7A34] bg-[#EEF2EF]'
                        : 'border-[#1F2421]/15 bg-[#EEF2EF]/60'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {exh.level === 'patrocinador' ? (
                          <span className="rounded-[4px] bg-[#0F3D22] px-2.5 py-0.5 text-[12px] font-bold text-[#F4C20D]">
                            Patrocinador Oficial Principal
                          </span>
                        ) : (
                          <span className="text-scale-14 font-semibold text-[#1E7A34]">
                            {exh.sector}
                          </span>
                        )}
                        {exh.stand_code && (
                          <span className="rounded-[4px] border border-[#0F3D22]/25 bg-white px-2.5 py-0.5 font-display-wide text-scale-14 tabular-nums text-[#0F3D22]">
                            Stand {exh.stand_code}
                          </span>
                        )}
                      </div>

                      {exh.logo_url && (
                        <div className="mt-3 flex h-28 items-center justify-center rounded-[8px] border border-[#1F2421]/15 bg-white p-3">
                          <img
                            src={exh.logo_url}
                            alt={`Logo oficial de ${exh.name}`}
                            loading="lazy"
                            className="max-h-22 w-auto object-contain"
                          />
                        </div>
                      )}

                      {exh.level === 'patrocinador' && (
                        <p className="mt-3 text-[12px] font-bold uppercase tracking-wider text-[#1E7A34]">
                          {exh.sector}
                        </p>
                      )}
                      <h3 className="mt-1 font-display-wide text-scale-20 text-[#1F2421]">
                        {exh.name}
                      </h3>
                      <p className="mt-1.5 text-scale-14 text-[#1F2421]/85">{exh.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#1F2421]/10 pt-3 text-scale-14">
                      {exh.stand_code && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectStand(exh.stand_code);
                            const el = document.getElementById('recorre-la-expo');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="font-semibold text-[#0F3D22] underline hover:text-[#1E7A34]"
                        >
                          Ver Stand {exh.stand_code} en Maqueta
                        </button>
                      )}
                      {exh.instagram && (
                        <a
                          href={`https://www.instagram.com/${exh.instagram.replace('@', '')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#1F4E9C] underline"
                        >
                          {exh.instagram}
                        </a>
                      )}
                      {exh.whatsapp && (
                        <a
                          href={buildWhatsAppBookingLink(
                            exh.whatsapp,
                            `Hola ${exh.name}, los vi en el directorio de la Expo Agroalimentaria La Grita 2026.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#1E7A34] underline"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              /* Exact required empty state when all 24 seeded orgs are in "por_reconfirmar" */
              <div className="mt-6 rounded-[12px] border border-[#1F2421]/15 bg-[#EEF2EF] p-6 sm:p-8">
                <p className="font-display-wide text-scale-20 text-[#1F2421]">
                  Los primeros expositores confirmados aparecerán aquí.
                </p>
                <p className="mt-2 max-w-[65ch] text-scale-16 text-[#1F2421]/80">
                  Las 24 organizaciones, marcas e instituciones anunciadas en las etapas previas de 2026 se encuentran cargadas en la base de datos en estado de reconfirmación para la fecha del 20 al 22 de noviembre. A medida que Cenexpo valide cada participación, se publicarán automáticamente en este directorio con su stand asignado.
                </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setInquiryStandCode('');
                        setIsStandInquiryOpen(true);
                      }}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-[4px] bg-[#1E7A34] px-6 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
                    >
                      Quiero un stand
                    </button>
                  </div>
                </div>
              )}

              {/* Official Exhibitor Benefits & Expoauto Showcase from the Cenexpo PDFs */}
              <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start border-t border-[#1F2421]/10 pt-10">
                <div className="lg:col-span-7 rounded-[12px] border border-[#1F2421]/15 bg-[#EEF2EF] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-[4px] bg-[#0F3D22] px-3 py-1 text-scale-14 font-semibold text-[#F4C20D]">
                      Beneficios oficiales para expositores (Cenexpo C.A.)
                    </span>
                    <img
                      src="/assets/extracted/logo-expo-horizontal.png"
                      alt="Logo oficial Proyecto Expo Agroalimentaria La Grita 2026"
                      className="h-12 w-auto object-contain rounded-[4px] bg-white px-2 py-1"
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-4">
                      <h3 className="font-display-wide text-scale-16 text-[#0F3D22]">
                        Visibilidad y Co-branding Digital
                      </h3>
                      <ul className="mt-2.5 space-y-2 text-scale-14 text-[#1F2421]/85">
                        <li>• Publicaciones exclusivas y cobertura continua en historias de Cenexpo y red de aliados.</li>
                        <li>• Flyer corporativo exclusivo y video promocional de invitación a tu stand.</li>
                        <li>• Inclusión de tu logo en videos oficiales y campañas de Ads (Instagram y Facebook).</li>
                      </ul>
                    </div>

                    <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-4">
                      <h3 className="font-display-wide text-scale-16 text-[#0F3D22]">
                        Presencia Comercial y Networking
                      </h3>
                      <ul className="mt-2.5 space-y-2 text-scale-14 text-[#1F2421]/85">
                        <li>• Ciclo de Conferencias: espacio de participación en ponencias técnicas y comerciales.</li>
                        <li>• Base de datos (Leads): entrega de contactos comerciales generados en la Expo.</li>
                        <li>• Acompañamiento integral antes, durante y después del evento + Show de Marcas.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href="/assets/aistudio/PABELLON_AGROALIENTARIO_97e33e5a.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-white px-4 py-2 text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white transition-colors"
                    >
                      Descargar Dossier Pabellón Agroalimentario (PDF)
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a
                      href="/assets/aistudio/PARTICIPACI_N_EXPOAUTO_dbbd22e8.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-4 py-2 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
                    >
                      Descargar Dossier Expoauto (PDF)
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-[12px] border border-[#1F4E9C]/30 bg-[#EEF2EF] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-scale-14 font-semibold text-[#1F4E9C]">
                        Área Automotriz y Maquinaria
                      </span>
                      <h3 className="font-display-wide text-scale-20 text-[#1F2421]">
                        Expoauto La Grita 2026
                      </h3>
                    </div>
                    <img
                      src="/assets/extracted/logo-expoauto.png"
                      alt="Logo oficial Expoauto La Grita 2026"
                      className="h-14 w-auto object-contain rounded-[4px] bg-white px-2 py-1"
                    />
                  </div>
                  <p className="mt-2 text-scale-14 text-[#1F2421]/85">
                    8 zonas exteriores de 100 m² a 170 m² frente al Casino Militar con Exposición Automotriz, Show de Marcas, entrevistas en vivo, actividades recreativas y música en vivo.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-[8px] border border-[#1F2421]/15">
                    <img
                      src="/assets/extracted/networking-real-photo.jpg"
                      alt="Mesas de negocios y atención comercial en el recinto"
                      className="h-40 w-full object-cover block"
                    />
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* SECTION 6: AGENDA */}
        <section
          id="agenda"
          aria-labelledby="agenda-heading"
          className="border-b border-[#1F2421]/15 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="agenda-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Agenda
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                Cronograma de conferencias técnicas, workshops, charlas y actividades en el Casino Militar de La Grita.
              </p>
            </div>

            {/* Required Tabs: "Vie 20", "Sáb 21", "Dom 22" */}
            <div
              role="tablist"
              aria-label="Días de la agenda"
              className="mt-6 inline-flex flex-wrap gap-2 rounded-[4px] border border-[#1F2421]/15 bg-white p-1.5"
            >
              {(
                [
                  { id: '2026-11-20', label: 'Vie 20' },
                  { id: '2026-11-21', label: 'Sáb 21' },
                  { id: '2026-11-22', label: 'Dom 22' },
                ] as const
              ).map((tab) => {
                const isActive = activeAgendaDay === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveAgendaDay(tab.id)}
                    className={`min-h-[42px] rounded-[4px] px-5 py-2 font-display-wide text-scale-16 tabular-nums transition-colors ${
                      isActive
                        ? 'bg-[#0F3D22] text-[#EEF2EF]'
                        : 'text-[#1F2421] hover:bg-[#EEF2EF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Agenda panel */}
            <div className="mt-4 rounded-[12px] border border-[#1F2421]/15 bg-white p-6 sm:p-8">
              {dayAgenda.length > 0 ? (
                <ul className="divide-y divide-[#1F2421]/10">
                  {dayAgenda.map((item) => (
                    <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                      <span className="font-mono text-scale-14 font-bold tabular-nums text-[#1E7A34]">
                        {item.starts_at} - {item.ends_at}
                      </span>
                      <h3 className="mt-1 font-display-wide text-scale-20 text-[#1F2421]">
                        {item.title}
                      </h3>
                      <p className="text-scale-14 text-[#1F2421]/80">
                        Ponente: {item.speaker} | Sala: {item.room}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <p className="font-display-wide text-scale-20 text-[#1F2421]">
                    La agenda se publica pronto.
                  </p>
                  <p className="mt-2 max-w-[62ch] text-scale-16 text-[#1F2421]/80">
                    El comité académico y Cenexpo C.A. están cerrando los horarios definitivos de ponencias, workshops y mesas técnicas para este día. Si ya obtuviste tu pase digital, recibirás el programa actualizado en tu WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 7: RUEDA DE NEGOCIOS */}
        <section
          id="rueda-de-negocios"
          aria-labelledby="rueda-heading"
          className="border-b border-[#1F2421]/15 bg-[#0F3D22] text-[#EEF2EF] py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-7">
                <h2
                  id="rueda-heading"
                  className="font-display-wide text-scale-31 sm:text-scale-39 text-white"
                >
                  Rueda de negocios
                </h2>
                <p className="mt-3 text-scale-16 text-[#EEF2EF]/90 max-w-[64ch]">
                  La Expo articula una ruta de trabajo en tres etapas para que las reuniones entre productores, proveedores de insumos, agroindustria, transporte y compradores mayoristas se conviertan en acuerdos comerciales sostenibles.
                </p>

                {/* Numbered work route sequence (1. Pre Expo, 2. Expo, 3. Post Expo) */}
                <ol className="mt-6 space-y-4">
                  {WORK_ROUTE_STEPS.map((w) => (
                    <li
                      key={w.step}
                      className="rounded-[12px] border border-[#EEF2EF]/15 bg-[#1E7A34]/20 p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display-wide text-scale-20 text-[#F4C20D]">
                          {w.step}. {w.phase}
                        </span>
                        <span className="text-scale-14 font-medium tabular-nums text-[#EEF2EF]/80">
                          {w.period}
                        </span>
                      </div>
                      <p className="mt-1.5 text-scale-16 text-[#EEF2EF]/90">{w.summary}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="lg:col-span-5 rounded-[12px] border border-[#EEF2EF]/20 bg-[#144A29] p-6">
                <h3 className="font-display-wide text-scale-25 text-white">
                  Inscripción de compradores y productores
                </h3>
                <p className="mt-2 text-scale-16 text-[#EEF2EF]/85">
                  Inscribe tu empresa compradora, finca productora o agroindustria para agendar reuniones comerciales en las mesas del Salón de Conferencias y en las 7 mesas redondas del Salón de Exposiciones.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setIsB2BModalOpen(true)}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[4px] bg-[#F4C20D] px-5 py-3 text-scale-16 font-bold text-[#1F2421] hover:bg-[#e5b408] transition-colors"
                  >
                    Inscribirme en la Rueda de Negocios
                  </button>
                  <a
                    href={buildWhatsAppBookingLink(
                      eventConfig.whatsapp_numbers[0],
                      'Hola equipo de Cenexpo, quiero participar en la Rueda de Negocios de la Expo Agroalimentaria La Grita 2026.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#EEF2EF]/40 px-5 py-2.5 text-scale-14 font-semibold text-[#EEF2EF] hover:bg-[#EEF2EF]/10 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    Consultar rueda de negocios por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: PRECIOS DE LA BOLSA (AgroMarket contained sub-brand: Space Grotesk + hexagonal motif) */}
        <section
          id="precios-bolsa"
          aria-labelledby="bolsa-heading"
          className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div
              className={`rounded-[12px] border-2 p-5 sm:p-8 transition-colors ${
                isBolsaLiveToday
                  ? 'border-[#1E7A34] bg-[#0F3D22]/5'
                  : 'border-[#0F3D22] bg-[#EEF2EF]'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-[66ch]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <img
                      src="/assets/aistudio/agromarket-post-blanco-simple_ab5a7228.png"
                      alt="Logo oficial AgroMarket"
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-[6px] border border-[#1E7A34]/30 object-cover bg-white shrink-0"
                    />
                    <span className="font-agromarket text-scale-16 font-bold text-[#0F3D22]">
                      AgroMarket · «El precio justo de tu cosecha»
                    </span>
                    {isBolsaLiveToday && (
                      <span
                        data-testid="bolsa-live-badge"
                        className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-2.5 py-0.5 font-agromarket text-scale-14 font-bold text-white"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#F4C20D]" aria-hidden="true" />
                        En vivo hoy · Domingo 22 Nov
                      </span>
                    )}
                  </div>

                  <h2
                    id="bolsa-heading"
                    className="mt-2 font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
                  >
                    Precios de la Bolsa Agrícola de La Grita
                  </h2>
                  <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                    AgroMarket publica cada domingo los precios oficiales de 57 rubros de la Bolsa Agrícola de La Grita en dólares (USD), bolívares (VES) y pesos colombianos (COP). El domingo 22 de noviembre, día de cierre de la Expo, los precios del día se transmitirán en vivo desde el recinto.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start shrink-0">
                  <button
                    type="button"
                    data-testid="toggle-bolsa-live"
                    onClick={() => setBolsaLiveOverride((prev) => !prev)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-[4px] px-3.5 py-2 font-agromarket text-scale-14 font-semibold transition-colors ${
                      isBolsaLiveToday
                        ? 'bg-[#1E7A34] text-white hover:bg-[#0F3D22]'
                        : 'border border-[#1E7A34] bg-white text-[#1E7A34] hover:bg-[#1E7A34] hover:text-white'
                    }`}
                  >
                    {isBolsaLiveToday
                      ? 'En vivo hoy: Dom 22 Nov (Activo)'
                      : 'Ver estado "En vivo hoy" (Dom 22 Nov)'}
                  </button>
                  <a
                    href="https://www.instagram.com/agromarket.ve/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#0F3D22] bg-white px-4 py-2 font-agromarket text-scale-14 font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Ver reporte completo en @agromarket.ve
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Sunday Nov 22 "En vivo hoy" Live Broadcast Banner */}
              {isBolsaLiveToday && (
                <div
                  data-testid="bolsa-live-panel"
                  className="mt-5 rounded-[8px] border border-[#1E7A34] bg-[#0F3D22] p-4 sm:p-5 text-[#EEF2EF]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[4px] bg-[#F4C20D] px-2 py-0.5 font-agromarket text-[12px] font-bold text-[#1F2421]">
                          TRANSMISIÓN EN VIVO HOY · DOMINGO 22 DE NOVIEMBRE DE 2026
                        </span>
                        <span className="font-mono text-[12px] text-[#EEF2EF]/80">
                          57 rubros · Corte dominical en directo desde la Tarima Show Bisnet
                        </span>
                      </div>
                      <p className="mt-1.5 font-agromarket text-scale-16 font-semibold text-white">
                        Pizarra de cotizaciones mayoristas en tiempo real desde el Casino Militar de La Grita
                      </p>
                      <p className="mt-0.5 text-scale-14 text-[#EEF2EF]/85">
                        Los precios reportados a continuación corresponden a la rueda dominical de cierre de la Expo en USD, VES y COP para despacho en centros de acopio del municipio Jáuregui.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prices Table */}
              <div className="mt-6 overflow-x-auto rounded-[8px] border border-[#1F2421]/15 bg-white">
                <table className="w-full text-left border-collapse font-agromarket">
                  <thead className="bg-[#0F3D22] text-[#EEF2EF] text-scale-14">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Rubro agrícola</th>
                      <th className="py-3.5 px-4 font-semibold">Unidad de carga</th>
                      <th className="py-3.5 px-4 font-semibold text-right">USD ($)</th>
                      <th className="py-3.5 px-4 font-semibold text-right">VES (Bs.)</th>
                      <th className="py-3.5 px-4 font-semibold text-right">COP (Pesos)</th>
                      {isBolsaLiveToday && (
                        <th className="py-3.5 px-4 font-semibold text-right">Estado en Rueda</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2421]/10 text-scale-16">
                    {bolsaPrices.map((row) => (
                      <tr key={row.id} className="hover:bg-[#EEF2EF]/60">
                        <td className="py-3.5 px-4 font-semibold text-[#1F2421]">
                          {row.item}
                          {row.is_sample && !isBolsaLiveToday && (
                            <span className="ml-2 text-[12px] font-normal text-[#1F2421]/65">
                              (Dato de muestra, editable en admin)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-scale-14 text-[#1F2421]/80">{row.unit}</td>
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[#0F3D22]">
                          ${row.price_usd.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-[#1F2421]">
                          Bs. {row.price_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-[#1F2421]/85">
                          ${row.price_cop.toLocaleString('es-CO')}
                        </td>
                        {isBolsaLiveToday && (
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#1E7A34]/15 px-2 py-0.5 text-[12px] font-bold text-[#1E7A34]">
                              Cotizando en vivo
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-scale-14 text-[#1F2421]/80">
                <p className="font-medium">
                  Fuente: Bolsa Agrícola de La Grita, publicado por AgroMarket
                </p>
                <p className="tabular-nums">
                  {isBolsaLiveToday
                    ? 'Transmisión activa: Domingo 22 de noviembre de 2026 desde el Casino Militar'
                    : 'Próxima publicación en vivo desde la Expo: Domingo 22 de noviembre de 2026'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: CÓMO LLEGAR */}
        <section
          id="como-llegar"
          aria-labelledby="como-llegar-heading"
          className="border-b border-[#1F2421]/15 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="como-llegar-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Cómo llegar
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                La Grita se encuentra a 1.440 metros de altitud en el corazón del municipio Jáuregui, conectada con Mérida, el Zulia, San Cristóbal, Los Llanos y la frontera con Colombia.
              </p>
            </div>

            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="h-[360px] rounded-[12px] border border-[#1F2421]/15 bg-white p-6 text-scale-16 text-[#1F2421]/75">
                    Cargando mapa interactivo de La Grita...
                  </div>
                }
              >
                <VenueLeafletMap
                  lat={eventConfig.venue_lat}
                  lng={eventConfig.venue_lng}
                  confirmedLodgingAllies={confirmedLodgingAllies}
                />
              </Suspense>
            </div>
          </div>
        </section>

        {/* SECTION 10: ANTESALA */}
        <section
          id="antesala"
          aria-labelledby="antesala-heading"
          className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <h2
                  id="antesala-heading"
                  className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
                >
                  Antesala
                </h2>
                <h3 className="mt-2 font-display-wide text-scale-20 text-[#0F3D22]">
                  1er Simposio Agrovisión 360°: Regeneración y Conectividad 5G
                </h3>
                <p className="mt-3 text-scale-16 text-[#1F2421]/85 max-w-[64ch]">
                  El viernes 30 de octubre de 2026 se celebró en el Centro de Ingenieros del Estado Táchira (San Cristóbal) la jornada académica preparatoria de la Expo, organizada por la SVIAA, el Colegio de Ingenieros de Venezuela, la Expo Agroalimentaria La Grita 2026 y Grupo CENEXPO.
                </p>
                <div className="mt-5">
                  <a
                    href="https://lanacionweb.com/regional/ingenieros-tachirenses-congregados-en-simposio-innovador/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-5 py-2.5 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
                  >
                    Leer reseña de prensa en Diario La Nación
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5">
                <OfficialPhotoCard
                  src="/assets/extracted/casino-interior-real.jpg"
                  alt="Fotografía real del Salón de Exposiciones del Casino Militar de La Grita"
                  badgeText="Foto Real · Casino Militar"
                  captionTitle="Salón de Exposiciones del Casino Militar de La Grita"
                  captionDetail="Vista interior real de la nave principal donde se ubican los 51 stands (01 al 51) y la tarima Show Bisnet."
                  aspectClass="aspect-[16/10]"
                />
              </div>
            </div>

            {/* Post-event Gallery: hidden until eventConfig.gallery_enabled is true */}
            {eventConfig.gallery_enabled && (
              <div
                id="galeria-post-evento"
                data-testid="post-event-gallery"
                className="mt-12 border-t border-[#1F2421]/15 pt-10"
              >
                <div className="max-w-[68ch]">
                  <span className="inline-block rounded-[4px] bg-[#1E7A34] px-2.5 py-0.5 text-[12px] font-bold text-white">
                    Memoria Visual · Edición 2026
                  </span>
                  <h3 className="mt-2 font-display-wide text-scale-25 text-[#1F2421]">
                    Galería Oficial Post-Evento
                  </h3>
                  <p className="mt-1 text-scale-16 text-[#1F2421]/80">
                    Registro fotográfico y material visual de la Expo Agroalimentaria La Grita 2026 en el Casino Militar.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {POST_EVENT_GALLERY_ITEMS.map((item) => (
                    <OfficialPhotoCard
                      key={item.id}
                      src={item.src}
                      alt={item.alt}
                      badgeText={item.badge}
                      captionTitle={item.title}
                      captionDetail={item.detail}
                      aspectClass="aspect-[4/3]"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 11: PREGUNTAS FRECUENTES */}
        <section
          id="preguntas-frecuentes"
          aria-labelledby="faq-heading"
          className="border-b border-[#1F2421]/15 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="faq-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Preguntas frecuentes
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                Respuestas claras sobre horarios, entradas, acceso al recinto y reserva de stands. Los puntos pendientes se actualizan directamente desde el panel de administración en cuanto Cenexpo los confirme.
              </p>
            </div>

            <div className="mt-6 max-w-[820px] space-y-3">
              {eventConfig.faq.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-[12px] border border-[#1F2421]/15 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex min-h-[54px] w-full items-center justify-between gap-4 px-5 py-4 text-left font-display-wide text-scale-16 sm:text-scale-20 text-[#1F2421] hover:bg-[#EEF2EF]/50 transition-colors"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#1E7A34] transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#1F2421]/10 px-5 py-4 text-scale-16 text-[#1F2421]/85">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 12: CONTACTO */}
        <section
          id="contacto"
          aria-labelledby="contacto-heading"
          className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="max-w-[68ch]">
              <h2
                id="contacto-heading"
                className="font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
              >
                Contacto
              </h2>
              <p className="mt-2 text-scale-16 text-[#1F2421]/85">
                Comunícate directo con el equipo de reservas de Cenexpo C.A. por cualquiera de sus tres líneas de WhatsApp (atención de lunes a viernes, de 9:00 a. m. a 4:00 p. m.) o síguenos en Instagram.
              </p>
            </div>

            {/* Three "Escribir por WhatsApp" buttons */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {eventConfig.whatsapp_numbers.map((phone, idx) => (
                <a
                  key={phone}
                  href={buildWhatsAppBookingLink(
                    phone,
                    'Hola equipo de Cenexpo, escribo desde la web de la Expo Agroalimentaria La Grita 2026 para solicitar información.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[56px] flex-col justify-center rounded-[12px] border border-[#1E7A34] bg-[#EEF2EF] px-5 py-4 text-left hover:bg-[#1E7A34] hover:text-white group transition-colors"
                >
                  <span className="flex items-center gap-2 font-display-wide text-scale-16 text-[#1E7A34] group-hover:text-white">
                    <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Escribir por WhatsApp ({idx + 1})
                  </span>
                  <span className="mt-1 font-mono text-scale-16 font-bold tabular-nums text-[#1F2421] group-hover:text-[#F4C20D]">
                    {phone}
                  </span>
                </a>
              ))}
            </div>

            {/* Official Instagram Links */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="https://www.instagram.com/cenexposc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-4 py-2 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
              >
                Instagram Organizador: @cenexposc
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://www.instagram.com/agromarket.ve/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-4 py-2 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
              >
                Instagram Aliado Digital: @agromarket.ve
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER (with Surcos contour motif behind footer only) */}
      <footer className="bg-[#0F3D22] bg-surcos-dark text-[#EEF2EF] py-12">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <OrganizaPresentaLockup variant="dark" />
              <p className="mt-4 max-w-[54ch] text-scale-14 text-[#EEF2EF]/80">
                La Grita, capital agroalimentaria de Venezuela. El gran encuentro agroalimentario de los Andes en el Casino Militar de La Grita, Municipio Jáuregui, Estado Táchira.
              </p>
            </div>

            <div className="text-left">
              <p className="font-display-wide text-scale-16 text-[#F4C20D]">
                Aliados e instituciones confirmadas
              </p>
              {confirmedExhibitors.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-3 text-scale-14 text-[#EEF2EF]/90">
                  {confirmedExhibitors.map((c) => (
                    <li key={c.id}>{c.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 max-w-[42ch] text-scale-14 text-[#EEF2EF]/75">
                  Las instituciones, patrocinadores y aliados se mostrarán aquí a medida que Cenexpo reconfirme su participación.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-[#EEF2EF]/15 pt-6 flex flex-wrap items-center justify-between gap-4 text-scale-14 text-[#EEF2EF]/75">
            <p>© 2026 Cenexpo C.A.</p>
            <div className="flex flex-wrap items-center gap-4">
              <p>Presentado en digital por AgroMarket (agromarket.com.ve)</p>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/admin');
                }}
                className="rounded-[4px] border border-[#EEF2EF]/25 px-2.5 py-1 text-[12px] font-semibold text-[#F4C20D] hover:bg-[#EEF2EF]/10"
              >
                Panel Admin (/admin)
              </a>
              <a
                href="/admin/checkin"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/admin/checkin');
                }}
                className="rounded-[4px] border border-[#EEF2EF]/25 px-2.5 py-1 text-[12px] font-semibold text-[#EEF2EF] hover:bg-[#EEF2EF]/10"
              >
                Check-in QR (/admin/checkin)
              </a>
              <PWAInstallButton />
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Action Bar (<= 15% viewport height, two buttons: "Obtener mi pase" and "Quiero un stand") */}
      <div
        role="region"
        aria-label="Acciones rápidas en móvil"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1F2421]/20 bg-[#EEF2EF]/95 px-3 py-2.5 shadow-lg backdrop-blur-sm md:hidden"
      >
        <div className="mx-auto grid max-w-[480px] grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsRegistrationOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-[#1E7A34] px-3 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22] whitespace-nowrap"
          >
            Obtener mi pase
          </button>
          <button
            type="button"
            onClick={() => {
              setInquiryStandCode('');
              setIsStandInquiryOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border-2 border-[#1F4E9C] bg-white px-3 py-2 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white whitespace-nowrap"
          >
            Quiero un stand
          </button>
        </div>
      </div>

      {/* Modals (lazy-loaded on demand) */}
      <Suspense fallback={null}>
        {isRegistrationOpen && (
          <RegistrationModal
            isOpen={isRegistrationOpen}
            onClose={() => setIsRegistrationOpen(false)}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {isStandInquiryOpen && (
          <StandInquiryModal
            isOpen={isStandInquiryOpen}
            initialStandCode={inquiryStandCode}
            stands={standsPublic}
            whatsappNumbers={eventConfig.whatsapp_numbers}
            onClose={() => setIsStandInquiryOpen(false)}
            onRequestCreated={(req) => {
              setSelectedStandCode(req.stand_code);
            }}
          />
        )}

        {isB2BModalOpen && (
          <B2BRegistrationModal
            isOpen={isB2BModalOpen}
            whatsappPrimary={eventConfig.whatsapp_numbers[0]}
            onClose={() => setIsB2BModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
