import { supabase } from './supabaseClient';

const readFunctionError = async (error) => {
  try {
    const payload = await error?.context?.json?.();
    if (payload?.error) return payload.error;
  } catch {
    // A resposta pode já ter sido consumida pelo cliente do Supabase.
  }

  return error?.message || 'Não foi possível acessar o gerenciamento de usuários.';
};

export const invokeAdminUsers = async (body) => {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });

  if (error) {
    throw new Error(await readFunctionError(error));
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};
