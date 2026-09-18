import { supabase } from "./supabase.js";

// Elementos do DOM
const containerPedidos = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");

// Estado da Aplicação
let pedidosGlobais = [];
let chartStatus = null;
let chartServico = null;
let debounceTimer = null;
let realtimeChannel = null;

/**
 * Retorna as cores estilizadas com base no status do pedido.
 */
function obterEstiloStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("finalizado") || s.includes("entregue")) {
    return { bg: "#e8f8f5", texto: "#18BC9C" };
  }
  if (s.includes("transporte") || s.includes("coleta") || s.includes("retorno")) {
    return { bg: "#eef2f7", texto: "#2980b9" };
  }
  if (s.includes("retrabalho") || s.includes("orçamento")) {
    return { bg: "#fdedec", texto: "#e74c3c" };
  }
  return { bg: "#fef9e7", texto: "#f39c12" };
}

/**
 * Extrai campos organizados de textos estruturados em chave-valor ou objetos JSON.
 */
function extrairDadosObs(obsText) {
  const dadosPadrao = {
    ticket: "---",
    cliente: "Não informado",
    saco: "---",
    pecas: "0",
    valor: "0,00"
  };

  if (!obsText) return dadosPadrao;

  // Trata caso a observação venha como objeto JSON ou string JSON
  let obsObj = obsText;
  if (typeof obsText === "string" && (obsText.startsWith("{") || obsText.startsWith("["))) {
    try {
      obsObj = JSON.parse(obsText);
    } catch {
      // Caso falhe o parse, continua como string comum
    }
  }

  if (typeof obsObj === "object" && obsObj !== null) {
    return {
      ticket: obsObj.ticket || obsObj.cod || dadosPadrao.ticket,
      cliente: obsObj.cliente || obsObj.nome || dadosPadrao.cliente,
      saco: obsObj.saco || obsObj.bag || dadosPadrao.saco,
      pecas: String(obsObj.pecas || obsObj.qtd || dadosPadrao.pecas),
      valor: String(obsObj.valor || obsObj.total || dadosPadrao.valor)
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
      dados.pecas = valor;
    } else if (chaveLower.includes("valor") || chaveLower.includes("total")) {
      dados.valor = valor.replace(/R\$\s?/, "").trim();
    }
  });

  return dados;
}

/**
 * Atualiza os contadores em tela.
 */
function atualizarKPIs(pedidos) {
  let pendentes = 0;
  let retrabalho = 0;
  let totalPecas = 0;

  pedidos.forEach((p) => {
    const st = String(p.status || "").toLowerCase();
    if (st.includes("coleta") || st.includes("aguardando")) pendentes++;
    if (st.includes("retrabalho")) retrabalho++;

    const parsed = extrairDadosObs(p.obs_loja_origem || p.observacao);
    const valPecas = p.pecas ?? parsed.pecas;
    const qtdPecas = parseInt(String(valPecas).replace(/\D/g, ""), 10);

    if (!isNaN(qtdPecas)) totalPecas += qtdPecas;
  });

  const elTotal = document.getElementById("kpiTotal");
  const elPendentes = document.getElementById("kpiPendentes");
  const elRetrabalho = document.getElementById("kpiRetrabalho");
  const elPecas = document.getElementById("kpiPecas");

  if (elTotal) elTotal.textContent = pedidos.length;
  if (elPendentes) elPendentes.textContent = pendentes;
  if (elRetrabalho) elRetrabalho.textContent = retrabalho;
  if (elPecas) elPecas.textContent = totalPecas;
}

/**
 * Consulta o Supabase e dispara renderizações.
 */
