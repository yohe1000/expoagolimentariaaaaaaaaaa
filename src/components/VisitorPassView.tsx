import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, CalendarPlus, Share2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { findVisitorByToken } from '../data/store';
import { VisitorRecord } from '../data/seed';
import { buildIcsCalendarContent } from '../utils/passUtils';
import { OrganizaPresentaLockup } from './BrandLockups';

interface VisitorPassViewProps {
  token: string;
  onBackHome: () => void;
}

export const VisitorPassView: React.FC<VisitorPassViewProps> = ({ token, onBackHome }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const storedVisitor = findVisitorByToken(token);

  // Fallback visitor object if a valid token link is opened directly on another device
  const visitor: VisitorRecord = storedVisitor || {
    id: `vis-${token}`,
    name: 'Visitante acreditado',
    whatsapp: '+58',
    municipality: 'Jáuregui',
    profile: 'Visitante',
    interests: ['Agricultura andina'],
    consent: true,
    qr_token: token.toUpperCase(),
    utm_source: null,
    heard_from: 'Enlace directo',
    checked_in_at: null,
    created_at: new Date().toISOString(),
  };

  const passUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/pase/${encodeURIComponent(visitor.qr_token)}`
      : `https://expo.agromarket.com.ve/pase/${encodeURIComponent(visitor.qr_token)}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(visitor.qr_token, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0F3D22',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      active = false;
    };
  }, [visitor.qr_token]);

  const handleDownloadPng = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#0F3D22';
      ctx.fillRect(0, 0, 800, 1120);

      // Top yellow bar
      ctx.fillStyle = '#F4C20D';
      ctx.fillRect(0, 0, 800, 18);

      // Inner white pass card
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(48, 64, 704, 960);

      // Header band inside card
      ctx.fillStyle = '#1E7A34';
      ctx.fillRect(48, 64, 704, 150);

      ctx.fillStyle = '#F4C20D';
      ctx.font = 'bold 22px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PASE DIGITAL DE VISITANTE', 400, 114);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 34px Archivo, sans-serif';
      ctx.fillText('Expo Agroalimentaria La Grita 2026', 400, 162);

      ctx.fillStyle = '#EEF2EF';
      ctx.font = '600 20px Archivo, sans-serif';
      ctx.fillText('20, 21 y 22 de noviembre de 2026', 400, 196);

      // Visitor Name & Profile
      ctx.fillStyle = '#1F2421';
      ctx.font = '800 38px Archivo, sans-serif';
      ctx.fillText(visitor.name, 400, 290);

      ctx.fillStyle = '#1E7A34';
      ctx.font = '600 22px Archivo, sans-serif';
      ctx.fillText(`${visitor.profile} · Municipio ${visitor.municipality}`, 400, 330);

      // Draw QR code image
      if (qrDataUrl) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = qrDataUrl;
        });
        ctx.strokeStyle = '#1F2421';
        ctx.lineWidth = 2;
        ctx.strokeRect(230, 370, 340, 340);
        ctx.drawImage(img, 240, 380, 320, 320);
      }

      // Token code
      ctx.fillStyle = '#1F2421';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(visitor.qr_token, 400, 755);

      // Venue & Hours
      ctx.fillStyle = '#1F2421';
      ctx.font = 'bold 24px Archivo, sans-serif';
      ctx.fillText('Casino Militar de La Grita, Táchira', 400, 825);

      ctx.fillStyle = '#4A524D';
      ctx.font = '500 20px Archivo, sans-serif';
      ctx.fillText('Frente a la Vía Llano Los Zambranos · Horario por confirmar', 400, 860);

      // Footer inside card
      ctx.fillStyle = '#0F3D22';
      ctx.font = 'bold 20px Archivo, sans-serif';
      ctx.fillText('Organiza: Cenexpo C.A.   |   Presenta: AgroMarket', 400, 965);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `pase-expo-la-grita-${visitor.qr_token.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadStatus('Pase descargado en formato PNG.');
    } catch {
      setDownloadStatus('No se pudo generar el PNG en este dispositivo.');
    }
  };

  const handleDownloadIcs = () => {
    const icsContent = buildIcsCalendarContent(visitor.name, passUrl);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expo-agroalimentaria-la-grita-2026.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus('Archivo de calendario (.ics) descargado.');
  };

  const whatsappShareText = `Aquí está mi pase digital para la Expo Agroalimentaria La Grita 2026 (20, 21 y 22 de noviembre en el Casino Militar de La Grita): ${passUrl}`;
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;

  return (
    <div className="min-h-screen bg-[#EEF2EF] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-[540px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-[#1F2421]/20 bg-white px-4 py-2 text-scale-14 font-semibold text-[#1F2421] hover:bg-[#1F2421]/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio de la Expo
          </button>
          <span className="inline-flex items-center gap-1.5 text-scale-14 font-semibold text-[#1E7A34]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Disponible sin conexión
          </span>
        </div>

        {/* Pass Card (The ONLY centered text element per design direction) */}
        <article
          aria-label="Pase digital de visitante con código QR"
          className="overflow-hidden rounded-[12px] border-2 border-[#0F3D22] bg-white text-center shadow-xl"
        >
          <div className="bg-[#0F3D22] bg-surcos-dark px-6 py-6 text-[#EEF2EF]">
            <p className="text-scale-14 font-semibold text-[#F4C20D]">
              Pase personal de acceso
            </p>
            <h1 className="mt-1 font-display-wide text-scale-25 sm:text-scale-31 text-white">
              Expo Agroalimentaria La Grita 2026
            </h1>
            <p className="mt-1 text-scale-16 font-medium tabular-nums text-[#EEF2EF]/90">
              20, 21 y 22 de noviembre de 2026
            </p>
          </div>

          <div className="px-6 py-6">
            <p className="text-scale-14 text-[#1F2421]/70">Visitante registrado</p>
            <h2 className="mt-0.5 font-display-wide text-scale-31 text-[#1F2421]">
              {visitor.name}
            </h2>
            <p className="mt-1 text-scale-14 font-semibold text-[#1E7A34]">
              {visitor.profile}, Municipio {visitor.municipality}
            </p>

            {/* QR Code Box */}
            <div className="my-6 inline-flex flex-col items-center justify-center rounded-[12px] border-2 border-[#1F2421]/15 bg-[#EEF2EF]/50 p-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Código QR del pase ${visitor.qr_token} para ${visitor.name}`}
                  className="h-56 w-56 rounded-[4px] bg-white p-2"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center bg-white text-scale-14 text-[#1F2421]/70">
                  Generando código QR...
                </div>
              )}
              <span className="mt-2 font-mono text-scale-16 font-bold tracking-wider tabular-nums text-[#0F3D22]">
                {visitor.qr_token}
              </span>
            </div>

            <div className="border-t border-[#1F2421]/10 pt-4 text-center">
              <p className="font-display-wide text-scale-16 text-[#1F2421]">
                Casino Militar de La Grita, Táchira
              </p>
              <p className="mt-0.5 text-scale-14 text-[#1F2421]/75">
                Frente a la Vía Llano Los Zambranos, Horario por confirmar
              </p>
            </div>

            {downloadStatus && (
              <p
                role="status"
                className="mt-4 rounded-[4px] bg-[#EBF7EE] px-3 py-2 text-scale-14 font-medium text-[#1E7A34]"
              >
                {downloadStatus}
              </p>
            )}

            {/* Required 3 Pass Action Buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#1E7A34] px-5 py-3 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                Descargar mi pase
              </button>

              <a
                href={whatsappShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#1F4E9C] bg-white px-5 py-2.5 text-scale-16 font-semibold text-[#1F4E9C] hover:bg-[#1F4E9C] hover:text-white transition-colors"
              >
                <Share2 className="h-5 w-5" aria-hidden="true" />
                Enviar a mi WhatsApp
              </a>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#1F2421]/25 bg-[#EEF2EF] px-5 py-2.5 text-scale-16 font-semibold text-[#1F2421] hover:bg-[#1F2421]/10 transition-colors"
              >
                <CalendarPlus className="h-5 w-5" aria-hidden="true" />
                Agregar al calendario
              </button>
            </div>
          </div>

          <div className="border-t border-[#1F2421]/15 bg-[#EEF2EF] px-6 py-4 text-left">
            <OrganizaPresentaLockup variant="light" />
          </div>
        </article>
      </div>
    </div>
  );
};
