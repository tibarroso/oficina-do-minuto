import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local / produção)
const API_URL = 'http://localhost:3000';

// =========================================================================
// VARIÁVEIS DE ESTADO E INSTÂNCIAS GLOBAIS
// =========================================================================
let chartStatusInstance = null;
let chartServicoInstance = null;
let chartFaturamentoDiarioInstance = null;

let state = {
  vendasAtuais: [],
  vendasFiltradas: [],
  debouncePesquisa: null
};

// =========================================================================
// 1. MAPEAMENTO DE ELEMENTOS DO DOM (COMPLETO)
// =========================================================================
const DOM = {
  containerPedidos: document.getElementById("containerPedidos"),
  containerCardsOficinas: document.getElementById("cards"),
  dataExibicao: document.getElementById("data_exibicao"),
  
  filtroStatus: document.getElementById("filtroStatus"),
  pesquisaOS: document.getElementById("pesquisaOS"),
  btnFiltrar: document.getElementById("btnFiltrar"),
  filtroDataInicio: document.getElementById("filtro_data_inicio"),
  filtroDataFim: document.getElementById("filtro_data_fim"),
  btnBuscarPeriodo: document.getElementById("btn_buscar_periodo"),
  btnLimparFiltros: document.getElementById("btnLimparFiltros"),

  modalTicket: {
    instancia: null,
    elemento: document.getElementById("modalVisualizarTicket"),
    selectLoja: document.getElementById("selectLojaTicket"),
    inputSerie: document.getElementById("inputSerieTicket"),
    inputNumero: document.getElementById("inputNumeroTicket"),
    btnBuscar: document.getElementById("btnBuscarTicket"),
    resultado: document.getElementById("resultadoTicket"),
  },

  modalDetalhes: {
    instancia: null,
    elemento: document.getElementById("modalDetalhesTicket"),
    conteudo: document.getElementById("conteudoDetalhesTicket"),
    btnImprimir: document.getElementById("btnImprimirTicket"),
    btnExportarPDF: document.getElementById("btnExportarTicketPDF")
  },

  macro: {
    totalFaturado: document.getElementById("total_faturado"),
    totalProdutos: document.getElementById("total_produtos"),
    totalServicos: document.getElementById("total_servicos"),
  },

  kpis: {
    faturamentoTotal: document.getElementById("kpiFaturamentoTotal"),
    totalOS: document.getElementById("kpiTotalOS"),
    ticketsPendentes: document.getElementById("kpiTicketsPendentes"),
    taxaRetrabalho: document.getElementById("kpiTaxaRetrabalho"),
    volumePecas: document.getElementById("kpiVolumePecas"),
    ticketMedio: document.getElementById("kpiTicketMedio"),
    descontoTotal: document.getElementById("kpiDescontoTotal"),
    margemMedia: document.getElementById("kpiMargemMedia")
  },

  graficos: {
    canvasStatus: document.getElementById("graficoStatus"),
    canvasServico: document.getElementById("graficoServico"),
    canvasFaturamentoDiario: document.getElementById("graficoFaturamentoDiario"),
  }
};

// =========================================================================
// 2. CICLO DE VIDA E EVENTOS DA PÁGINA
// =========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  inicializarInstanciasBootstrap();
  configurarIntervaloDatasPadrao();
  registrarEscutadoresEventos();
  await executarCarregamentoInicial();
});

function inicializarInstanciasBootstrap() {
  if (DOM.modalTicket.elemento && typeof bootstrap !== "undefined") {
    DOM.modalTicket.instancia = new bootstrap.Modal(DOM.modalTicket.elemento);
  }
  if (DOM.modalDetalhes.elemento && typeof bootstrap !== "undefined") {
    DOM.modalDetalhes.instancia = new bootstrap.Modal(DOM.modalDetalhes.elemento);
  }
}

