import { supabase, isSupabaseConfigured } from "./supabase.js";
import { createSeedState } from "./seed.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Returns value if it is a real UUID, otherwise null.
// Prevents empty strings reaching Supabase uuid columns.
const uuid = (v) =>
  v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v))
    ? v
    : null;

const isMissingRelationError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
};

// ---------------------------------------------------------------------------
// Column mappers — Supabase snake_case <-> app camelCase
// ---------------------------------------------------------------------------

const mapStation = (row) => ({
  id: row.id,
  name: row.name,
  location: row.location,
  tankCapacityLiters: Number(row.tank_capacity_liters || 0),
  lowStockThresholdLiters: Number(row.low_stock_threshold_liters || 0),
  petrolTankCount: Number(row.petrol_tank_count || 1),
  dieselTankCount: Number(row.diesel_tank_count || 1),
  keroseneTankCount: Number(row.kerosene_tank_count || 1)
});

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  unit: row.unit
});

const mapLorry = (row) => ({
  id: row.id,
  plateNumber: row.plate_number,
  driverName: row.driver_name || "",
  capacityLiters: Number(row.capacity_liters || 0),
  notes: row.notes || ""
});

const mapDepotTrip = (row) => ({
  id: row.id,
  supplier: row.supplier_name,
  invoiceNumber: row.invoice_number,
  lorryId: row.lorry_id || null,
  productId: row.product_id,
  litersPurchased: Number(row.total_liters || 0),
  totalPurchaseCost: Number(row.total_cost || 0),
  costPerLiter: Number(row.cost_per_liter || 0),
  purchasedAt: row.trip_date
});

const mapCycle = (row) => ({
  id: row.id,
  stationId: row.station_id,
  productId: row.product_id,
  depotTripId: row.depot_trip_id || null,
  pumpNumber: Number(row.pump_number || 1),
  tankNumber: Number(row.tank_number || row.pump_number || 1),
  status: row.status === "open" ? "active" : row.status,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  closeReason: row.close_reason,
  openingStockLiters: Number(row.opening_stock_liters || 0),
  deliveryLiters: Number(row.delivery_liters_app || 0),
  blendedCostPerLiter: Number(row.blended_cost_per_liter || 0),
  expectedClosingStockLiters:
    row.expected_closing_stock_liters != null
      ? Number(row.expected_closing_stock_liters)
      : null,
  actualDipstickLiters:
    row.actual_dipstick_liters != null ? Number(row.actual_dipstick_liters) : null,
  varianceLiters: row.variance_liters != null ? Number(row.variance_liters) : null,
  revenue: Number(row.revenue || 0),
  estimatedCogs: Number(row.estimated_cogs || 0),
  grossProfit: Number(row.gross_profit || 0)
});

const mapDeposit = (row) => ({
  id: row.id,
  stationId: row.station_id,
  productId: row.product_id,
  date: row.date || row.deposit_date,
  cashDeposited: Number(row.cash_deposited || 0),
  pumpPrice: Number(row.pump_price || 0),
  estimatedLitersSold: Number(row.estimated_liters_sold || 0),
  shift: row.shift || 'day',
  paymentMethod: row.payment_method || 'cash',
  pumpNumber: Number(row.pump_number || 1),
  tankNumber: Number(row.tank_number || row.pump_number || 1)
});

