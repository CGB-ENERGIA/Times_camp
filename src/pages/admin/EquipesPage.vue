<template>
  <q-page class="q-pa-md">
    <!-- Cabeçalho -->
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Equipes</div>
      <q-select
        v-model="filtroBaseId"
        :options="opcoesBase"
        emit-value
        map-options
        label="Base"
        filled
        dense
        clearable
        style="min-width: 200px"
        @update:model-value="carregar"
      />
      <q-select
        v-model="filtroTipo"
        :options="tipos"
        label="Tipo"
        filled
        dense
        clearable
        style="min-width: 130px"
      />
      <q-input
        v-model="busca"
        dense
        filled
        clearable
        debounce="150"
        placeholder="Buscar equipe, supervisor..."
        style="min-width: 240px"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-space />
      <div class="text-caption text-grey-6">{{ equipesFiltradas.length }} equipe(s)</div>

      <!-- Importar Excel -->
      <q-btn-dropdown color="secondary" icon="upload_file" label="Importar" unelevated>
        <q-list dense>
          <q-item clickable v-close-popup @click="baixarTemplate">
            <q-item-section avatar><q-icon name="download" /></q-item-section>
            <q-item-section>Baixar template</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="inputExcel?.click()">
            <q-item-section avatar><q-icon name="upload" /></q-item-section>
            <q-item-section>Importar planilha</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <input ref="inputExcel" type="file" accept=".xlsx" style="display:none" @change="onExcelSelecionado" />

      <q-btn color="primary" icon="add" label="Nova equipe" unelevated @click="abrirNovo" />
    </div>

    <!-- Barra de lote (aparece quando há selecionadas) -->
    <transition name="slide-down">
      <q-card v-if="selecionadas.length > 0" flat bordered class="q-mb-md bg-blue-grey-10">
        <q-card-section class="row items-center q-gutter-sm q-pa-sm">
          <q-icon name="check_box" color="primary" />
          <span class="text-subtitle2">{{ selecionadas.length }} equipe(s) selecionada(s)</span>
          <q-separator vertical />
          <q-input
            v-model="loteSupervisor"
            label="Definir supervisor"
            dense
            filled
            clearable
            style="min-width: 200px"
            hint="Deixe em branco para não alterar"
          />
          <q-input
            v-model="loteCoordenador"
            label="Definir coordenador"
            dense
            filled
            clearable
            style="min-width: 200px"
            hint="Deixe em branco para não alterar"
          />
          <q-btn
            color="primary"
            label="Aplicar"
            :loading="aplicando"
            :disable="!loteSupervisor && !loteCoordenador"
            unelevated
            @click="aplicarLote"
          />
          <q-separator vertical />
          <q-btn
            color="positive"
            icon="check_circle"
            label="Ativar"
            :loading="alterandoStatus"
            unelevated
            @click="alterarStatusLote(true)"
          />
          <q-btn
            color="negative"
            icon="cancel"
            label="Desativar"
            :loading="alterandoStatus"
            unelevated
            @click="alterarStatusLote(false)"
          />
          <q-btn flat label="Cancelar" @click="selecionadas = []" />
        </q-card-section>
      </q-card>
    </transition>

    <!-- Tabela -->
    <q-table
      v-model:selected="selecionadas"
      :rows="equipesFiltradas"
      :columns="colunas"
      row-key="id"
      :loading="carregando"
      selection="multiple"
      flat
      bordered
      :pagination="{ rowsPerPage: 25, sortBy: 'identificador' }"
      class="equipes-table"
    >
      <!-- Tipo -->
      <template #body-cell-tipo="props">
        <q-td :props="props" class="celula-editavel">
          <q-badge outline color="grey-6" :label="props.row.tipo" />
          <q-popup-edit
            :model-value="props.row.tipo"
            buttons label-set="Salvar" label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'tipo', val)"
          >
            <template #default="scope">
              <q-select v-model="scope.value" :options="tipos" label="Tipo" dense autofocus />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Horário -->
      <template #body-cell-horario="props">
        <q-td :props="props" class="celula-editavel">
          {{ props.row.horario_padrao_saida?.slice(0, 5) }}
          <q-popup-edit
            :model-value="props.row.horario_padrao_saida?.slice(0, 5)"
            buttons label-set="Salvar" label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'horarioPadrao', val)"
          >
            <template #default="scope">
              <q-input v-model="scope.value" type="time" label="Horário de saída" dense autofocus />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Supervisor -->
      <template #body-cell-supervisor="props">
        <q-td :props="props" class="celula-editavel">
          <span :class="props.row.supervisor ? '' : 'text-grey-5'">{{ props.row.supervisor || '—' }}</span>
          <q-popup-edit
            :model-value="props.row.supervisor ?? ''"
            buttons label-set="Salvar" label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'supervisor', val)"
          >
            <template #default="scope">
              <q-input v-model="scope.value" label="Supervisor" dense autofocus hint="Ex: MIKEIAS" />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Coordenador -->
      <template #body-cell-coordenador="props">
        <q-td :props="props" class="celula-editavel">
          <span :class="props.row.coordenador ? '' : 'text-grey-5'">{{ props.row.coordenador || '—' }}</span>
          <q-popup-edit
            :model-value="props.row.coordenador ?? ''"
            buttons label-set="Salvar" label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'coordenador', val)"
          >
            <template #default="scope">
              <q-input v-model="scope.value" label="Coordenador" dense autofocus hint="Ex: RICARDO" />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Status -->
      <template #body-cell-ativo="props">
        <q-td :props="props">
          <q-badge :color="props.row.ativo ? 'positive' : 'grey-6'" :label="props.row.ativo ? 'Ativa' : 'Inativa'" />
        </q-td>
      </template>

      <!-- Ações -->
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn flat dense round icon="edit" size="sm" @click="abrirEdicao(props.row)">
            <q-tooltip>Editar todos os campos</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width text-center text-grey-6 q-pa-lg">Nenhuma equipe encontrada.</div>
      </template>
    </q-table>

    <div class="text-caption text-grey-6 q-mt-sm">
      <q-icon name="info" size="14px" />
      Clique em qualquer célula de Tipo, Horário, Supervisor ou Coordenador para editar inline.
      Use os checkboxes para editar várias de uma vez.
    </div>

    <!-- Diálogo completo -->
    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">{{ editando ? 'Editar equipe' : 'Nova equipe' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="forma.baseId" :options="opcoesBase" emit-value map-options label="Base" filled />
          <q-select v-model="forma.tipo" :options="tipos" label="Tipo" filled />
          <q-input v-model="forma.identificador" label="Nome da equipe" filled />
          <q-input v-model="forma.horarioPadrao" label="Horário de saída padrão" type="time" filled />
          <q-input v-model="forma.supervisor" label="Supervisor" filled />
          <q-input v-model="forma.coordenador" label="Coordenador" filled />
          <q-toggle v-if="editando" v-model="forma.ativo" label="Ativa" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="editando" flat color="negative" icon="delete" label="Excluir" @click="excluir" />
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" :loading="salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Diálogo preview de importação -->
    <q-dialog v-model="dialogoImport" persistent>
      <q-card style="width: 640px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-subtitle1">Importar planilha</div>
          <q-space />
          <q-badge color="primary" :label="`${linhasImport.length} linha(s) encontrada(s)`" />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-table
            :rows="linhasImport"
            :columns="colunasImport"
            row-key="identificador"
            flat
            dense
            :pagination="{ rowsPerPage: 10 }"
          >
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.status === 'ok' ? 'positive' : props.row.status === 'novo' ? 'warning' : 'negative'"
                  :label="props.row.status === 'ok' ? 'Vai atualizar' : props.row.status === 'novo' ? 'Não encontrada' : 'Sem alteração'"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
        <q-card-section class="text-caption text-grey-6">
          Apenas as linhas marcadas como "Vai atualizar" serão salvas.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="dialogoImport = false" />
          <q-btn
            color="primary"
            :label="`Importar ${linhasImport.filter(l => l.status === 'ok').length} equipe(s)`"
            :loading="importando"
            :disable="linhasImport.filter(l => l.status === 'ok').length === 0"
            @click="confirmarImport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import ExcelJS from 'exceljs';
