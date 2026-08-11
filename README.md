# TimeTrack — Saída de Equipes (GERE/GOMAN/GSTC)

Site para o técnico de obras informar a saída das equipes de campo e para a
gestão acompanhar em tempo real quem saiu até 08:30 e quem não saiu, por
base.

Stack: Quasar (Vue 3) + Bun + Neon (Postgres) + Vercel (frontend estático +
Serverless Functions em `api/`).

## Configuração inicial

1. Crie um banco no [Neon](https://neon.tech) e copie a connection string.
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`
   (um valor aleatório longo).
3. Rode o schema do banco (`db/schema.sql`) no SQL editor do Neon.
4. Instale as dependências:

```bash
bun install
```

5. Crie o primeiro usuário admin:

```bash
bun run seed
```

Isso imprime o usuário/senha do admin (padrão `admin` / `admin123`, ou os
valores de `ADMIN_USUARIO`/`ADMIN_SENHA` se definidos no `.env`).

## Rodando localmente

Opção A — sem precisar de conta na Vercel (recomendado no dia a dia), em
dois terminais:

```bash
bun run dev:api   # sobe as funções de api/ em localhost:3001
bun run dev       # sobe o Quasar em localhost:9000, com proxy de /api -> :3001
```

Opção B — [Vercel CLI](https://vercel.com/docs/cli) (pede login na sua
conta Vercel na primeira vez), sobe frontend e `/api/*` juntos:

```bash
bunx vercel dev
```

> `quasar dev` sozinho (sem o `dev:api` ou o `vercel dev`) não executa as
> funções de `api/` — o painel vai carregar mas login e dados vão falhar.

## Deploy

Publique o projeto no Vercel (`vercel` ou via integração com Git) e
configure as variáveis de ambiente `DATABASE_URL` e `JWT_SECRET` no painel
do projeto. O build usa Bun (`vercel.json`).

## Estrutura

- `src/` — app Quasar (frontend)
- `api/` — Vercel Serverless Functions (backend)
- `db/schema.sql` — schema do Postgres/Neon
- `scripts/seed.ts` — cria o primeiro usuário admin

## Perfis

- **admin**: cadastra bases, equipes e usuários (técnicos/admins); também
  acessa o Apontamento de qualquer base (escolhe a base na própria tela).
- **técnico**: vinculado a uma base, apontar e edita a saída das equipes da
  própria base, na tela **Apontamento**.

Login é obrigatório tanto para apontar saída quanto para ver o painel de
Monitoramento e o Histórico.
