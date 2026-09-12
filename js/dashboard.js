import { supabase } from "./supabase.js";

// Elementos do DOM
const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

// Elementos dos KPIs
const kpiTotal = document.getElementById("kpiTotal");
const kpiColeta = document.getElementById("kpiColeta");
const kpiEmTransporte = document.getElementById("kpiEmTransporte");
const kpiEmServico = document.getElementById("kpiEmServico");
const kpiFinalizados = document.getElementById("kpiFinalizados");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin";
let chartStatus = null;
let chartServico = null;

// ===============================
// Sessão do Usuário
// ===============================
async function realizarLogin() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user) return data.user;
  } catch (err) {
    console.warn("Sessão não identificada, usando perfil padrão.", err);
  }
  return { email: "ti@ebarroso.com.br" };
}

function criarBotaoPedido() {
  if (usuarioTipo === "loja" && btnCriarPedidoContainer) {
    btnCriarPedidoContainer.innerHTML = ""; 
    const btn = document.createElement("button");
    btn.textContent = "+ Novo Pedido";
    btn.className = "filter-btn";
    btn.style.backgroundColor = "#2563eb";
    btn.onclick = () => (window.location.href = "pedidos.html"); 
    btnCriarPedidoContainer.appendChild(btn);
  }
}

// ===============================
// Extração de Dados da Observação
// ===============================
function extrairDadosObs(obsText) {
  const dados = {
    ticket: "---",
    cliente: "Não informado",
    saco: "---",
    pecas: "0",
    valor: "0,00"
  };

  if (!obsText || typeof obsText !== "string") return dados;

  const partes = obsText.split("|");

  partes.forEach((parte) => {
    const [chave, valor] = parte.split(":").map((item) => item?.trim() || "");
    if (!chave || !valor) return;

    const chaveLower = chave.toLowerCase();

    if (chaveLower.includes("ticket")) dados.ticket = valor;
    else if (chaveLower.includes("cliente")) dados.cliente = valor;
    else if (chaveLower.includes("saco")) dados.saco = valor;
    else if (chaveLower.includes("peça") || chaveLower.includes("peca")) dados.pecas = valor;
    else if (chaveLower.includes("valor")) dados.valor = valor.replace("R$", "").trim();
  });

  return dados;
}

// ===============================
// Busca de Dados no Supabase
// ===============================
async function carregarPedidos() {
  try {
    // Exibe o feedback de carregamento apenas na primeira carga
    if (container && pedidosGlobais.length === 0) {
      container.innerHTML = "<p class='loading'>Carregando dados do painel...</p>";
    }

    // Montagem segura da Query
    let query = supabase.from("pedidos").select("*");

    if (usuarioTipo === "loja" && usuarioLogado?.email) {
      query = query.eq("loja_origem", usuarioLogado.email);
    }

    const status = filtroStatus?.value;
    if (status && status !== "" && status !== "Todos") {
      query = query.eq("status", status);
    }

    const pesquisa = pesquisaOS?.value?.trim();
    if (pesquisa) {
      if (!isNaN(pesquisa) && pesquisa.length < 8) {
        query = query.eq("id", parseInt(pesquisa));
      } else {
        query = query.or(
          `loja_origem.ilike.%${pesquisa}%,tipo_servico.ilike.%${pesquisa}%,status.ilike.%${pesquisa}%,obs_loja_origem.ilike.%${pesquisa}%`
        );
      }
    }

    // Executa a busca ordenando pelo ID de forma decrescente para garantir os mais recentes primeiro
    const { data, error } = await query.order("id", { ascending: false });
    
    if (error) {
      console.error("Erro Supabase ao consultar pedidos:", error);
      if (container && pedidosGlobais.length === 0) {
        container.innerHTML = `<p class='loading' style='color: #ef4444;'>Erro ao carregar do banco: ${error.message}</p>`;
      }
      return;
    }

    pedidosGlobais = data || []; 
    renderizarKPIs(pedidosGlobais);
    renderizarPedidosTabela(pedidosGlobais);
    atualizarGraficos(); 
  } catch (err) {
    console.error("Erro crítico em carregarPedidos:", err);
    if (container && pedidosGlobais.length === 0) {
      container.innerHTML = `<p class='loading' style='color: #ef4444;'>Ocorreu um erro ao processar os dados do painel.</p>`;
    }
  }
}

// ===============================
// Atualizar KPIs Topo
// ===============================
function renderizarKPIs(pedidos) {
  let total = pedidos.length;
  let coleta = 0;
  let emTransporte = 0;
  let emServico = 0;
  let finalizados = 0;

  pedidos.forEach((p) => {
    const st = (p.status || "").toLowerCase();
    
    if (st.includes("coleta")) {
      coleta++;
    } else if (st.includes("transporte") || st.includes("retorno")) {
      emTransporte++;
    } else if (st.includes("serviço") || st.includes("servico") || st.includes("entregue")) {
      emServico++;
    } else if (st.includes("finalizado")) {
      finalizados++;
    }
  });

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiColeta) kpiColeta.textContent = coleta;
  if (kpiEmTransporte) kpiEmTransporte.textContent = emTransporte;
  if (kpiEmServico) kpiEmServico.textContent = emServico;
  if (kpiFinalizados) kpiFinalizados.textContent = finalizados;
}