function configurarIntervaloDatasPadrao() {
  if (!DOM.filtroDataInicio || !DOM.filtroDataFim) return;

  const dataAtual = new Date();
  const inicioMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);

  DOM.filtroDataInicio.value = formatarDataParaInputHTML(inicioMes);
  DOM.filtroDataFim.value = formatarDataParaInputHTML(dataAtual);
}

function registrarEscutadoresEventos() {
  DOM.btnBuscarPeriodo?.addEventListener("click", carregarDadosPorPeriodo);
  DOM.btnFiltrar?.addEventListener("click", aplicarFiltrosTabela);
  DOM.btnLimparFiltros?.addEventListener("click", resetarFiltros);
  
  // Debounce para evitar múltiplas renderizações enquanto digita
  DOM.pesquisaOS?.addEventListener("input", () => {
    clearTimeout(state.debouncePesquisa);
    state.debouncePesquisa = setTimeout(aplicarFiltrosTabela, 300);
  });

  DOM.filtroStatus?.addEventListener("change", aplicarFiltrosTabela);
  DOM.modalTicket.btnBuscar?.addEventListener("click", executarBuscaTicket);
  DOM.modalDetalhes.btnImprimir?.addEventListener("click", () => window.print());

  // Event Delegation para Botões dinâmicos da Tabela
  DOM.containerPedidos?.addEventListener("click", (evt) => {
    const btnDetalhes = evt.target.closest(".btn-ver-detalhes");
    if (btnDetalhes) {
      const idOS = btnDetalhes.getAttribute("data-id");
      abrirModalDetalhesTicket(idOS);
    }
  });

  // Event Delegation para Botões das Oficinas
  DOM.containerCardsOficinas?.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".btn-ver-ticket");
    if (btn) {
      const idLoja = btn.dataset.loja;
      if (DOM.modalTicket.selectLoja) DOM.modalTicket.selectLoja.value = idLoja;
      if (DOM.modalTicket.instancia) DOM.modalTicket.instancia.show();
    }
  });
}

async function executarCarregamentoInicial() {
  await carregarDadosPorPeriodo();
}

// =========================================================================
// 3. CONSULTAS À BASE DE DADOS (SUPABASE & BACKEND API)
// =========================================================================

async function carregarDadosPorPeriodo() {
  const dataInicio = DOM.filtroDataInicio ? DOM.filtroDataInicio.value : null;
  const dataFim = DOM.filtroDataFim ? DOM.filtroDataFim.value : null;

  if (!validarDatas(dataInicio, dataFim)) return;

  atualizarRotuloPeriodo(dataInicio, dataFim);
  exibirLoadingState();

  try {
    state.vendasAtuais = await consultarVendasNoSupabase(dataInicio, dataFim);
    state.vendasFiltradas = [...state.vendasAtuais];

    processarAtualizacaoInterface();
  } catch (erro) {
    console.error("[ERRO CARREGAMENTO]:", erro);
    exibirErroNaInterface("Houve um erro ao carregar as Ordens de Serviço.");
  }
}

async function consultarVendasNoSupabase(inicio, fim) {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        id, numero_os, serie, loja, status, servico,
        valor_produtos, valor_servicos, desconto, quantidade_pecas,
        created_at, cliente_nome, cliente_documento, tecnico_responsavel, observacoes
      `)
      .gte('created_at', `${inicio}T00:00:00`)
      .lte('created_at', `${fim}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return padronizarEstruturaVendas(data);

  } catch (errSupabase) {
    console.warn("Falha no Supabase. Tentando fallback API local...", errSupabase);
  }

  try {
    const resposta = await fetch(`${API_URL}/api/vendas?inicio=${inicio}&fim=${fim}`);
    if (resposta.ok) {
      const json = await resposta.json();
      return padronizarEstruturaVendas(json);
    }
  } catch (errApi) {
    console.warn("API Local indisponível. Acionando simulação de contingência.");
  }

  return gerarDadosSimulados(inicio, fim);
}

