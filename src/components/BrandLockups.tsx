import React from 'react';
import { ExternalLink, MapPin, ShieldCheck, Sprout, Landmark, TrendingUp } from 'lucide-react';

interface LockupProps {
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Official Header Brand Emblem for Expo Agroalimentaria La Grita 2026
 * using the extracted official gear emblem from the Cenexpo PDF.
 */
export const ExpoOfficialLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <img
        src="/assets/extracted/logo-expo-gear.png"
        alt="Emblema oficial Expo Agroalimentaria La Grita 2026"
        width={44}
        height={44}
        decoding="async"
        className={
          compact
            ? 'h-8 w-8 rounded-[4px] object-contain shrink-0'
            : 'h-9 w-9 sm:h-11 sm:w-11 rounded-[6px] object-contain shrink-0'
        }
      />
      <div className="flex flex-col leading-none">
        <span className="font-display-wide text-[14px] sm:text-scale-20 text-[#0F3D22] tracking-tight">
          EXPO <span className="text-[#1E7A34]">LA GRITA 2026</span>
        </span>
        {!compact && (
          <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-[#1F2421]/75">
            Agroalimentaria · Casino Militar
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Organizer ("Organiza: Grupo CENEXPO"), Digital Partner ("Presenta: AgroMarket"),
 * Grand Sponsors ("Patrocinan: Banco Sofitasa & BISA Biotecnología"),
 * and Institutional Frame ("Semana Nacional de la Alimentación").
 */
export const OrganizaPresentaLockup: React.FC<LockupProps> = ({
  variant = 'light',
  className = '',
}) => {
  const isDark = variant === 'dark';
  const captionColor = isDark ? 'text-[#EEF2EF]/75' : 'text-[#1F2421]/70';
  const titleColor = isDark ? 'text-[#EEF2EF]' : 'text-[#1F2421]';

  return (
    <div className={`flex flex-wrap items-center gap-6 sm:gap-8 ${className}`}>
      {/* Organiza: Grupo CENEXPO */}
      <div className="flex flex-col items-start">
        <span className={`text-scale-14 font-medium ${captionColor}`}>Organiza y respalda</span>
        <div className="mt-1.5 flex items-center gap-3">
          <img
            src="/assets/extracted/logo-cenexpo-badge.png"
            alt="Logo oficial Grupo CENEXPO"
            width={80}
            height={40}
            decoding="async"
            className="h-10 w-auto rounded-[4px] border border-[#1F2421]/20 object-contain bg-[#1F2F25] px-1.5 py-0.5 shrink-0"
          />
          <div className="flex flex-col">
            <span className={`font-display-wide text-scale-16 leading-tight ${titleColor}`}>
              Grupo CENEXPO
            </span>
            <span className={`text-[12px] leading-tight ${captionColor}`}>
              Cenexpo C.A. · @cenexposc
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`h-10 w-px ${isDark ? 'bg-[#EEF2EF]/15' : 'bg-[#1F2421]/15'}`}
      />

      {/* Presenta en digital: AgroMarket (Official uploaded logo) */}
      <div className="flex flex-col items-start">
        <span className={`text-scale-14 font-medium ${captionColor}`}>Presenta en digital</span>
        <div className="mt-1.5 flex items-center gap-2.5">
          <img
            src="/assets/aistudio/agromarket-post-blanco-simple_ab5a7228.png"
            alt="Logo oficial AgroMarket · El precio justo de tu cosecha"
            width={44}
            height={44}
            decoding="async"
            className="h-10 w-10 rounded-[6px] border border-[#1E7A34]/30 object-cover bg-white shrink-0"
          />
          <div className="flex flex-col">
            <span
              className={`font-agromarket text-scale-16 font-bold tracking-tight leading-tight ${titleColor}`}
            >
              AgroMarket
            </span>
            <span className={`font-agromarket text-[12px] leading-tight ${captionColor}`}>
              El precio justo de tu cosecha · @agromarket.ve
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`hidden sm:block h-10 w-px ${isDark ? 'bg-[#EEF2EF]/15' : 'bg-[#1F2421]/15'}`}
      />

      {/* Patrocinadores Oficiales Principales: Banco Sofitasa & BISA Biotecnología */}
      <div className="flex flex-col items-start">
        <span className={`text-scale-14 font-medium ${captionColor}`}>
          Patrocinadores Oficiales Principales
        </span>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <img
              src="/assets/aistudio/foto_perfil_bancosofitasa_96c1e6f0.jpg"
              alt="Emblema oficial Banco Sofitasa"
              width={40}
              height={40}
              decoding="async"
              className="h-10 w-10 rounded-[6px] border border-[#1F4E9C]/40 object-cover bg-[#00174A] shrink-0"
            />
            <img
              src="/assets/aistudio/foto_perfil_bisa_ve_22ba21cd.jpg"
              alt="Emblema oficial BISA Biotecnología y Sostenibilidad Avanzada"
              width={40}
              height={40}
              decoding="async"
              className="h-10 w-10 rounded-[6px] border border-[#1E7A34]/40 object-cover bg-[#3C8C30] shrink-0"
            />
          </div>
          <div className="flex flex-col">
            <span className={`font-display-wide text-scale-14 leading-tight ${titleColor}`}>
              Banco Sofitasa · BISA Biotecnología
            </span>
            <span className={`text-[12px] leading-tight ${captionColor}`}>
              @bancosofitasa (Stand 01) · @bisa_ve (Stand 02)
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`hidden lg:block h-10 w-px ${isDark ? 'bg-[#EEF2EF]/15' : 'bg-[#1F2421]/15'}`}
      />

      {/* Marco Institucional: Semana Nacional de la Alimentación (Trompo Oficial) */}
      <div className="flex flex-col items-start">
        <span className={`text-scale-14 font-medium ${captionColor}`}>En el marco de</span>
        <div className="mt-1.5 flex items-center gap-2.5">
          <img
            src="/assets/extracted/logo-trompo-alimentacion.png"
            alt="Trompo de la Semana Nacional de la Alimentación en Venezuela"
            width={40}
            height={40}
            decoding="async"
            className="h-10 w-10 rounded-[4px] object-contain bg-white/90 p-0.5 shrink-0"
          />
          <div className="flex flex-col">
            <span className={`font-display-wide text-scale-14 leading-tight ${titleColor}`}>
              Semana Nacional de la Alimentación
            </span>
            <span className={`text-[12px] leading-tight ${captionColor}`}>
              450 años de La Grita (1576–2026)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface OfficialSponsorsShowcaseProps {
  onSelectStandInPlan: (standCode: string) => void;
}

/**
 * Prominent showcase section for the two Grand Official Sponsors:
 * 1. BISA · Biotecnología y Sostenibilidad Avanzada (@bisa_ve — Biocentro de Soluciones Agroecológicas, C.A.)
 * 2. Banco Sofitasa · Banco Universal (@bancosofitasa — "El Banco de los Andes")
 * alongside the Official Digital Presenter:
 * 3. AgroMarket (@agromarket.ve · agromarket.com.ve — "El precio justo de tu cosecha")
 */
export const OfficialSponsorsShowcase: React.FC<OfficialSponsorsShowcaseProps> = ({
  onSelectStandInPlan,
}) => {
  return (
    <section
      id="patrocinadores-oficiales"
      aria-labelledby="sponsors-heading"
      className="border-b border-[#1F2421]/15 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Top Co-Branding Header Row */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-[#1F2421]/15 pb-8">
          <div className="max-w-[68ch]">
            <div className="inline-flex items-center gap-2 rounded-[4px] bg-[#0F3D22] px-3 py-1 text-scale-14 font-semibold text-[#F4C20D]">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Gran Alianza Agroproductiva, Financiera y Tecnológica · La Grita 2026</span>
            </div>
            <h2
              id="sponsors-heading"
              className="mt-3 font-display-wide text-scale-31 sm:text-scale-39 text-[#1F2421]"
            >
              Patrocinadores Oficiales Principales y Presentador Digital
            </h2>
            <p className="mt-2 text-scale-16 text-[#1F2421]/85">
              Las dos grandes marcas líderes que impulsan la transformación productiva de los Andes venezolanos —<strong>BISA Biotecnología (@bisa_ve)</strong> y <strong>Banco Sofitasa (@bancosofitasa)</strong>— junto a <strong>AgroMarket (@agromarket.ve)</strong> como plataforma tecnológica presentadora oficial del evento.
            </p>
          </div>

          {/* Official Co-Branding Lockup Card: EXPO + CENEXPO + AGROMARKET */}
          <div className="shrink-0">
            <div className="overflow-hidden rounded-[12px] border-2 border-[#0F3D22]/20 bg-white p-2 shadow-sm max-w-[340px]">
              <img
                src="/assets/aistudio/Expo-Agroalimentaria-AgroMarket-Cenexpo_e3bdd377.png"
                alt="Lámina oficial de co-branding: Expo Agroalimentaria La Grita 2026 · Organiza Grupo CENEXPO · Presenta AgroMarket"
                width={320}
                height={320}
                loading="lazy"
                className="h-44 w-full object-contain rounded-[8px] bg-white"
              />
            </div>
          </div>
        </div>

        {/* Two Grand Official Sponsors Side-by-Side (The Biggest Cards on the Page) */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* GRAND SPONSOR 1: BISA BIOTECNOLOGÍA Y SOSTENIBILIDAD AVANZADA */}
          <article
            data-testid="sponsor-card-bisa"
            className="flex flex-col justify-between rounded-[12px] border-2 border-[#1E7A34] bg-[#EEF2EF]/65 p-6 sm:p-8 shadow-sm"
          >
            <div>
              {/* Sponsor Tier Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E7A34]/20 pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#1E7A34] px-3 py-1 text-scale-14 font-bold text-white">
                  <Sprout className="h-4 w-4 shrink-0" aria-hidden="true" />
                  PATROCINADOR OFICIAL PRINCIPAL
                </span>
                <span className="font-display-wide text-scale-16 tabular-nums text-[#0F3D22]">
                  Stand Flagship 02 · 7,50 m²
                </span>
              </div>

              {/* Dual Official BISA Logos Showcase */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center rounded-[10px] border border-[#1E7A34]/25 bg-white p-4">
                <div className="sm:col-span-8 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-08_at_5.49.41_PM_b52197a9.jpeg"
                    alt="Logo oficial BISA · Biotecnología y Sostenibilidad Avanzada"
                    width={320}
                    height={220}
                    loading="lazy"
                    className="max-h-36 w-auto object-contain rounded-[6px]"
                  />
                </div>
                <div className="sm:col-span-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-[#1F2421]/10 pt-3 sm:pt-0 sm:pl-4">
                  <img
                    src="/assets/aistudio/foto_perfil_bisa_ve_22ba21cd.jpg"
                    alt="Emblema corporativo BISA · Biocentro de Soluciones Agroecológicas, C.A."
                    width={110}
                    height={110}
                    loading="lazy"
                    className="h-24 w-24 rounded-[8px] object-cover border border-[#1E7A34]/30"
                  />
                  <span className="mt-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#1E7A34]">
                    @bisa_ve
                  </span>
                </div>
              </div>

              {/* Brand Identity & Researched Value Proposition */}
              <div className="mt-5">
                <p className="text-scale-14 font-semibold uppercase tracking-wider text-[#1E7A34]">
                  Biocentro de Soluciones Agroecológicas, C.A.
                </p>
                <h3 className="mt-1 font-display-wide text-scale-25 sm:text-scale-31 text-[#1F2421]">
                  BISA · Biotecnología y Sostenibilidad Avanzada
                </h3>
                <p className="mt-2.5 text-scale-16 text-[#1F2421]/90">
                  Empresa venezolana líder en innovación agrobiotecnológica y agricultura regenerativa. BISA desarrolla y transfiere soluciones biológicas de alta precisión para recuperar la fertilidad de los suelos andinos, proteger cultivos sin agrotóxicos residuales y elevar el rendimiento por hectárea en los valles altos de La Grita y el estado Táchira.
                </p>

                {/* 4 Researched Technical Pillars */}
                <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-scale-14">
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#0F3D22]">
                      1. Control Biológico Avanzado
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Manejo integrado de plagas y fitopatógenos mediante microorganismos benéficos y biocontroladores certificados.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#0F3D22]">
                      2. Regeneración de Suelos
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Restauración de la microbiota edáfica, biofertilizantes y enmiendas biológicas para producir más con menos insumos químicos.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#0F3D22]">
                      3. Paquetes Tecnológicos Kit BISA
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Protocolos integrales de nutrición y sanidad vegetal diseñados para papa, hortalizas de hoja y raíz, café y frutales.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#0F3D22]">
                      4. Asistencia Técnica en Campo
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Diagnóstico fitosanitario, acompañamiento directo al productor en finca y ponencias magistrales en la Expo.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* CTAs for BISA */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#1E7A34]/20 pt-4">
              <button
                type="button"
                onClick={() => onSelectStandInPlan('02')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-[#1E7A34] px-4 py-2.5 text-scale-14 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                Ubicar Stand 02 (BISA) en la Maqueta
              </button>
              <a
                href="https://www.instagram.com/bisa_ve/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] border border-[#1E7A34] bg-white px-4 py-2.5 text-scale-14 font-semibold text-[#1E7A34] hover:bg-[#1E7A34] hover:text-white transition-colors"
              >
                Instagram Oficial @bisa_ve
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </article>

          {/* GRAND SPONSOR 2: BANCO SOFITASA BANCO UNIVERSAL */}
          <article
            data-testid="sponsor-card-sofitasa"
            className="flex flex-col justify-between rounded-[12px] border-2 border-[#1F4E9C] bg-[#EDF3FB]/70 p-6 sm:p-8 shadow-sm"
          >
            <div>
              {/* Sponsor Tier Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F4E9C]/20 pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#1F4E9C] px-3 py-1 text-scale-14 font-bold text-white">
                  <Landmark className="h-4 w-4 shrink-0" aria-hidden="true" />
                  PATROCINADOR OFICIAL PRINCIPAL
                </span>
                <span className="font-display-wide text-scale-16 tabular-nums text-[#1F4E9C]">
                  Stand Flagship 01 · 7,50 m²
                </span>
              </div>

              {/* Dual Official Banco Sofitasa Logos Showcase */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center rounded-[10px] border border-[#1F4E9C]/25 bg-white p-4">
                <div className="sm:col-span-8 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/images_fe5e43fa.png"
                    alt="Logo oficial Banco Sofitasa · Banco Universal"
                    width={320}
                    height={220}
                    loading="lazy"
                    className="max-h-36 w-auto object-contain rounded-[6px]"
                  />
                </div>
                <div className="sm:col-span-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-[#1F2421]/10 pt-3 sm:pt-0 sm:pl-4">
                  <img
                    src="/assets/aistudio/foto_perfil_bancosofitasa_96c1e6f0.jpg"
                    alt="Emblema institucional Banco Sofitasa"
                    width={110}
                    height={110}
                    loading="lazy"
                    className="h-24 w-24 rounded-[8px] object-cover border border-[#1F4E9C]/30"
                  />
                  <span className="mt-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#1F4E9C]">
                    @bancosofitasa
                  </span>
                </div>
              </div>

              {/* Brand Identity & Researched Value Proposition */}
              <div className="mt-5">
                <p className="text-scale-14 font-semibold uppercase tracking-wider text-[#1F4E9C]">
                  El Banco de los Andes · Corazón Financiero del Táchira
                </p>
                <h3 className="mt-1 font-display-wide text-scale-25 sm:text-scale-31 text-[#1F2421]">
                  Banco Sofitasa · Banco Universal
                </h3>
                <p className="mt-2.5 text-scale-16 text-[#1F2421]/90">
                  Institución financiera insignia de los Andes venezolanos, fundada en el estado Táchira con más de tres décadas impulsando el desarrollo agropecuario, agroindustrial y comercial de la región. En la Expo Agroalimentaria La Grita 2026, Banco Sofitasa brinda atención directa a productores, ferieros y empresarios en la Rueda de Negocios.
                </p>

                {/* 4 Researched Financial Pillars */}
                <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-scale-14">
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#1F4E9C]">
                      1. Cartera Única Productiva Agrícola
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Programas de financiamiento para siembra, cosecha, adquisición de bioinsumos, semillas certificadas y fertilizantes.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#1F4E9C]">
                      2. Crédito para Maquinaria y Flota
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Apoyo financiero para renovación de camiones de carga, sistemas de riego, equipamiento de frío y tractores en Expoauto.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#1F4E9C]">
                      3. Medios de Pago y Banca Digital
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Puntos de venta inalámbricos, Sofitasa Móvil, Pago Móvil Interbancario y cuentas en divisas para liquidación inmediata.
                    </dd>
                  </div>
                  <div className="rounded-[8px] border border-[#1F2421]/10 bg-white p-3.5">
                    <dt className="font-display-wide text-[#1F4E9C]">
                      4. Alianza con Gremios Andinos
                    </dt>
                    <dd className="mt-1 text-[#1F2421]/80">
                      Respaldo histórico a las asociaciones de productores del municipio Jáuregui, Apropatáchira y ferieros de La Grita.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* CTAs for Banco Sofitasa */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#1F4E9C]/20 pt-4">
              <button
                type="button"
                onClick={() => onSelectStandInPlan('01')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-[#1F4E9C] px-4 py-2.5 text-scale-14 font-semibold text-white hover:bg-[#153875] transition-colors"
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                Ubicar Stand 01 (Banco Sofitasa) en la Maqueta
              </button>
              <a
                href="https://www.instagram.com/bancosofitasa/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-4 py-2.5 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
              >
                Instagram Oficial @bancosofitasa
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </article>
        </div>

        {/* FULL-WIDTH OFFICIAL DIGITAL PRESENTER BANNER: AGROMARKET */}
        <article
          data-testid="sponsor-card-agromarket"
          className="mt-8 rounded-[12px] border-2 border-[#0F3D22] bg-[#0F3D22] p-6 sm:p-8 text-[#EEF2EF] shadow-sm"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#F4C20D] px-3 py-1 font-agromarket text-scale-14 font-bold text-[#1F2421]">
                  <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                  PRESENTADOR DIGITAL OFICIAL · ALIADO TECNOLÓGICO
                </span>
                <span className="font-display-wide text-scale-14 text-[#F4C20D]">
                  Stand Flagship 03 · 7,50 m²
                </span>
              </div>

              <h3 className="mt-3 font-agromarket text-scale-25 sm:text-scale-31 font-bold text-white">
                AgroMarket · «El precio justo de tu cosecha»
              </h3>

              <p className="mt-2.5 text-scale-16 text-[#EEF2EF]/90 max-w-[64ch]">
                Plataforma digital y aplicación móvil nacida en La Grita, estado Táchira, que digitaliza el comercio agroalimentario venezolano. Cada domingo publica el boletín oficial de precios de los <strong>57 rubros de la Bolsa Agrícola de La Grita</strong> en dólares (USD), bolívares (VES) y pesos colombianos (COP), conectando directamente a productores, compradores mayoristas y transportistas con <strong>0 % de comisiones de intermediación</strong>.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 font-agromarket text-scale-14">
                <div className="rounded-[8px] border border-[#EEF2EF]/15 bg-[#144A29] p-3.5">
                  <p className="font-bold text-[#F4C20D]">57 Rubros Oficiales</p>
                  <p className="mt-1 text-[13px] text-[#EEF2EF]/85">
                    Cotizaciones reales de papa, zanahoria, cebolla, tomate, repollo y hortalizas cada domingo.
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#EEF2EF]/15 bg-[#144A29] p-3.5">
                  <p className="font-bold text-[#F4C20D]">Triple Moneda (USD/VES/COP)</p>
                  <p className="mt-1 text-[13px] text-[#EEF2EF]/85">
                    Transparencia cambiaria para el productor andino, el feriero y el comprador nacional.
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#EEF2EF]/15 bg-[#144A29] p-3.5">
                  <p className="font-bold text-[#F4C20D]">Transmisión Dom 22 Nov</p>
                  <p className="mt-1 text-[13px] text-[#EEF2EF]/85">
                    Corte dominical de la Bolsa Agrícola en vivo desde la tarima Show Bisnet en el cierre de la Expo.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStandInPlan('03')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-[#F4C20D] px-4 py-2.5 font-agromarket text-scale-14 font-bold text-[#1F2421] hover:bg-[#e5b408] transition-colors"
                >
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Ubicar Stand 03 (AgroMarket) en la Maqueta
                </button>
                <a
                  href="#precios-bolsa"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-[#EEF2EF]/40 bg-[#144A29] px-4 py-2.5 font-agromarket text-scale-14 font-semibold text-white hover:bg-[#1E7A34] transition-colors"
                >
                  Ver Pizarra de Precios de la Bolsa
                </a>
                <a
                  href="https://www.instagram.com/agromarket.ve/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/30 px-4 py-2.5 font-agromarket text-scale-14 font-semibold text-[#EEF2EF] hover:bg-[#EEF2EF]/10 transition-colors"
                >
                  @agromarket.ve
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Right 5 columns: Uploaded Official AgroMarket Visual Assets Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-[10px] border border-[#EEF2EF]/20 bg-white p-1.5">
                <img
                  src="/assets/aistudio/agromarket-post-fondo-blanco_48acda2e.png"
                  alt="AgroMarket · Bolsa Agrícola de La Grita · El precio justo de tu cosecha"
                  width={260}
                  height={260}
                  loading="lazy"
                  className="w-full h-auto rounded-[6px] object-contain"
                />
              </div>
              <div className="overflow-hidden rounded-[10px] border border-[#EEF2EF]/20 bg-[#071F10] p-1.5">
                <img
                  src="/assets/aistudio/agromarket-post-oscuro-precios_114dca28.png"
                  alt="AgroMarket · Precios Oficiales cada domingo (Papa, Tomate, Repollo, Zanahoria)"
                  width={260}
                  height={260}
                  loading="lazy"
                  className="w-full h-auto rounded-[6px] object-contain"
                />
              </div>
              <div className="col-span-2 overflow-hidden rounded-[10px] border border-[#EEF2EF]/20 bg-white p-1.5">
                <img
                  src="/assets/aistudio/vista-previa_b7ae9af0.png"
                  alt="Sistema de identidad visual oficial de AgroMarket"
                  width={520}
                  height={240}
                  loading="lazy"
                  className="w-full h-28 object-cover rounded-[6px]"
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

interface OfficialPhotoProps {
  src: string;
  alt: string;
  captionTitle: string;
  captionDetail?: string;
  badgeText?: string;
  aspectClass?: string;
  className?: string;
}

/**
 * Displays real photographs and official planimetry renders extracted from the
 * Cenexpo C.A. master documents and flyers.
 */
export const OfficialPhotoCard: React.FC<OfficialPhotoProps> = ({
  src,
  alt,
  captionTitle,
  captionDetail,
  badgeText,
  aspectClass = 'aspect-[16/10]',
  className = '',
}) => {
  return (
    <figure
      className={`overflow-hidden rounded-[12px] border border-[#1F2421]/20 bg-white shadow-sm ${className}`}
    >
      <div className={`relative w-full overflow-hidden bg-[#0F3D22] ${aspectClass}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {badgeText && (
          <span className="absolute left-3 top-3 rounded-[4px] bg-[#0F3D22]/90 px-2.5 py-1 text-[12px] font-semibold text-[#F4C20D] border border-[#F4C20D]/40">
            {badgeText}
          </span>
        )}
      </div>
      <figcaption className="border-t border-[#1F2421]/10 bg-white p-3.5 sm:p-4">
        <p className="font-display-wide text-scale-14 sm:text-scale-16 text-[#1F2421]">
          {captionTitle}
        </p>
        {captionDetail && (
          <p className="mt-0.5 text-[13px] text-[#1F2421]/75">{captionDetail}</p>
        )}
      </figcaption>
    </figure>
  );
};
