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
  Droplets,
  Factory,
  Gauge,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ShieldCheck,
  Settings,
  Truck,
  WalletCards
} from "lucide-react";
import "./styles.css";
import { isSupabaseConfigured } from "./supabaseClient.js";

const APP_LOCALE = "en-TZ";
const APP_TIME_ZONE = "Africa/Dar_es_Salaam";
const EAT_OFFSET = "+03:00";

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
  if (!value) {
    return value;
  }

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
    if (!response.ok) {
      throw new Error(body.message || "Database status check failed");
    }
    return body;
  },
  async post(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Request failed");
    }
    return body;
  }
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "deposits", label: "Deposits", icon: Banknote },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "depot", label: "Depot Trips", icon: Factory },
  { id: "variance", label: "Variance", icon: AlertTriangle },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "setup", label: "Setup", icon: Settings }
];

const emptyForms = {
  deposit: {
    stationId: "station-001",
    date: eatDateTimeInput(),
    lines: [
      { productId: "product-petrol", cashDeposited: 0, pumpPrice: 3000 },
      { productId: "product-diesel", cashDeposited: 0, pumpPrice: 2850 },
      { productId: "product-kerosene", cashDeposited: 0, pumpPrice: 2500 }
    ]
  },
  depot: {
    supplier: "",
    invoiceNumber: "",
    lorryId: "lorry-001",
    productId: "product-petrol",
    litersPurchased: 0,
    totalPurchaseCost: 0,
    purchasedAt: eatDateTimeInput()
  },
  delivery: {
    stationId: "station-001",
    productId: "product-petrol",
    depotTripId: "trip-001",
    litersDelivered: 0,
    preDeliveryDipstickLiters: 0,
    deliveredAt: eatDateTimeInput()
  },
  internal: {
    stationId: "station-001",
    productId: "product-petrol",
    date: eatDateTimeInput(),
    liters: 0,
    reason: ""
  },
  pump: {
    stationId: "station-001",
    productId: "product-petrol",
    date: eatDateTimeInput(),
    openingReading: 0,
    closingReading: 0
  },
  monthEnd: {
    stationId: "station-001",
    productId: "product-petrol",
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
  }
};

function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [forms, setForms] = useState(emptyForms);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [databaseStatus, setDatabaseStatus] = useState({
    connected: false,
    configured: isSupabaseConfigured,
    message: "Checking Supabase connection..."
  });

  const load = async () => {
    setError("");
    const bootstrap = await api.getBootstrap();
    setData(bootstrap);
    api
      .getDatabaseStatus()
      .then(setDatabaseStatus)
      .catch((err) =>
        setDatabaseStatus({
          connected: false,
          configured: isSupabaseConfigured,
          message: err.message
        })
      );
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const reference = useMemo(() => {
    if (!data) {
      return { stations: [], products: [], depotTrips: [], lorries: [] };
    }
    return {
      stations: data.stations,
      products: data.products,
      depotTrips: data.depotTrips,
      lorries: data.lorries
    };
  }, [data]);

  const updateForm = (key, field, value) => {
    setForms((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value
      }
    }));
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
    databaseStatus
  };

  return (
    <div className="app-shell">
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
          <button className="icon-button" onClick={load} type="button" aria-label="Refresh data">
            <RefreshCw size={18} />
          </button>
        </header>

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error">{error}</div>}

        {activeView === "dashboard" && <Dashboard {...activeProps} />}
        {activeView === "deposits" && <Deposits {...activeProps} />}
        {activeView === "deliveries" && <Deliveries {...activeProps} />}
        {activeView === "depot" && <DepotTrips {...activeProps} />}
        {activeView === "variance" && <Variance {...activeProps} />}
        {activeView === "reports" && <Reports {...activeProps} />}
        {activeView === "setup" && <Setup {...activeProps} />}
      </main>
    </div>
  );
}

