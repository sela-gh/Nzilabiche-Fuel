import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowDownUp,
  Banknote,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Droplets,
  Factory,
  Gauge,
  LayoutDashboard,
  Link2,
  Moon,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Settings,
  Sun,
  Truck,
  WalletCards,
  X
} from "lucide-react";
import "./styles.css";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const APP_LOCALE = "en-TZ";
const APP_TIME_ZONE = "Africa/Dar_es_Salaam";
const EAT_OFFSET = "+03:00";

const SHIFTS = [
  { value: "day", label: "Day Shift", icon: Sun },
  { value: "night", label: "Night Shift", icon: Moon }
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank", label: "Bank Transfer" }
];

const DEBT_EXPENSE_CATEGORY = "Debt";

const EXPENSE_CATEGORIES = [
  "Salaries & Wages",
  "Electricity",
  "Water",
  "Rent",
  "Maintenance & Repairs",
  "Generator Fuel",
  "Security",
  "Transport",
  "Supplies & Consumables",
  "Tax & Levies",
  "Insurance",
  DEBT_EXPENSE_CATEGORY,
  "Other"
];

const PRODUCT_SALE_CATEGORIES = [
  "Engine Oil",
  "Tyres",
  "Lubricants",
  "Accessories",
  "Car Care",
  "Shop Item",
  "Other"
];

// AFTER
const money = (value) =>
  new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const liters = (value) =>
  `${new Intl.NumberFormat(APP_LOCALE, { 
    minimumFractionDigits: 3,
    maximumFractionDigits: 10
  }).format(Number(value || 0))} L`;

const shortDate = (value) =>
  value
    ? new Intl.DateTimeFormat(APP_LOCALE, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: APP_TIME_ZONE,
        timeZoneName: "short"
      }).format(new Date(value))
    : "Not set";

