CREATE TYPE public.request_kind AS ENUM ('troca','aluguel');
ALTER TABLE public.equipment_requests ADD COLUMN request_type public.request_kind NOT NULL DEFAULT 'troca';
ALTER TABLE public.equipment_request_audit ADD COLUMN request_type public.request_kind;