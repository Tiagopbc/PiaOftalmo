# Matriz de Permissões (Roles e Ações)

Esta matriz define a base para as políticas de RLS (Row Level Security) no Supabase e visualização no Front-end.

**Legenda:**
- **[L]**: Leitura
- **[C]**: Criação
- **[A]**: Alteração
- **[E]**: Exclusão (ou Inativação lógica)
- **[-]**: Sem Acesso

| Módulo/Entidade | Administrador | Recepção | Médico | Vendedor |
| :--- | :--- | :--- | :--- | :--- |
| **Pacientes (Dados Cadastrais)** | L, C, A | L, C, A | L | L, C, A |
| **Pacientes (Anamnese e Receita)** | L | L (só visualização) | L, C, A | L (somente receita) |
| **Agenda & Lista de Espera** | L, C, A, E | L, C, A, E | L (só a dele) | L (só agenda) |
| **Vendas (Sales)** | L, C, A, E | - | - | L, C, A |
| **Orçamentos (Quotes)** | L, C, A, E | - | - | L, C, A |
| **Ordens de Serviço (OS)** | L, C, A, E | L | - | L, C, A |
| **Financeiro (Visão Geral)** | L, C, A | - | - | - |
| **Caixa e Recebimentos** | L, C, A | L, C (só da consulta) | - | L, C |
| **Estoque** | L, C, A, E | - | - | L (Consulta) |
| **Configurações Gerais** | L, C, A | - | - | - |
| **Gestão de Usuários** | L, C, A, E | - | - | - |
| **Auditoria** | L | - | - | - |

## Regras Globais de Segurança (RLS)
1. **Isolamento por Filial (`shop_id`)**: Usuários que não têm o papel de *Super Admin* só podem acessar (L, C, A, E) os registros nos quais o `shop_id` seja correspondente a um dos `shop_id`s listados no seu vínculo na tabela `user_shop_access`.
2. **Deleção Lógica**: Nenhum registro financeiro ou de prontuário pode ser apagado fisicamente (`DELETE`). Deve-se utilizar campos como `deleted_at` ou status `cancelado`.
3. **Auditoria Obrigatória**: Toda alteração (`UPDATE`) ou inativação (`DELETE` lógico) precisa ser espelhada na tabela `audit_logs` (preferencialmente por um trigger de banco de dados).
