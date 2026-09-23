import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

// =========================================================================
// 1. MAPEAMENTO E ELEMENTOS DO DOM
// =========================================================================
const DOM = {
  containerPedidos: document.getElementById("containerPedidos"),
  filtroStatus: document.getElementById("filtroStatus"),
  pesquisaOS: document.getElementById("pesquisaOS"),
  btnFiltrar: document.getElementById("btnFiltrar"),
  dataExibicao: document.getElementById("data_exibicao"),
  containerCardsOficinas: document.getElementById("cards"),

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

  // KPIs Operacionais
  kpis: {
    faturamento: document.getElementById("kpiFaturamento"),
    total: document.getElementById("kpiTotal"),
    pendentes: document.getElementById("kpiPendentes"),
    retrabalho: document.getElementById("kpiRetrabalho"),
    pecas: document.getElementById("kpiPecas"),
  },

  // Telas de Gráficos
  graficos: {
    status: document.getElementById("graficoStatus"),
    servico: document.getElementById("graficoServico"),
  }
};

// =========================================================================
// 2. ESTADO DA APLICAÇÃO & INSTÂNCIAS
// =========================================================================
const state = {
  pedidosGlobais: [],
  oficinasHoje: [],
  chartStatus: null,
  chartServico: null,
  debounceTimer: null,
  realtimeChannel: null,
  isCarregando: false,
};

// Configurações e Mapeamentos Visuais
const PALETA_CORES = {
  sucesso: { bg: "#f0fdf4", texto: "#16a34a", hex: "#16a34a" },
  transporte: { bg: "#eff6ff", texto: "#2563eb", hex: "#2563eb" },
  alerta: { bg: "#fef2f2", texto: "#dc2626", hex: "#dc2626" },
  pendente: { bg: "#fefce8", texto: "#ca8a04", hex: "#ca8a04" },
  roxo: { hex: "#8b5cf6" },
  escuro: { hex: "#475569" }
};

// Formato padrão Moeda BRL
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// =========================================================================
// 3. FUNÇÕES AUXILIARES DE TRATAMENTO E SEGURANÇA
// =========================================================================

/**
 * Sanitiza strings para exibição segura via HTML (Prevenção contra XSS)
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Retorna as cores estilizadas com base no status do pedido.
 */
function obterEstiloStatus(status) {
  const s = String(status || "").toLowerCase().trim();

  if (s.includes("finalizado") || s.includes("entregue") || s.includes("concluido")) {
    return PALETA_CORES.sucesso;
  }
  if (s.includes("transporte") || s.includes("coleta") || s.includes("retorno") || s.includes("rota")) {
    return PALETA_CORES.transporte;
  }
  if (s.includes("retrabalho") || s.includes("orçamento") || s.includes("recusado") || s.includes("cancelado")) {
    return PALETA_CORES.alerta;
  }
  return PALETA_CORES.pendente;
}

/**
 * Consulta a API do Ticket e Exibe o Modal Flutuante com os Dados
 */
