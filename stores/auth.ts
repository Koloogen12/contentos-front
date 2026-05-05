"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Organization, User } from "@/lib/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  organization: Organization | null;
  // True until rehydrate-on-mount completes (refresh + /me).
  isHydrating: boolean;
}

interface AuthActions {
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setAccessToken: (token: string) => void;
  setMe: (payload: { user: User; organization: Organization }) => void;
  setHydrating: (value: boolean) => void;
  logout: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Persist *only* the refresh token. Access tokens stay in memory and are
// re-fetched via /auth/refresh on hard reload.
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      organization: null,
      isHydrating: true,
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      setMe: ({ user, organization }) => set({ user, organization }),
      setHydrating: (value) => set({ isHydrating: value }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          organization: null,
          isHydrating: false,
        }),
    }),
    {
      name: "contentos.auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist the refresh token.
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);

// Helper for non-React modules (the apiFetch client) to read the live token
// without subscribing.
export const getAuthSnapshot = () => useAuthStore.getState();

/**
 * Non-hook access-token getter for code paths that can't take a React
 * dependency (e.g. opening an EventSource from a service module). Returns
 * the current value at call-time — re-call if you need a fresh token.
 */
export const getAccessToken = (): string | null =>
  useAuthStore.getState().accessToken;