const eatDateKey = (value) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(new Date(value))
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const eatDateTimeInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const eatInputToIso = (value) => {
  if (!value) return value;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}${EAT_OFFSET}`).toISOString();
};

const api = {
  token: "",
  setToken(token) {
    this.token = token || "";
  },
  headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  },
  async getMe() {
    const response = await fetch("/api/me", { headers: this.headers() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Login required");
    return body;
  },
  async getBootstrap() {
    const response = await fetch("/api/bootstrap", { headers: this.headers() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load data");
    return body;
  },
  async getDatabaseStatus() {
    const response = await fetch("/api/database-status");
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Database status check failed");
    return body;
  },
  async post(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers() },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Request failed");
    return body;
  },
  async getDailyShiftReports(status = "pending") {
    const response = await fetch(`/api/daily-shift-reports?status=${encodeURIComponent(status)}`, {
      headers: this.headers()
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load reports");
    return body.reports || [];
  },
  async getFuelDeliveryOffloads(status = "pending") {
    const response = await fetch(`/api/fuel-deliveries?status=${encodeURIComponent(status)}`, {
      headers: this.headers()
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load offloading reports");
    return body.reports || [];
  }
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "deposits", label: "Deposits", icon: Banknote },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "depot", label: "Depot Trips", icon: Factory },
  { id: "sales", label: "Sales", icon: ShoppingBag },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "variance", label: "Variance", icon: AlertTriangle },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "setup", label: "Setup", icon: Settings }
];

const emptyForms = {
  deposit: {
    stationId: "",
    date: eatDateTimeInput(),
    shift: "day",
    paymentMethod: "cash",
    lines: [
      { productId: "product-petrol", pumpNumber: 1, cashDeposited: 0, pumpPrice: 0 },
      { productId: "product-diesel", pumpNumber: 1, cashDeposited: 0, pumpPrice: 0 },
    ]
  },
  depot: {
    supplier: "",
    invoiceNumber: "",
    lorryId: "",
    productId: "",
    litersPurchased: 0,
    totalPurchaseCost: 0,
    purchasedAt: eatDateTimeInput()
  },
  delivery: {
    stationId: "",
    productId: "",
    deliveredAt: eatDateTimeInput(),
    pumps: [
      { pumpNumber: 1, depotTripId: "", litersDelivered: 0, preDeliveryDipstickLiters: 0 },
      { pumpNumber: 2, depotTripId: "", litersDelivered: 0, preDeliveryDipstickLiters: 0 }
    ]
  },
  internal: {
    stationId: "",
    productId: "",
    date: eatDateTimeInput(),
    shift: "day",
    liters: 0,
    reason: ""
  },
  pump: {
    stationId: "",
    productId: "",
    date: eatDateTimeInput(),
    shift: "day",
    openingReading: 0,
    closingReading: 0
  },
  monthEnd: {
    stationId: "",
    productId: "",
    closedAt: eatDateTimeInput(),
    finalDipstickLiters: 0
  },
  station: {
    name: "",
    location: "",
    tankCapacityLiters: 0,
    lowStockThresholdLiters: 0,
    petrolTankCount: 1,
    dieselTankCount: 1,
    keroseneTankCount: 1
  },
  lorry: {
    plateNumber: "",
    driverName: "",
    capacityLiters: 0,
    notes: ""
  },
  pumpTankLink: {
    stationId: "",
    productId: "",
    pumpNumber: 1,
    tankNumber: 1
  },
  expense: {
    stationId: "",
    date: eatDateTimeInput(),
    shift: "day",
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: 0,
    paymentMethod: "cash"
  },
  productSale: {
    stationId: "",
    date: eatDateTimeInput(),
    shift: "day",
    itemName: "",
    category: PRODUCT_SALE_CATEGORIES[0],
    quantity: 1,
    unitPrice: 0,
    paymentMethod: "cash",
    notes: ""
  },
  debtIssue: {
    stationId: "",
    date: eatDateTimeInput(),
    shift: "day",
    debtorName: "",
    description: "",
    amount: 0,
    paymentMethod: "cash"
  },
  debtSettlement: {
    debtId: "",
    settledAt: eatDateTimeInput(),
    amount: 0,
    paymentMethod: "cash",
    note: ""
  },
  dailyReport: {
    stationId: "",
    reportDate: eatDateKey(new Date()),
    shift: "day",
    meterLines: [],
    dippingLines: [],
    creditLines: [{ debtorName: "", description: "", amount: 0, paymentMethod: "cash" }],
    settlementLines: [{ debtId: "", amount: 0, paymentMethod: "cash", note: "" }],
    expenseLines: [{ category: EXPENSE_CATEGORIES[0], description: "", amount: 0, paymentMethod: "cash" }],
    notes: ""
  },
  offload: {
    stationId: "",
    lorryId: "",
    deliveredAt: eatDateTimeInput(),
    pumpLines: [
      { tankNumber: 1, productId: "", depotTripId: "", litersDelivered: 0, preDeliveryDipstickLiters: 0 }
    ],
    notes: ""
  }
};

function productTankCount(station, product) {
  const name = (product?.name || "").toLowerCase();
  if (!station) return 1;
  if (name.includes("diesel") || name.includes("ago")) return station.dieselTankCount || 1;
  if (name.includes("kerosene")) return station.keroseneTankCount || 1;
  return station.petrolTankCount || 1;
}

function pumpTankLinksFor(links, stationId, productId) {
  return (links || [])
    .filter((link) => link.stationId === stationId && link.productId === productId)
    .sort((a, b) => Number(a.pumpNumber || 1) - Number(b.pumpNumber || 1));
}

// Build deposit lines from explicit pump-to-tank links. If a station has not
// been mapped yet, keep the legacy pump number = tank number behavior.
function buildDepositLines(products, stations, stationId, pumpTankLinks = []) {
  const station = stations.find(s => s.id === stationId);
  const lines = [];

  for (const product of products) {
    const configuredLinks = pumpTankLinksFor(pumpTankLinks, stationId, product.id);

    if (configuredLinks.length > 0) {
      // Use explicit pump→tank links — no fallback loop needed
      for (const link of configuredLinks) {
        lines.push({
          productId: product.id,
          pumpNumber: Number(link.pumpNumber || 1),
          tankNumber: Number(link.tankNumber || 1),
          cashDeposited: 0,
          pumpPrice: 0
        });
      }
    } else {
      // No links configured — fall back to tankCount
      const tankCount = productTankCount(station, product);
      for (let pump = 1; pump <= tankCount; pump++) {
        lines.push({
          productId: product.id,
          pumpNumber: pump,
          tankNumber: pump,
          cashDeposited: 0,
          pumpPrice: 0
        });
      }
    }
  }

  return lines.sort((a, b) => {
    if (a.productId !== b.productId) return a.productId.localeCompare(b.productId);
    return a.pumpNumber - b.pumpNumber;
  });
}

function buildReportMeterLines(products, stations, stationId, pumpTankLinks = []) {
  return buildDepositLines(products, stations, stationId, pumpTankLinks).map((line) => ({
    productId: line.productId,
    pumpNumber: line.pumpNumber,
    tankNumber: line.tankNumber,
    openingReading: 0,
    closingReading: 0,
    pumpPrice: 0,
    paymentMethod: "cash"
  }));
}

function buildDippingLines(products, stations, stationId) {
  const station = stations.find((item) => item.id === stationId);
  return products.flatMap((product) => {
    const count = productTankCount(station, product);
    return Array.from({ length: count }, (_, index) => ({
      productId: product.id,
      tankNumber: index + 1,
      openingDip: 0,
      closingDip: 0
    }));
  });
}

function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [auth, setAuth] = useState({ loading: true, session: null, user: null, profile: null });
  const [forms, setForms] = useState(emptyForms);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [lastSubmittedReport, setLastSubmittedReport] = useState(null);
  const [pendingOffloads, setPendingOffloads] = useState([]);
  const [lastSubmittedOffload, setLastSubmittedOffload] = useState(null);
  const [activeShift, setActiveShift] = useState("day");
  const [databaseStatus, setDatabaseStatus] = useState({
    connected: false,
    configured: isSupabaseConfigured,
    message: "Checking Supabase connection..."
  });

  const hydrateAuth = async (session) => {
    api.setToken(session?.access_token || "");
    if (!session && isSupabaseConfigured) {
      setAuth({ loading: false, session: null, user: null, profile: null });
      setData(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setAuth({
        loading: false,
        session: null,
        user: { id: "local-user", email: "local@example.test" },
        profile: { userId: "local-user", fullName: "Local Manager", role: "manager", stationId: null }
      });
      return;
    }

    const me = await api.getMe();
    setAuth({ loading: false, session, user: me.user, profile: me.profile });
  };

  const loadPendingReports = async (profile = auth.profile) => {
    if (profile?.role !== "manager") return;
    const reports = await api.getDailyShiftReports("pending");
    setPendingReports(reports);
  };

  const loadPendingOffloads = async (profile = auth.profile) => {
    if (profile?.role !== "manager") return;
    const reports = await api.getFuelDeliveryOffloads("pending");
    setPendingOffloads(reports);
  };

  const load = async () => {
    setError("");
    const bootstrap = await api.getBootstrap();
    setData(bootstrap);
    const firstStation = bootstrap.stations[0]?.id || "";
    const firstProduct = bootstrap.products[0]?.id || "";
    const firstLorry = bootstrap.lorries[0]?.id || "";
    const firstDepotTrip = bootstrap.depotTrips?.find(t => t.productId === firstProduct)?.id || "";
    setForms((current) => ({
      ...current,
      deposit: {
        ...current.deposit,
        stationId: current.deposit.stationId || firstStation,
        lines: buildDepositLines(
          bootstrap.products,
          bootstrap.stations,
          current.deposit.stationId || firstStation,
          bootstrap.pumpTankLinks || []
        )
      },
      depot: {
        ...current.depot,
        lorryId: current.depot.lorryId || firstLorry,
        productId: current.depot.productId || firstProduct
      },
      delivery: {
        ...current.delivery,
        stationId: current.delivery.stationId || firstStation,
        productId: current.delivery.productId || firstProduct
      },
      pumpTankLink: {
        ...current.pumpTankLink,
        stationId: current.pumpTankLink.stationId || firstStation,
        productId: current.pumpTankLink.productId || firstProduct
      },
      internal: {
        ...current.internal,
        stationId: current.internal.stationId || firstStation,
        productId: current.internal.productId || firstProduct
      },
      pump: {
        ...current.pump,
        stationId: current.pump.stationId || firstStation,
        productId: current.pump.productId || firstProduct
      },
      monthEnd: {
        ...current.monthEnd,
        stationId: current.monthEnd.stationId || firstStation,
        productId: current.monthEnd.productId || firstProduct
      },
      expense: {
        ...current.expense,
        stationId: current.expense.stationId || firstStation
      },
      productSale: {
        ...current.productSale,
        stationId: current.productSale.stationId || firstStation
      },
      debtIssue: {
        ...current.debtIssue,
        stationId: current.debtIssue.stationId || firstStation
      },
dailyReport: {
        ...current.dailyReport,
        stationId: current.dailyReport.stationId || firstStation,
        meterLines: current.dailyReport.meterLines.length
          ? current.dailyReport.meterLines
          : buildReportMeterLines(
              bootstrap.products,
              bootstrap.stations,
              current.dailyReport.stationId || firstStation,
              bootstrap.pumpTankLinks || []
            ),
        dippingLines: current.dailyReport.dippingLines.length
          ? current.dailyReport.dippingLines
          : buildDippingLines(bootstrap.products, bootstrap.stations, current.dailyReport.stationId || firstStation)
      },
      // ADDED THIS BLOCK TO FIX THE OFFLOADING ERROR
      offload: {
        ...current.offload,
        stationId: current.offload.stationId || firstStation,
        lorryId: current.offload.lorryId || firstLorry,
        pumpLines: current.offload.pumpLines.map((line, idx) => 
          idx === 0 && !line.productId
            ? { ...line, productId: firstProduct, depotTripId: firstDepotTrip }
            : line
        )
      }
    }));
    setExpenses(bootstrap.expenses || []);
    setDebts(bootstrap.debts || []);
    await loadPendingReports();
    await loadPendingOffloads();
    api
      .getDatabaseStatus()
      .then(setDatabaseStatus)
      .catch((err) =>
        setDatabaseStatus({ connected: false, configured: isSupabaseConfigured, message: err.message })
      );
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      hydrateAuth(null).catch((err) => {
        setAuth((current) => ({ ...current, loading: false }));
        setError(err.message);
      });
      return;
    }

    supabase.auth.getSession().then(({ data: sessionData }) => {
      hydrateAuth(sessionData.session).catch((err) => {
        setAuth({ loading: false, session: null, user: null, profile: null });
        setError(err.message);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateAuth(session).catch((err) => setError(err.message));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.loading && auth.profile) {
      load().catch((err) => setError(err.message));
    }
  }, [auth.loading, auth.profile?.userId]);

  const reference = useMemo(() => {
    if (!data) return { stations: [], products: [], depotTrips: [], lorries: [], pumpTankLinks: [] };
    return {
      stations: data.stations,
      products: data.products,
      depotTrips: data.depotTrips,
      lorries: data.lorries,
      pumpTankLinks: data.pumpTankLinks || []
    };
  }, [data]);

  const updateForm = (key, field, value) => {
    setForms((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  };

  const updateDepositLine = (productId, pumpNumber, field, value) => {
    setForms((current) => ({
      ...current,
      deposit: {
        ...current.deposit,
        lines: current.deposit.lines.map((line) =>
          line.productId === productId && (line.pumpNumber || 1) === pumpNumber
            ? { ...line, [field]: value }
            : line
        )
      }
    }));
  };

  const submit = async (formKey, path, message) => {
    setError("");
    setNotice("");
    try {
      const payload = { ...forms[formKey] };
      for (const key of Object.keys(payload)) {
        if (key.endsWith("At") || key === "date" || key === "closedAt") {
          payload[key] = eatInputToIso(payload[key]);
        }
      }
      await api.post(path, payload);
      setNotice(message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitPumpTankLink = async () => {
    setError("");
    setNotice("");
    const f = forms.pumpTankLink;
    if (!f.stationId || !f.productId) {
      setError("Please select a station and product.");
      return;
    }
    if (Number(f.pumpNumber) <= 0 || Number(f.tankNumber) <= 0) {
      setError("Pump and tank numbers must be greater than zero.");
      return;
    }

    try {
      await api.post("/api/pump-tank-links", {
        stationId: f.stationId,
        productId: f.productId,
        pumpNumber: Number(f.pumpNumber),
        tankNumber: Number(f.tankNumber)
      });
      setNotice(`Pump ${f.pumpNumber} linked to tank ${f.tankNumber}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitExpense = async () => {
    setError("");
    setNotice("");
    const f = forms.expense;
    if (!f.stationId) { setError("Please select a station."); return; }
    if (Number(f.amount) <= 0) { setError("Amount must be greater than zero."); return; }
    if (!f.description.trim()) { setError("Please enter a description."); return; }

    try {
      await api.post("/api/expenses", {
        stationId: f.stationId,
        date: eatInputToIso(f.date),
        shift: f.shift,
        category: f.category,
        description: f.description.trim(),
        amount: Number(f.amount),
        paymentMethod: f.paymentMethod
      });
      setNotice("Expense recorded.");
      setForms((current) => ({
        ...current,
        expense: { ...emptyForms.expense, stationId: f.stationId, date: eatDateTimeInput() }
      }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitProductSale = async () => {
    setError("");
    setNotice("");
    const f = forms.productSale;
    const itemName = f.itemName.trim();
    const category = f.category.trim();
    const quantity = Number(f.quantity);
    const unitPrice = Number(f.unitPrice);

    if (!f.stationId) { setError("Please select a station."); return; }
    if (!itemName) { setError("Please enter the item sold."); return; }
    if (!category) { setError("Please select a category."); return; }
    if (quantity <= 0) { setError("Quantity must be greater than zero."); return; }
    if (unitPrice <= 0) { setError("Unit price must be greater than zero."); return; }

    try {
      await api.post("/api/product-sales", {
        stationId: f.stationId,
        date: eatInputToIso(f.date),
        shift: f.shift,
        itemName,
        category,
        quantity,
        unitPrice,
        paymentMethod: f.paymentMethod,
        notes: f.notes.trim()
      });
      setNotice("Product sale recorded.");
      setForms((current) => ({
        ...current,
        productSale: {
          ...emptyForms.productSale,
          stationId: f.stationId,
          date: eatDateTimeInput(),
          shift: f.shift,
          paymentMethod: f.paymentMethod
        }
      }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitDebtIssue = async () => {
    setError("");
    setNotice("");
    const f = forms.debtIssue;
    const debtorName = f.debtorName.trim();
    const description = f.description.trim();
    const amount = Number(f.amount);

    if (!f.stationId) { setError("Please select a station for the debt."); return; }
    if (!debtorName) { setError("Please enter who received the debt."); return; }
    if (!description) { setError("Please enter what the debt was for."); return; }
    if (amount <= 0) { setError("Debt amount must be greater than zero."); return; }

    try {
      const result = await api.post("/api/debts/issue", {
        stationId: f.stationId,
        debtorName,
        description,
        amount,
        date: eatInputToIso(f.date),
        shift: f.shift,
        paymentMethod: f.paymentMethod
      });
      setNotice("Debt recorded and added to expenses.");
      setForms((current) => ({
        ...current,
        debtIssue: {
          ...emptyForms.debtIssue,
          stationId: f.stationId,
          date: eatDateTimeInput(),
          paymentMethod: f.paymentMethod
        },
        debtSettlement: {
          ...current.debtSettlement,
          debtId: result.debtId || ""
        }
      }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitDebtSettlement = async () => {
    setError("");
    setNotice("");
    const f = forms.debtSettlement;
    const amount = Number(f.amount);
    const debt = debts.find((item) => item.id === f.debtId);

    if (!debt) { setError("Please select an open debt to settle."); return; }
    if (amount <= 0) { setError("Settlement amount must be greater than zero."); return; }
    if (amount > debt.outstandingAmount) {
      setError(`Settlement cannot exceed the outstanding balance of ${money(debt.outstandingAmount)}.`);
      return;
    }

    try {
      await api.post("/api/debts/settle", {
        debtId: debt.id,
        stationId: debt.stationId,
        amount,
        settledAt: eatInputToIso(f.settledAt),
        paymentMethod: f.paymentMethod,
        note: f.note.trim()
      });
      const remaining = Math.max(0, debt.outstandingAmount - amount);
      setNotice(remaining === 0 ? "Debt fully settled." : "Debt settlement recorded.");
      setForms((current) => ({
        ...current,
        debtSettlement: {
          ...emptyForms.debtSettlement,
          settledAt: eatDateTimeInput(),
          paymentMethod: f.paymentMethod
        }
      }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

 const signIn = async ({ email, password }) => {
    setError("");
    setNotice("");
    if (!supabase) {
      setError("Supabase is not configured for login.");
      return;
    }
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    
    // REMOVE the await hydrateAuth(signInData.session); line.
    // The useEffect onAuthStateChange listener will automatically handle it!
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    api.setToken("");
    setAuth({ loading: false, session: null, user: null, profile: null });
    setData(null);
  };

  const updateReportArray = (field, index, key, value) => {
    setForms((current) => ({
      ...current,
      dailyReport: {
        ...current.dailyReport,
        [field]: current.dailyReport[field].map((line, i) =>
          i === index ? { ...line, [key]: value } : line
        )
      }
    }));
  };

  const addReportArrayLine = (field, line) => {
    setForms((current) => ({
      ...current,
      dailyReport: {
        ...current.dailyReport,
        [field]: [...current.dailyReport[field], line]
      }
    }));
  };

  const updateOffloadLine = (index, key, value) => {
    setForms((current) => ({
      ...current,
      offload: {
        ...current.offload,
        pumpLines: current.offload.pumpLines.map((line, i) => {
          if (i !== index) return line;
          if (key === "productId") {
            // Find the first depot trip that matches the newly selected product
            const defaultDepot = data.depotTrips?.find(t => t.productId === value)?.id || "";
            return { ...line, productId: value, tankNumber: 1, depotTripId: defaultDepot };
          }
          return { ...line, [key]: value };
        })
      }
    }));
  };

const addOffloadLine = () => {
    const firstProduct = data.products[0]?.id || "";
    const firstDepotTrip = data.depotTrips?.find(t => t.productId === firstProduct)?.id || "";
    
    setForms((current) => ({
      ...current,
      offload: {
        ...current.offload,
        pumpLines: [
          ...current.offload.pumpLines,
          {
            tankNumber: 1,
            productId: firstProduct,
            depotTripId: firstDepotTrip,
            litersDelivered: 0,
            preDeliveryDipstickLiters: 0
          }
        ]
      }
    }));
  };

  const removeOffloadLine = (index) => {
    setForms((current) => ({
      ...current,
      offload: {
        ...current.offload,
        pumpLines: current.offload.pumpLines.filter((_, i) => i !== index)
      }
    }));
  };

  const submitDailyReport = async () => {
    setError("");
    setNotice("");
    const f = forms.dailyReport;
    try {
      const result = await api.post("/api/daily-shift-reports", {
        stationId: f.stationId,
        reportDate: f.reportDate,
        shift: f.shift,
        pumpPrices: f.meterLines.map((line) => ({
          productId: line.productId,
          pumpNumber: line.pumpNumber,
          tankNumber: line.tankNumber,
          pumpPrice: Number(line.pumpPrice || 0)
        })),
        meterLines: f.meterLines.map((line) => ({
          ...line,
          openingReading: Number(line.openingReading || 0),
          closingReading: Number(line.closingReading || 0),
          pumpPrice: Number(line.pumpPrice || 0)
        })),
        dippingLines: f.dippingLines.map((line) => ({
          ...line,
          openingDip: Number(line.openingDip || 0),
          closingDip: Number(line.closingDip || 0)
        })),
        creditLines: f.creditLines
          .filter((line) => line.debtorName.trim() || Number(line.amount || 0) > 0)
          .map((line) => ({ ...line, amount: Number(line.amount || 0) })),
        settlementLines: f.settlementLines
          .filter((line) => line.debtId || Number(line.amount || 0) > 0)
          .map((line) => ({ ...line, amount: Number(line.amount || 0) })),
        expenseLines: f.expenseLines
          .filter((line) => line.description.trim() || Number(line.amount || 0) > 0)
          .map((line) => ({ ...line, amount: Number(line.amount || 0) })),
        notes: f.notes.trim()
      });
      setLastSubmittedReport(result);
      setNotice("Daily report submitted for manager review.");
    } catch (err) {
      setError(err.message);
    }
  };

  const submitOffload = async () => {
    setError("");
    setNotice("");
    const f = forms.offload;
    try {
      const result = await api.post("/api/fuel-deliveries", {
        stationId: f.stationId,
        lorryId: f.lorryId || null,
        deliveredAt: eatInputToIso(f.deliveredAt),
        pumpLines: f.pumpLines.map((line) => ({
          ...line,
          tankNumber: Number(line.tankNumber || 1),
          litersDelivered: Number(line.litersDelivered || 0),
          preDeliveryDipstickLiters: Number(line.preDeliveryDipstickLiters || 0)
        })),
        notes: f.notes.trim()
      });
      setLastSubmittedOffload(result);
      setNotice("Offloading report submitted for manager review.");
    } catch (err) {
      setError(err.message);
    }
  };

  const resetOffload = () => {
    if (!data) return;
    const stationId = forms.offload.stationId || data.stations[0]?.id || "";
    setLastSubmittedOffload(null);
    setForms((current) => ({
      ...current,
      offload: {
        ...emptyForms.offload,
        stationId,
        deliveredAt: eatDateTimeInput()
      }
    }));
  };

  const resetDailyReport = () => {
    if (!data) return;
    const stationId = forms.dailyReport.stationId || data.stations[0]?.id || "";
    setLastSubmittedReport(null);
    setForms((current) => ({
      ...current,
      dailyReport: {
        ...emptyForms.dailyReport,
        stationId,
        reportDate: eatDateKey(new Date()),
        shift: current.dailyReport.shift,
        meterLines: buildReportMeterLines(data.products, data.stations, stationId, data.pumpTankLinks || []),
        dippingLines: buildDippingLines(data.products, data.stations, stationId)
      }
    }));
  };

  const confirmReport = async (reportId) => {
    setError("");
    setNotice("");
    try {
      await api.post(`/api/daily-shift-reports/${reportId}/confirm`, {});
      setNotice("Report confirmed and posted to ledgers.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectReport = async (reportId) => {
    setError("");
    setNotice("");
    try {
      await api.post(`/api/daily-shift-reports/${reportId}/reject`, { reason: "Rejected by manager" });
      setNotice("Report rejected.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmOffload = async (reportId) => {
    setError("");
    setNotice("");
    try {
      await api.post(`/api/fuel-deliveries/${reportId}/confirm`, {});
      setNotice("Offloading report confirmed and posted to deliveries.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectOffload = async (reportId) => {
    setError("");
    setNotice("");
    try {
      await api.post(`/api/fuel-deliveries/${reportId}/reject`, { reason: "Rejected by manager" });
      setNotice("Offloading report rejected.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (auth.loading) {
    return (
      <main className="loading-shell">
        <RefreshCw className="spin" size={32} />
        <p>Checking login...</p>
      </main>
    );
  }

  if (isSupabaseConfigured && !auth.profile) {
    return <LoginScreen error={error} onSignIn={signIn} />;
  }

  if (!data) {
    return (
      <main className="loading-shell">
        <RefreshCw className="spin" size={32} />
        <p>Loading Nzilabiche Fuel tracker...</p>
      </main>
    );
  }

  const activeProps = {
    data,
    auth,
    reference,
    forms,
    updateForm,
    updateDepositLine,
    updateReportArray,
    addReportArrayLine,
    submit,
    submitPumpTankLink,
    submitExpense,
    submitProductSale,
    submitDebtIssue,
    submitDebtSettlement,
    expenses,
    debts,
    databaseStatus,
    activeShift,
    setActiveShift,
    setError,
    setNotice,
    load,
    pendingReports,
    submitDailyReport,
    resetDailyReport,
    confirmReport,
    rejectReport,
    lastSubmittedReport,
    pendingOffloads,
    updateOffloadLine,
    addOffloadLine,
    removeOffloadLine,
    submitOffload,
    resetOffload,
    confirmOffload,
    rejectOffload,
    lastSubmittedOffload,
    signOut
  };

  if (auth.profile?.role === "staff") {
    return (
      <StaffReportShell
        {...activeProps}
        notice={notice}
        error={error}
        setForms={setForms}
      />
    );
  }

  const managerNavItems = [
    ...navItems,
    { id: "pendingReports", label: "Pending Reports", icon: ClipboardList },
    { id: "pendingOffloads", label: "Pending Offloading", icon: Truck }
  ];

  return (
    <div className={`app-shell${activeShift === "night" ? " night-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Droplets size={26} />
          </div>
          <div>
            <strong>Nzilabiche Fuel</strong>
            <span>Management tracker</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {managerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "active" : ""}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="stack-status">
          <ShieldCheck size={18} />
          <span>
            {databaseStatus.connected
              ? "Supabase database linked."
              : "Local data active; Supabase configured."}
          </span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cycle-based reconciliation</p>
            <h1>{managerNavItems.find((item) => item.id === activeView)?.label || "Dashboard"}</h1>
          </div>
          <div className="topbar-right">
            <div className="global-shift-switcher">
              {SHIFTS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`shift-switcher-btn${activeShift === value ? " active" : ""}`}
                  onClick={() => {
                    setActiveShift(value);
                    setForms(current => ({
                      ...current,
                      deposit: { ...current.deposit, shift: value },
                      productSale: { ...current.productSale, shift: value },
                      expense: { ...current.expense, shift: value },
                      debtIssue: { ...current.debtIssue, shift: value },
                      internal: { ...current.internal, shift: value },
                      pump: { ...current.pump, shift: value }
                    }));
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            <button className="icon-button" onClick={load} type="button" aria-label="Refresh data">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" onClick={signOut} type="button" aria-label="Sign out">
              <ShieldCheck size={18} />
            </button>
          </div>
        </header>
        {activeShift === "night" && (
          <div className="night-shift-banner">
            <Moon size={16} />
            Night shift active — all entries will be recorded under night shift
          </div>
        )}

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error">{error}</div>}

        {activeView === "dashboard" && <Dashboard {...activeProps} />}
        {activeView === "deposits" && <Deposits {...activeProps} />}
        {activeView === "deliveries" && <Deliveries {...activeProps} />}
        {activeView === "depot" && <DepotTrips {...activeProps} />}
        {activeView === "sales" && <Sales {...activeProps} />}
        {activeView === "expenses" && <Expenses {...activeProps} />}
        {activeView === "variance" && <Variance {...activeProps} />}
        {activeView === "reports" && <Reports {...activeProps} />}
        {activeView === "setup" && <Setup {...activeProps} />}
        {activeView === "pendingReports" && <ManagerPendingReports {...activeProps} />}
        {activeView === "pendingOffloads" && <ManagerPendingOffloads {...activeProps} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Authenticated role surfaces
// ---------------------------------------------------------------------------
function LoginScreen({ error, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    await onSignIn({ email, password });
    setIsSubmitting(false);
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-block auth-brand">
          <div className="brand-mark">
            <Droplets size={26} />
          </div>
          <div>
            <strong>Nzilabiche Fuel</strong>
            <span>Secure station access</span>
          </div>
        </div>
        {error && <div className="notice error">{error}</div>}
        <FormGrid>
          <InputField label="Email" type="email" value={email} onChange={setEmail} />
          <InputField label="Password" type="password" value={password} onChange={setPassword} />
        </FormGrid>
        <ActionButton onClick={handleLogin} disabled={isSubmitting}>
          {isSubmitting ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />}
          {isSubmitting ? "Signing in..." : "Sign in"}
        </ActionButton>
      </section>
    </main>
  );
}

function StaffReportShell({
  data,
  auth,
  forms,
  updateForm,
  updateReportArray,
  addReportArrayLine,
  submitDailyReport,
  resetDailyReport,
  lastSubmittedReport,
  updateOffloadLine,
  addOffloadLine,
  removeOffloadLine,
  submitOffload,
  resetOffload,
  lastSubmittedOffload,
  notice,
  error,
  signOut,
  setForms
}) {
  const [staffTab, setStaffTab] = useState("report");
  const report = forms.dailyReport;
  const offload = forms.offload;
  const stationOptions = data.stations.map((station) => ({ value: station.id, label: station.name }));
  const productOptions = data.products.map((product) => ({ value: product.id, label: product.name }));
  const lorryOptions = data.lorries.map((lorry) => ({ value: lorry.id, label: lorry.plateNumber }));
  const debtOptions = (data.debts || [])
    .filter((debt) => debt.status === "open")
    .map((debt) => ({
      value: debt.id,
      label: `${debt.debtorName} - ${money(debt.outstandingAmount)}`
    }));

  const depotOptionsFor = (productId) => [
    { value: "", label: "-- Select depot trip --" },
    ...(data.depotTrips || [])
      .filter((trip) => trip.productId === productId)
      .map((trip) => ({
        value: trip.id,
        label: `${trip.invoiceNumber} @ ${money(trip.costPerLiter)}`
      }))
  ];

  const selectedOffloadStation = data.stations.find((station) => station.id === offload.stationId);
  const tankOptionsFor = (productId) => {
    const product = data.products.find((item) => item.id === productId);
    const tankCount = productTankCount(selectedOffloadStation, product);
    return Array.from({ length: tankCount }, (_, index) => ({
      value: index + 1,
      label: `Tank ${index + 1}`
    }));
  };

  const handleStationChange = (stationId) => {
    setForms((current) => ({
      ...current,
      dailyReport: {
        ...current.dailyReport,
        stationId,
        meterLines: buildReportMeterLines(data.products, data.stations, stationId, data.pumpTankLinks || []),
        dippingLines: buildDippingLines(data.products, data.stations, stationId)
      }
    }));
  };

  const thStyle = { textAlign: 'left', padding: '6px 10px', fontSize: '10.5px',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280' };
const thStyleR = { ...thStyle, textAlign: 'right' };
const tdStyle = { padding: '8px 10px', color: '#111827' };
const tdStyleR = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

if (lastSubmittedReport) {
  // Group meter lines by product, filter out zero rows
  const meterByProduct = {};
  (lastSubmittedReport.meterLines || []).forEach(m => {
    const litresSold = Number(m.closingReading) - Number(m.openingReading);
    if (litresSold <= 0) return; // skip zero rows
    const name = productName(data, m.productId);
    if (!meterByProduct[name]) meterByProduct[name] = [];
    meterByProduct[name].push(m);
  });

  // Group dip lines by product, filter zero rows
  const dipByProduct = {};
  (lastSubmittedReport.dippingLines || []).forEach(d => {
    if (!d.openingDip && !d.closingDip) return; // skip zero rows
    const name = productName(data, d.productId);
    if (!dipByProduct[name]) dipByProduct[name] = [];
    dipByProduct[name].push(d);
  });

  const totalRevenue = (lastSubmittedReport.meterLines || []).reduce((sum, m) => {
    const litres = Math.max(0, Number(m.closingReading) - Number(m.openingReading));
    return sum + litres * Number(m.pumpPrice || 0);
  }, 0);

  const totalLitres = (lastSubmittedReport.meterLines || []).reduce((sum, m) => {
    return sum + Math.max(0, Number(m.closingReading) - Number(m.openingReading));
  }, 0);

  return (
    <main className="staff-shell">
      <section className="success-screen" style={{ maxWidth: '860px', alignItems: 'stretch', textAlign: 'left' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={42} style={{ margin: '0 auto' }} className="no-print" />
          <h1 style={{ marginTop: '1rem' }}>Shift Report Submitted</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-2)' }}>
            {stationName(data, lastSubmittedReport.stationId)}
            &nbsp;·&nbsp;{shiftBadge(lastSubmittedReport.shift)}
            &nbsp;·&nbsp;{lastSubmittedReport.reportDate}
          </p>
        </div>

        {/* Pump Meters — grouped by product */}
        <div className="receipt-content" style={{ marginBottom: '2rem' }}>
          {Object.keys(meterByProduct).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                paddingBottom: '6px', marginBottom: '12px' }}>
                Pump Meter Readings
              </h3>
              {Object.entries(meterByProduct).map(([prodName, lines]) => {
                const prodLitres = lines.reduce((s, m) =>
                  s + Math.max(0, Number(m.closingReading) - Number(m.openingReading)), 0);
                const prodRevenue = lines.reduce((s, m) => {
                  const l = Math.max(0, Number(m.closingReading) - Number(m.openingReading));
                  return s + l * Number(m.pumpPrice || 0);
                }, 0);

                return (
                  <div key={prodName} style={{ marginBottom: '1.2rem' }}>
                    {/* Product group header */}
                    <div style={{ background: 'var(--surface-2)', padding: '6px 12px',
                      borderRadius: '6px', fontWeight: 700, fontSize: '13px',
                      marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>⛽ {prodName}</span>
                    </div>

                    {/* Pump rows */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <th style={thStyle}>Pump</th>
                          <th style={thStyleR}>Opening</th>
                          <th style={thStyleR}>Closing</th>
                          <th style={thStyleR}>Litres sold</th>
                          <th style={thStyleR}>Price/L</th>
                          <th style={thStyleR}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((m, i) => {
                          const litres = Math.max(0, Number(m.closingReading) - Number(m.openingReading));
                          const rev = litres * Number(m.pumpPrice || 0);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={tdStyle}>Pump {m.pumpNumber}</td>
                              <td style={tdStyleR}>{Number(m.openingReading).toLocaleString()}</td>
                              <td style={tdStyleR}>{Number(m.closingReading).toLocaleString()}</td>
                              <td style={{ ...tdStyleR, color: '#2d6a4f', fontWeight: 700 }}>{liters(litres)}</td>
                              <td style={tdStyleR}>{money(m.pumpPrice)}</td>
                              <td style={{ ...tdStyleR, fontWeight: 700 }}>{money(rev)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Subtotal row */}
                      <tfoot>
                        <tr style={{ background: '#f0fdf4', borderTop: '2px solid #2d6a4f' }}>
                          <td colSpan={3} style={{ ...tdStyle, fontWeight: 800 }}>{prodName} subtotal</td>
                          <td style={{ ...tdStyleR, fontWeight: 800, color: '#2d6a4f' }}>{liters(prodLitres)}</td>
                          <td style={tdStyleR}></td>
                          <td style={{ ...tdStyleR, fontWeight: 800 }}>{money(prodRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}

              {/* Grand total */}
              <div style={{ background: '#1a2332', color: '#fff', borderRadius: '8px',
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>Total revenue</span>
                <span style={{ fontWeight: 800, fontSize: '16px' }}>{money(totalRevenue)}</span>
              </div>
            </div>
          )}

          {/* Dipping report */}
          {Object.keys(dipByProduct).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                paddingBottom: '6px', marginBottom: '12px' }}>
                Dipping Report
              </h3>
              {Object.entries(dipByProduct).map(([prodName, lines]) => (
                <div key={prodName} style={{ marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '6px 12px',
                    borderRadius: '6px', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    {prodName}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={thStyle}>Tank</th>
                        <th style={thStyleR}>Morning dip (L)</th>
                        <th style={thStyleR}>Evening dip (L)</th>
                        <th style={thStyleR}>Consumed (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((d, i) => {
                        const consumed = Math.max(0, Number(d.openingDip) - Number(d.closingDip));
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={tdStyle}>Tank {d.tankNumber}</td>
                            <td style={tdStyleR}>{Number(d.openingDip).toLocaleString()}</td>
                            <td style={tdStyleR}>{Number(d.closingDip).toLocaleString()}</td>
                            <td style={{ ...tdStyleR, color: '#2d6a4f', fontWeight: 700 }}>{liters(consumed)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Expenses */}
          {(lastSubmittedReport.expenseLines || []).filter(e => Number(e.amount) > 0).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                paddingBottom: '6px', marginBottom: '12px' }}>
                Expenses
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyleR}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSubmittedReport.expenseLines
                    .filter(e => Number(e.amount) > 0)
                    .map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}>{e.category}</td>
                        <td style={tdStyle}>{e.description}</td>
                        <td style={{ ...tdStyleR, color: '#dc2626' }}>{money(e.amount)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #dc2626' }}>
                    <td colSpan={2} style={{ ...tdStyle, fontWeight: 800 }}>Total expenses</td>
                    <td style={{ ...tdStyleR, fontWeight: 800, color: '#dc2626' }}>
                      {money(lastSubmittedReport.totals?.expenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Summary box */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: '12px' }}>
              Summary
            </h3>
            {[
              { label: 'Total fuel revenue', value: money(totalRevenue), color: '#2d6a4f' },
              { label: 'Less: credit issued', value: `− ${money(lastSubmittedReport.totals?.creditsIssued || 0)}`, color: '#dc2626' },
              { label: 'Plus: debts settled', value: `+ ${money(lastSubmittedReport.totals?.creditsSettled || 0)}`, color: '#2d6a4f' },
              { label: 'Less: expenses', value: `− ${money(lastSubmittedReport.totals?.expenses || 0)}`, color: '#dc2626' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
                <strong style={{ color: row.color }}>{row.value}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between',
              padding: '10px 0 0', fontSize: '15px', fontWeight: 800 }}>
              <span>Net cash</span>
              <span style={{ color: '#2d6a4f' }}>
                {money(totalRevenue
                  - (lastSubmittedReport.totals?.creditsIssued || 0)
                  + (lastSubmittedReport.totals?.creditsSettled || 0)
                  - (lastSubmittedReport.totals?.expenses || 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="success-actions no-print" style={{ justifyContent: 'center' }}>
          <ActionButton onClick={() => window.print()}>
            <Receipt size={18} />
            Save PDF / Print
          </ActionButton>
          <ActionButton onClick={resetDailyReport}>
            <Plus size={18} />
            New report
          </ActionButton>
        </div>
      </section>
    </main>
  );
}

  if (lastSubmittedOffload) {
    return (
      <main className="staff-shell">
        <section className="success-screen" style={{ maxWidth: '800px', alignItems: 'stretch', textAlign: 'left' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <ShieldCheck size={42} style={{ margin: '0 auto' }} className="no-print" />
            <h1 style={{ marginTop: '1rem' }}>Offloading Report Submitted</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-2)' }}>
              {stationName(data, lastSubmittedOffload.stationId)} • {new Date(lastSubmittedOffload.deliveredAt).toLocaleString()}
            </p>
            <p><strong>Lorry:</strong> {lastSubmittedOffload.lorryId ? lorryName(data, lastSubmittedOffload.lorryId) : "Not set"}</p>
          </div>

          <div className="receipt-content" style={{ marginBottom: '2rem' }}>
            <DataTable 
              title="Tanks Offloaded"
              columns={["Product", "Tank", "Offloaded", "Pre-delivery Dip"]}
              rows={(lastSubmittedOffload.pumpLines || []).map(line => [
                productName(data, line.productId),
                `Tank ${line.tankNumber}`,
                liters(line.litersDelivered),
                liters(line.preDeliveryDipstickLiters)
              ])}
            />
            
            {lastSubmittedOffload.notes && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                <strong>Notes: </strong> {lastSubmittedOffload.notes}
              </div>
            )}
          </div>

          <div className="success-actions no-print" style={{ justifyContent: 'center' }}>
            <ActionButton onClick={() => window.print()}>
              <Receipt size={18} />
              Save PDF / Print
            </ActionButton>
            <ActionButton onClick={() => navigator.share?.({ title: "Offloading report", text: `Offloading Report: ${stationName(data, lastSubmittedOffload.stationId)}` })}>
              <Phone size={18} />
              Share
            </ActionButton>
            <ActionButton onClick={resetOffload}>
              <Plus size={18} />
              New offloading report
            </ActionButton>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="staff-shell">
      <header className="staff-topbar">
        <div>
          <p className="eyebrow">{staffTab === "report" ? "Daily shift report" : "Offloading report"}</p>
          <h1>Nzilabiche Fuel</h1>
          <span>{auth.profile?.fullName || auth.user?.email}</span>
        </div>
        <button className="icon-button" onClick={signOut} type="button" aria-label="Sign out">
          <ShieldCheck size={18} />
        </button>
      </header>

      <div className="toggle-group" style={{ marginBottom: "16px" }}>
        <span className="toggle-label">Report type</span>
        <div className="toggle-buttons">
          <button
            type="button"
            className={`toggle-btn${staffTab === "report" ? " active" : ""}`}
            onClick={() => setStaffTab("report")}
          >
            <ClipboardList size={15} />
            Shift report
          </button>
          <button
            type="button"
            className={`toggle-btn${staffTab === "offload" ? " active" : ""}`}
            onClick={() => setStaffTab("offload")}
          >
            <Truck size={15} />
            Offloading
          </button>
        </div>
      </div>

      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error">{error}</div>}

      {staffTab === "offload" ? (
        <section className="view-grid">
          <EntryPanel title="Offloading details" description="Which station and lorry offloaded fuel, and when." icon={Truck}>
            <FormGrid>
              <SelectField label="Station" value={offload.stationId} onChange={(v) => updateForm("offload", "stationId", v)} options={stationOptions} />
              <SelectField label="Lorry" value={offload.lorryId} onChange={(v) => updateForm("offload", "lorryId", v)} options={lorryOptions} />
              <InputField label="Delivered at" type="datetime-local" value={offload.deliveredAt} onChange={(v) => updateForm("offload", "deliveredAt", v)} />
            </FormGrid>
          </EntryPanel>

          <EntryPanel title="Tank lines" description="Add one line per tank that received fuel from this offload. A tank can feed more than one pump — that's handled automatically." icon={Droplets}>
            <div className="report-line-grid">
              {offload.pumpLines.map((line, index) => (
                <div className="report-line" key={index}>
                  <SelectField
                    label="Product"
                    value={line.productId}
                    onChange={(v) => updateOffloadLine(index, "productId", v)}
                    options={productOptions}
                  />
                  <SelectField
                    label="Tank"
                    value={line.tankNumber}
                    onChange={(v) => updateOffloadLine(index, "tankNumber", Number(v))}
                    options={tankOptionsFor(line.productId)}
                  />
                  <SelectField
                    label="Depot trip"
                    value={line.depotTripId}
                    onChange={(v) => updateOffloadLine(index, "depotTripId", v)}
                    options={depotOptionsFor(line.productId)}
                  />
                  <InputField label="Liters offloaded" type="number" value={line.litersDelivered} onChange={(v) => updateOffloadLine(index, "litersDelivered", v)} />
                  <InputField label="Pre-delivery dipstick (L)" type="number" value={line.preDeliveryDipstickLiters} onChange={(v) => updateOffloadLine(index, "preDeliveryDipstickLiters", v)} />
                  {offload.pumpLines.length > 1 && (
                    <button type="button" className="icon-button" onClick={() => removeOffloadLine(index)} aria-label="Remove line">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
<ActionButton onClick={addOffloadLine}>
  <Plus size={18} />
  Add tank line
</ActionButton>
          </EntryPanel>

          <EntryPanel title="Notes" description="Optional notes for the manager reviewing this offload." icon={ClipboardList}>
            <label className="field">
              <span>Notes</span>
              <textarea value={offload.notes} onChange={(event) => updateForm("offload", "notes", event.target.value)} />
            </label>
            <ActionButton onClick={submitOffload}>
              <Plus size={18} />
              Submit offloading report
            </ActionButton>
          </EntryPanel>
        </section>
      ) : (
      <section className="view-grid">
        <EntryPanel title="Shift details" description="Choose the station, business date, and shift for this report." icon={ClipboardList}>
          <FormGrid>
            <SelectField label="Station" value={report.stationId} onChange={handleStationChange} options={stationOptions} />
            <InputField label="Date" type="date" value={report.reportDate} onChange={(v) => updateForm("dailyReport", "reportDate", v)} />
            <SelectField label="Shift" value={report.shift} onChange={(v) => updateForm("dailyReport", "shift", v)} options={SHIFTS.map((shift) => ({ value: shift.value, label: shift.label }))} />
          </FormGrid>
        </EntryPanel>

        <EntryPanel title="Pump prices and meter readings" description="Meter differences create fuel revenue only after manager confirmation." icon={Gauge}>
          <div className="report-line-grid">
            {report.meterLines.map((line, index) => (
              <div className="report-line" key={`${line.productId}-${line.pumpNumber}-${index}`}>
                <SelectField label="Product" value={line.productId} onChange={(v) => updateReportArray("meterLines", index, "productId", v)} options={productOptions} />
                <InputField label="Pump" type="number" value={line.pumpNumber} onChange={(v) => updateReportArray("meterLines", index, "pumpNumber", v)} />
                <InputField label="Opening meter" type="number" value={line.openingReading} onChange={(v) => updateReportArray("meterLines", index, "openingReading", v)} />
                <InputField label="Closing meter" type="number" value={line.closingReading} onChange={(v) => updateReportArray("meterLines", index, "closingReading", v)} />
                <InputField label="Pump price" type="number" value={line.pumpPrice} onChange={(v) => updateReportArray("meterLines", index, "pumpPrice", v)} />
              </div>
            ))}
          </div>
        </EntryPanel>

        <EntryPanel title="Dipping report" description="Capture tank opening and closing dips for review." icon={Droplets}>
          <div className="report-line-grid">
            {report.dippingLines.map((line, index) => (
              <div className="report-line compact" key={`${line.productId}-${line.tankNumber}-${index}`}>
                <SelectField label="Product" value={line.productId} onChange={(v) => updateReportArray("dippingLines", index, "productId", v)} options={productOptions} />
                <InputField label="Tank" type="number" value={line.tankNumber} onChange={(v) => updateReportArray("dippingLines", index, "tankNumber", v)} />
                <InputField label="Opening dip" type="number" value={line.openingDip} onChange={(v) => updateReportArray("dippingLines", index, "openingDip", v)} />
                <InputField label="Closing dip" type="number" value={line.closingDip} onChange={(v) => updateReportArray("dippingLines", index, "closingDip", v)} />
              </div>
            ))}
          </div>
        </EntryPanel>

        <section className="section-band two-column">
          <ReportLines
            title="Credits issued"
            icon={CreditCard}
            lines={report.creditLines}
            addLine={() => addReportArrayLine("creditLines", { debtorName: "", description: "", amount: 0, paymentMethod: "cash" })}
            render={(line, index) => (
              <>
                <InputField label="Customer" value={line.debtorName} onChange={(v) => updateReportArray("creditLines", index, "debtorName", v)} />
                <InputField label="Description" value={line.description} onChange={(v) => updateReportArray("creditLines", index, "description", v)} />
                <InputField label="Amount" type="number" value={line.amount} onChange={(v) => updateReportArray("creditLines", index, "amount", v)} />
              </>
            )}
          />
          <ReportLines
            title="Credits settled"
            icon={WalletCards}
            lines={report.settlementLines}
            addLine={() => addReportArrayLine("settlementLines", { debtId: "", amount: 0, paymentMethod: "cash", note: "" })}
            render={(line, index) => (
              <>
                <SelectField label="Debt" value={line.debtId} onChange={(v) => updateReportArray("settlementLines", index, "debtId", v)} options={[{ value: "", label: "Select debt" }, ...debtOptions]} />
                <InputField label="Amount" type="number" value={line.amount} onChange={(v) => updateReportArray("settlementLines", index, "amount", v)} />
                <InputField label="Note" value={line.note} onChange={(v) => updateReportArray("settlementLines", index, "note", v)} />
              </>
            )}
          />
        </section>

        <ReportLines
          title="Expenses"
          icon={Receipt}
          lines={report.expenseLines}
          addLine={() => addReportArrayLine("expenseLines", { category: EXPENSE_CATEGORIES[0], description: "", amount: 0, paymentMethod: "cash" })}
          render={(line, index) => (
            <>
              <SelectField label="Category" value={line.category} onChange={(v) => updateReportArray("expenseLines", index, "category", v)} options={EXPENSE_CATEGORIES.map((item) => ({ value: item, label: item }))} />
              <InputField label="Description" value={line.description} onChange={(v) => updateReportArray("expenseLines", index, "description", v)} />
              <InputField label="Amount" type="number" value={line.amount} onChange={(v) => updateReportArray("expenseLines", index, "amount", v)} />
            </>
          )}
        />

        <EntryPanel title="Notes" description="Optional handover or reconciliation notes for the manager." icon={ClipboardList}>
          <label className="field">
            <span>Notes</span>
            <textarea value={report.notes} onChange={(event) => updateForm("dailyReport", "notes", event.target.value)} />
          </label>
          <ActionButton onClick={submitDailyReport}>
            <Plus size={18} />
            Submit pending report
          </ActionButton>
        </EntryPanel>
      </section>
      )}
    </main>
  );
}

function ReportLines({ title, icon: Icon, lines, render, addLine }) {
  return (
    <EntryPanel title={title} description="Rows left blank are ignored when the report is submitted." icon={Icon}>
      <div className="report-line-grid">
        {lines.map((line, index) => (
          <div className="report-line" key={index}>
            {render(line, index)}
          </div>
        ))}
      </div>
      <ActionButton onClick={addLine}>
        <Plus size={18} />
        Add row
      </ActionButton>
    </EntryPanel>
  );
}

function ManagerPendingReports({ data, pendingReports, confirmReport, rejectReport }) {
  return (
    <section className="view-grid">
      <DataTable
        title="Pending daily shift reports"
        columns={["Station", "Date", "Shift", "Fuel revenue", "Expenses", "Credits", "Actions"]}
        rows={pendingReports.map((report) => [
          stationName(data, report.stationId),
          report.reportDate,
          shiftBadge(report.shift),
          money(report.totals?.fuelRevenue),
          money(report.totals?.expenses),
          money(report.totals?.creditsIssued),
          <span className="table-actions">
            <button type="button" onClick={() => confirmReport(report.id)}>Confirm</button>
            <button type="button" onClick={() => rejectReport(report.id)}>Reject</button>
          </span>
        ])}
      />
    </section>
  );
}

function ManagerPendingOffloads({ data, pendingOffloads, confirmOffload, rejectOffload }) {
  return (
    <section className="view-grid">
      <DataTable
        title="Pending offloading reports"
        columns={["Station", "Lorry", "Delivered at", "Tank lines", "Total liters", "Actions"]}
        rows={pendingOffloads.map((report) => [
          stationName(data, report.stationId),
          report.lorryId ? lorryName(data, report.lorryId) : "Not set",
          new Date(report.deliveredAt).toLocaleString(),
          (report.pumpLines || [])
            .map((line) => `${productName(data, line.productId)} (tank ${line.tankNumber})`)
            .join(", "),
          liters((report.pumpLines || []).reduce((sum, line) => sum + Number(line.litersDelivered || 0), 0)),
          <span className="table-actions">
            <button type="button" onClick={() => confirmOffload(report.id)}>Confirm</button>
            <button type="button" onClick={() => rejectOffload(report.id)}>Reject</button>
          </span>
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ data, expenses }) {
  const { totals, cycleCards, recentDeposits } = data.dashboard;
  const financialSummary = data.dashboard.financialSummary || {};

  const totalExpenses =
    financialSummary.totalExpenses ?? expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const productSalesIncome = financialSummary.productSalesIncome ?? 0;
  const totalIncomeGenerated =
    financialSummary.totalIncomeGenerated ?? totals.cashCollected + productSalesIncome;
  const netResult =
    financialSummary.netResult ?? totalIncomeGenerated - (financialSummary.fuelPurchaseCost || 0) - totalExpenses;

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Fuel income" value={money(financialSummary.fuelIncome ?? totals.cashCollected)} />
        <Metric icon={ShoppingBag} label="Product sales" value={money(productSalesIncome)} />
        <Metric icon={Banknote} label="Total income" value={money(totalIncomeGenerated)} />
        <Metric icon={Gauge} label="Fuel sold" value={liters(totals.fuelSold)} />
        <Metric icon={Receipt} label="Expenses + open debt" value={money(totalExpenses)} />
        <Metric icon={BarChart3} label="Net result" value={money(netResult)} highlight={netResult < 0 ? "loss" : "profit"} />
      </div>

      <section className="section-band">
        <div className="section-heading">
          <h2>Active station cycles</h2>
          <p>Opening stock is derived by the backend; no beginning-cycle dipstick entry is used.</p>
        </div>
        <div className="cycle-grid">
          {(data.dashboard.cycleGroups || []).map((group) => (
            <article className="cycle-card" key={group.stationId + group.productId}>
              <div className="cycle-title">
                <div>
                  <h3>{group.stationName}</h3>
                  <span>{group.productName}{group.tankCount > 1 ? ` · ${group.tankCount} tanks` : ""}</span>
                </div>
                <Gauge size={20} />
              </div>
              <div className="stock-bar" aria-label="Expected stock percentage">
                <span style={{ width: `${group.stockPercent}%` }} />
              </div>
              <dl className="compact-list">
                <div><dt>Total expected stock</dt><dd>{liters(group.totalExpectedStock)}</dd></div>
                <div><dt>Total cycle sales</dt><dd>{liters(group.totalEstimatedLitersSold)}</dd></div>
                <div><dt>Gross profit</dt><dd>{money(group.totalGrossProfit)}</dd></div>
                <div><dt>Revenue</dt><dd>{money(group.totalRevenue)}</dd></div>
              </dl>
              {(group.tankCount > 1 || group.pumps.some((p) => (p.linkedPumps || []).length > 1)) && (
                <div className="pump-breakdown">
                  {group.pumps.map(p => (
                    <div key={p.tankNumber || p.pumpNumber} className="pump-breakdown-row">
                      <span>Tank {p.tankNumber || p.pumpNumber}</span>
                      <span>{liters(p.expectedStock)} remaining</span>
                      <span className="pump-sold">{liters(p.estimatedLitersSold)} sold</span>
                      <span className="pump-sold">
                        {(p.linkedPumps || []).length ? `Pumps ${(p.linkedPumps || []).join(", ")}` : "No linked pumps"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="two-column">
        <div>
          <div className="section-heading">
            <h2>Recent cash deposits</h2>
            <p>Liters sold are estimated from deposited cash and active pump price.</p>
          </div>
          <DataTable
            columns={["Station", "Shift", "Payment", "Date", "Cash", "Liters"]}
            rows={recentDeposits.map((deposit) => [
              stationName(data, deposit.stationId),
              shiftBadge(deposit.shift),
              paymentBadge(deposit.paymentMethod),
              shortDate(deposit.date),
              money(deposit.cashDeposited),
              liters(deposit.estimatedLitersSold)
            ])}
          />
        </div>
        <div>
          <div className="section-heading">
            <h2>Operational alerts</h2>
            <p>Low stock and closed-cycle variance alerts appear here.</p>
          </div>
          <div className="alert-list">
            {cycleCards.map((cycle) => {
              const low = cycle.snapshot.expectedClosingStockLiters <= cycle.lowStockThresholdLiters;
              return (
                <div className={low ? "alert-row danger" : "alert-row"} key={cycle.id}>
                  <AlertTriangle size={18} />
                  <span>{cycle.stationName}: {low ? "low stock risk" : "stock level normal"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deposits — now with shift + payment method
// ---------------------------------------------------------------------------
function Deposits({ data, reference, forms, updateForm, updateDepositLine, submit, setForms }) {
  return (
    <section className="view-grid">
      <EntryPanel
        title="Daily sales settlement"
        description="Enter one station and split the cash by product. Select the shift and how the money was received."
        icon={Banknote}
      >
        <FormGrid>
          <SelectField
            label="Station"
            value={forms.deposit.stationId}
            onChange={(value) => {
              updateForm("deposit", "stationId", value);
              setForms(current => ({
                ...current,
                deposit: {
                  ...current.deposit,
                  stationId: value,
                  lines: buildDepositLines(
                    reference.products,
                    reference.stations,
                    value,
                    reference.pumpTankLinks
                  )
                }
              }));
            }}
            options={reference.stations.map((item) => ({ value: item.id, label: item.name }))}
          />
          <InputField
            label="Deposit date"
            type="datetime-local"
            value={forms.deposit.date}
            onChange={(value) => updateForm("deposit", "date", value)}
          />
        </FormGrid>

        {/* Shift selector */}
        <div className="shift-payment-row">
          <div className="toggle-group">
            <span className="toggle-label">Shift</span>
            <div className="toggle-buttons">
              {SHIFTS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`toggle-btn${forms.deposit.shift === value ? " active" : ""}`}
                  onClick={() => updateForm("deposit", "shift", value)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="toggle-group">
            <span className="toggle-label">Payment method</span>
            <div className="toggle-buttons">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`toggle-btn${forms.deposit.paymentMethod === value ? " active" : ""}`}
                  onClick={() => updateForm("deposit", "paymentMethod", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ProductSettlementLines data={data} forms={forms} updateDepositLine={updateDepositLine} />
        <p className="field-note">
          If cash is brought as one mixed amount, management must split it by product using pump totals or attendant sheet.
        </p>
        <ActionButton onClick={() => submit("deposit", "/api/daily-deposit-settlements", "Daily sales settlement recorded.")}>
          <Plus size={18} />
          Record settlement
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Deposit history"
        columns={["Station", "Shift", "Payment", "Product", "Pump", "Tank", "Cash", "Price", "Liters"]}
        rows={[...data.dailyDeposits].reverse().map((deposit) => [
          stationName(data, deposit.stationId),
          shiftBadge(deposit.shift),
          paymentBadge(deposit.paymentMethod),
          productName(data, deposit.productId),
          `Pump ${deposit.pumpNumber || 1}`,
          `Tank ${deposit.tankNumber || deposit.pumpNumber || 1}`,
          money(deposit.cashDeposited),
          money(deposit.pumpPrice),
          liters(deposit.estimatedLitersSold)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------
function Deliveries({ data, reference, forms, updateForm, submit, setError, setNotice, load }) {
  const selectedStation = reference.stations.find(s => s.id === forms.delivery.stationId);
  const selectedProduct = reference.products.find(p => p.id === forms.delivery.productId);
  const tankCount = productTankCount(selectedStation, selectedProduct);

  const depotOptionsFor = (pid) => [
    { value: "", label: "-- Select depot trip --" },
    ...reference.depotTrips
      .filter((trip) => trip.productId === pid)
      .map((trip) => ({
        value: trip.id,
        label: `${trip.invoiceNumber} @ ${money(trip.costPerLiter)}`
      }))
  ];

  const updatePumpLine = (pumpNumber, field, value) => {
    updateForm("delivery", "pumps", forms.delivery.pumps.map(p =>
      p.pumpNumber === pumpNumber ? { ...p, [field]: value } : p
    ));
  };

  const activePumps = forms.delivery.pumps.slice(0, tankCount);

  const submitDeliveries = async () => {
    const toSubmit = activePumps.filter(p => Number(p.litersDelivered) > 0 || Number(p.preDeliveryDipstickLiters) >= 0);
    if (!forms.delivery.stationId || !forms.delivery.productId) {
      setError("Please select a station and product.");
      return;
    }
    if (toSubmit.length === 0) {
      setError("Enter liters delivered for at least one pump.");
      return;
    }
    setError("");
    setNotice("");
    try {
      for (const pump of activePumps) {
        if (Number(pump.litersDelivered) <= 0) continue;
        if (!pump.depotTripId) throw new Error(`Please select a depot trip for Tank ${pump.pumpNumber}.`);
        await fetch("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId: forms.delivery.stationId,
            productId: forms.delivery.productId,
            deliveredAt: eatInputToIso(forms.delivery.deliveredAt),
            depotTripId: pump.depotTripId,
            litersDelivered: Number(pump.litersDelivered),
            preDeliveryDipstickLiters: Number(pump.preDeliveryDipstickLiters || 0),
            pumpNumber: pump.pumpNumber,
            tankNumber: pump.pumpNumber
          })
        }).then(async r => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error || "Delivery failed");
        });
      }
      setNotice("Delivery cycles recorded.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="view-grid">
      <EntryPanel
        title="Delivery entry"
        description="Each physical tank is entered separately but submitted in one go. A delivery closes the previous cycle and opens the next."
        icon={Truck}
      >
        <FormGrid>
          <SelectField label="Station" value={forms.delivery.stationId} onChange={(v) => updateForm("delivery", "stationId", v)} options={reference.stations.map((i) => ({ value: i.id, label: i.name }))} />
          <SelectField label="Product" value={forms.delivery.productId} onChange={(v) => updateForm("delivery", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
          <InputField label="Delivery timestamp" type="datetime-local" value={forms.delivery.deliveredAt} onChange={(v) => updateForm("delivery", "deliveredAt", v)} />
        </FormGrid>

        {activePumps.map((pump) => (
          <div key={pump.pumpNumber} className="pump-delivery-row">
            <div className="pump-delivery-header">
              <strong>Tank {pump.pumpNumber}</strong>
            </div>
            <FormGrid>
              <SelectField
                label="Linked depot trip"
                value={pump.depotTripId}
                onChange={(v) => updatePumpLine(pump.pumpNumber, "depotTripId", v)}
                options={depotOptionsFor(forms.delivery.productId)}
              />
              <InputField
                label="Liters delivered"
                type="number"
                value={pump.litersDelivered}
                onChange={(v) => updatePumpLine(pump.pumpNumber, "litersDelivered", v)}
              />
              <InputField
                label="Dipstick before closure"
                type="number"
                value={pump.preDeliveryDipstickLiters}
                onChange={(v) => updatePumpLine(pump.pumpNumber, "preDeliveryDipstickLiters", v)}
              />
            </FormGrid>
          </div>
        ))}

        <p className="field-note">Dipstick closes the old cycle. New opening stock = dipstick + liters delivered.</p>
        <ActionButton onClick={submitDeliveries}>
          <ArrowDownUp size={18} />
          Close and open cycle{tankCount > 1 ? "s" : ""}
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Delivery cycles"
        columns={["Station", "Product", "Tank", "Status", "Opening", "Variance"]}
        rows={[...data.cycles].reverse().map((cycle) => [
          stationName(data, cycle.stationId),
          productName(data, cycle.productId),
          `Tank ${cycle.tankNumber || cycle.pumpNumber || 1}`,
          cycle.status,
          liters(cycle.openingStockLiters),
          cycle.varianceLiters === null ? "Active" : liters(cycle.varianceLiters)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Depot Trips
// ---------------------------------------------------------------------------
function DepotTrips({ data, reference, forms, updateForm, submit }) {
  return (
    <section className="view-grid">
      <EntryPanel title="Depot trip" description="Purchasing and station delivery stay separate. Cost per liter is calculated by the backend." icon={Factory}>
        <FormGrid>
          <InputField label="Supplier" value={forms.depot.supplier} onChange={(v) => updateForm("depot", "supplier", v)} />
          <InputField label="Supplier invoice / receipt ref" value={forms.depot.invoiceNumber} onChange={(v) => updateForm("depot", "invoiceNumber", v)} />
          <SelectField label="Lorry" value={forms.depot.lorryId} onChange={(v) => updateForm("depot", "lorryId", v)} options={[{ value: "", label: "Not assigned" }, ...reference.lorries.map((i) => ({ value: i.id, label: `${i.plateNumber}${i.driverName ? ` - ${i.driverName}` : ""}` }))]} />
          <SelectField label="Product" value={forms.depot.productId} onChange={(v) => updateForm("depot", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
          <InputField label="Purchased at" type="datetime-local" value={forms.depot.purchasedAt} onChange={(v) => updateForm("depot", "purchasedAt", v)} />
          <InputField label="Liters purchased" type="number" value={forms.depot.litersPurchased} onChange={(v) => updateForm("depot", "litersPurchased", v)} />
          <InputField label="Total purchase cost" type="number" value={forms.depot.totalPurchaseCost} onChange={(v) => updateForm("depot", "totalPurchaseCost", v)} />
        </FormGrid>
        <p className="field-note">Use the supplier invoice number or delivery note reference.</p>
        <ActionButton onClick={() => submit("depot", "/api/depot-trips", "Depot trip recorded.")}>
          <Plus size={18} />
          Add depot trip
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Depot trip history"
        columns={["Supplier", "Reference", "Lorry", "Product", "Liters", "Cost/L"]}
        rows={[...data.depotTrips].reverse().map((trip) => [
          trip.supplier,
          trip.invoiceNumber,
          lorryName(data, trip.lorryId),
          productName(data, trip.productId),
          liters(trip.litersPurchased),
          money(trip.costPerLiter)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
function Expenses({
  data,
  reference,
  forms,
  updateForm,
  submitExpense,
  submitDebtIssue,
  submitDebtSettlement,
  expenses,
  debts
}) {
  const [filterStation, setFilterStation] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const filtered = expenses.filter((e) => {
    if (filterStation && e.stationId !== filterStation) return false;
    if (filterShift && e.shift !== filterShift) return false;
    if (filterDate && eatDateKey(e.date) !== filterDate) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const debtIssuedTotal = expenses
    .filter((e) => e.category === DEBT_EXPENSE_CATEGORY)
    .reduce((s, e) => s + e.amount, 0);
  const openDebts = debts.filter((debt) => debt.status === "open" && debt.outstandingAmount > 0);
  const outstandingDebt = openDebts.reduce((s, debt) => s + debt.outstandingAmount, 0);
  const selectedDebt = openDebts.find((debt) => debt.id === forms.debtSettlement.debtId);

  // Per-shift summary
  const dayTotal = expenses.filter((e) => e.shift === "day").reduce((s, e) => s + e.amount, 0);
  const nightTotal = expenses.filter((e) => e.shift === "night").reduce((s, e) => s + e.amount, 0);

  // Per-category breakdown
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    amount: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)
  })).filter((row) => row.amount > 0);

  return (
    <section className="view-grid">
      {/* Summary metrics */}
      <div className="metric-grid">
        <Metric icon={Receipt} label="Total expenses" value={money(totalExpenses)} />
        <Metric icon={CreditCard} label="Debt issued" value={money(debtIssuedTotal)} />
        <Metric icon={WalletCards} label="Debt outstanding" value={money(outstandingDebt)} />
        <Metric icon={Sun} label="Day shift expenses" value={money(dayTotal)} />
        <Metric icon={Moon} label="Night shift expenses" value={money(nightTotal)} />
        <Metric icon={BarChart3} label="Expense records" value={expenses.length} />
      </div>

      <section className="section-band two-column">
        {/* Entry form */}
        <EntryPanel
          title="Record expense"
          description="Log any operating cost against a station and shift. These are used to calculate net profit."
          icon={Receipt}
        >
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.expense.stationId}
              onChange={(v) => updateForm("expense", "stationId", v)}
              options={reference.stations.map((i) => ({ value: i.id, label: i.name }))}
            />
            <InputField
              label="Date"
              type="datetime-local"
              value={forms.expense.date}
              onChange={(v) => updateForm("expense", "date", v)}
            />
            <SelectField
              label="Category"
              value={forms.expense.category}
              onChange={(v) => updateForm("expense", "category", v)}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <InputField
              label="Amount (TZS)"
              type="number"
              value={forms.expense.amount}
              onChange={(v) => updateForm("expense", "amount", v)}
            />
            <InputField
              label="Description"
              value={forms.expense.description}
              onChange={(v) => updateForm("expense", "description", v)}
            />
          </FormGrid>

          {/* Shift + Payment toggles */}
          <div className="shift-payment-row">
            <div className="toggle-group">
              <span className="toggle-label">Shift</span>
              <div className="toggle-buttons">
                {SHIFTS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.expense.shift === value ? " active" : ""}`}
                    onClick={() => updateForm("expense", "shift", value)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="toggle-group">
              <span className="toggle-label">Paid via</span>
              <div className="toggle-buttons">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.expense.paymentMethod === value ? " active" : ""}`}
                    onClick={() => updateForm("expense", "paymentMethod", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActionButton onClick={submitExpense}>
            <Plus size={18} />
            Record expense
          </ActionButton>
        </EntryPanel>

        {/* By category */}
        <section className="entry-panel">
          <div className="section-heading">
            <div className="heading-with-icon">
              <BarChart3 size={20} />
              <h2>Breakdown by category</h2>
            </div>
            <p>Running totals across all stations and shifts.</p>
          </div>
          {byCategory.length ? (
            <div className="expense-category-list">
              {byCategory.sort((a, b) => b.amount - a.amount).map((row) => (
                <div key={row.category} className="expense-category-row">
                  <span>{row.category}</span>
                  <strong>{money(row.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-note">No expenses recorded yet.</p>
          )}
        </section>
      </section>

      <section className="section-band two-column">
        <EntryPanel
          title="Issue debt"
          description="Record money or goods given on debt. The issued amount is counted as an expense on that day."
          icon={CreditCard}
        >
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.debtIssue.stationId}
              onChange={(v) => updateForm("debtIssue", "stationId", v)}
              options={reference.stations.map((i) => ({ value: i.id, label: i.name }))}
            />
            <InputField
              label="Debt date"
              type="datetime-local"
              value={forms.debtIssue.date}
              onChange={(v) => updateForm("debtIssue", "date", v)}
            />
            <InputField
              label="Debtor"
              value={forms.debtIssue.debtorName}
              onChange={(v) => updateForm("debtIssue", "debtorName", v)}
            />
            <InputField
              label="Amount (TZS)"
              type="number"
              value={forms.debtIssue.amount}
              onChange={(v) => updateForm("debtIssue", "amount", v)}
            />
            <InputField
              label="Reason"
              value={forms.debtIssue.description}
              onChange={(v) => updateForm("debtIssue", "description", v)}
            />
          </FormGrid>

          <div className="shift-payment-row">
            <div className="toggle-group">
              <span className="toggle-label">Shift</span>
              <div className="toggle-buttons">
                {SHIFTS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.debtIssue.shift === value ? " active" : ""}`}
                    onClick={() => updateForm("debtIssue", "shift", value)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="toggle-group">
              <span className="toggle-label">Issued via</span>
              <div className="toggle-buttons">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.debtIssue.paymentMethod === value ? " active" : ""}`}
                    onClick={() => updateForm("debtIssue", "paymentMethod", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActionButton onClick={submitDebtIssue}>
            <Plus size={18} />
            Record debt
          </ActionButton>
        </EntryPanel>

        <EntryPanel
          title="Settle debt"
          description="Record a payment against an open debt. Partial payments reduce the balance and keep the debt open."
          icon={ArrowDownUp}
        >
          <FormGrid>
            <SelectField
              label="Open debt"
              value={forms.debtSettlement.debtId}
              onChange={(v) => updateForm("debtSettlement", "debtId", v)}
              options={[
                { value: "", label: "Select open debt" },
                ...openDebts.map((debt) => ({
                  value: debt.id,
                  label: `${debt.debtorName} - ${money(debt.outstandingAmount)}`
                }))
              ]}
            />
            <InputField
              label="Settlement date"
              type="datetime-local"
              value={forms.debtSettlement.settledAt}
              onChange={(v) => updateForm("debtSettlement", "settledAt", v)}
            />
            <InputField
              label="Amount settled"
              type="number"
              value={forms.debtSettlement.amount}
              onChange={(v) => updateForm("debtSettlement", "amount", v)}
            />
            <InputField
              label="Note"
              value={forms.debtSettlement.note}
              onChange={(v) => updateForm("debtSettlement", "note", v)}
            />
          </FormGrid>

          <div className="debt-balance-strip">
            <span>Selected balance</span>
            <strong>{selectedDebt ? money(selectedDebt.outstandingAmount) : money(0)}</strong>
          </div>

          <div className="shift-payment-row">
            <div className="toggle-group">
              <span className="toggle-label">Received via</span>
              <div className="toggle-buttons">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.debtSettlement.paymentMethod === value ? " active" : ""}`}
                    onClick={() => updateForm("debtSettlement", "paymentMethod", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActionButton onClick={submitDebtSettlement} disabled={!openDebts.length}>
            <ArrowDownUp size={18} />
            Record settlement
          </ActionButton>
        </EntryPanel>
      </section>

      <DataTable
        title="Debt ledger"
        columns={["Debtor", "Station", "Last activity", "Issued", "Settled", "Outstanding", "Status"]}
        rows={debts.map((debt) => [
          debt.debtorName,
          stationName(data, debt.stationId),
          shortDate(debt.lastActivityAt),
          money(debt.totalAmount),
money(debt.settledAmount),
          money(debt.outstandingAmount),
          debtStatusBadge(debt.status)
        ])}
      />

      {/* Filter + table */}
      <section className="entry-panel">
        <div className="section-heading">
          <h2>Expense log</h2>
          <p>Daily totals include any debts issued on the selected day.</p>
        </div>
        <div className="expense-filter-row">
          <SelectField
            label="Filter by station"
            value={filterStation}
            onChange={setFilterStation}
            options={[{ value: "", label: "All stations" }, ...reference.stations.map((i) => ({ value: i.id, label: i.name }))]}
          />
          <SelectField
            label="Filter by shift"
            value={filterShift}
            onChange={setFilterShift}
            options={[{ value: "", label: "All shifts" }, ...SHIFTS.map((s) => ({ value: s.value, label: s.label }))]}
          />
          <InputField
            label="Filter by day"
            type="date"
            value={filterDate}
            onChange={setFilterDate}
          />
          <div className="expense-filter-total">
            <span>Showing expense total</span>
            <strong>{money(totalFiltered)}</strong>
          </div>
        </div>
      </section>

      <DataTable
        columns={["Station", "Date", "Shift", "Category", "Description", "Payment", "Amount"]}
        rows={filtered.map((e) => [
          stationName(data, e.stationId),
          shortDate(e.date),
          shiftBadge(e.shift),
          e.category,
          e.description,
          paymentBadge(e.paymentMethod),
          money(e.amount)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------
function Sales({ data, reference, forms, updateForm, submitProductSale }) {
  const [filterStation, setFilterStation] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const productSales = data.productSales || [];

  const filtered = productSales.filter((sale) => {
    if (filterStation && sale.stationId !== filterStation) return false;
    if (filterShift && sale.shift !== filterShift) return false;
    if (filterDate && eatDateKey(sale.date) !== filterDate) return false;
    return true;
  });

  const totalSales = productSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const filteredTotal = filtered.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const dayTotal = productSales
    .filter((sale) => (sale.shift || "day") === "day")
    .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const nightTotal = productSales
    .filter((sale) => sale.shift === "night")
    .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const categoryTotals = PRODUCT_SALE_CATEGORIES.map((category) => ({
    category,
    amount: productSales
      .filter((sale) => sale.category === category)
      .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)
  })).filter((row) => row.amount > 0);
  const saleTotal = Number(forms.productSale.quantity || 0) * Number(forms.productSale.unitPrice || 0);

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric icon={ShoppingBag} label="Product sales income" value={money(totalSales)} />
        <Metric icon={Sun} label="Day shift sales" value={money(dayTotal)} />
        <Metric icon={Moon} label="Night shift sales" value={money(nightTotal)} />
        <Metric icon={Receipt} label="Sales records" value={productSales.length} />
      </div>

      <section className="section-band two-column">
        <EntryPanel
          title="Record product sale"
          description="Log oil, tyres, lubricants, accessories, and other non-fuel sales."
          icon={ShoppingBag}
        >
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.productSale.stationId}
              onChange={(v) => updateForm("productSale", "stationId", v)}
              options={reference.stations.map((i) => ({ value: i.id, label: i.name }))}
            />
            <InputField
              label="Date"
              type="datetime-local"
              value={forms.productSale.date}
              onChange={(v) => updateForm("productSale", "date", v)}
            />
            <InputField
              label="Item"
              value={forms.productSale.itemName}
              onChange={(v) => updateForm("productSale", "itemName", v)}
            />
            <SelectField
              label="Category"
              value={forms.productSale.category}
              onChange={(v) => updateForm("productSale", "category", v)}
              options={PRODUCT_SALE_CATEGORIES.map((category) => ({ value: category, label: category }))}
            />
            <InputField
              label="Quantity"
              type="number"
              value={forms.productSale.quantity}
              onChange={(v) => updateForm("productSale", "quantity", v)}
            />
            <InputField
              label="Unit price (TZS)"
              type="number"
              value={forms.productSale.unitPrice}
              onChange={(v) => updateForm("productSale", "unitPrice", v)}
            />
            <InputField
              label="Notes"
              value={forms.productSale.notes}
              onChange={(v) => updateForm("productSale", "notes", v)}
            />
          </FormGrid>

          <div className="debt-balance-strip">
            <span>Sale total</span>
            <strong>{money(saleTotal)}</strong>
          </div>

          <div className="shift-payment-row">
            <div className="toggle-group">
              <span className="toggle-label">Shift</span>
              <div className="toggle-buttons">
                {SHIFTS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.productSale.shift === value ? " active" : ""}`}
                    onClick={() => updateForm("productSale", "shift", value)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="toggle-group">
              <span className="toggle-label">Paid via</span>
              <div className="toggle-buttons">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`toggle-btn${forms.productSale.paymentMethod === value ? " active" : ""}`}
                    onClick={() => updateForm("productSale", "paymentMethod", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActionButton onClick={submitProductSale}>
            <Plus size={18} />
            Record sale
          </ActionButton>
        </EntryPanel>

        <section className="entry-panel">
          <div className="section-heading">
            <div className="heading-with-icon">
              <BarChart3 size={20} />
              <h2>Sales by category</h2>
            </div>
            <p>Running totals for non-fuel items only.</p>
          </div>
          {categoryTotals.length ? (
            <div className="expense-category-list">
              {categoryTotals.sort((a, b) => b.amount - a.amount).map((row) => (
                <div key={row.category} className="expense-category-row">
                  <span>{row.category}</span>
                  <strong>{money(row.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-note">No product sales recorded yet.</p>
          )}
        </section>
      </section>

      <section className="entry-panel">
        <div className="section-heading">
          <h2>Product sales log</h2>
          <p>Filter non-fuel sales by station, shift, or day.</p>
        </div>
        <div className="expense-filter-row">
          <SelectField
            label="Filter by station"
            value={filterStation}
            onChange={setFilterStation}
            options={[{ value: "", label: "All stations" }, ...reference.stations.map((i) => ({ value: i.id, label: i.name }))]}
          />
          <SelectField
            label="Filter by shift"
            value={filterShift}
            onChange={setFilterShift}
            options={[{ value: "", label: "All shifts" }, ...SHIFTS.map((s) => ({ value: s.value, label: s.label }))]}
          />
          <InputField
            label="Filter by day"
            type="date"
            value={filterDate}
            onChange={setFilterDate}
          />
          <div className="expense-filter-total">
            <span>Showing sales total</span>
            <strong>{money(filteredTotal)}</strong>
          </div>
        </div>
      </section>

      <DataTable
        columns={["Station", "Date", "Shift", "Item", "Category", "Qty", "Unit price", "Payment", "Total"]}
        rows={filtered.map((sale) => [
          stationName(data, sale.stationId),
          shortDate(sale.date),
          shiftBadge(sale.shift),
          sale.itemName,
          sale.category,
          sale.quantity,
          money(sale.unitPrice),
          paymentBadge(sale.paymentMethod),
          money(sale.totalAmount)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product settlement lines
// ---------------------------------------------------------------------------
function ProductSettlementLines({ data, forms, updateDepositLine }) {
  return (
    <div className="settlement-lines">
      {forms.deposit.lines.map((line) => {
        const pump = line.pumpNumber || 1;
        const tank = line.tankNumber || pump;
        const productLabel = productName(data, line.productId);
        return (
          <div className="product-line" key={`${line.productId}-${pump}`}>
            <div className="route-label" aria-label={`${productLabel}: Pump ${pump} to Tank ${tank}`}>
              <strong>{productLabel}</strong>
              <span>Pump {pump} -&gt; Tank {tank}</span>
            </div>
            <InputField
              label="Cash deposited"
              type="number"
              value={line.cashDeposited}
              onChange={(value) => updateDepositLine(line.productId, pump, "cashDeposited", value)}
            />
            <InputField
              label="Pump price"
              type="number"
              value={line.pumpPrice}
              onChange={(value) => updateDepositLine(line.productId, pump, "pumpPrice", value)}
            />
            <span>{Number(line.pumpPrice) > 0 ? liters(Number(line.cashDeposited) / Number(line.pumpPrice)) : "0 L"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
function Setup({ reference, forms, updateForm, submit, submitPumpTankLink, databaseStatus }) {
  const selectedLinkStation = reference.stations.find((station) => station.id === forms.pumpTankLink.stationId);
  const selectedLinkProduct = reference.products.find((product) => product.id === forms.pumpTankLink.productId);
  const selectedTankCount = productTankCount(selectedLinkStation, selectedLinkProduct);
  const tankOptions = Array.from({ length: selectedTankCount }, (_, index) => {
    const tankNumber = index + 1;
    return { value: String(tankNumber), label: `Tank ${tankNumber}` };
  });

  return (
    <section className="view-grid">
      <section className={`database-status ${databaseStatus.connected ? "connected" : "pending"}`}>
        {databaseStatus.connected ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
        <div>
          <strong>{databaseStatus.connected ? "Supabase connected" : "Supabase configured"}</strong>
          <span>{databaseStatus.message}</span>
        </div>
      </section>

      <section className="setup-tables two-column">
        <EntryPanel title="New petrol station" description="Add stations before recording deliveries, deposits, and month-end closures." icon={Building2}>
          <FormGrid>
            <InputField label="Station name" value={forms.station.name} onChange={(v) => updateForm("station", "name", v)} />
            <InputField label="Location" value={forms.station.location} onChange={(v) => updateForm("station", "location", v)} />
            <InputField label="Tank capacity" type="number" value={forms.station.tankCapacityLiters} onChange={(v) => updateForm("station", "tankCapacityLiters", v)} />
            <InputField label="Low-stock alert" type="number" value={forms.station.lowStockThresholdLiters} onChange={(v) => updateForm("station", "lowStockThresholdLiters", v)} />
          </FormGrid>
          <FormGrid>
            <SelectField
              label="Petrol tanks"
              value={String(forms.station.petrolTankCount)}
              onChange={(v) => updateForm("station", "petrolTankCount", Number(v))}
              options={[{ value: "1", label: "1 tank" }, { value: "2", label: "2 tanks" }]}
            />
            <SelectField
              label="Diesel tanks"
              value={String(forms.station.dieselTankCount)}
              onChange={(v) => updateForm("station", "dieselTankCount", Number(v))}
              options={[{ value: "1", label: "1 tank" }, { value: "2", label: "2 tanks" }]}
            />

          </FormGrid>
          <ActionButton onClick={() => submit("station", "/api/stations", "Petrol station added.")}>
            <Plus size={18} />
            Add station
          </ActionButton>
        </EntryPanel>

        <EntryPanel title="New lorry" description="Register the vehicle used for depot purchases and station deliveries." icon={Truck}>
          <FormGrid>
            <InputField label="Plate number" value={forms.lorry.plateNumber} onChange={(v) => updateForm("lorry", "plateNumber", v)} />
            <InputField label="Driver" value={forms.lorry.driverName} onChange={(v) => updateForm("lorry", "driverName", v)} />
            <InputField label="Capacity" type="number" value={forms.lorry.capacityLiters} onChange={(v) => updateForm("lorry", "capacityLiters", v)} />
            <InputField label="Notes" value={forms.lorry.notes} onChange={(v) => updateForm("lorry", "notes", v)} />
          </FormGrid>
          <ActionButton onClick={() => submit("lorry", "/api/lorries", "Lorry added.")}>
            <Plus size={18} />
            Add lorry
          </ActionButton>
        </EntryPanel>
      </section>

      <section className="two-column">
        <EntryPanel title="Link pumps to tank" description="Map each physical pump to the tank it draws from for this station and product." icon={Link2}>
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.pumpTankLink.stationId}
              onChange={(v) => {
                updateForm("pumpTankLink", "stationId", v);
                updateForm("pumpTankLink", "tankNumber", 1);
              }}
              options={reference.stations.map((i) => ({ value: i.id, label: i.name }))}
            />
            <SelectField
              label="Product"
              value={forms.pumpTankLink.productId}
              onChange={(v) => {
                updateForm("pumpTankLink", "productId", v);
                updateForm("pumpTankLink", "tankNumber", 1);
              }}
              options={reference.products.map((i) => ({ value: i.id, label: i.name }))}
            />
            <InputField
              label="Pump number"
              type="number"
              value={forms.pumpTankLink.pumpNumber}
              onChange={(v) => updateForm("pumpTankLink", "pumpNumber", v)}
            />
            <SelectField
              label="Tank"
              value={String(forms.pumpTankLink.tankNumber)}
              onChange={(v) => updateForm("pumpTankLink", "tankNumber", Number(v))}
              options={tankOptions}
            />
          </FormGrid>
          <ActionButton onClick={submitPumpTankLink}>
            <Link2 size={18} />
            Link pump to tank
          </ActionButton>
        </EntryPanel>

        <DataTable
          title="Pump to tank links"
          columns={["Station", "Product", "Pump", "Tank"]}
          rows={(reference.pumpTankLinks || []).map((link) => [
            reference.stations.find((station) => station.id === link.stationId)?.name || "Unknown station",
            reference.products.find((product) => product.id === link.productId)?.name || "Unknown product",
            `Pump ${link.pumpNumber}`,
            `Tank ${link.tankNumber}`
          ])}
        />
      </section>

      <section className="section-band two-column">
        <DataTable
          title="Petrol stations"
          columns={["Station", "Location", "Tank capacity", "Low-stock alert"]}
          rows={reference.stations.map((station) => [
            station.name,
            station.location,
            liters(station.tankCapacityLiters),
            liters(station.lowStockThresholdLiters)
          ])}
        />
        <DataTable
          title="Lorries"
          columns={["Plate", "Driver", "Capacity", "Notes"]}
          rows={reference.lorries.map((lorry) => [
            lorry.plateNumber,
            lorry.driverName || "Not set",
            liters(lorry.capacityLiters),
            lorry.notes || "None"
          ])}
        />
      </section>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Variance
// ---------------------------------------------------------------------------
function Variance({ data, reference, forms, updateForm, submit }) {
  const closedCycles = data.cycles.filter((cycle) => cycle.status === "closed").reverse();
  return (
    <section className="view-grid">
      <section className="section-band two-column">
        <EntryPanel title="Internal fuel use" description="Record generator, vehicle, testing, or calibration fuel before it becomes variance." icon={ClipboardList}>
          <FormGrid>
            <SelectField label="Station" value={forms.internal.stationId} onChange={(v) => updateForm("internal", "stationId", v)} options={reference.stations.map((i) => ({ value: i.id, label: i.name }))} />
            <SelectField label="Product" value={forms.internal.productId} onChange={(v) => updateForm("internal", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
            <InputField label="Date" type="datetime-local" value={forms.internal.date} onChange={(v) => updateForm("internal", "date", v)} />
            <InputField label="Liters" type="number" value={forms.internal.liters} onChange={(v) => updateForm("internal", "liters", v)} />
            <InputField label="Reason" value={forms.internal.reason} onChange={(v) => updateForm("internal", "reason", v)} />
          </FormGrid>
          <ActionButton onClick={() => submit("internal", "/api/internal-fuel-use", "Internal usage recorded.")}>
            <Plus size={18} />
            Record use
          </ActionButton>
          <div className="toggle-group" style={{ marginBottom: '16px' }}>
  <span className="toggle-label">Shift</span>
  <div className="toggle-buttons">
    {SHIFTS.map(({ value, label, icon: Icon }) => (
      <button
  key={value}
  type="button"
  className={`toggle-btn${forms.internal.shift === value ? " active" : ""}`}
  onClick={() => updateForm("internal", "shift", value)} // Correct: Targets 'internal'
>
        <Icon size={15} />
        {label}
      </button>
    ))}
  </div>
</div>
        </EntryPanel>

        <EntryPanel title="Pump meter reading" description="Optional reconciliation layer for pumps with cumulative meter readings." icon={Gauge}>
          <FormGrid>
            <SelectField label="Station" value={forms.pump.stationId} onChange={(v) => updateForm("pump", "stationId", v)} options={reference.stations.map((i) => ({ value: i.id, label: i.name }))} />
            <SelectField label="Product" value={forms.pump.productId} onChange={(v) => updateForm("pump", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
            <InputField label="Date" type="datetime-local" value={forms.pump.date} onChange={(v) => updateForm("pump", "date", v)} />
            <InputField label="Opening meter" type="number" value={forms.pump.openingReading} onChange={(v) => updateForm("pump", "openingReading", v)} />
            <InputField label="Closing meter" type="number" value={forms.pump.closingReading} onChange={(v) => updateForm("pump", "closingReading", v)} />
          </FormGrid>
          <ActionButton onClick={() => submit("pump", "/api/pump-meter-readings", "Pump reading recorded.")}>
            <Plus size={18} />
            Record meter
          </ActionButton>
          <div className="toggle-group" style={{ marginBottom: '16px' }}>
  <span className="toggle-label">Shift</span>
  <div className="toggle-buttons">
    {SHIFTS.map(({ value, label, icon: Icon }) => (
      <button
  key={value}
  type="button"
  className={`toggle-btn${forms.pump.shift === value ? " active" : ""}`}
  onClick={() => updateForm("pump", "shift", value)} // Correct: Targets 'pump'
>
        <Icon size={15} />
        {label}
      </button>
    ))}
  </div>
</div>
        </EntryPanel>
      </section>

      <DataTable
        title="Closed-cycle variance"
        columns={["Station", "Product", "Expected", "Actual", "Variance", "Reason"]}
        rows={closedCycles.map((cycle) => [
          stationName(data, cycle.stationId),
          productName(data, cycle.productId),
          liters(cycle.expectedClosingStockLiters),
          liters(cycle.actualDipstickLiters),
          liters(cycle.varianceLiters),
          cycle.closeReason
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Reports — now includes expense deduction and shift P&L
// ---------------------------------------------------------------------------
function Reports({ data, reference, forms, updateForm, submit, expenses }) {
  const financialSummary = data.dashboard.financialSummary || {};
  const closedCycles = data.cycles.filter((cycle) => cycle.status === "closed");
  const allDeposits = data.dailyDeposits || [];
  const productSales = data.productSales || [];
  const fuelIncome = financialSummary.fuelIncome ??
    allDeposits.reduce((sum, deposit) => sum + Number(deposit.cashDeposited || 0), 0);
  const productSalesIncome = financialSummary.productSalesIncome ??
    productSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const totalIncomeGenerated = financialSummary.totalIncomeGenerated ?? fuelIncome + productSalesIncome;
  const fuelPurchaseCost = financialSummary.fuelPurchaseCost ??
    data.depotTrips.reduce((sum, trip) => sum + Number(trip.totalPurchaseCost || 0), 0);
  const cogs = closedCycles.reduce((sum, cycle) => sum + Number(cycle.estimatedCogs || 0), 0);
  const grossProfit =
    financialSummary.totalGrossProfit ??
    closedCycles.reduce((sum, cycle) => sum + Number(cycle.grossProfit || 0), 0);
  const totalExpenses =
    financialSummary.totalExpenses ?? expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netResult = financialSummary.netResult ?? totalIncomeGenerated - fuelPurchaseCost - totalExpenses;

  const shiftRevenue = (shift) => allDeposits
    .filter((d) => (d.shift || "day") === shift)
    .reduce((s, d) => s + Number(d.cashDeposited || 0), 0);
  const shiftProductSales = (shift) => productSales
    .filter((sale) => (sale.shift || "day") === shift)
    .reduce((s, sale) => s + Number(sale.totalAmount || 0), 0);
  const shiftExpenses = (shift) => expenses
    .filter((e) => e.shift === shift)
    .reduce((s, e) => s + e.amount, 0);

  const dayRev = shiftRevenue("day") + shiftProductSales("day");
  const nightRev = shiftRevenue("night") + shiftProductSales("night");
  const dayExp = shiftExpenses("day");
  const nightExp = shiftExpenses("night");

  // Per-station P&L
  const stationSummary = (data.stations || []).map((station) => {
    const stFuelRev = allDeposits.filter((d) => d.stationId === station.id).reduce((s, d) => s + Number(d.cashDeposited || 0), 0);
    const stProductRev = productSales.filter((sale) => sale.stationId === station.id).reduce((s, sale) => s + Number(sale.totalAmount || 0), 0);
    const stExp = expenses.filter((e) => e.stationId === station.id).reduce((s, e) => s + e.amount, 0);
    const stTotalIncome = stFuelRev + stProductRev;
    return { name: station.name, fuelIncome: stFuelRev, productIncome: stProductRev, income: stTotalIncome, expenses: stExp };
  });

  return (
    <section className="view-grid">
      {/* Top metrics */}
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Fuel income" value={money(fuelIncome)} />
        <Metric icon={ShoppingBag} label="Product sales income" value={money(productSalesIncome)} />
        <Metric icon={Banknote} label="Total income generated" value={money(totalIncomeGenerated)} />
        <Metric icon={Factory} label="Fuel purchase cost" value={money(fuelPurchaseCost)} />
        <Metric icon={Receipt} label="Expenses + open debt" value={money(totalExpenses)} />
        <Metric icon={BarChart3} label="Net result" value={money(netResult)} highlight={netResult < 0 ? "loss" : "profit"} />
      </div>

      <div className="metric-grid">
        <Metric icon={WalletCards} label="Closed-cycle fuel revenue" value={money(closedCycles.reduce((sum, cycle) => sum + Number(cycle.revenue || 0), 0))} />
        <Metric icon={Factory} label="Estimated cycle COGS" value={money(cogs)} />
        <Metric icon={BarChart3} label="Fuel gross profit" value={money(grossProfit)} />
        <Metric icon={AlertTriangle} label="Variance cycles" value={closedCycles.length} />
      </div>

      {/* Shift P&L */}
      <section className="section-band">
        <div className="section-heading">
          <h2>Shift profit & loss</h2>
          <p>Revenue and expenses broken down by day and night shift.</p>
        </div>
        <div className="shift-pl-grid">
          <div className="shift-pl-card day">
            <div className="shift-pl-header"><Sun size={18} /><strong>Day Shift</strong></div>
            <dl className="compact-list">
              <div><dt>Revenue</dt><dd>{money(dayRev)}</dd></div>
              <div><dt>Expenses</dt><dd>{money(dayExp)}</dd></div>
              <div><dt>Net</dt><dd className={dayRev - dayExp < 0 ? "loss-text" : "profit-text"}>{money(dayRev - dayExp)}</dd></div>
            </dl>
          </div>
          <div className="shift-pl-card night">
            <div className="shift-pl-header"><Moon size={18} /><strong>Night Shift</strong></div>
            <dl className="compact-list">
              <div><dt>Revenue</dt><dd>{money(nightRev)}</dd></div>
              <div><dt>Expenses</dt><dd>{money(nightExp)}</dd></div>
              <div><dt>Net</dt><dd className={nightRev - nightExp < 0 ? "loss-text" : "profit-text"}>{money(nightRev - nightExp)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* Per-station summary */}
      <DataTable
        title="Net result by station"
        columns={["Station", "Fuel income", "Product income", "Total income", "Expenses", "Net before shared fuel cost"]}
        rows={stationSummary.map((s) => [
          s.name,
          money(s.fuelIncome),
          money(s.productIncome),
          money(s.income),
          money(s.expenses),
          money(s.income - s.expenses)
        ])}
      />

      <DataTable
        title="Product sales by item"
        columns={["Station", "Date", "Shift", "Item", "Category", "Qty", "Payment", "Total"]}
        rows={[...productSales].reverse().map((sale) => [
          stationName(data, sale.stationId),
          shortDate(sale.date),
          shiftBadge(sale.shift),
          sale.itemName,
          sale.category,
          sale.quantity,
          paymentBadge(sale.paymentMethod),
          money(sale.totalAmount)
        ])}
      />

      {/* Month-end closure */}
      <EntryPanel title="Month-end closure" description="Force-split the active cycle and roll the measured inventory forward." icon={CalendarCheck}>
        <FormGrid>
          <SelectField label="Station" value={forms.monthEnd.stationId} onChange={(v) => updateForm("monthEnd", "stationId", v)} options={reference.stations.map((i) => ({ value: i.id, label: i.name }))} />
          <SelectField label="Product" value={forms.monthEnd.productId} onChange={(v) => updateForm("monthEnd", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
          <InputField label="Closed at" type="datetime-local" value={forms.monthEnd.closedAt} onChange={(v) => updateForm("monthEnd", "closedAt", v)} />
          <InputField label="Final dipstick" type="number" value={forms.monthEnd.finalDipstickLiters} onChange={(v) => updateForm("monthEnd", "finalDipstickLiters", v)} />
        </FormGrid>
        <p className="field-note">After rollover, the backend carries the measured closing stock forward.</p>
        <ActionButton onClick={() => submit("monthEnd", "/api/month-end-close", "Month-end rollover completed.")}>
          <CalendarCheck size={18} />
          Close period
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Profit and loss by closed cycle"
        columns={["Station", "Product", "Revenue", "COGS", "Gross profit", "Variance"]}
        rows={[...closedCycles].reverse().map((cycle) => [
          stationName(data, cycle.stationId),
          productName(data, cycle.productId),
          money(cycle.revenue),
          money(cycle.estimatedCogs),
          money(cycle.grossProfit),
          liters(cycle.varianceLiters)
        ])}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------
function Metric({ icon: Icon, label, value, highlight }) {
  return (
    <article className={`metric${highlight ? ` metric-${highlight}` : ""}`}>
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EntryPanel({ title, description, icon: Icon, children }) {
  return (
    <section className="entry-panel">
      <div className="section-heading">
        <div className="heading-with-icon">
          <Icon size={20} />
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>;
}

function InputField({ label, type = "text", value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ children, onClick, disabled = false }) {
  return (
    <button className="action-button" type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function DataTable({ title, columns, rows }) {
  return (
    <section className="table-section">
      {title && <div className="section-heading"><h2>{title}</h2></div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))
            ) : (
              <tr><td colSpan={columns.length}>No records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helper badge renderers
// ---------------------------------------------------------------------------
function shiftBadge(shift) {
  if (!shift) return <span className="badge badge-day"><Sun size={11} /> Day</span>;
  return shift === "night"
    ? <span className="badge badge-night"><Moon size={11} /> Night</span>
    : <span className="badge badge-day"><Sun size={11} /> Day</span>;
}

function paymentBadge(method) {
  const map = {
    cash: { label: "Cash", cls: "badge-cash" },
    mobile_money: { label: "M-Money", cls: "badge-mobile" },
    bank: { label: "Bank", cls: "badge-bank" }
  };
  const m = map[method] || map.cash;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function debtStatusBadge(status) {
  return status === "settled"
    ? <span className="badge badge-cash">Settled</span>
    : <span className="badge badge-debt">Open</span>;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
function stationName(data, stationId) {
  // If the ID is missing (or case-mismatched), safely fallback to the 
  // staff member's only assigned station
  const safeId = stationId || (data?.stations?.length === 1 ? data.stations[0].id : "");
  const match = data?.stations?.find(
    (s) => String(s.id).toLowerCase() === String(safeId).toLowerCase()
  );
  return match?.name || "Unknown station";
}

function productName(data, productId) {
  if (!productId) return "Unknown product";
  const match = data?.products?.find(
    (p) => String(p.id).toLowerCase() === String(productId).toLowerCase()
  );
  return match?.name || "Unknown product";
}

function lorryName(data, lorryId) {
  if (!lorryId) return "Not assigned";
  const match = data?.lorries?.find(
    (l) => String(l.id).toLowerCase() === String(lorryId).toLowerCase()
  );
  return match?.plateNumber || "Unknown lorry";
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
const rootElement = document.getElementById("root");
const root = window.__nzilabicheRoot || createRoot(rootElement);
window.__nzilabicheRoot = root;
root.render(<App />);

/* inject styles via a style tag approach - actual CSS goes in styles.css */