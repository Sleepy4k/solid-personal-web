import { createMiddleware } from "@solidjs/start/middleware";
import { adminAuthMW } from "./auth";
import { securityHeadersMW } from "./security";

export default createMiddleware({
  onRequest: [adminAuthMW],
  onBeforeResponse: [securityHeadersMW]
});
