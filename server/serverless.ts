import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";

// ============================================================================
// Serverless Express app (Vercel).
//
// Same app as the standalone server (server/index.ts) but without
// httpServer.listen() and without the Vite/static layer — on Vercel the static
// client is served from the CDN and only /api/* is routed here.
//
// This module is bundled by script/build.ts into dist/server/app.cjs with the
// @shared path alias resolved, so no build-time aliases leak to the Node
// runtime. The Vercel function (api/index.ts) simply re-exports the bundle.
// ============================================================================

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: unknown }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// registerRoutes attaches all handlers synchronously (no awaits during
// registration), so the app is fully wired by the time this returns.
const httpServer = createServer(app);
registerRoutes(httpServer, app);

// Lightweight health probe to confirm the function is reachable.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  res.status(status).json({ message });
});

export default app;