import { api } from '@/boot/axios';

interface Equipe {
  id: number;
  base_id: number;
  tipo: string;
  identificador: string;
  horario_padrao_saida: string;
  supervisor: string | null;
  coordenador: string | null;
  ativo: boolean;
}

interface Base {
  id: number;
  nome: string;
}

interface LinhaImport {
  identificador: string;
  supervisor: string;
  coordenador: string;
  status: 'ok' | 'novo' | 'sem_alteracao';
  equipeId: number | undefined;
}

const tipos = ['GERE', 'GOMAN', 'GSTC'];
const $q = useQuasar();

const equipes = ref<Equipe[]>([]);
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const filtroBaseId = ref<number | null>(null);
const filtroTipo = ref<string | null>(null);
const busca = ref('');
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Equipe | null>(null);
const salvando = ref(false);
const selecionadas = ref<Equipe[]>([]);
const loteSupervisor = ref('');
const loteCoordenador = ref('');
const aplicando = ref(false);
const alterandoStatus = ref(false);
const inputExcel = ref<HTMLInputElement | null>(null);
const dialogoImport = ref(false);
const linhasImport = ref<LinhaImport[]>([]);
const importando = ref(false);

const forma = ref({
  baseId: null as number | null,
  tipo: 'GERE',
  identificador: '',
  horarioPadrao: '08:30',
  supervisor: '',
  coordenador: '',
  ativo: true,
});

