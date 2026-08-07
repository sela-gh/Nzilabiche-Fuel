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
  createPumpTankLink,
  createStation,
  createExpense,
  createProductSale,
  issueDebt,
  settleDebt,
  getBootstrap,
  recordDelivery,
  recordInternalFuelUse,
  recordPumpMeterReading
} from "./domain.js";
import {
  confirmDailyShiftReport,
  createDailyShiftReport,
  getDailyShiftReport,
  getUserProfile,
  listDailyShiftReports,
  loadState,
  rejectDailyShiftReport,
  withState,
  updateDebt,
  savePumpTankLink
} from "./store.js";
import { getSupabaseStatus, isSupabaseConfigured, supabase } from "./supabase.js";

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
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

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
};

const getAuthContext = async (req) => {
  if (!isSupabaseConfigured) {
    return {
      token: "",
      user: { id: "local-user", email: "local@example.test" },
      profile: {
        userId: "local-user",
        fullName: "Local Manager",
        role: "manager",
        stationId: null
      }
    };
  }

  const token = getBearerToken(req);
  if (!token) throw new Error("Login required.");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("Login required.");

  const profile = await getUserProfile(data.user.id, token);
  return { token, user: data.user, profile };
};

const requireRole = (profile, role) => {
  if (profile.role !== role) {
    throw new Error(`${role[0].toUpperCase()}${role.slice(1)} access required.`);
  }
};

const filterStateForProfile = (state, profile) => {
  if (profile.role !== "manager" || !profile.stationId) return state;

  const stationId = profile.stationId;
  const scopedCycles = state.cycles.filter((item) => item.stationId === stationId);
  const depotTripIds = new Set(scopedCycles.map((item) => item.depotTripId).filter(Boolean));

  return {
    ...state,
    stations: state.stations.filter((item) => item.id === stationId),
    depotTrips: state.depotTrips.filter((item) => depotTripIds.has(item.id)),
    cycles: scopedCycles,
    dailyDeposits: state.dailyDeposits.filter((item) => item.stationId === stationId),
    productSales: (state.productSales || []).filter((item) => item.stationId === stationId),
    internalFuelUses: state.internalFuelUses.filter((item) => item.stationId === stationId),
    pumpMeterReadings: state.pumpMeterReadings.filter((item) => item.stationId === stationId),
    expenses: (state.expenses || []).filter((item) => item.stationId === stationId),
    debts: (state.debts || []).filter((item) => item.stationId === stationId),
    pumpTankLinks: (state.pumpTankLinks || []).filter((item) => item.stationId === stationId)
  };
};

const normalizeReportPayload = (payload) => {
  if (!payload.stationId || !payload.reportDate || !payload.shift) {
    throw new Error("Station, date, and shift are required.");
  }

  const asArray = (value) => (Array.isArray(value) ? value : []);
  const totals = {
    fuelRevenue: asArray(payload.meterLines).reduce(
      (sum, line) =>
        sum +
        Math.max(0, Number(line.closingReading || 0) - Number(line.openingReading || 0)) *
          Number(line.pumpPrice || 0),
      0
    ),
    expenses: asArray(payload.expenseLines).reduce((sum, line) => sum + Number(line.amount || 0), 0),
    creditsIssued: asArray(payload.creditLines).reduce((sum, line) => sum + Number(line.amount || 0), 0),
    creditsSettled: asArray(payload.settlementLines).reduce((sum, line) => sum + Number(line.amount || 0), 0)
  };

  return {
    stationId: payload.stationId,
    reportDate: payload.reportDate,
    shift: payload.shift,
    pumpPrices: asArray(payload.pumpPrices),
    meterLines: asArray(payload.meterLines),
    dippingLines: asArray(payload.dippingLines),
    creditLines: asArray(payload.creditLines),
    settlementLines: asArray(payload.settlementLines),
    expenseLines: asArray(payload.expenseLines),
    notes: payload.notes || "",
    totals
  };
};

