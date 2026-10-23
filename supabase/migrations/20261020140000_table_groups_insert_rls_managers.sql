/*
  Masa grubu oluşturma: manager + ayar yetkisi olanlar da insert edebilsin.
  Eski çakışan / aşırı açık SELECT-UPDATE politikalarını sadeleştirmez;
  yalnızca INSERT tarafını netleştirir.
*/

DROP POLICY IF EXISTS "Branch isolated table groups insert" ON public.table_groups;
DROP POLICY IF EXISTS "Users can create table groups" ON public.table_groups;
DROP POLICY IF EXISTS "Owner admin can insert table groups" ON public.table_groups;

CREATE POLICY "Tenant members can insert table groups"
  ON public.table_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = COALESCE(
      public.get_my_tenant_id_direct(),
      public.get_my_tenant_id()
    )
    AND (
      public.is_owner_or_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.tenant_id = table_groups.tenant_id
          AND (
            p.role IN ('owner', 'admin', 'manager')
            OR p.branch_id IS NULL
            OR table_groups.branch_id IS NULL
            OR p.branch_id = table_groups.branch_id
          )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
