# Granja Mafaldo — Gestão Integrada

Sistema web e aplicativo instalável (PWA) para a **Granja Mafaldo — Produtos do Campo**, com foco em produção de ovos caipiras, gestão de lotes, sanidade, biossegurança, estoque, compras, vendas e finanças.

## Principais módulos

- Painel com produção diária, taxa de postura, aves ativas, consumo de ração, mortalidade e resultado financeiro.
- Aviários, capacidade, lotes, linhagens, origem e ciclo produtivo.
- Ficha diária: plantel, mortalidade, descartes, ração, água, peso, temperatura, umidade e luz.
- Coleta e classificação de ovos: jumbo, extra, grande, médio, pequeno, trincado, sujo e descartado.
- Vacinas, aplicações, reforços, medicamentos, diagnósticos, carência e controle de pragas.
- Estoque de ração, medicamentos, vacinas, embalagens e materiais, com movimentação transacional.
- Compras, recebimentos e fornecedores.
- Clientes, vendas, entregas, pagamentos e rastreabilidade por lote.
- Gastos por categoria, competência, vencimento e fornecedor.
- Visitantes, veículos, biossegurança, ambiência e qualidade da água.
- Tarefas recorrentes, manutenção e biblioteca documental.
- Relatórios técnicos e financeiros com exportação CSV.
- Usuários com perfis: administrador, gerente, operador, veterinário e somente leitura.
- PWA instalável no Android, iPhone e desktop; estrutura compatível com Capacitor.

## Arquitetura

```text
apps/web   React + TypeScript + Vite + PWA + Capacitor
apps/api   Node.js + Express + Prisma + JWT
Neon       PostgreSQL gerenciado
Vercel     front-end
Render     API
```

## Execução local

```bash
npm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev:api
npm run dev:web
```

A API abre em `http://localhost:3333` e o front-end em `http://localhost:5173`.

## Variáveis necessárias

Consulte `.env.example` e `apps/web/.env.example`. Nunca publique senhas reais ou a URL completa do Neon no GitHub.

## Deploy

As instruções completas estão em [`docs/DEPLOY.md`](docs/DEPLOY.md).
