<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Histórico de Saídas</div>
      <q-space />
      <q-btn color="primary" icon="file_download" label="Exportar Excel" unelevated @click="abrirExportacao" />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-3">
        <q-select
          v-model="filtroBaseId"
          :options="opcoesBase"
          emit-value
          map-options
          label="Base"
          filled
          dense
          clearable
          @update:model-value="carregar"
        />
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="dataInicio" type="date" label="De" filled dense @update:model-value="carregar" />
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="dataFim" type="date" label="Até" filled dense @update:model-value="carregar" />
      </div>
      <div class="col-12 col-sm-3 flex items-center">
        <q-btn flat dense icon="refresh" :loading="carregando" @click="carregar" />
      </div>
    </div>

    <q-table
      :rows="registros"
      :columns="colunasVisiveis"
      row-key="id"
      :loading="carregando"
      flat
      bordered
      :pagination="{ rowsPerPage: 20 }"
    >
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="corStatus(props.row)" :label="labelStatus(props.row)" />
        </q-td>
      </template>
      <template #body-cell-acoes="props">
        <q-td :props="props" auto-width>
          <q-btn flat dense round icon="edit" size="sm" color="primary" @click="abrirEdicao(props.row)" />
          <q-btn flat dense round icon="delete" size="sm" color="negative" class="q-ml-xs" @click="confirmarExclusao(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Diálogo de edição -->
    <q-dialog v-model="editDialogAberto">
      <q-card style="width: 360px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">Editar registro</div>
          <div class="text-caption text-grey-6">{{ editando?.tipo }} · {{ editando?.identificador }} — {{ editando?.data }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="editHora" type="time" label="Hora de saída" filled dense />
          <q-input v-model="editObs" label="Observação" filled dense clearable />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" :loading="salvandoEdicao" @click="salvarEdicao" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="exportDialogAberto">
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">Exportar para Excel</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-btn-toggle
            v-model="tipoPeriodo"
            spread
            no-caps
            dense
            unelevated
            toggle-color="primary"
            color="grey-8"
            :options="[
              { label: 'Semana', value: 'semana' },
              { label: 'Mês', value: 'mes' },
              { label: 'Data', value: 'data' },
            ]"
          />

          <q-input
            v-if="tipoPeriodo === 'semana'"
            v-model="dataReferencia"
            type="date"
            label="Qualquer dia da semana desejada"
            filled
            dense
          />
          <q-input
            v-if="tipoPeriodo === 'mes'"
            v-model="mesReferencia"
            mask="####-##"
            fill-mask="_"
            label="Mês (AAAA-MM)"
            placeholder="2026-08"
            filled
            dense
          />
          <q-input v-if="tipoPeriodo === 'data'" v-model="dataReferencia" type="date" label="Data" filled dense />

          <div class="text-caption text-grey-7">
            Período: <strong>{{ formatarDataBr(intervaloExportacao.inicio) }}</strong> até
            <strong>{{ formatarDataBr(intervaloExportacao.fim) }}</strong>
            <br />
            Base: <strong>{{ baseFiltradaLabel }}</strong>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Exportar" :loading="exportando" @click="exportarExcel" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { QTableColumn } from 'quasar';
import { useQuasar } from 'quasar';
import ExcelJS from 'exceljs';
import { api } from '@/boot/axios';
import { hojeStr } from '@/utils/date';
import { useAuthStore } from '@/stores/auth';

interface Registro {
  id: number;
  equipe_id: number;
  identificador: string;
  tipo: string;
  base_id: number;
  base_nome: string;
  horario_padrao_saida: string;
  supervisor: string | null;
  coordenador: string | null;
  data: string;
  hora_saida: string;
  observacao: string | null;
  registrado_por_nome: string;
}

interface BaseOpcao {
  id: number;
  nome: string;
}

const $q = useQuasar();
const auth = useAuthStore();

const registros = ref<Registro[]>([]);

// Edição
const editDialogAberto = ref(false);
const editando = ref<Registro | null>(null);
const editHora = ref('');
const editObs = ref('');
const salvandoEdicao = ref(false);

function abrirEdicao(row: Registro) {
  editando.value = row;
  editHora.value = row.hora_saida.slice(0, 5);
  editObs.value = row.observacao ?? '';
  editDialogAberto.value = true;
}

