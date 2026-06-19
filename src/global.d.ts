/// <reference types="@solidjs/start/env" />

declare module "@solidjs/start" {
  interface RequestEventLocals {
    userId?: string;
    user?: { id: string; email: string };
    cspNonce?: string;
  }
}
