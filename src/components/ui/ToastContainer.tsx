import React from 'react';
import { useToastStore } from '../../store/useToastStore';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const ToastContainer = () => {
  const { toasts } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center space-y-2 md:bottom-6">
      <div>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-up rounded-full bg-[var(--app-accent)] px-5 py-3 text-[var(--app-accent-foreground)] shadow-lg backdrop-blur-sm"
          >
            <span className="text-[14px] font-bold tracking-tight">
              <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex mr-1.5">❤️</Twemoji> 
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