async function salvarEdicao() {
  if (!editando.value) return;
  salvandoEdicao.value = true;
  try {
    await api.put(`/saidas/${editando.value.id}`, {
      horaSaida: editHora.value,
      observacao: editObs.value || null,
    });
    editDialogAberto.value = false;
    await carregar();
    $q.notify({ type: 'positive', message: 'Registro atualizado.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao salvar.' });
  } finally {
    salvandoEdicao.value = false;
  }
}

function confirmarExclusao(row: Registro) {
  $q.dialog({
    title: 'Excluir registro',
    message: `Deseja excluir o apontamento de <b>${row.tipo} · ${row.identificador}</b> em ${row.data}?`,
    html: true,
    cancel: true,
    persistent: true,
    ok: { label: 'Excluir', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await api.delete(`/saidas/${row.id}`);
      await carregar();
      $q.notify({ type: 'positive', message: 'Registro excluído.' });
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao excluir.' });
    }
  });
}
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const filtroBaseId = ref<number | null>(null);
const dataInicio = ref('');
const dataFim = ref('');
const carregando = ref(false);

const exportDialogAberto = ref(false);
const tipoPeriodo = ref<'semana' | 'mes' | 'data'>('semana');
const dataReferencia = ref(hojeStr());
const mesReferencia = ref(hojeStr().slice(0, 7));
const exportando = ref(false);

const colunas: QTableColumn[] = [
  { name: 'data', label: 'Data', field: 'data', align: 'left', sortable: true },
  { name: 'base_nome', label: 'Base', field: 'base_nome', align: 'left', sortable: true },
  {
    name: 'equipe',
    label: 'Equipe',
    field: (row: Registro) => `${row.tipo} · ${row.identificador}`,
    align: 'left',
  },
  {
    name: 'hora_saida',
    label: 'Hora de Saída',
    field: (row: Registro) => row.hora_saida?.slice(0, 5),
    align: 'left',
  },
  {
    name: 'horario_padrao_saida',
    label: 'Limite',
    field: (row: Registro) => row.horario_padrao_saida?.slice(0, 5),
    align: 'left',
  },
  { name: 'status', label: 'Status', field: 'hora_saida', align: 'left' },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left', sortable: true },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left', sortable: true },
  { name: 'registrado_por_nome', label: 'Registrado por', field: 'registrado_por_nome', align: 'left' },
  { name: 'observacao', label: 'Observação', field: 'observacao', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'center' },
];

const colunasVisiveis = computed(() =>
  auth.isAdmin ? colunas : colunas.filter((c) => c.name !== 'acoes'),
);

function corStatus(row: Registro) {
  return row.hora_saida <= row.horario_padrao_saida ? 'positive' : 'negative';
}

function labelStatus(row: Registro) {
  return row.hora_saida <= row.horario_padrao_saida ? 'No prazo' : 'Atrasado';
}

