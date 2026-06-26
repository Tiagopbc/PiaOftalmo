import { supabase } from './supabaseClient';
import { UserProfile } from '../types';
import { getShopDisplayName } from './shops';

type JoinedShop = {
  id?: string | null;
  name?: string | null;
  legacy_code?: string | null;
};

type UserShopAccess = {
  shop_id?: string | null;
  shops?: JoinedShop | JoinedShop[] | null;
};

const getJoinedShop = (access?: UserShopAccess | null): JoinedShop | null => {
  const joined = access?.shops;
  if (Array.isArray(joined)) return joined[0] || null;
  return joined || null;
};

export const getAuthUserProfile = async (user: any): Promise<UserProfile> => {
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  let role = 'recepcao';
  let shopId = '';
  let shopName = '';
  let shopCode = '';

  try {
    // Busca a role real no perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      role = profile.role;
    }

    // Busca a filial
    if (role === 'admin') {
      shopId = 'all';
      shopName = 'Todas as Filiais';
    } else {
      const { data: access } = await supabase
        .from('user_shop_access')
        .select('shop_id, shops(id, name, legacy_code)')
        .eq('profile_id', user.id)
        .limit(1)
        .single();
      
      if (access) {
        const userAccess = access as UserShopAccess;
        const shop = getJoinedShop(userAccess);
        shopId = userAccess.shop_id || '';
        shopName = getShopDisplayName(userAccess.shop_id, shop?.name);
        shopCode = shop?.legacy_code || '';
      }
    }
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário no banco', error);
  }

  return {
    id: user?.id,
    email: user?.email || '',
    name,
    role,
    appRole: role,
    shopId,
    shopName,
    shopCode,
    mustChangePassword: user?.app_metadata?.must_change_password === true
  };
};
