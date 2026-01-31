import { supabase } from "./supabase.js";

const containerPedidos = document.getElementById("containerPedidos");

async function carregarPedidos() {
  const statusValidos = ["Entregue na Loja 5", "Em serviço", "Pronto para transporte"];
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", statusValidos)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar pedidos:", error);
      containerPedidos.innerHTML = "<p>Erro ao carregar pedidos.</p>";
      return;
    }

    if (!data.length) {
      containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    containerPedidos.innerHTML = "";

    data.forEach((pedido) => {
      const card = criarCardPedido(pedido);
      containerPedidos.appendChild(card);
    });
  } catch (err) {
    console.error("Erro inesperado:", err);
    containerPedidos.innerHTML = "<p>Erro inesperado ao carregar pedidos.</p>";
  }
}

function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <strong>Status:</strong> ${pedido.status}<br>
    
    <label for="obs_${pedido.id}"><strong>Observação Loja 5:</strong></label><br>
    <textarea id="obs_${pedido.id}" rows="3">${pedido.obs_loja5 || ""}</textarea><br>
    
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

window.atualizarPedido = async function (pedidoId) {
  const obs = document.getElementById(`obs_${pedidoId}`).value;
  const status = document.getElementById(`status_${pedidoId}`).value;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ obs_loja5: obs, status: status })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido.");
      return;
    }

    alert("Pedido atualizado com sucesso!");
    carregarPedidos();
  } catch (err) {
    console.error("Erro inesperado ao atualizar pedido:", err);
    alert("Erro inesperado ao atualizar pedido.");
  }
};

// Carrega os pedidos ao iniciar
carregarPedidos();
