import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInitialStands, getEffectiveStandStatus, VENUE_DIMENSIONS } from './venue';
import { INITIAL_EXHIBITORS, INITIAL_ZONES, INITIAL_BOLSA_PRICES } from '../data/seed';
import {
  validateVenezuelanWhatsApp,
  calculateEventCountdown,
  buildIcsCalendarContent,
} from '../utils/passUtils';
import {
  createStandRequest,
  loginWithEmail,
  confirmStandRequestInAdmin,
  getStandsPublic,
  exportRecordsToCsv,
  resetStoreAndRateLimitsForTest,
  computeAdminAnalytics,
  markVisitorCheckInByToken,
  getEventConfig,
  updateEventConfigInAdmin,
} from '../data/store';

test('generateInitialStands generates 51 Salón de Exposiciones stands (01-51 including B05) and 8 Expoauto zones (EA-01..EA-08) matching Casino Militar PDF', () => {
  const stands = generateInitialStands();
  assert.equal(stands.length, 59); // 51 interior + 8 exterior

  const salonStands = stands.filter((s) => s.zone_id === 'zone-exposicion');
  const expoautoStands = stands.filter((s) => s.zone_id === 'zone-automotriz');

  assert.equal(salonStands.length, 51);
  assert.equal(expoautoStands.length, 8);
  assert.equal(stands.some((s) => s.code === 'B05'), true);

  const countsByType = stands.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  // 9 Rosado stands (01..09): 2.5 x 3.0 m = 7.50 m², $480
  assert.equal(countsByType.rosado, 9);
  // 42 Turquesa stands (10..51): 2.5 x 2.0 m = 5.00 m², $400
  assert.equal(countsByType.turquesa, 42);
  // 8 Expoauto zones: 4 of 100m² ($1600), 1 of 110m² ($1750), 1 of 140m² ($1950), 2 of 170m² ($2100)
  assert.equal(countsByType.expoauto_100, 4);
  assert.equal(countsByType.expoauto_110, 1);
  assert.equal(countsByType.expoauto_140, 1);
  assert.equal(countsByType.expoauto_170, 2);

  // Verify exact dimensions of Salon de Exposiciones
  assert.equal(VENUE_DIMENSIONS.HALL_W, 38.0);
  assert.equal(VENUE_DIMENSIONS.HALL_L, 21.5);
  assert.equal(VENUE_DIMENSIONS.HALL_TOTAL_AREA_M2, 817.0);
});

test('getEffectiveStandStatus returns disponible when reservado hold_until has expired', () => {
  const [sample] = generateInitialStands();
  const expiredStand = {
    ...sample,
    status: 'reservado' as const,
    hold_until: '2026-11-01T00:00:00Z',
  };
  const activeStand = {
    ...sample,
    status: 'reservado' as const,
    hold_until: '2026-11-15T00:00:00Z',
  };
  const now = new Date('2026-11-08T12:00:00Z').getTime();

  assert.equal(getEffectiveStandStatus(expiredStand, now), 'disponible');
  assert.equal(getEffectiveStandStatus(activeStand, now), 'reservado');
});

test('seed data contains 26 organizations (3 confirmed Grand Official Sponsors: Banco Sofitasa, BISA, AgroMarket + 23 in por_reconfirmar), 5 zones, and 3 sample bolsa prices', () => {
  assert.equal(INITIAL_EXHIBITORS.length, 26);
  const confirmed = INITIAL_EXHIBITORS.filter((org) => org.status === 'confirmado');
  const pending = INITIAL_EXHIBITORS.filter((org) => org.status === 'por_reconfirmar');
  assert.equal(confirmed.length, 3);
  assert.equal(pending.length, 23);
  assert.deepEqual(
    confirmed.map((c) => c.id),
    ['org-sofitasa', 'org-bisa', 'org-agromarket']
  );
  assert.equal(INITIAL_ZONES.length, 5);
  assert.equal(INITIAL_BOLSA_PRICES.length, 3);
  assert.equal(
    INITIAL_BOLSA_PRICES.every((row) => row.is_sample === true),
    true
  );
});

test('validateVenezuelanWhatsApp validates and formats +58 numbers', () => {
  const res1 = validateVenezuelanWhatsApp('+58 414 7589270');
  assert.equal(res1.valid, true);
  assert.equal(res1.normalized, '+58 414 7589270');

  const res2 = validateVenezuelanWhatsApp('0424-7100779');
  assert.equal(res2.valid, true);
  assert.equal(res2.normalized, '+58 424 7100779');

  const bad = validateVenezuelanWhatsApp('12345');
  assert.equal(bad.valid, false);
});

test('calculateEventCountdown computes days and hours before Nov 20, 2026 and detects Nov 22 Bolsa day', () => {
  const nov8 = new Date('2026-11-08T08:00:00-04:00').getTime();
  const cd = calculateEventCountdown(nov8);
  assert.equal(cd.days, 12);
  assert.equal(cd.hours, 0);
  assert.equal(cd.isBolsaLiveDay, false);

  const nov22 = new Date('2026-11-22T10:00:00-04:00').getTime();
  const cdLive = calculateEventCountdown(nov22);
  assert.equal(cdLive.isLive, true);
  assert.equal(cdLive.isBolsaLiveDay, true);
});