async function consultarEExibirTicket(lojaId, serie, numero) {
  const lojaLimpa = String(lojaId || "").trim();
  const serieLimpa = String(serie || "1").trim() || "1";
  const numeroLimpo = String(numero || "").trim();

  if (!lojaLimpa) {
    alert("Por favor, selecione uma Loja / Oficina válida.");
    return;
  }
  if (!numeroLimpo) {
    alert("Por favor, informe o NÚMERO do Ticket.");
    return;
  }

  if (DOM.modalTicket.btnBuscar) {
    DOM.modalTicket.btnBuscar.disabled = true;
    DOM.modalTicket.btnBuscar.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Consultando...`;
  }

  try {
    const urlTicket = `${API_URL}/oficina/ticket/${encodeURIComponent(lojaLimpa)}/${encodeURIComponent(serieLimpa)}/${encodeURIComponent(numeroLimpo)}`;
    const response = await fetch(urlTicket);

    let dadosTicket = null;
    if (response.ok) {
      dadosTicket = await response.json();
    }

    renderizarDetalhesTicketModal(dadosTicket, { loja: lojaLimpa, serie: serieLimpa, numero: numeroLimpo });

    const elemBusca = DOM.modalTicket.elemento;
    const elemDetalhes = DOM.modalDetalhes.elemento;

    if (!elemBusca || !elemDetalhes) return;

    const instanceBusca = bootstrap.Modal.getInstance(elemBusca) || new bootstrap.Modal(elemBusca);
    const instanceDetalhes = bootstrap.Modal.getInstance(elemDetalhes) || new bootstrap.Modal(elemDetalhes);

    // Transição segura entre os modais do Bootstrap
    if (elemBusca.classList.contains("show")) {
      const onModalHidden = () => {
        elemBusca.removeEventListener("hidden.bs.modal", onModalHidden);
        instanceDetalhes.show();
      };
      elemBusca.addEventListener("hidden.bs.modal", onModalHidden);
      instanceBusca.hide();
    } else {
      instanceDetalhes.show();
    }

  } catch (error) {
    console.error("❌ Erro ao consultar ticket:", error);
    alert("Não foi possível carregar os dados do ticket. Verifique a conexão com o servidor local.");
  } finally {
    if (DOM.modalTicket.btnBuscar) {
      DOM.modalTicket.btnBuscar.disabled = false;
      DOM.modalTicket.btnBuscar.innerHTML = `<i class="bi bi-search me-1"></i> Consultar`;
    }
  }
}

/**
 * Monta a estrutura HTML dentro da tela flutuante de detalhes do ticket
 */
function renderizarDetalhesTicketModal(dados, params) {
  if (!DOM.modalDetalhes.conteudo) return;

  if (!dados) {
    DOM.modalDetalhes.conteudo.innerHTML = `
      <div class="alert alert-warning mb-3">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> Ticket não encontrado na API local ou dados indisponíveis no momento.
      </div>
      <div class="card p-3">
        <h6 class="fw-bold mb-2">Informações da Consulta</h6>
        <p class="mb-1"><strong>Loja/Oficina:</strong> ${escapeHTML(params.loja)}</p>
        <p class="mb-1"><strong>Série:</strong> ${escapeHTML(params.serie)}</p>
        <p class="mb-0"><strong>Número do Ticket:</strong> ${escapeHTML(params.numero)}</p>
      </div>
    `;
    return;
  }

  const pecasHTML = (dados.pecas || []).map((peca) => {
    const servicosHTML = (peca.servicos || []).map((s) => {
      const isEntregue = String(s.status || '').toLowerCase() === 'entregue';
      const badgeStatus = isEntregue 
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle">Entregue</span>` 
        : `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">${escapeHTML(s.status || 'Pendente')}</span>`;

      return `
        <tr>
          <td><small class="fw-medium">${escapeHTML(s.descricao)}</small></td>
          <td class="text-center">${s.quantidade || 1}</td>
          <td class="text-center">${fmtMoeda.format(s.preco || 0)}</td>
          <td class="text-center">${badgeStatus}</td>
          <td class="text-end"><small class="text-muted">${escapeHTML(s.executor || 'Não Informado')}</small></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card mb-3 border">
        <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
          <div>
            <strong class="text-primary me-2">Item #${peca.item}: ${escapeHTML(peca.descricao)}</strong>
            <span class="badge bg-secondary">${escapeHTML(peca.cor || 'Sem Cor')}</span>
            ${peca.marca ? `<span class="badge bg-outline-dark">${escapeHTML(peca.marca)}</span>` : ''}
          </div>
          <small class="text-muted">
            <i class="bi bi-calendar-check me-1"></i>Entrega: ${peca.data_entrega ? escapeHTML(peca.data_entrega) : 'Não agendada'}
          </small>
        </div>
        <div class="card-body p-0">
          ${peca.observacao_peca ? `<div class="p-2 bg-light-subtle border-bottom"><small><strong>Obs Peça:</strong> ${escapeHTML(peca.observacao_peca)}</small></div>` : ''}
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 align-middle">
              <thead class="table-light">
                <tr style="font-size: 0.75rem;">
                  <th>SERVIÇO</th>
                  <th class="text-center">QTD</th>
                  <th class="text-center">PREÇO</th>
                  <th class="text-center">STATUS</th>
                  <th class="text-end">EXECUTOR</th>
                </tr>
              </thead>
              <tbody>
                ${servicosHTML}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');

  DOM.modalDetalhes.conteudo.innerHTML = `
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <div class="p-3 border rounded bg-light">
          <small class="text-muted d-block text-uppercase fw-bold" style="font-size:0.7rem;">Oficina / Loja</small>
          <span class="fs-6 fw-bold text-dark">${escapeHTML(dados.nome_oficina || params.loja)}</span>
          <small class="text-muted d-block mt-1">Cód. Loja: ${escapeHTML(String(dados.loja || params.loja))}</small>
        </div>
      </div>
      <div class="col-md-3">
        <div class="p-3 border rounded bg-light">
          <small class="text-muted d-block text-uppercase fw-bold" style="font-size:0.7rem;">Ticket / Série</small>
          <span class="fs-6 fw-bold text-dark">#${escapeHTML(String(dados.numero || params.numero))} (Série ${escapeHTML(String(dados.serie || params.serie))})</span>
          <small class="text-muted d-block mt-1">Posição: ${escapeHTML(dados.posicao || '---')}</small>
        </div>
      </div>
      <div class="col-md-3">
        <div class="p-3 border rounded bg-light text-end">
          <small class="text-muted d-block text-uppercase fw-bold" style="font-size:0.7rem;">Valor Total</small>
          <span class="fs-5 fw-bold text-success">${fmtMoeda.format(dados.valor_final || dados.valor || 0)}</span>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body p-3">
        <div class="row g-2">
          <div class="col-md-5">
            <small class="text-muted d-block">CLIENTE</small>
            <strong class="text-dark">${escapeHTML(dados.cliente || 'Não Informado')}</strong>
          </div>
          <div class="col-md-3">
            <small class="text-muted d-block">TELEFONE</small>
            <span>${escapeHTML(dados.telefone || '---')}</span>
          </div>
          <div class="col-md-2">
            <small class="text-muted d-block">EMISSÃO</small>
            <small>${escapeHTML(dados.data_emissao || '---')}</small>
          </div>
          <div class="col-md-2">
            <small class="text-muted d-block">PREV. ENTREGA</small>
            <small class="fw-bold text-primary">${escapeHTML(dados.data_prevista || '---')}</small>
          </div>
        </div>

        ${dados.observacao_geral ? `
          <hr class="my-2">
          <div class="alert alert-warning mb-0 p-2" style="font-size: 0.85rem;">
            <i class="bi bi-info-circle me-1"></i><strong>Observação Geral:</strong> ${escapeHTML(dados.observacao_geral)}
          </div>
        ` : ''}
      </div>
    </div>

    <h6 class="fw-bold mb-2 text-dark"><i class="bi bi-box-seam me-1"></i> Peças e Serviços Solicitados</h6>
    ${pecasHTML || '<p class="text-muted small">Nenhuma peça detalhada para este ticket.</p>'}
  `;
}

/**
 * Extrai dados estruturados de observação tratando JSONs e strings chave:valor.
 */
function extrairDadosObs(obsText) {
  const dadosPadrao = {
    ticket: "---",
    cliente: "Não informado",
    saco: "---",
    pecas: 0,
    valor: 0
  };

  if (!obsText) return dadosPadrao;

  let obsObj = obsText;

  if (typeof obsText === "string") {
    const textoLimpo = obsText.trim();
    if (textoLimpo.startsWith("{") || textoLimpo.startsWith("[")) {
      try {
        obsObj = JSON.parse(textoLimpo);
      } catch {
        // Mantém como string caso falhe o parse
      }
    }
  }

  if (typeof obsObj === "object" && obsObj !== null) {
    const numPecas = parseInt(String(obsObj.pecas || obsObj.qtd || 0).replace(/\D/g, ""), 10);
    const numValor = parseFloat(String(obsObj.valor || obsObj.total || 0).replace(/[^\d,-]/g, "").replace(",", "."));

    return {
      ticket: String(obsObj.ticket || obsObj.cod || dadosPadrao.ticket),
      cliente: String(obsObj.cliente || obsObj.nome || dadosPadrao.cliente),
      saco: String(obsObj.saco || obsObj.bag || dadosPadrao.saco),
      pecas: isNaN(numPecas) ? 0 : numPecas,
      valor: isNaN(numValor) ? 0 : numValor
    };
  }

  const dados = { ...dadosPadrao };
  const partes = String(obsText).split(/[|\n]/);

  partes.forEach((parte) => {
    if (!parte.includes(":")) return;
    const [chave, ...valorArr] = parte.split(":");
    const valor = valorArr.join(":").trim();
    const chaveLower = chave.trim().toLowerCase();

    if (chaveLower.includes("ticket") || chaveLower.includes("cod")) {
      dados.ticket = valor;
    } else if (chaveLower.includes("cliente") || chaveLower.includes("cli")) {
      dados.cliente = valor;
    } else if (chaveLower.includes("saco")) {
      dados.saco = valor;
    } else if (chaveLower.includes("peça") || chaveLower.includes("peca")) {
      const p = parseInt(valor.replace(/\D/g, ""), 10);
      if (!isNaN(p)) dados.pecas = p;
    } else if (chaveLower.includes("valor") || chaveLower.includes("total")) {
      const v = parseFloat(valor.replace(/[^\d,-]/g, "").replace(",", "."));
      if (!isNaN(v)) dados.valor = v;
    }
  });

  return dados;
}

// =========================================================================
// 4. OFICINAS DO DIA & PREENCHIMENTO DE SELECTS
// =========================================================================

function atualizarSelectLojasModal(oficinas) {
  if (!DOM.modalTicket.selectLoja) return;

  if (!oficinas || oficinas.length === 0) {
    DOM.modalTicket.selectLoja.innerHTML = `<option value="" disabled selected>Nenhuma loja encontrada</option>`;
    return;
  }

  const options = oficinas.map((oficina) => {
    const idLoja = oficina.loja || "";
    const nome = oficina.nome_oficina || `Loja ${idLoja}`;
    return `<option value="${escapeHTML(String(idLoja))}">${escapeHTML(nome)} (Cód: ${escapeHTML(String(idLoja))})</option>`;
  });

  DOM.modalTicket.selectLoja.innerHTML = `<option value="" disabled selected>Selecione uma Loja / Oficina...</option>` + options.join('');
}

async function carregarOficinasHoje() {
  try {
    const res = await fetch(`${API_URL}/oficinas/hoje`);

    if (!res.ok) throw new Error(`Erro na API REST: Status ${res.status}`);

    const data = await res.json();

    if (data && data.sucesso) {
      state.oficinasHoje = data.oficinas || [];

      if (DOM.macro.totalFaturado) DOM.macro.totalFaturado.textContent = fmtMoeda.format(data.total_geral || 0);
      if (DOM.macro.totalProdutos) DOM.macro.totalProdutos.textContent = fmtMoeda.format(data.total_produtos || 0);
      if (DOM.macro.totalServicos) DOM.macro.totalServicos.textContent = fmtMoeda.format(data.total_servicos || 0);

      renderizarCardsOficinas(state.oficinasHoje);
      atualizarSelectLojasModal(state.oficinasHoje);
      return;
    }

    throw new Error("Formato de resposta inválido da API.");

  } catch (err) {
    console.warn("⚠️ Falha ao consumir API local. Aplicando fallback de consulta ao Supabase...", err.message);
    await carregarOficinasHojeFallbackSupabase();
  }
}

async function carregarOficinasHojeFallbackSupabase() {
  try {
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);

    const { data: pedidosHoje, error } = await supabase
      .from("pedidos")
      .select("*")
      .gte("created_at", hojeInicio.toISOString());

    if (error) throw error;

    const mapaOficinas = {};
    let faturamentoGeral = 0;

    (pedidosHoje || []).forEach((p) => {
      const lojaNome = p.loja_origem || "Loja Não Identificada";
      const parsed = extrairDadosObs(p.obs_loja_origem || p.observacao);

      const val = p.valor !== undefined && p.valor !== null
        ? parseFloat(String(p.valor).replace(/[^\d,-]/g, "").replace(",", "."))
        : parsed.valor;

      const pecasVal = p.pecas !== undefined && p.pecas !== null
        ? parseInt(String(p.pecas).replace(/\D/g, ""), 10)
        : parsed.pecas;

      const vFinal = isNaN(val) ? 0 : val;
      const pFinal = isNaN(pecasVal) ? 0 : pecasVal;

      faturamentoGeral += vFinal;

      if (!mapaOficinas[lojaNome]) {
        mapaOficinas[lojaNome] = {
          loja: p.loja_id || 1,
          nome_oficina: lojaNome,
          faturamento_total: 0,
          qtd_vendas: 0,
          total_pecas: 0,
          status: "Online"
        };
      }

      mapaOficinas[lojaNome].faturamento_total += vFinal;
      mapaOficinas[lojaNome].qtd_vendas += 1;
      mapaOficinas[lojaNome].total_pecas += pFinal;
    });

    state.oficinasHoje = Object.values(mapaOficinas);

    if (DOM.macro.totalFaturado) DOM.macro.totalFaturado.textContent = fmtMoeda.format(faturamentoGeral);
    if (DOM.macro.totalProdutos) DOM.macro.totalProdutos.textContent = fmtMoeda.format(0);
    if (DOM.macro.totalServicos) DOM.macro.totalServicos.textContent = fmtMoeda.format(faturamentoGeral);

    renderizarCardsOficinas(state.oficinasHoje);
    atualizarSelectLojasModal(state.oficinasHoje);

  } catch (err) {
    console.error("❌ Erro no fallback do Supabase:", err);
    if (DOM.containerCardsOficinas) {
      DOM.containerCardsOficinas.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
          Sem registros de oficinas ativas para o dia atual.
        </div>
      `;
    }
  }
}

