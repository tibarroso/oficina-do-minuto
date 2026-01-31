import { supabase } from "./supabase.js";

// Referência para o container onde os pedidos serão exibidos
const containerPedidos = document.getElementById("containerPedidos");

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos() {
  try {
    // Buscar pedidos com status 'Entregue na Loja 5' ou 'Em serviço'
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Entregue na Loja 5", "Em serviço"]) // Status para pedidos entregues
      .order("criado_em", { ascending: false });

    if (error) throw error;

    // Limpar o conteúdo anterior
    containerPedidos.innerHTML = "";

    if (!data.length) {
      containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    // Criar um card para cada pedido
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

  // Classe de status baseada no status do pedido
  const statusClass = getStatusClass(pedido.status);

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>

    <strong>Observação:</strong><br>
    <em>${pedido.obs_loja_origem || "Nenhuma observação"}</em>
  `;

  return card;
}

// =========================
// MAPEAR STATUS PARA CLASSE CSS
// =========================
function getStatusClass(status) {
  if (status.includes("Loja 5")) return "status-Loja5";
  if (status.includes("Em serviço")) return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  return "status-Aguardando";
}

// =========================
// INICIALIZAÇÃO
// =========================
carregarPedidos();
setInterval(carregarPedidos, 5000); // Atualiza a cada 5 segundos