function Dashboard({ data }) {
  const { totals, cycleCards, recentDeposits } = data.dashboard;
  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Cash collected" value={money(totals.cashCollected)} />
        <Metric icon={Gauge} label="Fuel sold" value={liters(totals.fuelSold)} />
        <Metric icon={Droplets} label="Expected stock" value={liters(totals.expectedStock)} />
        <Metric icon={BarChart3} label="Gross profit" value={money(totals.grossProfit)} />
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
                <div>
                  <dt>Expected stock</dt>
                  <dd>{liters(cycle.snapshot.expectedClosingStockLiters)}</dd>
                </div>
                <div>
                  <dt>Cycle sales</dt>
                  <dd>{liters(cycle.snapshot.estimatedLitersSold)}</dd>
                </div>
                <div>
                  <dt>Blended cost</dt>
                  <dd>{money(cycle.blendedCostPerLiter)} / L</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{shortDate(cycle.openedAt)}</dd>
                </div>
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
            columns={["Station", "Date", "Cash", "Liters"]}
            rows={recentDeposits.map((deposit) => [
              stationName(data, deposit.stationId),
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
                  <span>
                    {cycle.stationName}: {low ? "low stock risk" : "stock level normal"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}

function Deposits({ data, reference, forms, updateForm, updateDepositLine, submit }) {
  return (
    <section className="view-grid">
      <EntryPanel
        title="Daily sales settlement"
        description="Enter one station and split the cash by product so liters and stock move correctly."
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
        <ProductSettlementLines
          data={data}
          forms={forms}
          updateDepositLine={updateDepositLine}
        />
        <p className="field-note">
          If cash is brought as one mixed amount, management must split it by product using pump totals, attendant sheet,
          or pump meter readings. Without that split, the system cannot know which tank sold how many liters.
        </p>
        <ActionButton
          onClick={() =>
            submit("deposit", "/api/daily-deposit-settlements", "Daily sales settlement recorded.")
          }
        >
          <Plus size={18} />
          Record settlement
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Deposit history"
        columns={["Station", "Product", "Cash", "Price", "Liters"]}
        rows={[...data.dailyDeposits].reverse().map((deposit) => [
          stationName(data, deposit.stationId),
          productName(data, deposit.productId),
          money(deposit.cashDeposited),
          money(deposit.pumpPrice),
          liters(deposit.estimatedLitersSold)
        ])}
      />
    </section>
  );
}

function Deliveries({ data, reference, forms, updateForm, submit }) {
  const depotOptions = reference.depotTrips
    .filter((trip) => trip.productId === forms.delivery.productId)
    .map((trip) => ({
      value: trip.id,
      label: `${trip.invoiceNumber} - ${productName(data, trip.productId)} @ ${money(trip.costPerLiter)}`
    }));

  return (
    <section className="view-grid">
      <EntryPanel
        title="Delivery entry"
        description="A delivery closes the previous cycle and opens the next one automatically."
        icon={Truck}
      >
        <FormGrid>
          <SelectField
            label="Station"
            value={forms.delivery.stationId}
            onChange={(value) => updateForm("delivery", "stationId", value)}
            options={reference.stations.map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label="Product"
            value={forms.delivery.productId}
            onChange={(value) => updateForm("delivery", "productId", value)}
            options={reference.products.map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label="Linked depot trip"
            value={forms.delivery.depotTripId}
            onChange={(value) => updateForm("delivery", "depotTripId", value)}
            options={depotOptions}
          />
          <InputField
            label="Delivery timestamp"
            type="datetime-local"
            value={forms.delivery.deliveredAt}
            onChange={(value) => updateForm("delivery", "deliveredAt", value)}
          />
          <InputField
            label="Liters delivered"
            type="number"
            value={forms.delivery.litersDelivered}
            onChange={(value) => updateForm("delivery", "litersDelivered", value)}
          />
          <InputField
            label="Dipstick before closure"
            type="number"
            value={forms.delivery.preDeliveryDipstickLiters}
            onChange={(value) => updateForm("delivery", "preDeliveryDipstickLiters", value)}
          />
        </FormGrid>
        <p className="field-note">
          This dipstick closes the old cycle. The new cycle opening stock is calculated from remaining fuel plus delivered fuel.
        </p>
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

function DepotTrips({ data, reference, forms, updateForm, submit }) {
  return (
    <section className="view-grid">
      <EntryPanel
        title="Depot trip"
        description="Purchasing and station delivery stay separate. Cost per liter is calculated by the backend."
        icon={Factory}
      >
        <FormGrid>
          <InputField
            label="Supplier"
            value={forms.depot.supplier}
            onChange={(value) => updateForm("depot", "supplier", value)}
          />
          <InputField
            label="Supplier invoice / receipt ref"
            value={forms.depot.invoiceNumber}
            onChange={(value) => updateForm("depot", "invoiceNumber", value)}
          />
          <SelectField
            label="Lorry"
            value={forms.depot.lorryId}
            onChange={(value) => updateForm("depot", "lorryId", value)}
            options={[
              { value: "", label: "Not assigned" },
              ...reference.lorries.map((item) => ({
                value: item.id,
                label: `${item.plateNumber}${item.driverName ? ` - ${item.driverName}` : ""}`
              }))
            ]}
          />
          <SelectField
            label="Product"
            value={forms.depot.productId}
            onChange={(value) => updateForm("depot", "productId", value)}
            options={reference.products.map((item) => ({ value: item.id, label: item.name }))}
          />
          <InputField
            label="Purchased at"
            type="datetime-local"
            value={forms.depot.purchasedAt}
            onChange={(value) => updateForm("depot", "purchasedAt", value)}
          />
          <InputField
            label="Liters purchased"
            type="number"
            value={forms.depot.litersPurchased}
            onChange={(value) => updateForm("depot", "litersPurchased", value)}
          />
          <InputField
            label="Total purchase cost"
            type="number"
            value={forms.depot.totalPurchaseCost}
            onChange={(value) => updateForm("depot", "totalPurchaseCost", value)}
          />
        </FormGrid>
        <p className="field-note">
          Use the supplier invoice number, receipt number, or delivery note reference. It is the document number that proves the depot purchase.
        </p>
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
        <EntryPanel
          title="New petrol station"
          description="Add stations before recording deliveries, deposits, and month-end closures."
          icon={Building2}
        >
          <FormGrid>
            <InputField
              label="Station name"
              value={forms.station.name}
              onChange={(value) => updateForm("station", "name", value)}
            />
            <InputField
              label="Location"
              value={forms.station.location}
              onChange={(value) => updateForm("station", "location", value)}
            />
            <InputField
              label="Tank capacity"
              type="number"
              value={forms.station.tankCapacityLiters}
              onChange={(value) => updateForm("station", "tankCapacityLiters", value)}
            />
            <InputField
              label="Low-stock alert"
              type="number"
              value={forms.station.lowStockThresholdLiters}
              onChange={(value) => updateForm("station", "lowStockThresholdLiters", value)}
            />
          </FormGrid>
          <ActionButton onClick={() => submit("station", "/api/stations", "Petrol station added.")}>
            <Plus size={18} />
            Add station
          </ActionButton>
        </EntryPanel>

        <EntryPanel
          title="New lorry"
          description="Register the vehicle used for depot purchases and station deliveries."
          icon={Truck}
        >
          <FormGrid>
            <InputField
              label="Plate number"
              value={forms.lorry.plateNumber}
              onChange={(value) => updateForm("lorry", "plateNumber", value)}
            />
            <InputField
              label="Driver"
              value={forms.lorry.driverName}
              onChange={(value) => updateForm("lorry", "driverName", value)}
            />
            <InputField
              label="Capacity"
              type="number"
              value={forms.lorry.capacityLiters}
              onChange={(value) => updateForm("lorry", "capacityLiters", value)}
            />
            <InputField
              label="Notes"
              value={forms.lorry.notes}
              onChange={(value) => updateForm("lorry", "notes", value)}
            />
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

function Variance({ data, reference, forms, updateForm, submit }) {
  const closedCycles = data.cycles.filter((cycle) => cycle.status === "closed").reverse();
  return (
    <section className="view-grid">
      <section className="section-band two-column">
        <EntryPanel
          title="Internal fuel use"
          description="Record generator, vehicle, testing, or calibration fuel before it becomes variance."
          icon={ClipboardList}
        >
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.internal.stationId}
              onChange={(value) => updateForm("internal", "stationId", value)}
              options={reference.stations.map((item) => ({ value: item.id, label: item.name }))}
            />
            <SelectField
              label="Product"
              value={forms.internal.productId}
              onChange={(value) => updateForm("internal", "productId", value)}
              options={reference.products.map((item) => ({ value: item.id, label: item.name }))}
            />
            <InputField
              label="Date"
              type="datetime-local"
              value={forms.internal.date}
              onChange={(value) => updateForm("internal", "date", value)}
            />
            <InputField
              label="Liters"
              type="number"
              value={forms.internal.liters}
              onChange={(value) => updateForm("internal", "liters", value)}
            />
            <InputField
              label="Reason"
              value={forms.internal.reason}
              onChange={(value) => updateForm("internal", "reason", value)}
            />
          </FormGrid>
          <ActionButton onClick={() => submit("internal", "/api/internal-fuel-use", "Internal usage recorded.")}>
            <Plus size={18} />
            Record use
          </ActionButton>
        </EntryPanel>

        <EntryPanel
          title="Pump meter reading"
          description="Optional reconciliation layer for pumps with cumulative meter readings."
          icon={Gauge}
        >
          <FormGrid>
            <SelectField
              label="Station"
              value={forms.pump.stationId}
              onChange={(value) => updateForm("pump", "stationId", value)}
              options={reference.stations.map((item) => ({ value: item.id, label: item.name }))}
            />
            <SelectField
              label="Product"
              value={forms.pump.productId}
              onChange={(value) => updateForm("pump", "productId", value)}
              options={reference.products.map((item) => ({ value: item.id, label: item.name }))}
            />
            <InputField
              label="Date"
              type="datetime-local"
              value={forms.pump.date}
              onChange={(value) => updateForm("pump", "date", value)}
            />
            <InputField
              label="Opening meter"
              type="number"
              value={forms.pump.openingReading}
              onChange={(value) => updateForm("pump", "openingReading", value)}
            />
            <InputField
              label="Closing meter"
              type="number"
              value={forms.pump.closingReading}
              onChange={(value) => updateForm("pump", "closingReading", value)}
            />
          </FormGrid>
          <ActionButton onClick={() => submit("pump", "/api/pump-meter-readings", "Pump reading recorded.")}>
            <Plus size={18} />
            Record meter
          </ActionButton>
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

function Reports({ data, reference, forms, updateForm, submit }) {
  const closedCycles = data.cycles.filter((cycle) => cycle.status === "closed");
  const revenue = closedCycles.reduce((sum, cycle) => sum + Number(cycle.revenue || 0), 0);
  const cogs = closedCycles.reduce((sum, cycle) => sum + Number(cycle.estimatedCogs || 0), 0);
  const profit = closedCycles.reduce((sum, cycle) => sum + Number(cycle.grossProfit || 0), 0);

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric icon={WalletCards} label="Closed revenue" value={money(revenue)} />
        <Metric icon={Factory} label="Estimated COGS" value={money(cogs)} />
        <Metric icon={BarChart3} label="Gross profit" value={money(profit)} />
        <Metric icon={AlertTriangle} label="Variance cycles" value={closedCycles.length} />
      </div>

      <EntryPanel
        title="Month-end closure"
        description="Force-split the active cycle and roll the measured inventory forward."
        icon={CalendarCheck}
      >
        <FormGrid>
          <SelectField
            label="Station"
            value={forms.monthEnd.stationId}
            onChange={(value) => updateForm("monthEnd", "stationId", value)}
            options={reference.stations.map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label="Product"
            value={forms.monthEnd.productId}
            onChange={(value) => updateForm("monthEnd", "productId", value)}
            options={reference.products.map((item) => ({ value: item.id, label: item.name }))}
          />
          <InputField
            label="Closed at"
            type="datetime-local"
            value={forms.monthEnd.closedAt}
            onChange={(value) => updateForm("monthEnd", "closedAt", value)}
          />
          <InputField
            label="Final dipstick"
            type="number"
            value={forms.monthEnd.finalDipstickLiters}
            onChange={(value) => updateForm("monthEnd", "finalDipstickLiters", value)}
          />
        </FormGrid>
        <p className="field-note">
          After rollover, there is no new opening dipstick. The backend carries the measured closing stock forward.
        </p>
        <ActionButton onClick={() => submit("monthEnd", "/api/month-end-close", "Month-end rollover completed.")}>
          <CalendarCheck size={18} />
          Close period
        </ActionButton>
      </EntryPanel>

      <DataTable
        title="Profit and loss by closed cycle"
        columns={["Station", "Product", "Revenue", "COGS", "Gross profit", "Variance"]}
        rows={closedCycles.reverse().map((cycle) => [
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

function Metric({ icon: Icon, label, value }) {
  return (
    <article className="metric">
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
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function DataTable({ title, columns, rows }) {
  return (
    <section className="table-section">
      {title && (
        <div className="section-heading">
          <h2>{title}</h2>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${row.join("-")}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function stationName(data, stationId) {
  return data.stations.find((station) => station.id === stationId)?.name || "Unknown station";
}

function productName(data, productId) {
  return data.products.find((product) => product.id === productId)?.name || "Unknown product";
}

function lorryName(data, lorryId) {
  if (!lorryId) {
    return "Not assigned";
  }
  const lorry = data.lorries.find((item) => item.id === lorryId);
  return lorry ? lorry.plateNumber : "Unknown lorry";
}

const rootElement = document.getElementById("root");
const root = window.__nzilabicheRoot || createRoot(rootElement);
window.__nzilabicheRoot = root;
root.render(<App />);
