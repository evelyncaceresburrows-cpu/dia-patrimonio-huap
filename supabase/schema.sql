-- =================================================================
-- HUAP Posta Central — Día del Patrimonio 2026
-- Esquema de base de datos (Supabase / Postgres)
--
-- Cómo aplicarlo:
--   1. Entra a https://supabase.com → tu proyecto
--   2. Abre SQL Editor → New query
--   3. Pega este archivo completo y dale Run
-- =================================================================

create extension if not exists "pgcrypto";

-- Tabla principal: testimonios y participación ciudadana
create table if not exists public.participa_submissions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nombre          text not null check (char_length(nombre) between 2 and 120),
  vinculo         text,
  testimonio      text not null check (char_length(testimonio) between 10 and 5000),
  anio            text,
  autorizacion    boolean not null default false,
  -- metadatos técnicos para auditoría y antiabuso
  ip_address      text,
  user_agent      text,
  email           text,            -- por si se agrega campo opcional luego
  source          text default 'web',
  status          text not null default 'received' check (status in ('received','reviewed','published','discarded'))
);

create index if not exists participa_submissions_created_at_idx
  on public.participa_submissions (created_at desc);

create index if not exists participa_submissions_status_idx
  on public.participa_submissions (status);

-- Row Level Security
-- Bloqueamos lectura/escritura pública desde el cliente.
-- El backend usa SERVICE_ROLE_KEY que bypassa RLS, así que esto es seguro.
alter table public.participa_submissions enable row level security;

-- (Opcional) Política para que el dueño del proyecto pueda leer desde el dashboard
-- ya está cubierta por defecto al usar service role o la UI de Supabase.

-- =================================================================
-- (Opcional, espacio reservado para futuros formularios)
-- =================================================================

-- create table if not exists public.contacto_submissions ( ... );
