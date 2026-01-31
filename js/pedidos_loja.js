import { supabase } from "./supabase.js";

let usuarioLogado = null;
let pedidosGlobais = [];

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) carregarPedidos();
})();

// ===============================
// Criar pedido
// ===============================
const btnCriarPedido = document.getElementById("btnCriarPedido");

btnCriarPedido?.addEventListener("click", async () => {
  if (!usuarioLogado) return alert("Usuário não logado.");

  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipo) return alert("Selecione o tipo de serviço.");

  const { data, error } = await supabase
    .from("pedidos")
    .insert([{
      loja_origem: usuarioLogado.email,
      tipo_servico: tipo,
      eh_orcamento: orcamento,
      obs_loja_origem: observacao,
      status: "Aguardando coleta",
      criado_em: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) return alert("Erro ao criar pedido: " + error.message);

  await registrarEvento(data.id, "Pedido criado", observacao);

  alert(`Pedido criado com sucesso!\nOS: ${data.id}`);
  carregarPedidos();

  document.getElementById("tipo").value = "";
  document.getElementById("orcamento").checked = false;
  document.getElementById("observacao").value = "";
});

// ===============================
// Carregar pedidos da loja
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  const filtroStatus = document.getElementById("filtroStatus")?.value;

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("loja_origem", usuarioLogado.email)
    .order("criado_em", { ascending: false });

  if (filtroStatus) query = query.eq("status", filtroStatus);

  const { data, error } = await query;
  if (error) return alert("Erro ao carregar pedidos");

  pedidosGlobais = data || [];
  renderizarPedidos();
}

// ===============================
// Renderizar pedidos + timeline
// ===============================
function renderizarPedidos() {
  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if (!pedidosGlobais.length) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidosGlobais.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    let acoes = "";

    switch (p.status) {

      case "Aguardando coleta":
        acoes = `
          <button onclick="enviarParaTransporte('${p.id}')">
            Enviar para Transporte
          </button>`;
        break;

      case "Em transporte para loja de origem":
        acoes = `<em>Pedido retornando...</em>`;
        break;

      case "Recebido na loja de origem":
        acoes = `
          <button onclick="finalizarPedido('${p.id}')">Finalizar</button>
          <button onclick="retrabalhoPedido('${p.id}')">Retrabalho</button>
        `;
        break;
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Observação:</strong> ${p.obs_loja_origem || "—"}</p>
      ${acoes}
      <div id="timeline-${p.id}" class="timeline"></div>
    `;

    container.appendChild(card);
    carregarTimeline(p.id);
  });
}

// ===============================
// Timeline visual
// ===============================
async function carregarTimeline(pedidoId) {
  const { data, error } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (!timelineDiv) return;

  timelineDiv.innerHTML = "<strong>Histórico do Pedido</strong>";

  if (error || !data || data.length === 0) {
    timelineDiv.innerHTML += "<p><small>Sem eventos registrados</small></p>";
    return;
  }

  data.forEach(e => {
    const final =
      e.evento.toLowerCase().includes("finalizado") ||
      e.evento.toLowerCase().includes("recebido na loja de origem");

    const item = document.createElement("div");
    item.className = `timeline-item ${final ? "evento-final" : ""}`;

    item.innerHTML = `
      <strong>${e.evento}</strong>
      ${e.observacao ? `<div>${e.observacao}</div>` : ""}
      <small>
        ${new Date(e.criado_em).toLocaleString()} — ${e.criado_por}
      </small>
    `;

    timelineDiv.appendChild(item);
  });
}

// ===============================
// Ações
// ===============================
window.enviarParaTransporte = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Em transporte para Loja 5" })
    .eq("id", id);

  await registrarEvento(id, "Pedido enviado para transporte");
  carregarPedidos();
};

window.finalizarPedido = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Finalizado" })
    .eq("id", id);

  await registrarEvento(id, "Pedido finalizado");
  carregarPedidos();
};

window.retrabalhoPedido = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Retrabalho" })
    .eq("id", id);

  await registrarEvento(id, "Pedido enviado para retrabalho");
  carregarPedidos();
};

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao = "") {
  if (!usuarioLogado) return;

  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: usuarioLogado.email,
    criado_em: new Date().toISOString()
  }]);
}

// ===============================
// Filtro
// ===============================
document.getElementById("btnFiltrar")
  ?.addEventListener("click", carregarPedidos);

// Auto refresh
setInterval(() => {
  if (usuarioLogado) carregarPedidos();
}, 5000);
