/**
 * Zustand store for UI state management
 * Handles sidebar, modals, snackbars, and theme
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Snackbar {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;

  // Snackbars
  snackbars: Snackbar[];
  addSnackbar: (message: string, severity?: Snackbar['severity']) => void;
  removeSnackbar: (id: string) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Sidebar state
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      // Modal state
      activeModal: null,
      modalData: null,
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Snackbar state
      snackbars: [],
      addSnackbar: (message, severity = 'info') =>
        set((state) => ({
          snackbars: [
            ...state.snackbars,
            { id: crypto.randomUUID(), message, severity },
          ],
        })),
      removeSnackbar: (id) =>
        set((state) => ({
          snackbars: state.snackbars.filter((s) => s.id !== id),
        })),

      // Theme state
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'UI Store' }
  )
);
