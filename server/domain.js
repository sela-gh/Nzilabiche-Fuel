// AFTER
const round = (value, places = 10) => Number(Number(value || 0).toFixed(places));
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const between = (date, start, end) => {
  const value = new Date(date).getTime();
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;
  return value >= from && value <= to;
};

export const getActiveCycle = (state, stationId, productId) =>
  state.cycles.find(
    (cycle) =>
      cycle.stationId === stationId &&
      cycle.productId === productId &&
      cycle.status === "active"
  );

export const calculateCycleSnapshot = (state, cycle, closingAt = new Date().toISOString()) => {
  const deposits = state.dailyDeposits.filter(
    (deposit) =>
      deposit.stationId === cycle.stationId &&
      deposit.productId === cycle.productId &&
      between(deposit.date, cycle.openedAt, closingAt)
  );

  const internalUses = state.internalFuelUses.filter(
    (entry) =>
      entry.stationId === cycle.stationId &&
      entry.productId === cycle.productId &&
      between(entry.date, cycle.openedAt, closingAt)
  );

  const estimatedLitersSold = deposits.reduce(
    (sum, deposit) => sum + Number(deposit.estimatedLitersSold || 0),
    0
  );
  const revenue = deposits.reduce((sum, deposit) => sum + Number(deposit.cashDeposited || 0), 0);
  const internalLiters = internalUses.reduce((sum, entry) => sum + Number(entry.liters || 0), 0);
  const expectedClosingStockLiters =
    Number(cycle.openingStockLiters || 0) -
    estimatedLitersSold -
    internalLiters;
  const estimatedCogs = estimatedLitersSold * Number(cycle.blendedCostPerLiter || 0);

  return {
    estimatedLitersSold: round(estimatedLitersSold),
    revenue: round(revenue),
    internalLiters: round(internalLiters),
    expectedClosingStockLiters: round(expectedClosingStockLiters),
    estimatedCogs: round(estimatedCogs),
    grossProfit: round(revenue - estimatedCogs)
  };
};

export const closeCycle = (state, cycle, actualDipstickLiters, closingAt, closeReason) => {
  const snapshot = calculateCycleSnapshot(state, cycle, closingAt);
  cycle.status = "closed";
  cycle.closedAt = closingAt;
  cycle.closeReason = closeReason;
  cycle.expectedClosingStockLiters = snapshot.expectedClosingStockLiters;
  cycle.actualDipstickLiters = round(actualDipstickLiters);
  cycle.varianceLiters = round(Number(actualDipstickLiters) - snapshot.expectedClosingStockLiters);
  cycle.revenue = snapshot.revenue;
  cycle.estimatedCogs = snapshot.estimatedCogs;
  cycle.grossProfit = snapshot.grossProfit;
  return cycle;
};

export const createStation = (state, payload) => {
  if (!payload.name || !payload.location) {
    throw new Error("Station name and location are required.");
  }

  if (Number(payload.tankCapacityLiters) <= 0) {
    throw new Error("Tank capacity must be greater than zero.");
  }

  const station = {
    id: id("station"),
    name: payload.name,
    location: payload.location,
    tankCapacityLiters: round(payload.tankCapacityLiters),
    lowStockThresholdLiters: round(payload.lowStockThresholdLiters || 0)
  };

  state.stations.push(station);
  state.auditLogs.push({
    id: id("audit"),
    entity: "Petrol_Stations",
    entityId: station.id,
    action: "created",
    timestamp: new Date().toISOString(),
    reason: "Station added"
  });

  return station;
};

export const createLorry = (state, payload) => {
  if (!payload.plateNumber) {
    throw new Error("Lorry plate number is required.");
  }

  if (Number(payload.capacityLiters) <= 0) {
    throw new Error("Lorry capacity must be greater than zero.");
  }

  const lorry = {
    id: id("lorry"),
    plateNumber: payload.plateNumber,
    driverName: payload.driverName || "",
    capacityLiters: round(payload.capacityLiters),
    notes: payload.notes || ""
  };

  state.lorries.push(lorry);
  state.auditLogs.push({
    id: id("audit"),
    entity: "Lorries",
    entityId: lorry.id,
    action: "created",
    timestamp: new Date().toISOString(),
    reason: "Lorry added"
  });

  return lorry;
};

