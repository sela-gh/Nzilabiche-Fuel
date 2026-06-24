create table if not exists pump_tank_links (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references petrol_stations(id) on delete cascade,
  product_id uuid not null references fuel_products(id),
  pump_number int not null check (pump_number > 0),
  tank_number int not null check (tank_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, product_id, pump_number)
);

alter table daily_deposits
  add column if not exists tank_number int;

alter table delivery_cycles
  add column if not exists tank_number int;

update daily_deposits
set tank_number = coalesce(tank_number, pump_number, 1)
where tank_number is null;

update delivery_cycles
set tank_number = coalesce(tank_number, pump_number, 1)
where tank_number is null;
