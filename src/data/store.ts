import {
  EventConfig,
  ZoneRecord,
  ExhibitorRecord,
  BolsaPriceRecord,
  AgendaItemRecord,
  VisitorRecord,
  ProfileRecord,
  UserRole,
  StandRequestRecord,
  B2BRegistrationRecord,
  SecurityAuditLogRecord,
  INITIAL_EVENT_CONFIG,
  INITIAL_ZONES,
  INITIAL_EXHIBITORS,
  INITIAL_BOLSA_PRICES,
  INITIAL_STANDS,
  INITIAL_PROFILES,
  INITIAL_VISITORS,
} from './seed';
import { StandRecord, getEffectiveStandStatus, StandStatus, STAND_TYPE_META, STAND_STATUS_META } from '../config/venue';

const STORAGE_KEYS = {
  EVENT_CONFIG: 'expo_lg26_event_config_v4',
  ZONES: 'expo_lg26_zones_v4',
  STANDS: 'expo_lg26_stands_v4',
  STAND_REQUESTS: 'expo_lg26_stand_requests_v4',
  B2B_REGISTRATIONS: 'expo_lg26_b2b_registrations_v4',
  EXHIBITORS: 'expo_lg26_exhibitors_v4',
  BOLSA_PRICES: 'expo_lg26_bolsa_prices_v4',
  AGENDA: 'expo_lg26_agenda_v4',
  VISITORS: 'expo_lg26_visitors_v4',
  PROFILES: 'expo_lg26_profiles_v4',
  AUTH_SESSION: 'expo_lg26_auth_session_v4',
  AUDIT_LOGS: 'expo_lg26_audit_logs_v4',
  RATE_LIMITS: 'expo_lg26_rate_limits_v4',
  LAST_PASS_TOKEN: 'expo_lg26_last_pass_token_v4',
};

export interface PublicStandView extends Omit<StandRecord, 'price_usd' | 'status'> {
  effective_status: StandStatus;
  price_usd: number | null;
  exhibitor: ExhibitorRecord | null;
}

// In-memory store fallback so Node.js unit tests (`node:test`) work identically to browser `localStorage`
const memoryStorage = new Map<string, string>();

function getRawItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memoryStorage.get(key) ?? null;
}

function setRawItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  } else {
    memoryStorage.set(key, value);
  }
}

function removeRawItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  } else {
    memoryStorage.delete(key);
  }
}

function cloneDeep<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = getRawItem(key);
    if (!raw) {
      const copy = cloneDeep(fallback);
      setRawItem(key, JSON.stringify(copy));
      return copy;
    }
    return JSON.parse(raw) as T;
  } catch {
    return cloneDeep(fallback);
  }
}

// ---------------------------------------------------------------------------
// REALTIME PUB/SUB ENGINE (BroadcastChannel + Storage Event + In-Tab Listeners)
// ---------------------------------------------------------------------------
export interface RealtimePayload {
  table: string;
  action: string;
  standCode?: string;
  timestamp: number;
}

type StoreListener = (payload: RealtimePayload) => void;
const listeners = new Set<StoreListener>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('expo_lg26_realtime_v3');
    broadcastChannel.onmessage = (event: MessageEvent<RealtimePayload>) => {
      if (event?.data) {
        listeners.forEach((fn) => fn(event.data));
      }
    };
  } catch {
    broadcastChannel = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('expo_lg26_')) {
      const payload: RealtimePayload = {
        table: e.key,
        action: 'storage_sync',
        timestamp: Date.now(),
      };
      listeners.forEach((fn) => fn(payload));
    }
  });
}

function notifyStoreChange(table: string, action: string, standCode?: string): void {
  const payload: RealtimePayload = {
    table,
    action,
    standCode,
    timestamp: Date.now(),
  };
  listeners.forEach((fn) => fn(payload));
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // ignore closed channel
    }
  }
}

