-- ============================================================================
-- Bloco 3: visibilidade clínica real para médicos
-- ============================================================================
-- Médicos enxergam apenas:
-- 1. pacientes agendados com eles;
-- 2. pacientes para os quais emitiram receita;
-- 3. pacientes com prontuário/evolução criada por eles;
-- 4. pacientes com exame criado por eles.
--
-- Admin/recepção/vendedor continuam limitados por filial, conforme suas telas.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_current_user_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role(), '') in ('medico', 'doctor', 'especialista');
$$;

create or replace function public.patient_has_doctor_link(
  check_patient_id text,
  check_shop_id text,
  check_doctor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    check_doctor_id is not null
    and public.user_has_shop_access(check_shop_id)
    and (
      exists (
        select 1
        from public.appointments a
        where a.patient_id = check_patient_id
          and a.professional_id::text = check_doctor_id::text
          and coalesce(a.status, '') <> 'cancelado'
      )
      or exists (
        select 1
        from public.prescriptions pr
        where pr.patient_id = check_patient_id
          and pr.professional_id::text = check_doctor_id::text
      )
      or exists (
        select 1
        from public.clinical_encounters ce
        where ce.patient_id = check_patient_id
          and ce.professional_id::text = check_doctor_id::text
      )
      or exists (
        select 1
        from public.exams ex
        where ex.patient_id = check_patient_id
          and ex.professional_id::text = check_doctor_id::text
      )
    );
$$;

create or replace function public.list_visible_patients_for_current_user()
returns setof public.patients
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.patients p
  where
    auth.uid() is not null
    and public.user_has_shop_access(p.shop_id::text)
    and (
      not public.is_current_user_doctor()
      or public.patient_has_doctor_link(p.id, p.shop_id::text, auth.uid())
    )
  order by p.name;
$$;

revoke execute on function public.current_profile_role() from public;
revoke execute on function public.current_profile_role() from anon;
grant execute on function public.current_profile_role() to authenticated;

revoke execute on function public.is_current_user_doctor() from public;
revoke execute on function public.is_current_user_doctor() from anon;
grant execute on function public.is_current_user_doctor() to authenticated;

revoke execute on function public.patient_has_doctor_link(text, text, uuid) from public;
revoke execute on function public.patient_has_doctor_link(text, text, uuid) from anon;
grant execute on function public.patient_has_doctor_link(text, text, uuid) to authenticated;

revoke execute on function public.list_visible_patients_for_current_user() from public;
revoke execute on function public.list_visible_patients_for_current_user() from anon;
grant execute on function public.list_visible_patients_for_current_user() to authenticated;

-- Remove as policies amplas antigas para evitar OR permissivo no RLS.
drop policy if exists "Usuários veem pacientes de suas filiais" on public.patients;
drop policy if exists "Usuários veem pacientes conforme perfil" on public.patients;
create policy "Usuários veem pacientes conforme perfil" on public.patients
for select using (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Usuários atualizam pacientes de suas filiais" on public.patients;
drop policy if exists "Usuários atualizam pacientes conforme perfil" on public.patients;
create policy "Usuários atualizam pacientes conforme perfil" on public.patients
for update using (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(id, shop_id::text, auth.uid())
  )
)
with check (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Usuários veem agendamentos de suas filiais" on public.appointments;
drop policy if exists "Usuários veem agendamentos conforme perfil" on public.appointments;
create policy "Usuários veem agendamentos conforme perfil" on public.appointments
for select using (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or professional_id::text = auth.uid()::text
  )
);

drop policy if exists "Usuários criam agendamentos em suas filiais" on public.appointments;
drop policy if exists "Recepcao e admins criam agendamentos" on public.appointments;
create policy "Recepcao e admins criam agendamentos" on public.appointments
for insert with check (
  public.user_has_shop_access(shop_id::text)
  and coalesce(public.current_profile_role(), '') in ('admin', 'recepcao')
);

drop policy if exists "Usuários atualizam agendamentos de suas filiais" on public.appointments;
drop policy if exists "Usuários atualizam agendamentos conforme perfil" on public.appointments;
create policy "Usuários atualizam agendamentos conforme perfil" on public.appointments
for update using (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or professional_id::text = auth.uid()::text
  )
)
with check (
  public.user_has_shop_access(shop_id::text)
  and (
    not public.is_current_user_doctor()
    or (
      professional_id::text = auth.uid()::text
      and status in ('em_atendimento', 'atendido')
    )
  )
);

-- Médicos podem ver timeline/receitas/prontuário/exames somente de pacientes com vínculo clínico.
drop policy if exists "Acesso Timeline da filial" on public.patient_timeline_events;
drop policy if exists "Acesso Timeline conforme perfil" on public.patient_timeline_events;
create policy "Acesso Timeline conforme perfil" on public.patient_timeline_events
for all using (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
)
with check (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Acesso Prescriptions da filial" on public.prescriptions;
drop policy if exists "Acesso Prescriptions conforme perfil" on public.prescriptions;
create policy "Acesso Prescriptions conforme perfil" on public.prescriptions
for all using (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
)
with check (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or (
      professional_id::text = auth.uid()::text
      and public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
    )
  )
);

drop policy if exists "Acesso Clinical Encounters da filial" on public.clinical_encounters;
drop policy if exists "Acesso Clinical Encounters conforme perfil" on public.clinical_encounters;
create policy "Acesso Clinical Encounters conforme perfil" on public.clinical_encounters
for all using (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
)
with check (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or professional_id::text = auth.uid()::text
  )
);

