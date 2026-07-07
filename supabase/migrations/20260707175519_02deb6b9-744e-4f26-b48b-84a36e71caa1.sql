CREATE OR REPLACE FUNCTION public.decrement_med_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  per_dose integer;
BEGIN
  IF NEW.status IN ('taken','late') THEN
    SELECT COALESCE(pills_per_dose,1) INTO per_dose
      FROM public.medications
      WHERE id = NEW.medication_id
        AND user_id = NEW.user_id;
    IF FOUND THEN
      UPDATE public.medications
         SET stock_quantity = GREATEST(stock_quantity - COALESCE(per_dose,1), 0)
       WHERE id = NEW.medication_id
         AND user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;