# Catalisti — Gestão de Projetos

Painel organizacional dos projetos da Catalisti: acompanhamento executivo por cliente, integração
com ClickUp, visão em Gantt e exportação de relatório em PDF no mesmo padrão visual usado hoje
pelo time.

## Stack

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS 4
- **Prisma** + **Postgres** (Neon / Vercel Postgres)
- **Auth.js (NextAuth v5)** com login por e-mail/senha e 3 papéis: `ADMIN`, `INTERNAL`, `CLIENT`
  (cliente só enxerga o(s) projeto(s) do seu próprio `clientId`)
- **ClickUp REST API** (token pessoal) para status/vencimento ao vivo das tarefas
- **@react-pdf/renderer** para gerar o relatório em PDF (3 páginas: visão executiva, Gantt,
  leitura operacional)

## Setup local

1. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL`: string de conexão Postgres (Neon, Vercel Postgres, etc.)
   - `AUTH_SECRET`: gere com `openssl rand -base64 33`
   - `CLICKUP_API_TOKEN`: token pessoal em **ClickUp → Configurações → Apps**

2. Instale as dependências e gere o client do Prisma:

   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

   O seed cria um projeto de exemplo ("Cliente Demo") com dados fictícios seguindo o mesmo padrão
   de relatório, um usuário admin (`admin@catalisti.com.br` / `catalisti123`) e um usuário de
   cliente (`cliente@clientedemo.com.br` / `clientedemo123`) — troque as senhas depois do primeiro
   acesso.

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Modelo de dados (resumo)

- **Client**: o cliente da Catalisti (ex: um empreendimento ou marca atendida).
- **Project**: um painel/contrato desse cliente, com `briefingDate` (marco de referência) e
  `cutoffDate` (data de corte / "hoje" do relatório).
- **Front** (frente): uma vertical do projeto (Web, Social Media, Performance, Motin…), com
  responsável (`vendorName`) e cor exibida no Gantt.
- **Deliverable** (entrega/etapa): uma linha do Gantt. A data-limite pode vir de:
  - uma regra de SLA (`slaDays` + `slaDayType` dias úteis/corridos a partir de um gatilho —
    briefing do projeto, kickoff, condições de início ou marco de ciclo), calculada
    automaticamente (`src/lib/business-days.ts` e `src/lib/sla.ts`); ou
  - datas manuais (`startDateOverride` / `endDateOverride`), para quando não há regra contratual
    fixa; ou
  - o próprio ClickUp, quando `clickupTaskId` está preenchido (o status e o vencimento reais são
    puxados ao vivo da API do ClickUp e combinados com o prazo contratual calculado para decidir
    entre "em dia", "atraso operacional" e "atraso contratual").

Essa lógica é centralizada em `src/lib/project-data.ts` (`loadProjectView`) e usada tanto pelas
páginas do site quanto pelo gerador de PDF, para garantir que o relatório baixado sempre bata com
o que está na tela.

## Papéis e acesso

- `ADMIN` / `INTERNAL`: acesso total, incluindo `/admin` para cadastrar clientes, projetos, frentes
  e entregas.
- `CLIENT`: só vê os projetos do `clientId` vinculado ao seu usuário, em modo leitura (sem acesso a
  `/admin`).

## Deploy (Vercel)

1. Suba o repositório para o GitHub.
2. Importe o projeto no time Vercel e configure as mesmas variáveis de ambiente do `.env`.
3. Rode as migrations contra o banco de produção (`npx prisma migrate deploy`).

## Observação sobre esta pasta (Drive compartilhado)

Este projeto foi desenvolvido diretamente nesta pasta do Drive compartilhado, a pedido do usuário.
Duas limitações reais dessa pasta (por ela estar sincronizada) e como foram contornadas:

- **`npm install` pode falhar/corromper arquivos** se rodado direto aqui, especialmente com várias
  instalações concorrentes usando o cache global do npm. Contorno usado: instalar as dependências
  em uma pasta local temporária (com `--cache` isolado) e depois copiar `node_modules` para cá.
- **O Turbopack (bundler padrão do `next dev`/`next build` no Next.js 16) não funciona nesta
  pasta**: ele precisa criar *junction points* (um tipo de link simbólico do Windows) dentro de
  `node_modules`, e o driver desse Drive compartilhado não suporta essa operação (erro "failed to
  create junction point ... Função incorreta"). **Por isso os scripts `dev` e `build` no
  `package.json` usam a flag `--webpack`**, que usa o bundler clássico do Next.js e não precisa de
  junctions. Não remova essa flag enquanto o projeto continuar nesta pasta.

Se algum dia o projeto for movido para uma pasta local ou for clonado via Git em outra máquina, o
`--webpack` deixa de ser necessário (mas não atrapalha se for mantido).
