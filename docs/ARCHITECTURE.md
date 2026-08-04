# Arquitetura

## Domínios

1. **Produção:** aviários, lotes, ficha diária, coleta e classificação de ovos, outras produções.
2. **Sanidade:** catálogo de vacinas, aplicações, tratamentos, doenças, exames, carência e pragas.
3. **Suprimentos:** fornecedores, estoque, movimentos e compras com entrada automática ao recebimento.
4. **Comercial:** clientes, pedidos, entregas, pagamentos e origem por lote.
5. **Financeiro:** despesas, receitas e resultado por período.
6. **Operação:** biossegurança, visitantes, ambiência, água, tarefas, manutenção e documentos.
7. **Governança:** usuários, perfis, auditoria e isolamento de dados por propriedade.

## Segurança

- Senhas armazenadas com bcrypt.
- JWT com validade de 12 horas.
- CORS limitado às URLs configuradas.
- Rate limit, Helmet e validação Zod.
- Todas as consultas são limitadas por `farmId`.
- Logs de auditoria para cadastros e alterações importantes.

## PWA e celular

O front-end é responsivo e instalável. A estratégia `NetworkFirst` mantém dados recentes da API por curto período, mas operações de escrita exigem conexão para evitar divergências. O Capacitor pode empacotar o mesmo front-end para lojas móveis.
