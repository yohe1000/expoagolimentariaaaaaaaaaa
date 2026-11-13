/**
 * OFFICIAL VENUE DIMENSIONS & PLANIMETRY (Units: meters & m²)
 * Source of truth: Official Cenexpo C.A. PDFs:
 * 1. "PABELLON AGROALIENTARIO.pdf" (Pages 4 & 5: Plano General & Planimetría del Salón de Exposiciones)
 * 2. "PARTICIPACIÓN EXPOAUTO.pdf" (Pages 4 & 5: Vista General & Planimetría e Inversión por Espacio)
 */

export const VENUE_DIMENSIONS = {
  // 1. Salón de Exposiciones (Nave principal posterior del Casino Militar)
  HALL_W: 38.0, // meters total horizontal length (25m stands zone + 6.5m round tables lounge + 6.5m SHOW BISNET)
  HALL_L: 21.5, // meters total vertical width (from top wall z=0 to bottom wall z=21.5)
  HALL_H: 6.5,  // meters interior height to ceiling/trusses
  HALL_TOTAL_AREA_M2: 817.0, // 38.0m x 21.5m

  // Main entrance/exit door on the left wall (between island 17 and stand 01)
  ENTRANCE_DOOR_Z: 16.5,
  ENTRANCE_DOOR_WIDTH: 3.0,

  // Stand Type 1: Rosado (Pared inferior de entrada, stands 01 al 09)
  ROSADO_FRONT: 2.5, // meters wide
  ROSADO_DEPTH: 3.0, // meters deep
  ROSADO_AREA_M2: 7.5, // 2,5 x 3 = 7,50 m²
  ROSADO_PRICE_USD: 480, // $480 Tasa BCV€

  // Stand Type 2: Turquesa (Islas centrales y pared superior, stands 10 al 51)
  TURQUESA_FRONT: 2.5, // meters wide
  TURQUESA_DEPTH: 2.0, // meters deep
  TURQUESA_AREA_M2: 5.0, // 2,5 x 2 = 5,00 m²
  TURQUESA_PRICE_USD: 400, // $400 Tasa BCV€

  STAND_HEIGHT: 2.4, // meters standard partition height

  // Interior Aisles (Salón de Exposiciones)
  AISLE_LEFT_W: 2.5,      // Left access corridor (x = 0 to 2.5m)
  AISLE_TOP_W: 2.5,       // Top aisle between row 51-42 and island 34-41 (z = 2.0 to 4.5m)
  AISLE_CENTER_W: 2.0,    // Central aisle between island 33-26 and island 25-18 (z = 8.5 to 10.5m)
  AISLE_SOUTH_W: 4.0,     // Main entrance aisle between island 17-10 and row 01-09 (z = 14.5 to 18.5m)

  // Networking Round Tables Zone (7 tables x 6 chairs = 42 seats)
  ROUND_TABLES_ZONE: {
    xMin: 25.0,
    xMax: 31.5,
    zMin: 0.5,
    zMax: 18.5,
    width: 6.5,
    length: 18.0,
    areaM2: 117.0,
    tablesCount: 7,
    chairsPerTable: 6,
  },

  // SHOW BISNET Stage (Right side of the Exhibition Hall)
  SHOW_BISNET: {
    xMin: 31.5,
    xMax: 38.0,
    zMin: 0.0,
    zMax: 18.5,
    width: 6.5,
    length: 18.5,
    areaM2: 120.25,
  },

  // 2. Salón de Conferencias y Área de Rueda de Negocios (3-story main Casino building)
  CONF_HALL: {
    width: 22.0,
    length: 18.0,
    areaM2: 396.0,
    porchWidth: 6.0,
    porchDepth: 5.0,
    floors: 3,
  },

  // 3. Área Festival Automotriz - Expoauto La Grita 2026 (8 numbered vehicle zones)
  EXPOAUTO: {
    totalExhibitionAreaM2: 990,
    totalLotWidth: 68.0,
    totalLotDepth: 32.0,
    zonesCount: 8,
  },
} as const;

export type StandType =
  | 'turquesa'
  | 'rosado'
  | 'expoauto_100'
  | 'expoauto_110'
  | 'expoauto_140'
  | 'expoauto_170';

export type StandStatus = 'disponible' | 'reservado' | 'vendido' | 'bloqueado';
export type StandFacing = '+z' | '-z' | '+x' | '-x';

export interface StandRecord {
  id: string;
  code: string;
  zone_id: 'zone-exposicion' | 'zone-automotriz';
  x: number;
  z: number;
  width: number;  // span along horizontal axis (meters)
  depth: number;  // span along vertical axis (meters)
  area_m2: number; // official area in m²
  rotation: number;
  facing: StandFacing;
  type: StandType;
  price_usd: number;
  location_label: string;
  status: StandStatus;
  hold_until: string | null;
  exhibitor_id: string | null;
}

