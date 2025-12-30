'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * 네트워크 상태 모니터링 훅
 * @description 오프라인/온라인 상태 변경 시 토스트 알림
 */
export function useNetworkStatus(): boolean {
  useEffect(() => {
    const handleOnline = () => {
      toast.success('인터넷에 다시 연결되었습니다.', {
        icon: <Wifi className="w-4 h-4" />,
        duration: 3000,
      });
    };

    const handleOffline = () => {
      toast.error('인터넷 연결이 끊어졌습니다. 네트워크를 확인해주세요.', {
        icon: <WifiOff className="w-4 h-4" />,
        duration: Infinity,
        id: 'offline-toast',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기 상태 확인
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * 네트워크 상태 표시 컴포넌트
 */
export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  useNetworkStatus();
  return <>{children}</>;
}
