CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- activities
DROP POLICY "Admins read all activities" ON public.activities;
CREATE POLICY "Admins read all activities" ON public.activities FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- clients
DROP POLICY "Admins delete clients" ON public.clients;
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins update any client" ON public.clients;
CREATE POLICY "Admins update any client" ON public.clients FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Owners and admins view clients" ON public.clients;
CREATE POLICY "Owners and admins view clients" ON public.clients FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.client_id = clients.id AND (d.user_id = auth.uid() OR d.closed_by_user_id = auth.uid())
  )
);

-- commission_periods
DROP POLICY "Admins manage commission periods" ON public.commission_periods;
CREATE POLICY "Admins manage commission periods" ON public.commission_periods FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- commission_rates
DROP POLICY "Admins and owner read commission rates" ON public.commission_rates;
CREATE POLICY "Admins and owner read commission rates" ON public.commission_rates FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (scope = 'user' AND user_id = auth.uid())
  OR scope = ANY (ARRAY['global','role'])
);

DROP POLICY "Admins manage commission rates" ON public.commission_rates;
CREATE POLICY "Admins manage commission rates" ON public.commission_rates FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- deals
DROP POLICY "Admins can delete any deal" ON public.deals;
CREATE POLICY "Admins can delete any deal" ON public.deals FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins can update any deal" ON public.deals;
CREATE POLICY "Admins can update any deal" ON public.deals FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Owners closers and admins view deals" ON public.deals;
CREATE POLICY "Owners closers and admins view deals" ON public.deals FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = closed_by_user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- goals
DROP POLICY "Admins manage goals" ON public.goals;
CREATE POLICY "Admins manage goals" ON public.goals FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- pipeline_stages
DROP POLICY "Admins can create pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Admins can create pipeline stages" ON public.pipeline_stages FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

DROP POLICY "Admins can delete pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Admins can delete pipeline stages" ON public.pipeline_stages FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins can update pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Admins can update pipeline stages" ON public.pipeline_stages FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- profiles
DROP POLICY "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- sections
DROP POLICY "Admins can delete sections" ON public.sections;
CREATE POLICY "Admins can delete sections" ON public.sections FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins can insert sections" ON public.sections;
CREATE POLICY "Admins can insert sections" ON public.sections FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins can update sections" ON public.sections;
CREATE POLICY "Admins can update sections" ON public.sections FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles
DROP POLICY "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- internal callers
CREATE OR REPLACE FUNCTION public.rollover_monthly_goals()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_new_start DATE;
  v_new_end DATE;
  v_series_id UUID;
  v_exists BOOLEAN;
  v_new_status TEXT;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN 0;
  END IF;

  v_new_start := date_trunc('month', CURRENT_DATE)::date;
  v_new_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

  FOR r IN
    SELECT * FROM public.goals
    WHERE period = 'monthly' AND status = 'active' AND end_date < CURRENT_DATE
  LOOP
    v_new_status := CASE
      WHEN r.target_value > 0 AND r.current_value >= r.target_value THEN 'achieved'
      ELSE 'missed'
    END;

    UPDATE public.goals SET status = v_new_status, archived_at = now() WHERE id = r.id;

    v_series_id := COALESCE(r.parent_goal_id, r.id);

    SELECT EXISTS (
      SELECT 1 FROM public.goals
      WHERE period = 'monthly' AND status = 'active' AND start_date = v_new_start
        AND (
          parent_goal_id = v_series_id OR id = v_series_id
          OR (title = r.title AND COALESCE(target_user_id::text, '') = COALESCE(r.target_user_id::text, ''))
        )
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.goals (
        title, target_value, current_value, period,
        start_date, end_date, target_user_id, created_by, status, parent_goal_id
      ) VALUES (
        r.title, r.target_value, 0, 'monthly',
        v_new_start, v_new_end, r.target_user_id, r.created_by, 'active', v_series_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);