test('buildIcsCalendarContent returns valid VCALENDAR with event dates', () => {
  const ics = buildIcsCalendarContent('José Pérez', 'https://expo.agromarket.com.ve/pase/LG26-JOSE-1234');
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261120'));
  assert.ok(ics.includes('José Pérez'));
});

test('Phase 2: requesting B05 places a 48h hold (reservado), blocks duplicate requests, enforces RBAC from profiles, and confirms B05 to vendido', () => {
  resetStoreAndRateLimitsForTest();

  // 1. Honeypot trap must reject spam insert
  assert.throws(() => {
    createStandRequest(
      {
        stand_code: 'B05',
        company_name: 'Spam Bot Inc',
        rif: 'J-00000000-0',
        contact_name: 'Bot',
        whatsapp: '+58 414 0000000',
        email: 'bot@spam.com',
        sector: 'Insumos agrícolas',
        notes: '',
      },
      'http://spam-link.com'
    );
  }, /anti-spam/i);

  // 2. Legitimate request on B05 sets status='reservado' and 48h hold
  const { request, updatedStand } = createStandRequest(
    {
      stand_code: 'B05',
      company_name: 'AgroAndes Semillas C.A.',
      rif: 'J-41258963-1',
      contact_name: 'Ing. Roberto Mora',
      whatsapp: '+58 414 7589270',
      email: 'rmora@agroandes.com.ve',
      sector: 'Insumos agrícolas',
      notes: 'Stand B05 solicitado desde el plano 2D',
    },
    ''
  );

  assert.equal(updatedStand.code, 'B05');
  assert.equal(updatedStand.status, 'reservado');
  assert.ok(updatedStand.hold_until);

  // 3. Second request on B05 while reserved must fail
  assert.throws(() => {
    createStandRequest(
      {
        stand_code: 'B05',
        company_name: 'Otra Empresa C.A.',
        rif: 'J-22222222-2',
        contact_name: 'Pedro Pérez',
        whatsapp: '+58 424 7100779',
        email: 'pedro@otra.com',
        sector: 'Apicultura',
        notes: '',
      },
      ''
    );
  }, /no está disponible/i);

  // 4. Staff role from profiles cannot confirm stand sale (requires admin role)
  loginWithEmail('staff@cenexpo.com.ve', 'cenexpo2026');
  assert.throws(() => {
    confirmStandRequestInAdmin(request.id);
  }, /RLS/i);

  // 5. Admin role from profiles confirms stand B05 and turns it into 'vendido'
  loginWithEmail('admin@cenexpo.com.ve', 'cenexpo2026');
  const confirmed = confirmStandRequestInAdmin(request.id);
  assert.equal(confirmed.stand.code, 'B05');
  assert.equal(confirmed.stand.status, 'vendido');
  assert.equal(confirmed.exhibitor.name, 'AgroAndes Semillas C.A.');
  assert.equal(confirmed.exhibitor.status, 'confirmado');

  // Verify public view reflects B05 as vendido
  const b05Public = getStandsPublic().find((s) => s.code === 'B05');
  assert.equal(b05Public?.effective_status, 'vendido');
  assert.equal(b05Public?.exhibitor?.name, 'AgroAndes Semillas C.A.');
});

test('Phase 2: exportRecordsToCsv outputs valid RFC-4180 CSV with UTF-8 BOM', () => {
  const csv = exportRecordsToCsv(
    [
      { key: 'code', label: 'code' },
      { key: 'company', label: 'company' },
      { key: 'status', label: 'status' },
    ],
    [{ code: 'B05', company: 'AgroAndes, C.A.', status: 'vendido' }]
  );
  assert.equal(csv.startsWith('\uFEFFcode,company,status\r\n'), true);
  assert.equal(csv.includes('B05,"AgroAndes, C.A.",vendido'), true);
});

test('Phase 4: gallery_enabled defaults to false, markVisitorCheckInByToken records check-in, and computeAdminAnalytics aggregates metrics', () => {
  resetStoreAndRateLimitsForTest();
  const cfg = getEventConfig();
  assert.equal(cfg.gallery_enabled, false);

  const beforeAnalytics = computeAdminAnalytics();
  assert.equal(beforeAnalytics.totalVisitors, 9);
  assert.equal(beforeAnalytics.totalCheckedIn, 6);
  assert.ok(beforeAnalytics.registrationsByDay.length >= 4);
  assert.ok(beforeAnalytics.registrationsByChannel.length >= 4);
  assert.ok(beforeAnalytics.checkInsByHour.length >= 4);
  assert.equal(beforeAnalytics.standsByStatus.length, 4);

  // Mark pending visitor LG26-G707-DUQU as checked in
  const checkInResult = markVisitorCheckInByToken(
    'LG26-G707-DUQU',
    '2026-11-20T11:15:00-04:00'
  );
  assert.equal(checkInResult.alreadyCheckedIn, false);
  assert.equal(checkInResult.visitor.name, 'Pedro Antonio Duque');

  const afterAnalytics = computeAdminAnalytics();
  assert.equal(afterAnalytics.totalCheckedIn, 7);

  // Admin can enable post-event gallery
  loginWithEmail('admin@cenexpo.com.ve', 'cenexpo2026');
  const updatedCfg = updateEventConfigInAdmin({ gallery_enabled: true });
  assert.equal(updatedCfg.gallery_enabled, true);
});