async function gerarRelatorio() {
  try {
    if (containerPedidos && containerPedidos.children.length === 0) {
      containerPedidos.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">Carregando pedidos...</p>`;
    }

    let query = supabase.from("pedidos").select(`
      *,
      pedido_eventos ( observacao )
    `);

    const statusVal = filtroStatus?.value;
    if (statusVal && statusVal.toLowerCase() !== "todos") {
      query = query.ilike("status", `%${statusVal}%`);
    }

    const termo = pesquisaOS?.value?.trim();
    if (termo) {
      if (/^\d+$/.test(termo) && termo.length <= 10) {
        query = query.eq("id", Number(termo));
      } else {
        // Sanitiza termo para evitar quebras em buscas dinâmicas com .or()
        const termoSanitizado = termo.replace(/[%_,]/g, "");
        query = query.or(
          `loja_origem.ilike.%${termoSanitizado}%,tipo_servico.ilike.%${termoSanitizado}%,status.ilike.%${termoSanitizado}%`
        );
      }
    }

    const { data: pedidos, error } = await query.order("criado_em", { ascending: false });
    if (error) throw error;

    pedidosGlobais = pedidos || [];

    atualizarKPIs(pedidosGlobais);
    renderizarTabelaRelatorio(pedidosGlobais);
    atualizarGraficos(pedidosGlobais);

  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    if (containerPedidos) {
      containerPedidos.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Erro ao carregar dados: ${err.message || err}</p>`;
    }
  }
}

/**
 * Renderiza os itens na tabela principal.
 */
function renderizarTabelaRelatorio(pedidos) {
  if (!containerPedidos) return;
  containerPedidos.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    containerPedidos.innerHTML = "<p style='text-align: center; color: #777; padding: 20px;'>Nenhum pedido encontrado.</p>";
    return;
  }

  const tabela = document.createElement("table");
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

    const ticket = p.ticket || parsedObs.ticket;
    const cliente = p.cliente || parsedObs.cliente;
    const saco = p.saco || parsedObs.saco;
    const pecas = p.pecas || parsedObs.pecas;
    const valor = p.valor || parsedObs.valor;

    let dataFormatada = "---";
    const dataRef = p.criado_em || p.created_at;
    if (dataRef) {
      const d = new Date(dataRef);
      if (!isNaN(d.getTime())) {
        dataFormatada = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
    }

    tr.innerHTML = `
      <td><strong>#${p.id ?? "N/A"}</strong></td>
      <td>${p.loja_origem ?? "Não informada"}</td>
      <td><span class="obs-pill">${p.tipo_servico ?? "Geral"}</span></td>
      <td>
        <span class="badge-status" style="background-color: ${coresStatus.bg}; color: ${coresStatus.texto};">
          ${p.status ?? "Sem status"}
        </span>
      </td>
      <td>
        <div class="obs-pill-group">
          <span class="obs-pill">Ticket: <strong>${ticket}</strong></span>
          <span class="obs-pill">Cliente: <strong>${cliente}</strong></span>
          <span class="obs-pill">Saco: <strong>${saco}</strong></span>
          <span class="obs-pill">Peças: <strong>${pecas}</strong></span>
          <span class="obs-pill">Valor: <strong>R$ ${valor}</strong></span>
        </div>
      </td>
      <td style="color: #64748b;">${dataFormatada}</td>
    `;

    fragmento.appendChild(tr);
  });

  corpoTabela.appendChild(fragmento);
  containerPedidos.appendChild(tabela);
}

/**
 * Desenha e atualiza os gráficos Chart.js com atualização reativa segura.
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

  // Gráfico Status
  const elStatus = document.getElementById("graficoStatus");
  if (elStatus) {
    const labelsStatus = Object.keys(statusCount);
    const dataStatus = Object.values(statusCount);

    if (chartStatus) {
      chartStatus.data.labels = labelsStatus;
      chartStatus.data.datasets[0].data = dataStatus;
      chartStatus.update();
    } else {
      chartStatus = new Chart(elStatus.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: labelsStatus,
          datasets: [{
            data: dataStatus,
            backgroundColor: ["#f39c12", "#18BC9C", "#e74c3c", "#2980b9", "#8e44ad", "#34495e"]
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
    }
  }

  // Gráfico Serviço
  const elServico = document.getElementById("graficoServico");
  if (elServico) {
    const labelsServico = Object.keys(servicoCount);
    const dataServico = Object.values(servicoCount);

    if (chartServico) {
      chartServico.data.labels = labelsServico;
      chartServico.data.datasets[0].data = dataServico;
      chartServico.update();
    } else {
      chartServico = new Chart(elServico.getContext("2d"), {
        type: "bar",
        data: {
          labels: labelsServico,
          datasets: [{
            label: "Volume de Pedidos",
            data: dataServico,
            backgroundColor: "#0b53a7",
            borderRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }
  }
}

/**
 * Inscrição em tempo real com reutilização de canal.
 */
function escutarRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("pedidos-alteracoes")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
      gerarRelatorio();
    })
    .subscribe();
}

// Inicialização de Eventos
document.addEventListener("DOMContentLoaded", () => {
  gerarRelatorio();
  escutarRealtime();

  btnFiltrar?.addEventListener("click", gerarRelatorio);
  filtroStatus?.addEventListener("change", gerarRelatorio);

  pesquisaOS?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(gerarRelatorio, 300);
  });
});

// Limpeza de conexão ao fechar a janela
window.addEventListener("beforeunload", () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});