const postReportLedgers = async (report) => {
  const result = await withState((state) => {
    const date = new Date(`${report.reportDate}T12:00:00+03:00`).toISOString();
    const pumpReadings = [];
    const deposits = [];
    const expenses = [];
    const debts = [];
    const creditDebtUpdates = [];
    const debtPayments = [];

    for (const line of report.meterLines || []) {
      const openingReading = Number(line.openingReading || 0);
      const closingReading = Number(line.closingReading || 0);
      const pumpPrice = Number(line.pumpPrice || 0);
      if (!line.productId || closingReading <= openingReading || pumpPrice <= 0) continue;

      const pumpReading = recordPumpMeterReading(state, {
        stationId: report.stationId,
        productId: line.productId,
        date,
        shift: report.shift,
        openingReading,
        closingReading
      });
      pumpReadings.push(pumpReading);

      const cashDeposited = (closingReading - openingReading) * pumpPrice;
      const deposit = createDeposit(state, {
        stationId: report.stationId,
        productId: line.productId,
        date,
        shift: report.shift,
        paymentMethod: line.paymentMethod || "cash",
        pumpNumber: line.pumpNumber || 1,
        tankNumber: line.tankNumber || line.pumpNumber || 1,
        cashDeposited,
        pumpPrice
      });
      deposits.push(deposit);
    }

    for (const line of report.expenseLines || []) {
      if (!line.description || Number(line.amount || 0) <= 0) continue;
      const expense = createExpense(state, {
        stationId: report.stationId,
        date,
        shift: report.shift,
        category: line.category || "Other",
        description: line.description,
        amount: line.amount,
        paymentMethod: line.paymentMethod || "cash"
      });
      expenses.push(expense);
    }

    for (const line of report.creditLines || []) {
      if (!line.debtorName || Number(line.amount || 0) <= 0) continue;
      const result = issueDebt(state, {
        stationId: report.stationId,
        debtorName: line.debtorName,
        description: line.description || "Daily shift credit",
        amount: line.amount,
        date,
        shift: report.shift,
        paymentMethod: line.paymentMethod || "cash"
      });
      debts.push(result.debt);
      creditDebtUpdates.push(result.debt);
      expenses.push(result.expense);
    }

    for (const line of report.settlementLines || []) {
      if (!line.debtId || Number(line.amount || 0) <= 0) continue;
      const result = settleDebt(state, {
        debtId: line.debtId,
        stationId: report.stationId,
        amount: line.amount,
        settledAt: date,
        paymentMethod: line.paymentMethod || "cash",
        note: line.note || "Daily shift settlement"
      });
      debtPayments.push(result.payment);
    }

    return { pumpReadings, deposits, expenses, debts, creditDebtUpdates, debtPayments };
  });

  for (const debt of result.creditDebtUpdates || []) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debt.id)) {
      await updateDebt(debt);
    }
  }

  return {
    pumpReadings: (result.pumpReadings || []).map((item) => item.id),
    deposits: (result.deposits || []).map((item) => item.id),
    expenses: (result.expenses || []).map((item) => item.id),
    debts: (result.debts || []).map((item) => item.id),
    debtPayments: (result.debtPayments || []).map((item) => item.id)
  };
};

const handleApi = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/me") {
      const { user, profile } = await getAuthContext(req);
      sendJson(res, 200, {
        user: { id: user.id, email: user.email },
        profile
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const { profile } = await getAuthContext(req);
      const state = await loadState();
      sendJson(res, 200, getBootstrap(filterStateForProfile(state, profile)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/database-status") {
      const status = await getSupabaseStatus();
      sendJson(res, status.configured ? 200 : 503, status);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/daily-shift-reports") {
      const { token, user, profile } = await getAuthContext(req);
      requireRole(profile, "staff");
      const payload = normalizeReportPayload(await readJsonBody(req));
      const result = await createDailyShiftReport(payload, user.id, token);
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/daily-shift-reports") {
      const { token, profile } = await getAuthContext(req);
      const reports = await listDailyShiftReports({
        status: url.searchParams.get("status") || "",
        profile,
        token
      });
      sendJson(res, 200, { reports });
      return;
    }

    const confirmMatch = url.pathname.match(/^\/api\/daily-shift-reports\/([^/]+)\/confirm$/);
    if (req.method === "POST" && confirmMatch) {
      const { token, user, profile } = await getAuthContext(req);
      requireRole(profile, "manager");
      const report = await getDailyShiftReport(confirmMatch[1], token);
      if (report.stationId !== profile.stationId) throw new Error("Report is outside your station.");
      if (report.status !== "pending") throw new Error("Only pending reports can be confirmed.");
      if (Object.keys(report.postedLedgerIds || {}).length) {
        throw new Error("This report has already been posted.");
      }
      const postedLedgerIds = await postReportLedgers(report);
      const confirmed = await confirmDailyShiftReport(report, user.id, postedLedgerIds, token);
      sendJson(res, 200, confirmed);
      return;
    }

    const rejectMatch = url.pathname.match(/^\/api\/daily-shift-reports\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      const { token, user, profile } = await getAuthContext(req);
      requireRole(profile, "manager");
      const report = await getDailyShiftReport(rejectMatch[1], token);
      if (report.stationId !== profile.stationId) throw new Error("Report is outside your station.");
      const payload = await readJsonBody(req);
      const rejected = await rejectDailyShiftReport(rejectMatch[1], user.id, payload.reason || "", token);
      sendJson(res, 200, rejected);
      return;
    }

    const pdfMatch = url.pathname.match(/^\/api\/daily-shift-reports\/([^/]+)\/pdf$/);
    if (req.method === "GET" && pdfMatch) {
      const { token } = await getAuthContext(req);
      const report = await getDailyShiftReport(pdfMatch[1], token);
      sendJson(res, 200, { report, message: "PDF export will be generated in the next phase." });
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

    if (req.method === "POST" && url.pathname === "/api/pump-tank-links") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createPumpTankLink(state, payload));
      const saved = await savePumpTankLink(result);
      sendJson(res, 201, saved);
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

    if (req.method === "POST" && url.pathname === "/api/expenses") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createExpense(state, payload));
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/product-sales") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => createProductSale(state, payload));
      sendJson(res, 201, result);
      return;
    }

if (req.method === "POST" && url.pathname === "/api/debts/issue") {
  const payload = await readJsonBody(req);
  const result = await withState((state) => issueDebt(state, payload));
  // issueDebt either pushes a new debt (withState saves it) OR mutates an
  // existing one in-place (proxy can't detect that — we save it manually here).
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.debt.id);
  const wasNewPush = !isUuid; // local/seed IDs are "debt-timestamp-hex", not UUIDs
  if (!wasNewPush) {
    await updateDebt(result.debt);
  }
  sendJson(res, 201, result);
  return;
}

    if (req.method === "POST" && url.pathname === "/api/debts/settle") {
      const payload = await readJsonBody(req);
      const result = await withState((state) => settleDebt(state, payload));
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
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
