import { supabase } from "./supabase.js";

// ==========================
// CARREGAR PEDIDOS
// ==========================
async function carregarPedidos(filtro = "") {
  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    if (filtro && filtro !== "Todos") {
      query = query.eq("status", filtro);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      mostrarMensagemErro("Erro ao carregar pedidos.");
      return;
    }

    const pedidos = data || [];
    const container = document.getElementById("containerPedidos");
    container.innerHTML = "";

    if (pedidos.length === 0) {
      container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const card = criarCardPedido(pedido);
      container.appendChild(card);
      carregarTimeline(pedido.id);
    });
  } catch (err) {
    console.error("Erro inesperado:", err);
    mostrarMensagemErro("Erro inesperado ao carregar pedidos.");
  }
}

// ==========================
// CRIAR CARD DE PEDIDO
// ==========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  const statusClass = getStatusClass(pedido.status);

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Observação:</strong><br><em>${pedido.obs_loja_origem || "—"}</em>
    <div class="timeline" id="timeline-${pedido.id}"><strong>Eventos:</strong></div>
  `;

  return card;
}

// ==========================
// CARREGAR TIMELINE DE UM PEDIDO
// ==========================
async function carregarTimeline(pedidoId) {
  try {
    const { data: eventos, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error(`Erro ao carregar eventos do pedido ${pedidoId}:`, error);
      return;
    }

    const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
    if (!timelineDiv) return;

    timelineDiv.innerHTML = "<strong>Eventos:</strong>"; // limpa antes

    eventos.forEach(evento => {
      const item = document.createElement("div");
      item.className = "timeline-item";

      // Evento destacado se Finalizado ou Retrabalho
      if (evento.evento.includes("Finalizado")) item.classList.add("evento-final");
      if (evento.evento.includes("Retrabalho")) item.classList.add("evento-retrabalho");

      item.innerHTML = `${evento.evento} <small>${new Date(evento.criado_em).toLocaleString()}</small>`;
      timelineDiv.appendChild(item);
    });
  } catch (err) {
    console.error(`Erro inesperado carregando timeline do pedido ${pedidoId}:`, err);
  }
}

// ==========================
// OBTER CLASSE DE STATUS
// ==========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  if (status.includes("Loja 5")) return "status-Loja5";
  if (status.includes("Em serviço")) return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  if (status === "Aguardando coleta") return "status-Aguardando";
  return "status-Aguardando"; // fallback
}

// ==========================
// MOSTRAR MENSAGEM DE ERRO
// ==========================
function mostrarMensagemErro(msg) {
  const container = document.getElementById("containerPedidos");
  container.innerHTML = `<p style="color:red;">${msg}</p>`;
}

// ==========================
// CRIAR NOVO PEDIDO
// ==========================
document.getElementById("btnCriarPedido").addEventListener("click", async () => {
  const tipoServico = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipoServico) {
    alert("Selecione o tipo de serviço.");
    return;
  }

  try {
    const { data, error } = await supabase.from("pedidos").insert([{
      tipo_servico: tipoServico,
      orcamento,
      obs_loja_origem: observacao,
      status: "Aguardando coleta",
      criado_em: new Date().toISOString()
    }]);

    if (error) throw error;

    alert("Pedido criado com sucesso!");

    // Limpar formulário
    document.getElementById("tipo").value = "";
    document.getElementById("orcamento").checked = false;
    document.getElementById("observacao").value = "";

    // Atualizar lista de pedidos
    carregarPedidos(document.getElementById("filtroStatus").value);
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert("Erro ao criar pedido.");
  }
});

// ==========================
// FILTRO DE PEDIDOS
// ==========================
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// ==========================
// INICIALIZAÇÃO
// ==========================
carregarPedidos();
setInterval(() => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
}, 5000);