export const createDepotTrip = (state, payload) => {
  const litersPurchased = Number(payload.litersPurchased);
  const totalPurchaseCost = Number(payload.totalPurchaseCost);

  if (!payload.supplier || !payload.invoiceNumber || !payload.productId) {
    throw new Error("Supplier, invoice, and product are required.");
  }

  if (litersPurchased <= 0 || totalPurchaseCost <= 0) {
    throw new Error("Purchased liters and total purchase cost must be greater than zero.");
  }

  const depotTrip = {
    id: id("trip"),
    supplier: payload.supplier,
    invoiceNumber: payload.invoiceNumber,
    lorryId: payload.lorryId || "",
    productId: payload.productId,
    litersPurchased: round(litersPurchased),
    totalPurchaseCost: round(totalPurchaseCost),
    costPerLiter: round(totalPurchaseCost / litersPurchased, 4),
    purchasedAt: payload.purchasedAt || new Date().toISOString()
  };

  state.depotTrips.push(depotTrip);
  state.auditLogs.push({
    id: id("audit"),
    entity: "Depot_Trips",
    entityId: depotTrip.id,
    action: "created",
    timestamp: new Date().toISOString(),
    reason: "Depot purchase recorded"
  });

  return depotTrip;
};

export const createDeposit = (state, payload) => {
  const cashDeposited = Number(payload.cashDeposited);
  const pumpPrice = Number(payload.pumpPrice);

  if (!payload.stationId || !payload.productId) {
    throw new Error("Station and product are required.");
  }

  if (cashDeposited < 0 || pumpPrice <= 0) {
    throw new Error("Cash deposited cannot be negative and pump price must be greater than zero.");
  }

  const deposit = {
    id: id("deposit"),
    stationId: payload.stationId,
    productId: payload.productId,
    date: payload.date || new Date().toISOString(),
    shift: payload.shift || "day",                 // Added: Captures shift
    paymentMethod: payload.paymentMethod || "cash", // Added: Captures payment method
    cashDeposited: round(cashDeposited),
    pumpPrice: round(pumpPrice),
    estimatedLitersSold: round(cashDeposited / pumpPrice)
  };

  state.dailyDeposits.push(deposit);
  state.auditLogs.push({
    id: id("audit"),
    entity: "Daily_Deposits",
    entityId: deposit.id,
    action: "created",
    timestamp: new Date().toISOString(),
    reason: "Cash deposit entered"
  });

  return deposit;
};

export const createDepositSettlement = (state, payload) => {
  if (!payload.stationId || !payload.date) {
    throw new Error("Station and date are required.");
  }

  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const enteredLines = lines.filter((line) => Number(line.cashDeposited || 0) > 0);

  if (!enteredLines.length) {
    throw new Error("Enter cash for at least one product.");
  }

  return enteredLines.map((line) =>
    createDeposit(state, {
      stationId: payload.stationId,
      productId: line.productId,
      date: payload.date,
      shift: payload.shift || "day",                 // Pass through shift
      paymentMethod: payload.paymentMethod || "cash", // Pass through payment method
      cashDeposited: line.cashDeposited,
      pumpPrice: line.pumpPrice
    })
  );
};

export const recordInternalFuelUse = (state, payload) => {
  if (Number(payload.liters) <= 0) {
    throw new Error("Internal fuel use must be greater than zero liters.");
  }

  const entry = {
    id: id("internal"),
    stationId: payload.stationId,
    productId: payload.productId,
    date: payload.date || new Date().toISOString(),
    shift: payload.shift || "day",
    liters: round(payload.liters),
    reason: payload.reason
  };

  state.internalFuelUses.push(entry);
  return entry;
};

