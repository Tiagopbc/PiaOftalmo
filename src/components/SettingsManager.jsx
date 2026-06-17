import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { User, Users, Building2, Save, UserPlus, Shield } from 'lucide-react';

const SettingsManager = () => {
  const {
    currentUser,
    professionals,
    clinicSettings,
    updateClinicSettings
  } = useContext(AppContext);

  const [activeSubTab, setActiveSubTab] = useState('clinic'); // clinic, team, account

  // State para Dados da Clínica
  const [clinicName, setClinicName] = useState(clinicSettings.name || '');
  const [clinicAddress, setClinicAddress] = useState(clinicSettings.address || '');
  const [clinicCep, setClinicCep] = useState(clinicSettings.cep || '');
  const [clinicPhone, setClinicPhone] = useState(clinicSettings.phone || '');
  const [loadingSettings, setLoadingSettings] = useState(false);

  // State para Cadastro de Colaborador
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState('recepcao');
  const [empShop, setEmpShop] = useState('loja-1');
  const [loadingRegister, setLoadingRegister] = useState(false);

  // Handler para Salvar Dados da Clínica
  const handleSaveClinicSettings = (e) => {
    e.preventDefault();
    setLoadingSettings(true);
    updateClinicSettings({
      name: clinicName,
      address: clinicAddress,
      cep: clinicCep,
      phone: clinicPhone
    });
    setLoadingSettings(false);
    alert('Configurações da clínica salvas com sucesso! As próximas impressões de receitas e OS exibirão estes dados.');
  };

  // Handler para cadastrar colaborador
  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    if (empPassword.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres!');
      return;
    }

    setLoadingRegister(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signUp({
          email: empEmail,
          password: empPassword,
          options: {
            data: {
              name: empName,
              role: empRole,
              shop_id: empShop
            }
          }
        });

        if (error) throw error;

        alert(`Colaborador "${empName}" cadastrado no Supabase com sucesso!`);
        setEmpName('');
        setEmpEmail('');
        setEmpPassword('');
      } catch (err) {
        alert('Erro ao cadastrar colaborador no Supabase: ' + err.message);
      } finally {
        setLoadingRegister(false);
      }
    } else {
      // Simulação para o modo Demo
      alert(`[SIMULAÇÃO OFFLINE] Login de colaborador criado com sucesso!\nNome: ${empName}\nE-mail: ${empEmail}\nFunção: ${empRole}\nFilial: ${empShop}`);
      setEmpName('');
      setEmpEmail('');
      setEmpPassword('');
      setLoadingRegister(false);
    }
  };

  return (
    <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', minHeight: '80vh' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px' }}>Ajustes & Configurações</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gerencie as preferências da clínica, acessos e perfil de usuário administrador</p>
      </div>

      {/* Sub-abas de Ajustes */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeSubTab === 'clinic' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          onClick={() => setActiveSubTab('clinic')}
        >
          <Building2 size={16} /> Dados do Consultório
        </button>
        <button
          className={`btn ${activeSubTab === 'team' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          onClick={() => setActiveSubTab('team')}
        >
          <Users size={16} /> Equipe & Acessos
        </button>
        <button
          className={`btn ${activeSubTab === 'account' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          onClick={() => setActiveSubTab('account')}
        >
          <User size={16} /> Minha Conta
        </button>
      </div>

      <div style={{ padding: '8px 0' }}>
        {/* ABA 1: DADOS DO CONSULTÓRIO */}
        {activeSubTab === 'clinic' && (
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--primary)" /> Perfil do Consultório / Óptica
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Defina os dados de cabeçalho e rodapé que serão exibidos automaticamente nas vias impressas e PDFs de receitas e ordens de serviço.
            </p>

            <form onSubmit={handleSaveClinicSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nome do Estabelecimento / Logo Texto*</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ex: Centro Visual Optometria"
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Endereço Completo (Rua, Número, Bairro, Cidade)*</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Ex: Av. Quatro, Nº 01, Sl. 02 - Cohab Anil IV - São Luís/MA"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>CEP*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={clinicCep}
                    onChange={(e) => setClinicCep(e.target.value)}
                    placeholder="Ex: 65050-700"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>WhatsApp / Telefone de Contato*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    placeholder="Ex: (98) 98815-4507"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginTop: '8px' }}
                disabled={loadingSettings}
              >
                <Save size={18} /> {loadingSettings ? 'Gravando...' : 'Salvar Preferências'}
              </button>
            </form>
          </div>
        )}

        {/* ABA 2: EQUIPE & ACESSOS */}
        {activeSubTab === 'team' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {/* Form de Cadastro */}
            <div style={{ maxWidth: '480px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" /> Cadastrar Colaborador
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Cria novas contas de acesso para funcionários com funções e filiais específicas embutidas nos metadados.
              </p>

              <form onSubmit={handleRegisterEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Nome Completo*</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    disabled={loadingRegister}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>E-mail corporativo*</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    disabled={loadingRegister}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Senha Provisória*</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 dígitos"
                    className="form-control"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    disabled={loadingRegister}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Função (Acesso)</label>
                    <select
                      className="form-control"
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      disabled={loadingRegister}
                    >
                      <option value="recepcao">Recepção</option>
                      <option value="medico">Especialista (Médico)</option>
                      <option value="vendedor">Vendedor (Óptica)</option>
                      <option value="admin">Administrador Geral</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Filial Atribuída</label>
                    <select
                      className="form-control"
                      value={empShop}
                      onChange={(e) => setEmpShop(e.target.value)}
                      disabled={loadingRegister}
                    >
                      <option value="loja-1">Filial 1 - Centro</option>
                      <option value="loja-2">Filial 2 - Shopping</option>
                      <option value="all">Todas as Filiais</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={loadingRegister}
                >
                  <UserPlus size={18} /> {loadingRegister ? 'Registrando...' : 'Criar Conta de Acesso'}
                </button>
              </form>
            </div>

            {/* Listagem de Profissionais */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--primary)" /> Profissionais Ativos
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Lista de especialistas cadastrados no sistema para emissão de prescrições e atendimentos.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {professionals && professionals.length > 0 ? (
                  professionals.map((prof) => (
                    <div
                      key={prof.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(0,0,0,0.01)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '14px' }}>{prof.name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prof.specialty}</span>
                      </div>
                      <div style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px', fontWeight: 'bold' }}>
                        CRM: {prof.crm || 'N/A'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum profissional cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: MINHA CONTA */}
        {activeSubTab === 'account' && (
          <div style={{ maxWidth: '500px', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Dados de Perfil
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Nome completo</span>
                <strong>{currentUser.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>E-mail de acesso</span>
                <strong>{currentUser.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Função / Nível de Acesso</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                  {currentUser.role === 'admin' ? 'Administrador Geral' : currentUser.role}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Loja / Filial atual</span>
                <strong>
                  {currentUser.shopId === 'all'
                    ? 'Consolidado (Todas as Filiais)'
                    : currentUser.shopId === 'loja-1'
                    ? 'Filial 1 - Centro'
                    : 'Filial 2 - Shopping'}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManager;
