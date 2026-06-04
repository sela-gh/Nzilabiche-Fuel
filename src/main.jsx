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
  Moon,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Settings,
  Sun,
  Truck,
  WalletCards
} from "lucide-react";
import "./styles.css";
import { isSupabaseConfigured } from "./supabaseClient.js";

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

const money = (value) =>
  new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const liters = (value) =>
  `${new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 }).format(Number(value || 0))} L`;

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
  async getBootstrap() {
    const response = await fetch("/api/bootstrap");
    return response.json();
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Request failed");
    return body;
  }
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "deposits", label: "Deposits", icon: Banknote },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "depot", label: "Depot Trips", icon: Factory },
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
      { productId: "product-petrol", cashDeposited: 0, pumpPrice: 3000 },
      { productId: "product-diesel", cashDeposited: 0, pumpPrice: 2850 },
      { productId: "product-kerosene", cashDeposited: 0, pumpPrice: 2500 }
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
    depotTripId: "",
    litersDelivered: 0,
    preDeliveryDipstickLiters: 0,
    deliveredAt: eatDateTimeInput()
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
    lowStockThresholdLiters: 0
  },
  lorry: {
    plateNumber: "",
    driverName: "",
    capacityLiters: 0,
    notes: ""
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
  }
};

function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [forms, setForms] = useState(emptyForms);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [activeShift, setActiveShift] = useState("day");
  const [databaseStatus, setDatabaseStatus] = useState({
    connected: false,
    configured: isSupabaseConfigured,
    message: "Checking Supabase connection..."
  });

  const load = async () => {
    setError("");
    const bootstrap = await api.getBootstrap();
    setData(bootstrap);
    const firstStation = bootstrap.stations[0]?.id || "";
    const firstProduct = bootstrap.products[0]?.id || "";
    const firstLorry = bootstrap.lorries[0]?.id || "";
    setForms((current) => ({
      ...current,
      deposit: {
        ...current.deposit,
        stationId: current.deposit.stationId || firstStation,
        lines: bootstrap.products.map((product) => ({
          productId: product.id,
          cashDeposited: 0,
          pumpPrice: 0
        }))
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
      debtIssue: {
        ...current.debtIssue,
        stationId: current.debtIssue.stationId || firstStation
      }
    }));
    setExpenses(bootstrap.expenses || []);
    setDebts(bootstrap.debts || []);
    api
      .getDatabaseStatus()
      .then(setDatabaseStatus)
      .catch((err) =>
        setDatabaseStatus({ connected: false, configured: isSupabaseConfigured, message: err.message })
      );
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const reference = useMemo(() => {
    if (!data) return { stations: [], products: [], depotTrips: [], lorries: [] };
    return { stations: data.stations, products: data.products, depotTrips: data.depotTrips, lorries: data.lorries };
  }, [data]);

  const updateForm = (key, field, value) => {
    setForms((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  };

  const updateDepositLine = (productId, field, value) => {
    setForms((current) => ({
      ...current,
      deposit: {
        ...current.deposit,
        lines: current.deposit.lines.map((line) =>
          line.productId === productId ? { ...line, [field]: value } : line
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
    reference,
    forms,
    updateForm,
    updateDepositLine,
    submit,
    submitExpense,
    submitDebtIssue,
    submitDebtSettlement,
    expenses,
    debts,
    databaseStatus,
    activeShift,
    setActiveShift
  };

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
          {navItems.map((item) => {
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
            <h1>{navItems.find((item) => item.id === activeView)?.label}</h1>
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
        {activeView === "expenses" && <Expenses {...activeProps} />}
        {activeView === "variance" && <Variance {...activeProps} />}
        {activeView === "reports" && <Reports {...activeProps} />}
        {activeView === "setup" && <Setup {...activeProps} />}
      </main>
    </div>
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
  const netProfit = financialSummary.netProfit ?? totals.grossProfit - totalExpenses;

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Cash collected" value={money(totals.cashCollected)} />
        <Metric icon={Gauge} label="Fuel sold" value={liters(totals.fuelSold)} />
        <Metric icon={Droplets} label="Expected stock" value={liters(totals.expectedStock)} />
        <Metric icon={BarChart3} label="Gross profit" value={money(totals.grossProfit)} />
        <Metric icon={Receipt} label="Expenses + open debt" value={money(totalExpenses)} />
        <Metric icon={BarChart3} label="Net profit / loss" value={money(netProfit)} highlight={netProfit < 0 ? "loss" : "profit"} />
      </div>

      <section className="section-band">
        <div className="section-heading">
          <h2>Active station cycles</h2>
          <p>Opening stock is derived by the backend; no beginning-cycle dipstick entry is used.</p>
        </div>
        <div className="cycle-grid">
          {cycleCards.map((cycle) => (
            <article className="cycle-card" key={cycle.id}>
              <div className="cycle-title">
                <div>
                  <h3>{cycle.stationName}</h3>
                  <span>{cycle.productName}</span>
                </div>
                <Gauge size={20} />
              </div>
              <div className="stock-bar" aria-label="Expected stock percentage">
                <span style={{ width: `${cycle.stockPercent}%` }} />
              </div>
              <dl className="compact-list">
                <div><dt>Expected stock</dt><dd>{liters(cycle.snapshot.expectedClosingStockLiters)}</dd></div>
                <div><dt>Cycle sales</dt><dd>{liters(cycle.snapshot.estimatedLitersSold)}</dd></div>
                <div><dt>Blended cost</dt><dd>{money(cycle.blendedCostPerLiter)} / L</dd></div>
                <div><dt>Opened</dt><dd>{shortDate(cycle.openedAt)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="section-band two-column">
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
function Deposits({ data, reference, forms, updateForm, updateDepositLine, submit }) {
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
            onChange={(value) => updateForm("deposit", "stationId", value)}
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
        columns={["Station", "Shift", "Payment", "Product", "Cash", "Price", "Liters"]}
        rows={[...data.dailyDeposits].reverse().map((deposit) => [
          stationName(data, deposit.stationId),
          shiftBadge(deposit.shift),
          paymentBadge(deposit.paymentMethod),
          productName(data, deposit.productId),
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
function Deliveries({ data, reference, forms, updateForm, submit }) {
  const depotOptions = [
    { value: "", label: "-- Select a linked depot trip --" },
    ...reference.depotTrips
      .filter((trip) => trip.productId === forms.delivery.productId)
      .map((trip) => ({
        value: trip.id,
        label: `${trip.invoiceNumber} - ${productName(data, trip.productId)} @ ${money(trip.costPerLiter)}`
      }))
  ];

  return (
    <section className="view-grid">
      <EntryPanel
        title="Delivery entry"
        description="A delivery closes the previous cycle and opens the next one automatically."
        icon={Truck}
      >
        <FormGrid>
          <SelectField label="Station" value={forms.delivery.stationId} onChange={(v) => updateForm("delivery", "stationId", v)} options={reference.stations.map((i) => ({ value: i.id, label: i.name }))} />
          <SelectField label="Product" value={forms.delivery.productId} onChange={(v) => updateForm("delivery", "productId", v)} options={reference.products.map((i) => ({ value: i.id, label: i.name }))} />
          <SelectField label="Linked depot trip" value={forms.delivery.depotTripId} onChange={(v) => updateForm("delivery", "depotTripId", v)} options={depotOptions} />
          <InputField label="Delivery timestamp" type="datetime-local" value={forms.delivery.deliveredAt} onChange={(v) => updateForm("delivery", "deliveredAt", v)} />
          <InputField label="Liters delivered" type="number" value={forms.delivery.litersDelivered} onChange={(v) => updateForm("delivery", "litersDelivered", v)} />
          <InputField label="Dipstick before closure" type="number" value={forms.delivery.preDeliveryDipstickLiters} onChange={(v) => updateForm("delivery", "preDeliveryDipstickLiters", v)} />
        </FormGrid>
        <p className="field-note">This dipstick closes the old cycle. New cycle opening stock = remaining fuel + delivered fuel.</p>
        <ActionButton onClick={() => submit("delivery", "/api/deliveries", "Delivery cycle recorded.")}>
          <ArrowDownUp size={18} />
          Close and open cycle
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Delivery cycles"
        columns={["Station", "Product", "Status", "Opening", "Variance"]}
        rows={[...data.cycles].reverse().map((cycle) => [
          stationName(data, cycle.stationId),
          productName(data, cycle.productId),
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
          money(debt.principalAmount),
          money(debt.principalAmount - debt.outstandingAmount),
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
// Product settlement lines
// ---------------------------------------------------------------------------
function ProductSettlementLines({ data, forms, updateDepositLine }) {
  return (
    <div className="settlement-lines">
      {forms.deposit.lines.map((line) => (
        <div className="product-line" key={line.productId}>
          <strong>{productName(data, line.productId)}</strong>
          <InputField
            label="Cash for this product"
            type="number"
            value={line.cashDeposited}
            onChange={(value) => updateDepositLine(line.productId, "cashDeposited", value)}
          />
          <InputField
            label="Pump price"
            type="number"
            value={line.pumpPrice}
            onChange={(value) => updateDepositLine(line.productId, "pumpPrice", value)}
          />
          <span>{Number(line.pumpPrice) > 0 ? liters(Number(line.cashDeposited) / Number(line.pumpPrice)) : "0 L"}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
function Setup({ reference, forms, updateForm, submit, databaseStatus }) {
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
  const revenue = closedCycles.reduce((sum, cycle) => sum + Number(cycle.revenue || 0), 0);
  const cogs = closedCycles.reduce((sum, cycle) => sum + Number(cycle.estimatedCogs || 0), 0);
  const grossProfit =
    financialSummary.totalGrossProfit ??
    closedCycles.reduce((sum, cycle) => sum + Number(cycle.grossProfit || 0), 0);
  const totalExpenses =
    financialSummary.totalExpenses ?? expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = financialSummary.netProfit ?? grossProfit - totalExpenses;

  // Shift P&L using live deposits
  const allDeposits = data.dailyDeposits || [];
  const shiftRevenue = (shift) => allDeposits
    .filter((d) => (d.shift || "day") === shift)
    .reduce((s, d) => s + Number(d.cashDeposited || 0), 0);
  const shiftExpenses = (shift) => expenses
    .filter((e) => e.shift === shift)
    .reduce((s, e) => s + e.amount, 0);

  const dayRev = shiftRevenue("day");
  const nightRev = shiftRevenue("night");
  const dayExp = shiftExpenses("day");
  const nightExp = shiftExpenses("night");

  // Per-station P&L
  const stationSummary = (data.stations || []).map((station) => {
    const stRev = allDeposits.filter((d) => d.stationId === station.id).reduce((s, d) => s + Number(d.cashDeposited || 0), 0);
    const stExp = expenses.filter((e) => e.stationId === station.id).reduce((s, e) => s + e.amount, 0);
    return { name: station.name, revenue: stRev, expenses: stExp, net: stRev - stExp };
  });

  return (
    <section className="view-grid">
      {/* Top metrics */}
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Closed revenue" value={money(revenue)} />
        <Metric icon={Factory} label="Estimated COGS" value={money(cogs)} />
        <Metric icon={BarChart3} label="Gross profit" value={money(grossProfit)} />
        <Metric icon={Receipt} label="Expenses + open debt" value={money(totalExpenses)} />
        <Metric icon={BarChart3} label="Net profit / loss" value={money(netProfit)} highlight={netProfit < 0 ? "loss" : "profit"} />
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
        title="Net profit by station"
        columns={["Station", "Revenue", "Expenses", "Net profit / loss"]}
        rows={stationSummary.map((s) => [
          s.name,
          money(s.revenue),
          money(s.expenses),
          money(s.net)
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
function stationName(data, stationId) {
  return data.stations.find((s) => s.id === stationId)?.name || "Unknown station";
}

function productName(data, productId) {
  return data.products.find((p) => p.id === productId)?.name || "Unknown product";
}

function lorryName(data, lorryId) {
  if (!lorryId) return "Not assigned";
  return data.lorries.find((l) => l.id === lorryId)?.plateNumber || "Unknown lorry";
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
const rootElement = document.getElementById("root");
const root = window.__nzilabicheRoot || createRoot(rootElement);
window.__nzilabicheRoot = root;
root.render(<App />);

/* inject styles via a style tag approach - actual CSS goes in styles.css */