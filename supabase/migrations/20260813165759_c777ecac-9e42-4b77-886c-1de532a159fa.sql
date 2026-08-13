-- Run goal rollover with the caller's own permissions (goals table is admin-only via RLS)
CREATE OR REPLACE FUNCTION public.rollover_monthly_goals()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
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
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN 0;
  END IF;

  v_new_start := date_trunc('month', CURRENT_DATE)::date;
  v_new_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

  FOR r IN
    SELECT * FROM public.goals
    WHERE period = 'monthly'
      AND status = 'active'
      AND end_date < CURRENT_DATE
  LOOP
    v_new_status := CASE
      WHEN r.target_value > 0 AND r.current_value >= r.target_value THEN 'achieved'
      ELSE 'missed'
    END;

    UPDATE public.goals
      SET status = v_new_status,
          archived_at = now()
      WHERE id = r.id;

    v_series_id := COALESCE(r.parent_goal_id, r.id);

    SELECT EXISTS (
      SELECT 1 FROM public.goals
      WHERE period = 'monthly'
        AND status = 'active'
        AND start_date = v_new_start
        AND (
          parent_goal_id = v_series_id
          OR id = v_series_id
          OR (
            title = r.title
            AND COALESCE(target_user_id::text, '') = COALESCE(r.target_user_id::text, '')
          )
        )
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.goals (
        title, target_value, current_value, period,
        start_date, end_date, target_user_id, created_by,
        status, parent_goal_id
      ) VALUES (
        r.title, r.target_value, 0, 'monthly',
        v_new_start, v_new_end, r.target_user_id, r.created_by,
        'active', v_series_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rollover_monthly_goals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollover_monthly_goals() TO authenticated, service_role;