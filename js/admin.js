import { supabase } from "./supabase.js";

// Elementos da Interface
const containerPedidos = document.getElementById("containerPedidos");
const relatorioContainer = document.getElementById("relatorio");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");

// Variáveis Globais de Controle
let pedidosGlobais = [];
let chartStatus = null;
let chartServico = null;
let debounceTimer = null;

// ===============================
// Estilização das Badges de Status
// ===============================
function obterEstiloStatus(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("finalizado") || s.includes("entregue")) {
    return { bg: "#e8f8f5", texto: "#18BC9C" }; // Verde sutil
  }
  if (s.includes("transporte") || s.includes("coleta") || s.includes("retorno")) {
    return { bg: "#eef2f7", texto: "#2980b9" }; // Azul sutil
  }
  if (s.includes("retrabalho") || s.includes("orçamento")) {
    return { bg: "#fdedec", texto: "#e74c3c" }; // Vermelho sutil
  }
  return { bg: "#fef9e7", texto: "#f39c12" }; // Amarelo/Laranja sutil
}

// ===============================
// Leitura de Informações de Observação
// ===============================
function possuiInformacoes(texto) {
  if (!texto || typeof texto !== "string") return false;
  const t = texto.toLowerCase();
  return t.includes("ticket") || t.includes("cliente") || t.includes("saco") || t.includes("peça") || t.includes("peca") || t.includes("valor");
}

function extrairDadosObs(obsText) {
  const dados = { ticket: "---", cliente: "Não informado", saco: "---", pecas: "0", valor: "0,00" };
  if (!obsText) return dados;

  if (typeof obsText === "object") {
    return {
      ticket: obsText.ticket || obsText.cod || "---",
      cliente: obsText.cliente || obsText.nome || "Não informado",
      saco: obsText.saco || obsText.bag || "---",
      pecas: obsText.pecas || obsText.qtd || "0",
      valor: obsText.valor || obsText.total || "0,00"
    };
  }

  if (typeof obsText !== "string") return dados;

  const partes = obsText.split(/[|\n]/);
  partes.forEach((parte) => {
    if (!parte.includes(":")) return;
    const [chave, ...valorArr] = parte.split(":");
    const valor = valorArr.join(":").trim();
    const chaveLower = chave.trim().toLowerCase();

    if (!chaveLower || !valor) return;

    if (chaveLower.includes("ticket") || chaveLower.includes("cod") || chaveLower.includes("os")) {
      dados.ticket = valor;
    } else if (chaveLower.includes("cliente") || chaveLower.includes("cli") || chaveLower.includes("nome")) {
      dados.cliente = valor;
    } else if (chaveLower.includes("saco") || chaveLower.includes("bag")) {
      dados.saco = valor;
    } else if (chaveLower.includes("peça") || chaveLower.includes("peca") || chaveLower.includes("qtd")) {
      dados.pecas = valor;
    } else if (chaveLower.includes("valor") || chaveLower.includes("total") || chaveLower.includes("vlr")) {
      dados.valor = valor.replace("R$", "").trim();
    }
  });

  return dados;
}

