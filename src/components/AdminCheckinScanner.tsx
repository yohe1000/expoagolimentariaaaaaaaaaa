import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Database,
  Trash2,
} from 'lucide-react';
import {
  getVisitors,
  findVisitorByToken,
  markVisitorCheckInByToken,
  subscribeToStoreChanges,
} from '../data/store';
import {
  enqueueOfflineCheckIn,
  getOfflineCheckInQueue,
  flushOfflineCheckInQueue,
  clearSyncedFromOfflineQueue,
  QueuedCheckInItem,
} from '../utils/offlineCheckinQueue';

interface AdminCheckinScannerProps {
  onBackAdmin: () => void;
  onBackHome: () => void;
}

export const AdminCheckinScanner: React.FC<AdminCheckinScannerProps> = ({
  onBackAdmin,
  onBackHome,
}) => {
  const [visitors, setVisitors] = useState(() => getVisitors());
  const [queueItems, setQueueItems] = useState<QueuedCheckInItem[]>([]);
  const [isBrowserOnline, setIsBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [gateNote, setGateNote] = useState('Puerta Principal · Vía Llano Los Zambranos');
  const [scanResultBanner, setScanResultBanner] = useState<{
    status: 'synced' | 'queued' | 'duplicate' | 'error';
    title: string;
    detail: string;
  } | null>(null);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const effectiveOnline = isBrowserOnline && !simulateOffline;

  const refreshQueueAndVisitors = async () => {
    setVisitors(getVisitors());
    try {
      const q = await getOfflineCheckInQueue();
      setQueueItems(q);
    } catch {
      // ignore IndexedDB error in restricted contexts
    }
  };

  useEffect(() => {
    refreshQueueAndVisitors();
    const unsub = subscribeToStoreChanges(() => {
      refreshQueueAndVisitors();
    });
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Automatically flush IndexedDB queue when returning online
  useEffect(() => {
    if (effectiveOnline) {
      flushOfflineCheckInQueue().then((res) => {
        if (res.syncedCount > 0) {
          setScanResultBanner({
            status: 'synced',
            title: `Sincronización IndexedDB completada (${res.syncedCount} pases)`,
            detail: `Se sincronizaron ${res.syncedCount} registros almacenados en la cola sin conexión con la base de datos de acreditación.`,
          });
          refreshQueueAndVisitors();
        }
      });
    }
  }, [effectiveOnline]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrRef.current && html5QrRef.current.isScanning) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const processScannedToken = async (rawText: string) => {
    const cleanToken = rawText.trim().replace(/^.*\/pase\//i, '').toUpperCase();
    if (!cleanToken) {
      setScanResultBanner({
        status: 'error',
        title: 'Código QR vacío',
        detail: 'Ingresa o escanea un token válido (por ejemplo, LG26-G707-DUQU).',
      });
      return;
    }

    const matchedVisitor = findVisitorByToken(cleanToken);

    if (!effectiveOnline) {
      // Queue in IndexedDB when offline!
      const queued = await enqueueOfflineCheckIn(cleanToken, gateNote);
      await refreshQueueAndVisitors();
      setScanResultBanner({
        status: 'queued',
        title: `Guardado en cola IndexedDB sin conexión (${queued.qr_token})`,
        detail: matchedVisitor
          ? `Pase de ${matchedVisitor.name} (${matchedVisitor.municipality}) almacenado en IndexedDB local. Se sincronizará al recuperar conexión.`
          : `Token ${queued.qr_token} encolado en IndexedDB local para sincronización posterior.`,
      });
      setManualTokenInput('');
      return;
    }

    // Online: write both to IndexedDB audit log (marked synced) and mark visitor checked in immediately
    const queued = await enqueueOfflineCheckIn(cleanToken, gateNote);
    const { visitor, alreadyCheckedIn } = markVisitorCheckInByToken(cleanToken, queued.scanned_at);
    await flushOfflineCheckInQueue();
    await refreshQueueAndVisitors();

    setScanResultBanner({
      status: alreadyCheckedIn ? 'duplicate' : 'synced',
      title: alreadyCheckedIn
        ? `Pase ya registrado anteriormente: ${visitor.name}`
        : `Ingreso acreditado en puerta: ${visitor.name}`,
      detail: `Token ${visitor.qr_token} · Perfil: ${visitor.profile} · Municipio: ${visitor.municipality}`,
    });
    setManualTokenInput('');
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      const qr = new Html5Qrcode('expo-qr-reader-region');
      html5QrRef.current = qr;
      setIsCameraActive(true);
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          processScannedToken(decodedText);
        },
        () => {
          // frame without QR code
        }
      );
    } catch (err) {
      setIsCameraActive(false);
      setCameraError(
        err instanceof Error
          ? `No se detectó cámara activa (${err.message}). Puedes usar el ingreso manual o la simulación de lectura QR abajo.`
          : 'No se pudo acceder a la cámara en este dispositivo.'
      );
    }
  };

  const handleStopCamera = async () => {
    if (html5QrRef.current && html5QrRef.current.isScanning) {
      try {
        await html5QrRef.current.stop();
      } catch {
        // ignore stop error
      }
    }
    setIsCameraActive(false);
  };

  const pendingQueueCount = queueItems.filter((i) => !i.synced).length;
  const unCheckedVisitors = visitors.filter((v) => !v.checked_in_at);

  return (
    <div className="min-h-screen bg-[#EEF2EF] text-[#1F2421] pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1F2421]/15 bg-[#0F3D22] text-[#EEF2EF]">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <QrCode className="h-5 w-5 text-[#F4C20D]" aria-hidden="true" />
            <h1 className="font-display-wide text-scale-20 text-white">
              Escáner de Check-in en Puerta · Casino Militar
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-0.5 text-[12px] font-bold ${
                effectiveOnline
                  ? 'bg-[#1E7A34] text-white'
                  : 'bg-[#F4C20D] text-[#1F2421]'
              }`}
            >
              {effectiveOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  En línea (Sincronización inmediata)
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Modo sin conexión (Cola IndexedDB activa)
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackAdmin}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/30 bg-[#144A29] px-3.5 py-1.5 text-scale-14 font-semibold text-white hover:bg-[#1E7A34]"
            >
              <ShieldCheck className="h-4 w-4 text-[#F4C20D]" aria-hidden="true" />
              Panel Admin (/admin)
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/30 bg-transparent px-3.5 py-1.5 text-scale-14 font-semibold text-[#EEF2EF] hover:bg-[#EEF2EF]/10"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Portada
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 pt-6 sm:px-6">
        {/* Status Banner */}
        {scanResultBanner && (
          <div
            role="status"
            className={`mb-6 rounded-[12px] border-2 p-4 ${
              scanResultBanner.status === 'synced'
                ? 'border-[#1E7A34] bg-[#EAF5EC] text-[#0F3D22]'
                : scanResultBanner.status === 'queued'
                ? 'border-[#D9822B] bg-[#FDF3E8] text-[#9A5512]'
                : scanResultBanner.status === 'duplicate'
                ? 'border-[#1F4E9C] bg-[#EDF3FB] text-[#1F4E9C]'
                : 'border-[#B23A2E] bg-[#FBECEB] text-[#B23A2E]'
            }`}
          >
            <p className="font-display-wide text-scale-20">{scanResultBanner.title}</p>
            <p className="mt-1 text-scale-14">{scanResultBanner.detail}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): html5-qrcode Camera + Manual/Simulated Input */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2421]/10 pb-4">
                <div>
                  <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                    Lector Óptico QR (<code className="font-mono">html5-qrcode</code>)
                  </h2>
                  <p className="text-scale-14 text-[#1F2421]/75">
                    Apunta la cámara al pase QR del visitante en el acceso único de Vía Llano Los Zambranos.
                  </p>
                </div>

                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={handleStopCamera}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[4px] bg-[#B23A2E] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#8f2c22]"
                  >
                    <CameraOff className="h-4 w-4" aria-hidden="true" />
                    Detener cámara
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Activar cámara QR
                  </button>
                )}
              </div>

              {/* html5-qrcode Mount Region */}
              <div className="mt-4 overflow-hidden rounded-[8px] border border-[#1F2421]/20 bg-[#1F2421] text-white">
                <div id="expo-qr-reader-region" className="min-h-[220px] w-full" />
                {!isCameraActive && (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <QrCode className="h-12 w-12 text-[#F4C20D]" aria-hidden="true" />
                    <p className="mt-2 font-display-wide text-scale-16 text-[#EEF2EF]">
                      Visor óptico listo para escanear pases LG26
                    </p>
                    <p className="mt-1 max-w-[46ch] text-[13px] text-[#EEF2EF]/75">
                      Haz clic en «Activar cámara QR» o valida directamente por código de pase abajo si operas sin cámara o sin conexión.
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="mt-3 rounded-[6px] border border-[#D9822B] bg-[#FDF3E8] p-3 text-[13px] font-medium text-[#9A5512]">
                  {cameraError}
                </p>
              )}

              {/* Manual Token Input & Gate Selector */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processScannedToken(manualTokenInput);
                }}
                className="mt-5 space-y-3 border-t border-[#1F2421]/10 pt-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="checkin-token-input"
                      className="block text-scale-14 font-semibold text-[#1F2421]"
                    >
                      Código QR o URL del pase
                    </label>
                    <input
                      id="checkin-token-input"
                      type="text"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="Ej. LG26-G707-DUQU"
                      className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3.5 py-2 font-mono text-scale-14 uppercase text-[#1F2421]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkin-gate-select"
                      className="block text-scale-14 font-semibold text-[#1F2421]"
                    >
                      Punto de control
                    </label>
                    <select
                      id="checkin-gate-select"
                      value={gateNote}
                      onChange={(e) => setGateNote(e.target.value)}
                      className="mt-1 w-full min-h-[44px] rounded-[4px] border border-[#1F2421]/30 bg-white px-3 py-2 text-scale-14 text-[#1F2421]"
                    >
                      <option value="Puerta Principal · Vía Llano Los Zambranos">
                        4. Entrada Principal · Vía Llano Los Zambranos
                      </option>
                      <option value="Acceso Salón de Exposiciones">
                        1. Acceso Salón de Exposiciones (51 stands)
                      </option>
                      <option value="Acceso Salón de Conferencias y Rueda B2B">
                        2. Salón de Conferencias y Rueda B2B
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#0F3D22] px-5 py-2.5 text-scale-16 font-semibold text-[#F4C20D] hover:bg-[#1E7A34] hover:text-white transition-colors"
                >
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  {effectiveOnline
                    ? 'Registrar check-in inmediato'
                    : 'Encolar check-in en IndexedDB (Sin conexión)'}
                </button>
              </form>

              {/* Quick 1-click pending visitor passes for fast gate verification */}
              {unCheckedVisitors.length > 0 && (
                <div className="mt-5 border-t border-[#1F2421]/10 pt-4">
                  <p className="text-[13px] font-semibold text-[#1F2421]/80">
                    Pases pendientes por ingresar (clic para simular lectura de su código QR):
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {unCheckedVisitors.slice(0, 5).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => processScannedToken(v.qr_token)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] border border-[#1E7A34]/40 bg-[#EEF2EF] px-3 py-1 text-[12px] font-semibold text-[#0F3D22] hover:bg-[#1E7A34] hover:text-white transition-colors"
                      >
                        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{v.qr_token}</span>
                        <span className="opacity-75">({v.name.split(' ')[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): IndexedDB Offline Queue & Sync Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-[12px] border border-[#1F2421]/15 bg-white p-5">
              <div className="flex items-start justify-between gap-2 border-b border-[#1F2421]/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#1F4E9C]" aria-hidden="true" />
                    <h2 className="font-display-wide text-scale-20 text-[#1F2421]">
                      Cola Sin Conexión (<code className="font-mono">IndexedDB</code>)
                    </h2>
                  </div>
                  <p className="mt-1 text-[13px] text-[#1F2421]/75">
                    Base local <code className="font-mono">expo_lagrita_offline_db</code> · Almacena lecturas QR cuando cae la señal móvil en La Grita.
                  </p>
                </div>
                <span className="rounded-[4px] bg-[#0F3D22] px-2.5 py-1 font-mono text-[12px] font-bold text-[#F4C20D]">
                  {pendingQueueCount} pendientes
                </span>
              </div>

              {/* Offline simulation switch for testing */}
              <label className="mt-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#1F2421]/15 bg-[#EEF2EF] p-3.5 cursor-pointer">
                <div>
                  <span className="block text-scale-14 font-bold text-[#1F2421]">
                    Modo sin conexión en puerta (Offline Queue)
                  </span>
                  <span className="text-[12px] text-[#1F2421]/75">
                    Retiene los escaneos en IndexedDB hasta presionar «Sincronizar cola»
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={simulateOffline}
                  onChange={(e) => setSimulateOffline(e.target.checked)}
                  className="h-5 w-5 accent-[#0F3D22]"
                />
              </label>

              {/* Sync & Clear Buttons */}
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await flushOfflineCheckInQueue();
                    setSimulateOffline(false);
                    await refreshQueueAndVisitors();
                    setScanResultBanner({
                      status: 'synced',
                      title:
                        res.syncedCount > 0
                          ? `Sincronizados ${res.syncedCount} pases desde IndexedDB`
                          : 'Cola IndexedDB al día (0 pendientes)',
                      detail:
                        'Todos los pases encolados en puerta fueron acreditados en el padrón general de visitantes.',
                    });
                  }}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#1F4E9C] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#163a75]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Sincronizar cola ({pendingQueueCount})
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await clearSyncedFromOfflineQueue();
                    await refreshQueueAndVisitors();
                  }}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[4px] border border-[#1F2421]/25 bg-white px-3.5 py-2 text-scale-14 font-semibold text-[#1F2421] hover:bg-[#EEF2EF]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Limpiar sincronizados
                </button>
              </div>

              {/* Queue Items List */}
              <div className="mt-4 max-h-[340px] overflow-y-auto divide-y divide-[#1F2421]/10 rounded-[8px] border border-[#1F2421]/10 bg-[#EEF2EF]/50">
                {queueItems.length === 0 ? (
                  <p className="p-4 text-[13px] text-[#1F2421]/70">
                    La cola IndexedDB está vacía. Escanea o selecciona un pase QR para registrar el ingreso.
                  </p>
                ) : (
                  queueItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-3 text-[13px]">
                      <div>
                        <p className="font-mono font-bold text-[#0F3D22]">{item.qr_token}</p>
                        <p className="text-[11px] text-[#1F2421]/70">
                          {new Date(item.scanned_at).toLocaleTimeString('es-VE')} · {item.gate_note}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-bold uppercase ${
                          item.synced
                            ? 'bg-[#EAF5EC] text-[#1E7A34]'
                            : 'bg-[#FDF3E8] text-[#9A5512]'
                        }`}
                      >
                        {item.synced ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Sincronizado
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            En cola IDB
                          </>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
