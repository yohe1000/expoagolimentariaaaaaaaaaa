import React, { useState } from 'react';
import { X, QrCode, AlertCircle } from 'lucide-react';
import {
  MUNICIPALITY_OPTIONS,
  VISITOR_PROFILE_OPTIONS,
  INTEREST_OPTIONS,
  HEARD_FROM_OPTIONS,
  VisitorRecord,
} from '../data/seed';
import { registerVisitor } from '../data/store';
import { validateVenezuelanWhatsApp, generateQrToken } from '../utils/passUtils';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (visitor: VisitorRecord) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('+58 ');
  const [municipality, setMunicipality] = useState<string>(MUNICIPALITY_OPTIONS[0]);
  const [profile, setProfile] = useState<string>(VISITOR_PROFILE_OPTIONS[0]);
  const [interests, setInterests] = useState<string[]>(['Hortalizas', 'Papa']);
  const [heardFrom, setHeardFrom] = useState<string>(HEARD_FROM_OPTIONS[0]);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length < 3) {
      setErrorMessage('Por favor ingresa tu nombre y apellido completo.');
      return;
    }

    const phoneValidation = validateVenezuelanWhatsApp(whatsapp);
    if (!phoneValidation.valid) {
      setErrorMessage(phoneValidation.error || 'Número de WhatsApp inválido.');
      return;
    }

    if (interests.length === 0) {
      setErrorMessage('Selecciona al menos un rubro de interés.');
      return;
    }

    if (!consent) {
      setErrorMessage('Debes aceptar que Cenexpo y AgroMarket te contacten por WhatsApp sobre la Expo.');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('utm_medium') || null;
    const qrToken = generateQrToken(name);

    try {
      const newVisitor = registerVisitor(
        {
          name: name.trim(),
          whatsapp: phoneValidation.normalized,
          municipality,
          profile,
          interests,
          consent,
          qr_token: qrToken,
          utm_source: utmSource,
          heard_from: heardFrom,
        },
        honeypot
      );

      onSuccess(newVisitor);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo procesar el registro en este momento.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-registro-titulo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2421]/65 p-0 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-[600px] max-h-[92vh] overflow-y-auto rounded-t-[12px] sm:rounded-[12px] border border-[#1F2421]/20 bg-[#EEF2EF] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1F2421]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-scale-14 font-semibold text-[#1E7A34]">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Pase digital de visitante
            </span>
            <h2
              id="modal-registro-titulo"
              className="mt-1 font-display-wide text-scale-25 text-[#1F2421]"
            >
              Obtén tu pase QR para la Expo
            </h2>
            <p className="mt-1 text-scale-14 text-[#1F2421]/80">
              Completa tus datos en menos de un minuto. Tu pase con código QR se genera al instante y queda guardado para usarlo sin conexión en la entrada del Casino Militar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de registro"
            className="rounded-[4px] p-2 text-[#1F2421]/70 hover:bg-[#1F2421]/10 hover:text-[#1F2421]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {/* Honeypot field hidden from screen readers and visual users */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website-hp">No llenar este campo</label>
            <input
              id="website-hp"
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

          {/* Nombre y Apellido */}
          <div>
            <label htmlFor="visitor-name" className="block text-scale-14 font-semibold text-[#1F2421]">
              Nombre y apellido
            </label>
            <input
              id="visitor-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Carlos Zambrano"
              className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421] focus:border-[#1F4E9C]"
            />
          </div>

          {/* WhatsApp (+58 validation) */}
          <div>
            <label htmlFor="visitor-whatsapp" className="block text-scale-14 font-semibold text-[#1F2421]">
              WhatsApp (formato +58)
            </label>
            <input
              id="visitor-whatsapp"
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+58 414 7589270"
              className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 tabular-nums text-[#1F2421] focus:border-[#1F4E9C]"
            />
            <p className="mt-1 text-[13px] text-[#1F2421]/70">
              Ingresa tu número con código de operadora (414, 424, 412, 416 o 426).
            </p>
          </div>

          {/* Municipio y Perfil */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="visitor-municipality" className="block text-scale-14 font-semibold text-[#1F2421]">
                Municipio de origen
              </label>
              <select
                id="visitor-municipality"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421] focus:border-[#1F4E9C]"
              >
                {MUNICIPALITY_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="visitor-profile" className="block text-scale-14 font-semibold text-[#1F2421]">
                Tu perfil en la Expo
              </label>
              <select
                id="visitor-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421] focus:border-[#1F4E9C]"
              >
                {VISITOR_PROFILE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rubros de interés (multi-select) */}
          <fieldset>
            <legend className="block text-scale-14 font-semibold text-[#1F2421]">
              Rubros de interés (selecciona uno o varios)
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((item) => {
                const selected = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(item)}
                    className={`min-h-[38px] rounded-[4px] border px-3 py-1.5 text-scale-14 font-medium transition-colors ${
                      selected
                        ? 'border-[#1E7A34] bg-[#1E7A34] text-white'
                        : 'border-[#1F2421]/25 bg-white text-[#1F2421] hover:border-[#1E7A34]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ¿Cómo te enteraste? */}
          <div>
            <label htmlFor="visitor-heard-from" className="block text-scale-14 font-semibold text-[#1F2421]">
              ¿Cómo te enteraste?
            </label>
            <select
              id="visitor-heard-from"
              value={heardFrom}
              onChange={(e) => setHeardFrom(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421] focus:border-[#1F4E9C]"
            >
              {HEARD_FROM_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Consent checkbox */}
          <div className="rounded-[4px] border border-[#1F2421]/20 bg-white p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded-[4px] border-[#1F2421]/40 text-[#1E7A34] focus:ring-[#1F4E9C]"
              />
              <span className="text-scale-14 text-[#1F2421]">
                Acepto que Cenexpo y AgroMarket me contacten por WhatsApp sobre la Expo.
              </span>
            </label>
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
              className="min-h-[44px] rounded-[4px] bg-[#1E7A34] px-6 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22] transition-colors"
            >
              Generar mi pase QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