export const STAND_TYPE_META: Record<
  StandType,
  {
    label: string;
    shortLabel: string;
    color: string;
    dimensionsLabel: string;
    areaM2: number;
    priceUsd: number;
    officialNote: string;
  }
> = {
  rosado: {
    label: 'Salón Exposición · Tipo Rosado (7,50 m²)',
    shortLabel: 'Rosado 7,50 m² ($480)',
    color: '#F5B7B8',
    dimensionsLabel: '2,50 m × 3,00 m = 7,50 m²',
    areaM2: 7.5,
    priceUsd: 480,
    officialNote: 'Pared inferior de entrada (Stands 01 al 09) · $480 a Tasa BCV€',
  },
  turquesa: {
    label: 'Salón Exposición · Tipo Turquesa (5,00 m²)',
    shortLabel: 'Turquesa 5,00 m² ($400)',
    color: '#1995A2',
    dimensionsLabel: '2,50 m × 2,00 m = 5,00 m²',
    areaM2: 5.0,
    priceUsd: 400,
    officialNote: 'Islas dobles centrales y pared superior (Stands 10 al 51) · $400 a Tasa BCV€',
  },
  expoauto_100: {
    label: 'Expoauto · Verde Claro (100 m²)',
    shortLabel: 'Expoauto 100 m² ($1.600)',
    color: '#CBE8CC',
    dimensionsLabel: '10,0 m × 10,0 m = 100 m²',
    areaM2: 100,
    priceUsd: 1600,
    officialNote: 'Frente a Calle Vía Llano Los Zambranos (Zonas 2, 3, 4 y 5) · $1.600 a Tasa BCV',
  },
  expoauto_110: {
    label: 'Expoauto · Rosado (110 m²)',
    shortLabel: 'Expoauto 110 m² ($1.750)',
    color: '#F8CECC',
    dimensionsLabel: '10,0 m × 11,0 m = 110 m²',
    areaM2: 110,
    priceUsd: 1750,
    officialNote: 'Sector diagonal superior izquierdo (Zona 6) · $1.750 a Tasa BCV',
  },
  expoauto_140: {
    label: 'Expoauto · Naranja (140 m²)',
    shortLabel: 'Expoauto 140 m² ($1.950)',
    color: '#F7A464',
    dimensionsLabel: '10,0 m × 14,0 m = 140 m²',
    areaM2: 140,
    priceUsd: 1950,
    officialNote: 'Sector diagonal central (Zona 7) · $1.950 a Tasa BCV',
  },
  expoauto_170: {
    label: 'Expoauto · Celeste (170 m²)',
    shortLabel: 'Expoauto 170 m² ($2.100)',
    color: '#84CEF2',
    dimensionsLabel: '10,0 m × 17,0 m = 170 m²',
    areaM2: 170,
    priceUsd: 2100,
    officialNote: 'Zonas amplias junto al edificio principal (Zonas 1 y 8) · $2.100 a Tasa BCV',
  },
};

export const STAND_STATUS_META: Record<
  StandStatus,
  { label: string; color: string; bgTint: string; borderTint: string; iconName: 'check' | 'clock' | 'lock' | 'slash' }
> = {
  disponible: {
    label: 'Disponible',
    color: '#2F9E44',
    bgTint: '#EBF7EE',
    borderTint: '#2F9E44',
    iconName: 'check',
  },
  reservado: {
    label: 'Reservado (48 h)',
    color: '#E8A317',
    bgTint: '#FDF6E7',
    borderTint: '#E8A317',
    iconName: 'clock',
  },
  vendido: {
    label: 'Vendido',
    color: '#B23A2E',
    bgTint: '#FBECEB',
    borderTint: '#B23A2E',
    iconName: 'lock',
  },
  bloqueado: {
    label: 'Bloqueado',
    color: '#9AA59F',
    bgTint: '#F1F3F2',
    borderTint: '#9AA59F',
    iconName: 'slash',
  },
};

/**
 * Generates the exact 51 stands of the Salón de Exposiciones (01 to 51)
 * plus the 8 official vehicle exhibition spaces of Expoauto (EA-01 to EA-08)
 * matching the exact pattern and numbering in the Cenexpo PDFs.
 */
