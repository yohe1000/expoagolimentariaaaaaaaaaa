import React, { useState } from 'react';
import { Box, Camera, Layers } from 'lucide-react';

interface MaquetteHeroStillProps {
  onExploreClick: () => void;
}

/**
 * Hero Maquette Card featuring:
 * 1. Official 3D Exterior Maquette of the Casino Militar de La Grita + 8 Expoauto zones (from the Cenexpo PDF)
 * 2. Real Interior Photograph of the Salón de Exposiciones of the Casino Militar
 * 3. Architectural Axonometric Diagram of the 51 interior stands + Show Bisnet
 */
export const MaquetteHeroStill: React.FC<MaquetteHeroStillProps> = ({ onExploreClick }) => {
  const [activeTab, setActiveTab] = useState<'exterior' | 'interior' | 'isometric'>('exterior');

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-[#1F2421]/25 bg-[#0F3D22] text-[#EEF2EF] shadow-md">
      {/* Top tab selector inside the maquette card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF]/15 bg-[#0A2917] px-3.5 py-2.5">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#F4C20D]">
          Sede Oficial · Casino Militar
        </span>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Vistas del Casino Militar">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'exterior'}
            onClick={() => setActiveTab('exterior')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              activeTab === 'exterior'
                ? 'bg-[#F4C20D] text-[#1F2421]'
                : 'bg-[#EEF2EF]/10 text-[#EEF2EF] hover:bg-[#EEF2EF]/20'
            }`}
          >
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
            Maqueta Exterior
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'interior'}
            onClick={() => setActiveTab('interior')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              activeTab === 'interior'
                ? 'bg-[#F4C20D] text-[#1F2421]'
                : 'bg-[#EEF2EF]/10 text-[#EEF2EF] hover:bg-[#EEF2EF]/20'
            }`}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            Salón Real
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'isometric'}
            onClick={() => setActiveTab('isometric')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              activeTab === 'isometric'
                ? 'bg-[#F4C20D] text-[#1F2421]'
                : 'bg-[#EEF2EF]/10 text-[#EEF2EF] hover:bg-[#EEF2EF]/20'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Esquema 3D
          </button>
        </div>
      </div>

      {/* Viewport with orchestrated slow camera push */}
      <div className="relative overflow-hidden bg-[#0A2917]">
        {activeTab === 'exterior' && (
          <div className="animate-maquette-push relative">
            <img
              src="/assets/extracted/casino-exterior-maqueta.jpg"
              alt="Maqueta 3D oficial del Casino Militar de La Grita mostrando el edificio principal de 3 niveles, la entrada única y las 8 zonas de Expoauto"
              width={800}
              height={500}
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto block object-cover aspect-[16/10]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A2917]/90 via-[#0A2917]/35 to-transparent p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="rounded-[4px] bg-[#0F3D22]/90 px-2.5 py-1 font-semibold text-[#EEF2EF] border border-[#EEF2EF]/20">
                  Edificio Principal (Conferencias 396 m²) + Salón Posterior (817 m²)
                </span>
                <span className="rounded-[4px] bg-[#1F4E9C]/95 px-2.5 py-1 font-semibold text-white">
                  Expoauto: 8 Zonas (100 a 170 m²)
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interior' && (
          <div className="relative">
            <img
              src="/assets/extracted/casino-interior-real.jpg"
              alt="Fotografía real del interior del Salón de Exposiciones del Casino Militar de La Grita con tarima al fondo y columnas laterales"
              className="w-full h-auto block object-cover aspect-[16/10]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A2917]/90 via-[#0A2917]/40 to-transparent p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="rounded-[4px] bg-[#0F3D22]/90 px-2.5 py-1 font-semibold text-[#F4C20D] border border-[#F4C20D]/40">
                  Foto real: Nave del Salón de Exposiciones (38,0 × 21,5 m)
                </span>
                <span className="rounded-[4px] bg-[#1995A2]/95 px-2.5 py-1 font-semibold text-white">
                  51 Stands + 7 Mesas + Tarima Show Bisnet
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'isometric' && (
          <svg
            viewBox="0 0 800 500"
            className="w-full h-auto block aspect-[16/10]"
            role="img"
            aria-label="Esquema axonométrico con las medidas exactas del Casino Militar: Salón de Exposición de 38 por 21,5 m con 51 stands, Salón de Conferencias y 8 zonas de Expoauto"
          >
            <defs>
              <linearGradient id="skyFog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A2917" />
                <stop offset="60%" stopColor="#144D2B" />
                <stop offset="100%" stopColor="#1A5C35" />
              </linearGradient>
            </defs>
            <rect width="800" height="500" fill="url(#skyFog)" />

            {/* Andean mountain ridge */}
            <polygon
              points="0,130 130,65 260,115 410,55 560,110 700,60 800,105 800,190 0,190"
              fill="#0F3D22"
              opacity="0.85"
            />

            {/* Ground plane */}
            <polygon
              points="35,295 450,130 775,265 360,445"
              fill="#DCE4DF"
              stroke="#EEF2EF"
              strokeWidth="1.5"
            />

            {/* 1. Salón de Exposiciones (Rear hall: 38.0m x 21.5m = 817 m², 51 stands + Show Bisnet) */}
            <g>
              <polygon
                points="350,205 535,132 725,212 540,286"
                fill="#F5F7F5"
                stroke="#0F3D22"
                strokeWidth="2"
              />
              {/* Top row 51-42 (Turquesa 2.5x2m) */}
              <polygon points="365,202 485,155 498,161 378,208" fill="#1995A2" stroke="#0F3D22" strokeWidth="1" />
              {/* Upper double island 34-41 / 33-26 (Turquesa) */}
              <polygon points="392,216 498,174 518,183 412,225" fill="#1995A2" stroke="#0F3D22" strokeWidth="1" />
              {/* Lower double island 25-18 / 17-10 (Turquesa) */}
              <polygon points="424,232 530,190 550,199 444,241" fill="#1995A2" stroke="#0F3D22" strokeWidth="1" />
              {/* Bottom entrance wall 01-09 (Rosado 2.5x3m) */}
              <polygon points="455,252 572,206 588,213 471,259" fill="#F5B7B8" stroke="#0F3D22" strokeWidth="1" />
              {/* SHOW BISNET Stage on right */}
              <polygon points="525,146 565,136 698,192 658,208" fill="#F3D6CE" stroke="#0F3D22" strokeWidth="1.2" />

              <rect x="465" y="102" width="248" height="24" rx="3" fill="#0F3D22" stroke="#F4C20D" strokeWidth="1.2" />
              <text x="589" y="118" textAnchor="middle" fill="#EEF2EF" fontSize="11" fontWeight="700">
                1. SALÓN EXPOSICIÓN (38×21,5 m · 51 STANDS)
              </text>
            </g>

            {/* 2. Salón de Conferencias / Edificio 3 Niveles (22.0m x 18.0m) */}
            <g>
              <polygon
                points="265,242 350,206 535,284 450,320"
                fill="#FCE38A"
                stroke="#0F3D22"
                strokeWidth="2"
              />
              <text x="400" y="268" textAnchor="middle" fill="#0F3D22" fontSize="11" fontWeight="800">
                2. CONFERENCIAS Y RUEDA (22×18 m)
              </text>
            </g>

            {/* 3. Área Festival Automotriz Expoauto (8 zones: 100m² to 170m²) */}
            <g>
              <polygon
                points="65,302 255,222 340,260 150,342"
                fill="#CBE8CC"
                stroke="#1F4E9C"
                strokeWidth="1.8"
              />
              {/* Sloped top zones 6 (110m²), 7 (140m²), 8 (170m²) */}
              <polygon points="95,288 155,263 185,276 125,301" fill="#F8CECC" stroke="#0F3D22" strokeWidth="1" />
              <polygon points="155,263 215,238 245,251 185,276" fill="#F7A464" stroke="#0F3D22" strokeWidth="1" />
              <polygon points="215,238 275,213 305,226 245,251" fill="#84CEF2" stroke="#0F3D22" strokeWidth="1" />
              {/* Zone 1 (170m²) on right of entrance */}
              <polygon points="385,322 445,296 495,318 435,344" fill="#84CEF2" stroke="#0F3D22" strokeWidth="1.2" />

              <rect x="62" y="205" width="215" height="24" rx="3" fill="#1F4E9C" />
              <text x="169" y="221" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700">
                3. EXPOAUTO (8 ZONAS · 990 m²)
              </text>
            </g>

            {/* 4. Entrada Casino Militar + Calle Vía Llano Los Zambranos */}
            <g>
              <rect x="260" y="330" width="165" height="22" rx="3" fill="#F4C20D" stroke="#0F3D22" strokeWidth="1.5" />
              <text x="342" y="345" textAnchor="middle" fill="#1F2421" fontSize="10.5" fontWeight="800">
                4. ENTRADA CASINO MILITAR
              </text>
            </g>
          </svg>
        )}
      </div>

      {/* Quick Measurements Summary Strip */}
      <div className="grid grid-cols-3 divide-x divide-[#EEF2EF]/15 border-t border-[#EEF2EF]/15 bg-[#0A2917]/90 text-center">
        <div className="px-2 py-2.5">
          <p className="font-display-wide text-scale-16 text-[#F4C20D] tabular-nums">51 Stands</p>
          <p className="text-[11px] text-[#EEF2EF]/80">7,50 m² ($480) y 5 m² ($400)</p>
        </div>
        <div className="px-2 py-2.5">
          <p className="font-display-wide text-scale-16 text-[#F4C20D] tabular-nums">8 Zonas Auto</p>
          <p className="text-[11px] text-[#EEF2EF]/80">100 m² a 170 m² ($1.600–$2.100)</p>
        </div>
        <div className="px-2 py-2.5">
          <p className="font-display-wide text-scale-16 text-[#F4C20D] tabular-nums">38 × 21,5 m</p>
          <p className="text-[11px] text-[#EEF2EF]/80">Salón Exposición + Show Bisnet</p>
        </div>
      </div>

      {/* Bottom CTA bar inside the maquette card */}
      <div className="flex flex-col gap-3 border-t border-[#EEF2EF]/15 bg-[#0F3D22] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display-wide text-scale-14 sm:text-scale-16 text-[#EEF2EF]">
            Planimetría oficial de El Casino Militar de La Grita
          </p>
        </div>
        <button
          type="button"
          onClick={onExploreClick}
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#F4C20D] px-5 py-2.5 text-scale-16 font-bold text-[#1F2421] hover:bg-[#e5b408] transition-colors whitespace-nowrap"
        >
          <Box className="h-5 w-5 text-[#1F2421]" aria-hidden="true" />
          Explorar la maqueta 3D
        </button>
      </div>
    </div>
  );
};
