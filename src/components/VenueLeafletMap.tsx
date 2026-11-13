import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, BedDouble } from 'lucide-react';
import { ROAD_ROUTES, ExhibitorRecord } from '../data/seed';

interface VenueLeafletMapProps {
  lat: number;
  lng: number;
  confirmedLodgingAllies: ExhibitorRecord[];
}

export const VenueLeafletMap: React.FC<VenueLeafletMapProps> = ({
  lat,
  lng,
  confirmedLodgingAllies,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-expo-pin',
      html: `<div style="background-color:#1E7A34;color:#FFFFFF;border:3px solid #F4C20D;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.35);">EX</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    marker.bindPopup(
      `<strong>Casino Militar de La Grita</strong><br/>Frente a la Vía Llano Los Zambranos, Municipio Jáuregui, Táchira.<br/><em>Pin provisional en el centro de La Grita (${lat.toFixed(4)}, ${lng.toFixed(4)})</em>`
    );

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left column: Leaflet Map + Venue facts */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="overflow-hidden rounded-[12px] border border-[#1F2421]/15 bg-white">
          <div
            ref={mapContainerRef}
            className="h-[340px] sm:h-[400px] w-full z-0"
            aria-label="Mapa de ubicación en La Grita, Municipio Jáuregui, Estado Táchira"
          />
          <div className="border-t border-[#1F2421]/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display-wide text-scale-20 text-[#1F2421]">
                  Casino Militar de La Grita
                </h3>
                <p className="mt-1 text-scale-14 text-[#1F2421]/85">
                  Nombre formal: <strong>Hotel Club Casino Militar Edgar Reyes Zumeta</strong>. Frente a la Vía Llano Los Zambranos, La Grita, municipio Jáuregui, Táchira, Venezuela.
                </p>
                <p className="mt-1.5 text-scale-14 text-[#1F2421]/75 tabular-nums">
                  Altitud: 1.440 m s. n. m., a 85 km de San Cristóbal. Pin actual: {lat.toFixed(4)}, {lng.toFixed(4)} (centro de La Grita, ajustable desde el panel admin).
                </p>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#1F4E9C] px-4 py-2 text-scale-14 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Abrir en OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: 4 Road Routes + Dónde dormir */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[#1E7A34]" aria-hidden="true" />
            <h3 className="font-display-wide text-scale-20 text-[#1F2421]">
              Rutas terrestres de acceso
            </h3>
          </div>
          <ul className="mt-4 space-y-3.5 divide-y divide-[#1F2421]/10">
            {ROAD_ROUTES.map((r) => (
              <li key={r.id} className="pt-3 first:pt-0">
                <p className="font-display-wide text-scale-16 text-[#0F3D22]">{r.origin}</p>
                <p className="mt-0.5 text-scale-14 text-[#1F2421]/85">{r.route}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Dónde dormir: lists confirmed lodging allies only */}
        <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-[#1E7A34]" aria-hidden="true" />
            <h3 className="font-display-wide text-scale-20 text-[#1F2421]">
              Dónde dormir en La Grita
            </h3>
          </div>

          {confirmedLodgingAllies.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {confirmedLodgingAllies.map((ally) => (
                <li
                  key={ally.id}
                  className="rounded-[4px] border border-[#1F2421]/15 bg-[#EEF2EF] p-3 text-scale-14"
                >
                  <p className="font-semibold text-[#1F2421]">{ally.name}</p>
                  <p className="text-[#1F2421]/75">{ally.description}</p>
                  {ally.instagram && (
                    <a
                      href={`https://www.instagram.com/${ally.instagram.replace('@', '')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-semibold text-[#1F4E9C] underline"
                    >
                      {ally.instagram}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-[4px] border border-[#1F2421]/10 bg-[#EEF2EF] p-4">
              <p className="text-scale-14 text-[#1F2421]">
                Los aliados de alojamiento confirmados aparecerán aquí en cuanto Cenexpo valide su participación para las fechas de noviembre.
              </p>
              <p className="mt-1.5 text-[13px] text-[#1F2421]/70">
                El propio Hotel Club Casino Militar Edgar Reyes Zumeta es sede del evento. Para recomendaciones de posadas en el municipio Jáuregui, escríbele al equipo organizador en la sección de Contacto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