function padronizarEstruturaVendas(dadosBrutos) {
  return dadosBrutos.map(item => ({
    id: item.id || item.numero_os,
    os: item.numero_os || item.id,
    serie: item.serie || "1",
    loja: item.loja || "Sem Loja",
    status: item.status || "Pendente",
    servico: item.servico || "Geral",
    valorProdutos: parseFloat(item.valor_produtos || item.valorProdutos || 0),
    valorServicos: parseFloat(item.valor_servicos || item.valorServicos || 0),
    desconto: parseFloat(item.desconto || 0),
    pecas: parseInt(item.quantidade_pecas || item.pecas || 0),
    data: item.created_at ? item.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    dataCompleta: item.created_at || new Date().toISOString(),
    cliente: item.cliente_nome || "Consumidor Final",
    documentoCliente: item.cliente_documento || "Não informado",
    tecnico: item.tecnico_responsavel || "Não Atribuído",
    observacoes: item.observacoes || "Nenhuma observação registrada."
  }));
}

// =========================================================================
// 4. PROCESSAMENTO E REGRAS DE NEGÓCIO (KPIS)
// =========================================================================

function processarAtualizacaoInterface() {
  atualizarCardsFaturamentoMacro(state.vendasFiltradas);
  atualizarCardsKPIsOperacionais(state.vendasFiltradas);
  renderizarCardsPorOficina(state.vendasFiltradas);
  renderizarConjuntoGraficos(state.vendasFiltradas);
  renderizarTabelaOrdensServico(state.vendasFiltradas);
  popularSelectLojasModal(state.vendasAtuais);
}

function atualizarCardsFaturamentoMacro(vendas) {
  let somaProdutos = 0;
  let somaServicos = 0;

  vendas.forEach(v => {
    somaProdutos += v.valorProdutos;
    somaServicos += v.valorServicos;
  });

  const faturamentoTotal = somaProdutos + somaServicos;

  if (DOM.macro.totalFaturado) DOM.macro.totalFaturado.textContent = formatarMoeda(faturamentoTotal);
  if (DOM.macro.totalProdutos) DOM.macro.totalProdutos.textContent = formatarMoeda(somaProdutos);
  if (DOM.macro.totalServicos) DOM.macro.totalServicos.textContent = formatarMoeda(somaServicos);
}

function atualizarCardsKPIsOperacionais(vendas) {
  const qtdTotalOS = vendas.length;
  let totalFaturado = 0;
  let qtdPendentes = 0;
  let qtdRetrabalhos = 0;
  let volumePecasTotal = 0;
  let totalDescontos = 0;

  vendas.forEach(v => {
    const totalOS = (v.valorProdutos + v.valorServicos) - v.desconto;
    totalFaturado += totalOS;
    totalDescontos += v.desconto;
    volumePecasTotal += v.pecas;

    if (['Aguardando coleta', 'Em serviço', 'Pendente'].includes(v.status)) {
      qtdPendentes++;
    }
    if (v.status === 'Retrabalho') {
      qtdRetrabalhos++;
    }
  });

  const ticketMedio = qtdTotalOS > 0 ? (totalFaturado / qtdTotalOS) : 0;
  const percentualRetrabalho = qtdTotalOS > 0 ? ((qtdRetrabalhos / qtdTotalOS) * 100).toFixed(1) : "0.0";

  if (DOM.kpis.faturamentoTotal) DOM.kpis.faturamentoTotal.textContent = formatarMoeda(totalFaturado);
  if (DOM.kpis.totalOS) DOM.kpis.totalOS.textContent = qtdTotalOS;
  if (DOM.kpis.ticketsPendentes) DOM.kpis.ticketsPendentes.textContent = qtdPendentes;
  if (DOM.kpis.taxaRetrabalho) DOM.kpis.taxaRetrabalho.textContent = `${percentualRetrabalho}%`;
  if (DOM.kpis.volumePecas) DOM.kpis.volumePecas.textContent = volumePecasTotal;
  if (DOM.kpis.ticketMedio) DOM.kpis.ticketMedio.textContent = formatarMoeda(ticketMedio);
  if (DOM.kpis.descontoTotal) DOM.kpis.descontoTotal.textContent = formatarMoeda(totalDescontos);
}