function toISODate(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

function toMinutos(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatarDataBr(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function calcularSemana(dataStr: string): { inicio: string; fim: string } {
  const d = new Date(`${dataStr}T00:00:00`);
  const diaSemana = d.getDay(); // 0=domingo
  const deslocamentoSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(d);
  segunda.setDate(d.getDate() + deslocamentoSegunda);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  return { inicio: toISODate(segunda), fim: toISODate(domingo) };
}

function calcularMes(mesStr: string): { inicio: string; fim: string } {
  const [ano, mes] = mesStr.split('-').map(Number);
  const primeiroDia = new Date(ano as number, (mes as number) - 1, 1);
  const ultimoDia = new Date(ano as number, mes as number, 0);
  return { inicio: toISODate(primeiroDia), fim: toISODate(ultimoDia) };
}

const intervaloExportacao = computed(() => {
  if (tipoPeriodo.value === 'mes') return calcularMes(mesReferencia.value);
  if (tipoPeriodo.value === 'data') return { inicio: dataReferencia.value, fim: dataReferencia.value };
  return calcularSemana(dataReferencia.value);
});

const baseFiltradaLabel = computed(
  () => opcoesBase.value.find((b) => b.value === filtroBaseId.value)?.label ?? 'Todas',
);

function abrirExportacao() {
  exportDialogAberto.value = true;
}

async function carregarBases() {
  const { data } = await api.get<BaseOpcao[]>('/bases');
  opcoesBase.value = data.map((b) => ({ label: b.nome, value: b.id }));
}

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<Registro[]>('/saidas', {
      params: {
        baseId: filtroBaseId.value || undefined,
        dataInicio: dataInicio.value || undefined,
        dataFim: dataFim.value || undefined,
      },
    });
    registros.value = data;
  } finally {
    carregando.value = false;
  }
}

async function exportarExcel() {
  exportando.value = true;
  try {
    const { inicio, fim } = intervaloExportacao.value;
    const { data } = await api.get<Registro[]>('/saidas', {
      params: {
        baseId: filtroBaseId.value || undefined,
        dataInicio: inicio,
        dataFim: fim,
        limit: 10000,
      },
    });

    if (data.length === 0) {
      $q.notify({ type: 'warning', message: 'Nenhum registro encontrado nesse período.' });
      return;
    }

    const linhas = [...data].sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      if (a.base_nome !== b.base_nome) return a.base_nome.localeCompare(b.base_nome);
      return a.identificador.localeCompare(b.identificador);
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TimeTrack';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Histórico', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    const colunasExcel: Array<{ header: string; width: number }> = [
      { header: 'Data', width: 12 },
      { header: 'Base', width: 18 },
      { header: 'Tipo', width: 10 },
      { header: 'Equipe', width: 18 },
      { header: 'Supervisor', width: 16 },
      { header: 'Coordenador', width: 16 },
      { header: 'Hora de Saída', width: 14 },
      { header: 'Horário Limite', width: 14 },
      { header: 'Status', width: 12 },
      { header: 'Atraso (min)', width: 12 },
      { header: 'Registrado por', width: 20 },
      { header: 'Observação', width: 32 },
    ];
    sheet.columns = colunasExcel.map((c) => ({ width: c.width }));

    // Linha 1: título
    sheet.mergeCells(1, 1, 1, colunasExcel.length);
    const tituloCel = sheet.getCell(1, 1);
    tituloCel.value = 'TimeTrack — Histórico de Saídas de Equipes';
    tituloCel.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    tituloCel.alignment = { vertical: 'middle', horizontal: 'left' };
    tituloCel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    sheet.getRow(1).height = 26;
    for (let c = 1; c <= colunasExcel.length; c++) {
      sheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    }

    // Linha 2: subtítulo (período, base, geração)
    sheet.mergeCells(2, 1, 2, colunasExcel.length);
    const subtituloCel = sheet.getCell(2, 1);
    subtituloCel.value = `Período: ${formatarDataBr(inicio)} a ${formatarDataBr(fim)}  ·  Base: ${baseFiltradaLabel.value}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`;
    subtituloCel.font = { italic: true, size: 10, color: { argb: 'FF4B5563' } };
    sheet.getRow(2).height = 18;

    // Linha 3: cabeçalho
    const headerRow = sheet.getRow(3);
    colunasExcel.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF1F2937' } } };
    });
    headerRow.height = 20;
    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: colunasExcel.length } };

    // Linhas de dados
    linhas.forEach((r) => {
      const noPrazo = r.hora_saida <= r.horario_padrao_saida;
      const atrasoMin = noPrazo ? 0 : toMinutos(r.hora_saida) - toMinutos(r.horario_padrao_saida);

      const linha = sheet.addRow([
        formatarDataBr(r.data),
        r.base_nome,
        r.tipo,
        r.identificador,
        r.supervisor ?? '—',
        r.coordenador ?? '—',
        r.hora_saida.slice(0, 5),
        r.horario_padrao_saida.slice(0, 5),
        noPrazo ? 'No prazo' : 'Atrasado',
        noPrazo ? 0 : atrasoMin,
        r.registrado_por_nome,
        r.observacao ?? '',
      ]);

      const corFundo = noPrazo ? 'FFE8F5E9' : 'FFFDECEA';
      const corTexto = noPrazo ? 'FF1B6B1B' : 'FFB0362C';
      linha.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corFundo } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } };
      });
      const statusCel = linha.getCell(9);
      statusCel.font = { bold: true, color: { argb: corTexto } };
      linha.getCell(1).alignment = { horizontal: 'center' };
      linha.getCell(3).alignment = { horizontal: 'center' };
      linha.getCell(7).alignment = { horizontal: 'center' };
      linha.getCell(8).alignment = { horizontal: 'center' };
      linha.getCell(9).alignment = { horizontal: 'center' };
      linha.getCell(10).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sufixoPeriodo =
      tipoPeriodo.value === 'mes' ? mesReferencia.value : tipoPeriodo.value === 'data' ? inicio : `${inicio}_a_${fim}`;
    link.href = url;
    link.download = `timetrack-historico-${sufixoPeriodo}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    exportDialogAberto.value = false;
  } finally {
    exportando.value = false;
  }
}

onMounted(async () => {
  await carregarBases();
  await carregar();
});
</script>
