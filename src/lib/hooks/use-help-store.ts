import { create } from 'zustand';

interface HelpState {
  open: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

export const useHelpStore = create<HelpState>((set) => ({
  open: false,
  openHelp: () => set({ open: true }),
  closeHelp: () => set({ open: false }),
  toggleHelp: () => set((state) => ({ open: !state.open })),
}));
