# PIA Oftalmo

Sistema de gestão integrado para clínicas oftalmológicas e óticas. O sistema unifica o controle de pacientes (prontuário, exames e receitas), agenda clínica, vendas de ótica (armações e lentes), ordens de serviço (laboratório) e controle financeiro.

## Visão do Produto
A PIA Oftalmo nasceu para simplificar o fluxo oftalmológico completo, desde a recepção do paciente até a entrega final dos óculos, permitindo uma gestão clara e com forte isolamento de acesso (RLS) para múltiplos perfis: Administradores, Recepcionistas, Médicos e Vendedores.

## Módulos Atuais
- **Pacientes**: Cadastro detalhado, histórico de anexos, alertas e linha do tempo clínica/administrativa.
- **Agenda**: Controle de consultas por médico, data e status, além de fila de espera.
- **Prontuário & Receitas**: Prescrições oftalmológicas estruturadas (longe/perto, DNP, tipo de lente).
- **Ótica & OS**: Orçamentos, vendas diretas, geração e acompanhamento de Ordens de Serviço laboratoriais.
- **Financeiro**: Visão consolidada de faturamento, comissões, e controle de pagamentos.
- **Administração**: Gestão de usuários, papéis e configurações gerais.

## Stack Tecnológica
- **Frontend**: React.js + Vite
- **Estilização**: Tailwind CSS (via Tailwind) + Lucide React (ícones)
- **Backend / BaaS**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **CI/CD**: GitHub Actions + Cloudflare Pages (Deploy do Frontend)

---

## 🛠 Guia de Instalação Local

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18+ recomendada)
- Projeto no [Supabase](https://supabase.com/)

### 2. Clonando o projeto
```bash
git clone https://github.com/Tiagopbc/PiaOftalmo.git
cd PiaOftalmo
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto copiando o exemplo:
```bash
cp .env.example .env.local
```
Preencha as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do seu projeto no painel do Supabase (Settings -> API).

### 4. Instalando dependências e rodando
```bash
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## ☁️ Configuração do Supabase e Deploy

### Supabase
O banco de dados é inicializado usando os scripts presentes na raiz e as *migrations* oficiais da pasta `supabase/migrations`. 
Certifique-se de habilitar e rodar o RLS (Row Level Security) para segurança.

### Deploy
A recomendação para o Frontend estático gerado pelo Vite é utilizar o **Cloudflare Pages**, por ser gratuito, ter suporte a roteamento SPA nativo e integração transparente com o GitHub.
1. Conecte o repositório no painel do Cloudflare Pages.
2. Build command: `npm run build`
3. Build directory: `dist`
4. Configure as mesmas variáveis de ambiente na aba "Settings > Environment variables".
