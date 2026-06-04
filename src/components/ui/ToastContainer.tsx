import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../store/useToastStore';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const ToastContainer = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-5 py-3 rounded-full shadow-lg backdrop-blur-sm pointer-events-auto"
          >
            <span className="text-[14px] font-bold tracking-tight">
              <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex mr-1.5">❤️</Twemoji> 
              {toast.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