drop policy if exists "Acesso Exams da filial" on public.exams;
drop policy if exists "Acesso Exams conforme perfil" on public.exams;
create policy "Acesso Exams conforme perfil" on public.exams
for all using (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
)
with check (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or professional_id::text = auth.uid()::text
  )
);

-- Dados operacionais/financeiros não entram na visão médica.
drop policy if exists "Acesso Sales da filial" on public.sales;
drop policy if exists "Acesso Sales sem médicos" on public.sales;
create policy "Acesso Sales sem médicos" on public.sales
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

drop policy if exists "Acesso Sale Items da filial" on public.sale_items;
drop policy if exists "Acesso Sale Items sem médicos" on public.sale_items;
create policy "Acesso Sale Items sem médicos" on public.sale_items
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

drop policy if exists "Acesso Payments da filial" on public.payments;
drop policy if exists "Acesso Payments sem médicos" on public.payments;
create policy "Acesso Payments sem médicos" on public.payments
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

drop policy if exists "Acesso Optical Orders da filial" on public.optical_orders;
drop policy if exists "Acesso Optical Orders sem médicos" on public.optical_orders;
create policy "Acesso Optical Orders sem médicos" on public.optical_orders
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

drop policy if exists "Acesso Inventory Items da filial" on public.inventory_items;
drop policy if exists "Acesso Inventory Items sem médicos" on public.inventory_items;
create policy "Acesso Inventory Items sem médicos" on public.inventory_items
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

drop policy if exists "Acesso Inventory Transactions da filial" on public.inventory_transactions;
drop policy if exists "Acesso Inventory Transactions sem médicos" on public.inventory_transactions;
create policy "Acesso Inventory Transactions sem médicos" on public.inventory_transactions
for all using (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
)
with check (
  public.user_has_shop_access(shop_id)
  and not public.is_current_user_doctor()
);

create or replace function public.prevent_doctor_patient_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_current_user_doctor() then
    if new.cpf is distinct from old.cpf then
      raise exception 'Médicos não podem alterar CPF do paciente.';
    end if;

    if new.shop_id is distinct from old.shop_id then
      raise exception 'Médicos não podem alterar unidade/filial do paciente.';
    end if;

    if new.is_active is distinct from old.is_active then
      raise exception 'Médicos não podem alterar status ativo/inativo do paciente.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_prevent_doctor_patient_sensitive_changes on public.patients;
create trigger tr_prevent_doctor_patient_sensitive_changes
before update on public.patients
for each row execute function public.prevent_doctor_patient_sensitive_changes();

-- Anexos seguem a LGPD original e, para médicos, também exigem vínculo clínico.
drop policy if exists "Acesso LGPD leitura anexos" on public.patient_attachments;
drop policy if exists "Acesso LGPD leitura anexos conforme perfil" on public.patient_attachments;
create policy "Acesso LGPD leitura anexos conforme perfil" on public.patient_attachments
for select using (
  public.user_has_shop_access(shop_id)
  and (
    is_confidential = false
    or coalesce(public.current_profile_role(), '') in ('admin', 'medico')
  )
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Inserir anexos" on public.patient_attachments;
drop policy if exists "Inserir anexos conforme perfil" on public.patient_attachments;
create policy "Inserir anexos conforme perfil" on public.patient_attachments
for insert with check (
  public.user_has_shop_access(shop_id)
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Deletar anexos" on public.patient_attachments;
drop policy if exists "Deletar anexos conforme perfil" on public.patient_attachments;
create policy "Deletar anexos conforme perfil" on public.patient_attachments
for delete using (
  public.user_has_shop_access(shop_id)
  and (
    is_confidential = false
    or coalesce(public.current_profile_role(), '') in ('admin', 'medico')
  )
  and (
    not public.is_current_user_doctor()
    or public.patient_has_doctor_link(patient_id, shop_id::text, auth.uid())
  )
);

drop policy if exists "Permitir download do bucket patient-documents" on storage.objects;
drop policy if exists "Permitir download do bucket patient-documents conforme perfil" on storage.objects;
create policy "Permitir download do bucket patient-documents conforme perfil" on storage.objects
for select to authenticated using (
  bucket_id = 'patient-documents'
  and exists (
    select 1
    from public.patient_attachments pa
    where pa.storage_path = storage.objects.name
      and public.user_has_shop_access(pa.shop_id)
      and (
        pa.is_confidential = false
        or coalesce(public.current_profile_role(), '') in ('admin', 'medico')
      )
      and (
        not public.is_current_user_doctor()
        or public.patient_has_doctor_link(pa.patient_id, pa.shop_id::text, auth.uid())
      )
  )
);

drop policy if exists "Permitir exclusao do bucket patient-documents" on storage.objects;
drop policy if exists "Permitir exclusao do bucket patient-documents conforme perfil" on storage.objects;
create policy "Permitir exclusao do bucket patient-documents conforme perfil" on storage.objects
for delete to authenticated using (
  bucket_id = 'patient-documents'
  and exists (
    select 1
    from public.patient_attachments pa
    where pa.storage_path = storage.objects.name
      and public.user_has_shop_access(pa.shop_id)
      and (
        pa.is_confidential = false
        or coalesce(public.current_profile_role(), '') in ('admin', 'medico')
      )
      and (
        not public.is_current_user_doctor()
        or public.patient_has_doctor_link(pa.patient_id, pa.shop_id::text, auth.uid())
      )
  )
);