const mapPumpTankLink = (row) => ({
  id: row.id,
  stationId: row.station_id,
  productId: row.product_id,
  pumpNumber: Number(row.pump_number || 1),
  tankNumber: Number(row.tank_number || 1),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapInternalUse = (row) => ({
  id: row.id,
  stationId: row.station_id,
  productId: row.product_id,
  date: row.date || row.use_date,
  liters: Number(row.liters || 0),
  reason: row.reason || ""
});

const mapPumpReading = (row) => ({
  id: row.id,
  stationId: row.station_id,
  productId: row.product_id,
  date: row.date || row.reading_date,
  openingReading: Number(row.opening_reading || 0),
  closingReading: Number(row.closing_reading || 0),
  dispensedLiters: Number(row.dispensed_liters || 0)
});


const mapExpense = (row) => ({
  id: row.id,
  stationId: row.station_id,
  date: row.date,
  shift: row.shift || 'day',
  category: row.category,
  description: row.description,
  amount: Number(row.amount || 0),
  paymentMethod: row.payment_method || 'cash',
  debtId: row.debt_id || null,
  createdAt: row.created_at
});

const mapDebt = (row) => ({
  id: row.id,
  stationId: row.station_id,
  debtorName: row.debtor_name,
  description: row.description,
  totalAmount: Number(row.total_amount || 0),
  settledAmount: Number(row.settled_amount || 0),
  outstandingAmount: Number(row.outstanding_amount || 0),
  status: row.status,
  openedAt: row.opened_at,
  closedAt: row.closed_at || null,
  notes: row.notes || '',
  createdAt: row.created_at
});

const mapDebtPayment = (row) => ({
  id: row.id,
  debtId: row.debt_id,
  stationId: row.station_id,
  amount: Number(row.amount || 0),
  settledAt: row.settled_at,
  note: row.note || '',
  createdAt: row.created_at
});

// ---------------------------------------------------------------------------
// Supabase loaders
// ---------------------------------------------------------------------------

const loadFromSupabase = async () => {
  const [
    { data: stations, error: e1 },
    { data: products, error: e2 },
    { data: lorries, error: e3 },
    { data: depotTrips, error: e4 },
    { data: cycles, error: e5 },
    { data: deposits, error: e6 },
    { data: internalUses, error: e7 },
    { data: pumpReadings, error: e8 },
    { data: expenses, error: e9 },
    { data: debts, error: e10 },
    { data: pumpTankLinks, error: e11 }
  ] = await Promise.all([
    supabase.from("petrol_stations").select("*").eq("status", "active").order("created_at"),
    supabase.from("fuel_products").select("*").eq("status", "active").order("name"),
    supabase.from("lorries").select("*").order("created_at"),
    supabase.from("depot_trips").select("*").order("trip_date"),
    supabase.from("delivery_cycles").select("*").order("opened_at"),
    supabase.from("daily_deposits").select("*").order("date"),
    supabase.from("internal_fuel_use").select("*").order("date"),
    supabase.from("pump_meter_readings").select("*").order("date"),
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    supabase.from("debts").select("*").order("opened_at", { ascending: false }),
    supabase.from("pump_tank_links").select("*").order("pump_number")
  ]);

  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10;
  if (firstError) throw new Error(firstError.message);
  if (e11 && !isMissingRelationError(e11)) {
    throw new Error(e11.message);
  }

  const mappedDepotTrips = (depotTrips || []).map(mapDepotTrip);
  console.log("[loadFromSupabase] depot trip IDs:", mappedDepotTrips.map((t) => t.id));

  return {
    stations: (stations || []).map(mapStation),
    products: (products || []).map(mapProduct),
    lorries: (lorries || []).map(mapLorry),
    depotTrips: mappedDepotTrips,
    cycles: (cycles || []).map(mapCycle),
    dailyDeposits: (deposits || [])
      .filter((r) => Number(r.cash_deposited || 0) > 0)
      .map(mapDeposit),
    internalFuelUses: (internalUses || []).map(mapInternalUse),
    pumpMeterReadings: (pumpReadings || []).map(mapPumpReading),
    priceHistory: [],
    auditLogs: [],
    expenses: (expenses || []).map(mapExpense),
    debts: (debts || []).map(mapDebt),
    pumpTankLinks: e11 ? [] : (pumpTankLinks || []).map(mapPumpTankLink)
  };
};

// ---------------------------------------------------------------------------
// Supabase writers
// ---------------------------------------------------------------------------

export const saveStation = async (station) => {
  const { data, error } = await supabase
    .from("petrol_stations")
    .insert({
      name: station.name,
      location: station.location,
      tank_capacity_liters: station.tankCapacityLiters,
      low_stock_threshold_liters: station.lowStockThresholdLiters,
      petrol_tank_count: station.petrolTankCount || 1,
      diesel_tank_count: station.dieselTankCount || 1,
      kerosene_tank_count: station.keroseneTankCount || 1,
      status: "active"
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapStation(data);
};

export const saveLorry = async (lorry) => {
  const { data, error } = await supabase
    .from("lorries")
    .insert({
      plate_number: lorry.plateNumber,
      driver_name: lorry.driverName,
      capacity_liters: lorry.capacityLiters,
      notes: lorry.notes
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapLorry(data);
};

export const saveDepotTrip = async (trip) => {
  const { data, error } = await supabase
    .from("depot_trips")
    .insert({
      supplier_name: trip.supplier,
      invoice_number: trip.invoiceNumber,
      lorry_id: uuid(trip.lorryId),
      product_id: trip.productId,
      trip_date: trip.purchasedAt,
      total_liters: trip.litersPurchased,
      total_cost: trip.totalPurchaseCost,
      cost_per_liter: trip.costPerLiter
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDepotTrip(data);
};

export const saveDeposit = async (deposit) => {
  const { data, error } = await supabase
    .from("daily_deposits")
    .insert({
      station_id: deposit.stationId,
      product_id: deposit.productId,
      date: deposit.date,
      deposit_date: deposit.date,
      cash_deposited: deposit.cashDeposited,
      total_cash_amount: deposit.cashDeposited,
      pump_price: deposit.pumpPrice,
      estimated_liters_sold: deposit.estimatedLitersSold,
      shift: deposit.shift || "day",
      payment_method: deposit.paymentMethod || "cash",
      pump_number: deposit.pumpNumber || 1,
      tank_number: deposit.tankNumber || deposit.pumpNumber || 1
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDeposit(data);
};

export const saveCycle = async (cycle) => {
  if (!uuid(cycle.stationId))
    throw new Error("Station is required. Please select a station before recording a delivery.");
  if (!uuid(cycle.productId))
    throw new Error("Product is required. Please select a product before recording a delivery.");
  if (!uuid(cycle.depotTripId))
    throw new Error(
      "Depot trip is required. Please select a depot trip that was created through the app."
    );

  const { data, error } = await supabase
    .from("delivery_cycles")
    .insert({
      station_id: uuid(cycle.stationId),
      product_id: uuid(cycle.productId),
      depot_trip_id: uuid(cycle.depotTripId),
      pump_number: cycle.pumpNumber || 1,
      tank_number: cycle.tankNumber || cycle.pumpNumber || 1,
      status: cycle.status === "active" ? "open" : cycle.status,
      opened_at: cycle.openedAt,
      closed_at: cycle.closedAt,
      close_reason: cycle.closeReason,
      opening_stock_liters: cycle.openingStockLiters,
      delivery_liters_app: cycle.deliveryLiters,
      blended_cost_per_liter: cycle.blendedCostPerLiter,
      expected_closing_stock_liters: cycle.expectedClosingStockLiters,
      actual_dipstick_liters: cycle.actualDipstickLiters,
      variance_liters: cycle.varianceLiters,
      revenue: cycle.revenue,
      estimated_cogs: cycle.estimatedCogs,
      gross_profit: cycle.grossProfit,
      cycle_start_date: cycle.openedAt,
      opening_liters: cycle.openingStockLiters,
      opening_cost_per_liter: cycle.blendedCostPerLiter,
      available_liters: cycle.openingStockLiters
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapCycle(data);
};

export const savePumpTankLink = async (link) => {
  if (!isSupabaseConfigured) return link;
  const { data, error } = await supabase
    .from("pump_tank_links")
    .upsert(
      {
        station_id: uuid(link.stationId),
        product_id: uuid(link.productId),
        pump_number: link.pumpNumber || 1,
        tank_number: link.tankNumber || 1,
        updated_at: new Date().toISOString()
      },
      { onConflict: "station_id,product_id,pump_number" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPumpTankLink(data);
};

export const updateCycle = async (cycle) => {
  console.log("[updateCycle] id:", cycle.id);
  const { error } = await supabase
    .from("delivery_cycles")
    .update({
      status: cycle.status === "active" ? "open" : cycle.status,
      tank_number: cycle.tankNumber || cycle.pumpNumber || 1,
      closed_at: cycle.closedAt,
      close_reason: cycle.closeReason,
      expected_closing_stock_liters: cycle.expectedClosingStockLiters,
      actual_dipstick_liters: cycle.actualDipstickLiters,
      variance_liters: cycle.varianceLiters,
      revenue: cycle.revenue,
      estimated_cogs: cycle.estimatedCogs,
      gross_profit: cycle.grossProfit,
      cycle_end_date: cycle.closedAt
    })
    .eq("id", cycle.id);
  if (error) throw new Error(error.message);
};

export const saveInternalUse = async (entry) => {
  const { data, error } = await supabase
    .from("internal_fuel_use")
    .insert({
      station_id: entry.stationId,
      product_id: entry.productId,
      date: entry.date,
      use_date: entry.date,
      liters: entry.liters,
      reason: entry.reason
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapInternalUse(data);
};

export const savePumpReading = async (reading) => {
  const { data, error } = await supabase
    .from("pump_meter_readings")
    .insert({
      station_id: reading.stationId,
      product_id: reading.productId,
      date: reading.date,
      reading_date: reading.date,
      opening_reading: reading.openingReading,
      closing_reading: reading.closingReading,
      opening_meter_liters: reading.openingReading,
      closing_meter_liters: reading.closingReading,
      dispensed_liters: reading.dispensedLiters
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPumpReading(data);
};

export const saveExpense = async (expense) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      station_id: uuid(expense.stationId),
      date: expense.date,
      shift: expense.shift || 'day',
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      payment_method: expense.paymentMethod || 'cash',
      debt_id: uuid(expense.debtId)
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapExpense(data);
};

export const saveDebt = async (debt) => {
  const { data, error } = await supabase
    .from('debts')
    .insert({
      station_id: uuid(debt.stationId),
      debtor_name: debt.debtorName,
      description: debt.description,
      total_amount: debt.totalAmount,
      settled_amount: debt.settledAmount || 0,
      outstanding_amount: debt.outstandingAmount || debt.totalAmount,
      status: debt.status || 'open',
      opened_at: debt.openedAt || new Date().toISOString(),
      notes: debt.notes || ''
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDebt(data);
};

export const updateDebt = async (debt) => {
  const { error } = await supabase
    .from('debts')
    .update({
      settled_amount: debt.settledAmount,
      outstanding_amount: debt.outstandingAmount,
      status: debt.status,
      closed_at: debt.closedAt || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', debt.id);
  if (error) throw new Error(error.message);
};

export const saveDebtPayment = async (payment) => {
  const { data, error } = await supabase
    .from('debt_payments')
    .insert({
      debt_id: payment.debtId,
      station_id: uuid(payment.stationId),
      amount: payment.amount,
      settled_at: payment.settledAt,
      note: payment.note || ''
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDebtPayment(data);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const loadState = async () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured — falling back to seed state.");
    return createSeedState();
  }
  return loadFromSupabase();
};

export const withState = async (handler) => {
  const state = await loadState();
  const changed = new Set();

  const proxy = new Proxy(state, {
    get(target, prop) {
      const value = target[prop];
      if (Array.isArray(value)) {
        return new Proxy(value, {
          get(arr, arrProp) {
            if (arrProp === "push") {
              return (...items) => {
                changed.add(prop);
                return arr.push(...items);
              };
            }
            const v = arr[arrProp];
            return typeof v === "function" ? v.bind(arr) : v;
          }
        });
      }
      return value;
    }
  });

  const result = await handler(proxy);

  const lastOf = (arr) => arr[arr.length - 1];

  if (changed.has("stations")) await saveStation(lastOf(state.stations));
  if (changed.has("lorries")) await saveLorry(lastOf(state.lorries));
  if (changed.has("depotTrips")) await saveDepotTrip(lastOf(state.depotTrips));

  if (changed.has("dailyDeposits")) {
    const newDeposits = state.dailyDeposits.slice(-result.length || -1);
    for (const d of Array.isArray(result) ? newDeposits : [lastOf(state.dailyDeposits)]) {
      await saveDeposit(d);
    }
  }

  if (changed.has("cycles")) {
    const newCycle = lastOf(state.cycles);
    console.log("[withState] newCycle:", JSON.stringify(newCycle));

    // domain.js mutates the previously-active cycle in place (closeCycle sets
    // closedAt = deliveredAt, which becomes newCycle.openedAt). The Proxy only
    // tracks .push(), not property mutations, so match by timestamp.
    // uuid() guard ensures we never call updateCycle on a seed/local row.
    const mutatedCycles = state.cycles.filter(
      (c) =>
        c.id !== newCycle.id &&
        c.status === "closed" &&
        c.closedAt === newCycle.openedAt &&
        uuid(c.id) !== null
    );
    console.log("[withState] cycles to update:", mutatedCycles.map((c) => c.id));
    for (const c of mutatedCycles) await updateCycle(c);

    await saveCycle(newCycle);
  }

  if (changed.has("internalFuelUses")) await saveInternalUse(lastOf(state.internalFuelUses));
  if (changed.has("pumpMeterReadings")) await savePumpReading(lastOf(state.pumpMeterReadings));
  if (changed.has("expenses")) await saveExpense(lastOf(state.expenses));
  if (changed.has("debts")) {
    // issueDebt may push a new debt OR mutate an existing one
    // We save the last pushed one; mutations are handled via updateDebt in settleDebt path
    await saveDebt(lastOf(state.debts));
  }
  if (changed.has("debtPayments")) {
    // settleDebt pushes a payment and mutates the debt object
    const payment = lastOf(state.debtPayments);
    await saveDebtPayment(payment);
    // Also update the mutated debt in Supabase
    const debt = (state.debts || []).find((d) => d.id === payment.debtId);
    if (debt && uuid(debt.id)) await updateDebt(debt);
  }

  return result;
};

// saveState is now a no-op — Supabase is the store
export const saveState = async () => {};
