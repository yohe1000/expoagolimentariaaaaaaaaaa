import { generateInitialStands, StandRecord } from '../config/venue';

export interface EventConfig {
  start_date: string;
  end_date: string;
  hours_text: string;
  entry_text: string;
  date_confirmed: boolean;
  show_prices: boolean;
  venue_lat: number;
  venue_lng: number;
  whatsapp_numbers: string[];
  faq: Array<{ id: string; question: string; answer: string }>;
  gallery_enabled: boolean;
}

export type ZoneKind = 'exposicion' | 'conferencias' | 'automotriz' | 'acceso' | 'agroecologico';

export interface ZoneRecord {
  id: string;
  slug: string;
  name: string;
  kind: ZoneKind;
  description: string;
  stats: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type ExhibitorLevel = 'patrocinador' | 'institucional' | 'aliado' | 'expositor';
export type ExhibitorStatus = 'por_reconfirmar' | 'confirmado' | 'retirado';

export interface ExhibitorRecord {
  id: string;
  name: string;
  level: ExhibitorLevel;
  sector: string;
  description: string;
  logo_url: string | null;
  instagram: string | null;
  whatsapp: string | null;
  stand_code: string | null;
  status: ExhibitorStatus;
}

export interface BolsaPriceRecord {
  id: string;
  item: string;
  unit: string;
  price_usd: number;
  price_ves: number;
  price_cop: number;
  report_date: string;
  is_sample: boolean;
}

export interface AgendaItemRecord {
  id: string;
  day: '2026-11-20' | '2026-11-21' | '2026-11-22';
  starts_at: string;
  ends_at: string;
  title: string;
  speaker: string;
  room: string;
}

export interface VisitorRecord {
  id: string;
  name: string;
  whatsapp: string;
  municipality: string;
  profile: string;
  interests: string[];
  consent: boolean;
  qr_token: string;
  utm_source: string | null;
  heard_from: string;
  checked_in_at: string | null;
  created_at: string;
}

export const INITIAL_EVENT_CONFIG: EventConfig = {
  start_date: '2026-11-20',
  end_date: '2026-11-22',
  hours_text: 'Horario por confirmar',
  entry_text: 'Por confirmar',
  date_confirmed: true,  // Confirmed in official Cenexpo flyer ("FECHAS CONFIRMADAS: 20 al 22 Noviembre")
  show_prices: true,     // Official prices published in Pabellón Agroalimentario & Expoauto PDFs (Tasa BCV)
  venue_lat: 8.1330,     // Default town center pin until exact venue pin is set in admin
  venue_lng: -71.9830,
  whatsapp_numbers: ['+58 414 7589270', '+58 414 7130598', '+58 424 7100779'],
  faq: [
    {
      id: 'faq-horario',
      question: '¿Cuál es el horario de apertura y cierre de la Expo?',
      answer: 'Por confirmar. Los horarios oficiales de apertura al público para el viernes 20, sábado 21 y domingo 22 de noviembre se publicarán en cuanto Cenexpo los confirme.',
    },
    {
      id: 'faq-entrada',
      question: '¿La entrada tiene costo o es gratuita?',
      answer: 'Por confirmar. Puedes registrarte desde ya sin costo en esta web para obtener tu pase digital con código QR y agilizar tu ingreso en la puerta.',
    },
    {
      id: 'faq-estacionamiento',
      question: '¿Hay estacionamiento disponible en el Casino Militar?',
      answer: 'Por confirmar. El recinto se ubica frente a la Vía Llano Los Zambranos y cuenta con áreas exteriores; los detalles de estacionamiento para visitantes se anunciarán próximamente.',
    },
    {
      id: 'faq-accesibilidad',
      question: '¿Cómo es el acceso y recorrido dentro del recinto?',
      answer: 'Según el Plano General oficial del Casino Militar, existe un acceso único frente a la Calle Vía Llano Los Zambranos que conecta con el Área de Festival Automotriz (8 zonas), el Salón de Conferencias / Rueda de Negocios y el Salón de Exposiciones (51 stands + Show Bisnet).',
    },
    {
      id: 'faq-stand',
      question: '¿Cuáles son las medidas y costos oficiales de los stands y zonas de Expoauto?',
      answer: 'En el Salón de Exposiciones hay 51 stands: 9 stands Tipo Rosado de 2,5 × 3,0 m (7,50 m²) por $480 y 42 stands Tipo Turquesa de 2,5 × 2,0 m (5,00 m²) por $400 (Tasa BCV€). En el área exterior de Expoauto hay 8 zonas desde 100 m² ($1.600) hasta 170 m² ($2.100) a Tasa BCV.',
    },
  ],
  gallery_enabled: false, // Hidden until gallery_enabled is set to true in /admin
};

export const INITIAL_ZONES: ZoneRecord[] = [
  {
    id: 'zone-exposicion',
    slug: 'salon-exposicion',
    name: '1. Salón de exposición',
    kind: 'exposicion',
    stats: '38,0 × 21,5 m (817 m²) · 51 stands + Show Bisnet',
    description:
      'Nave principal techada del Casino Militar con 51 stands numerados (01 al 51): 9 stands rosados de 2,5 × 3,0 m (7,50 m², $480) en la pared de entrada y 42 stands turquesa de 2,5 × 2,0 m (5,00 m², $400) en dos islas dobles centrales (10–41) y la pared superior (42–51), además de 7 mesas de negocios y la tarima SHOW BISNET.',
    geometry: { x: 255, y: 18, width: 215, height: 155 },
  },
  {
    id: 'zone-conferencias',
    slug: 'salon-conferencias',
    name: '2. Salón de conferencias y rueda de negocios',
    kind: 'conferencias',
    stats: '22,0 × 18,0 m (396 m²) · Edificio principal',
    description:
      'Ubicado en el edificio principal de 3 niveles del Casino Militar. Conecta directamente la entrada principal con el Salón de Exposiciones y alberga las ponencias técnicas, charlas magistrales y el Área de Rueda de Negocios.',
    geometry: { x: 255, y: 178, width: 215, height: 95 },
  },
  {
    id: 'zone-automotriz',
    slug: 'festival-automotriz',
    name: '3. Área del festival automotriz (Expoauto)',
    kind: 'automotriz',
    stats: '990 m² netos · 8 zonas de 100 m² a 170 m²',
    description:
      'Explanada exterior de Expoauto La Grita 2026 con 8 espacios numerados a Tasa BCV: Zonas 2, 3, 4 y 5 de 100 m² ($1.600 c/u) al frente; Zona 6 de 110 m² ($1.750); Zona 7 de 140 m² ($1.950); y Zonas 1 y 8 de 170 m² ($2.100 c/u) para camiones, tractores y maquinaria.',
    geometry: { x: 18, y: 110, width: 230, height: 195 },
  },
  {
    id: 'zone-acceso',
    slug: 'entrada-salida',
    name: '4. Entrada y salida Casino Militar',
    kind: 'acceso',
    stats: 'Acceso único desde Calle Vía Llano Los Zambranos',
    description:
      'Pórtico y acceso único peatonal y vehicular frente a la Calle Vía Llano Los Zambranos, situado entre las Zonas 1 y 2 de Expoauto y frente a la marquesina del Salón de Conferencias.',
    geometry: { x: 255, y: 278, width: 215, height: 42 },
  },
  {
    id: 'zone-agroecologico',
    slug: 'salon-agroecologico',
    name: '5. Salón agroecológico',
    kind: 'agroecologico',
    stats: 'Al otro lado de la vía · Toldos y muestras vivas',
    description:
      'Espacio complementario frente al Casino Militar cruzando la Vía Llano Los Zambranos, dedicado a prácticas regenerativas, bioinsumos y muestras de productores andinos.',
    geometry: { x: 145, y: 368, width: 325, height: 86 },
  },
];

/**
 * Official Grand Sponsors & Digital Presenter (confirmed with official brand assets and flagship stands 01–03)
 * plus the remaining organizations announced earlier in 2026 seeded in "por_reconfirmar".
 */
export const INITIAL_EXHIBITORS: ExhibitorRecord[] = [
  // 1. Grand Official Sponsors & Digital Presenter (Confirmed)
  {
    id: 'org-sofitasa',
    name: 'Banco Sofitasa · Banco Universal',
    level: 'patrocinador',
    sector: 'Banca Universal y Financiamiento Agropecuario',
    description:
      'Patrocinador Oficial Principal ("El Banco de los Andes"). Institución financiera líder del Táchira con Cartera Única Productiva Agrícola, créditos de capital de trabajo, financiamiento de maquinaria y soluciones de pago inmediato para productores, ferieros y agroindustrias de La Grita.',
    logo_url: '/assets/aistudio/images_fe5e43fa.png',
    instagram: '@bancosofitasa',
    whatsapp: '+58 414 7589270',
    stand_code: '01',
    status: 'confirmado',
  },
  {
    id: 'org-bisa',
    name: 'BISA · Biotecnología y Sostenibilidad Avanzada',
    level: 'patrocinador',
    sector: 'Biotecnología Agrícola y Soluciones Agroecológicas',
    description:
      'Patrocinador Oficial Principal (Biocentro de Soluciones Agroecológicas, C.A.). Especialistas en bioinsumos de alta eficacia, control biológico de plagas y enfermedades, regeneración microbiológica de suelos y paquetes tecnológicos Kit BISA para cultivos andinos de papa, hortalizas, café y frutales.',
    logo_url: '/assets/aistudio/WhatsApp_Image_2026-11-08_at_5.49.41_PM_b52197a9.jpeg',
    instagram: '@bisa_ve',
    whatsapp: '+58 414 7130598',
    stand_code: '02',
    status: 'confirmado',
  },
  {
    id: 'org-agromarket',
    name: 'AgroMarket · Presentador Digital Oficial',
    level: 'patrocinador',
    sector: 'Plataforma Digital Agroalimentaria y Bolsa Agrícola',
    description:
      'Aliado Tecnológico y Presentador Digital Oficial ("El precio justo de tu cosecha"). Plataforma nacida en La Grita que publica cada domingo los precios oficiales de 57 rubros de la Bolsa Agrícola en USD, VES y COP, conectando a agricultores, compradores mayoristas y transportistas con 0 % de comisión.',
    logo_url: '/assets/aistudio/agromarket-post-blanco-simple_ab5a7228.png',
    instagram: '@agromarket.ve',
    whatsapp: '+58 424 7100779',
    stand_code: '03',
    status: 'confirmado',
  },
  // 2. Institutional (4)
  {
    id: 'org-mppat',
    name: 'MPPAT y entes adscritos (SUNAGRO, INSAI, INIA, CVC, CSC, IAPRET, CVAUP)',
    level: 'institucional',
    sector: 'Sector público agrícola',
    description: 'Ministerio del Poder Popular para la Agricultura Productiva y Tierras y organismos adscritos.',
    logo_url: null,
    instagram: null,
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-gobernacion',
    name: 'Gobernación del Estado Táchira',
    level: 'institucional',
    sector: 'Gobierno regional',
    description: 'Apoyo institucional regional en el estado Táchira.',
    logo_url: null,
    instagram: null,
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-fundesta',
    name: 'Fundesta',
    level: 'institucional',
    sector: 'Fomento y financiamiento regional',
    description: 'Fundación para el Desarrollo del Estado Táchira.',
    logo_url: null,
    instagram: null,
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-alcaldia-jauregui',
    name: 'Alcaldía de Jáuregui – La Grita',
    level: 'institucional',
    sector: 'Gobierno municipal',
    description: 'Promueve el encuentro en el marco de los 450 años de La Grita.',
    logo_url: null,
    instagram: '@alcaldiadejauregui_lagrita',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  // 3. Allies (6)
  {
    id: 'org-apropatachira',
    name: 'Apropatáchira',
    level: 'aliado',
    sector: 'Gremio de productores',
    description: 'Asociación de Productores de Papa del Estado Táchira.',
    logo_url: null,
    instagram: '@apropatachira',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-unet',
    name: 'UNET',
    level: 'aliado',
    sector: 'Academia e investigación',
    description: 'Universidad Nacional Experimental del Táchira.',
    logo_url: null,
    instagram: '@unet_oficial',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-posadas-tachira',
    name: 'Posadas del Táchira',
    level: 'aliado',
    sector: 'Alojamiento y turismo',
    description: 'Red de posadas y alojamiento turístico en el estado Táchira.',
    logo_url: null,
    instagram: '@posadasdeltachira',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-tachira-natural',
    name: 'Táchira Natural',
    level: 'aliado',
    sector: 'Turismo y naturaleza',
    description: 'Promoción ecoturística y cultural de la región andina.',
    logo_url: null,
    instagram: '@tachira_natural',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-capmi-plazza',
    name: 'Capmi Plazza',
    level: 'aliado',
    sector: 'Alojamiento y servicios',
    description: 'Aliado de hospitalidad y servicios en la región.',
    logo_url: null,
    instagram: '@campi.plazza',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-unellez',
    name: 'UNELLEZ',
    level: 'aliado',
    sector: 'Academia e investigación',
    description: 'Universidad Nacional Experimental de los Llanos Occidentales Ezequiel Zamora.',
    logo_url: null,
    instagram: null,
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  // 4. Exhibitors (13)
  {
    id: 'org-mack',
    name: 'Mack de Venezuela / DFT Autocamiones',
    level: 'expositor',
    sector: 'Maquinaria y transporte',
    description: 'Transporte de carga pesada y camiones para el sector agroindustrial.',
    logo_url: null,
    instagram: '@mackvenezuela',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-import-global',
    name: 'Import Global',
    level: 'expositor',
    sector: 'Insumos y equipamiento',
    description: 'Importadora H&M · Soluciones comerciales y suministro.',
    logo_url: null,
    instagram: '@importadora.hym',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-agrosus',
    name: 'Agrosus',
    level: 'expositor',
    sector: 'Insumos agrícolas',
    description: 'Soluciones y acompañamiento para producción agrícola sostenible.',
    logo_url: null,
    instagram: '@agrosus9',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-tecno-agua',
    name: 'Tecno Agua',
    level: 'expositor',
    sector: 'Tecnología hídrica',
    description: 'Sistemas de riego, bombeo y gestión del agua en el campo.',
    logo_url: null,
    instagram: '@tecnoagua1',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-agro-insumos-tachira',
    name: 'Agro Insumos del Táchira',
    level: 'expositor',
    sector: 'Insumos agrícolas',
    description: 'Semillas, fertilizantes y protección de cultivos en los Andes.',
    logo_url: null,
    instagram: '@agroinsumostach',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-aldefrio',
    name: 'Aldefrio',
    level: 'expositor',
    sector: 'Agroindustria y refrigeración',
    description: 'Cadena de frío y equipamiento de refrigeración comercial e industrial.',
    logo_url: null,
    instagram: '@aldefrioca',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-helados-la-cascada',
    name: 'Helados La Cascada',
    level: 'expositor',
    sector: 'Alimentos y lácteos',
    description: 'Producción y distribución de helados y derivados lácteos.',
    logo_url: null,
    instagram: '@heladoslacascada',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-dulceria-malaguena',
    name: 'La Dulcería Malagueña',
    level: 'expositor',
    sector: 'Gastronomía y tradición',
    description: 'Repostería y dulces tradicionales andinos.',
    logo_url: null,
    instagram: '@ladulceriamalaguena',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-abioven',
    name: 'Abioven',
    level: 'expositor',
    sector: 'Biotecnología e insumos',
    description: 'Soluciones biológicas y nutrición vegetal para el agro.',
    logo_url: null,
    instagram: '@abioven_sa',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-bancamiga',
    name: 'Bancamiga',
    level: 'expositor',
    sector: 'Finanzas y banca',
    description: 'Servicios financieros, medios de pago y atención empresarial.',
    logo_url: null,
    instagram: '@bancamiga',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-bemiagro',
    name: 'Bemiagro',
    level: 'expositor',
    sector: 'Insumos y servicios agrícolas',
    description: 'Comercialización de insumos agropecuarios en el Táchira.',
    logo_url: null,
    instagram: '@bemiagro_tachira',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-mardufre',
    name: 'Mardufre',
    level: 'expositor',
    sector: 'Agroindustria y suministros',
    description: 'Equipamiento y suministros para el sector productivo.',
    logo_url: null,
    instagram: '@mardufre',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
  {
    id: 'org-agrollano',
    name: 'Agrollano',
    level: 'expositor',
    sector: 'Insumos y maquinaria',
    description: 'Soluciones agropecuarias e insumos para el productor tachirense.',
    logo_url: null,
    instagram: '@agrollano_tachira',
    whatsapp: null,
    stand_code: null,
    status: 'por_reconfirmar',
  },
];

/**
 * 3 seeded bolsa_prices rows with is_sample = true (as required by Section 4).
 */
export const INITIAL_BOLSA_PRICES: BolsaPriceRecord[] = [
  {
    id: 'bolsa-papa-unica',
    item: 'Papa lavada (Única)',
    unit: 'Saco 50 kg',
    price_usd: 28.0,
    price_ves: 1260.0,
    price_cop: 118000,
    report_date: '2026-11-08',
    is_sample: true,
  },
  {
    id: 'bolsa-zanahoria',
    item: 'Zanahoria de primera',
    unit: 'Saco 45 kg',
    price_usd: 19.5,
    price_ves: 877.5,
    price_cop: 82000,
    report_date: '2026-11-08',
    is_sample: true,
  },
  {
    id: 'bolsa-cebolla-cabeza',
    item: 'Cebolla de cabeza',
    unit: 'Saco 45 kg',
    price_usd: 32.0,
    price_ves: 1440.0,
    price_cop: 135000,
    report_date: '2026-11-08',
    is_sample: true,
  },
];

export const INITIAL_STANDS: StandRecord[] = generateInitialStands();

export const THEMATIC_AXES = [
  {
    id: 'tecnologia',
    title: 'Tecnología e innovación agrícola',
    description: 'Agricultura de precisión, digitalización y sistemas inteligentes para el manejo del cultivo.',
    icon: 'cpu',
  },
  {
    id: 'suelos',
    title: 'Regeneración de suelos',
    description: 'Técnicas y fertilizantes para recuperar la fertilidad y producir más con menos insumos.',
    icon: 'sprout',
  },
  {
    id: 'regenerativos',
    title: 'Modelos regenerativos y salud',
    description: 'Producción rentable, amigable con el ambiente y conectada con la alimentación consciente.',
    icon: 'heart-handshake',
  },
  {
    id: 'agroindustria',
    title: 'Agroindustria y valor agregado',
    description: 'Procesar, empacar y distribuir la cosecha para llevarla desde la finca hasta el anaquel.',
    icon: 'factory',
  },
  {
    id: 'apicultura',
    title: 'Apicultura',
    description: 'Producción de miel, aprovechamiento de derivados y polinización estratégica de cultivos.',
    icon: 'hexagon',
  },
  {
    id: 'carnico-lacteo',
    title: 'Cárnico y lácteo',
    description: 'Punto de encuentro para ganaderos, avicultores, porcicultores, procesadores y distribuidores.',
    icon: 'beef',
  },
  {
    id: 'integracion-andina',
    title: 'Integración andina',
    description: 'Articulación comercial de Táchira, Mérida y Trujillo como un solo bloque productivo.',
    icon: 'mountain',
  },
  {
    id: 'maquinaria',
    title: 'Maquinaria y transporte',
    description: 'Camiones, tractores, implementos agrícolas y logística de carga para el campo.',
    icon: 'truck',
  },
] as const;

export const PARTICIPANT_PROFILES = [
  {
    title: 'Productores agropecuarios y agrícolas',
    detail: 'Agricultores y criadores de los valles altos y toda la región andina.',
  },
  {
    title: 'Proveedores de insumos, maquinaria, tecnología y servicios',
    detail: 'Casas comerciales, fabricantes de equipos, riego y transporte pesado.',
  },
  {
    title: 'Instituciones',
    detail: 'Gremios de productores, ONG, universidades, academia y sector público.',
  },
  {
    title: 'Comunidad',
    detail: 'Profesionales del agro, técnicos de campo, estudiantes e investigadores.',
  },
  {
    title: 'Inversionistas',
    detail: 'Aliados comerciales, compradores mayoristas y entidades financieras.',
  },
] as const;

export const WORK_ROUTE_STEPS = [
  {
    step: '1',
    phase: 'Pre Expo',
    period: 'Antes del 20 de noviembre',
    summary: 'Exposición de bienes y servicios, charlas, rueda de negocios y reuniones empresariales preparatorias.',
  },
  {
    step: '2',
    phase: 'Expo',
    period: '20 al 22 de noviembre',
    summary: 'Workshops, encuentros de negocios, charlas, conferencias y levantamiento de datos en el Casino Militar.',
  },
  {
    step: '3',
    phase: 'Post Expo',
    period: 'Desde el 23 de noviembre',
    summary: 'Análisis de resultados, formación, capacitación continua y enlaces productivos permanentes.',
  },
] as const;

export const ROAD_ROUTES = [
  {
    id: 'merida',
    origin: 'Desde Mérida',
    route: 'Troncal 7 pasando por Bailadores directo al valle de La Grita.',
  },
  {
    id: 'zulia',
    origin: 'Desde el Zulia y zona norte',
    route: 'Troncal 6 subiendo por Seboruco hasta La Grita.',
  },
  {
    id: 'colombia',
    origin: 'Desde Colombia y frontera',
    route: 'Conexión por las Troncales 1 y 7 atravesando el eje montañoso del Táchira.',
  },
  {
    id: 'llanos',
    origin: 'Desde Los Llanos y San Cristóbal',
    route: 'Troncal 5 enlazando con la Troncal 7 (a 85 km de San Cristóbal).',
  },
] as const;

export const MUNICIPALITY_OPTIONS = [
  'Jáuregui',
  'Seboruco',
  'José María Vargas',
  'Uribante',
  'Francisco de Miranda',
  'Rivas Dávila (Mérida)',
  'Tovar (Mérida)',
  'San Cristóbal',
  'Otro',
] as const;

export const VISITOR_PROFILE_OPTIONS = [
  'Productor',
  'Comerciante o comprador',
  'Proveedor',
  'Estudiante',
  'Institución',
  'Visitante',
] as const;

export const INTEREST_OPTIONS = [
  'Hortalizas',
  'Papa',
  'Frutas',
  'Café',
  'Lácteos',
  'Cárnicos',
  'Apicultura',
  'Insumos',
  'Maquinaria',
  'Tecnología',
  'Agroindustria',
] as const;

export const HEARD_FROM_OPTIONS = [
  'Instagram',
  'WhatsApp',
  'Facebook',
  'Radio',
  'Afiche',
  'Un amigo',
  'Otro',
] as const;

export type UserRole = 'admin' | 'staff';

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export type StandRequestStatus = 'pendiente' | 'confirmada' | 'liberada';

export interface StandRequestRecord {
  id: string;
  stand_code: string;
  company_name: string;
  rif: string;
  contact_name: string;
  whatsapp: string;
  email: string;
  sector: string;
  notes: string;
  status: StandRequestStatus;
  hold_until: string;
  created_at: string;
}

export type B2BRoleType =
  | 'Comprador mayorista'
  | 'Productor agropecuario'
  | 'Proveedor de insumos o maquinaria'
  | 'Agroindustria y procesamiento';

export interface B2BRegistrationRecord {
  id: string;
  company_name: string;
  rif: string;
  contact_name: string;
  whatsapp: string;
  municipality: string;
  role_type: B2BRoleType;
  rubros: string[];
  offer_or_demand: string;
  status: 'inscrito' | 'verificado';
  created_at: string;
}

export interface SecurityAuditLogRecord {
  id: string;
  event_type: 'honeypot_blocked' | 'rate_limit_exceeded' | 'rls_denied' | 'auth_login' | 'stand_hold_48h' | 'stand_confirmed';
  action: string;
  detail: string;
  created_at: string;
}

export const INITIAL_PROFILES: ProfileRecord[] = [
  {
    id: 'prof-admin-cenexpo',
    email: 'admin@cenexpo.com.ve',
    full_name: 'Dirección Comercial Cenexpo C.A.',
    role: 'admin',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'prof-admin-yohe',
    email: 'yohe.098@gmail.com',
    full_name: 'Coordinación General Expo La Grita 2026',
    role: 'admin',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'prof-staff-puerta',
    email: 'staff@cenexpo.com.ve',
    full_name: 'Operador de Puerta y Acreditación',
    role: 'staff',
    created_at: '2026-11-01T08:30:00Z',
  },
];

export const INITIAL_VISITORS: VisitorRecord[] = [
  {
    id: 'vis-seed-01',
    name: 'Carlos Eduardo Mora Zambrano',
    whatsapp: '+58 414 7214501',
    municipality: 'Jáuregui',
    profile: 'Productor',
    interests: ['Papa', 'Hortalizas', 'Insumos'],
    consent: true,
    qr_token: 'LG26-A101-MORA',
    utm_source: 'instagram',
    heard_from: 'Instagram',
    checked_in_at: '2026-11-20T09:15:00.000Z',
    created_at: '2026-11-05T14:20:00.000Z',
  },
  {
    id: 'vis-seed-02',
    name: 'María Gabriela Contreras',
    whatsapp: '+58 424 7559920',
    municipality: 'Seboruco',
    profile: 'Comerciante o comprador',
    interests: ['Hortalizas', 'Frutas', 'Lácteos'],
    consent: true,
    qr_token: 'LG26-B202-CONT',
    utm_source: 'whatsapp',
    heard_from: 'WhatsApp',
    checked_in_at: '2026-11-20T09:42:00.000Z',
    created_at: '2026-11-05T18:10:00.000Z',
  },
  {
    id: 'vis-seed-03',
    name: 'José Gregorio Roa Roa',
    whatsapp: '+58 414 7093312',
    municipality: 'Rivas Dávila (Mérida)',
    profile: 'Productor',
    interests: ['Papa', 'Maquinaria', 'Tecnología'],
    consent: true,
    qr_token: 'LG26-C303-ROAR',
    utm_source: 'radio',
    heard_from: 'Radio',
    checked_in_at: '2026-11-20T10:18:00.000Z',
    created_at: '2026-11-06T11:05:00.000Z',
  },
  {
    id: 'vis-seed-04',
    name: 'Ana Karina Escalante',
    whatsapp: '+58 416 6764109',
    municipality: 'San Cristóbal',
    profile: 'Proveedor',
    interests: ['Insumos', 'Agroindustria', 'Tecnología'],
    consent: true,
    qr_token: 'LG26-D404-ESCA',
    utm_source: 'instagram',
    heard_from: 'Instagram',
    checked_in_at: '2026-11-20T10:51:00.000Z',
    created_at: '2026-11-06T16:40:00.000Z',
  },
  {
    id: 'vis-seed-05',
    name: 'Luis Alberto Guerrero',
    whatsapp: '+58 424 7318845',
    municipality: 'Tovar (Mérida)',
    profile: 'Comerciante o comprador',
    interests: ['Café', 'Apicultura', 'Agroindustria'],
    consent: true,
    qr_token: 'LG26-E505-GUER',
    utm_source: 'whatsapp',
    heard_from: 'WhatsApp',
    checked_in_at: '2026-11-20T11:25:00.000Z',
    created_at: '2026-11-07T09:30:00.000Z',
  },
  {
    id: 'vis-seed-06',
    name: 'Daniela Alejandra Pérez',
    whatsapp: '+58 414 7481123',
    municipality: 'Jáuregui',
    profile: 'Estudiante',
    interests: ['Tecnología', 'Apicultura', 'Lácteos'],
    consent: true,
    qr_token: 'LG26-F606-PERE',
    utm_source: 'afiche',
    heard_from: 'Afiche',
    checked_in_at: '2026-11-20T14:12:00.000Z',
    created_at: '2026-11-07T15:15:00.000Z',
  },
  {
    id: 'vis-seed-07',
    name: 'Pedro Antonio Duque',
    whatsapp: '+58 414 7882010',
    municipality: 'José María Vargas',
    profile: 'Productor',
    interests: ['Lácteos', 'Cárnicos', 'Maquinaria'],
    consent: true,
    qr_token: 'LG26-G707-DUQU',
    utm_source: 'facebook',
    heard_from: 'Facebook',
    checked_in_at: null,
    created_at: '2026-11-08T08:45:00.000Z',
  },
  {
    id: 'vis-seed-08',
    name: 'Rosa Elena Méndez',
    whatsapp: '+58 424 7015599',
    municipality: 'Uribante',
    profile: 'Institución',
    interests: ['Café', 'Hortalizas', 'Tecnología'],
    consent: true,
    qr_token: 'LG26-H808-MEND',
    utm_source: 'amigo',
    heard_from: 'Un amigo',
    checked_in_at: null,
    created_at: '2026-11-08T10:15:00.000Z',
  },
  {
    id: 'vis-seed-09',
    name: 'Héctor Julio Chacón',
    whatsapp: '+58 414 7126634',
    municipality: 'Jáuregui',
    profile: 'Productor',
    interests: ['Papa', 'Hortalizas', 'Maquinaria'],
    consent: true,
    qr_token: 'LG26-J909-CHAC',
    utm_source: 'instagram',
    heard_from: 'Instagram',
    checked_in_at: null,
    created_at: '2026-11-08T12:40:00.000Z',
  },
];

export const POST_EVENT_GALLERY_ITEMS = [
  {
    id: 'gal-01',
    src: '/assets/extracted/casino-interior-real.jpg',
    alt: 'Salón de Exposiciones del Casino Militar de La Grita durante el montaje y recorrido de stands',
    badge: 'Salón de Exposición · 51 Stands',
    title: 'Encuentro comercial en la nave principal del Casino Militar',
    detail: 'Productores y casas de insumos agrícolas reunidos en los 817 m² del Salón de Exposiciones.',
  },
  {
    id: 'gal-02',
    src: '/assets/extracted/networking-real-photo.jpg',
    alt: 'Rueda de negocios y acuerdos entre productores andinos y compradores mayoristas',
    badge: 'Rueda de Negocios B2B',
    title: 'Mesas de enlace productivo y acuerdos comerciales',
    detail: 'Articulación directa entre agricultores del municipio Jáuregui, agroindustria y distribuidores nacionales.',
  },
  {
    id: 'gal-03',
    src: '/assets/extracted/casino-exterior-maqueta.jpg',
    alt: 'Explanada exterior del Casino Militar y exhibición de Expoauto La Grita 2026',
    badge: 'Expoauto · 990 m²',
    title: 'Exhibición de camiones, tractores y potencia automotriz',
    detail: 'Las 8 zonas exteriores frente a la Vía Llano Los Zambranos con maquinaria para el campo andino.',
  },
  {
    id: 'gal-04',
    src: '/assets/extracted/la-grita-panoramica-real.jpg',
    alt: 'Valle agrícola de La Grita y sus montañas cultivadas a 1.440 metros sobre el nivel del mar',
    badge: '450 Años de La Grita',
    title: 'La Grita, capital agroalimentaria de Venezuela',
    detail: 'Cierre de la Semana Nacional de la Alimentación celebrando la tradición productiva de los Andes.',
  },
] as const;


