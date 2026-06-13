import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "node:fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Serverless app bundle for the Vercel function (api/index.ts re-exports it).
  // Every real package (and its subpaths) is kept external so Vercel's
  // dependency tracer resolves them at runtime — including the native
  // better-sqlite3 binary — while our own source (server/*, and shared/* via
  // the @shared alias) is inlined into a single file. This guarantees no
  // build-time path alias leaks to the Node runtime as a bare specifier.
  console.log("building serverless app bundle...");
  const externalAll = allDeps.flatMap((dep) => [dep, `${dep}/*`]);
  await esbuild({
    entryPoints: ["server/serverless.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/server/app.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: externalAll,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
