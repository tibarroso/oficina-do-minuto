import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

// Instâncias Globais de Controle e Estado
let chartStatusInstance = null;
let chartServicoInstance = null;
let vendasAtuais = [];
let dadosOficinasCache = [];

// =========================================================================
// 1. MAPEAMENTO E ELEMENTOS DO DOM (ESTRUTURA COMPLETA)
// =========================================================================
const DOM = {
  containerPedidos: document.getElementById("containerPedidos"),
  filtroStatus: document.getElementById("filtroStatus"),
  pesquisaOS: document.getElementById("pesquisaOS"),
  btnFiltrar: document.getElementById("btnFiltrar"),
  dataExibicao: document.getElementById("data_exibicao"),
  containerCardsOficinas: document.getElementById("cards"),

  // Novos Filtros Globais de Período
  filtroDataInicio: document.getElementById("filtro_data_inicio"),
  filtroDataFim: document.getElementById("filtro_data_fim"),
  btnBuscarPeriodo: document.getElementById("btn_buscar_periodo"),

  // Elementos do Modal de Busca de Ticket
  modalTicket: {
    instancia: null,
    elemento: document.getElementById("modalVisualizarTicket"),
    selectLoja: document.getElementById("selectLojaTicket"),
    inputSerie: document.getElementById("inputSerieTicket"),
    inputNumero: document.getElementById("inputNumeroTicket"),
    btnBuscar: document.getElementById("btnBuscarTicket"),
    resultado: document.getElementById("resultadoTicket"),
  },

  // Elementos do Modal de Detalhes do Ticket (Tela Flutuante com Dados)
  modalDetalhes: {
    instancia: null,
    elemento: document.getElementById("modalDetalhesTicket"),
    conteudo: document.getElementById("conteudoDetalhesTicket"),
  },

  // Cards Macro de Faturamento (Topo)
  macro: {
    totalFaturado: document.getElementById("total_faturado"),
    totalProdutos: document.getElementById("total_produtos"),
    totalServicos: document.getElementById("total_servicos"),
  },

  // Indicadores de KPIs de Desempenho Operacional
  kpis: {
    faturamentoTotal: document.getElementById("kpiFaturamentoTotal"),
    totalOS: document.getElementById("kpiTotalOS"),
    ticketsPendentes: document.getElementById("kpiTicketsPendentes"),
    taxaRetrabalho: document.getElementById("kpiTaxaRetrabalho"),
    volumePecas: document.getElementById("kpiVolumePecas"),
    ticketMedio: document.getElementById("kpiTicketMedio"),
  },

  // Visualização e Elementos de Gráficos
  graficos: {
    canvasStatus: document.getElementById("graficoStatus"),
    canvasServico: document.getElementById("graficoServico"),
    canvasFaturamentoDiario: document.getElementById("graficoFaturamentoDiario"),
  }
};

// =========================================================================
// 2. CICLO DE VIDA E INICIALIZAÇÃO DA APLICAÇÃO
// =========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  inicializarModais();
  configurarDatasIniciais();
  vincularEventos();
  await carregarDadosDashboard();
});

function inicializarModais() {
  if (DOM.modalTicket.elemento && typeof bootstrap !== "undefined") {
    DOM.modalTicket.instancia = new bootstrap.Modal(DOM.modalTicket.elemento);
  }
  if (DOM.modalDetalhes.elemento && typeof bootstrap !== "undefined") {
    DOM.modalDetalhes.instancia = new bootstrap.Modal(DOM.modalDetalhes.elemento);
  }
}

function configurarDatasIniciais() {
  if (!DOM.filtroDataInicio || !DOM.filtroDataFim) return;

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  DOM.filtroDataInicio.value = formatarParaInputDate(primeiroDiaMes);
  DOM.filtroDataFim.value = formatarParaInputDate(hoje);
}

