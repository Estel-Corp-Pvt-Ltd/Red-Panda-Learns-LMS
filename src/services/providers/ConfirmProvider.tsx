// src/services/providers/ConfirmProvider.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Modal from '@/components/Modal';

type ConfirmVariant = 'default' | 'danger';

export type ConfirmOptions = {
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  dismissible?: boolean; // allow ESC/backdrop/close button
};

type Resolver = (result: boolean) => void;
type State = { open: boolean; options: ConfirmOptions | null; resolve: Resolver | null };
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => {
  throw new Error('useConfirm must be used within ConfirmProvider');
});

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ open: false, options: null, resolve: null });

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolve?.(result);
      return { open: false, options: null, resolve: null };
    });
  }, []);

  const ctxValue = useMemo(() => confirm, [confirm]);

  const o = state.options;
  const variant = o?.variant ?? 'default';
  const dismissible = o?.dismissible ?? true;

  return (
    <ConfirmContext.Provider value={ctxValue}>
      {children}
      <Modal
        open={state.open}
        onClose={() => (dismissible ? close(false) : undefined)}
        title={o?.title}
        subtitle={o?.body}
        size="sm"
        variant={variant}
        showClose={dismissible}
        footer={
          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:ring-offset-slate-900"
              onClick={() => close(false)}
            >
              {o?.cancelText ?? 'Cancel'}
            </button>
            <button
              className={
                'inline-flex items-center justify-center rounded-lg px-3.5 py-2.5 font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:ring-offset-slate-900 ' +
                (variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500')
              }
              onClick={() => close(true)}
            >
              {o?.confirmText ?? (variant === 'danger' ? 'Delete' : 'Continue')}
            </button>
          </div>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}