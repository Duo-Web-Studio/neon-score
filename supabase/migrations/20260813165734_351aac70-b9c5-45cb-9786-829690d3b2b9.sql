-- 1. New users never get roles from client-supplied signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'pending')
  ON CONFLICT (id) DO NOTHING;
  -- Roles are intentionally NOT assigned here. Only admins can grant roles
  -- through the admin-only RLS-protected user_roles flow.
  RETURN NEW;
END;
$function$;

-- 2. Lock down EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_goals_current_value() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_single_goal_current_value() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_deal_recovery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_commission_month(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rollover_commissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_commission_rate_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_commission_rate_for_user(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rollover_monthly_goals() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- has_role must stay callable by signed-in users: it is used inside RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- rollover_monthly_goals only rotates expired goal periods; no privileged data access
GRANT EXECUTE ON FUNCTION public.rollover_monthly_goals() TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_commission_month(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollover_commissions() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_commission_rate_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_commission_rate_for_user(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;