/// <reference types="@solidjs/start/env" />

declare module "@solidjs/start/server" {
  interface RequestEventLocals {
    userId?: string;
    user?: { id: string; email: string };
    cspNonce?: string;
  }
}
