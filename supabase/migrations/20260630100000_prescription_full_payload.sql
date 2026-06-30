-- Guarda a receita óptica completa emitida no formulário atual.
-- Mantém os campos antigos para compatibilidade, mas passa a preservar
-- DNP, AV, grau de perto, filtros/lentes e nome do emissor.

alter table public.prescriptions
  add column if not exists doctor_name text,
  add column if not exists longe jsonb not null default '{}'::jsonb,
  add column if not exists perto jsonb not null default '{}'::jsonb,
  add column if not exists lens_types jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamp with time zone default current_timestamp;

update public.prescriptions
set
  longe = case
    when longe = '{}'::jsonb then jsonb_build_object(
      'od', jsonb_build_object(
        'esferico', coalesce(od_sph, ''),
        'cilindrico', coalesce(od_cyl, ''),
        'eixo', coalesce(od_axis, ''),
        'dnp', '',
        'av', ''
      ),
      'oe', jsonb_build_object(
        'esferico', coalesce(os_sph, ''),
        'cilindrico', coalesce(os_cyl, ''),
        'eixo', coalesce(os_axis, ''),
        'dnp', '',
        'av', ''
      )
    )
    else longe
  end,
  lens_types = case
    when lens_types = '{}'::jsonb then jsonb_build_object(
      'antireflexo', false,
      'multifocal', false,
      'fotossensivel', false,
      'bluecontrol', false
    )
    else lens_types
  end
where true;

create or replace function public.set_prescriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$;

drop trigger if exists prescriptions_set_updated_at on public.prescriptions;
create trigger prescriptions_set_updated_at
before update on public.prescriptions
for each row
execute function public.set_prescriptions_updated_at();