function renderizarCardsPorOficina(vendas) {
  if (!DOM.containerCardsOficinas) return;

  if (vendas.length === 0) {
    DOM.containerCardsOficinas.innerHTML = `
      <div class="col-12 text-center py-4 text-muted">
        <i class="bi bi-building-exclamation fs-3 d-block mb-2"></i>
        Nenhuma unidade com atividades registradas no período.
      </div>`;
    return;
  }

  const agrupamento = {};

  vendas.forEach(v => {
    if (!agrupamento[v.loja]) {
      agrupamento[v.loja] = { totalFaturado: 0, qtdOS: 0, totalProdutos: 0, totalServicos: 0 };
    }
    agrupamento[v.loja].totalProdutos += v.valorProdutos;
    agrupamento[v.loja].totalServicos += v.valorServicos;
    agrupamento[v.loja].totalFaturado += (v.valorProdutos + v.valorServicos - v.desconto);
    agrupamento[v.loja].qtdOS += 1;
  });

  let htmlCards = '';
  Object.keys(agrupamento).sort().forEach(nomeLoja => {
    const info = agrupamento[nomeLoja];
    htmlCards += `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-3">
        <div class="card shadow-sm border-0 h-100 p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-primary-subtle text-primary fw-bold">${info.qtdOS} OS(s)</span>
            <button class="btn btn-sm btn-light btn-ver-ticket" data-loja="${nomeLoja}" title="Buscar Ticket">
              <i class="bi bi-search"></i>
            </button>
          </div>
          <h6 class="fw-bold text-dark text-truncate mb-1" title="${nomeLoja}">${nomeLoja}</h6>
          <div class="small text-muted mb-2">
            Prod: ${formatarMoeda(info.totalProdutos)} | Serv: ${formatarMoeda(info.totalServicos)}
          </div>
          <div class="mt-auto pt-2 border-top">
            <span class="text-muted extra-small d-block">Faturamento Bruto</span>
            <span class="fw-bold fs-5 text-success">${formatarMoeda(info.totalFaturado)}</span>
          </div>
        </div>
      </div>
    `;
  });

  DOM.containerCardsOficinas.innerHTML = htmlCards;
}

// =========================================================================
// 5. GRÁFICOS ANALÍTICOS (CHART.JS SAFE MODE)
// =========================================================================