const equipesFiltradas = computed(() => {
  const q = (busca.value ?? '').toLowerCase().trim();
  return equipes.value.filter((e) => {
    if (filtroTipo.value && e.tipo !== filtroTipo.value) return false;
    if (!q) return true;
    return (
      e.identificador.toLowerCase().includes(q) ||
      (e.supervisor ?? '').toLowerCase().includes(q) ||
      (e.coordenador ?? '').toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q)
    );
  });
});

const colunas: QTableColumn[] = [
  { name: 'identificador', label: 'Equipe', field: 'identificador', align: 'left', sortable: true },
  {
    name: 'base',
    label: 'Base',
    field: (row: Equipe) => opcoesBase.value.find((b) => b.value === row.base_id)?.label ?? '-',
    align: 'left',
    sortable: true,
  },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  {
    name: 'horario',
    label: 'Horário',
    field: (row: Equipe) => row.horario_padrao_saida?.slice(0, 5),
    align: 'left',
  },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left', sortable: true },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left', sortable: true },
  { name: 'ativo', label: 'Status', field: 'ativo', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' },
];

const colunasImport: QTableColumn[] = [
  { name: 'identificador', label: 'Equipe', field: 'identificador', align: 'left' },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left' },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left' },
  { name: 'status', label: 'Resultado', field: 'status', align: 'left' },
];

async function carregarBases() {
  const { data } = await api.get<Base[]>('/bases');
  opcoesBase.value = data.map((b) => ({ label: b.nome, value: b.id }));
}

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<Equipe[]>('/equipes', {
      params: { baseId: filtroBaseId.value || undefined },
    });
    equipes.value = data;
  } finally {
    carregando.value = false;
  }
}

async function salvarCampo(equipe: Equipe, campo: string, valor: string) {
  try {
    const payload: Record<string, unknown> = {
      tipo: equipe.tipo,
      identificador: equipe.identificador,
      horarioPadrao: equipe.horario_padrao_saida.slice(0, 5),
      supervisor: equipe.supervisor,
      coordenador: equipe.coordenador,
      ativo: equipe.ativo,
      [campo]: valor || null,
    };
    await api.put(`/equipes/${equipe.id}`, payload);
    const idx = equipes.value.findIndex((e) => e.id === equipe.id);
    if (idx !== -1) {
      const atualizado: Equipe = { ...equipes.value[idx]! };
      if (campo === 'horarioPadrao') {
        atualizado.horario_padrao_saida = valor;
      } else {
        (atualizado as unknown as Record<string, unknown>)[campo] = valor || null;
      }
      equipes.value[idx] = atualizado;
    }
    $q.notify({ type: 'positive', message: 'Salvo!', timeout: 1000 });
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao salvar.' });
  }
}

async function aplicarLote() {
  if (!loteSupervisor.value && !loteCoordenador.value) return;
  aplicando.value = true;
  try {
    await Promise.all(
      selecionadas.value.map((eq) =>
        api.put(`/equipes/${eq.id}`, {
          tipo: eq.tipo,
          identificador: eq.identificador,
          horarioPadrao: eq.horario_padrao_saida.slice(0, 5),
          supervisor: loteSupervisor.value || eq.supervisor,
          coordenador: loteCoordenador.value || eq.coordenador,
          ativo: eq.ativo,
        }),
      ),
    );
    $q.notify({
      type: 'positive',
      message: `${selecionadas.value.length} equipe(s) atualizadas!`,
    });
    selecionadas.value = [];
    loteSupervisor.value = '';
    loteCoordenador.value = '';
    await carregar();
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao aplicar em lote.' });
  } finally {
    aplicando.value = false;
  }
}

