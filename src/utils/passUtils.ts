/**
 * Pure utility functions for visitor registration validation,
 * countdown calculation, ICS calendar file generation, and WhatsApp links.
 */

export function validateVenezuelanWhatsApp(input: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const digits = input.replace(/[^\d+]/g, '');
  // Accept +584141234567, 584141234567, or 04141234567 (automatically normalized to +58...)
  let cleanDigits = digits.startsWith('+') ? digits.slice(1) : digits;

  if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
    cleanDigits = '58' + cleanDigits.slice(1);
  } else if (cleanDigits.length === 10 && /^(412|414|424|416|426|276|274)/.test(cleanDigits)) {
    cleanDigits = '58' + cleanDigits;
  }

  const isValidVzla = /^58(412|414|424|416|426|2\d{2})\d{7}$/.test(cleanDigits);
  if (!isValidVzla) {
    return {
      valid: false,
      normalized: input.trim(),
      error: 'Ingresa un número de WhatsApp válido de Venezuela (ej. +58 414 7589270 o 0414-7589270).',
    };
  }

  const operator = cleanDigits.slice(2, 5);
  const subscriber = cleanDigits.slice(5);
  return {
    valid: true,
    normalized: `+58 ${operator} ${subscriber}`,
  };
}

export function generateQrToken(name: string, nowMs: number = Date.now()): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 6)
    .toUpperCase() || 'VIS';
  const timePart = (nowMs % 1000000).toString(36).toUpperCase().padStart(4, '0');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `LG26-${slug}-${timePart}${randomPart}`;
}

export function calculateEventCountdown(nowMs: number = Date.now()): {
  days: number;
  hours: number;
  isLive: boolean;
  isEnded: boolean;
  isBolsaLiveDay: boolean;
} {
  // Event starts Nov 20, 2026 at 08:00:00 VET (UTC-4) -> 2026-11-20T12:00:00Z
  const startMs = new Date('2026-11-20T08:00:00-04:00').getTime();
  const endMs = new Date('2026-11-22T20:00:00-04:00').getTime();

  const bolsaStartMs = new Date('2026-11-22T00:00:00-04:00').getTime();
  const bolsaEndMs = new Date('2026-11-22T23:59:59-04:00').getTime();
  const isBolsaLiveDay = nowMs >= bolsaStartMs && nowMs <= bolsaEndMs;

  if (nowMs >= endMs) {
    return { days: 0, hours: 0, isLive: false, isEnded: true, isBolsaLiveDay };
  }
  if (nowMs >= startMs) {
    return { days: 0, hours: 0, isLive: true, isEnded: false, isBolsaLiveDay };
  }

  const diffHoursTotal = Math.max(0, Math.floor((startMs - nowMs) / (1000 * 60 * 60)));
  const days = Math.floor(diffHoursTotal / 24);
  const hours = diffHoursTotal % 24;

  return { days, hours, isLive: false, isEnded: false, isBolsaLiveDay };
}

export function buildIcsCalendarContent(visitorName: string, passUrl: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Expo Agroalimentaria La Grita 2026//Cenexpo & AgroMarket//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:expo-la-grita-2026@agromarket.com.ve',
    'SUMMARY:Expo Agroalimentaria La Grita 2026',
    'DTSTART;VALUE=DATE:20261120',
    'DTEND;VALUE=DATE:20261123',
    'LOCATION:Casino Militar de La Grita (Hotel Club Casino Militar Edgar Reyes Zumeta)\\, Vía Llano Los Zambranos\\, La Grita\\, Táchira\\, Venezuela',
    `DESCRIPTION:Pase digital de ${visitorName}. Enlace a tu pase QR: ${passUrl} — Organiza Cenexpo C.A. · Presenta AgroMarket.`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function buildWhatsAppBookingLink(phoneFormatted: string, customMessage: string): string {
  const digitsOnly = phoneFormatted.replace(/\D/g, '');
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(customMessage)}`;
}
