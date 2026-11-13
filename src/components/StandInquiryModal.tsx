import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { buildWhatsAppBookingLink, validateVenezuelanWhatsApp } from '../utils/passUtils';
import { STAND_TYPE_META } from '../config/venue';
import { createStandRequest, PublicStandView } from '../data/store';
import { StandRequestRecord } from '../data/seed';

interface StandInquiryModalProps {
  isOpen: boolean;
  initialStandCode?: string;
  stands: PublicStandView[];
  whatsappNumbers: string[];
  onClose: () => void;
  onRequestCreated?: (request: StandRequestRecord) => void;
}

export const StandInquiryModal: React.FC<StandInquiryModalProps> = ({
  isOpen,
  initialStandCode = '',
  stands,
  whatsappNumbers,
  onClose,
  onRequestCreated,
}) => {
  const availableStands = useMemo(
    () => stands.filter((s) => s.effective_status === 'disponible'),
    [stands]
  );

  const [standCode, setStandCode] = useState<string>(initialStandCode);
  const [companyName, setCompanyName] = useState('');
  const [rif, setRif] = useState('J-');
  const [contactName, setContactName] = useState('');
  const [whatsapp, setWhatsapp] = useState('+58 ');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState('Insumos agrícolas');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<{
    request: StandRequestRecord;
    holdUntil: string;
    standMetaLabel: string;
    priceUsd: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setSubmittedRequest(null);
    if (initialStandCode) {
      const normalized = initialStandCode.trim().toUpperCase();
      const match = availableStands.find((s) => s.code.toUpperCase() === normalized);
      if (match) {
        setStandCode(match.code);
        return;
      }
    }
    if (availableStands.length > 0 && !availableStands.some((s) => s.code === standCode)) {
      setStandCode(availableStands[0].code);
    }
  }, [isOpen, initialStandCode, availableStands]);

  if (!isOpen) return null;

  const selectedStandObj =
    availableStands.find((s) => s.code.toUpperCase() === standCode.toUpperCase()) ||
    stands.find((s) => s.code.toUpperCase() === standCode.toUpperCase()) ||
    null;

  const primaryPhone = whatsappNumbers[0] || '+58 414 7589270';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!standCode.trim()) {
      setErrorMessage('Selecciona un stand disponible en el plano.');
      return;
    }

    if (companyName.trim().length < 2) {
      setErrorMessage('Ingresa el nombre oficial de tu empresa, marca o institución.');
      return;
    }

    if (rif.trim().length < 5) {
      setErrorMessage('Ingresa el RIF de tu empresa (ej. J-12345678-9).');
      return;
    }

    if (contactName.trim().length < 3) {
      setErrorMessage('Ingresa el nombre y cargo de la persona de contacto.');
      return;
    }

    const phoneValidation = validateVenezuelanWhatsApp(whatsapp);
    if (!phoneValidation.valid) {
      setErrorMessage(phoneValidation.error || 'Número de WhatsApp inválido.');
      return;
    }

    try {
      const targetStand = stands.find(
        (s) => s.code.toUpperCase() === standCode.trim().toUpperCase()
      );
      const typeMeta = targetStand ? STAND_TYPE_META[targetStand.type] : null;
      const priceUsd = targetStand?.price_usd ?? typeMeta?.priceUsd ?? 400;
      const metaLabel = typeMeta ? typeMeta.dimensionsLabel : '5,00 m²';

      const result = createStandRequest(
        {
          stand_code: standCode.trim().toUpperCase(),
          company_name: companyName.trim(),
          rif: rif.trim().toUpperCase(),
          contact_name: contactName.trim(),
          whatsapp: phoneValidation.normalized,
          email: email.trim() || 'contacto@empresa.com.ve',
          sector,
          notes: notes.trim(),
        },
        honeypot
      );

      setSubmittedRequest({
        request: result.request,
        holdUntil:
          result.updatedStand.hold_until ||
          result.request.hold_until ||
          new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        standMetaLabel: metaLabel,
        priceUsd,
      });

      if (onRequestCreated) {
        onRequestCreated(result.request);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la reserva del stand en este momento.'
      );
    }
  };

  if (submittedRequest) {
    const req = submittedRequest.request;
    const holdDateFormatted = new Date(submittedRequest.holdUntil).toLocaleString('es-VE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const composedMessage = [
      `Hola equipo de Cenexpo C.A., acabo de registrar la reserva por 48 horas del espacio *${req.stand_code}* para la Expo Agroalimentaria La Grita 2026 (20 al 22 de noviembre).`,
      `• Código de solicitud: ${req.id}`,
      `• Espacio reservado (48 h): ${req.stand_code} (${submittedRequest.standMetaLabel} · $${submittedRequest.priceUsd} USD a Tasa BCV)`,
      `• Empresa / Marca: ${req.company_name}`,
      `• RIF: ${req.rif}`,
      `• Persona de contacto: ${req.contact_name}`,
      `• WhatsApp: ${req.whatsapp}`,
      `• Rubro / Sector: ${req.sector}`,
      req.notes ? `• Requerimientos adicionales: ${req.notes}` : '',
      `• Bloqueo activo hasta: ${holdDateFormatted}`,
      'Quedo atento para coordinar la facturación y confirmación definitiva del stand.',
    ]
      .filter(Boolean)
      .join('\n');

    const waUrl = buildWhatsAppBookingLink(primaryPhone, composedMessage);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-stand-confirmado"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2421]/70 p-0 sm:p-4 overflow-y-auto"
      >
        <div className="relative w-full max-w-[580px] max-h-[92vh] overflow-y-auto rounded-t-[12px] sm:rounded-[12px] border-2 border-[#1E7A34] bg-[#EEF2EF] p-5 sm:p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[#1F2421]/15 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#D9822B]/15 px-2.5 py-1 text-scale-14 font-bold text-[#9A5512]">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Bloqueo temporal activo por 48 horas
              </span>
              <h2
                id="modal-stand-confirmado"
                className="mt-2 font-display-wide text-scale-25 text-[#1F2421]"
              >
                Espacio {req.stand_code} reservado por 48 h
              </h2>
              <p className="mt-1 text-scale-14 text-[#1F2421]/80">
                El stand <strong>{req.stand_code}</strong> ya aparece como{' '}
                <strong>Reservado (48 h)</strong> en tiempo real dentro de la planimetría del Casino Militar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar confirmación de reserva"
              className="rounded-[4px] p-2 text-[#1F2421]/70 hover:bg-[#1F2421]/10 hover:text-[#1F2421]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 rounded-[8px] border border-[#1F2421]/15 bg-white p-4 space-y-2 text-scale-14">
            <div className="flex items-center justify-between gap-2 border-b border-[#1F2421]/10 pb-2">
              <span className="text-[#1F2421]/70">Espacio bloqueado:</span>
              <span className="font-display-wide text-scale-20 text-[#0F3D22]">
                Stand {req.stand_code} ({submittedRequest.standMetaLabel})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#1F2421]/70">Inversión oficial (Tasa BCV):</span>
              <span className="font-bold tabular-nums text-[#1F2421]">
                ${submittedRequest.priceUsd} USD
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#1F2421]/70">Empresa solicitante:</span>
              <span className="font-semibold text-[#1F2421]">
                {req.company_name} ({req.rif})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#1F2421]/70">Contacto / WhatsApp:</span>
              <span className="tabular-nums text-[#1F2421]">
                {req.contact_name} · {req.whatsapp}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-[#9A5512] font-semibold">
              <span>Vencimiento del bloqueo (48 h):</span>
              <span className="tabular-nums">{holdDateFormatted}</span>
            </div>
          </div>

          <div className="mt-4 rounded-[8px] border border-[#1E7A34]/30 bg-[#1E7A34]/10 p-3.5 text-scale-14 text-[#0F3D22]">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1E7A34]" aria-hidden="true" />
              Paso final: envía tu mensaje prellenado a Cenexpo C.A.
            </p>
            <p className="mt-1 text-[#1F2421]/85">
              Haz clic en el botón de abajo para abrir WhatsApp con todos los datos de tu reserva listos para formalizar el pago antes de que venzan las 48 horas.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-[4px] border border-[#1F2421]/25 bg-white px-5 py-2.5 text-scale-14 font-semibold text-[#1F2421] hover:bg-[#1F2421]/5"
            >
              Volver al plano 2D
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[4px] bg-[#1E7A34] px-6 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Enviar solicitud prellenada por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-stand-titulo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2421]/65 p-0 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-[600px] max-h-[92vh] overflow-y-auto rounded-t-[12px] sm:rounded-[12px] border border-[#1F2421]/20 bg-[#EEF2EF] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1F2421]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-scale-14 font-semibold text-[#1F4E9C]">
              <Store className="h-4 w-4" aria-hidden="true" />
              Reserva oficial con bloqueo automático por 48 horas
            </span>
            <h2
              id="modal-stand-titulo"
              className="mt-1 font-display-wide text-scale-25 text-[#1F2421]"
            >
              Solicita y reserva tu stand en el plano
            </h2>
            <p className="mt-1 text-scale-14 text-[#1F2421]/80">
              Solo puedes seleccionar espacios en estado <strong>Disponible</strong>. Al enviar tu solicitud, el stand queda bloqueado en estado <strong>Reservado por 48 horas</strong> mientras formalizas con Cenexpo C.A.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de solicitud de stand"
            className="rounded-[4px] p-2 text-[#1F2421]/70 hover:bg-[#1F2421]/10 hover:text-[#1F2421]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {/* Hidden Honeypot input for anti-spam protection */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="stand-website-hp">No llenar este campo</label>
            <input
              id="stand-website-hp"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[4px] border border-[#B23A2E] bg-[#FBECEB] p-3 text-scale-14 text-[#B23A2E]"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Available Stand Selector (Available stands only!) */}
          <div className="rounded-[8px] border border-[#1E7A34]/30 bg-white p-3.5">
            <label htmlFor="stand-code-select" className="block text-scale-14 font-semibold text-[#1F2421]">
              Espacio disponible a reservar (bloqueo por 48 h)
            </label>
            <select
              id="stand-code-select"
              value={standCode}
              onChange={(e) => setStandCode(e.target.value)}
              className="mt-1.5 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-[#EEF2EF]/60 px-3 py-2 text-scale-16 font-semibold tabular-nums text-[#1F2421] focus:border-[#1F4E9C] focus:bg-white"
            >
              {availableStands.map((s) => {
                const meta = STAND_TYPE_META[s.type];
                return (
                  <option key={s.id} value={s.code}>
                    {s.code.startsWith('EA-') ? `Zona ${s.code}` : `Stand ${s.code}`} —{' '}
                    {meta.dimensionsLabel} · ${s.price_usd ?? meta.priceUsd} USD ({s.location_label})
                  </option>
                );
              })}
            </select>
            {selectedStandObj && (
              <p className="mt-1.5 text-[13px] text-[#0F3D22] font-medium">
                Medidas: <strong>{STAND_TYPE_META[selectedStandObj.type].dimensionsLabel}</strong> ·
                Inversión oficial: <strong>${selectedStandObj.price_usd ?? STAND_TYPE_META[selectedStandObj.type].priceUsd} USD (Tasa BCV)</strong> · Ubicación: {selectedStandObj.location_label}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="stand-company" className="block text-scale-14 font-semibold text-[#1F2421]">
                Empresa o marca comercial
              </label>
              <input
                id="stand-company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej. Agroinsumos Los Andes C.A."
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>

            <div>
              <label htmlFor="stand-rif" className="block text-scale-14 font-semibold text-[#1F2421]">
                RIF fiscal
              </label>
              <input
                id="stand-rif"
                type="text"
                required
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="J-40125896-3"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 uppercase tabular-nums text-[#1F2421]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="stand-contact" className="block text-scale-14 font-semibold text-[#1F2421]">
                Persona de contacto y cargo
              </label>
              <input
                id="stand-contact"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej. Ing. María Contreras (Gerente)"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>

            <div>
              <label htmlFor="stand-whatsapp" className="block text-scale-14 font-semibold text-[#1F2421]">
                WhatsApp corporativo (+58)
              </label>
              <input
                id="stand-whatsapp"
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+58 414 7589270"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 tabular-nums text-[#1F2421]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="stand-email" className="block text-scale-14 font-semibold text-[#1F2421]">
                Correo electrónico
              </label>
              <input
                id="stand-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gerencia@tuempresa.com"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>

            <div>
              <label htmlFor="stand-sector" className="block text-scale-14 font-semibold text-[#1F2421]">
                Sector productivo
              </label>
              <select
                id="stand-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421]"
              >
                <option value="Insumos agrícolas">Insumos agrícolas y fertilizantes</option>
                <option value="Maquinaria y transporte">Maquinaria, camiones y transporte</option>
                <option value="Tecnología e innovación">Tecnología, drones y riego</option>
                <option value="Agroindustria y alimentos">Agroindustria y alimentos procesados</option>
                <option value="Cárnico y lácteo">Cárnico, lácteo y ganadería</option>
                <option value="Apicultura">Apicultura y polinización</option>
                <option value="Finanzas y servicios">Banca, seguros y servicios</option>
                <option value="Institución / Gremio">Institución, universidad o gremio</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="stand-notes" className="block text-scale-14 font-semibold text-[#1F2421]">
              Requerimientos técnicos o comentarios (opcional)
            </label>
            <textarea
              id="stand-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Requerimos toma eléctrica 110V para equipos de demostración..."
              className="mt-1 w-full rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-14 text-[#1F2421]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-[4px] border border-[#1F2421]/15 bg-white p-3 text-[13px] text-[#1F2421]/80">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#0F3D22]">
              <ShieldCheck className="h-4 w-4 text-[#1E7A34]" aria-hidden="true" />
              Protección RLS activa · Bloqueo inmediato por 48 h
            </span>
            <span className="tabular-nums font-medium">{whatsappNumbers[0]}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-[4px] border border-[#1F2421]/25 bg-white px-5 py-2.5 text-scale-14 font-semibold text-[#1F2421] hover:bg-[#1F2421]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[4px] bg-[#1E7A34] px-6 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              Reservar {standCode ? `Stand ${standCode}` : 'espacio'} por 48 horas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
