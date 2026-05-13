# Centralized Multi-Station Fuel Financial Tracker

## 1. Project Overview

We are building a centralized fuel station financial reconciliation and inventory accountability system designed for independent petrol station management.

The system is not a POS system and not a live forecourt automation platform.

Instead, it is a:

- management reconciliation system
- fuel accountability platform
- cycle-based inventory tracker
- variance/theft detection engine
- financial reporting dashboard

The system is intended for:

- one owner/admin
- multiple petrol stations
- remote operational oversight
- cash-only fuel sales environments

Attendants will not have accounts.

They simply communicate operational figures to management, and management enters the verified numbers into the system.

## 2. Core Operational Philosophy

The system works using event-based fuel cycles.

A fuel cycle begins immediately after a delivery is completed.

A fuel cycle ends:

- the moment the next delivery arrives
- during forced month-end closure

This avoids the complexity and unreliability of continuous live inventory tracking.

## 3. Core Business Logic

### A. Fuel Purchasing Logic

Fuel purchasing and fuel delivery are treated as separate events.

### Depot Trip

Represents:

- supplier
- invoice
- quantity purchased
- total purchase cost

The backend calculates:

```text
Cost Per Liter = Total Purchase Cost / Total Liters Purchased
```

This creates the official inventory valuation cost.

### B. Fuel Delivery Logic

When fuel reaches a station, management enters:

- station
- liters delivered
- linked depot trip
- delivery timestamp
- actual dipstick reading before the previous cycle closes

The backend:

- closes the previous cycle
- computes variance
- opens the new cycle automatically

No dipstick reading is required at the beginning of a new cycle because opening inventory is mathematically derived from:

```text
Remaining fuel from previous cycle + newly delivered fuel
```

## 4. Inventory Mathematics

### Fuel Sales Estimation

Since the station operates cash-only:

```text
Liters Sold = Total Cash Deposited / Active Pump Price
```

This allows the system to estimate:

- liters sold
- expected remaining fuel
- gross revenue
- expected profit

without direct POS integration.

## 5. Moving Average Cost

If old fuel remains in the tank when new fuel arrives, the backend computes weighted average cost:

```text
Blended Cost =
((Old Liters x Old Cost) + (New Liters x New Cost)) / Total Liters
```

This ensures:

- accurate fuel valuation
- realistic gross profit
- proper inventory costing

## 6. Variance Detection Logic

At cycle closure, the backend compares:

```text
Expected Remaining Fuel
vs
Actual Dipstick Reading
```

The difference becomes the variance.

Variance may indicate:

- theft
- leakage
- calibration errors
- delivery shortages
- internal fuel use
- evaporation

## 7. Delivery Verification Logic

The system can also detect delivery shortages.

Example:

```text
Fuel Before Delivery + Delivered Liters = Expected Tank Level
```

This is compared against actual dipstick reading after delivery settlement.

This exposes:

- supplier shortages
- siphoning during delivery handling
- inaccurate delivery quantities
- tank calibration issues

## 8. Pump Meter Integration

If fuel pumps support cumulative shift readings, management may enter:

- opening pump meter reading
- closing pump meter reading

The backend calculates:

```text
Pump Dispensed Liters = Closing Pump Meter Reading - Opening Pump Meter Reading
```

This becomes an additional reconciliation layer against:

- cash deposits
- dipstick calculations

This feature is optional because some pumps may not support shift-based readings.

## 9. Internal Fuel Usage

The system will support recording:

- generator fuel
- company vehicle fuel
- testing/calibration fuel

Without this feature, internal usage would incorrectly appear as theft or variance.

## 10. Month-End Closure Logic

At month end, management enters final dipstick reading and the active cycle is force-split.

The backend:

- closes the current accounting period
- rolls remaining inventory forward
- preserves weighted average cost

This generates:

- clean monthly profit/loss reports
- calendar-aligned accounting

No new opening dipstick reading is required after rollover because carried-forward inventory is mathematically known.

## 11. Database Structure

The database will use Supabase.

### Core Tables

### Petrol_Stations

Stores:

- station information
- location
- tank capacities

### Fuel_Products

Stores:

- petrol
- diesel
- kerosene

### Depot_Trips

Stores:

- supplier
- invoice
- liters purchased
- total purchase cost
- computed cost per liter

### Delivery_Cycles

Stores:

- cycle opening stock
- delivery liters
- blended cost
- expected closing stock
- actual dipstick reading at closure
- variance
- profit calculations

### Daily_Deposits

Stores:

- cash deposited
- active pump price
- estimated liters sold
- shift timestamps

### Fuel_Price_History

Stores:

- pump price
- effective timestamps

Supports:

- mid-day price changes
- historical pricing

### Internal_Fuel_Use

Stores:

- liters consumed internally
- reason
- station
- date

### Pump_Meter_Readings

Optional table.

Stores:

- opening reading
- closing reading
- dispensed liters

### Audit_Logs

Stores:

- old values
- new values
- editor
- timestamps
- edit reason

Critical for accountability.

## 12. Frontend Dashboard Layout

The frontend will be built with React.

### A. Main Dashboard

Displays:

- total cash collected
- total fuel sold
- station performance
- current tank stock
- active fuel prices
- variance alerts
- low-stock alerts

### B. Daily Deposit Entry Page

Management enters:

- station
- date
- cash deposited
- active pump price

System auto-calculates:

- liters sold

### C. Delivery Entry Page

Management enters:

- station
- liters delivered
- linked depot trip
- actual dipstick reading before previous cycle closure

System:

- closes old cycle
- computes variance
- opens new cycle automatically

### D. Depot Trip Page

Management enters:

- supplier
- invoice
- liters bought
- purchase cost

Backend computes:

- cost per liter

### E. Variance Dashboard

Displays:

- shortages
- unexplained losses
- suspicious stations
- delivery discrepancies

### F. Profit & Loss Reports

Displays:

- revenue
- estimated COGS
- gross profit
- variance impact
- per-station profitability

## 13. Security & Data Integrity

The backend must enforce:

### Immutable Historical Cycles

Closed cycles cannot be recalculated dynamically.

### Audit Logging

Every edit is tracked.

### Locked Accounting Periods

Closed months become read-only.

### Transactional Integrity

Critical calculations must execute atomically.

## 14. Development Roadmap

### Sprint 1 - Supabase Database Schema

Build:

- normalized tables
- foreign keys
- constraints
- indexes

This is the foundation.

### Sprint 2 - Backend Engine

Implement:

- cycle closure logic
- blended cost calculations
- variance calculations
- month-end rollover

This is the hardest and most important layer.

### Sprint 3 - React Frontend Dashboard

Build:

- dashboards
- forms
- reports
- charts
- alerts

Frontend should only consume backend-calculated data.

Never perform critical accounting math in the frontend.

## 15. Final System Identity

This system is effectively:

- a fuel inventory reconciliation engine
- a remote station management platform
- a financial accountability system
- a variance/theft monitoring platform
- an ERP-lite solution for independent fuel retailers

It is intentionally designed to:

- work without expensive forecourt integrations
- function in cash-heavy environments
- remain operationally realistic
- minimize hardware dependencies
- support remote management across multiple stations
