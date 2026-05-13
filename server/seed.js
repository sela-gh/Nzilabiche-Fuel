export const createSeedState = () => {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetDays, hour = 8) => {
    const date = new Date(now.getTime() + offsetDays * day);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  return {
    stations: [
      {
        id: "station-001",
        name: "Lusaka East Station",
        location: "Lusaka",
        tankCapacityLiters: 40000,
        lowStockThresholdLiters: 7000
      },
      {
        id: "station-002",
        name: "Kabwe Road Station",
        location: "Kabwe Road",
        tankCapacityLiters: 32000,
        lowStockThresholdLiters: 5500
      },
      {
        id: "station-003",
        name: "Ndola Depot Outlet",
        location: "Ndola",
        tankCapacityLiters: 36000,
        lowStockThresholdLiters: 6000
      }
    ],
    lorries: [
      {
        id: "lorry-001",
        plateNumber: "ALB 2045",
        driverName: "M. Banda",
        capacityLiters: 30000,
        notes: "Primary delivery lorry"
      }
    ],
    products: [
      { id: "product-petrol", name: "Petrol", unit: "L" },
      { id: "product-diesel", name: "Diesel", unit: "L" },
      { id: "product-kerosene", name: "Kerosene", unit: "L" }
    ],
    priceHistory: [
      {
        id: "price-001",
        stationId: "station-001",
        productId: "product-petrol",
        pricePerLiter: 3000,
        effectiveAt: iso(-12)
      },
      {
        id: "price-002",
        stationId: "station-002",
        productId: "product-petrol",
        pricePerLiter: 3000,
        effectiveAt: iso(-12)
      },
      {
        id: "price-003",
        stationId: "station-003",
        productId: "product-diesel",
        pricePerLiter: 2850,
        effectiveAt: iso(-12)
      }
    ],
    depotTrips: [
      {
        id: "trip-001",
        supplier: "Central Fuel Supply",
        invoiceNumber: "INV-2401",
        lorryId: "lorry-001",
        productId: "product-petrol",
        litersPurchased: 28000,
        totalPurchaseCost: 68600000,
        costPerLiter: 2450,
        purchasedAt: iso(-9)
      },
      {
        id: "trip-002",
        supplier: "Northline Energy",
        invoiceNumber: "INV-8842",
        lorryId: "lorry-001",
        productId: "product-diesel",
        litersPurchased: 24000,
        totalPurchaseCost: 56400000,
        costPerLiter: 2350,
        purchasedAt: iso(-8)
      }
    ],
    cycles: [
      {
        id: "cycle-001",
        stationId: "station-001",
        productId: "product-petrol",
        depotTripId: "trip-001",
        status: "active",
        openedAt: iso(-7),
        closedAt: null,
        closeReason: null,
        openingStockLiters: 22200,
        deliveryLiters: 16000,
        blendedCostPerLiter: 2425,
        expectedClosingStockLiters: null,
        actualDipstickLiters: null,
        varianceLiters: null,
        revenue: 0,
        estimatedCogs: 0,
        grossProfit: 0
      },
      {
        id: "cycle-002",
        stationId: "station-002",
        productId: "product-petrol",
        depotTripId: "trip-001",
        status: "active",
        openedAt: iso(-6),
        closedAt: null,
        closeReason: null,
        openingStockLiters: 16800,
        deliveryLiters: 12000,
        blendedCostPerLiter: 2440,
        expectedClosingStockLiters: null,
        actualDipstickLiters: null,
        varianceLiters: null,
        revenue: 0,
        estimatedCogs: 0,
        grossProfit: 0
      },
      {
        id: "cycle-003",
        stationId: "station-003",
        productId: "product-diesel",
        depotTripId: "trip-002",
        status: "active",
        openedAt: iso(-6),
        closedAt: null,
        closeReason: null,
        openingStockLiters: 19400,
        deliveryLiters: 14000,
        blendedCostPerLiter: 2325,
        expectedClosingStockLiters: null,
        actualDipstickLiters: null,
        varianceLiters: null,
        revenue: 0,
        estimatedCogs: 0,
        grossProfit: 0
      }
    ],
    dailyDeposits: [
      {
        id: "deposit-001",
        stationId: "station-001",
        productId: "product-petrol",
        date: iso(-5, 18),
        cashDeposited: 9000000,
        pumpPrice: 3000,
        estimatedLitersSold: 3000
      },
      {
        id: "deposit-002",
        stationId: "station-001",
        productId: "product-petrol",
        date: iso(-4, 18),
        cashDeposited: 8160000,
        pumpPrice: 3000,
        estimatedLitersSold: 2720
      },
      {
        id: "deposit-003",
        stationId: "station-002",
        productId: "product-petrol",
        date: iso(-3, 18),
        cashDeposited: 6900000,
        pumpPrice: 3000,
        estimatedLitersSold: 2300
      },
      {
        id: "deposit-004",
        stationId: "station-003",
        productId: "product-diesel",
        date: iso(-3, 18),
        cashDeposited: 7695000,
        pumpPrice: 2850,
        estimatedLitersSold: 2700
      }
    ],
    internalFuelUses: [
      {
        id: "internal-001",
        stationId: "station-001",
        productId: "product-petrol",
        date: iso(-3, 12),
        liters: 45,
        reason: "Generator fuel"
      }
    ],
    pumpMeterReadings: [],
    auditLogs: []
  };
};
