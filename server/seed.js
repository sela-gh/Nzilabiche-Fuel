export const createSeedState = () => ({
  stations: [],
  lorries: [],
  products: [
    { id: "product-petrol", name: "Petrol", unit: "L" },
    { id: "product-diesel", name: "Diesel", unit: "L" },
    { id: "product-kerosene", name: "Kerosene", unit: "L" }
  ],
  priceHistory: [],
  depotTrips: [],
  cycles: [],
  dailyDeposits: [],
  productSales: [],
  expenses: [],
  debts: [],
  debtPayments: [],
  pumpTankLinks: [],
  internalFuelUses: [],
  pumpMeterReadings: [],
  auditLogs: []
});
