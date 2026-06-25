# Manual de Backup e Restauração (PIA Oftalmo)

Como a infraestrutura atual utiliza a camada gratuita/base do **Supabase**, os backups automáticos com restauração com 1-clique (Point in Time Recovery - PITR) **não estão habilitados por padrão**.

É dever do gestor da clínica garantir a extração regular dos dados para prevenir a perda total em caso de desastres.

## 1. Rotina de Backup Recomendada
**Frequência:** Diária (ao fechar o expediente) ou Semanal (aos sábados).
**Responsável:** Administrador do Sistema.

### Passo a passo para Exportar o Banco de Dados
1. Instale a ferramenta de linha de comando oficial do Supabase (Supabase CLI) na máquina do administrador.
2. Acesse o terminal e faça login:
   ```bash
   supabase login
   ```
3. Vincule a pasta local ao projeto remoto (você precisará do `Reference ID` e da senha do banco de dados, disponíveis nas configurações do painel):
   ```bash
   supabase link --project-ref <seu-project-ref>
   ```
4. Execute o dump de dados e esquema para um arquivo `.sql`:
   ```bash
   supabase db dump --data-only -f backup_dados_$(date +%F).sql
   ```
   *Nota: Esse comando baixa apenas os dados (`--data-only`). Se quiser a estrutura também, remova a flag. O arquivo salvo terá a data no nome.*

### Passo a passo para Exportar os Arquivos (Storage)
Os anexos, receitas e laudos armazenados no **Supabase Storage** devem ser copiados à parte usando scripts com a AWS S3 CLI (visto que o Storage é compatível com protocolo S3) ou via uma ferramenta visual de sincronização de S3.

## 2. Restauração (Restore)
Se ocorrer uma falha catastrófica:
1. Abra um projeto Supabase novo ou limpo.
2. Execute os scripts de migração (estrutura) da pasta `supabase/migrations`.
3. Para importar os dados, acesse o banco via `psql` e execute o arquivo `.sql` baixado:
   ```bash
   psql -h aws-0-sa-east-1.pooler.supabase.com -p 5432 -d postgres -U postgres.<seu-project-ref> -f backup_dados_YYYY-MM-DD.sql
   ```

## 3. Considerações de Segurança (LGPD)
- **Criptografia:** O arquivo `.sql` exportado contém dados clínicos altamente sensíveis. Ele **NUNCA** deve ser salvo em pendrives sem senha ou serviços de nuvem pessoais (como Google Drive pessoal).
- Sugerimos compactar o arquivo com senha forte (ex: usando 7-Zip ou ferramenta similar com AES-256) antes de armazenar no cofre digital da clínica.
