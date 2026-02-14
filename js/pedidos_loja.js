import { supabase } from "./supabase.js";

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos(filtroStatus = "", filtroLoja = "") {
  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    // Aplicando filtro de status
    if (filtroStatus && filtroStatus !== "Todos") {
      query = query.eq("status", filtroStatus);
    }

    // Aplicando filtro de loja (verifica tanto loja_origem quanto loja_destino)
    if (filtroLoja && filtroLoja !== "Todas") {
      query = query.or(`loja_origem.eq.${filtroLoja},loja_destino.eq.${filtroLoja}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const pedidos = data || [];
    const container = document.getElementById("containerPedidos");
    container.innerHTML = "";

    if (!pedidos.length) {
      container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const card = criarCardPedido(pedido);
      container.appendChild(card);
      carregarTimeline(pedido.id);
    });
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    const container = document.getElementById("containerPedidos");
    container.innerHTML = `<p style="color:red;">Erro ao carregar pedidos.</p>`;
  }
}

// =========================
// CRIAR CARD
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  const statusClass = getStatusClass(pedido.status);

  // Verifica se o status é "Recebido na loja de origem" (comparação exata)
  const statusComparacao = pedido.status && pedido.status.trim();
  const acoesHTML = (statusComparacao === "Recebido na loja de origem") ? `
    <div class="acoes-pedido">
      <button class="btn-finalizar" onclick="atualizarStatus('Finalizado', ${pedido.id})">Finalizado</button>
      <button class="btn-retrabalho" onclick="atualizarStatus('Aguardando coleta', ${pedido.id})">Retrabalho</button>
    </div>` : "";

  card.innerHTML = `
    <strong>Loja de Origem:</strong> ${pedido.loja_origem || "Não especificada"}<br>
    <strong>Loja de Destino:</strong> ${pedido.loja_destino || "Não especificada"}<br>
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Orçamento:</strong> ${pedido.orcamento ? "Sim" : "Não"}<br>
    <strong>Observação:</strong><br><em>${pedido.obs_loja_origem || "—"}</em>
    <div class="timeline" id="timeline-${pedido.id}"><strong>Eventos:</strong></div>
    ${acoesHTML} <!-- Botões de ação -->
  `;
  return card;
}

// =========================
// ATUALIZAR STATUS (Finalizado/Retrabalho)
// =========================
async function atualizarStatus(novoStatus, pedidoId) {
  try {
    let observacao = "";

    if (novoStatus === "Aguardando coleta") {
      observacao = "Serviço para ser refeito"; // Observação para Retrabalho
    }

    const { data, error } = await supabase
      .from("pedidos")
      .update({ status: novoStatus, obs_loja_origem: observacao })
      .eq("id", pedidoId);

    if (error) throw error;

    alert(`Status atualizado para "${novoStatus}" com sucesso!`);

    // Recarregar os pedidos para refletir a atualização
    carregarPedidos();

  } catch (err) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, err);
    alert("Erro ao atualizar status do pedido. Veja o console.");
  }
}

// =========================
// CARREGAR TIMELINE
// =========================
async function carregarTimeline(pedidoId) {
  try {
    const { data: eventos, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true });

    if (error) throw error;

    const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
    if (!timelineDiv) return;

    eventos.forEach(evento => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `${evento.evento} <small>${new Date(evento.criado_em).toLocaleString()}</small>`;
      timelineDiv.appendChild(item);
    });
  } catch (err) {
    console.error(`Erro carregando timeline do pedido ${pedidoId}:`, err);
  }
}

// =========================
// STATUS
// =========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  if (status.includes("Loja 5")) return "status-Loja5";
  if (status.includes("Em serviço")) return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  if (status === "Aguardando coleta") return "status-Aguardando";
  return "status-Aguardando";
}

// =========================
// CRIAR PEDIDO
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const btnCriarPedido = document.getElementById("btnCriarPedido");

  btnCriarPedido?.addEventListener("click", async () => {
    const tipoServico = document.getElementById("tipo").value;
    const lojaOrigem = document.getElementById("lojaOrigem").value;
    const lojaDestino = document.getElementById("lojaDestino").value;
    const orcamento = document.getElementById("orcamento").checked;
    const observacao = document.getElementById("observacao").value.trim();

    if (!tipoServico || !lojaOrigem || !lojaDestino) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    try {
      const { data, error } = await supabase.from("pedidos").insert([{
        tipo_servico: tipoServico,
        loja_origem: lojaOrigem,
        loja_destino: lojaDestino,
        orcamento,
        obs_loja_origem: observacao,
        status: "Aguardando coleta",
        criado_em: new Date().toISOString()
      }]);


      if (error) throw error;

      alert("Pedido criado com sucesso!");
      document.getElementById("tipo").value = "";
      document.getElementById("lojaOrigem").value = "";
      document.getElementById("lojaDestino").value = "";
      document.getElementById("orcamento").checked = false;
      document.getElementById("observacao").value = "";
      carregarPedidos();
    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      alert("Erro ao criar pedido. Veja o console.");
    }
  });

  // =========================
  // FILTRO DE PEDIDOS
  // =========================
  document.getElementById("btnFiltrar").addEventListener("click", () => {
    const filtroStatus = document.getElementById("filtroStatus").value;
    const filtroLoja = document.getElementById("filtroLoja").value;
    carregarPedidos(filtroStatus, filtroLoja);
  });

  // =========================
  // AUTO-ATUALIZAÇÃO
  // =========================
  setInterval(() => {
    const filtroStatus = document.getElementById("filtroStatus").value;
    const filtroLoja = document.getElementById("filtroLoja").value;
    carregarPedidos(filtroStatus, filtroLoja);
  }, 30000); // Atualiza a cada 30 segundos
});
