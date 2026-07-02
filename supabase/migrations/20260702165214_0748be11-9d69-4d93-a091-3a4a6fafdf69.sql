
CREATE TYPE public.request_status AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE public.client_type AS ENUM ('PF', 'PJ');

CREATE TABLE public.equipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_type public.client_type NOT NULL,
  contract_manager TEXT NOT NULL,
  contract_number TEXT NOT NULL,
  equipment TEXT NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equipment_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_requests TO authenticated;
GRANT ALL ON public.equipment_requests TO service_role;

ALTER TABLE public.equipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view requests"
  ON public.equipment_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert"
  ON public.equipment_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update"
  ON public.equipment_requests FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete"
  ON public.equipment_requests FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_equipment_requests_updated_at
  BEFORE UPDATE ON public.equipment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_requests;
ALTER TABLE public.equipment_requests REPLICA IDENTITY FULL;
