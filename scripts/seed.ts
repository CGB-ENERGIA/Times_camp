// Cria o primeiro usuário admin, caso ainda não exista.
// Uso: bun run seed
// Variáveis opcionais: ADMIN_USUARIO, ADMIN_SENHA, ADMIN_NOME

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não está definida (configure o .env)');
  process.exit(1);
}

const sql = neon(databaseUrl);

const usuario = process.env.ADMIN_USUARIO || 'admin';
const senha = process.env.ADMIN_SENHA || 'admin123';
const nome = process.env.ADMIN_NOME || 'Administrador';

async function main() {
  const existente = await sql`select id from usuarios where usuario = ${usuario}`;
  const jaExiste = existente[0];
  if (jaExiste) {
    console.log(`Usuário admin "${usuario}" já existe (id ${jaExiste.id}). Nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const rows = await sql`
    insert into usuarios (nome, usuario, senha_hash, role, base_id, ativo)
    values (${nome}, ${usuario}, ${senhaHash}, 'admin', null, true)
    returning id
  `;
  const criado = rows[0];
  if (!criado) {
    throw new Error('Falha ao criar usuário admin: nenhuma linha retornada');
  }

  console.log('Usuário admin criado com sucesso:');
  console.log(`  id: ${criado.id}`);
  console.log(`  usuário: ${usuario}`);
  console.log(`  senha: ${senha}`);
  console.log('Troque a senha depois de logar (via tela de Usuários).');
}

main().catch((err) => {
  console.error('Falha ao rodar o seed:', err);
  process.exit(1);
});