export function generateInitialStands(): StandRecord[] {
  const stands: StandRecord[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');

  // ---------------------------------------------------------------------------
  // A. SALÓN DE EXPOSICIONES: 51 STANDS (Codes "01" through "51")
  // Coordinate system: x from 0 to 38.0 m (left to right), z from 0 to 21.5 m (top to bottom)
  // ---------------------------------------------------------------------------

  // 1. Bottom Wall Row: Stands 01 to 09 (Left to Right, Rosado 2.5m x 3.0m = 7.50 m², $480)
  // Flagship entrance stands 01, 02, and 03 are assigned to the confirmed Grand Official Sponsors & Digital Presenter
  const flagshipSponsorsByCode: Record<string, string> = {
    '01': 'org-sofitasa',
    '02': 'org-bisa',
    '03': 'org-agromarket',
  };
  for (let i = 1; i <= 9; i++) {
    const code = pad(i);
    const x = (i - 1) * 2.5; // x from 0.0 to 20.0 (total span 22.5m)
    const sponsorId = flagshipSponsorsByCode[code] ?? null;
    stands.push({
      id: `stand-${code}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 18.5, // bottom wall z = 18.5 to 21.5 (depth 3.0m)
      width: 2.5,
      depth: 3.0,
      area_m2: 7.5,
      rotation: 0,
      facing: '-z', // faces up toward the main entrance aisle
      type: 'rosado',
      price_usd: 480,
      location_label: 'Pared inferior de entrada (Salón de Exposiciones)',
      status: sponsorId ? 'vendido' : 'disponible',
      hold_until: null,
      exhibitor_id: sponsorId,
    });
  }

  // 2. Lower Double Island (Isla B) - Bottom Row: 8 stands from left to right
  // Position 5 in Isla B (N° 14 in PDF) carries code "B05" so both the Casino Militar 51-stand pattern
  // and the B05 stand request / admin confirmation workflow operate on the exact same planimetry.
  const lowerIslandBottomRow = ['17', '16', '15', 'B05', '13', '12', '11', '10'];
  lowerIslandBottomRow.forEach((rawCode, idx) => {
    const code = rawCode;
    const x = 2.5 + idx * 2.5; // x from 2.5 to 20.0 (total span 20.0m, ends at x=22.5)
    stands.push({
      id: `stand-${code.toLowerCase()}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 12.5, // z from 12.5 to 14.5
      width: 2.5,
      depth: 2.0,
      area_m2: 5.0,
      rotation: Math.PI,
      facing: '+z', // faces down toward stands 01–09
      type: 'turquesa',
      price_usd: 400,
      location_label:
        code === 'B05'
          ? 'Isla central B · Fila sur (Stand B05 / N° 14 · Salón de Exposiciones)'
          : 'Isla central B · Fila sur (Salón de Exposiciones)',
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // 3. Lower Double Island - Top Row: Stands 25 down to 18 (Left to Right: 25, 24, 23, 22, 21, 20, 19, 18)
  const lowerIslandTopRow = [25, 24, 23, 22, 21, 20, 19, 18];
  lowerIslandTopRow.forEach((num, idx) => {
    const code = pad(num);
    const x = 2.5 + idx * 2.5;
    stands.push({
      id: `stand-${code}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 10.5, // z from 10.5 to 12.5
      width: 2.5,
      depth: 2.0,
      area_m2: 5.0,
      rotation: 0,
      facing: '-z', // faces up toward central aisle
      type: 'turquesa',
      price_usd: 400,
      location_label: 'Isla central inferior · Fila norte (Salón de Exposiciones)',
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // 4. Upper Double Island - Bottom Row: Stands 33 down to 26 (Left to Right: 33, 32, 31, 30, 29, 28, 27, 26)
  const upperIslandBottomRow = [33, 32, 31, 30, 29, 28, 27, 26];
  upperIslandBottomRow.forEach((num, idx) => {
    const code = pad(num);
    const x = 2.5 + idx * 2.5;
    stands.push({
      id: `stand-${code}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 6.5, // z from 6.5 to 8.5
      width: 2.5,
      depth: 2.0,
      area_m2: 5.0,
      rotation: Math.PI,
      facing: '+z', // faces down toward central aisle
      type: 'turquesa',
      price_usd: 400,
      location_label: 'Isla central superior · Fila sur (Salón de Exposiciones)',
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // 5. Upper Double Island - Top Row: Stands 34 up to 41 (Left to Right: 34, 35, 36, 37, 38, 39, 40, 41)
  const upperIslandTopRow = [34, 35, 36, 37, 38, 39, 40, 41];
  upperIslandTopRow.forEach((num, idx) => {
    const code = pad(num);
    const x = 2.5 + idx * 2.5;
    stands.push({
      id: `stand-${code}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 4.5, // z from 4.5 to 6.5
      width: 2.5,
      depth: 2.0,
      area_m2: 5.0,
      rotation: 0,
      facing: '-z', // faces up toward top aisle
      type: 'turquesa',
      price_usd: 400,
      location_label: 'Isla central superior · Fila norte (Salón de Exposiciones)',
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // 6. Top Wall Row: Stands 51 down to 42 (Left to Right: 51, 50, 49, 48, 47, 46, 45, 44, 43, 42)
  const topWallRow = [51, 50, 49, 48, 47, 46, 45, 44, 43, 42];
  topWallRow.forEach((num, idx) => {
    const code = pad(num);
    const x = idx * 2.5; // x from 0.0 to 22.5 (total span 25.0m)
    stands.push({
      id: `stand-${code}`,
      code,
      zone_id: 'zone-exposicion',
      x,
      z: 0.0, // z from 0.0 to 2.0 along top wall
      width: 2.5,
      depth: 2.0,
      area_m2: 5.0,
      rotation: Math.PI,
      facing: '+z', // faces down toward top aisle
      type: 'turquesa',
      price_usd: 400,
      location_label: 'Pared superior norte (Salón de Exposiciones)',
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // ---------------------------------------------------------------------------
  // B. ÁREA FESTIVAL AUTOMOTRIZ - EXPOAUTO: 8 ZONAS (Codes "EA-01" through "EA-08")
  // ---------------------------------------------------------------------------
  const expoautoSpecs: Array<{
    num: number;
    type: StandType;
    area_m2: number;
    price_usd: number;
    x: number;
    z: number;
    width: number;
    depth: number;
    location_label: string;
  }> = [
    {
      num: 1,
      type: 'expoauto_170',
      area_m2: 170,
      price_usd: 2100,
      x: 52,
      z: 16,
      width: 14,
      depth: 12,
      location_label: 'Expoauto Zona 1 · Derecha de Entrada Principal (170 m²)',
    },
    {
      num: 2,
      type: 'expoauto_100',
      area_m2: 100,
      price_usd: 1600,
      x: 27,
      z: 18,
      width: 9,
      depth: 10,
      location_label: 'Expoauto Zona 2 · Frente a Vía Llano Los Zambranos (100 m²)',
    },
    {
      num: 3,
      type: 'expoauto_100',
      area_m2: 100,
      price_usd: 1600,
      x: 18,
      z: 18,
      width: 9,
      depth: 10,
      location_label: 'Expoauto Zona 3 · Frente a Vía Llano Los Zambranos (100 m²)',
    },
    {
      num: 4,
      type: 'expoauto_100',
      area_m2: 100,
      price_usd: 1600,
      x: 9,
      z: 18,
      width: 9,
      depth: 10,
      location_label: 'Expoauto Zona 4 · Frente a Vía Llano Los Zambranos (100 m²)',
    },
    {
      num: 5,
      type: 'expoauto_100',
      area_m2: 100,
      price_usd: 1600,
      x: 0,
      z: 18,
      width: 9,
      depth: 10,
      location_label: 'Expoauto Zona 5 · Extremo izquierdo frontal (100 m²)',
    },
    {
      num: 6,
      type: 'expoauto_110',
      area_m2: 110,
      price_usd: 1750,
      x: 0,
      z: 6,
      width: 12,
      depth: 9,
      location_label: 'Expoauto Zona 6 · Perímetro superior izquierdo (110 m²)',
    },
    {
      num: 7,
      type: 'expoauto_140',
      area_m2: 140,
      price_usd: 1950,
      x: 12,
      z: 4,
      width: 11,
      depth: 11,
      location_label: 'Expoauto Zona 7 · Perímetro superior central (140 m²)',
    },
    {
      num: 8,
      type: 'expoauto_170',
      area_m2: 170,
      price_usd: 2100,
      x: 23,
      z: 2,
      width: 11,
      depth: 13,
      location_label: 'Expoauto Zona 8 · Junto al Salón de Conferencias (170 m²)',
    },
  ];

  expoautoSpecs.forEach((sp) => {
    const code = `EA-0${sp.num}`;
    stands.push({
      id: `stand-ea-0${sp.num}`,
      code,
      zone_id: 'zone-automotriz',
      x: sp.x,
      z: sp.z,
      width: sp.width,
      depth: sp.depth,
      area_m2: sp.area_m2,
      rotation: 0,
      facing: '+z',
      type: sp.type,
      price_usd: sp.price_usd,
      location_label: sp.location_label,
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    });
  });

  // Sort stands so 01..51 come in numerical order followed by EA-01..EA-08
  return stands.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/**
 * View `stands_public` logic:
 * Hides price_usd unless show_prices is true, and returns the effective status
 * (a "reservado" stand whose hold_until has passed reads as "disponible").
 */
export function getEffectiveStandStatus(stand: StandRecord, nowMs: number = Date.now()): StandStatus {
  if (stand.status === 'reservado' && stand.hold_until) {
    const holdTime = new Date(stand.hold_until).getTime();
    if (!Number.isNaN(holdTime) && holdTime <= nowMs) {
      return 'disponible';
    }
  }
  return stand.status;
}
