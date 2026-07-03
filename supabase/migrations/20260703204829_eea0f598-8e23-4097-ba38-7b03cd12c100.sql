
CREATE TABLE public.equipment_request_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  action text NOT NULL,
  old_status public.request_status,
  new_status public.request_status,
  snapshot jsonb,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equipment_request_audit TO authenticated;
GRANT ALL ON public.equipment_request_audit TO service_role;

ALTER TABLE public.equipment_request_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit"
ON public.equipment_request_audit FOR SELECT
TO authenticated USING (true);

CREATE INDEX idx_audit_request ON public.equipment_request_audit(request_id, created_at DESC);
CREATE INDEX idx_audit_created ON public.equipment_request_audit(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_equipment_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
BEGIN
  BEGIN
    SELECT email INTO uemail FROM auth.users WHERE id = uid;
  EXCEPTION WHEN OTHERS THEN
    uemail := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.equipment_request_audit
        (request_id, action, old_status, new_status, snapshot, actor_id, actor_email)
      VALUES
        (NEW.id, 'status_change', OLD.status, NEW.status, to_jsonb(NEW), uid, uemail);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.equipment_request_audit
      (request_id, action, old_status, new_status, snapshot, actor_id, actor_email)
    VALUES
      (OLD.id, 'delete', OLD.status, NULL, to_jsonb(OLD), uid, uemail);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_equipment_requests_update
AFTER UPDATE ON public.equipment_requests
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_request_change();

CREATE TRIGGER trg_audit_equipment_requests_delete
AFTER DELETE ON public.equipment_requests
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_request_change();
