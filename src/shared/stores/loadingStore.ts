import { create } from "zustand";

type LoadingState = {
  loading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
  loading: false,
  showLoading: () => set({ loading: true }),
  hideLoading: () => set({ loading: false }),
}));