function vincularEventos() {
  if (DOM.btnBuscarPeriodo) {
    DOM.btnBuscarPeriodo.addEventListener("click", async () => {
      await carregarDadosDashboard();
    });
  }

  if (DOM.btnFiltrar) {
    DOM.btnFiltrar.addEventListener("click", aplicarFiltrosSecundarios);
  }

  if (DOM.pesquisaOS) {
    DOM.pesquisaOS.addEventListener("input", aplicarFiltrosSecundarios);
  }

  if (DOM.filtroStatus) {
    DOM.filtroStatus.addEventListener("change", aplicarFiltrosSecundarios);
  }

  if (DOM.modalTicket.btnBuscar) {
    DOM.modalTicket.btnBuscar.addEventListener("click", executarBuscaTicketModal);
  }
}

// =========================================================================
// 3. COMUNICAÇÃO DE DADOS (SUPABASE & API LOCAL)
// =========================================================================

async function carregarDadosDashboard() {
  const dataInicio = DOM.filtroDataInicio ? DOM.filtroDataInicio.value : null;
  const dataFim = DOM.filtroDataFim ? DOM.filtroDataFim.value : null;

  if (!validarIntervaloDatas(dataInicio, dataFim)) return;

  atualizarCabecalhoData(dataInicio, dataFim);
  exibirEstadoCarregando();

  try {
    vendasAtuais = await consultarVendasPeríodo(dataInicio, dataFim);
    
    atualizarCardsMacro(vendasAtuais);
    atualizarKPIsOperacionais(vendasAtuais);
    renderizarCardsOficinas(vendasAtuais);
    renderizarGraficosAnaliticos(vendasAtuais);
    renderizarTabelaPedidos(vendasAtuais);
    preencherOpcoesLojasModal(vendasAtuais);

  } catch (erro) {
    console.error("FALHA AO CARREGAR DADOS DO DASHBOARD:", erro);
    exibirErroNaTabela("Erro ao conectar com a base de dados do Supabase ou API local.");
  }
}

