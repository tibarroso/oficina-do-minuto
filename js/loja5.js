import { supabase } from "./supabase.js";

// Referência para o container onde os pedidos serão exibidos
const containerPedidos = document.getElementById("containerPedidos");

// Variável para armazenar os pedidos carregados anteriormente
let pedidosAnteriores = [];

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos() {
  try {
    // Exibe feedback de carregamento
    containerPedidos.innerHTML = '<p class="loading">Carregando pedidos...</p>';

    // Buscar apenas pedidos com status "Entregue na Loja 5"
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Entregue na Loja 5") // Exibe apenas pedidos "Entregue na Loja 5"
      .order("criado_em", { ascending: false }); // Ordenar do mais recente para o mais antigo

    if (error) throw error;

    // Limpar o conteúdo anterior antes de adicionar os novos pedidos
    containerPedidos.innerHTML = "";  // Limpa antes de adicionar os novos pedidos

    if (!data.length) {
      containerPedidos.innerHTML = "<p class='error'>Nenhum pedido encontrado.</p>";
      return;
    }

    // Atualiza os pedidos apenas se houve alteração (status ou observação)
    data.forEach(pedido => {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedido.id);

      if (!pedidoAnterior || pedido.status !== pedidoAnterior.status || pedido.obs_loja5 !== pedidoAnterior.obs_loja5) {
        // Se o pedido foi alterado (status ou observação diferente), cria ou atualiza o card
        const card = criarCardPedido(pedido);
        containerPedidos.appendChild(card);
      }
    });

    // Atualiza o estado anterior com os novos pedidos
    pedidosAnteriores = data;

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    containerPedidos.innerHTML = `<p class="error">Erro ao carregar pedidos. Tente novamente.</p>`;
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
    <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma observação para a Loja 5" ${pedido.status === "Finalizado" ? "disabled" : ""}>${pedido.obs_loja5 || ""}</textarea><br>

    ${pedido.status !== "Finalizado" ? `<button onclick="atualizarPedido('${pedido.id}')">Salvar Observação</button>` : ""}
    ${pedido.status === "Em serviço" ? `<button onclick="mudarStatusParaTransporte('${pedido.id}')">Mover para Transporte</button>` : ''}
    ${pedido.status === "Entregue na Loja 5" || pedido.status === "Finalizado" ? `<button onclick="mudarStatusParaFinalizado('${pedido.id}')">Finalizar Pedido</button>` : ''}
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

    // Atualiza a observação localmente na lista de pedidos
    pedidosAnteriores = pedidosAnteriores.map(p => {
      if (p.id === pedidoId) {
        p.obs_loja5 = obsLoja5;
      }
      return p;
    });

    // Atualiza a interface sem recarregar a página
    const card = document.getElementById(`pedido-${pedidoId}`);
    if (card) {
      card.querySelector(`#obs_loja5_${pedidoId}`).value = obsLoja5;  // Atualiza a observação no card
    }

    alert("Observação da Loja 5 salva com sucesso!");

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

    // Salvar a observação automaticamente quando finalizar
    const obsLoja5 = document.getElementById(`obs_loja5_${pedidoId}`).value;

    await supabase
      .from("pedidos")
      .update({ obs_loja5: obsLoja5 })
      .eq("id", pedidoId);

    // Exibir mensagem de sucesso na tela
    const messageDiv = document.createElement("div");
    messageDiv.className = "success-message";
    messageDiv.innerHTML = "Pedido finalizado com sucesso!";

    // Adicionar a mensagem ao body
    document.body.appendChild(messageDiv);

    // Após 2 segundos, redirecionar para a tela de pedidos
    setTimeout(() => {
      window.location.href = "loja5.html"; // Redireciona para a tela de pedidos
    }, 2000); // Aguarda 2 segundos antes do redirecionamento

    // Atualiza os pedidos após a finalização
    carregarPedidos(); // Atualiza os pedidos após a finalização

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

// =========================
// INICIALIZAÇÃO
// =========================
document.getElementById("btnAtualizar").addEventListener("click", carregarPedidos); // Adicionando o botão de atualização manual

// Carrega os pedidos assim que a página for carregada
carregarPedidos();
