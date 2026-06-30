-- Lista especialistas reais ativos para Agenda, Receitas e Financeiro.
-- A função respeita o escopo por filial para não administradores e mantém
-- a tabela profiles protegida pelas políticas de RLS existentes.

create or replace function public.list_active_professionals()
returns table (
  id uuid,
  name text,
  specialty text,
  shop_id uuid,
  shop_name text
)
language sql
security definer
set search_path = public
as $$
  with requester as (
    select role
    from public.profiles
    where id = auth.uid()
  ),
  requester_shops as (
    select shop_id
    from public.user_shop_access
    where profile_id = auth.uid()
  )
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Especialista')::text as name,
    'Especialista'::text as specialty,
    usa.shop_id,
    s.name::text as shop_name
  from public.profiles p
  left join public.user_shop_access usa on usa.profile_id = p.id
  left join public.shops s on s.id = usa.shop_id
  where
    auth.uid() is not null
    and p.role = 'medico'
    and p.is_active is true
    and (
      exists (select 1 from requester where role = 'admin')
      or exists (
        select 1
        from requester_shops rs
        where rs.shop_id = usa.shop_id
      )
      or p.id = auth.uid()
    )
  order by name;
$$;

revoke execute on function public.list_active_professionals() from public;
revoke execute on function public.list_active_professionals() from anon;
grant execute on function public.list_active_professionals() to authenticated;
