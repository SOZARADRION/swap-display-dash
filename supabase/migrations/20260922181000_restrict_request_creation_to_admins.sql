DROP POLICY "Authenticated users can insert" ON public.equipment_requests;

CREATE POLICY "Only admins can insert requests"
  ON public.equipment_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND auth.uid() = created_by
  );