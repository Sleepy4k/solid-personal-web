import { createContext, useContext } from "solid-js";

// Mirrors event.locals.user set by middleware (see global.d.ts)
export type SessionUser = {
  id: string;
  email: string;
} | null;

// Default: accessor returning undefined (no Provider above → not yet loaded)
export const AuthContext = createContext<() => SessionUser | undefined>(
  () => undefined
);

export function useSessionUser() {
  return useContext(AuthContext);
}