export function subscribeToStoreChanges(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeJson<T>(key: string, value: T, action = 'update', standCode?: string): void {
  setRawItem(key, JSON.stringify(value));
  notifyStoreChange(key, action, standCode);
}

// ---------------------------------------------------------------------------
// SECURITY HARDENING: HONEYPOT, SLIDING-WINDOW RATE LIMITER & AUDIT LOG
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PUBLIC_INSERTS_PER_WINDOW = 6;     // Max 6 public inserts per 10 min per action bucket

export function getSecurityAuditLogs(): SecurityAuditLogRecord[] {
  return readJson<SecurityAuditLogRecord[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

export function appendSecurityAuditLog(
  event_type: SecurityAuditLogRecord['event_type'],
  action: string,
  detail: string
): void {
  const logs = getSecurityAuditLogs();
  const entry: SecurityAuditLogRecord = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event_type,
    action,
    detail,
    created_at: new Date().toISOString(),
  };
  writeJson(STORAGE_KEYS.AUDIT_LOGS, [entry, ...logs.slice(0, 99)], 'audit_log');
}

export function checkPublicInsertSecurity(
  actionBucket: 'visitor_insert' | 'stand_request_insert' | 'b2b_insert',
  honeypotValue?: string,
  nowMs: number = Date.now()
): { allowed: boolean; reason?: 'honeypot' | 'rate_limit'; message?: string } {
  // 1. Honeypot check: any non-empty value in the hidden trap input blocks the insert
  if (honeypotValue && honeypotValue.trim() !== '') {
    appendSecurityAuditLog(
      'honeypot_blocked',
      actionBucket,
      `Intento automatizado bloqueado por honeypot en ${actionBucket}`
    );
    return {
      allowed: false,
      reason: 'honeypot',
      message: 'Solicitud bloqueada por filtro anti-spam.',
    };
  }

  // 2. Sliding-window rate limit check
  const allBuckets = readJson<Record<string, number[]>>(STORAGE_KEYS.RATE_LIMITS, {});
  const history = (allBuckets[actionBucket] || []).filter(
    (ts) => nowMs - ts < RATE_LIMIT_WINDOW_MS
  );

  if (history.length >= MAX_PUBLIC_INSERTS_PER_WINDOW) {
    appendSecurityAuditLog(
      'rate_limit_exceeded',
      actionBucket,
      `Límite de frecuencia excedido (${history.length}/${MAX_PUBLIC_INSERTS_PER_WINDOW} en 10 min)`
    );
    return {
      allowed: false,
      reason: 'rate_limit',
      message:
        'Has superado el límite máximo de envíos permitidos en 10 minutos. Por favor espera unos minutos antes de intentar de nuevo.',
    };
  }

  allBuckets[actionBucket] = [...history, nowMs];
  setRawItem(STORAGE_KEYS.RATE_LIMITS, JSON.stringify(allBuckets));
  return { allowed: true };
}

export function resetStoreAndRateLimitsForTest(): void {
  Object.values(STORAGE_KEYS).forEach((k) => removeRawItem(k));
}

// ---------------------------------------------------------------------------
// AUTHENTICATION & PROFILES RBAC (`admin` vs `staff`)
// ---------------------------------------------------------------------------
export function getProfiles(): ProfileRecord[] {
  return readJson<ProfileRecord[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
}

export function getCurrentProfile(): ProfileRecord | null {
  const raw = getRawItem(STORAGE_KEYS.AUTH_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileRecord;
    const profiles = getProfiles();
    return profiles.find((p) => p.email.toLowerCase() === parsed.email.toLowerCase()) || parsed;
  } catch {
    return null;
  }
}

export function loginWithEmail(
  email: string,
  password: string
): { ok: boolean; profile?: ProfileRecord; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Ingresa un correo electrónico válido.' };
  }
  if (!password || password.trim().length < 4) {
    return { ok: false, error: 'Ingresa tu clave de acceso (mínimo 4 caracteres).' };
  }

  const profiles = getProfiles();
  const matched = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
  if (!matched) {
    appendSecurityAuditLog('rls_denied', 'auth_login', `Intento de login con correo no autorizado: ${cleanEmail}`);
    return {
      ok: false,
      error:
        'Este correo no figura en la tabla profiles. Usa admin@cenexpo.com.ve, yohe.098@gmail.com (admin) o staff@cenexpo.com.ve (staff).',
    };
  }

  setRawItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(matched));
  appendSecurityAuditLog('auth_login', 'login', `Sesión iniciada por ${matched.email} (rol: ${matched.role})`);
  notifyStoreChange(STORAGE_KEYS.AUTH_SESSION, 'login');
  return { ok: true, profile: matched };
}

export function logoutAdmin(): void {
  removeRawItem(STORAGE_KEYS.AUTH_SESSION);
  notifyStoreChange(STORAGE_KEYS.AUTH_SESSION, 'logout');
}

export function requireRole(allowedRoles: UserRole[]): ProfileRecord {
  const current = getCurrentProfile();
  if (!current) {
    appendSecurityAuditLog('rls_denied', 'unauthenticated_write', 'Intento de escritura sin sesión activa');
    throw new Error('RLS: Debes iniciar sesión en /admin para realizar esta operación.');
  }
  if (!allowedRoles.includes(current.role)) {
    appendSecurityAuditLog(
      'rls_denied',
      'insufficient_role',
      `Usuario ${current.email} (${current.role}) intentó una acción restringida a: ${allowedRoles.join(', ')}`
    );
    throw new Error(
      `RLS: Tu perfil tiene rol "${current.role}". Esta acción requiere rol "${allowedRoles.join(' o ')}".`
    );
  }
  return current;
}

// ---------------------------------------------------------------------------
// PUBLIC & ADMIN READS
// ---------------------------------------------------------------------------
export function getEventConfig(): EventConfig {
  return readJson<EventConfig>(STORAGE_KEYS.EVENT_CONFIG, INITIAL_EVENT_CONFIG);
}

export function getZones(): ZoneRecord[] {
  return readJson<ZoneRecord[]>(STORAGE_KEYS.ZONES, INITIAL_ZONES);
}

export function getExhibitors(): ExhibitorRecord[] {
  return readJson<ExhibitorRecord[]>(STORAGE_KEYS.EXHIBITORS, INITIAL_EXHIBITORS);
}

export function getConfirmedExhibitors(): ExhibitorRecord[] {
  return getExhibitors().filter((e) => e.status === 'confirmado');
}

export function getStandsRaw(): StandRecord[] {
  return readJson<StandRecord[]>(STORAGE_KEYS.STANDS, INITIAL_STANDS);
}

/**
 * Emulates the Supabase `stands_public` view:
 * Hides `price_usd` unless `event_config.show_prices` is true,
 * and computes `effective_status` (expired 48h holds return to `disponible`).
 */
export function getStandsPublic(nowMs: number = Date.now()): PublicStandView[] {
  const config = getEventConfig();
  const stands = getStandsRaw();
  const confirmedExhibitors = getConfirmedExhibitors();
  const exhibitorMap = new Map(confirmedExhibitors.map((e) => [e.id, e]));

  return stands.map((s) => {
    const effective_status = getEffectiveStandStatus(s, nowMs);
    const { price_usd, status: _rawStatus, ...rest } = s;
    return {
      ...rest,
      effective_status,
      price_usd: config.show_prices ? price_usd : null,
      exhibitor: s.exhibitor_id ? exhibitorMap.get(s.exhibitor_id) || null : null,
    };
  });
}

export function getStandRequests(): StandRequestRecord[] {
  return readJson<StandRequestRecord[]>(STORAGE_KEYS.STAND_REQUESTS, []);
}

export function getB2BRegistrations(): B2BRegistrationRecord[] {
  return readJson<B2BRegistrationRecord[]>(STORAGE_KEYS.B2B_REGISTRATIONS, []);
}

export function getBolsaPrices(): BolsaPriceRecord[] {
  return readJson<BolsaPriceRecord[]>(STORAGE_KEYS.BOLSA_PRICES, INITIAL_BOLSA_PRICES);
}

export function getAgendaItems(): AgendaItemRecord[] {
  return readJson<AgendaItemRecord[]>(STORAGE_KEYS.AGENDA, []);
}

export function getVisitors(): VisitorRecord[] {
  return readJson<VisitorRecord[]>(STORAGE_KEYS.VISITORS, INITIAL_VISITORS);
}

export function findVisitorByToken(token: string): VisitorRecord | null {
  const clean = token.trim().replace(/^.*\/pase\//i, '').toUpperCase();
  const visitors = getVisitors();
  const found = visitors.find((v) => v.qr_token.toUpperCase() === clean);
  return found || null;
}

export function markVisitorCheckInByToken(
  rawToken: string,
  checkedInIso: string = new Date().toISOString()
): { visitor: VisitorRecord; alreadyCheckedIn: boolean } {
  const cleanToken = rawToken.trim().replace(/^.*\/pase\//i, '').toUpperCase();
  const visitors = getVisitors();
  const idx = visitors.findIndex((v) => v.qr_token.toUpperCase() === cleanToken);

  if (idx !== -1) {
    const existing = visitors[idx];
    const alreadyCheckedIn = Boolean(existing.checked_in_at);
    const updated: VisitorRecord = {
      ...existing,
      checked_in_at: existing.checked_in_at || checkedInIso,
    };
    visitors[idx] = updated;
    writeJson(STORAGE_KEYS.VISITORS, visitors, 'visitor_checkin');
    return { visitor: updated, alreadyCheckedIn };
  }

  // If scanned offline at the gate before the visitor's cloud registration synced, create a verified gate pass entry
  const gateVisitor: VisitorRecord = {
    id: `vis-gate-${Date.now()}`,
    name: `Acreditado en Puerta (${cleanToken})`,
    whatsapp: '+58 414 0000000',
    municipality: 'Jáuregui',
    profile: 'Visitante',
    interests: ['Hortalizas'],
    consent: true,
    qr_token: cleanToken,
    utm_source: 'puerta_qr',
    heard_from: 'Afiche',
    checked_in_at: checkedInIso,
    created_at: checkedInIso,
  };
  writeJson(STORAGE_KEYS.VISITORS, [gateVisitor, ...visitors], 'visitor_checkin');
  return { visitor: gateVisitor, alreadyCheckedIn: false };
}

// ---------------------------------------------------------------------------
// PUBLIC INSERTS (WITH HONEYPOT, RATE LIMIT & 48-HOUR STAND HOLD)
// ---------------------------------------------------------------------------
export function registerVisitor(
  input: Omit<VisitorRecord, 'id' | 'created_at' | 'checked_in_at'>,
  honeypot?: string,
  nowMs: number = Date.now()
): VisitorRecord {
  const sec = checkPublicInsertSecurity('visitor_insert', honeypot, nowMs);
  if (!sec.allowed) {
    throw new Error(sec.message || 'No se pudo procesar el registro.');
  }

  const visitors = getVisitors();
  const newVisitor: VisitorRecord = {
    ...input,
    id: `vis-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    checked_in_at: null,
    created_at: new Date(nowMs).toISOString(),
  };
  const updated = [newVisitor, ...visitors];
  writeJson(STORAGE_KEYS.VISITORS, updated, 'visitor_insert');
  writeJson(STORAGE_KEYS.LAST_PASS_TOKEN, newVisitor.qr_token, 'last_pass');
  return newVisitor;
}

export function getLastPassToken(): string | null {
  try {
    const raw = getRawItem(STORAGE_KEYS.LAST_PASS_TOKEN);
    return raw ? (JSON.parse(raw) as string) : null;
  } catch {
    return null;
  }
}

export const HOLD_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

/**
 * Phase 2 Task 1: Stand request flow from the 2D plan (available stands only)
 * with automatic 48-hour hold (`hold_until = now + 48h`) and realtime update.
 */
export function createStandRequest(
  input: {
    stand_code: string;
    company_name: string;
    rif: string;
    contact_name: string;
    whatsapp: string;
    email: string;
    sector: string;
    notes?: string;
  },
  honeypot?: string,
  nowMs: number = Date.now()
): { request: StandRequestRecord; updatedStand: StandRecord } {
  const sec = checkPublicInsertSecurity('stand_request_insert', honeypot, nowMs);
  if (!sec.allowed) {
    throw new Error(sec.message || 'Solicitud bloqueada.');
  }

  const normalizedCode = input.stand_code.trim().toUpperCase();
  const stands = getStandsRaw();
  const standIndex = stands.findIndex((s) => s.code.toUpperCase() === normalizedCode);

  if (standIndex === -1) {
    throw new Error(`El stand "${normalizedCode}" no existe en la planimetría oficial.`);
  }

  const targetStand = stands[standIndex];
  const effectiveStatus = getEffectiveStandStatus(targetStand, nowMs);

  // Enforce available stands only!
  if (effectiveStatus !== 'disponible') {
    throw new Error(
      `El stand ${targetStand.code} no está disponible actualmente (estado actual: ${effectiveStatus}). Solo se pueden solicitar stands disponibles.`
    );
  }

  const holdUntilIso = new Date(nowMs + HOLD_DURATION_MS).toISOString();

  // 1. Update stand to 'reservado' with 48-hour hold_until
  const updatedStand: StandRecord = {
    ...targetStand,
    status: 'reservado',
    hold_until: holdUntilIso,
  };
  const updatedStands = [...stands];
  updatedStands[standIndex] = updatedStand;
  writeJson(STORAGE_KEYS.STANDS, updatedStands, 'stand_hold_48h', updatedStand.code);

  // 2. Insert stand_requests row
  const requests = getStandRequests();
  const newRequest: StandRequestRecord = {
    id: `req-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    stand_code: updatedStand.code,
    company_name: input.company_name.trim(),
    rif: input.rif.trim().toUpperCase(),
    contact_name: input.contact_name.trim(),
    whatsapp: input.whatsapp.trim(),
    email: input.email.trim(),
    sector: input.sector,
    notes: (input.notes || '').trim(),
    status: 'pendiente',
    hold_until: holdUntilIso,
    created_at: new Date(nowMs).toISOString(),
  };

  writeJson(STORAGE_KEYS.STAND_REQUESTS, [newRequest, ...requests], 'stand_request_insert', updatedStand.code);
  appendSecurityAuditLog(
    'stand_hold_48h',
    'createStandRequest',
    `Stand ${updatedStand.code} reservado por 48h para ${newRequest.company_name} (vence: ${holdUntilIso})`
  );

  return { request: newRequest, updatedStand };
}

/**
 * Public insert for Rueda de Negocios (B2B Registration) with honeypot and rate limit.
 */
export function createB2BRegistration(
  input: Omit<B2BRegistrationRecord, 'id' | 'status' | 'created_at'>,
  honeypot?: string,
  nowMs: number = Date.now()
): B2BRegistrationRecord {
  const sec = checkPublicInsertSecurity('b2b_insert', honeypot, nowMs);
  if (!sec.allowed) {
    throw new Error(sec.message || 'No se pudo procesar la inscripción.');
  }

  const existing = getB2BRegistrations();
  const record: B2BRegistrationRecord = {
    ...input,
    id: `b2b-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'inscrito',
    created_at: new Date(nowMs).toISOString(),
  };
  writeJson(STORAGE_KEYS.B2B_REGISTRATIONS, [record, ...existing], 'b2b_insert');
  return record;
}

// ---------------------------------------------------------------------------
// ADMIN MUTATIONS (PROTECTED BY RLS ROLE CHECKS)
// ---------------------------------------------------------------------------

/**
 * Confirms a stand request in `/admin`:
 * - Requires role `admin`
 * - Marks the request as `'confirmada'`
 * - Sets the stand's status to `'vendido'` and clears `hold_until`
 * - Automatically creates or updates a confirmed ExhibitorRecord assigned to that stand
 * - Broadcasts the change in real time so the 2D plan immediately turns the stand "vendido"
 */
export function confirmStandRequestInAdmin(requestId: string): {
  request: StandRequestRecord;
  stand: StandRecord;
  exhibitor: ExhibitorRecord;
} {
  requireRole(['admin']);

  const requests = getStandRequests();
  const reqIdx = requests.findIndex((r) => r.id === requestId);
  if (reqIdx === -1) {
    throw new Error('Solicitud de stand no encontrada.');
  }

  const targetReq = requests[reqIdx];
  const stands = getStandsRaw();
  const standIdx = stands.findIndex((s) => s.code.toUpperCase() === targetReq.stand_code.toUpperCase());
  if (standIdx === -1) {
    throw new Error(`Stand ${targetReq.stand_code} no encontrado.`);
  }

  // Upsert confirmed exhibitor for this company
  const exhibitors = getExhibitors();
  let exhibitor = exhibitors.find(
    (e) => e.name.toLowerCase() === targetReq.company_name.toLowerCase()
  );

  if (exhibitor) {
    exhibitor = {
      ...exhibitor,
      status: 'confirmado',
      stand_code: stands[standIdx].code,
      whatsapp: targetReq.whatsapp || exhibitor.whatsapp,
      sector: targetReq.sector || exhibitor.sector,
    };
    const exhIdx = exhibitors.findIndex((e) => e.id === exhibitor!.id);
    exhibitors[exhIdx] = exhibitor;
  } else {
    exhibitor = {
      id: `org-${Date.now()}`,
      name: targetReq.company_name,
      level: 'expositor',
      sector: targetReq.sector,
      description: targetReq.notes || `Expositor confirmado en el Stand ${stands[standIdx].code}.`,
      logo_url: null,
      instagram: null,
      whatsapp: targetReq.whatsapp,
      stand_code: stands[standIdx].code,
      status: 'confirmado',
    };
    exhibitors.unshift(exhibitor);
  }
  writeJson(STORAGE_KEYS.EXHIBITORS, exhibitors, 'exhibitor_confirm', stands[standIdx].code);

  // Update stand to 'vendido'
  const updatedStand: StandRecord = {
    ...stands[standIdx],
    status: 'vendido',
    hold_until: null,
    exhibitor_id: exhibitor.id,
  };
  stands[standIdx] = updatedStand;
  writeJson(STORAGE_KEYS.STANDS, stands, 'stand_vendido', updatedStand.code);

  // Update request to 'confirmada'
  const updatedReq: StandRequestRecord = {
    ...targetReq,
    status: 'confirmada',
  };
  requests[reqIdx] = updatedReq;
  writeJson(STORAGE_KEYS.STAND_REQUESTS, requests, 'stand_request_confirmed', updatedStand.code);

  appendSecurityAuditLog(
    'stand_confirmed',
    'confirmStandRequestInAdmin',
    `Stand ${updatedStand.code} confirmado como VENDIDO a ${targetReq.company_name}`
  );

  return { request: updatedReq, stand: updatedStand, exhibitor };
}

/**
 * Releases a stand hold/request in `/admin` and sets the stand back to `disponible`.
 */
export function releaseStandRequestInAdmin(requestId: string): void {
  requireRole(['admin']);

  const requests = getStandRequests();
  const reqIdx = requests.findIndex((r) => r.id === requestId);
  if (reqIdx === -1) return;

  const targetReq = requests[reqIdx];
  requests[reqIdx] = { ...targetReq, status: 'liberada' };
  writeJson(STORAGE_KEYS.STAND_REQUESTS, requests, 'stand_request_released', targetReq.stand_code);

  const stands = getStandsRaw();
  const standIdx = stands.findIndex((s) => s.code.toUpperCase() === targetReq.stand_code.toUpperCase());
  if (standIdx !== -1) {
    stands[standIdx] = {
      ...stands[standIdx],
      status: 'disponible',
      hold_until: null,
      exhibitor_id: null,
    };
    writeJson(STORAGE_KEYS.STANDS, stands, 'stand_released', stands[standIdx].code);
  }
}

/**
 * Directly updates a stand record in `/admin` (status, price_usd, hold_until, exhibitor_id).
 */
export function updateStandInAdmin(
  standCode: string,
  patch: Partial<Pick<StandRecord, 'status' | 'price_usd' | 'hold_until' | 'exhibitor_id'>>
): StandRecord {
  requireRole(['admin']);
  const stands = getStandsRaw();
  const idx = stands.findIndex((s) => s.code.toUpperCase() === standCode.toUpperCase());
  if (idx === -1) {
    throw new Error(`Stand ${standCode} no encontrado.`);
  }
  const updated: StandRecord = {
    ...stands[idx],
    ...patch,
  };
  stands[idx] = updated;
  writeJson(STORAGE_KEYS.STANDS, stands, 'stand_admin_update', updated.code);
  return updated;
}

export function extendStandHoldInAdmin(standCode: string, hours = 48): StandRecord {
  requireRole(['admin', 'staff']);
  const newHold = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const stands = getStandsRaw();
  const idx = stands.findIndex((s) => s.code.toUpperCase() === standCode.toUpperCase());
  if (idx === -1) throw new Error(`Stand ${standCode} no encontrado.`);
  const updated: StandRecord = {
    ...stands[idx],
    status: 'reservado',
    hold_until: newHold,
  };
  stands[idx] = updated;
  writeJson(STORAGE_KEYS.STANDS, stands, 'stand_hold_extended', updated.code);
  return updated;
}

export function updateExhibitorInAdmin(
  exhibitorId: string,
  patch: Partial<ExhibitorRecord>
): ExhibitorRecord {
  requireRole(['admin']);
  const exhibitors = getExhibitors();
  const idx = exhibitors.findIndex((e) => e.id === exhibitorId);
  if (idx === -1) throw new Error('Expositor no encontrado.');
  const updated: ExhibitorRecord = { ...exhibitors[idx], ...patch };
  exhibitors[idx] = updated;
  writeJson(STORAGE_KEYS.EXHIBITORS, exhibitors, 'exhibitor_update');
  return updated;
}

export function createExhibitorInAdmin(
  input: Omit<ExhibitorRecord, 'id'>
): ExhibitorRecord {
  requireRole(['admin']);
  const exhibitors = getExhibitors();
  const created: ExhibitorRecord = {
    ...input,
    id: `org-${Date.now()}`,
  };
  writeJson(STORAGE_KEYS.EXHIBITORS, [created, ...exhibitors], 'exhibitor_create');
  return created;
}

export function toggleVisitorCheckInAdmin(visitorId: string): VisitorRecord {
  requireRole(['admin', 'staff']);
  const visitors = getVisitors();
  const idx = visitors.findIndex((v) => v.id === visitorId);
  if (idx === -1) throw new Error('Visitante no encontrado.');
  const updated: VisitorRecord = {
    ...visitors[idx],
    checked_in_at: visitors[idx].checked_in_at ? null : new Date().toISOString(),
  };
  visitors[idx] = updated;
  writeJson(STORAGE_KEYS.VISITORS, visitors, 'visitor_checkin');
  return updated;
}

export function updateB2BStatusInAdmin(
  b2bId: string,
  status: 'inscrito' | 'verificado'
): B2BRegistrationRecord {
  requireRole(['admin', 'staff']);
  const list = getB2BRegistrations();
  const idx = list.findIndex((b) => b.id === b2bId);
  if (idx === -1) throw new Error('Registro B2B no encontrado.');
  const updated = { ...list[idx], status };
  list[idx] = updated;
  writeJson(STORAGE_KEYS.B2B_REGISTRATIONS, list, 'b2b_update');
  return updated;
}

export function upsertAgendaItemInAdmin(
  item: Omit<AgendaItemRecord, 'id'> & { id?: string }
): AgendaItemRecord {
  requireRole(['admin']);
  const list = getAgendaItems();
  if (item.id) {
    const idx = list.findIndex((a) => a.id === item.id);
    if (idx !== -1) {
      const updated: AgendaItemRecord = { ...list[idx], ...item, id: item.id };
      list[idx] = updated;
      writeJson(STORAGE_KEYS.AGENDA, list, 'agenda_update');
      return updated;
    }
  }
  const created: AgendaItemRecord = {
    ...item,
    id: `ag-${Date.now()}`,
  };
  writeJson(STORAGE_KEYS.AGENDA, [...list, created], 'agenda_create');
  return created;
}

export function deleteAgendaItemInAdmin(id: string): void {
  requireRole(['admin']);
  const list = getAgendaItems().filter((a) => a.id !== id);
  writeJson(STORAGE_KEYS.AGENDA, list, 'agenda_delete');
}

export function upsertBolsaPriceInAdmin(
  row: Omit<BolsaPriceRecord, 'id'> & { id?: string }
): BolsaPriceRecord {
  requireRole(['admin']);
  const list = getBolsaPrices();
  if (row.id) {
    const idx = list.findIndex((b) => b.id === row.id);
    if (idx !== -1) {
      const updated: BolsaPriceRecord = { ...list[idx], ...row, id: row.id };
      list[idx] = updated;
      writeJson(STORAGE_KEYS.BOLSA_PRICES, list, 'bolsa_update');
      return updated;
    }
  }
  const created: BolsaPriceRecord = {
    ...row,
    id: `bolsa-${Date.now()}`,
  };
  writeJson(STORAGE_KEYS.BOLSA_PRICES, [...list, created], 'bolsa_create');
  return created;
}

export function updateEventConfigInAdmin(patch: Partial<EventConfig>): EventConfig {
  requireRole(['admin']);
  const current = getEventConfig();
  const updated: EventConfig = { ...current, ...patch };
  writeJson(STORAGE_KEYS.EVENT_CONFIG, updated, 'event_config_update');
  return updated;
}

// ---------------------------------------------------------------------------
// CSV EXPORT ENGINE (RFC-4180 + UTF-8 BOM FOR SPANISH ACCENTS)
// ---------------------------------------------------------------------------
export function exportRecordsToCsv(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, unknown>>
): string {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = Array.isArray(val) ? val.join('; ') : String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escapeCell(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h.key])).join(',')
  );

  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PHASE 4 ANALYTICS ENGINE (REGISTRATIONS PER DAY & CHANNEL, CHECK-INS PER HOUR, STANDS BY STATUS)
// ---------------------------------------------------------------------------
export interface AdminAnalyticsSummary {
  registrationsByDay: Array<{ date: string; count: number }>;
  registrationsByChannel: Array<{ channel: string; count: number; pct: number }>;
  checkInsByHour: Array<{ hourLabel: string; count: number }>;
  standsByStatus: Array<{
    status: StandStatus;
    label: string;
    color: string;
    count: number;
    pct: number;
    usdTotal: number;
  }>;
  totalVisitors: number;
  totalCheckedIn: number;
  checkInRatePct: number;
}

export function computeAdminAnalytics(nowMs: number = Date.now()): AdminAnalyticsSummary {
  const visitors = getVisitors();
  const stands = getStandsPublic(nowMs);

  // 1. Registrations per day
  const dayMap = new Map<string, number>();
  visitors.forEach((v) => {
    const day = (v.created_at || '').slice(0, 10) || '2026-11-08';
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });
  const registrationsByDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. Registrations per channel (`heard_from` / `utm_source`)
  const channelMap = new Map<string, number>();
  visitors.forEach((v) => {
    const ch = v.heard_from || v.utm_source || 'Directo';
    channelMap.set(ch, (channelMap.get(ch) || 0) + 1);
  });
  const totalVisitors = visitors.length;
  const registrationsByChannel = Array.from(channelMap.entries())
    .map(([channel, count]) => ({
      channel,
      count,
      pct: totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Check-ins per hour (08:00 to 18:00)
  const hourMap = new Map<string, number>();
  ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].forEach(
    (h) => hourMap.set(h, 0)
  );
  let totalCheckedIn = 0;
  visitors.forEach((v) => {
    if (!v.checked_in_at) return;
    totalCheckedIn++;
    const d = new Date(v.checked_in_at);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getUTCHours()).padStart(2, '0') + ':00';
      hourMap.set(hh, (hourMap.get(hh) || 0) + 1);
    }
  });
  const checkInsByHour = Array.from(hourMap.entries())
    .map(([hourLabel, count]) => ({ hourLabel, count }))
    .sort((a, b) => a.hourLabel.localeCompare(b.hourLabel));

  // 4. Stands by status
  const statusOrder: StandStatus[] = ['disponible', 'reservado', 'vendido', 'bloqueado'];
  const totalStands = stands.length || 1;
  const standsByStatus = statusOrder.map((stKey) => {
    const matching = stands.filter((s) => s.effective_status === stKey);
    const usdTotal = matching.reduce(
      (sum, s) => sum + (s.price_usd ?? STAND_TYPE_META[s.type].priceUsd),
      0
    );
    return {
      status: stKey,
      label: STAND_STATUS_META[stKey].label,
      color: stKey === 'vendido' ? '#1F4E9C' : STAND_STATUS_META[stKey].color,
      count: matching.length,
      pct: Math.round((matching.length / totalStands) * 100),
      usdTotal,
    };
  });

  return {
    registrationsByDay,
    registrationsByChannel,
    checkInsByHour,
    standsByStatus,
    totalVisitors,
    totalCheckedIn,
    checkInRatePct: totalVisitors > 0 ? Math.round((totalCheckedIn / totalVisitors) * 100) : 0,
  };
}

