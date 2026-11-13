import React, { useState } from 'react';
import { ZoneRecord } from '../data/seed';

interface ZonesMiniPlanProps {
  zones: ZoneRecord[];
}

export const ZonesMiniPlan: React.FC<ZonesMiniPlanProps> = ({ zones }) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'zone-exposicion');

  const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const zoneImageMap: Record<string, { src: string; caption: string }> = {
    'zone-exposicion': {
      src: '/assets/extracted/casino-interior-real.jpg',
      caption: 'Fotografía real de la nave del Salón de Exposiciones (38,0 × 21,5 m · 51 stands + Show Bisnet)',
    },
    'zone-conferencias': {
      src: '/assets/extracted/pabellon_page_4.jpg',
      caption: 'Plano General: Salón de Conferencias y Área de Rueda de Negocios en el edificio principal',
    },
    'zone-automotriz': {
      src: '/assets/extracted/casino-exterior-maqueta.jpg',
      caption: 'Maqueta 3D del Área de Festival Automotriz (Expoauto La Grita 2026) con sus 8 zonas numeradas',
    },
    'zone-acceso': {
      src: '/assets/extracted/casino-exterior-maqueta.jpg',
      caption: 'Entrada y salida única del Casino Militar frente a la Calle Vía Llano Los Zambranos',
    },
    'zone-agroecologico': {
      src: '/assets/extracted/flyer-abre-los-brazos.jpg',
      caption: 'Modelos agroproductivos sostenibles frente al recinto de la Expo en La Grita',
    },
  };

  const currentMedia = activeZone ? zoneImageMap[activeZone.id] : zoneImageMap['zone-exposicion'];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left: Interactive SVG Mini Plan matching Page 4 "PLANO GENERAL" */}
      <div className="lg:col-span-7 rounded-[12px] border border-[#1F2421]/15 bg-white p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-display-wide text-scale-16 text-[#1F2421]">
            Plano General Oficial · El Casino Militar de La Grita
          </span>
          <span className="text-scale-14 text-[#1F2421]/70">
            Toca una zona en el esquema o en la lista
          </span>
        </div>

        <svg
          viewBox="0 0 490 475"
          className="w-full h-auto rounded-[8px] border border-[#1F2421]/10 bg-[#EEF2EF]"
          role="img"
          aria-label="Esquema interactivo de las 5 zonas del Plano General del Casino Militar de La Grita"
        >
          {/* Casino Militar perimeter box (above the road) */}
          <rect
            x="10"
            y="10"
            width="470"
            height="318"
            rx="6"
            fill="#F7F9F7"
            stroke="#1F2421"
            strokeOpacity="0.25"
            strokeDasharray="5 4"
          />
          <text x="22" y="34" fill="#0F3D22" fontSize="12" fontWeight="800">
            SEDE OFICIAL: CASINO MILITAR DE LA GRITA
          </text>

          {/* Road strip: Calle Vía Llano Los Zambranos */}
          <rect x="0" y="332" width="490" height="28" fill="#C7D1CA" />
          <line
            x1="0"
            y1="346"
            x2="490"
            y2="346"
            stroke="#1F2421"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="8 6"
          />
          <text x="245" y="350" textAnchor="middle" fill="#1F2421" fontSize="11.5" fontWeight="800">
            CALLE VÍA LLANO LOS ZAMBRANOS
          </text>

          {/* Render the 5 interactive zones matching the diagonal & stacked layout of Page 4 */}
          {zones.map((zone) => {
            const isSelected = zone.id === activeZone?.id;
            const { x, y, width, height } = zone.geometry;

            // Default fill matching the official Plano General colors (Yellow for Conferencias, Grey/White for Exposición & Automotriz)
            const baseFill =
              zone.kind === 'conferencias'
                ? '#FCE38A'
                : zone.kind === 'automotriz'
                ? '#E2E7EB'
                : zone.kind === 'agroecologico'
                ? '#D6EAD8'
                : '#EBEFF2';

            return (
              <g
                key={zone.id}
                role="button"
                tabIndex={0}
                aria-label={zone.name}
                onClick={() => setSelectedZoneId(zone.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedZoneId(zone.id);
                  }
                }}
                className="cursor-pointer"
              >
                {zone.kind === 'automotriz' ? (
                  /* Sloped polygon matching "ÁREA FESTIVAL AUTOMOTRIZ" in Page 4 Plano General */
                  <polygon
                    points={`${x},${y + 70} ${x + width},${y} ${x + width},${y + height} ${x},${y + height}`}
                    fill={isSelected ? '#1E7A34' : baseFill}
                    stroke={isSelected ? '#0F3D22' : '#1F2421'}
                    strokeWidth={isSelected ? '3' : '1.5'}
                  />
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="4"
                    fill={isSelected ? '#1E7A34' : baseFill}
                    stroke={isSelected ? '#0F3D22' : '#1F2421'}
                    strokeWidth={isSelected ? '3' : '1.5'}
                  />
                )}

                {/* Sub-details inside Salón de Exposición (51 stands + Show Bisnet) */}
                {zone.kind === 'exposicion' && (
                  <g opacity={isSelected ? 0.32 : 0.25}>
                    <rect x={x + 12} y={y + 12} width={125} height={14} fill={isSelected ? '#EEF2EF' : '#1995A2'} />
                    <rect x={x + 24} y={y + 38} width={100} height={24} fill={isSelected ? '#EEF2EF' : '#1995A2'} />
                    <rect x={x + 24} y={y + 74} width={100} height={24} fill={isSelected ? '#EEF2EF' : '#1995A2'} />
                    <rect x={x + 12} y={y + 128} width={115} height={18} fill={isSelected ? '#EEF2EF' : '#F5B7B8'} />
                    <rect x={x + 168} y={y + 12} width={36} height={134} fill={isSelected ? '#EEF2EF' : '#F3DBD3'} />
                  </g>
                )}

                {/* Blue connector bar between Entrada and Salón de Conferencias */}
                {zone.kind === 'conferencias' && (
                  <rect
                    x={x + width / 2 - 35}
                    y={y + height - 6}
                    width={70}
                    height={6}
                    fill="#1F4E9C"
                  />
                )}

                <text
                  x={x + width / 2}
                  y={zone.kind === 'automotriz' ? y + height / 2 + 16 : y + height / 2 - 4}
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : '#1F2421'}
                  fontSize="12"
                  fontWeight="800"
                >
                  {zone.name}
                </text>
                <text
                  x={x + width / 2}
                  y={zone.kind === 'automotriz' ? y + height / 2 + 33 : y + height / 2 + 13}
                  textAnchor="middle"
                  fill={isSelected ? '#F4C20D' : '#0F3D22'}
                  fontSize="10.5"
                  fontWeight="700"
                >
                  {zone.stats}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 rounded-[4px] border border-[#1F2421]/15 bg-[#EEF2EF] px-3.5 py-2.5 text-scale-14 text-[#1F2421]">
          <span className="font-semibold text-[#0F3D22]">Recorrido oficial del recinto:</span>{' '}
          Calle Vía Llano Los Zambranos → Entrada Casino Militar → Área Festival Automotriz (8 zonas) → Salón de Conferencias / Rueda de Negocios → Salón de Exposición (51 stands + Show Bisnet).
        </div>
      </div>

      {/* Right: Interactive Zone Selector buttons + Highlighted Zone Description & Real Photo */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2" role="tablist" aria-label="Seleccionar zona del plano">
          {zones.map((zone) => {
            const isSelected = zone.id === activeZone?.id;
            return (
              <button
                key={zone.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`flex min-h-[52px] w-full flex-col items-start justify-center rounded-[12px] border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'border-[#0F3D22] bg-[#0F3D22] text-[#EEF2EF]'
                    : 'border-[#1F2421]/15 bg-white text-[#1F2421] hover:border-[#1E7A34]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-display-wide text-scale-16">{zone.name}</span>
                  <span
                    className={`text-scale-14 font-medium ${
                      isSelected ? 'text-[#F4C20D]' : 'text-[#1E7A34]'
                    }`}
                  >
                    {isSelected ? 'Activa' : 'Ver'}
                  </span>
                </div>
                <span
                  className={`mt-0.5 text-scale-14 ${
                    isSelected ? 'text-[#EEF2EF]/80' : 'text-[#1F2421]/70'
                  }`}
                >
                  {zone.stats}
                </span>
              </button>
            );
          })}
        </div>

        {activeZone && (
          <div
            aria-live="polite"
            className="overflow-hidden rounded-[12px] border border-[#1E7A34]/30 bg-white shadow-sm"
          >
            {currentMedia && (
              <div className="border-b border-[#1F2421]/10 bg-[#0F3D22]">
                <img
                  src={currentMedia.src}
                  alt={currentMedia.caption}
                  className="h-44 w-full object-cover block"
                />
              </div>
            )}
            <div className="p-5">
              <span className="text-scale-14 font-semibold text-[#1E7A34]">
                Detalle y medidas de la zona seleccionada
              </span>
              <h3 className="mt-1 font-display-wide text-scale-20 sm:text-scale-25 text-[#1F2421]">
                {activeZone.name}
              </h3>
              <p className="mt-2 text-scale-14 sm:text-scale-16 text-[#1F2421]/90 leading-relaxed">
                {activeZone.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
