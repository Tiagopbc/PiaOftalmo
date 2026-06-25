#!/bin/bash

# Este script utiliza a ferramenta GitHub CLI (gh) para criar as issues do roadmap da PIA Oftalmo.
# Pré-requisitos:
# 1. Instalar o GitHub CLI (https://cli.github.com/)
# 2. Fazer login: `gh auth login`
# 3. Rodar este script na raiz do projeto: `bash scripts/create_github_issues.sh`

echo "Criando issues para a PIA Oftalmo..."

# Issue 1
gh issue create \
  --title "Fase 1: Segurança, permissões, auditoria e backups (Prioridade 0)" \
  --body "Objetivo: garantir que ocultar um botão não seja a única proteção.
- [ ] Migração-base versionando tabelas e RLS.
- [ ] Matriz formal por papel e ação.
- [ ] Permissões por filial.
- [ ] Tabela audit_logs somente para inclusão.
- [ ] Revisão completa das políticas RLS no Supabase.
- [ ] Rotina de backup documentada." \
  --label "security" --label "fase-1"

# Issue 2
gh issue create \
  --title "Fase 2: Redução do AppContext e TypeScript gradual (Prioridade 0)" \
  --body "Objetivo: impedir que o contexto global continue crescendo.
- [ ] Manter no AppContext apenas sessão, tema e dados globais.
- [ ] Criar serviços/repositórios por domínio (Auth, Patients, Sales).
- [ ] Criar hooks customizados (usePatients, etc).
- [ ] Iniciar tipagem (TypeScript) pelos novos arquivos de domínio." \
  --label "refactor" --label "fase-2"

# Issue 3
gh issue create \
  --title "Fase 3: Modelo de dados real e migração dos JSONs (Prioridade 0)" \
  --body "Objetivo: retirar dados agregados de dentro do paciente.
- [ ] Criar entidades: shops, profiles, pacientes, vendas, pagamentos, os, estoque.
- [ ] Copiar e validar dados existentes (migração dupla).
- [ ] Trocar a aplicação para as novas tabelas.
- [ ] Remover json arrays do paciente original." \
  --label "database" --label "fase-3"

# Issue 4
gh issue create \
  --title "Fase 4: Separação Orçamento, Venda, Pagamento e OS (Prioridade 1)" \
  --body "Fluxo: Orçamento -> Aprovação -> Venda -> Pagamento -> (OS apenas se lente/montagem).
- [ ] Venda somente de armação não deve gerar OS.
- [ ] Status de pagamento devem ser independentes (pendente, parcial, pago).
- [ ] Pagamentos parciais.
- [ ] Numeração originada do banco." \
  --label "feature" --label "fase-4"

# Issue 5
gh issue create \
  --title "Fase 5: Prontuário, receitas e exames estruturados (Prioridade 1)" \
  --body "Objetivo: Aprofundar a aba clínica para padrão oftalmológico.
- [ ] Anamnese estruturada.
- [ ] Acuidade visual, refração e pressão ocular.
- [ ] Histórico clínico imutável com assinatura de responsável.
- [ ] Exames com upload de laudo." \
  --label "feature" --label "fase-5"

# Issue 6
gh issue create \
  --title "Fase 6: Estoque, caixa, contas e convênios (Prioridade 1)" \
  --body "- [ ] Cadastro de itens, armações e lentes.
- [ ] Baixa de estoque vinculada a venda.
- [ ] Contas a receber e a pagar.
- [ ] Abertura, fechamento e sangria de caixa." \
  --label "feature" --label "fase-6"

echo "✅ Todas as issues da fundação foram criadas!"