async function alterarStatusLote(ativo: boolean) {
  alterandoStatus.value = true;
  try {
    await Promise.all(
      selecionadas.value.map((eq) =>
        api.put(`/equipes/${eq.id}`, {
          tipo: eq.tipo,
          identificador: eq.identificador,
          horarioPadrao: eq.horario_padrao_saida.slice(0, 5),
          supervisor: eq.supervisor,
          coordenador: eq.coordenador,
          ativo,
        }),
      ),
    );
    $q.notify({
      type: 'positive',
      message: `${selecionadas.value.length} equipe(s) ${ativo ? 'ativadas' : 'desativadas'}!`,
    });
    selecionadas.value = [];
    await carregar();
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao alterar status.' });
  } finally {
    alterandoStatus.value = false;
  }
}

// ---- Excel: baixar template ----
async function baixarTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Equipes');

  ws.columns = [
    { header: 'Identificador', key: 'id', width: 22 },
    { header: 'Base', key: 'base', width: 18 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Supervisor', key: 'supervisor', width: 20 },
    { header: 'Coordenador', key: 'coordenador', width: 20 },
  ];

  // Cabeçalho
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.height = 22;

  // Dados atuais
  for (const eq of equipes.value) {
    const base = opcoesBase.value.find((b) => b.value === eq.base_id)?.label ?? '';
    ws.addRow({
      id: eq.identificador,
      base,
      tipo: eq.tipo,
      supervisor: eq.supervisor ?? '',
      coordenador: eq.coordenador ?? '',
    });
  }

  // Nota
  ws.addRow([]);
  ws.addRow(['Instruções:', 'Edite as colunas Supervisor e Coordenador. Não altere o Identificador.']);
  ws.getRow(ws.rowCount).font = { italic: true, color: { argb: 'FF6B7280' } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipes-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Excel: importar ----
async function onExcelSelecionado(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (inputExcel.value) inputExcel.value.value = '';

  try {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) {
      $q.notify({ type: 'negative', message: 'Planilha vazia ou inválida.' });
      return;
    }

    // Detecta colunas pelo cabeçalho (linha 1)
    const headerRow = ws.getRow(1);
    const colIdx: Record<string, number> = {};
    headerRow.eachCell((cell, col) => {
      const v = String(cell.value ?? '').trim().toLowerCase();
      if (v === 'identificador') colIdx['identificador'] = col;
      if (v === 'supervisor') colIdx['supervisor'] = col;
      if (v === 'coordenador') colIdx['coordenador'] = col;
    });

    if (!colIdx['identificador']) {
      $q.notify({ type: 'negative', message: 'Coluna "Identificador" não encontrada na planilha.' });
      return;
    }

    const mapa = new Map(equipes.value.map((e) => [e.identificador.toUpperCase(), e]));
    const linhas: LinhaImport[] = [];

    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      const ident = String(row.getCell(colIdx['identificador']!).value ?? '').trim();
      if (!ident) return;
      const supervisor = String(row.getCell(colIdx['supervisor'] ?? 0).value ?? '').trim();
      const coordenador = String(row.getCell(colIdx['coordenador'] ?? 0).value ?? '').trim();
      const equipe = mapa.get(ident.toUpperCase());

      let status: LinhaImport['status'];
      if (!equipe) {
        status = 'novo';
      } else if (!supervisor && !coordenador) {
        // linha sem dados — nada a importar
        status = 'sem_alteracao';
      } else {
        // tem dados preenchidos → vai importar (mesmo que sejam os mesmos do banco)
        status = 'ok';
      }

      linhas.push({ identificador: ident, supervisor, coordenador, status, equipeId: equipe?.id });
    });

    linhasImport.value = linhas;
    dialogoImport.value = true;
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao ler o arquivo. Certifique-se de que é um .xlsx válido.' });
  }
}

