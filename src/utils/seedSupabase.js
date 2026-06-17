import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_WAITLIST
} from './mockData';

export const seedDatabase = async () => {
  if (!isSupabaseConfigured) {
    alert('Supabase não configurado! Por favor, insira as chaves no arquivo .env.local.');
    return false;
  }

  try {
    // 1. Limpar dados existentes (deleta tudo)
    // Usando filtros genéricos .neq('id', '') para que o Postgres execute a deleção total
    const { error: errDelWaits } = await supabase.from('waitlist').delete().neq('id', '');
    if (errDelWaits) console.warn('Erro ao limpar waitlist (pode não existir ainda):', errDelWaits);

    const { error: errDelApps } = await supabase.from('appointments').delete().neq('id', '');
    if (errDelApps) console.warn('Erro ao limpar appointments:', errDelApps);

    const { error: errDelPats } = await supabase.from('patients').delete().neq('id', '');
    if (errDelPats) console.warn('Erro ao limpar patients:', errDelPats);

    // 2. Inserir Pacientes Fictícios Iniciais
    const { error: errPats } = await supabase.from('patients').insert(INITIAL_PATIENTS);
    if (errPats) throw errPats;

    // 3. Inserir Consultas Fictícias Iniciais
    const { error: errApps } = await supabase.from('appointments').insert(INITIAL_APPOINTMENTS);
    if (errApps) throw errApps;

    // 4. Inserir Fila de Espera Fictícia Inicial
    const { error: errWaits } = await supabase.from('waitlist').insert(INITIAL_WAITLIST);
    if (errWaits) throw errWaits;

    return true;
  } catch (error) {
    console.error('Erro crítico ao semear tabelas no Supabase:', error);
    alert(`Erro ao popular tabelas: ${error.message}. Verifique se você executou as queries SQL descritas no Walkthrough no seu editor do Supabase!`);
    return false;
  }
};
