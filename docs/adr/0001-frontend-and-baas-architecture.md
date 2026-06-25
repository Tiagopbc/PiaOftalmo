# ADR 0001: Arquitetura de Frontend e BaaS

**Data:** 2026-06-21
**Status:** Aceito

## Contexto
O projeto PIA Oftalmo possui como visão tornar-se uma plataforma completa de gestão de clínicas oftalmológicas. Na fase atual de concepção e prova de valor comercial, o foco é construir o sistema de forma rápida, mas segura e capaz de atender a uma rede de pequeno porte (até 10 lojas) sem a necessidade de infraestrutura complexa e custosa. O modelo ideal (futuro) inclui um backend dedicado em NestJS, microsserviços e mensageria. No entanto, o código atual é baseado em React + Vite.

## Decisão
Decidimos **manter a arquitetura baseada em React (SPA) consumindo diretamente o Supabase (BaaS)** para este primeiro ciclo de maturidade do sistema.

Não introduziremos um servidor NestJS, Redis ou infraestrutura paga de containers neste momento.

## Justificativa (Por que Supabase direto?)
1. **Redução de Custo e Infraestrutura:** Para até 10 lojas, o Supabase fornece Banco de Dados (PostgreSQL), Autenticação e Storage em um plano Free/Pro com custo altamente previsível.
2. **Segurança Viável (RLS):** O PostgreSQL permite o uso rigoroso de RLS (Row Level Security). Quando bem configurado, o RLS impede que o Frontend modifique ou acesse dados indevidos, atuando com o mesmo nível de proteção que uma camada de controle backend.
3. **Time-to-Market:** Reescrever todo o sistema para NestJS agora congelaria a entrega de valor (features) por meses.
4. **Hospedagem Front-end:** Uma SPA em React construída pelo Vite é facilmente hospedável e escalável gratuitamente no Cloudflare Pages.

## Consequências
- **Positivas:** Manutenção barata, deploy rápido, foco do esforço nas regras de negócio em vez de configuração de servidores.
- **Negativas / Atenção:** 
  - Toda regra de permissão deve OBRIGATORIAMENTE ser refletida no banco de dados via RLS. Não se pode confiar apenas em validações no React.
  - Regras de negócio muito complexas (como integrações financeiras pesadas) podem exigir "Edge Functions" do Supabase.
  - O AppContext global do React tende a inchar e deve ser rigorosamente vigiado e refatorado em *hooks* especializados.
