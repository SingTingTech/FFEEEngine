import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  realName: string | null;
  roles: string[];

  setSession: (s: {
    token: string;
    refreshToken: string;
    username: string;
    realName: string | null;
    roles: string[];
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      username: null,
      realName: null,
      roles: [],

      setSession: (s) =>
        set({
          token: s.token,
          refreshToken: s.refreshToken,
          username: s.username,
          realName: s.realName,
          roles: s.roles,
        }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          username: null,
          realName: null,
          roles: [],
        }),
    }),
    {
      name: 'sv-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        username: s.username,
        realName: s.realName,
        roles: s.roles,
      }),
    },
  ),
);