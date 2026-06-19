export const getAuthUserProfile = (user) => {
  const role = user?.app_metadata?.role || 'recepcao';
  const shopId =
    user?.app_metadata?.shop_id ||
    (role === 'admin' ? 'all' : 'loja-1');
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';

  return {
    id: user?.id,
    email: user?.email || '',
    name,
    role,
    appRole: user?.app_metadata?.role || null,
    shopId
  };
};
