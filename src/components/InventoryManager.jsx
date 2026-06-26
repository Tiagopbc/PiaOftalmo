import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInventoryItems, addInventoryItem, updateInventoryItem, adjustStock } from '../services/inventoryService';
import { Plus, Search, Edit2, PackagePlus, PackageMinus, AlertTriangle } from 'lucide-react';
import PageHeader from './PageHeader';
import { StatePanel } from './StatePanel';

const InventoryManager = () => {
  const { currentUser } = useAuth();
  const shopId = currentUser?.shopId;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Transaction Modal states
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('IN'); // IN or OUT
  const [txTargetItem, setTxTargetItem] = useState(null);
  const [txQuantity, setTxQuantity] = useState(1);
  const [txNotes, setTxNotes] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Armação',
    brand: '',
    quantity: 0,
    minQuantity: 5,
    price: 0
  });

  const categories = ['Armação', 'Lente', 'Lente de Contato', 'Outros'];

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventoryItems(shopId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadItems();
    }
  }, [shopId, loadItems]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku || '',
        category: item.category,
        brand: item.brand || '',
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        price: item.price || 0
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        sku: '',
        category: 'Armação',
        brand: '',
        quantity: 0,
        minQuantity: 5,
        price: 0
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          brand: formData.brand,
          minQuantity: Number(formData.minQuantity),
          price: Number(formData.price)
        });
      } else {
        await addInventoryItem({
          shop_id: shopId,
          ...formData,
          quantity: Number(formData.quantity),
          minQuantity: Number(formData.minQuantity),
          price: Number(formData.price),
          isActive: true
        });
      }
      setShowItemModal(false);
      loadItems();
    } catch (err) {
      console.error('Error saving item', err);
      alert('Erro ao salvar item.');
    }
  };

  const handleOpenTransaction = (item, type) => {
    setTxTargetItem(item);
    setTxType(type);
    setTxQuantity(1);
    setTxNotes('');
    setShowTxModal(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    try {
      const qtyChange = txType === 'IN' ? Number(txQuantity) : -Number(txQuantity);
      await adjustStock(txTargetItem.id, shopId, qtyChange, txType, currentUser.id, txNotes);
      setShowTxModal(false);
      loadItems();
    } catch (err) {
      console.error('Error saving transaction', err);
      alert('Erro ao registrar transação.');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === 'Todas' || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return <StatePanel message="Carregando estoque..." />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Gerenciamento"
        title="Estoque"
        description="Controle de armações, lentes e produtos da loja"
        actions={
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> Novo Produto
          </button>
        }
      />

      <div className="stat-card" style={{ display: 'block', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', margin: 0, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <div className="form-group" style={{ width: '220px', margin: 0 }}>
            <select
              className="form-control"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="Todas">Todas as Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Produto</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Categoria</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Quantidade</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-title)' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.sku && <span style={{ marginRight: '8px' }}>SKU: {item.sku}</span>}
                        {item.brand && <span>Marca: {item.brand}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px', 
                        fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)' 
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '700', fontSize: '14px',
                        color: item.quantity <= item.minQuantity ? 'var(--status-cancelado-text)' : 'var(--status-atendido-text)'
                      }}>
                        {item.quantity} un
                      </div>
                      {item.quantity <= item.minQuantity && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--status-cancelado-text)', marginTop: '4px', fontWeight: '600' }}>
                          <AlertTriangle size={12} /> Baixo
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenTransaction(item, 'IN')}
                          className="btn"
                          style={{ padding: '6px', color: 'var(--status-atendido-text)', backgroundColor: 'var(--status-atendido)' }}
                          title="Dar Entrada"
                        >
                          <PackagePlus size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenTransaction(item, 'OUT')}
                          className="btn"
                          style={{ padding: '6px', color: 'var(--status-cancelado-text)', backgroundColor: 'var(--status-cancelado)' }}
                          title="Dar Saída"
                        >
                          <PackageMinus size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="btn btn-secondary"
                          style={{ padding: '6px' }}
                          title="Editar Item"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Item */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Produto' : 'Novo Produto'}</h2>
            </div>
            <div className="modal-body">
              <form id="itemForm" onSubmit={handleSaveItem}>
                <div className="form-group">
                  <label>Nome do Produto *</label>
                  <input
                    required
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria *</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Marca</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Preço Venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                </div>
                {!editingItem && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Estoque Atual *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        className="form-control"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Estoque Mínimo *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        className="form-control"
                        value={formData.minQuantity}
                        onChange={e => setFormData({...formData, minQuantity: e.target.value})}
                      />
                    </div>
                  </div>
                )}
                {editingItem && (
                  <div className="form-group">
                    <label>Estoque Mínimo *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.minQuantity}
                      onChange={e => setFormData({...formData, minQuantity: e.target.value})}
                    />
                  </div>
                )}
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form="itemForm">Salvar Produto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transação (Entrada/Saída) */}
      {showTxModal && txTargetItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ color: txType === 'IN' ? 'var(--status-atendido-text)' : 'var(--status-cancelado-text)' }}>
                {txType === 'IN' ? 'Dar Entrada' : 'Dar Saída'}
              </h2>
            </div>
            <div className="modal-body">
              <form id="txForm" onSubmit={handleSaveTransaction}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
                  <strong>{txTargetItem.name}</strong><br />
                  Estoque atual: <strong>{txTargetItem.quantity}</strong> un
                </div>

                <div className="form-group">
                  <label>Quantidade *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={txType === 'OUT' ? txTargetItem.quantity : undefined}
                    className="form-control"
                    value={txQuantity}
                    onChange={e => setTxQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Motivo / Observação</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder={txType === 'IN' ? 'Ex: Compra de fornecedor (NF 123)' : 'Ex: Quebra / Venda Avulsa'}
                    value={txNotes}
                    onChange={e => setTxNotes(e.target.value)}
                  ></textarea>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTxModal(false)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: txType === 'IN' ? 'var(--status-atendido-text)' : 'var(--status-cancelado-text)' }}
                type="submit" 
                form="txForm"
              >
                Confirmar {txType === 'IN' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Required style for simple modal overlay if not in index.css */}
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content {
          background: var(--bg-secondary); width: 100%; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xl);
        }
        .modal-header {
          padding: 16px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);
        }
        .modal-body {
          padding: 24px; max-height: 70vh; overflow-y: auto;
        }
        .modal-footer {
          padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px; background: var(--bg-primary);
        }
      `}</style>
    </div>
  );
};

export default InventoryManager;
