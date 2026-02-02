import { supabase } from "./supabase.js";

// Referência para o container onde os pedidos serão exibidos
const containerPedidos = document.getElementById("containerPedidos");

// Variável para armazenar os pedidos carregados anteriormente
let pedidosAnteriores = [];

let isLoading = false;

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos() {
  if (isLoading) return; // Evita sobrecarga de requisições, aguarda o carregamento atual

  isLoading = true;

  try {
    // Exibe feedback de carregamento
    containerPedidos.innerHTML = '<p class="loading">Carregando pedidos...</p>';

    // Buscar pedidos com status 'Entregue na Loja 5' ou 'Em serviço'
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Entregue na Loja 5", "Em serviço"]) // Status para pedidos entregues ou em serviço
      .order("criado_em", { ascending: false }); // Ordenar do mais recente para o mais antigo

    if (error) throw error;

    // Limpar o conteúdo anterior e substituir os pedidos
    containerPedidos.innerHTML = "";

    if (!data.length) {
      containerPedidos.innerHTML = "<p class='error'>Nenhum pedido encontrado.</p>";
      return;
    }

    // Atualiza os pedidos que foram alterados
    data.forEach(pedido => {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedido.id);

      if (!pedidoAnterior || pedido.status !== pedidoAnterior.status || pedido.obs_loja5 !== pedidoAnterior.obs_loja5) {
        // Se o pedido foi alterado (status ou observação diferente), cria ou atualiza o card
        const card = criarCardPedido(pedido);
        const existingCard = document.getElementById(`pedido-${pedido.id}`);

        if (existingCard) {
          existingCard.replaceWith(card);  // Substitui o card antigo com o novo
        } else {
          containerPedidos.appendChild(card);  // Adiciona o novo card caso não exista
        }
      }
    });

    // Atualiza o estado anterior com os novos pedidos
    pedidosAnteriores = data;

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    containerPedidos.innerHTML = `<p class="error">Erro ao carregar pedidos. Tente novamente.</p>`;
  } finally {
    isLoading = false; // Libera o bloqueio de requisição
  }
}

// =========================
// CRIAR CARD DE PEDIDO
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `pedido-${pedido.id}`; // Atribuindo um ID para facilitar a manipulação do card

  // Classe de status baseada no status do pedido
  const statusClass = getStatusClass(pedido.status);

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Observação:</strong><br>
    <em>${pedido.obs_loja_origem || "Nenhuma observação"}</em><br>

    <label for="obs_loja5_${pedido.id}"><strong>Observação Loja 5:</strong></label><br>
    <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma observação para a Loja 5">${pedido.obs_loja5 || ""}</textarea><br>

    <button onclick="atualizarPedido('${pedido.id}')">Salvar Observação</button>

    <!-- Botões de status -->
    ${pedido.status === "Em serviço" ? `<button onclick="mudarStatusParaTransporte('${pedido.id}')">Mover para Transporte</button>` : ''}
    ${pedido.status === "Entregue na Loja 5" ? `<button onclick="mudarStatusParaFinalizado('${pedido.id}')">Finalizar Pedido</button>` : ''}
  `;

  return card;
}

// =========================
// ATUALIZAR PEDIDO COM A OBSERVAÇÃO DA LOJA 5
// =========================
window.atualizarPedido = async function(pedidoId) {
  const obsLoja5 = document.getElementById(`obs_loja5_${pedidoId}`).value;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ obs_loja5: obsLoja5 })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido.");
      return;
    }

    // Atualiza a observação localmente
    pedidosAnteriores = pedidosAnteriores.map(p => {
      if (p.id === pedidoId) {
        p.obs_loja5 = obsLoja5;
      }
      return p;
    });

    alert("Observação da Loja 5 salva com sucesso!");
    carregarPedidos(); // Atualiza os pedidos após a atualização
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Erro inesperado ao atualizar pedido.");
  }
};

// =========================
// MUDAR STATUS PARA 'TRANSPORTE'
// =========================
window.mudarStatusParaTransporte = async function(pedidoId) {
  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "Transporte" })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar status para Transporte:", error);
      alert("Erro ao mover para Transporte.");
      return;
    }

    alert("Pedido movido para Transporte com sucesso!");
    carregarPedidos(); // Atualiza os pedidos após a atualização
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Erro inesperado ao atualizar pedido.");
  }
};

// =========================
// MUDAR STATUS PARA 'FINALIZADO'
// =========================
window.mudarStatusParaFinalizado = async function(pedidoId) {
  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "Finalizado" })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar status para Finalizado:", error);
      alert("Erro ao finalizar o pedido.");
      return;
    }

    alert("Pedido finalizado com sucesso!");
    carregarPedidos(); // Atualiza os pedidos após a atualização
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Erro inesperado ao atualizar pedido.");
  }
};

// =========================
// MAPEAMENTO DE STATUS PARA CLASSE CSS
// =========================
function getStatusClass(status) {
  if (status === "Entregue na Loja 5") return "status-Loja5";
  if (status === "Em serviço") return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  return "status-Aguardando";
}