async function consultarVendasPeríodo(dataInicio, dataFim) {
  // 1. Tentar consulta principal via Supabase Client
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        id,
        numero_os,
        serie,
        loja,
        status,
        servico,
        valor_produtos,
        valor_servicos,
        quantidade_pecas,
        created_at,
        cliente_nome,
        tecnico_responsavel
      `)
      .gte('created_at', `${dataInicio}T00:00:00`)
      .lte('created_at', `${dataFim}T23:59:59`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return normalizarEstruturaDados(data);
    }
  } catch (e) {
    console.warn("Supabase indisponível. Alternando para o endpoint REST local...", e);
  }

  // 2. Fallback via API REST Interna
  try {
    const resposta = await fetch(`${API_URL}/api/vendas?inicio=${dataInicio}&fim=${dataFim}`);
    if (resposta.ok) {
      const dadosApi = await resposta.json();
      return normalizarEstruturaDados(dadosApi);
    }
  } catch (e) {
    console.warn("API Local inacessível. Gerando dados de simulação em tempo real.", e);
  }

  // 3. Fallback de contingência local para ambiente dev
  return gerarDadosMocadoContingencia(dataInicio, dataFim);
}

function normalizarEstruturaDados(lista) {
  return lista.map(item => ({
    id: item.id || item.numero_os,
    os: item.numero_os || item.id,
    serie: item.serie || "1",
    loja: item.loja || "Matriz",
    status: item.status || "Pendente",
    servico: item.servico || "Geral",
    valorProdutos: parseFloat(item.valor_produtos || item.valorProdutos || 0),
    valorServicos: parseFloat(item.valor_servicos || item.valorServicos || 0),
    pecas: parseInt(item.quantidade_pecas || item.pecas || 0),
    data: item.created_at ? item.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    cliente: item.cliente_nome || "Cliente Não Informado",
    tecnico: item.tecnico_responsavel || "Não Atribuído"
  }));
}

// =========================================================================
// 4. PROCESSAMENTO DE REGRA DE NEGÓCIO E CARDS MACRO
// =========================================================================

function atualizarCardsMacro(vendas) {
  let subtotalProdutos = 0;
  let subtotalServicos = 0;

  for (let i = 0; i < vendas.length; i++) {
    subtotalProdutos += vendas[i].valorProdutos;
    subtotalServicos += vendas[i].valorServicos;
  }

  const faturamentoGeral = subtotalProdutos + subtotalServicos;

  if (DOM.macro.totalFaturado) {
    DOM.macro.totalFaturado.textContent = formatarMoeda(faturamentoGeral);
  }
  if (DOM.macro.totalProdutos) {
    DOM.macro.totalProdutos.textContent = formatarMoeda(subtotalProdutos);
  }
  if (DOM.macro.totalServicos) {
    DOM.macro.totalServicos.textContent = formatarMoeda(subtotalServicos);
  }
}

function atualizarKPIsOperacionais(vendas) {
  const totalOrdens = vendas.length;
  let somaFaturamento = 0;
  let contagemPendentes = 0;
  let contagemRetrabalhos = 0;
  let totalPecas = 0;

  vendas.forEach(v => {
    somaFaturamento += (v.valorProdutos + v.valorServicos);
    if (v.status === 'Aguardando coleta' || v.status === 'Em serviço' || v.status === 'Pendente') {
      contagemPendentes++;
    }
    if (v.status === 'Retrabalho') {
      contagemRetrabalhos++;
    }
    totalPecas += v.pecas;
  });

  const ticketMedio = totalOrdens > 0 ? (somaFaturamento / totalOrdens) : 0;
  const taxaRetrabalho = totalOrdens > 0 ? ((contagemRetrabalhos / totalOrdens) * 100).toFixed(1) : "0.0";

  if (DOM.kpis.faturamentoTotal) DOM.kpis.faturamentoTotal.textContent = formatarMoeda(somaFaturamento);
  if (DOM.kpis.totalOS) DOM.kpis.totalOS.textContent = totalOrdens;
  if (DOM.kpis.ticketsPendentes) DOM.kpis.ticketsPendentes.textContent = contagemPendentes;
  if (DOM.kpis.taxaRetrabalho) DOM.kpis.taxaRetrabalho.textContent = `${taxaRetrabalho}%`;
  if (DOM.kpis.volumePecas) DOM.kpis.volumePecas.textContent = totalPecas;
  if (DOM.kpis.ticketMedio) DOM.kpis.ticketMedio.textContent = formatarMoeda(ticketMedio);
}

function renderizarCardsOficinas(vendas) {
  if (!DOM.containerCardsOficinas) return;

  if (vendas.length === 0) {
    DOM.containerCardsOficinas.innerHTML = `
      <div class="col-12 text-center py-4 text-muted">
        <i class="bi bi-inbox display-6 d-block mb-2"></i>
        Nenhuma unidade de oficina registrou operações neste período.
      </div>`;
    return;
  }

  const agrupaOficina = {};

  vendas.forEach(v => {
    if (!agrupaOficina[v.loja]) {
      agrupaOficina[v.loja] = {
        faturamento: 0,
        qtdOS: 0,
        servicos: 0,
        produtos: 0
      };
    }
    agrupaOficina[v.loja].faturamento += (v.valorProdutos + v.valorServicos);
    agrupaOficina[v.loja].produtos += v.valorProdutos;
    agrupaOficina[v.loja].servicos += v.valorServicos;
    agrupaOficina[v.loja].qtdOS += 1;
  });

  let HTML = '';
  Object.keys(agrupaOficina).sort().forEach(nomeLoja => {
    const dados = agrupaOficina[nomeLoja];
    HTML += `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-3">
        <div class="card shadow-sm border-0 h-100 p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-primary-subtle text-primary fw-bold">${dados.qtdOS} OS(s)</span>
            <i class="bi bi-shop text-muted"></i>
          </div>
          <h6 class="fw-bold text-dark text-truncate mb-1" title="${nomeLoja}">${nomeLoja}</h6>
          <small class="text-muted d-block mb-2">Prod: ${formatarMoeda(dados.produtos)} | Serv: ${formatarMoeda(dados.servicos)}</small>
          <div class="mt-auto pt-2 border-top">
            <span class="text-muted extra-small d-block">Total Faturado</span>
            <span class="fw-bold fs-5 text-success">${formatarMoeda(dados.faturamento)}</span>
          </div>
        </div>
      </div>
    `;
  });

  DOM.containerCardsOficinas.innerHTML = HTML;
}

// =========================================================================
// 5. MOTOR DE VISUALIZAÇÃO GRÁFICA (CHART.JS)
// =========================================================================

function renderizarGraficosAnaliticos(vendas) {
  destruirInstanciasGraficos();

  if (DOM.graficos.canvasStatus) {
    const contadoresStatus = {};
    vendas.forEach(v => contadoresStatus[v.status] = (contadoresStatus[v.status] || 0) + 1);

    chartStatusInstance = new Chart(DOM.graficos.canvasStatus, {
      type: 'doughnut',
      data: {
        labels: Object.keys(contadoresStatus),
        datasets: [{
          data: Object.values(contadoresStatus),
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6b7280', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  if (DOM.graficos.canvasServico) {
    const contadoresServicos = {};
    vendas.forEach(v => contadoresServicos[v.servico] = (contadoresServicos[v.servico] || 0) + 1);

    chartServicoInstance = new Chart(DOM.graficos.canvasServico, {
      type: 'bar',
      data: {
        labels: Object.keys(contadoresServicos),
        datasets: [{
          label: 'Atendimentos por Serviço',
          data: Object.values(contadoresServicos),
          backgroundColor: '#0b53a7',
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }
}

function destruirInstanciasGraficos() {
  if (chartStatusInstance) {
    chartStatusInstance.destroy();
    chartStatusInstance = null;
  }
  if (chartServicoInstance) {
    chartServicoInstance.destroy();
    chartServicoInstance = null;
  }
}

// =========================================================================
// 6. TABELA DE EXIBIÇÃO E FILTRAGEM LOCAL DE DADOS
// =========================================================================

function renderizarTabelaPedidos(vendas) {
  if (!DOM.containerPedidos) return;

  if (vendas.length === 0) {
    DOM.containerPedidos.innerHTML = `
      <div class="p-5 text-center text-muted">
        <i class="bi bi-search display-5 d-block mb-3"></i>
        Nenhuma OS encontrada para os critérios selecionados.
      </div>`;
    return;
  }

  let tabelaHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Nº OS / ID</th>
            <th>Data Emissão</th>
            <th>Unidade / Oficina</th>
            <th>Serviço Realizado</th>
            <th>Status</th>
            <th class="text-end">Faturamento Total</th>
            <th class="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  vendas.forEach(v => {
    const totalGeral = v.valorProdutos + v.valorServicos;
    tabelaHTML += `
      <tr>
        <td><strong class="text-primary">#${v.os}</strong></td>
        <td>${formatarDataExibicaoBR(v.data)}</td>
        <td>${v.loja}</td>
        <td>${v.servico}</td>
        <td><span class="badge ${obterClasseTagStatus(v.status)}">${v.status}</span></td>
        <td class="text-end fw-bold">${formatarMoeda(totalGeral)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary btn-ver-detalhes" data-id="${v.id}">
            <i class="bi bi-eye-fill me-1"></i> Visualizar
          </button>
        </td>
      </tr>
    `;
  });

  tabelaHTML += `</tbody></table></div>`;
  DOM.containerPedidos.innerHTML = tabelaHTML;

  // Registrar escutadores de ação na tabela renderizada
  document.querySelectorAll(".btn-ver-detalhes").forEach(btn => {
    btn.addEventListener("click", (evt) => {
      const idTarget = evt.currentTarget.getAttribute("data-id");
      abrirModalDetalhesTicket(idTarget);
    });
  });
}

function aplicarFiltrosSecundarios() {
  const buscaTexto = DOM.pesquisaOS ? DOM.pesquisaOS.value.toLowerCase().trim() : '';
  const statusFiltro = DOM.filtroStatus ? DOM.filtroStatus.value : 'Todos';

  const dadosFiltrados = vendasAtuais.filter(item => {
    const atendeStatus = (statusFiltro === 'Todos') || (item.status.toLowerCase() === statusFiltro.toLowerCase());
    const atendeTexto = item.os.toString().toLowerCase().includes(buscaTexto) ||
                        item.loja.toLowerCase().includes(buscaTexto) ||
                        item.servico.toLowerCase().includes(buscaTexto) ||
                        (item.cliente && item.cliente.toLowerCase().includes(buscaTexto));
    return atendeStatus && atendeTexto;
  });

  renderizarTabelaPedidos(dadosFiltrados);
}

// =========================================================================
// 7. GERENCIAMENTO DE MODAIS E INTERAÇÕES
// =========================================================================

function preencherOpcoesLojasModal(vendas) {
  if (!DOM.modalTicket.selectLoja) return;

  const listaLojas = [...new Set(vendas.map(v => v.loja))].sort();
  
  let HTML = `<option value="" disabled selected>Selecione a oficina...</option>`;
  listaLojas.forEach(loja => {
    HTML += `<option value="${loja}">${loja}</option>`;
  });

  DOM.modalTicket.selectLoja.innerHTML = HTML;
}

function executarBuscaTicketModal() {
  const lojaSel = DOM.modalTicket.selectLoja ? DOM.modalTicket.selectLoja.value : '';
  const serieVal = DOM.modalTicket.inputSerie ? DOM.modalTicket.inputSerie.value.trim() : '';
  const numVal = DOM.modalTicket.inputNumero ? DOM.modalTicket.inputNumero.value.trim() : '';

  if (!DOM.modalTicket.resultado) return;

  if (!lojaSel || !serieVal || !numVal) {
    DOM.modalTicket.resultado.style.display = "block";
    DOM.modalTicket.resultado.className = "alert alert-warning mt-3";
    DOM.modalTicket.resultado.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Informe a Loja, Série e o Número da OS.`;
    return;
  }

  const localizado = vendasAtuais.find(v => 
    v.loja === lojaSel && 
    v.os.toString() === numVal
  );

  DOM.modalTicket.resultado.style.display = "block";

  if (localizado) {
    DOM.modalTicket.resultado.className = "alert alert-success mt-3";
    DOM.modalTicket.resultado.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>OS #${localizado.os} Localizada</strong>
        <span class="badge bg-success">${localizado.status}</span>
      </div>
      <div><strong>Loja:</strong> ${localizado.loja}</div>
      <div><strong>Serviço:</strong> ${localizado.servico}</div>
      <div><strong>Valor Total:</strong> ${formatarMoeda(localizado.valorProdutos + localizado.valorServicos)}</div>
    `;
  } else {
    DOM.modalTicket.resultado.className = "alert alert-danger mt-3";
    DOM.modalTicket.resultado.innerHTML = `<i class="bi bi-x-circle me-2"></i>Nenhum registro encontrado com estas especificações.`;
  }
}

function abrirModalDetalhesTicket(idTicket) {
  const ticket = vendasAtuais.find(v => v.id.toString() === idTicket.toString());

  if (!DOM.modalDetalhes.conteudo) return;

  if (!ticket) {
    DOM.modalDetalhes.conteudo.innerHTML = `<p class="text-danger p-3">Não foi possível carregar os detalhes desta Ordem de Serviço.</p>`;
  } else {
    DOM.modalDetalhes.conteudo.innerHTML = `
      <div class="p-2">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-muted d-block small">Número da OS</span>
            <strong class="fs-5 text-primary">#${ticket.os}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Data do Registro</span>
            <strong>${formatarDataExibicaoBR(ticket.data)}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Oficina / Unidade</span>
            <strong>${ticket.loja}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Status Atual</span>
            <span class="badge ${obterClasseTagStatus(ticket.status)}">${ticket.status}</span>
          </div>
          <div class="col-12"><hr class="my-2"></div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Cliente</span>
            <strong>${ticket.cliente}</strong>
          </div>
          <div class="col-md-6">
            <span class="text-muted d-block small">Técnico Responsável</span>
            <strong>${ticket.tecnico}</strong>
          </div>
          <div class="col-12">
            <span class="text-muted d-block small">Descrição do Serviço</span>
            <strong>${ticket.servico}</strong>
          </div>
          <div class="col-12"><hr class="my-2"></div>
          <div class="col-md-4">
            <span class="text-muted d-block small">Valor de Produtos</span>
            <span>${formatarMoeda(ticket.valorProdutos)}</span>
          </div>
          <div class="col-md-4">
            <span class="text-muted d-block small">Valor de Serviços</span>
            <span>${formatarMoeda(ticket.valorServicos)}</span>
          </div>
          <div class="col-md-4">
            <span class="text-muted d-block small">Total Acumulado</span>
            <span class="fw-bold text-success fs-5">${formatarMoeda(ticket.valorProdutos + ticket.valorServicos)}</span>
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
// 8. HELPERS, MOCKS E UTILITÁRIOS SISTÊMICOS
// =========================================================================

function validarIntervaloDatas(inicio, fim) {
  if (!inicio || !fim) {
    alert("Selecione ambas as datas de início e fim.");
    return false;
  }
  if (inicio > fim) {
    alert("A data inicial não pode ser maior que a data final.");
    return false;
  }
  return true;
}

function atualizarCabecalhoData(inicio, fim) {
  if (DOM.dataExibicao) {
    DOM.dataExibicao.textContent = `Período: ${formatarDataExibicaoBR(inicio)} até ${formatarDataExibicaoBR(fim)}`;
  }
}

function formatarParaInputDate(dataObj) {
  const ano = dataObj.getFullYear();
  const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
  const dia = String(dataObj.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataExibicaoBR(dataISO) {
  if (!dataISO) return "";
  const partes = dataISO.split("T")[0].split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMoeda(valor) {
  return (parseFloat(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function obterClasseTagStatus(status) {
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

function exibirEstadoCarregando() {
  if (DOM.containerPedidos) {
    DOM.containerPedidos.innerHTML = `
      <div class="text-center py-5 text-muted">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <div>Consultando banco de dados no período selecionado...</div>
      </div>`;
  }
}

function exibirErroNaTabela(mensagem) {
  if (DOM.containerPedidos) {
    DOM.containerPedidos.innerHTML = `
      <div class="alert alert-danger m-4 text-center">
        <i class="bi bi-exclamation-octagon display-6 d-block mb-2"></i>
        ${mensagem}
      </div>`;
  }
}

function gerarDadosMocadoContingencia(inicio, fim) {
  return [
    { id: '101', os: '1001', serie: '1', loja: 'Oficina Central', status: 'Finalizado', servico: 'Troca de Óleo e Filtro', valorProdutos: 180.00, valorServicos: 90.00, pecas: 2, data: inicio, cliente_nome: 'Carlos Silva', tecnico_responsavel: 'João Paulo' },
    { id: '102', os: '1002', serie: '1', loja: 'Oficina Sul', status: 'Aguardando coleta', servico: 'Alinhamento e Balanceamento', valorProdutos: 0.00, valorServicos: 150.00, pecas: 0, data: inicio, cliente_nome: 'Maria Oliveira', tecnico_responsavel: 'Roberto Souza' },
    { id: '103', os: '1003', serie: '2', loja: 'Oficina Central', status: 'Retrabalho', servico: 'Manutenção Sistema de Freios', valorProdutos: 320.00, valorServicos: 140.00, pecas: 4, data: fim, cliente_nome: 'Fernanda Santos', tecnico_responsavel: 'João Paulo' },
    { id: '104', os: '1004', serie: '1', loja: 'Oficina Norte', status: 'Em serviço', servico: 'Substituição Correia Dentada', valorProdutos: 450.00, valorServicos: 220.00, pecas: 3, data: fim, cliente_nome: 'Ricardo Mendes', tecnico_responsavel: 'Marcos Lima' },
    { id: '105', os: '1005', serie: '1', loja: 'Oficina Leste', status: 'Finalizado', servico: 'Revisão Geral de Suspensão', valorProdutos: 890.00, valorServicos: 350.00, pecas: 6, data: fim, cliente_nome: 'Juliana Costa', tecnico_responsavel: 'André Rocha' }
  ];
}
