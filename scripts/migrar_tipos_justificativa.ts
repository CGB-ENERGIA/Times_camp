// Amplia a restrição de justificativas.tipo para: FALTA, ATRASO, FOLGA_COMPENSADA, FERIADO.
// Uso: bun run scripts/migrar_tipos_justificativa.ts  (lê DATABASE_URL do .env)
import { sql } from '../api/_lib/db';

await sql`
  DO $$
  DECLARE c text;
  BEGIN
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'justificativas'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%tipo%'
    LOOP
      EXECUTE format('ALTER TABLE justificativas DROP CONSTRAINT %I', c);
    END LOOP;
  END $$;
`;

await sql`
  ALTER TABLE justificativas
    ADD CONSTRAINT justificativas_tipo_check
    CHECK (tipo IN ('FALTA', 'ATRASO', 'FOLGA_COMPENSADA', 'FERIADO'))
`;

const restricoes = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'justificativas'::regclass AND contype = 'c'
`;
console.log('Restrições atuais em justificativas:', restricoes);
