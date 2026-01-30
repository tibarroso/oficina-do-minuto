import { supabase } from "./supabase.js";

const filtroStatus = document.getElementById("filtroStatus");
const btnFiltrar = document.getElementById("btnFiltrar");
const containerPedidos = document.getElementById("containerPedidos");
const btnCriarPedido = document.getElementById("btnCriarPedido");

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
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipo) return alert("Selecione o tipo de serviço.");

  const { data, error } = await supabase.from("pedidos").insert([{
    loja_origem: usuarioLogado.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    obs_loja_origem: observacao,
    status: "Aguardando coleta",
    criado_em: new Date().toISOString()
  }]);

  if (error) return alert("Erro ao criar pedido: " + error.message);

  alert("Pedido criado com sucesso!");
  carregarPedidos();

  // Limpar formulário
  document.getElementById("tipo").value = "";
  document.getElementById("orcamento").checked = false;
  document.getElementById("observacao").value = "";
});

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

    let acoes = "";

    // Botões dependendo do status
    switch (p.status) {
      case "Aguardando coleta":
        acoes = `<button onclick="enviarParaTransporte('${p.id}')">Enviar para Transporte</button>`;
        break;
      case "Em transporte para loja de origem":
        acoes = `<button onclick="finalizarPedido('${p.id}')">Finalizar / Retrabalho</button>`;
        break;
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Observação:</strong> ${p.obs_loja_origem || "<em>Não informado</em>"}</p>
      <p><strong>Criado em:</strong> ${new Date(p.criado_em).toLocaleString()}</p>
      ${acoes}
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
    html += "<small>Sem eventos</small>";
  } else {
    data.forEach(e => {
      html += `
        <div style="border-left:3px solid #555; padding-left:8px; margin:6px 0;">
          <strong>${e.evento}</strong><br>
          ${e.observacao || ""}<br>
          <small>${new Date(e.criado_em).toLocaleString()} – ${e.criado_por}</small>
        </div>
      `;
    });
  }

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (timelineDiv) timelineDiv.innerHTML = html;
}

// ===============================
// Ações
// ===============================
window.enviarParaTransporte = async (id) => {
  await supabase.from("pedidos").update({ status: "Em transporte para Loja 5" }).eq("id", id);
  await registrarEvento(id, "Pedido enviado para Transporte");
  carregarPedidos();
};

window.finalizarPedido = async (id) => {
  const { error } = await supabase.from("pedidos").update({ status: "Finalizado" }).eq("id", id);
  if (error) return alert("Erro ao finalizar pedido");
  await registrarEvento(id, "Pedido finalizado / retrabalho");
  carregarPedidos();
};

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao = "") {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: usuarioLogado.email,
    criado_em: new Date().toISOString()
  }]);
}

// ===============================
// Eventos
// ===============================
btnFiltrar.addEventListener("click", carregarPedidos);

// Auto refresh a cada 5 segundos
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