// ===============================
// Consulta de Dados com Filtros
// ===============================
async function gerarRelatorio() {
  const alvoDOM = containerPedidos || relatorioContainer;
  
  try {
    if (alvoDOM && pedidosGlobais.length === 0) {
      alvoDOM.innerHTML = "<p style='text-align: center; color: #64748b; padding: 30px; font-size: 14px;'>Buscando dados consolidados da Oficina...</p>";
    }

    let query = supabase.from("pedidos").select(`
      *,
      pedido_eventos (
        observacao
      )
    `);

    // Aplicação do Filtro de Status
    const statusVal = filtroStatus?.value;
    if (statusVal && statusVal !== "Todos" && statusVal !== "todos") {
      query = query.ilike("status", `%${statusVal}%`);
    }

    // Aplicação do Filtro de Busca
    const termoPesquisa = pesquisaOS?.value?.trim();
    if (termoPesquisa) {
      if (/^\d+$/.test(termoPesquisa) && termoPesquisa.length <= 10) {
        query = query.eq("id", Number(termoPesquisa));
      } else {
        query = query.or(`loja_origem.ilike.%${termoPesquisa}%,tipo_servico.ilike.%${termoPesquisa}%,status.ilike.%${termoPesquisa}%`);
      }
    }

    const { data: pedidos, error } = await query.order("criado_em", { ascending: false });

    if (error) throw error;

    pedidosGlobais = pedidos || [];

    // Renderização do relatório e atualização dos gráficos
    renderizarTabelaRelatorio(pedidosGlobais);
    atualizarGraficos(pedidosGlobais);

  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    if (alvoDOM) {
      alvoDOM.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Erro ao carregar dados. Detalhes: ${err.message}</p>`;
    }
  }
}

// ===============================
// Renderização da Tabela no DOM
// ===============================
function renderizarTabelaRelatorio(pedidos) {
  const alvoDOM = containerPedidos || relatorioContainer;
  if (!alvoDOM) return;

  alvoDOM.innerHTML = ""; // Limpa os dados anteriores

  if (!pedidos || pedidos.length === 0) {
    alvoDOM.innerHTML = "<p style='text-align: center; color: #777; padding: 30px;'>Nenhum pedido encontrado no banco de dados.</p>";
    return;
  }

  // Criação da estrutura da Tabela
  const tabela = document.createElement("table");
  tabela.style.width = "100%";
  tabela.style.borderCollapse = "collapse";
  tabela.style.fontFamily = "'Inter', sans-serif";
  tabela.style.fontSize = "14px";

  tabela.innerHTML = `
    <thead>
      <tr style="background-color: #0b53a7; color: #ffffff; text-align: left;">
        <th style="padding: 14px 16px; font-weight: 600;">OS</th>
        <th style="padding: 14px 16px; font-weight: 600;">Loja Origem</th>
        <th style="padding: 14px 16px; font-weight: 600;">Serviço</th>
        <th style="padding: 14px 16px; font-weight: 600;">Status</th>
        <th style="padding: 14px 16px; font-weight: 600;">Detalhes / Obs</th>
        <th style="padding: 14px 16px; font-weight: 600;">Data do Registro</th>
      </tr>
    </thead>
    <tbody id="corpoTabela"></tbody>
  `;

  const corpoTabela = tabela.querySelector("#corpoTabela");

  pedidos.forEach((p, index) => {
    const tr = document.createElement("tr");

    tr.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    tr.style.borderBottom = "1px solid #e2e8f0";
    tr.style.transition = "background-color 0.2s";

    tr.addEventListener("mouseover", () => tr.style.backgroundColor = "#f1f5f9");
    tr.addEventListener("mouseout", () => tr.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f8fafc");

    const osId = p.id ?? "N/A";
    const lojaOrigem = p.loja_origem ?? "Não informada";
    const tipoServico = p.tipo_servico ?? "Geral";
    const statusPedido = p.status ?? "Sem status";

    const coresStatus = obterEstiloStatus(statusPedido);

    // Extração inteligente de Observações
    let obsTexto = "";
    if (possuiInformacoes(p.obs_loja_origem)) {
      obsTexto = p.obs_loja_origem;
    } else if (p.pedido_eventos && Array.isArray(p.pedido_eventos) && p.pedido_eventos.length > 0) {
      const ev = p.pedido_eventos.find((e) => possuiInformacoes(e?.observacao));
      obsTexto = ev ? ev.observacao : (p.pedido_eventos[p.pedido_eventos.length - 1]?.observacao || "");
    } else {
      obsTexto = p.observacao || p.obs_loja_origem || "";
    }

    const parsedObs = extrairDadosObs(obsTexto);
    const ticket = p.ticket || parsedObs.ticket;
    const cliente = p.cliente || parsedObs.cliente;
    const saco = p.saco || parsedObs.saco;
    const pecas = p.pecas || parsedObs.pecas;
    const valor = p.valor || parsedObs.valor;

    // Tratamento de Data
    let dataFormatada = "---";
    const dataRef = p.criado_em || p.created_at;
    if (dataRef) {
      try {
        const d = new Date(dataRef);
        dataFormatada = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        dataFormatada = "---";
      }
    }

    tr.innerHTML = `
      <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">#${osId}</td>
      <td style="padding: 12px 16px; color: #334155; font-weight: 500;">${lojaOrigem}</td>
      <td style="padding: 12px 16px;"><span style="background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #334155; font-weight: 500;">${tipoServico}</span></td>
      <td style="padding: 12px 16px;">
        <span style="background-color: ${coresStatus.bg}; color: ${coresStatus.texto}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
          ${statusPedido}
        </span>
      </td>
      <td style="padding: 12px 16px;">
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Ticket: <strong>${ticket}</strong></span>
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Cliente: <strong>${cliente}</strong></span>
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Saco: <strong>${saco}</strong></span>
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Peças: <strong>${pecas}</strong></span>
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Valor: <strong>R$ ${valor}</strong></span>
        </div>
      </td>
      <td style="padding: 12px 16px; color: #64748b; font-size: 12px;">${dataFormatada}</td>
    `;

    corpoTabela.appendChild(tr);
  });

  alvoDOM.appendChild(tabela);
}

// ===============================
// Renderização de Gráficos (Chart.js)
// ===============================
function atualizarGraficos(pedidos) {
  if (!window.Chart) return;

  const statusCount = {};
  const servicoCount = {};

  pedidos.forEach((p) => {
    const st = p.status ?? "Sem Status";
    const sr = p.tipo_servico ?? "Geral";
    statusCount[st] = (statusCount[st] || 0) + 1;
    servicoCount[sr] = (servicoCount[sr] || 0) + 1;
  });

  // Gráfico de Status (Doughnut)
  const elStatus = document.getElementById("graficoStatus");
  if (elStatus) {
    try {
      const ctxStatus = elStatus.getContext("2d");
      if (chartStatus) chartStatus.destroy();
      
      chartStatus = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusCount),
          datasets: [{
            data: Object.values(statusCount),
            backgroundColor: ["#f39c12", "#18BC9C", "#e74c3c", "#2980b9", "#8e44ad", "#34495e"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    } catch (e) {
      console.warn("Aviso ao desenhar gráfico de status:", e);
    }
  }

  // Gráfico de Serviços (Bar)
  const elServico = document.getElementById("graficoServico");
  if (elServico) {
    try {
      const ctxServico = elServico.getContext("2d");
      if (chartServico) chartServico.destroy();

      chartServico = new Chart(ctxServico, {
        type: "bar",
        data: {
          labels: Object.keys(servicoCount),
          datasets: [{
            label: "Volume de Pedidos",
            data: Object.values(servicoCount),
            backgroundColor: "#0b53a7",
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } catch (e) {
      console.warn("Aviso ao desenhar gráfico de serviços:", e);
    }
  }
}

// ===============================
// Eventos e Inicialização
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // Carga Inicial
  gerarRelatorio();

  // Listener para o Botão Filtrar
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", gerarRelatorio);
  }

  // Listener para o Select de Status
  if (filtroStatus) {
    filtroStatus.addEventListener("change", gerarRelatorio);
  }

  // Listener para o Input de Busca (Debounce de 300ms)
  if (pesquisaOS) {
    pesquisaOS.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        gerarRelatorio();
      }, 300);
    });
  }

  // Recarregamento automático a cada 30 segundos
  setInterval(gerarRelatorio, 30000);
});
