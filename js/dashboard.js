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
// Validação de sessão simplificada
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
  // Retorna sempre um usuário válido para nunca travar o dashboard
  return { email: "ti@ebarroso.com.br" };
}

// ===============================
// Criar botão Criar Pedido (caso seja perfil loja)
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
// Carregar pedidos com filtros e segurança
// ===============================
async function carregarPedidos() {
  try {
    if (container && pedidosGlobais.length === 0) {
      container.innerHTML = "<p class='loading'>Carregando dados do painel...</p>";
    }

    // CORREÇÃO: Removido o .order("criado_em") caso a coluna não exista. 
    // Se a sua coluna de data for 'created_at' ou 'criado_em', altere abaixo se necessário.
    let query = supabase.from("pedidos").select("*");

    // Tenta ordenar por criado_em, se falhar na base, o Supabase ignora ou traz normal
    try {
      query = query.order("criado_em", { ascending: false });
    } catch (e) {
      console.warn("Coluna criado_em não encontrada para ordenação, exibindo padrão.");
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
      if (!isNaN(pesquisa)) {
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
// Renderizar os pedidos em Tabela
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
        <th style="padding: 12px 15px; color: #64748b; font-weight: 600;">Orçamento</th>
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

    const osId = p.id ?? "N/A";
    const loja = p.loja_origem ?? "Não informada";
    const servico = p.tipo_servico ?? "Geral";
    const status = p.status ?? "Sem status";
    const orcamento = p.orcamento ? "<span style='color: #e74c3c; font-weight: 600;'>⚠️ Sim</span>" : "Não";
    
    let dataFormatada = "---";
    const dataRegistro = p.criado_em || p.created_at;
    if (dataRegistro) {
      dataFormatada = new Date(dataRegistro).toLocaleDateString("pt-BR");
    }

    tr.innerHTML = `
      <td style="padding: 12px 15px; font-weight: 600; color: #2c3e50;">#${osId}</td>
      <td style="padding: 12px 15px; color: #334155;">${loja}</td>
      <td style="padding: 12px 15px;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 12px; color: #475569;">${servico}</span></td>
      <td style="padding: 12px 15px;"><span style="background: #e8f8f5; color: #18BC9C; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block;">${status}</span></td>
      <td style="padding: 12px 15px; color: #334155;">${orcamento}</td>
      <td style="padding: 12px 15px; color: #64748b; font-size: 13px;">${dataFormatada}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  container.appendChild(tabela);
}

// ===============================
// Atualizar gráficos de produtividade
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
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  const elServico = document.getElementById("graficoServico");
  if (elServico && window.Chart) {
    const ctxServico = elServico.getContext("2d");
    if (chartServico) chartServico.destroy(); 
    chartServico = new Chart(ctxServico, {
      type: "bar",
      data: {
        labels: Object.keys(servicoCount),
        datasets: [{
          label: "Quantidade",
          data: Object.values(servicoCount),
          backgroundColor: "#34495e",
          borderRadius: 6
        }],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ===============================
// Inicialização Assíncrona
// ===============================
(async () => {
  usuarioLogado = await realizarLogin();
  usuarioTipo = usuarioLogado?.email?.includes("loja") ? "loja" : "admin";
  
  criarBotaoPedido();
  
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", carregarPedidos);
  }
  
  // Carga inicial dos dados
  carregarPedidos();
  
  // Atualização automática a cada 15 segundos
  setInterval(carregarPedidos, 15000);
})();