export const recordPumpMeterReading = (state, payload) => {
  const openingReading = Number(payload.openingReading);
  const closingReading = Number(payload.closingReading);

  if (closingReading < openingReading) {
    throw new Error("Closing meter reading cannot be lower than opening meter reading.");
  }

  const reading = {
    id: id("pump"),
    stationId: payload.stationId,
    productId: payload.productId,
    date: payload.date || new Date().toISOString(),
    shift: payload.shift || "day",
    openingReading: round(openingReading),
    closingReading: round(closingReading),
    dispensedLiters: round(closingReading - openingReading)
  };

  state.pumpMeterReadings.push(reading);
  return reading;
};

export const createExpense = (state, payload) => {
  const amount = Number(payload.amount);

  if (!payload.stationId || !payload.category || !payload.description) {
    throw new Error("Station, category, and description are required for expenses.");
  }

  if (amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  const expense = {
    id: id("expense"),
    stationId: payload.stationId,
    date: payload.date || new Date().toISOString(),
    shift: payload.shift || "day",
    category: payload.category,
    description: payload.description,
    amount: round(amount),
    paymentMethod: payload.paymentMethod || "cash",
    createdAt: new Date().toISOString()
  };

  state.expenses.push(expense);
  
  state.auditLogs.push({
    id: id("audit"),
    entity: "Expenses",
    entityId: expense.id,
    action: "created",
    timestamp: expense.createdAt,
    reason: `Expense recorded: ${expense.category}`
  });

  return expense;
};



export const issueDebt = (state, payload) => {
  const amount = Number(payload.amount);
  if (!payload.stationId) throw new Error("Station is required.");
  if (!payload.debtorName?.trim()) throw new Error("Debtor name is required.");
  if (!payload.description?.trim()) throw new Error("Description is required.");
  if (amount <= 0) throw new Error("Debt amount must be greater than zero.");

  const issuedAt = payload.date || new Date().toISOString();
  const debtorKey = payload.debtorName.trim().toLowerCase();

  // Find existing open debt for this debtor at this station
  const existing = state.debts
    ? state.debts.find(
        (d) =>
          d.status === "open" &&
          d.stationId === payload.stationId &&
          d.debtorName.toLowerCase() === debtorKey
      )
    : null;

  let debt;
  if (existing) {
    existing.totalAmount = round(existing.totalAmount + amount);
    existing.outstandingAmount = round(existing.outstandingAmount + amount);
    existing.lastActivityAt = issuedAt;
    debt = existing;
  } else {
    debt = {
      id: id("debt"),
      stationId: payload.stationId,
      debtorName: payload.debtorName.trim(),
      description: payload.description.trim(),
      totalAmount: round(amount),
      settledAmount: 0,
      outstandingAmount: round(amount),
      status: "open",
      openedAt: issuedAt,
      lastActivityAt: issuedAt,
      shift: payload.shift || "day",
      paymentMethod: payload.paymentMethod || "cash",
      closedAt: null,
      notes: ""
    };
    if (!state.debts) state.debts = [];
    state.debts.push(debt);
  }

  // Also record as an expense
  const expense = {
    id: id("expense"),
    stationId: payload.stationId,
    date: issuedAt,
    shift: payload.shift || "day",
    category: "Debt",
    description: "Debt to " + payload.debtorName.trim() + ": " + payload.description.trim(),
    amount: round(amount),
    paymentMethod: payload.paymentMethod || "cash",
    debtId: debt.id,
    createdAt: new Date().toISOString()
  };
  state.expenses.push(expense);

  return { debtId: debt.id, debt, expense };
};

export const settleDebt = (state, payload) => {
  const amount = Number(payload.amount);
  if (!payload.debtId) throw new Error("Debt ID is required.");
  if (amount <= 0) throw new Error("Settlement amount must be greater than zero.");

  const debt = (state.debts || []).find((d) => d.id === payload.debtId);
  if (!debt) throw new Error("Debt not found.");
  if (amount > debt.outstandingAmount) {
    throw new Error("Settlement cannot exceed the outstanding balance.");
  }

  const settledAt = payload.settledAt || new Date().toISOString();
  const remaining = round(Math.max(0, debt.outstandingAmount - amount));

  debt.settledAmount = round(debt.settledAmount + amount);
  debt.outstandingAmount = remaining;
  debt.status = remaining === 0 ? "settled" : "open";
  debt.closedAt = remaining === 0 ? settledAt : null;
  debt.lastActivityAt = settledAt;

  const payment = {
    id: id("debt-payment"),
    debtId: debt.id,
    stationId: debt.stationId,
    amount: round(amount),
    settledAt,
    paymentMethod: payload.paymentMethod || "cash",
    note: payload.note || ""
  };
  if (!state.debtPayments) state.debtPayments = [];
  state.debtPayments.push(payment);

  return { debt, payment, remaining };
};

export const recordDelivery = (state, payload) => {
  const deliveredAt = payload.deliveredAt || new Date().toISOString();
  const activeCycle = getActiveCycle(state, payload.stationId, payload.productId);
  const depotTrip = state.depotTrips.find((trip) => trip.id === payload.depotTripId);
  const deliveryLiters = Number(payload.litersDelivered);

  if (!depotTrip) {
    throw new Error("Depot trip not found.");
  }

  if (deliveryLiters <= 0 || Number(payload.preDeliveryDipstickLiters) < 0) {
    throw new Error("Delivery liters must be greater than zero and closure dipstick cannot be negative.");
  }

  let previousCycle = null;
  // Always capture the dipstick reading, even if this is the first delivery
  let oldLiters = Number(payload.preDeliveryDipstickLiters || 0); 
  let oldCost = depotTrip.costPerLiter;

  if (activeCycle) {
    previousCycle = closeCycle(
      state,
      activeCycle,
      oldLiters, // Use the variable you just set above
      deliveredAt,
      "delivery"
    );
    oldCost = Number(activeCycle.blendedCostPerLiter);
  }

  const totalLiters = oldLiters + deliveryLiters;
  const blendedCostPerLiter =
    totalLiters > 0
      ? (oldLiters * oldCost + deliveryLiters * depotTrip.costPerLiter) / totalLiters
      : depotTrip.costPerLiter;

  const newCycle = {
    id: id("cycle"),
    stationId: payload.stationId,
    productId: payload.productId,
    depotTripId: payload.depotTripId,
    status: "active",
    openedAt: deliveredAt,
    closedAt: null,
    closeReason: null,
    openingStockLiters: round(totalLiters),
    deliveryLiters: round(deliveryLiters),
    blendedCostPerLiter: round(blendedCostPerLiter, 4),
    expectedClosingStockLiters: null,
    actualDipstickLiters: null,
    varianceLiters: null,
    revenue: 0,
    estimatedCogs: 0,
    grossProfit: 0
  };

  state.cycles.push(newCycle);
  state.auditLogs.push({
    id: id("audit"),
    entity: "Delivery_Cycles",
    entityId: newCycle.id,
    action: "delivery_recorded",
    timestamp: new Date().toISOString(),
    reason: "Delivery closed previous cycle and opened new cycle"
  });

  return { previousCycle, newCycle };
};

export const closeMonth = (state, payload) => {
  const closedAt = payload.closedAt || new Date().toISOString();
  const activeCycle = getActiveCycle(state, payload.stationId, payload.productId);

  if (!activeCycle) {
    throw new Error("No active cycle found.");
  }

  if (Number(payload.finalDipstickLiters) < 0) {
    throw new Error("Final dipstick cannot be negative.");
  }

  const closedCycle = closeCycle(
    state,
    activeCycle,
    Number(payload.finalDipstickLiters),
    closedAt,
    "month-end"
  );

  const rolloverCycle = {
    id: id("cycle"),
    stationId: activeCycle.stationId,
    productId: activeCycle.productId,
    depotTripId: activeCycle.depotTripId,
    status: "active",
    openedAt: closedAt,
    closedAt: null,
    closeReason: null,
    openingStockLiters: round(payload.finalDipstickLiters),
    deliveryLiters: 0,
    blendedCostPerLiter: activeCycle.blendedCostPerLiter,
    expectedClosingStockLiters: null,
    actualDipstickLiters: null,
    varianceLiters: null,
    revenue: 0,
    estimatedCogs: 0,
    grossProfit: 0
  };

  state.cycles.push(rolloverCycle);
  return { closedCycle, rolloverCycle };
};

export const getDashboard = (state) => {
  const activeCycles = state.cycles.filter((cycle) => cycle.status === "active");
  const cycleCards = activeCycles.map((cycle) => {
    const station = state.stations.find((item) => item.id === cycle.stationId);
    const product = state.products.find((item) => item.id === cycle.productId);
    const snapshot = calculateCycleSnapshot(state, cycle);
    const stockPercent = station
      ? Math.max(0, Math.min(100, (snapshot.expectedClosingStockLiters / station.tankCapacityLiters) * 100))
      : 0;

    return {
      ...cycle,
      stationName: station?.name,
      productName: product?.name,
      tankCapacityLiters: station?.tankCapacityLiters,
      lowStockThresholdLiters: station?.lowStockThresholdLiters,
      stockPercent: round(stockPercent),
      snapshot
    };
  });

  // 1. ACTIVE CYCLE TOTALS (For the current shift/tank status)
  const activeTotals = cycleCards.reduce(
    (acc, cycle) => {
      acc.cashCollected += cycle.snapshot.revenue;
      acc.fuelSold += cycle.snapshot.estimatedLitersSold;
      acc.expectedStock += cycle.snapshot.expectedClosingStockLiters;
      acc.grossProfit += cycle.snapshot.grossProfit;
      return acc;
    },
    { cashCollected: 0, fuelSold: 0, expectedStock: 0, grossProfit: 0 }
  );

  // 2. TRUE P&L CALCULATION (All-Time Summary)
  // Get Gross Profit from ALL cycles (Closed + Active)
  const closedGrossProfit = state.cycles
    .filter((c) => c.status === "closed")
    .reduce((sum, c) => sum + Number(c.grossProfit || 0), 0);
    
  const totalGrossProfit = closedGrossProfit + activeTotals.grossProfit;

  // Separate operating expenses from debt. Debt only affects the profit
  // position while it is still outstanding; settled debt is cash recovered.
  const expenses = state.expenses || [];
  const debts = state.debts || [];
  const operatingExpenses = expenses
    .filter((e) => e.category !== "Debt")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
  const debtDisbursements = expenses
    .filter((e) => e.category === "Debt")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const outstandingDebt = debts.reduce((sum, debt) => sum + Number(debt.outstandingAmount || 0), 0);
  const settledDebt = debts.reduce((sum, debt) => sum + Number(debt.settledAmount || 0), 0);
  const profitImpactExpenses = operatingExpenses + outstandingDebt;

  // Calculate True Net Profit
  const netProfit = totalGrossProfit - profitImpactExpenses;

  return {
    totals: {
      cashCollected: round(activeTotals.cashCollected),
      fuelSold: round(activeTotals.fuelSold),
      expectedStock: round(activeTotals.expectedStock),
      grossProfit: round(activeTotals.grossProfit) 
    },
    financialSummary: {
      totalGrossProfit: round(totalGrossProfit),
      totalOperatingExpenses: round(operatingExpenses),
      totalDebtDisbursements: round(debtDisbursements),
      totalDebtOutstanding: round(outstandingDebt),
      totalDebtSettled: round(settledDebt),
      totalExpenses: round(profitImpactExpenses),
      netProfit: round(netProfit)
    },
    cycleCards,
    varianceAlerts: state.cycles
      .filter((cycle) => cycle.status === "closed" && Math.abs(Number(cycle.varianceLiters || 0)) > 100)
      .slice(-8)
      .reverse(),
    recentDeposits: [...state.dailyDeposits].slice(-8).reverse(),
    recentTrips: [...state.depotTrips].slice(-6).reverse()
  };
};

export const getBootstrap = (state) => ({
  stations: state.stations,
  lorries: state.lorries,
  products: state.products,
  depotTrips: state.depotTrips,
  cycles: state.cycles,
  dailyDeposits: state.dailyDeposits,
  internalFuelUses: state.internalFuelUses,
  pumpMeterReadings: state.pumpMeterReadings,
  auditLogs: state.auditLogs,
  expenses: state.expenses || [],
  debts: state.debts || [],
  dashboard: getDashboard(state)
});
