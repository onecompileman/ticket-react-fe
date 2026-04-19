import { create } from "zustand";

export type User = {
  id: number;
  full_name: string;
  email: string;
  sso_id: string;
  is_active: boolean;
  created_at: string;
}

type UserState = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: localStorage.getItem("ticket_user") ? JSON.parse(localStorage.getItem("ticket_user") as string) : null,
  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem("ticket_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ticket_user");
    }
    set({ user });
  },
}));