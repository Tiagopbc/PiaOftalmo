# Catálogo Oficial de Status

O projeto exigirá uma clara separação entre os status de intenção de compra, efetivação da venda, andamento laboratorial e liquidação financeira.

## 1. Orçamento (Quote)
Define o processo pré-venda.
- `Rascunho`: Sendo preenchido pelo vendedor, ainda sem proposta final.
- `Enviado/Impresso`: Proposta apresentada ao paciente.
- `Aprovado`: Cliente aceitou. Este status engatilha a conversão do Orçamento em Venda (Sale).
- `Recusado`: Cliente não aceitou a proposta.
- `Expirado`: Orçamento passou do prazo de validade (ex: 15 dias).

## 2. Venda (Sale)
Define o acordo comercial fechado.
- `Aberta`: Venda efetivada, mas aguardando pagamento ou produção da OS.
- `Concluída`: Pagamento quitado E produto entregue.
- `Cancelada`: Venda anulada.

## 3. Pagamento (Payment)
Situação financeira atrelada à Venda.
- `Pendente`: Venda criada, dinheiro ainda não recebido.
- `Parcial`: O cliente deu um sinal de entrada, mas ainda há saldo devedor.
- `Pago`: Todo o montante da venda foi liquidado.
- `Estornado`: Dinheiro foi devolvido ao cliente.

## 4. Ordem de Serviço (OS / Optical Order)
Fluxo de produção laboratorial e montagem (só existe se houver confecção).
- `Aguardando Laboratório`: OS criada e pendente de envio ao laboratório.
- `Em Produção`: Lentes em surfaçagem ou montagem no bloco.
- `Recebido / Controle de Qualidade`: Óculos voltou do laboratório e está sendo conferido na loja.
- `Aguardando Retirada`: Cliente foi notificado de que os óculos estão prontos.
- `Entregue`: O paciente buscou o óculos.

## 5. Garantia (Warranty)
Pós-venda para defeitos ou não adaptação.
- `Aberta`: Paciente reportou problema.
- `Em Análise`: Lente em avaliação pelo laboratório.
- `Concluída`: Lente trocada, devolvida ao cliente.
