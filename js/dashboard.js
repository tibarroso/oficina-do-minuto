import { supabase } from "./supabase.js";

const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin";
let chartStatus = null;
let chartServico = null;

// ===============================
// Validação de Sessão
// ===============================
async function realizarLogin() {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return data.user;
    }
  } catch (err) {
    console.warn("Aviso na sessão, usando perfil padrão.", err);
  }
  return { email: "ti@ebarroso.com.br" };
}

// ===============================
// Botão de Criar Pedido (Apenas Perfil Loja)
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo === "loja" && btnCriarPedidoContainer) {
    btnCriarPedidoContainer.innerHTML = ""; 
    const btn = document.createElement("button");
    btn.textContent = "➕ Criar Novo Pedido";
    btn.className = "filter-btn";
    btn.style.backgroundColor = "#2980b9";
    btn.onclick = () => window.location.href = "pedidos.html"; 
    btnCriarPedidoContainer.appendChild(btn);
  }
}

// ===============================
// Carregar Pedidos com Supabase
// ===============================
async function carregarPedidos() {
  try {
    if (container && pedidosGlobais.length === 0) {
      container.innerHTML = "<p class='loading'>Carregando dados do painel...</p>";
    }

    let query = supabase.from("pedidos").select("*");

    // Ordenação segura
    try {
      query = query.order("criado_em", { ascending: false });
    } catch (e) {
      console.warn("Coluna criado_em não encontrada para ordenação.");
    }

    if (usuarioTipo === "loja" && usuarioLogado?.email) {
      query = query.eq("loja_origem", usuarioLogado.email);
    }

    const status = filtroStatus?.value;
    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    const pesquisa = pesquisaOS?.value.trim();
    if (pesquisa) {
      if (!isNaN(pesquisa) && pesquisa.length < 8) {
        query = query.eq("id", parseInt(pesquisa));
      } else {
        query = query.or(
          `loja_origem.ilike.%${pesquisa}%,tipo_servico.ilike.%${pesquisa}%,status.ilike.%${pesquisa}%`
        );
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Erro retornado pelo Supabase:", error);
      if (container) {
        container.innerHTML = `<p class='loading' style='color: #e74c3c;'>Erro do Supabase: ${error.message}</p>`;
      }
      return;
    }

    pedidosGlobais = data || []; 
    renderizarPedidosTabela(pedidosGlobais);
    atualizarGraficos(); 
  } catch (err) {
    console.error("Erro crítico ao carregar pedidos:", err);
    if (container) {
      container.innerHTML = `<p class='loading' style='color: #e74c3c;'>Erro crítico ao carregar os dados. Veja o console.</p>`;
    }
  }
}

// ===============================
// Renderizar Tabela
// ===============================
function renderizarPedidosTabela(pedidos) {
  if (!container) return;
  container.innerHTML = ""; 

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p class='loading'>Nenhum pedido encontrado com os filtros aplicados.</p>"; 
    return;
  }

  const tabela = document.createElement("table");
  tabela.style.width = "100%";
  tabela.style.borderCollapse = "collapse";
  tabela.style.fontSize = "14px";

  tabela.innerHTML = `
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">OS</th>
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Loja Origem</th>
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Serviço</th>
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Status</th>
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Detalhes / Observação</th>
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Data</th>
      </tr>
    </thead>
    <tbody id="corpoTabelaDashboard"></tbody>
  `;

  const corpoTabela = tabela.querySelector("#corpoTabelaDashboard");

  pedidos.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

    const osId = p.id ? String(p.id).substring(0, 8) : "N/A";
    const loja = p.loja_origem ?? "Não informada";
    const servico = p.tipo_servico ?? "Geral";
    const status = p.status ?? "Sem status";
    
    // Formatação de observações
    const ticket = p.ticket || p.numero_ticket || "---";
    const cliente = p.cliente || p.nome_cliente || "Não informado";
    const saco = p.saco || p.numero_saco || "---";
    const pecas = p.pecas || p.quantidade_pecas || "0";
    const valor = p.valor || p.preco || "0";

    const observacaoFormatada = `Ticket: ${ticket} | Cliente: ${cliente} | Saco: ${saco} | Peças: ${pecas} | Valor: R$ ${valor}`;

    let dataFormatada = "---";
    const dataRegistro = p.criado_em || p.created_at;
    if (dataRegistro) {
      dataFormatada = new Date(dataRegistro).toLocaleDateString("pt-BR");
    }

    // Definir classe CSS da tag de status
    let statusClass = "status-default";
    if (status.includes("Finalizado")) statusClass = "status-finalizado";
    else if (status.includes("Aguardando")) statusClass = "status-aguardando";
    else if (status.includes("transporte")) statusClass = "status-transporte";
    else if (status.includes("serviço")) statusClass = "status-servico";

    tr.innerHTML = `
      <td style="padding: 12px 15px; font-weight: 600; color: #2c3e50;">#${osId}</td>
      <td style="padding: 12px 15px; color: #334155;">${loja}</td>
      <td style="padding: 12px 15px;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 12px; color: #475569;">${servico}</span></td>
      <td style="padding: 12px 15px;"><span class="status-badge ${statusClass}">${status}</span></td>
      <td style="padding: 12px 15px; color: #475569; font-size: 13px;">${observacaoFormatada}</td>
      <td style="padding: 12px 15px; color: #64748b; font-size: 13px;">${dataFormatada}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  container.appendChild(tabela);
}

// ===============================
// Renderizar Gráficos (Chart.js)
// ===============================
function atualizarGraficos() {
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach(p => {
    const st = p.status ?? "Sem Status";
    const sr = p.tipo_servico ?? "Outros";
    statusCount[st] = (statusCount[st] || 0) + 1;
    servicoCount[sr] = (servicoCount[sr] || 0) + 1;
  });

  // Gráfico de Status (Doughnut)
  const elStatus = document.getElementById("graficoStatus");
  if (elStatus && window.Chart) {
    const ctxStatus = elStatus.getContext("2d");
    if (chartStatus) chartStatus.destroy(); 
    chartStatus = new Chart(ctxStatus, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusCount),
        datasets: [{
          data: Object.values(statusCount),
          backgroundColor: ["#18BC9C", "#3498db", "#f1c40f", "#e74c3c", "#9b59b6", "#34495e"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Distribuição por Status', font: { size: 14 } }
        }
      }
    });
  }

  // Gráfico de Serviços (Bar)
  const elServico = document.getElementById("graficoServico");
  if (elServico && window.Chart) {
    const ctxServico = elServico.getContext("2d");
    if (chartServico) chartServico.destroy(); 
    chartServico = new Chart(ctxServico, {
      type: "bar",
      data: {
        labels: Object.keys(servicoCount),
        datasets: [{
          label: "Pedidos",
          data: Object.values(servicoCount),
          backgroundColor: "#34495e",
          borderRadius: 6
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Ordens por Serviço', font: { size: 14 } }
        }
      }
    });
  }
}

// ===============================
// Eventos e Inicialização
// ===============================
(async () => {
  usuarioLogado = await realizarLogin();
  usuarioTipo = usuarioLogado?.email?.includes("loja") ? "loja" : "admin";
  
  criarBotaoPedido();
  
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", carregarPedidos);
  }

  // Filtragem dinâmica ao digitar na busca
  if (pesquisaOS) {
    pesquisaOS.addEventListener("input", () => {
      carregarPedidos();
    });
  }
  
  carregarPedidos();
  
  // Atualização em tempo real a cada 15s
  setInterval(carregarPedidos, 15000);
})();
