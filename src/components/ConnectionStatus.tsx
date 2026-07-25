import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showAlert, setShowAlert] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      timerId = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si estamos online y no hay que mostrar la alerta temporal, ocultamos la barra
  if (isOnline && !showAlert) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ease-in-out">
      <div className={`w-full py-3 px-4 flex items-center justify-center gap-3 text-sm font-medium shadow-md ${
        isOnline
          ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-b border-rose-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi size={18} className="animate-pulse" />
            Conexión de red restaurada
          </>
        ) : (
          <>
            <WifiOff size={18} className="animate-bounce" />
            Conexión de red perdida. Revisando internet...
          </>
        )}
      </div>
    </div>
  );
};