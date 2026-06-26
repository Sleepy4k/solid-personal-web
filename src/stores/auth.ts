import { createContext, useContext } from "solid-js";

export type SessionUser = {
  id: string;
  email: string;
} | null;

export const AuthContext = createContext<() => SessionUser | undefined>(
  () => undefined
);

export function useSessionUser() {
  return useContext(AuthContext);
}
