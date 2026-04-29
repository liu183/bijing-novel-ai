'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export interface Notification { id: string; type: 'success' | 'warning' | 'info'; title: string; message?: string; }

export function notify(type: Notification['type'], title: string, message?: string) {
  const event = new CustomEvent('app-notification', { detail: { type, title, message } });
  window.dispatchEvent(event);
}

const iconMap = { success: CheckCircle, warning: AlertTriangle, info: Info };
const colorMap = { success: 'text-emerald-500', warning: 'text-amber-500', info: 'text-blue-500' };
const borderMap = { success: 'border-emerald-500/20', warning: 'border-amber-500/20', info: 'border-blue-500/20' };

export function NotificationStack() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: { type: string; title: string; message?: string }) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setNotifications(prev => [...prev.slice(-2), { ...n, id } as Notification]);
    setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => addNotification((e as CustomEvent).detail);
    window.addEventListener('app-notification', handler);
    return () => window.removeEventListener('app-notification', handler);
  }, [addNotification]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => {
          const Icon = iconMap[n.type];
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: 100, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3 max-w-sm ${borderMap[n.type]}`}>
              <Icon className={`size-4 shrink-0 mt-0.5 ${colorMap[n.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-muted-foreground hover:text-foreground shrink-0"><X className="size-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
