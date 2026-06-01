grant usage on schema public to service_role;

grant select, insert, update, delete
on public.beta_device_snapshots
to service_role;

grant select, insert, update, delete
on public.beta_feedback
to service_role;

grant select, insert, update, delete
on public.workouts
to service_role;

grant select, insert, update, delete
on public.workout_sets
to service_role;
