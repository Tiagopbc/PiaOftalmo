export const LEGACY_SHOP_NAMES: Record<string, string> = {
  'loja-1': 'Filial 1 - Centro',
  'loja-2': 'Filial 2 - Shopping'
};

type ShopDisplayOptions = {
  allLabel?: string;
  emptyLabel?: string;
  unknownLabel?: string;
};

export const getShopDisplayName = (
  shopId?: string | null,
  shopName?: string | null,
  options: ShopDisplayOptions = {}
) => {
  if (shopName) return shopName;
  if (shopId === 'all') return options.allLabel || 'Todas as Filiais';
  if (shopId && LEGACY_SHOP_NAMES[shopId]) return LEGACY_SHOP_NAMES[shopId];
  if (!shopId) return options.emptyLabel || 'Filial não definida';
  return options.unknownLabel || 'Filial vinculada';
};
