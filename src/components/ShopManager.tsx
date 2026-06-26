import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, MapPin, Phone, Plus, Power, RefreshCw, Save, Store } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { shopService, type Shop } from '../services/shopService';
import { StatePanel } from './StatePanel';
import { StatusBadge } from './StatusBadge';
import type { UserProfile } from '../types';

const emptyForm = {
  name: '',
  address: '',
  cep: '',
  phone: '',
  isActive: true
};

type ShopForm = typeof emptyForm;
type ShopManagerProps = {
  currentUser: UserProfile | null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado.';

export const ShopManager = ({ currentUser }: ShopManagerProps) => {
  const canManageShops =
    isSupabaseConfigured && currentUser?.role === 'admin';

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('new');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(canManageShops);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) || null,
    [selectedShopId, shops]
  );

  const activeShops = shops.filter((shop) => shop.isActive);

  const loadShops = useCallback(async () => {
    if (!canManageShops) return;

    setLoading(true);
    setError('');

    try {
      const data = await shopService.getAll();
      setShops(data);
      if (selectedShopId !== 'new' && !data.some((shop) => shop.id === selectedShopId)) {
        setSelectedShopId('new');
        setForm(emptyForm);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [canManageShops, selectedShopId]);

  useEffect(() => {
    if (!canManageShops) return undefined;

    let cancelled = false;

    shopService.getAll()
      .then((data) => {
        if (cancelled) return;
        setShops(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManageShops]);

  const updateForm = (field: keyof ShopForm, value: ShopForm[keyof ShopForm]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startCreate = () => {
    setSelectedShopId('new');
    setForm(emptyForm);
    setFeedback('');
    setError('');
  };

  const startEdit = (shop: Shop) => {
    setSelectedShopId(shop.id);
    setForm({
      name: shop.name || '',
      address: shop.address || '',
      cep: shop.cep || '',
      phone: shop.phone || '',
      isActive: shop.isActive !== false
    });
    setFeedback('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!form.name.trim()) {
      setError('Informe o nome da unidade.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name,
        address: form.address,
        cep: form.cep,
        phone: form.phone,
        isActive: form.isActive
      };

      const savedShop = selectedShop
        ? await shopService.updateShop(selectedShop.id, payload)
        : await shopService.createShop(payload);

      setFeedback(selectedShop
        ? `Unidade ${savedShop.name} atualizada.`
        : `Unidade ${savedShop.name} cadastrada.`);
      setSelectedShopId(savedShop.id);
      setForm({
        name: savedShop.name || '',
        address: savedShop.address || '',
        cep: savedShop.cep || '',
        phone: savedShop.phone || '',
        isActive: savedShop.isActive !== false
      });
      await loadShops();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    updateForm('isActive', !form.isActive);
  };

  if (!canManageShops) {
    return (
      <StatePanel
        type="empty"
        title="Gestão de unidades indisponível"
        description="Entre com uma conta administrativa real para cadastrar e editar unidades."
      />
    );
  }

  return (
    <div className="shop-management-layout">
      <section className="shop-list-panel" aria-labelledby="shop-list-title">
        <div className="shop-panel-header">
          <div>
            <h3 id="shop-list-title" className="settings-section-title">
              <Store size={20} /> Unidades cadastradas
            </h3>
            <p className="settings-section-description">
              {activeShops.length} {activeShops.length === 1 ? 'unidade ativa' : 'unidades ativas'} no sistema.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadShops}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'state-spinner' : ''} /> Atualizar
          </button>
        </div>

        <button
          type="button"
          className={`shop-list-item ${selectedShopId === 'new' ? 'is-selected' : ''}`}
          onClick={startCreate}
        >
          <span className="shop-list-icon"><Plus size={18} /></span>
          <span>
            <strong>Nova unidade</strong>
            <small>Cadastrar loja ou filial</small>
          </span>
        </button>

        {loading && shops.length === 0 ? (
          <StatePanel
            type="loading"
            title="Carregando unidades"
            description="Consultando filiais cadastradas no Supabase."
            compact
          />
        ) : shops.length === 0 && !error ? (
          <StatePanel
            type="empty"
            title="Nenhuma unidade cadastrada"
            description="Crie a primeira unidade pelo formulário ao lado."
            compact
          />
        ) : (
          <div className="shop-list">
            {shops.map((shop) => (
              <button
                key={shop.id}
                type="button"
                className={`shop-list-item ${selectedShopId === shop.id ? 'is-selected' : ''}`}
                onClick={() => startEdit(shop)}
              >
                <span className="shop-list-icon"><Building2 size={18} /></span>
                <span>
                  <strong>{shop.name}</strong>
                  <small>{shop.address || 'Endereço não informado'}</small>
                </span>
                <StatusBadge status={shop.isActive ? 'ativo' : 'inativo'} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="shop-form-panel" aria-labelledby="shop-form-title">
        <h3 id="shop-form-title" className="settings-section-title">
          <Building2 size={20} /> {selectedShop ? 'Editar unidade' : 'Cadastrar unidade'}
        </h3>
        <p className="settings-section-description">
          Esses dados serão usados para organizar acessos da equipe e filtros por filial.
        </p>

        {feedback && <div className="team-feedback" role="status">{feedback}</div>}

        {error && (
          <StatePanel
            type="error"
            title="Não foi possível salvar a unidade"
            description={error}
            compact
          />
        )}

        <form onSubmit={handleSubmit} className="shop-form">
          <div className="form-group">
            <label htmlFor="shop-name">Nome da unidade*</label>
            <input
              id="shop-name"
              type="text"
              className="form-control"
              required
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="Ex: Filial Centro"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-address">Endereço</label>
            <div className="input-with-icon">
              <MapPin size={17} />
              <input
                id="shop-address"
                type="text"
                className="form-control"
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
                placeholder="Rua, número, bairro, cidade/UF"
                disabled={saving}
              />
            </div>
          </div>

          <div className="team-form-grid">
            <div className="form-group">
              <label htmlFor="shop-cep">CEP</label>
              <input
                id="shop-cep"
                type="text"
                className="form-control"
                value={form.cep}
                onChange={(event) => updateForm('cep', event.target.value)}
                placeholder="65000-000"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="shop-phone">Telefone / WhatsApp</label>
              <div className="input-with-icon">
                <Phone size={17} />
                <input
                  id="shop-phone"
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  placeholder="(98) 99999-9999"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {selectedShop && (
            <button
              type="button"
              className={`shop-active-toggle ${form.isActive ? 'is-active' : 'is-inactive'}`}
              onClick={handleToggleActive}
              disabled={saving}
            >
              <Power size={17} />
              {form.isActive
                ? 'Unidade ativa — clique para inativar'
                : 'Unidade inativa — clique para reativar'}
            </button>
          )}

          <div className="shop-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={17} /> {saving ? 'Salvando...' : selectedShop ? 'Salvar unidade' : 'Cadastrar unidade'}
            </button>
            {selectedShop && (
              <button type="button" className="btn btn-secondary" onClick={startCreate} disabled={saving}>
                <Plus size={17} /> Nova unidade
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};
