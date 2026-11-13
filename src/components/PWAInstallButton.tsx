import React, { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'footer' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className={
          variant === 'header'
            ? 'hidden sm:inline-flex min-h-[38px] items-center gap-1.5 rounded-[4px] border border-[#0F3D22]/30 bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0F3D22] hover:bg-[#0F3D22] hover:text-white transition-colors whitespace-nowrap'
            : 'inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] border border-[#EEF2EF]/30 bg-[#144A29] px-3 py-1.5 text-[12px] font-semibold text-[#EEF2EF] hover:bg-[#1E7A34] transition-colors whitespace-nowrap'
        }
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Instalar App
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-[12px] border border-[#1F2421]/20 bg-white p-6 text-[#1F2421] shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 id="pwa-install-title" className="font-display-wide text-scale-20 text-[#0F3D22]">
                Instalar Expo La Grita 2026 sin conexión
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Cerrar guía de instalación"
                className="rounded-[4px] p-1.5 text-[#1F2421]/70 hover:bg-[#EEF2EF]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-scale-14 text-[#1F2421]/85">
              Esta aplicación web progresiva (PWA) guarda en caché tu pase QR, la agenda, el directorio y el plano 2D del Casino Militar para usarlos en La Grita incluso sin señal de datos.
            </p>
            {isIOS ? (
              <ol className="mt-4 space-y-2 rounded-[8px] bg-[#EEF2EF] p-4 text-scale-14 text-[#1F2421]">
                <li>
                  1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                </li>
                <li>
                  2. Selecciona <strong>«Agregar a la pantalla de inicio»</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 rounded-[8px] bg-[#EEF2EF] p-4 text-scale-14 text-[#1F2421]">
                <li>
                  1. Abre el menú de tu navegador (ícono de tres puntos o barra de direcciones).
                </li>
                <li>
                  2. Selecciona <strong>«Instalar aplicación»</strong> o{' '}
                  <strong>«Agregar a pantalla principal»</strong>.
                </li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[42px] rounded-[4px] bg-[#1E7A34] px-4 py-2 text-scale-14 font-semibold text-white hover:bg-[#0F3D22]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-[6px] border border-[#F4C20D] bg-[#0F3D22] px-3.5 py-2 text-[13px] font-semibold text-[#EEF2EF] shadow-lg md:bottom-4"
    >
      <WifiOff className="h-4 w-4 text-[#F4C20D]" aria-hidden="true" />
      <span>Modo sin conexión activo · Datos locales y pase QR disponibles</span>
    </div>
  );
};
