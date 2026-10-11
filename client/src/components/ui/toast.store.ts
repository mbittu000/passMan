import { create } from 'zustand';

type ToastTone = 'neutral' | 'success' | 'danger';

type ToastState = {
  message: string | null;
  tone: ToastTone;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
};

export const useToast = create<ToastState>((set) => ({
  message: null,
  tone: 'neutral',
  show: (message, tone = 'neutral') => set({ message, tone }),
  hide: () => set({ message: null }),
}));

export function toast(message: string, tone: ToastTone = 'neutral') {
  useToast.getState().show(message, tone);
}