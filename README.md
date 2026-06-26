# PIA Oftalmo - Gestão Clínica e Óptica

O **PIA Oftalmo** é um sistema web integrado (SPA) projetado para otimizar operações de clínicas oftalmológicas que possuem óptica própria. O sistema centraliza a jornada do paciente, desde o agendamento da consulta até a prescrição, confecção de lentes e acerto financeiro, suportando operação multi-filiais de forma segura e eficiente.

---

## 🛠 Decisão Arquitetural: React/Vite + Supabase
A arquitetura do PIA Oftalmo foi validada e consolidada para utilizar **React + Vite** no Frontend e **Supabase (PostgreSQL)** como Backend as a Service (BaaS).

**Justificativa:** Para a meta operacional de até 10 lojas ativas simultaneamente, esta stack é capaz de fornecer alta disponibilidade, segurança a nível de linha no banco de dados (RLS) e facilidade de manutenção por pequenas equipes. A introdução de infraestruturas pesadas (NestJS, filas, Redis) adicionaria custo sem trazer ganhos operacionais neste estágio do negócio.

---

## 🚀 Instalação e Execução (Desenvolvimento)

### Pré-requisitos
- Node.js versão 18+
- Projeto no Supabase criado (com URL e Anon Key em mãos)

### Passo a Passo

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente baseando-se no modelo:
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` inserindo sua `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.*

3. Execute o ambiente de desenvolvimento local:
   ```bash
   npm run dev
   ```

---

## 📦 Mapa de Módulos (Features)

A estrutura da aplicação prioriza a separação de domínio. Os dados não ficam aglomerados em um JSON global:

- **Auth:** Autenticação, gestão de sessão e papéis (Admin, Recepção).
- **Pacientes (Patients):** Cadastro, linha do tempo (timeline) e alertas.
- **Agenda (Appointments):** Gestão de consultas diárias, confirmações e faltas.
- **Espera (Waitlist):** Gerenciamento ágil de encaixes por desistência.
- **Receitas (Prescriptions):** Refração, prescrição médica isolada da OS de venda.
- **Vendas (Sales / OS):** Ordem de Serviço da óptica e controle de pagamentos.
- **Estoque (Inventory):** Lentes, armações, baixas manuais e avisos de limite mínimo.
- **Financeiro (Finance):** Dashboard operacional de faturamento e fluxo de OS pendentes.

---

## 🏗 Dicionário de Dados Inicial (PostgreSQL)

- **`patients`**: Tabela central do histórico pessoal, linha do tempo clínica e alertas médicos.
- **`appointments`**: Agendamentos da clínica por loja. Status controla o painel de atendimento.
- **`prescriptions`**: Receitas oftalmológicas (olho direito/esquerdo, eixos, adições).
- **`sales` (Óptica):** Compras/Órdens de Serviço. Onde ocorre a confecção de óculos e a definição financeira.
- **`inventory_items`**: O Catálogo de peças. Possui quantitativo e mínimo de alerta.
- **`inventory_transactions`**: O histórico imutável (auditoria) das baixas ou entradas de estoque.
- **`audit_logs`**: Tabela somente-leitura onde o banco de dados via *Trigger* anota todas as ações destrutivas ou vitais no sistema (quem fez o quê, que horas).

---

## 🔐 Matriz de Permissões (Roles e RLS)

A segurança baseia-se na Row Level Security do PostgreSQL e nos papéis de usuários (via JWT claims do Supabase):

| Ação / Módulo                  | Administrador (`admin`) | Equipe / Demonstração (`user`) |
|--------------------------------|:-----------------------:|:------------------------------:|
| Autenticar                     | ✅                      | ✅                             |
| Listar/Ver Pacientes           | ✅                      | ✅                             |
| Criar/Alterar Pacientes        | ✅                      | ✅                             |
| Inativar Paciente              | ✅                      | ❌                             |
| Ver Métricas Financeiras       | ✅                      | ❌ (Bloqueado via RLS/UI)      |
| Editar Estoque / Cadastro      | ✅                      | ❌                             |
| Mudar Status de OS p/ Entregue | ✅                      | ✅                             |
| Ver dados de todas as filiais  | ✅ (Loja = 'all')       | ❌ (Preso à sua própria loja)  |

---

## 📋 Catálogo Oficial de Status

Para evitar concorrência e dados órfãos, toda alteração de estado no sistema obedece listas estritas de status.

**Agenda de Consultas:**
*   `confirmado`: O paciente deve vir, ocupa a vaga ativa.
*   `atendido`: O paciente passou pelo profissional.
*   `falta`: Paciente não compareceu.
*   `cancelado`: Desistência.

**Vendas da Óptica / OS:**
*   `Aguardando Pagamento`: Ordem criada, mas o financeiro não está quitado.
*   `Aguardando Laboratório`: OS em processo produtivo externo.
*   `Em Produção`: OS em montagem na ótica.
*   `Pronto`: Disponível para o cliente retirar.
*   `Entregue`: Processo e pagamento encerrados com sucesso.
*   `Cancelado`: O cliente desistiu ou houve defeito irreversível.

---

## 🚢 Testes e Deploy (CI / CD)

O repositório está configurado com Github Actions (.github/workflows/ci.yml).
Sempre que um Pull Request for aberto, são executados:

1. **Lint:** `npm run lint` - Mantém a padronização e avisa sobre variáveis inutilizadas.
2. **Tests:** `npm test` - Valida as regras de negócio unitárias e mocks via Vitest.
3. **Build:** `npm run build` - Assegura que o empacotamento Vite funciona perfeitamente para produção.

Para realizar deploy em produção, integre sua branch `main` com plataformas preparadas para servir arquivos estáticos de alta performance (Ex: **Cloudflare Pages** ou Vercel). O comando de Build utilizado nas plataformas deve ser `npm run build` e o diretório de saída deve ser setado para `dist`.
