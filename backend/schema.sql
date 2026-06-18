-- NutriKidney Supabase schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ============================================================
-- Drop all existing app tables (safe to re-run)
-- ============================================================
drop table if exists
  meal_items,
  meal_logs,
  lab_results,
  weight_history,
  medications,
  appointments,
  profiles
  cascade;

-- ============================================================
-- Helper: auto-update updated_at on row change
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. Profiles — user health data, synced from signup/profile
-- ============================================================
create table profiles (
  id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  age integer,
  gender text,
  weight_kg numeric,
  height_cm numeric,
  ckd_stage text,
  has_diabetes boolean default false,
  has_hypertension boolean default false,
  activity_level text,
  dietary_preference text,
  food_allergies text,
  latest_egfr numeric,
  diagnosis_date text,
  language text not null default 'en',
  notify_time time default '08:00:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_age_check check (age is null or (age >= 1 and age <= 120)),
  constraint profiles_language_check check (language = any(array['en', 'ms']))
);

alter table profiles enable row level security;
create policy "Users own their profile"
  on profiles for all using (auth.uid() = id);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

-- Auto-create profile row on signup (copies all metadata fields)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    age,
    gender,
    weight_kg,
    height_cm,
    ckd_stage,
    has_diabetes,
    has_hypertension,
    activity_level,
    dietary_preference,
    food_allergies,
    latest_egfr,
    diagnosis_date
  ) values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'weight_kg')::numeric,
    (new.raw_user_meta_data->>'height_cm')::numeric,
    new.raw_user_meta_data->>'ckd_stage',
    coalesce((new.raw_user_meta_data->>'has_diabetes')::boolean, false),
    coalesce((new.raw_user_meta_data->>'has_hypertension')::boolean, false),
    new.raw_user_meta_data->>'activity_level',
    new.raw_user_meta_data->>'dietary_preference',
    new.raw_user_meta_data->>'food_allergies',
    (new.raw_user_meta_data->>'latest_egfr')::numeric,
    new.raw_user_meta_data->>'diagnosis_date'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Lab Results — kidney function & blood work over time
-- ============================================================
create table lab_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tested_at date not null,
  egfr numeric,
  creatinine numeric,
  bun numeric,
  potassium numeric,
  phosphorus numeric,
  calcium numeric,
  albumin numeric,
  hemoglobin numeric,
  notes text,
  created_at timestamptz default now()
);

alter table lab_results enable row level security;
create policy "Users own their lab results"
  on lab_results for all using (auth.uid() = user_id);

-- ============================================================
-- 3. Weight History — weight trending, drives per-kg limits
-- ============================================================
create table weight_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  weight_kg numeric not null,
  recorded_at date default current_date,
  unique(user_id, recorded_at)
);

alter table weight_history enable row level security;
create policy "Users own their weight history"
  on weight_history for all using (auth.uid() = user_id);

-- ============================================================
-- 4. Medications — active meds, some affect nutrient targets
-- ============================================================
create table medications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dosage text,
  frequency text,
  affects_potassium boolean default false,
  affects_phosphorus boolean default false,
  started_at date,
  ended_at date,
  created_at timestamptz default now()
);

alter table medications enable row level security;
create policy "Users own their medications"
  on medications for all using (auth.uid() = user_id);

-- ============================================================
-- 5. Appointments — nephrology visits, dialysis sessions
-- ============================================================
create table appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  doctor_name text,
  appointment_at timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

alter table appointments enable row level security;
create policy "Users own their appointments"
  on appointments for all using (auth.uid() = user_id);

-- ============================================================
-- 6. Meal Logs — parent record for each logged meal
-- ============================================================
create table meal_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  method text not null,              -- 'scan' | 'voice' | 'manual'
  risk_level text,                   -- 'safe' | 'caution' | 'danger'
  notes text,
  logged_at timestamptz not null default now()
);

alter table meal_logs enable row level security;
create policy "Users own their meal logs"
  on meal_logs for all using (auth.uid() = user_id);

-- ============================================================
-- 7. Meal Items — individual food items within a meal
-- ============================================================
create table meal_items (
  id uuid default gen_random_uuid() primary key,
  meal_id uuid references meal_logs(id) on delete cascade not null,
  food_name text not null,
  portion_g numeric default 0,
  calories numeric default 0,
  potassium_mg numeric default 0,
  phosphorus_mg numeric default 0,
  sodium_mg numeric default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  confidence numeric default 1.0,
  logged_at timestamptz not null default now()
);

alter table meal_items enable row level security;
create policy "Users own their meal items"
  on meal_items for all using (
    exists (
      select 1 from meal_logs
      where meal_logs.id = meal_items.meal_id
        and meal_logs.user_id = auth.uid()
    )
  );

-- ============================================================
-- Indexes
-- ============================================================
create index idx_lab_results_user_date on lab_results(user_id, tested_at desc);
create index idx_weight_history_user_date on weight_history(user_id, recorded_at desc);
create index idx_medications_user_active on medications(user_id) where ended_at is null;
create index idx_appointments_user_date on appointments(user_id, appointment_at desc);
create index idx_meal_logs_user_date on meal_logs(user_id, logged_at desc);
create index idx_meal_items_meal on meal_items(meal_id);