function renderizarCardsOficinas(oficinas) {
  if (!DOM.containerCardsOficinas) return;

  if (!oficinas || oficinas.length === 0) {
    DOM.containerCardsOficinas.innerHTML = `
      <div class="col-12 text-center py-4">
        <p class="text-muted mb-0">Nenhuma movimentação de oficina registrada para hoje.</p>
      </div>
    `;
    return;
  }

  DOM.containerCardsOficinas.innerHTML = oficinas.map((oficina) => {
    const isOffline = String(oficina.status || "").toLowerCase() === "offline";
    const faturamento = oficina.faturamento_total || 0;

    const nomeFormatado = oficina.nome_oficina.includes(' - ')
      ? oficina.nome_oficina.split(' - ')[1]
      : oficina.nome_oficina;

    const idLoja = oficina.loja || "";

    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <div class="card-pdv p-4 d-flex flex-column justify-content-between">
          <div>
            <div class="status-indicator ${isOffline ? 'offline' : ''}"></div>
            
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="text-muted small fw-medium text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.05em;">
                CÓDIGO: ${escapeHTML(String(idLoja))}
              </div>
              
              ${!isOffline ? `
                <button type="button" class="btn btn-sm btn-outline-primary bg-light border text-primary btn-ver-ticket" data-loja="${escapeHTML(String(idLoja))}">
                  <i class="bi bi-receipt me-1"></i>Visualizar Ticket
                </button>
              ` : ''}
            </div>
            
            <h4 class="fw-bold text-dark h5 mb-2 text-truncate" title="${escapeHTML(oficina.nome_oficina)}">
              ${escapeHTML(nomeFormatado)}
            </h4>

            ${isOffline ? `
              <div class="fw-semibold fs-6 text-muted my-3">
                <i class="bi bi-wifi-off me-1 text-danger"></i> Indisponível
              </div>
            ` : `
              <div class="fw-bold fs-4 text-dark mb-3">
                ${fmtMoeda.format(faturamento)}
              </div>
            `}
          </div>

          <div>
            <hr class="my-3" style="border-color: #f1f5f9;">
            
            ${!isOffline ? `
              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="badge-doc"><i class="bi bi-receipt me-1"></i>${oficina.qtd_vendas || 0} Tickets</span>
                <span class="badge-doc"><i class="bi bi-box-seam me-1"></i>${oficina.total_pecas || 0} Peças</span>
              </div>
            ` : ''}
            
            <div class="text-secondary fw-semibold small mt-2 text-truncate" style="font-size: 0.72rem;" title="${escapeHTML(oficina.nome_oficina)}">
              <i class="bi bi-geo-alt-fill me-1 text-primary"></i>${escapeHTML(oficina.nome_oficina)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================================
// 5. RELATÓRIOS, KPIS E GRÁFICOS
// =========================================================================

function atualizarKPIs(pedidos) {
  let pendentes = 0;
  let retrabalho = 0;
  let totalPecas = 0;
  let faturamentoTotal = 0;

  pedidos.forEach((p) => {
    const st = String(p.status || "").toLowerCase();
    if (st.includes("coleta") || st.includes("aguardando") || st.includes("pendente")) pendentes++;
    if (st.includes("retrabalho")) retrabalho++;

    const parsed = extrairDadosObs(p.obs_loja_origem || p.observacao);

    if (p.pecas !== undefined && p.pecas !== null) {
      const q = parseInt(String(p.pecas).replace(/\D/g, ""), 10);
      totalPecas += isNaN(q) ? 0 : q;
    } else {
      totalPecas += parsed.pecas;
    }

    if (p.valor !== undefined && p.valor !== null) {
      const v = parseFloat(String(p.valor).replace(/[^\d,-]/g, "").replace(",", "."));
      faturamentoTotal += isNaN(v) ? 0 : v;
    } else {
      faturamentoTotal += parsed.valor;
    }
  });

  if (DOM.kpis.faturamento) DOM.kpis.faturamento.textContent = fmtMoeda.format(faturamentoTotal);
  if (DOM.kpis.total) DOM.kpis.total.textContent = pedidos.length;
  if (DOM.kpis.pendentes) DOM.kpis.pendentes.textContent = pendentes;
  if (DOM.kpis.retrabalho) DOM.kpis.retrabalho.textContent = retrabalho;
  if (DOM.kpis.pecas) DOM.kpis.pecas.textContent = totalPecas.toLocaleString("pt-BR");
}

async function gerarRelatorio() {
  if (state.isCarregando) return;
  state.isCarregando = true;

  try {
    if (DOM.containerPedidos && DOM.containerPedidos.children.length === 0) {
      DOM.containerPedidos.innerHTML = `<p style="text-align: center; color: #64748b; padding: 24px;">Carregando pedidos...</p>`;
    }

    let query = supabase.from("pedidos").select(`
      *,
      pedido_eventos ( observacao )
    `);

    const statusVal = DOM.filtroStatus?.value;
    if (statusVal && statusVal.toLowerCase() !== "todos") {
      query = query.ilike("status", `%${statusVal}%`);
    }

    const termo = DOM.pesquisaOS?.value?.trim();
    if (termo) {
      if (/^\d+$/.test(termo) && termo.length <= 10) {
        query = query.eq("id", Number(termo));
      } else {
        const termoSanitizado = termo.replace(/[%_,()]/g, "");
        if (termoSanitizado) {
          query = query.or(
            `loja_origem.ilike.%${termoSanitizado}%,tipo_servico.ilike.%${termoSanitizado}%,status.ilike.%${termoSanitizado}%`
          );
        }
      }
    }

    const { data: pedidos, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    state.pedidosGlobais = pedidos || [];

    atualizarKPIs(state.pedidosGlobais);
    renderizarTabelaRelatorio(state.pedidosGlobais);
    atualizarGraficos(state.pedidosGlobais);

  } catch (err) {
    console.error("❌ Erro ao gerar relatório:", err);
    if (DOM.containerPedidos) {
      DOM.containerPedidos.innerHTML = `
        <div style="text-align: center; color: #dc2626; padding: 24px;">
          <p><strong>Não foi possível carregar os dados.</strong></p>
          <small>${escapeHTML(err.message || "Erro de conexão com o banco de dados")}</small>
        </div>`;
    }
  } finally {
    state.isCarregando = false;
  }
}

function renderizarTabelaRelatorio(pedidos) {
  if (!DOM.containerPedidos) return;
  DOM.containerPedidos.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    DOM.containerPedidos.innerHTML = `<p style="text-align: center; color: #64748b; padding: 24px;">Nenhum pedido encontrado para os filtros selecionados.</p>`;
    return;
  }

  const tabela = document.createElement("table");
  tabela.className = "table table-hover align-middle mb-0";
  tabela.innerHTML = `
    <thead>
      <tr>
        <th>OS</th>
        <th>Loja Origem</th>
        <th>Serviço</th>
        <th>Status</th>
        <th>Detalhes / Obs</th>
        <th>Data do Registro</th>
      </tr>
    </thead>
    <tbody id="corpoTabela"></tbody>
  `;

  const corpoTabela = tabela.querySelector("#corpoTabela");
  const fragmento = document.createDocumentFragment();

  pedidos.forEach((p) => {
    const tr = document.createElement("tr");
    const parsedObs = extrairDadosObs(p.obs_loja_origem || p.observacao);
    const coresStatus = obterEstiloStatus(p.status);

    const ticket = escapeHTML(p.ticket || parsedObs.ticket);
    const cliente = escapeHTML(p.cliente || parsedObs.cliente);
    const saco = escapeHTML(p.saco || parsedObs.saco);

    const pecasVal = p.pecas ?? parsedObs.pecas;
    const pecas = escapeHTML(String(pecasVal));

    const valorVal = p.valor !== undefined && p.valor !== null ? p.valor : parsedObs.valor;
    const valorNum = typeof valorVal === "number" ? valorVal : parseFloat(String(valorVal).replace(/[^\d,-]/g, "").replace(",", "."));
    const valorStr = !isNaN(valorNum) ? fmtMoeda.format(valorNum) : escapeHTML(String(valorVal || "0,00"));

    let dataFormatada = "---";
    const dataRef = p.criado_em || p.created_at;
    if (dataRef) {
      const d = new Date(dataRef);
      if (!isNaN(d.getTime())) {
        dataFormatada = `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
      }
    }

    tr.innerHTML = `
      <td><strong>#${escapeHTML(String(p.id ?? "N/A"))}</strong></td>
      <td>${escapeHTML(p.loja_origem ?? "Não informada")}</td>
      <td><span class="badge bg-light text-dark border">${escapeHTML(p.tipo_servico ?? "Geral")}</span></td>
      <td>
        <span class="badge" style="background-color: ${coresStatus.bg}; color: ${coresStatus.texto}; border: 1px solid ${coresStatus.texto}33;">
          ${escapeHTML(p.status ?? "Sem status")}
        </span>
      </td>
      <td>
        <div class="d-flex flex-wrap gap-1">
          <span class="badge bg-light text-secondary border">Ticket: <strong>${ticket}</strong></span>
          <span class="badge bg-light text-secondary border">Cliente: <strong>${cliente}</strong></span>
          <span class="badge bg-light text-secondary border">Saco: <strong>${saco}</strong></span>
          <span class="badge bg-light text-secondary border">Peças: <strong>${pecas}</strong></span>
          <span class="badge bg-light text-secondary border">Valor: <strong>${valorStr}</strong></span>
        </div>
      </td>
      <td style="color: #64748b; font-size: 0.85rem;">${dataFormatada}</td>
    `;

    fragmento.appendChild(tr);
  });

  corpoTabela.appendChild(fragmento);
  DOM.containerPedidos.appendChild(tabela);
}

function atualizarGraficos(pedidos) {
  if (typeof window.Chart === "undefined") return;

  const statusCount = {};
  const servicoCount = {};

  pedidos.forEach((p) => {
    const st = p.status ?? "Sem Status";
    const sr = p.tipo_servico ?? "Geral";
    statusCount[st] = (statusCount[st] || 0) + 1;
    servicoCount[sr] = (servicoCount[sr] || 0) + 1;
  });

  if (DOM.graficos.status) {
    const labelsStatus = Object.keys(statusCount);
    const dataStatus = Object.values(statusCount);

    if (state.chartStatus) {
      state.chartStatus.data.labels = labelsStatus;
      state.chartStatus.data.datasets[0].data = dataStatus;
      state.chartStatus.update("none");
    } else {
      const chartExistente = Chart.getChart(DOM.graficos.status);
      if (chartExistente) chartExistente.destroy();

      state.chartStatus = new Chart(DOM.graficos.status.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: labelsStatus,
          datasets: [{
            data: dataStatus,
            backgroundColor: [
              PALETA_CORES.pendente.hex,
              PALETA_CORES.sucesso.hex,
              PALETA_CORES.alerta.hex,
              PALETA_CORES.transporte.hex,
              PALETA_CORES.roxo.hex,
              PALETA_CORES.escuro.hex
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }
  }

  if (DOM.graficos.servico) {
    const labelsServico = Object.keys(servicoCount);
    const dataServico = Object.values(servicoCount);

    if (state.chartServico) {
      state.chartServico.data.labels = labelsServico;
      state.chartServico.data.datasets[0].data = dataServico;
      state.chartServico.update("none");
    } else {
      const chartExistente = Chart.getChart(DOM.graficos.servico);
      if (chartExistente) chartExistente.destroy();

      state.chartServico = new Chart(DOM.graficos.servico.getContext("2d"), {
        type: "bar",
        data: {
          labels: labelsServico,
          datasets: [{
            label: "Volume de Pedidos",
            data: dataServico,
            backgroundColor: "#0b53a7",
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }
}

// =========================================================================
// 6. REALTIME & INICIALIZAÇÃO DOS EVENTOS
// =========================================================================

/**
 * Inscreve no canal WebSocket do Supabase para refletir alterações em tempo real
 */
async function escutarRealtime() {
  if (state.realtimeChannel) {
    await supabase.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }

  state.realtimeChannel = supabase
    .channel("admin-pedidos-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedidos" },
      () => {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
          gerarRelatorio();
          carregarOficinasHoje();
        }, 400);
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log("⚡ Conectado ao Realtime do Supabase (Pedidos)");
      } else if (status === "CHANNEL_ERROR") {
        console.warn("⚠️ Erro na conexão Realtime:", err);
      }
    });
}

// Inicializador Principal
document.addEventListener("DOMContentLoaded", () => {
  // Preenche a data no topo se estiver vazia
  if (DOM.dataExibicao && !DOM.dataExibicao.textContent.trim()) {
    DOM.dataExibicao.textContent = `(${new Date().toLocaleDateString("pt-BR")})`;
  }

  // Carga Inicial dos Dados
  carregarOficinasHoje();
  gerarRelatorio();
  escutarRealtime();

  // Eventos da Barra de Pesquisa e Filtros
  DOM.btnFiltrar?.addEventListener("click", gerarRelatorio);
  DOM.filtroStatus?.addEventListener("change", gerarRelatorio);

  DOM.pesquisaOS?.addEventListener("input", () => {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(gerarRelatorio, 350);
  });

  // Ação do Botão Consultar do Modal de Ticket
  DOM.modalTicket.btnBuscar?.addEventListener("click", () => {
    const lojaVal = DOM.modalTicket.selectLoja?.value;
    const serieVal = DOM.modalTicket.inputSerie?.value || "1";
    const numeroVal = DOM.modalTicket.inputNumero?.value;

    consultarEExibirTicket(lojaVal, serieVal, numeroVal);
  });

  // Clique no botão "Visualizar Ticket" dos Cards Individuais de Oficina
  DOM.containerCardsOficinas?.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".btn-ver-ticket");
    if (!btn) return;

    const idLoja = btn.dataset.loja;

    // Pré-seleciona a loja correspondente no select do modal
    if (DOM.modalTicket.selectLoja && idLoja) {
      DOM.modalTicket.selectLoja.value = idLoja;
    }

    // Exibe o Modal de busca com validação de instância
    if (DOM.modalTicket.elemento && typeof bootstrap !== "undefined") {
      const modalInstancia =
        bootstrap.Modal.getInstance(DOM.modalTicket.elemento) ||
        new bootstrap.Modal(DOM.modalTicket.elemento);
      
      modalInstancia.show();
    }
  });
});

// Limpeza de recursos na saída para evitar vazamento de memória e sockets abertos
window.addEventListener("beforeunload", () => {
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
  }
  if (state.chartStatus) state.chartStatus.destroy();
  if (state.chartServico) state.chartServico.destroy();
});
