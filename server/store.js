import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSeedState } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "app-state.json");

let state;

const migrateState = (currentState) => {
  const seed = createSeedState();

  currentState.stations ||= seed.stations;
  currentState.products ||= seed.products;
  currentState.lorries ||= seed.lorries;
  currentState.depotTrips ||= [];
  currentState.cycles ||= [];
  currentState.dailyDeposits ||= [];
  currentState.dailyDeposits = currentState.dailyDeposits.filter(
    (deposit) => Number(deposit.cashDeposited || 0) > 0
  );
  currentState.internalFuelUses ||= [];
  currentState.pumpMeterReadings ||= [];
  currentState.auditLogs ||= [];

  for (const trip of currentState.depotTrips) {
    trip.lorryId ||= "";
  }

  if (currentState.settings?.currency !== "TZS") {
    currentState.settings = {
      currency: "TZS",
      locale: "en-TZ",
      timeZone: "Africa/Dar_es_Salaam"
    };

    const seedById = (items) => new Map(items.map((item) => [item.id, item]));

    for (const item of currentState.priceHistory) {
      Object.assign(item, seedById(seed.priceHistory).get(item.id) || {});
    }

    for (const item of currentState.depotTrips) {
      Object.assign(item, seedById(seed.depotTrips).get(item.id) || {});
    }

    for (const item of currentState.cycles) {
      const seedCycle = seedById(seed.cycles).get(item.id);
      if (seedCycle && item.status === seedCycle.status) {
        item.blendedCostPerLiter = seedCycle.blendedCostPerLiter;
      }
    }

    for (const item of currentState.dailyDeposits) {
      Object.assign(item, seedById(seed.dailyDeposits).get(item.id) || {});
    }
  }

  return currentState;
};

export const loadState = async () => {
  if (state) {
    return state;
  }

  try {
    const contents = await readFile(dataFile, "utf8");
    state = migrateState(JSON.parse(contents));
    await saveState();
  } catch {
    state = migrateState(createSeedState());
    await saveState();
  }

  return state;
};

export const saveState = async () => {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
};

export const withState = async (handler) => {
  const currentState = await loadState();
  const result = await handler(currentState);
  await saveState();
  return result;
};
