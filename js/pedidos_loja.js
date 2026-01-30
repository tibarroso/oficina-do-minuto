import { supabase } from "./supabase.js";

const filtroStatus = document.getElementById("filtroStatus");
const btnFiltrar = document.getElementById("btnFiltrar");
const containerPedidos = document.getElementById("containerPedidos");

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
// Carregar pedidos da loja
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("loja_origem", usuarioLogado.email)
    .order("criado_em", { ascending: false });

  const status = filtroStatus.value;
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    alert("Erro ao carregar pedidos: " + error.message);
    return;
  }

  pedidosGlobais = data || [];
  renderizarPedidos();
}

// ===============================
// Renderizar pedidos
// ===============================
function renderizarPedidos() {
  containerPedidos.innerHTML = "";

  if (!pedidosGlobais.length) {
    containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidosGlobais.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    let acaoFinalizar = "";
    if (p.status === "Entregue na loja de origem") {
      acaoFinalizar = `
        <button onclick="finalizarPedido('${p.id}')">
          Confirmar recebimento e finalizar
        </button>
      `;
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>

      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>

      <p>
        <strong>Status:</strong>
        <span class="status">${p.status}</span>
      </p>

      <p>
        <strong>Observação (Ticket / Nº do saco):</strong><br>
        ${p.obs_loja_origem ? p.obs_loja_origem : "<em>Não informado</em>"}
      </p>

      <p>
        <strong>Criado em:</strong>
        ${p.criado_em ? new Date(p.criado_em).toLocaleString() : "<em>Não informado</em>"}
      </p>

      ${acaoFinalizar}

      <div id="timeline-${p.id}" class="timeline"></div>
    `;

    containerPedidos.appendChild(card);
    carregarTimeline(p.id);
  });
}

// ===============================
// Timeline de eventos
// ===============================
async function carregarTimeline(pedidoId) {
  const { data } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  let html = "<strong>Histórico</strong><br>";

  if (!data || data.length === 0) {
    html += "<small>Sem eventos registrados</small>";
  } else {
    data.forEach(e => {
      html += `
        <div style="border-left:3px solid #555; padding-left:8px; margin:6px 0;">
          <strong>${e.evento}</strong><br>
          ${e.observacao || ""}
          <br>
          <small>
            ${e.criado_em ? new Date(e.criado_em).toLocaleString() : ""} – ${e.criado_por}
          </small>
        </div>
      `;
    });
  }

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (timelineDiv) timelineDiv.innerHTML = html;
}

// ===============================
// Finalizar pedido (loja de origem)
// ===============================
window.finalizarPedido = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Finalizado" })
    .eq("id", id);

  if (error) {
    alert("Erro ao finalizar pedido");
    return;
  }

  await supabase.from("pedido_eventos").insert([{
    pedido_id: id,
    evento: "Pedido finalizado pela loja de origem",
    criado_por: usuarioLogado.email,
    criado_em: new Date().toISOString()
  }]);

  alert("Pedido finalizado com sucesso!");
  carregarPedidos();
};

// ===============================
// Eventos
// ===============================
btnFiltrar.addEventListener("click", carregarPedidos);

// Auto refresh a cada 5s
setInterval(() => {
  if (usuarioLogado) carregarPedidos();
}, 5000);

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) carregarPedidos();
})();
