import { supabase } from "./supabase.js";

const containerPedidos = document.getElementById("containerPedidos");

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos() {
  try {
    // Buscar pedidos que estão entregues na Loja 5 ou em serviço
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Entregue na Loja 5", "Em serviço", "Pronto para transporte"])  // Adicionado "Pronto para transporte"
      .order("criado_em", { ascending: false });

    if (error) throw error;

    containerPedidos.innerHTML = "";

    if (!data.length) {
      containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    data.forEach(pedido => {
      const card = criarCardPedido(pedido);
      containerPedidos.appendChild(card);
    });
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    containerPedidos.innerHTML = `<p style="color:red;">Erro ao carregar pedidos.</p>`;
  }
}

// =========================
// CRIAR CARD DE PEDIDO
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  // Status colorido
  const statusMap = {
    "Entregue na Loja 5": "status-Loja5",
    "Em serviço": "status-Transporte",
    "Pronto para transporte": "status-Finalizado",
    "Aguardando coleta": "status-Aguardando"
  };
  const statusClass = statusMap[pedido.status] || "status-Aguardando";

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>

    <label for="obs_loja5_${pedido.id}"><strong>Observação Loja 5:</strong></label><br>
    <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma observação">${pedido.obs_loja5 || ""}</textarea><br>

    <label for="status_${pedido.id}"><strong>Alterar Status:</strong></label><br>
    <select id="status_${pedido.id}">
      <option value="Entregue na Loja 5" ${pedido.status === "Entregue na Loja 5" ? "selected" : ""}>Entregue na Loja 5</option>
      <option value="Em serviço" ${pedido.status === "Em serviço" ? "selected" : ""}>Em serviço</option>
      <option value="Pronto para transporte" ${pedido.status === "Pronto para transporte" ? "selected" : ""}>Pronto para transporte</option>
    </select><br><br>

    <button onclick="atualizarPedido('${pedido.id}')">Salvar Alterações</button>
  `;

  return card;
}

// =========================
// ATUALIZAR PEDIDO
// =========================
window.atualizarPedido = async function(pedidoId) {
  const obs = document.getElementById(`obs_loja5_${pedidoId}`).value;
  const status = document.getElementById(`status_${pedidoId}`).value;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ obs_loja5: obs, status })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido.");
      return;
    }

    alert("Pedido atualizado com sucesso!");
    carregarPedidos();
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Erro inesperado ao atualizar pedido.");
  }
};

// =========================
// FILTRO DE PEDIDOS
// =========================
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// =========================
// AUTO-ATUALIZAÇÃO
// =========================
carregarPedidos();
setInterval(carregarPedidos, 5000);