async function confirmarImport() {
  const paraAtualizar = linhasImport.value.filter((l) => l.status === 'ok');
  importando.value = true;
  try {
    await Promise.all(
      paraAtualizar.map((linha) => {
        const eq = equipes.value.find((e) => e.id === linha.equipeId)!;
        return api.put(`/equipes/${linha.equipeId}`, {
          tipo: eq.tipo,
          identificador: eq.identificador,
          horarioPadrao: eq.horario_padrao_saida.slice(0, 5),
          supervisor: linha.supervisor || null,
          coordenador: linha.coordenador || null,
          ativo: eq.ativo,
        });
      }),
    );
    $q.notify({ type: 'positive', message: `${paraAtualizar.length} equipe(s) importadas com sucesso!` });
    dialogoImport.value = false;
    await carregar();
  } catch {
    $q.notify({ type: 'negative', message: 'Erro durante a importação.' });
  } finally {
    importando.value = false;
  }
}

function abrirNovo() {
  editando.value = null;
  forma.value = { baseId: filtroBaseId.value, tipo: 'GERE', identificador: '', horarioPadrao: '08:30', supervisor: '', coordenador: '', ativo: true };
  dialogoAberto.value = true;
}

function abrirEdicao(equipe: Equipe) {
  editando.value = equipe;
  forma.value = {
    baseId: equipe.base_id,
    tipo: equipe.tipo,
    identificador: equipe.identificador,
    horarioPadrao: equipe.horario_padrao_saida.slice(0, 5),
    supervisor: equipe.supervisor ?? '',
    coordenador: equipe.coordenador ?? '',
    ativo: equipe.ativo,
  };
  dialogoAberto.value = true;
}

async function salvar() {
  salvando.value = true;
  try {
    if (editando.value) {
      await api.put(`/equipes/${editando.value.id}`, {
        baseId: forma.value.baseId,
        tipo: forma.value.tipo,
        identificador: forma.value.identificador,
        horarioPadrao: forma.value.horarioPadrao,
        supervisor: forma.value.supervisor || null,
        coordenador: forma.value.coordenador || null,
        ativo: forma.value.ativo,
      });
    } else {
      await api.post('/equipes', {
        baseId: forma.value.baseId,
        tipo: forma.value.tipo,
        identificador: forma.value.identificador,
        horarioPadrao: forma.value.horarioPadrao,
        supervisor: forma.value.supervisor || null,
        coordenador: forma.value.coordenador || null,
      });
    }
    dialogoAberto.value = false;
    await carregar();
  } finally {
    salvando.value = false;
  }
}

async function excluir() {
  if (!editando.value) return;
  const equipe = editando.value;
  $q.dialog({
    title: 'Excluir equipe',
    message: `Tem certeza que deseja excluir "${equipe.identificador}"? Esta ação não pode ser desfeita.`,
    cancel: { label: 'Cancelar', flat: true },
    persistent: true,
    ok: { label: 'Excluir', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/equipes/${equipe.id}`);
      dialogoAberto.value = false;
      $q.notify({ type: 'positive', message: 'Equipe excluída.' });
      await carregar();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        $q.dialog({
          title: 'Não foi possível excluir',
          message: 'Esta equipe possui registros de saída vinculados e não pode ser excluída. Deseja desativá-la em vez disso?',
          cancel: { label: 'Não', flat: true },
          ok: { label: 'Desativar', color: 'warning', unelevated: true },
          persistent: true,
        }).onOk(async () => {
          await api.put(`/equipes/${equipe.id}`, {
            tipo: equipe.tipo,
            identificador: equipe.identificador,
            horarioPadrao: equipe.horario_padrao_saida.slice(0, 5),
            supervisor: equipe.supervisor,
            coordenador: equipe.coordenador,
            ativo: false,
          });
          dialogoAberto.value = false;
          $q.notify({ type: 'warning', message: 'Equipe desativada.' });
          await carregar();
        });
      } else {
        $q.notify({ type: 'negative', message: 'Erro ao excluir equipe.' });
      }
    }
  });
}

onMounted(async () => {
  await carregarBases();
  await carregar();
});
</script>

<style scoped>
.celula-editavel {
  cursor: pointer;
}
.celula-editavel:hover::after {
  content: ' ✏';
  font-size: 10px;
  opacity: 0.45;
}
:deep(.equipes-table .q-table tbody td) {
  padding-top: 5px;
  padding-bottom: 5px;
}
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
