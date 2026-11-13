import React, { useState } from 'react';
import { X, Handshake, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { createB2BRegistration } from '../data/store';
import { B2BRegistrationRecord, B2BRoleType, INTEREST_OPTIONS, MUNICIPALITY_OPTIONS } from '../data/seed';
import { validateVenezuelanWhatsApp, buildWhatsAppBookingLink } from '../utils/passUtils';

interface B2BRegistrationModalProps {
  isOpen: boolean;
  whatsappPrimary: string;
  onClose: () => void;
}

export const B2BRegistrationModal: React.FC<B2BRegistrationModalProps> = ({
  isOpen,
  whatsappPrimary,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [rif, setRif] = useState('J-');
  const [contactName, setContactName] = useState('');
  const [whatsapp, setWhatsapp] = useState('+58 ');
  const [municipality, setMunicipality] = useState<string>(MUNICIPALITY_OPTIONS[0]);
  const [roleType, setRoleType] = useState<B2BRoleType>('Comprador mayorista');
  const [rubros, setRubros] = useState<string[]>(['Hortalizas', 'Papa']);
  const [offerOrDemand, setOfferOrDemand] = useState('10 a 30 toneladas mensuales');
  const [honeypot, setHoneypot] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<B2BRegistrationRecord | null>(null);

  if (!isOpen) return null;

  const toggleRubro = (item: string) => {
    setRubros((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (companyName.trim().length < 2) {
      setErrorMessage('Ingresa el nombre de tu empresa, finca o comercializadora.');
      return;
    }

    if (contactName.trim().length < 3) {
      setErrorMessage('Ingresa el nombre y apellido del representante en la mesa de negocios.');
      return;
    }

    const phoneValidation = validateVenezuelanWhatsApp(whatsapp);
    if (!phoneValidation.valid) {
      setErrorMessage(phoneValidation.error || 'Número de WhatsApp inválido.');
      return;
    }

    if (rubros.length === 0) {
      setErrorMessage('Selecciona al menos un rubro para tu agenda B2B.');
      return;
    }

    try {
      const record = createB2BRegistration(
        {
          company_name: companyName.trim(),
          rif: rif.trim().toUpperCase(),
          contact_name: contactName.trim(),
          whatsapp: phoneValidation.normalized,
          municipality,
          role_type: roleType,
          rubros,
          offer_or_demand: offerOrDemand.trim(),
        },
        honeypot
      );
      setCreatedRecord(record);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo registrar tu solicitud B2B.'
      );
    }
  };

  if (createdRecord) {
    const waMsg = [
      'Hola equipo de Cenexpo C.A., acabo de inscribir mi empresa en la Rueda de Negocios de la Expo Agroalimentaria La Grita 2026.',
      `• Empresa / Finca: ${createdRecord.company_name} (${createdRecord.rif})`,
      `• Representante: ${createdRecord.contact_name}`,
      `• Perfil en mesa: ${createdRecord.role_type}`,
      `• Rubros: ${createdRecord.rubros.join(', ')}`,
      `• Capacidad / Demanda: ${createdRecord.offer_or_demand}`,
    ].join('\n');

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="b2b-confirm-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2421]/70 p-0 sm:p-4 overflow-y-auto"
      >
        <div className="relative w-full max-w-[540px] rounded-t-[12px] sm:rounded-[12px] border-2 border-[#1E7A34] bg-[#EEF2EF] p-5 sm:p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[#1F2421]/15 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-scale-14 font-semibold text-[#1E7A34]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Inscripción recibida en la Rueda de Negocios
              </span>
              <h2 id="b2b-confirm-title" className="mt-1 font-display-wide text-scale-25 text-[#1F2421]">
                Perfil B2B registrado
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatedRecord(null);
                onClose();
              }}
              className="rounded-[4px] p-2 text-[#1F2421]/70 hover:bg-[#1F2421]/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 text-scale-14 text-[#1F2421]/85">
            Tu empresa <strong>{createdRecord.company_name}</strong> quedó inscrita como{' '}
            <strong>{createdRecord.role_type}</strong> para las mesas del Salón de Conferencias y las 7 mesas redondas del Salón de Exposiciones.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setCreatedRecord(null);
                onClose();
              }}
              className="min-h-[44px] rounded-[4px] border border-[#1F2421]/25 bg-white px-5 py-2 text-scale-14 font-semibold text-[#1F2421]"
            >
              Cerrar
            </button>
            <a
              href={buildWhatsAppBookingLink(whatsappPrimary, waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-[#1E7A34] px-5 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Confirmar cita por WhatsApp
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
      aria-labelledby="b2b-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2421]/65 p-0 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-[580px] max-h-[92vh] overflow-y-auto rounded-t-[12px] sm:rounded-[12px] border border-[#1F2421]/20 bg-[#EEF2EF] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1F2421]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-scale-14 font-semibold text-[#0F3D22]">
              <Handshake className="h-4 w-4 text-[#1E7A34]" aria-hidden="true" />
              Salón de Conferencias y Mesas de Negocios
            </span>
            <h2 id="b2b-modal-title" className="mt-1 font-display-wide text-scale-25 text-[#1F2421]">
              Inscripción en la Rueda de Negocios
            </h2>
            <p className="mt-1 text-scale-14 text-[#1F2421]/80">
              Registra tu empresa o unidad de producción para agendar reuniones comerciales durante la Pre Expo y los días 20, 21 y 22 de noviembre.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de rueda de negocios"
            className="rounded-[4px] p-2 text-[#1F2421]/70 hover:bg-[#1F2421]/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="b2b-website-hp">No llenar</label>
            <input
              id="b2b-website-hp"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="b2b-company" className="block text-scale-14 font-semibold text-[#1F2421]">
                Empresa, Finca o Cooperativa
              </label>
              <input
                id="b2b-company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej. Distribuidora Andina C.A."
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>
            <div>
              <label htmlFor="b2b-rif" className="block text-scale-14 font-semibold text-[#1F2421]">
                RIF o Cédula Productor
              </label>
              <input
                id="b2b-rif"
                type="text"
                required
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="J-30958412-0"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 uppercase text-[#1F2421]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="b2b-contact" className="block text-scale-14 font-semibold text-[#1F2421]">
                Representante en mesa
              </label>
              <input
                id="b2b-contact"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Tu nombre y cargo"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>
            <div>
              <label htmlFor="b2b-whatsapp" className="block text-scale-14 font-semibold text-[#1F2421]">
                WhatsApp (+58)
              </label>
              <input
                id="b2b-whatsapp"
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+58 414 7589270"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 tabular-nums text-[#1F2421]"
              />
            </div>
            <div>
              <label htmlFor="b2b-muni" className="block text-scale-14 font-semibold text-[#1F2421]">
                Municipio
              </label>
              <select
                id="b2b-muni"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421]"
              >
                {MUNICIPALITY_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="b2b-role" className="block text-scale-14 font-semibold text-[#1F2421]">
                Rol en la Rueda de Negocios
              </label>
              <select
                id="b2b-role"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value as B2BRoleType)}
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-16 text-[#1F2421]"
              >
                <option value="Comprador mayorista">Comprador mayorista</option>
                <option value="Productor agropecuario">Productor agropecuario</option>
                <option value="Proveedor de insumos o maquinaria">Proveedor de insumos o maquinaria</option>
                <option value="Agroindustria y procesamiento">Agroindustria y procesamiento</option>
              </select>
            </div>
            <div>
              <label htmlFor="b2b-volume" className="block text-scale-14 font-semibold text-[#1F2421]">
                Oferta o demanda estimada
              </label>
              <input
                id="b2b-volume"
                type="text"
                value={offerOrDemand}
                onChange={(e) => setOfferOrDemand(e.target.value)}
                placeholder="Ej. 20 TM mensuales / 15 hectáreas"
                className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 text-scale-16 text-[#1F2421]"
              />
            </div>
          </div>

          <fieldset>
            <legend className="block text-scale-14 font-semibold text-[#1F2421]">
              Rubros de interés comercial
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((item) => {
                const selected = rubros.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleRubro(item)}
                    className={`min-h-[36px] rounded-[4px] border px-3 py-1 text-scale-14 font-medium transition-colors ${
                      selected
                        ? 'border-[#1E7A34] bg-[#1E7A34] text-white'
                        : 'border-[#1F2421]/25 bg-white text-[#1F2421]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-[4px] border border-[#1F2421]/25 bg-white px-5 py-2.5 text-scale-14 font-semibold text-[#1F2421]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-[4px] bg-[#1E7A34] px-6 py-2.5 text-scale-16 font-semibold text-white hover:bg-[#0F3D22]"
            >
              Inscribirme en la Rueda de Negocios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
