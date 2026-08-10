-- Schema para o painel de saída de equipes de campo (LM/LV/PODA/TAT)
-- Rodar uma vez no banco Neon (SQL editor do console Neon, ou via psql/neon cli)

create type equipe_tipo as enum ('LM', 'LV', 'PODA', 'TAT');
create type user_role as enum ('admin', 'tecnico');

create table bases (
  id serial primary key,
  nome text not null,
  codigo text unique not null,
  ativo boolean not null default true
);

create table usuarios (
  id serial primary key,
  nome text not null,
  usuario text unique not null,
  senha_hash text not null,
  role user_role not null,
  base_id integer references bases(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table equipes (
  id serial primary key,
  base_id integer not null references bases(id),
  tipo equipe_tipo not null,
  identificador text not null,
  ativo boolean not null default true,
  unique (base_id, identificador)
);

create table saidas (
  id serial primary key,
  equipe_id integer not null references equipes(id),
  data date not null,
  hora_saida time not null,
  registrado_por integer not null references usuarios(id),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipe_id, data)
);

create index idx_equipes_base on equipes(base_id);
create index idx_saidas_data on saidas(data);
create index idx_saidas_equipe on saidas(equipe_id);
create index idx_usuarios_base on usuarios(base_id);
