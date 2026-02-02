import { supabase } from "./supabase.js";

// Referência para o container onde os pedidos serão exibidos
const containerPedidos = document.getElementById("containerPedidos");

// Referência para a mensagem de sucesso
const successMessage = document.getElementById("successMessage");

// Variável para armazenar os pedidos carregados anteriormente
let pedidosAnteriores = [];

// =========================
// CARREGAR PEDIDOS (Somente com status "Entregue na Loja 5")
// =========================
async function carregarPedidos() {
  try {
    // Exibe feedback de carregamento
    containerPedidos.innerHTML = '<p class="loading">Carregando pedidos...</p>';

    // Buscar apenas pedidos com status "Entregue na Loja 5"
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Entregue na Loja 5") // Filtro para carregar somente os pedidos com status "Entregue na Loja 5"
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
      return;
    }

    // Salvar a observação automaticamente quando finalizar
    const obsLoja5 = document.getElementById(`obs_loja5_${pedidoId}`).value;

    await supabase
      .from("pedidos")
      .update({ obs_loja5: obsLoja5 })
      .eq("id", pedidoId);

    // Exibir a mensagem de sucesso na tela (sem precisar de `alert()`)
    successMessage.style.display = "block"; // Exibe a mensagem de sucesso

    // Após 2 segundos, redireciona para a tela de pedidos
    setTimeout(() => {
      window.location.href = "loja5.html"; // Redireciona para a tela de pedidos
    }, 2000); // Aguardar 2 segundos antes do redirecionamento

    // Recarregar a lista de pedidos após a finalização
    carregarPedidos(); // Atualiza os pedidos após a finalização

  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

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

// Carrega os pedidos assim que a página for carregada
carregarPedidos();
