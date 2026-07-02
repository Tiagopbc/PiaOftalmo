UPDATE public.patient_timeline_events
SET date = COALESCE(date, created_at, now())
WHERE date IS NULL;
