import { supabase } from "./supabase.js";

const tipoInput = document.getElementById("tipo");
const orcamentoInput = document.getElementById("orcamento");
const btnCriarPedido = document.getElementById("btnCriarPedido");
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
// Criar pedido
// ===============================
btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return;
  const tipo = tipoInput.value;
  const orcamento = orcamentoInput.checked;

  const { error } = await supabase.from("pedidos").insert({
    loja_origem: usuarioLogado.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
    criado_em: new Date()
  });

  if (error) {
    alert("Erro ao criar pedido: " + error.message);
  } else {
    alert("Pedido criado com sucesso!");
    carregarPedidos();
  }
});

// ===============================
// Carregar pedidos da loja
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false })
    .eq("loja_origem", usuarioLogado.email);

  const status = filtroStatus.value;
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return alert("Erro ao carregar pedidos: " + error.message);

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

    // Status com histórico
    let acaoFinalizar = "";
    // Somente permite finalizar quando o pedido voltou da Loja 5
    if (p.status === "Entregue na loja de origem") {
      acaoFinalizar = `<button onclick="finalizarPedido('${p.id}')">
                          Confirmar Recebimento e Finalizar
                       </button>`;
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> <span class="status">${p.status}</span></p>
      <p><strong>Criado em:</strong> ${new Date(p.criado_em).toLocaleString()}</p>
      ${acaoFinalizar}
      <div id="timeline-${p.id}" style="margin-top:10px;"></div>
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
    html += "<small>Sem eventos</small>";
  } else {
    data.forEach(e => {
      html += `
        <div style="border-left:3px solid #555; padding-left:8px; margin:6px 0;">
          <strong>${e.evento}</strong><br>
          ${e.observacao || ""}<br>
          <small>${new Date(e.criado_em).toLocaleString()} - ${e.criado_por}</small>
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
    console.error(error);
    alert("Erro ao finalizar pedido");
    return;
  }

  // Registrar evento no histórico
  await supabase.from("pedido_eventos").insert([{
    pedido_id: id,
    evento: "Pedido finalizado pela loja de origem",
    criado_por: "Loja origem"
  }]);

  alert("Pedido finalizado com sucesso!");
  carregarPedidos();
};

// ===============================
// Filtro por status
// ===============================
btnFiltrar.addEventListener("click", carregarPedidos);

// ===============================
// Atualização automática a cada 5 segundos
// ===============================
setInterval(() => {
  if (usuarioLogado) carregarPedidos();
}, 5000);

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (!usuarioLogado) return;
  carregarPedidos();
})();
