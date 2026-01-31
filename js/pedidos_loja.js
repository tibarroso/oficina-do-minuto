import { supabase } from "./supabase.js";

// Função para carregar pedidos e exibir na tela
async function carregarPedidos(filtro = "") {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pedidos:", error);
    const container = document.getElementById("containerPedidos");
    container.innerHTML = `<p style="color: red;">Erro ao carregar pedidos: ${error.message}</p>`;
    return;
  }

  let pedidos = data || [];
  if (filtro && filtro !== "") {
    pedidos = pedidos.filter(p => p.status === filtro);
  }

  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if (pedidos.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    // Definindo a cor da tag status de acordo com o status do pedido
    let statusClass = "status-Aguardando";
    if (p.status.includes("Loja 5")) statusClass = "status-Loja5";
    else if (p.status.includes("Em serviço")) statusClass = "status-Transporte";
    else if (p.status === "Finalizado") statusClass = "status-Finalizado";
    else if (p.status === "Retrabalho") statusClass = "status-Retrabalho";
    else if (p.status === "Aguardando coleta") statusClass = "status-Aguardando";

    card.innerHTML = `
      <strong>OS:</strong> ${p.id}<br>
      <strong>Serviço:</strong> ${p.tipo_servico}<br>
      <span class="status-tag ${statusClass}">${p.status}</span><br>
      <strong>Observação:</strong><br><em>${p.obs_loja_origem || "—"}</em>
      <div class="timeline" id="timeline-${p.id}"><strong>Eventos:</strong></div>
    `;

    container.appendChild(card);

    // Carrega a timeline de eventos para cada pedido
    carregarTimeline(p.id);
  });
}

// Função para carregar a timeline de eventos de um pedido
async function carregarTimeline(pedidoId) {
  const { data: eventos, error } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (!timelineDiv) return; // Proteção se não encontrar o container

  if (error) {
    timelineDiv.innerHTML += `<p style="color: red;">Erro ao carregar eventos: ${error.message}</p>`;
    return;
  }

  if (!eventos || eventos.length === 0) {
    timelineDiv.innerHTML += `<p><em>Sem eventos registrados.</em></p>`;
    return;
  }

  eventos.forEach(e => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `${e.evento} <small>${new Date(e.criado_em).toLocaleString()}</small>`;
    timelineDiv.appendChild(item);
  });
}

// Evento para criação do pedido
document.getElementById("btnCriarPedido").addEventListener("click", async () => {
  const tipoServico = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipoServico) {
    alert("Por favor, selecione o tipo de serviço.");
    return;
  }

  try {
    const { data, error } = await supabase.from("pedidos").insert([
      {
        tipo_servico: tipoServico,
        orcamento: orcamento,
        obs_loja_origem: observacao,
        status: "Aguardando coleta",
        criado_em: new Date().toISOString(),
      }
    ]);

    if (error) {
      alert("Erro ao criar pedido: " + error.message);
      return;
    }

    alert("Pedido criado com sucesso!");

    // Limpa o formulário
    document.getElementById("tipo").value = "";
    document.getElementById("orcamento").checked = false;
    document.getElementById("observacao").value = "";

    // Atualiza a lista de pedidos exibidos
    carregarPedidos(document.getElementById("filtroStatus").value);

  } catch (err) {
    alert("Erro inesperado: " + err.message);
  }
});

// Evento para filtro de pedidos
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// Carrega os pedidos inicialmente
carregarPedidos();

// Atualiza a lista de pedidos a cada 5 segundos
setInterval(() => {
  const filtroAtual = document.getElementById("filtroStatus").value;
  carregarPedidos(filtroAtual);
}, 5000);