function renderizarConjuntoGraficos(vendas) {
  destruirGraficosExistentes();

  // Garante que o Chart.js está carregado antes de instanciar
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não encontrado no escopo global.");
    return;
  }

  if (DOM.graficos.canvasStatus) {
    const mapaStatus = {};
    vendas.forEach(v => mapaStatus[v.status] = (mapaStatus[v.status] || 0) + 1);

    chartStatusInstance = new Chart(DOM.graficos.canvasStatus, {
      type: 'doughnut',
      data: {
        labels: Object.keys(mapaStatus),
        datasets: [{
          data: Object.values(mapaStatus),
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6b7280', '#8b5cf6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (DOM.graficos.canvasServico) {
    const mapaServicos = {};
    vendas.forEach(v => mapaServicos[v.servico] = (mapaServicos[v.servico] || 0) + 1);

    chartServicoInstance = new Chart(DOM.graficos.canvasServico, {
      type: 'bar',
      data: {
        labels: Object.keys(mapaServicos),
        datasets: [{
          label: 'Total de Atendimentos',
          data: Object.values(mapaServicos),
          backgroundColor: '#0b53a7',
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (DOM.graficos.canvasFaturamentoDiario) {
    const mapaDiario = {};
    vendas.forEach(v => {
      const dataFormatada = formatarDataBR(v.data);
      const totalOS = v.valorProdutos + v.valorServicos - v.desconto;
      mapaDiario[dataFormatada] = (mapaDiario[dataFormatada] || 0) + totalOS;
    });

    const datasOrdenadas = Object.keys(mapaDiario).sort();
    const valoresOrdenados = datasOrdenadas.map(d => mapaDiario[d]);

    chartFaturamentoDiarioInstance = new Chart(DOM.graficos.canvasFaturamentoDiario, {
      type: 'line',
      data: {
        labels: datasOrdenadas,
        datasets: [{
          label: 'Faturamento Diário (R$)',
          data: valoresOrdenados,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function destruirGraficosExistentes() {
  if (chartStatusInstance) { chartStatusInstance.destroy(); chartStatusInstance = null; }
  if (chartServicoInstance) { chartServicoInstance.destroy(); chartServicoInstance = null; }
  if (chartFaturamentoDiarioInstance) { chartFaturamentoDiarioInstance.destroy(); chartFaturamentoDiarioInstance = null; }
}

// =========================================================================
// 6. RENDERIZAÇÃO DA TABELA DE OS E FILTRAGEM
// =========================================================================

function renderizarTabelaOrdensServico(vendas) {
  if (!DOM.containerPedidos) return;

  if (vendas.length === 0) {
    DOM.containerPedidos.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox display-5 d-block mb-3"></i>
        Nenhuma Ordem de Serviço encontrada.
      </div>`;
    return;
  }

  let htmlTabela = `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Nº OS / ID</th>
            <th>Data Emissão</th>
            <th>Oficina / Unidade</th>
            <th>Cliente</th>
            <th>Serviço Realizado</th>
            <th>Status</th>
            <th class="text-end">Total Geral</th>
            <th class="text-center">Ação</th>
          </tr>
        </thead>
        <tbody>
  `;

  vendas.forEach(v => {
    const valorLiquido = (v.valorProdutos + v.valorServicos) - v.desconto;
    htmlTabela += `
      <tr>
        <td><strong class="text-primary">#${v.os}</strong></td>
        <td>${formatarDataBR(v.data)}</td>
        <td>${v.loja}</td>
        <td>${v.cliente}</td>
        <td>${v.servico}</td>
        <td><span class="badge ${obterCorBadgeStatus(v.status)}">${v.status}</span></td>
        <td class="text-end fw-bold text-dark">${formatarMoeda(valorLiquido)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary btn-ver-detalhes" data-id="${v.id}">
            <i class="bi bi-eye"></i> Detalhes
          </button>
        </td>
      </tr>
    `;
  });

  htmlTabela += `</tbody></table></div>`;
  DOM.containerPedidos.innerHTML = htmlTabela;
}

function aplicarFiltrosTabela() {
  const termo = DOM.pesquisaOS ? DOM.pesquisaOS.value.toLowerCase().trim() : '';
  const statusSel = DOM.filtroStatus ? DOM.filtroStatus.value : 'Todos';

  state.vendasFiltradas = state.vendasAtuais.filter(v => {
    const porStatus = (statusSel === 'Todos') || (v.status.toLowerCase() === statusSel.toLowerCase());
    const porTexto = v.os.toString().toLowerCase().includes(termo) ||
                     v.loja.toLowerCase().includes(termo) ||
                     v.servico.toLowerCase().includes(termo) ||
                     v.cliente.toLowerCase().includes(termo);
    return porStatus && porTexto;
  });

  processarAtualizacaoInterface();
}

function resetarFiltros() {
  if (DOM.pesquisaOS) DOM.pesquisaOS.value = '';
  if (DOM.filtroStatus) DOM.filtroStatus.value = 'Todos';
  configurarIntervaloDatasPadrao();
  carregarDadosPorPeriodo();
}

// =========================================================================
// 7. MODAIS DE INTERAÇÃO
// =========================================================================

function popularSelectLojasModal(vendas) {
  if (!DOM.modalTicket.selectLoja) return;

  const lojasUnicas = [...new Set(vendas.map(v => v.loja))].sort();

  let options = `<option value="" disabled selected>Selecione a oficina...</option>`;
  lojasUnicas.forEach(loja => {
    options += `<option value="${loja}">${loja}</option>`;
  });

  DOM.modalTicket.selectLoja.innerHTML = options;
}

function executarBuscaTicket() {
  const loja = DOM.modalTicket.selectLoja?.value;
  const numero = DOM.modalTicket.inputNumero?.value?.trim();

  if (!DOM.modalTicket.resultado) return;

  if (!loja || !numero) {
    DOM.modalTicket.resultado.style.display = "block";
    DOM.modalTicket.resultado.className = "alert alert-danger mt-3";
    DOM.modalTicket.resultado.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Preencha a loja e o número da OS para buscar.`;
    return;
  }

  const encontrado = state.vendasAtuais.find(v => v.loja === loja && v.os.toString() === numero);
  DOM.modalTicket.resultado.style.display = "block";

  if (encontrado) {
    const totalOS = (encontrado.valorProdutos + encontrado.valorServicos) - encontrado.desconto;
    DOM.modalTicket.resultado.className = "alert alert-success mt-3";
    DOM.modalTicket.resultado.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0 text-success"><i class="bi bi-check-circle me-1"></i> Ticket #${encontrado.os} Localizado</h6>
        <span class="badge ${obterCorBadgeStatus(encontrado.status)}">${encontrado.status}</span>
      </div>
      <div class="small"><strong>Cliente:</strong> ${encontrado.cliente}</div>
      <div class="small"><strong>Serviço:</strong> ${encontrado.servico}</div>
      <div class="small fw-bold mt-1"><strong>Valor Total:</strong> ${formatarMoeda(totalOS)}</div>
    `;
  } else {
    DOM.modalTicket.resultado.className = "alert alert-warning mt-3";
    DOM.modalTicket.resultado.innerHTML = `<i class="bi bi-search me-2"></i>Nenhuma OS com o número #${numero} foi localizada para esta oficina.`;
  }
}

function abrirModalDetalhesTicket(idTicket) {
  const ticket = state.vendasAtuais.find(v => v.id.toString() === idTicket.toString());

  if (!DOM.modalDetalhes.conteudo) return;

  if (!ticket) {
    DOM.modalDetalhes.conteudo.innerHTML = `<p class="text-danger p-3">Não foi possível carregar as informações do Ticket.</p>`;
  } else {
    const totalGeral = (ticket.valorProdutos + ticket.valorServicos) - ticket.desconto;
    DOM.modalDetalhes.conteudo.innerHTML = `
      <div class="p-2">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-muted d-block small">Nº da Ordem de Serviço</span>
            <strong class="fs-5 text-primary">#${ticket.os}</strong> (Série: ${ticket.serie})
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Data de Emissão</span>
            <strong>${formatarDataBR(ticket.data)}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Unidade de Atendimento</span>
            <strong>${ticket.loja}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Status Operacional</span>
            <span class="badge ${obterCorBadgeStatus(ticket.status)}">${ticket.status}</span>
          </div>
          <div class="col-12"><hr class="my-2"></div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Cliente</span>
            <strong>${ticket.cliente}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Documento (CPF/CNPJ)</span>
            <strong>${ticket.documentoCliente}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Técnico Responsável</span>
            <strong>${ticket.tecnico}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Serviço Executado</span>
            <strong>${ticket.servico}</strong>
          </div>
          <div class="col-12"><hr class="my-2"></div>
          <div class="col-md-3">
            <span class="text-muted d-block small">Valor Produtos</span>
            <span>${formatarMoeda(ticket.valorProdutos)}</span>
          </div>
          <div class="col-md-3">
            <span class="text-muted d-block small">Valor Serviços</span>
            <span>${formatarMoeda(ticket.valorServicos)}</span>
          </div>
          <div class="col-md-3">
            <span class="text-muted d-block small">Descontos</span>
            <span class="text-danger">-${formatarMoeda(ticket.desconto)}</span>
          </div>
          <div class="col-md-3">
            <span class="text-muted d-block small">Total Final</span>
            <span class="fs-5 fw-bold text-success">${formatarMoeda(totalGeral)}</span>
          </div>
          <div class="col-12 mt-3">
            <span class="text-muted d-block small">Observações</span>
            <p class="small bg-light p-2 rounded text-secondary">${ticket.observacoes}</p>
          </div>
        </div>
      </div>
    `;
  }

  if (DOM.modalDetalhes.instancia) {
    DOM.modalDetalhes.instancia.show();
  }
}

// =========================================================================
// 8. UTILS & CONTINGÊNCIA
// =========================================================================

function validarDatas(inicio, fim) {
  if (!inicio || !fim) {
    alert("Selecione uma data inicial e uma data final.");
    return false;
  }
  if (inicio > fim) {
    alert("A data inicial não pode ser posterior à data final.");
    return false;
  }
  return true;
}

function atualizarRotuloPeriodo(inicio, fim) {
  if (DOM.dataExibicao) {
    DOM.dataExibicao.textContent = `Exibindo: ${formatarDataBR(inicio)} até ${formatarDataBR(fim)}`;
  }
}

function formatarDataParaInputHTML(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  const partes = dataISO.split("T")[0].split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMoeda(valor) {
  return (parseFloat(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function obterCorBadgeStatus(status) {
  switch (status) {
    case 'Finalizado':
    case 'Concluído': return 'bg-success';
    case 'Em serviço':
    case 'Em Andamento': return 'bg-primary';
    case 'Aguardando coleta':
    case 'Pendente': return 'bg-warning text-dark';
    case 'Retrabalho': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

function exibirLoadingState() {
  if (DOM.containerPedidos) {
    DOM.containerPedidos.innerHTML = `
      <div class="text-center py-5 text-muted">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <div>Carregando informações do banco de dados...</div>
      </div>`;
  }
}

function exibirErroNaInterface(mensagem) {
  if (DOM.containerPedidos) {
    DOM.containerPedidos.innerHTML = `
      <div class="alert alert-danger m-3 text-center">
        <i class="bi bi-exclamation-octagon me-2"></i> ${mensagem}
      </div>`;
  }
}

function gerarDadosSimulados(inicio, fim) {
  return [
    { id: '1', os: '1001', serie: '1', loja: 'Oficina Central', status: 'Finalizado', servico: 'Troca de Óleo', valorProdutos: 150.00, valorServicos: 80.00, desconto: 10.00, pecas: 2, data: inicio, cliente: 'João Silva', documentoCliente: '123.456.789-00', tecnico: 'Carlos Oliveira', observacoes: 'Troca de óleo sintético executada sem intercorrências.' },
    { id: '2', os: '1002', serie: '1', loja: 'Oficina Sul', status: 'Aguardando coleta', servico: 'Alinhamento', valorProdutos: 0.00, valorServicos: 120.00, desconto: 0.00, pecas: 0, data: inicio, cliente: 'Maria Santos', documentoCliente: '987.654.321-11', tecnico: 'Lucas Pereira', observacoes: 'Aguardando cliente retirar o veículo.' },
    { id: '3', os: '1003', serie: '2', loja: 'Oficina Central', status: 'Retrabalho', servico: 'Sistema de Freios', valorProdutos: 240.00, valorServicos: 110.00, desconto: 15.00, pecas: 4, data: fim, cliente: 'Pedro Souza', documentoCliente: '456.789.123-22', tecnico: 'Carlos Oliveira', observacoes: 'Cliente relatou ruído ao frear após troca da pastilha.' },
    { id: '4', os: '1004', serie: '1', loja: 'Oficina Norte', status: 'Em serviço', servico: 'Correia Dentada', valorProdutos: 310.00, valorServicos: 190.00, desconto: 0.00, pecas: 3, data: fim, cliente: 'Ana Lima', documentoCliente: '654.321.987-33', tecnico: 'Roberto Lima', observacoes: 'Veículo em elevador para substituição do kit.' }
  ];
}
