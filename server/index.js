import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeMonth,
  createDeposit,
  createDepositSettlement,
  createDepotTrip,
  createLorry,
  createStation,
  getBootstrap,
  recordDelivery,
  recordInternalFuelUse,
  recordPumpMeterReading
} from "./domain.js";
import { loadState, withState } from "./store.js";
import { getSupabaseStatus } from "./supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const port = Number(process.env.PORT || 4040);

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    // ADD THESE THREE LINES FOR CORS:
    "Access-Control-Allow-Origin": "*", // Allows any website to connect (or put your Netlify URL here)
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const handleApi = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const state = await loadState();
      sendJson(res, 200, getBootstrap(state));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/database-status") {
      const status = await getSupabaseStatus();
      sendJson(res, status.configured ? 200 : 503, status);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/depot-trips") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createDepotTrip(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/stations") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createStation(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/lorries") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createLorry(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/daily-deposits") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createDeposit(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/daily-deposit-settlements") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createDepositSettlement(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/deliveries") {
      const payload = await readJsonBody(req);
      console.log("[delivery] payload:", JSON.stringify(payload));
      const result = await withState((state) => recordDelivery(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/internal-fuel-use") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => recordInternalFuelUse(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/pump-meter-readings") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => recordPumpMeterReading(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/month-end-close") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => closeMonth(state, payload));
      sendJson(res, 201, result);
      return;
    }

    sendJson(res, 404, { error: "Route not found." });
  } catch (error) {
    console.error("[api error]", error.message);
    sendJson(res, 400, { error: error.message || "Request failed." });
  }
};

const serveStatic = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/dist/index.html" : `/dist${url.pathname}`;
  const filePath = path.join(rootDir, requestedPath);

  try {
    const contents = await readFile(filePath);
    const ext = path.extname(filePath);
    const contentTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(contents);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
};

const server = http.createServer(async (req, res) => {
  // Browsers send an "OPTIONS" request first to check CORS security. We must say "OK" (204).
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.url.startsWith("/api")) {
    await handleApi(req, res);
    return;
  }
  await serveStatic(req, res);
});
server.listen(port, "0.0.0.0", () => {
  console.log(`Nzilabiche Fuel API running on port ${port}`);
});