// ===============================
// Renderizar Tabela
// ===============================
function renderizarPedidosTabela(pedidos) {
  if (!container) return;

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p class='loading'>Nenhum pedido encontrado.</p>"; 
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
        <th>Detalhes / Observação</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody id="corpoTabelaDashboard"></tbody>
  `;

  const corpoTabela = tabela.querySelector("#corpoTabelaDashboard");

  pedidos.forEach((p) => {
    const tr = document.createElement("tr");

    const osId = p.id ? String(p.id).substring(0, 8) : "N/A";
    const loja = p.loja_origem ?? "Não informada";
    const servico = p.tipo_servico ?? "Geral";
    const status = p.status ?? "Sem status";
    
    // Processa a string de observação
    const obsTexto = p.obs_loja_origem || p.observacao || "";
    const parsedObs = extrairDadosObs(obsTexto);

    const ticket = p.ticket || parsedObs.ticket;
    const cliente = p.cliente || parsedObs.cliente;
    const saco = p.saco || parsedObs.saco;
    const pecas = p.pecas || parsedObs.pecas;
    const valor = p.valor || parsedObs.valor;

    let dataFormatada = "---";
    const dataRegistro = p.criado_em || p.created_at;
    if (dataRegistro) {
      try {
        dataFormatada = new Date(dataRegistro).toLocaleDateString("pt-BR");
      } catch (e) {
        dataFormatada = "---";
      }
    }

    // Badge de status
    let statusClass = "status-default";
    const stLower = status.toLowerCase();
    if (stLower.includes("finalizado")) statusClass = "status-finalizado";
    else if (stLower.includes("coleta")) statusClass = "status-coleta";
    else if (stLower.includes("transporte") || stLower.includes("retorno")) statusClass = "status-transporte";
    else if (stLower.includes("serviço") || stLower.includes("servico") || stLower.includes("entregue")) statusClass = "status-servico";

    tr.innerHTML = `
      <td style="font-weight: 600; color: #0f172a;">#${osId}</td>
      <td style="font-weight: 500;">${loja}</td>
      <td><span style="background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #334155; font-weight: 500;">${servico}</span></td>
      <td><span class="status-badge ${statusClass}">${status}</span></td>
      <td>
        <div class="obs-pill-group">
          <span class="obs-pill">Ticket: <strong>${ticket}</strong></span>
          <span class="obs-pill">Cliente: <strong>${cliente}</strong></span>
          <span class="obs-pill">Saco: <strong>${saco}</strong></span>
          <span class="obs-pill">Peças: <strong>${pecas}</strong></span>
          <span class="obs-pill">Valor: <strong>R$ ${valor}</strong></span>
        </div>
      </td>
      <td style="color: #64748b; font-size: 12px;">${dataFormatada}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  // Atualiza o DOM apenas de uma vez
  container.innerHTML = "";
  container.appendChild(tabela);
}

// ===============================
// Chart.js - Gráficos
// ===============================
function atualizarGraficos() {
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach((p) => {
    const st = p.status ?? "Outros";
    const sr = p.tipo_servico ?? "Outros";
    statusCount[st] = (statusCount[st] || 0) + 1;
    servicoCount[sr] = (servicoCount[sr] || 0) + 1;
  });

  // Chart Status (Doughnut)
  const elStatus = document.getElementById("graficoStatus");
  if (elStatus && window.Chart) {
    try {
      const ctxStatus = elStatus.getContext("2d");
      if (chartStatus) chartStatus.destroy(); 
      chartStatus = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusCount),
          datasets: [{
            data: Object.values(statusCount),
            backgroundColor: ["#0d9488", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#475569"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
            title: { display: true, text: 'Status dos Pedidos', font: { size: 13, weight: '600' }, color: '#0f172a' }
          }
        }
      });
    } catch (e) {
      console.warn("Aviso no Gráfico de Status:", e);
    }
  }

  // Chart Serviços (Bar)
  const elServico = document.getElementById("graficoServico");
  if (elServico && window.Chart) {
    try {
      const ctxServico = elServico.getContext("2d");
      if (chartServico) chartServico.destroy(); 
      chartServico = new Chart(ctxServico, {
        type: "bar",
        data: {
          labels: Object.keys(servicoCount),
          datasets: [{
            label: "Pedidos",
            data: Object.values(servicoCount),
            backgroundColor: "#334155",
            borderRadius: 4
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { 
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Volume por Serviço', font: { size: 13, weight: '600' }, color: '#0f172a' }
          }
        }
      });
    } catch (e) {
      console.warn("Aviso no Gráfico de Serviço:", e);
    }
  }
}

// ===============================
// Inicialização
// ===============================
(async () => {
  try {
    usuarioLogado = await realizarLogin();
    usuarioTipo = usuarioLogado?.email?.includes("loja") ? "loja" : "admin";
    
    criarBotaoPedido();
    
    if (btnFiltrar) {
      btnFiltrar.addEventListener("click", carregarPedidos);
    }

    if (pesquisaOS) {
      pesquisaOS.addEventListener("input", () => {
        carregarPedidos();
      });
    }
    
    carregarPedidos();
    setInterval(carregarPedidos, 15000);
  } catch (err) {
    console.error("Erro na inicialização do script:", err);
  }
})();
