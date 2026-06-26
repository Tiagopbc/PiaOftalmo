import { supabase } from './supabaseClient';

type FunctionErrorWithContext = Error & {
  context?: {
    json?: () => Promise<{ error?: string }>;
  };
};

export type AdminUsersPayload = Record<string, unknown> & {
  action: string;
};

export type AdminUsersResponse = Record<string, unknown> & {
  error?: string;
};

const readFunctionError = async (error: FunctionErrorWithContext) => {
  try {
    const payload = await error?.context?.json?.();
    if (payload?.error) return payload.error;
  } catch {
    // A resposta pode já ter sido consumida pelo cliente do Supabase.
  }

  return error?.message || 'Não foi possível acessar o gerenciamento de usuários.';
};

export const invokeAdminUsers = async <TResponse extends AdminUsersResponse = AdminUsersResponse>(
  body: AdminUsersPayload
): Promise<TResponse> => {
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data, error } = await supabase.functions.invoke<TResponse>('admin-users', { body });

  if (error) {
    throw new Error(await readFunctionError(error as FunctionErrorWithContext));
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as TResponse;
};
