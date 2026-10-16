CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view audit" ON public.equipment_request_audit;

CREATE POLICY "Admins can view audit"
  ON public.equipment_request_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view requests" ON public.equipment_requests;

CREATE POLICY "Authenticated users can view requests"
  ON public.equipment_requests FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON TABLE public.equipment_requests FROM anon;

CREATE TABLE public.app_owners (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_owners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_owners TO authenticated;

CREATE POLICY "Owners can view their own registration"
  ON public.app_owners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  role public.app_role,
  created_at timestamptz,
  has_email_provider boolean,
  is_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'admin')
    OR NOT EXISTS (
      SELECT 1
      FROM public.app_owners
      WHERE user_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'Only the app owner can list users'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    users.id,
    users.email::text,
    COALESCE(roles.role, 'tecnico'::public.app_role),
    users.created_at,
    COALESCE(users.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email',
    EXISTS (
      SELECT 1
      FROM public.app_owners AS owners
      WHERE owners.user_id = users.id
    )
  FROM auth.users AS users
  LEFT JOIN public.user_roles AS roles ON roles.user_id = users.id
  ORDER BY users.created_at, users.email;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user uuid,
  new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_role public.app_role;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'admin')
    OR NOT EXISTS (
      SELECT 1
      FROM public.app_owners
      WHERE user_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'Only the app owner can change user roles'
      USING ERRCODE = '42501';
  END IF;

  IF target_user IS NULL OR new_role IS NULL THEN
    RAISE EXCEPTION 'A target user and role are required'
      USING ERRCODE = '22004';
  END IF;

  IF auth.uid() = target_user THEN
    RAISE EXCEPTION 'You cannot change your own role'
      USING ERRCODE = '42501';
  END IF;

  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;

  SELECT role
  INTO previous_role
  FROM public.user_roles
  WHERE user_id = target_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The target user has no role record'
      USING ERRCODE = 'P0002';
  END IF;

  IF previous_role = 'admin'
    AND new_role <> 'admin'
    AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1
  THEN
    RAISE EXCEPTION 'The system must retain at least one admin'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_roles
  SET role = new_role
  WHERE user_id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_user_password(
  target_user uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_has_email_provider boolean;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'admin')
    OR NOT EXISTS (
      SELECT 1
      FROM public.app_owners
      WHERE user_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'Only the app owner can reset user passwords'
      USING ERRCODE = '42501';
  END IF;

  IF target_user IS NULL OR new_password IS NULL OR char_length(new_password) < 8 THEN
    RAISE EXCEPTION 'A target user and a password of at least 8 characters are required'
      USING ERRCODE = '22023';
  END IF;

  IF auth.uid() = target_user THEN
    RAISE EXCEPTION 'You cannot reset your own password here'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_owners
    WHERE user_id = target_user
  ) THEN
    RAISE EXCEPTION 'The app owner password cannot be reset here'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(users.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email'
  INTO target_has_email_provider
  FROM auth.users AS users
  WHERE users.id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The target user does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT target_has_email_provider THEN
    RAISE EXCEPTION 'The target user does not have the email provider'
      USING ERRCODE = '22023';
  END IF;

  -- Existing access tokens may remain valid until they expire.
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_password(uuid, text) TO authenticated;
