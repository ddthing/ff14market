import { Heart } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

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
              <Heart className="mr-1.5 inline-flex h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
