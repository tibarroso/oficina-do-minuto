import { supabase } from "./supabase.js";

// Configuração da URL da API (Autodetecta local vs produção)
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://sua-api-em-producao.com"; // Substitua caso publique a API futuramente

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
 * Extrai dados estruturados de observação tratando JSONs, strings chave:valor e nulos.
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
        // Falha no parse JSON
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
// 4. OFICINAS DO DIA (BUSCA DA API HTTP /oficinas/hoje)
// =========================================================================

/**
 * Consulta a API HTTP local para obter os dados consolidados das oficinas do dia.
 */
async function carregarOficinasHoje() {
  try {
    const response = await fetch(`${API_URL}/oficinas/hoje`);

    if (!response.ok) {
      throw new Error(`Erro na API HTTP: Status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.sucesso) {
      state.oficinasHoje = data.oficinas || [];

      // Atualiza os Cards Macros de Faturamento no Topo
      if (DOM.macro.totalFaturado) {
        DOM.macro.totalFaturado.textContent = fmtMoeda.format(data.total_geral || 0);
      }
      if (DOM.macro.totalProdutos) {
        DOM.macro.totalProdutos.textContent = fmtMoeda.format(data.total_produtos || 0);
      }
      if (DOM.macro.totalServicos) {
        DOM.macro.totalServicos.textContent = fmtMoeda.format(data.total_servicos || 0);
      }

      // Renderiza os cards das oficinas na tela
      renderizarCardsOficinas(state.oficinasHoje);
    } else {
      throw new Error(data.mensagem || "Resposta sem sucesso da API");
    }

  } catch (err) {
    console.error("❌ Erro ao buscar dados de /oficinas/hoje:", err);
    if (DOM.containerCardsOficinas) {
      DOM.containerCardsOficinas.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
          Sem registros de oficinas ativas para o dia atual.
        </div>
      `;
    }
  }
}

/**
 * Renderiza os cards das oficinas/PDVs na interface.
 */
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
    const isOffline = oficina.status === "Offline";
    const faturamento = oficina.faturamento_total || 0;

    const nomeFormatado = oficina.nome_oficina.includes(' - ')
      ? oficina.nome_oficina.split(' - ')[1]
      : oficina.nome_oficina;

    let ticketUrl = `/oficina/ticket/${oficina.loja}/1/1`;
    if (oficina.loja === 100) ticketUrl = `/oficina/ticket/100/1/36171`;
    else if (oficina.loja === 102) ticketUrl = `/oficina/ticket/102/1/1169`;
    else if (oficina.loja === 103) ticketUrl = `/oficina/ticket/103/1/48085`;

    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <div class="card-pdv p-4 d-flex flex-column justify-content-between">
          <div>
            <div class="status-indicator ${isOffline ? 'offline' : ''}"></div>
            
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="text-muted small fw-medium text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.05em;">
                CÓDIGO: ${escapeHTML(String(oficina.loja))}
              </div>
              
              ${!isOffline ? `
                <a href="${ticketUrl}" class="btn-teste-ticket btn-outline-primary bg-light border text-primary" target="_blank">
                  <i class="bi bi-search me-1"></i>Testar Ticket
                </a>
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
// 5. LÓGICA DE NEGÓCIO: RELATÓRIOS E PEDIDOS
// =========================================================================

/**
 * Atualiza os KPIs operacionais e macros na tela.
 */
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

    // Soma das Peças
    if (p.pecas !== undefined && p.pecas !== null) {
      const q = parseInt(String(p.pecas).replace(/\D/g, ""), 10);
      totalPecas += isNaN(q) ? 0 : q;
    } else {
      totalPecas += parsed.pecas;
    }

    // Soma do Faturamento
    if (p.valor !== undefined && p.valor !== null) {
      const v = parseFloat(String(p.valor).replace(/[^\d,-]/g, "").replace(",", "."));
      faturamentoTotal += isNaN(v) ? 0 : v;
    } else {
      faturamentoTotal += parsed.valor;
    }
  });

  // Atualiza Indicadores Rápidos
  if (DOM.kpis.faturamento) DOM.kpis.faturamento.textContent = fmtMoeda.format(faturamentoTotal);
  if (DOM.kpis.total) DOM.kpis.total.textContent = pedidos.length;
  if (DOM.kpis.pendentes) DOM.kpis.pendentes.textContent = pendentes;
  if (DOM.kpis.retrabalho) DOM.kpis.retrabalho.textContent = retrabalho;
  if (DOM.kpis.pecas) DOM.kpis.pecas.textContent = totalPecas.toLocaleString("pt-BR");

  if (DOM.macro.totalFaturado && (!DOM.macro.totalFaturado.textContent || DOM.macro.totalFaturado.textContent.includes("0,00"))) {
    DOM.macro.totalFaturado.textContent = fmtMoeda.format(faturamentoTotal);
  }
}

/**
 * Consulta dados no Supabase e gerencia o ciclo de atualização.
 */
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

    // Filtro por Status
    const statusVal = DOM.filtroStatus?.value;
    if (statusVal && statusVal.toLowerCase() !== "todos") {
      query = query.ilike("status", `%${statusVal}%`);
    }

    // Filtro de Pesquisa
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

    const { data: pedidos, error } = await query.order("criado_em", { ascending: false });

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

/**
 * Renderiza os registros em formato de Tabela com DOM Fragment e Sanitização.
 */
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
    const valorStr = typeof valorVal === "number" 
      ? fmtMoeda.format(valorVal) 
      : escapeHTML(String(valorVal));

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

/**
 * Desenha e atualiza os gráficos Chart.js com tratamento de concorrência.
 */
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

  // --- Gráfico Status (Doughnut) ---
  if (DOM.graficos.status) {
    const labelsStatus = Object.keys(statusCount);
    const dataStatus = Object.values(statusCount);

    if (state.chartStatus) {
      state.chartStatus.data.labels = labelsStatus;
      state.chartStatus.data.datasets[0].data = dataStatus;
      state.chartStatus.update("none");
    } else {
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

  // --- Gráfico Serviço (Bar) ---
  if (DOM.graficos.servico) {
    const labelsServico = Object.keys(servicoCount);
    const dataServico = Object.values(servicoCount);

    if (state.chartServico) {
      state.chartServico.data.labels = labelsServico;
      state.chartServico.data.datasets[0].data = dataServico;
      state.chartServico.update("none");
    } else {
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
// 6. EVENTOS REALTIME & INICIALIZAÇÃO
// =========================================================================

/**
 * Assina atualizações em tempo real com reutilização de canal.
 */
function escutarRealtime() {
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
  }

  state.realtimeChannel = supabase
    .channel("admin-pedidos-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        gerarRelatorio();
        carregarOficinasHoje();
      }, 400);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("⚡ Conectado ao Realtime do Supabase (Pedidos)");
      }
    });
}

// Inicializador Único
document.addEventListener("DOMContentLoaded", () => {
  if (DOM.dataExibicao && !DOM.dataExibicao.textContent.trim()) {
    DOM.dataExibicao.textContent = `(${new Date().toLocaleDateString('pt-BR')})`;
  }

  carregarOficinasHoje();
  gerarRelatorio();
  escutarRealtime();

  DOM.btnFiltrar?.addEventListener("click", gerarRelatorio);
  DOM.filtroStatus?.addEventListener("change", gerarRelatorio);

  DOM.pesquisaOS?.addEventListener("input", () => {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(gerarRelatorio, 350);
  });
});

// Limpeza de recursos na saída
window.addEventListener("beforeunload", () => {
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
  }
  if (state.chartStatus) state.chartStatus.destroy();
  if (state.chartServico) state.chartServico.destroy();
});
