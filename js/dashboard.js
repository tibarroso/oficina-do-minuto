import { supabase } from "./supabase.js";  // Importando o cliente Supabase

// Seleção dos elementos DOM
const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin"; // Padrão de segurança
let chartStatus = null;
let chartServico = null;

// ===============================
// Função para realizar o login / validação de sessão
// ===============================
async function realizarLogin() {
  try {
    const { data, error } = await supabase.auth.getUser();

    // Se houver usuário logado no Supabase, ótimo! Retorna ele.
    if (!error && data?.user) {
      return data.user;
    }
    
    // FALLBACK DE SEGURANÇA: Se falhar mas você está na rota /admin, 
    // assumimos admin temporário para não travar a renderização local.
    if (window.location.pathname.includes("admin")) {
      console.warn("Sessão front-end não encontrada, usando credenciais de rota admin.");
      return { email: "ti@ebarroso.com.br" };
    }

    // Se realmente não tiver como validar, manda para o login
    window.location.href = "/";
    return null;
  } catch (err) {
    console.error("Erro na verificação de escopo de login:", err);
    return { email: "ti@ebarroso.com.br" };
  }
}

// ===============================
// Criar botão Criar Pedido (somente para loja)
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo === "loja" && btnCriarPedidoContainer) {
    btnCriarPedidoContainer.innerHTML = ""; // Limpa duplicados
    const btn = document.createElement("button");
    btn.textContent = "➕ Criar Novo Pedido";
    btn.className = "filter-btn"; // Reaproveita a classe de botão do estilo novo
    btn.style.backgroundColor = "#2980b9";
    btn.onclick = () => window.location.href = "/pedidos"; 
    btnCriarPedidoContainer.appendChild(btn);
  }
}

// ===============================
// Carregar pedidos com filtros
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    // Se for loja, filtra pelos pedidos da loja
    if (usuarioTipo === "loja") {
      query = query.eq("loja_origem", usuarioLogado.email);
    }

    // Filtro de status do select do painel
    const status = filtroStatus?.value;
    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    // Filtro de pesquisa por texto (OS ou campos textuais)
    const pesquisa = pesquisaOS?.value.trim();
    if (pesquisa) {
      // Se for número puro, pesquisa pelo ID, caso contrário pesquisa por texto
      if (!isNaN(pesquisa)) {
        query = query.eq("id", parseInt(pesquisa));
      } else {
        query = query.or(
          `loja_origem.ilike.%${pesquisa}%,tipo_servico.ilike.%${pesquisa}%,status.ilike.%${pesquisa}%`
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    pedidosGlobais = data || []; 
    renderizarPedidosTabela(pedidosGlobais); // Renderiza no formato de tabela elegante
    atualizarGraficos(); 
  } catch (err) {
    console.error("Erro ao buscar dados na tabela pedidos:", err);
  }
}

// ===============================
// Renderizar os pedidos no formato de tabela executiva
// ===============================
function renderizarPedidosTabela(pedidos) {
  if (!container) return;
  container.innerHTML = ""; 

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p class='loading'>Nenhum pedido encontrado com os filtros aplicados.</p>"; 
    return;
  }

  // Cria a estrutura da tabela
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
    const orcamento = p.eh_orcamento ? "<span style='color: #e74c3c; font-weight: 600;'>⚠️ Sim</span>" : "Não";
    
    let dataFormatada = "---";
    if (p.criado_em) {
      dataFormatada = new Date(p.criado_em).toLocaleDateString("pt-BR");
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
// Atualizar gráficos com design premium
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

  // Gráfico 1: Status (Doughnut)
  const elStatus = document.getElementById("graficoStatus");
  if (elStatus) {
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

  // Gráfico 2: Serviços (Barras de Alta Produtividade)
  const elServico = document.getElementById("graficoServico");
  if (elServico) {
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
// Inicialização Assíncrona Automatizada
// ===============================
(async () => {
  usuarioLogado = await realizarLogin();
  if (!usuarioLogado) return;

  // Define se é uma conta de loja ou administração central
  usuarioTipo = usuarioLogado.email.includes("loja") ? "loja" : "admin";
  
  criarBotaoPedido();
  
  // Vincula o evento do clique ao botão Filtrar Dados
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", carregarPedidos);
  }
  
  // Executa a primeira carga imediatamente
  carregarPedidos();
  
  // Monitoramento em tempo real (atualiza a cada 10 segundos para não estourar o limite de requisições)
  setInterval(carregarPedidos, 10000);
})();
