CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.list_users_with_roles();

CREATE FUNCTION public.list_users_with_roles()
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