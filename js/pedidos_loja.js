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

  try {
    let query = supabase
      .from("pedidos")
      .select("*")
      .eq("loja_origem", usuarioLogado.email)
      .order("criado_em", { ascending: false });

    const status = filtroStatus.value;
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    pedidosGlobais = data || [];
    renderizarPedidos();
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    alert("Erro ao carregar pedidos.");
  }
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

    const acoesDiv = document.createElement("div");

    if (p.status === "Aguardando coleta") {
      const btn = document.createElement("button");
      btn.textContent = "Enviar para Transporte";
      btn.addEventListener("click", () => enviarParaTransporte(p.id));
      acoesDiv.appendChild(btn);
    } else if (p.status === "Em transporte para loja de origem") {
      const btn = document.createElement("button");
      btn.textContent = "Finalizar / Retrabalho";
      btn.addEventListener("click", () => finalizarPedido(p.id));
      acoesDiv.appendChild(btn);
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Observação:</strong> ${p.obs_loja_origem || "<em>Não informado</em>"}</p>
      <p><strong>Criado em:</strong> ${new Date(p.criado_em).toLocaleString()}</p>
      <div id="timeline-${p.id}" class="timeline"></div>
    `;
    card.appendChild(acoesDiv);
    containerPedidos.appendChild(card);

    carregarTimeline(p.id);
  });
}

// ===============================
// Timeline de eventos
// ===============================
async function carregarTimeline(pedidoId) {
  try {
    const { data, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true });

    if (error) throw error;

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
  } catch (err) {
    console.error("Erro ao carregar timeline:", err);
  }
}

// ===============================
// Ações
// ===============================
async function enviarParaTransporte(id) {
  try {
    const { error } = await supabase.from("pedidos")
      .update({ status: "Em transporte para Loja 5" })
      .eq("id", id);

    if (error) throw error;

    await registrarEvento(id, "Pedido enviado para Transporte");
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao enviar pedido para transporte:", err);
    alert("Erro ao enviar pedido para transporte");
  }
}

async function finalizarPedido(id) {
  try {
    const { error } = await supabase.from("pedidos")
      .update({ status: "Finalizado" })
      .eq("id", id);

    if (error) throw error;

    await registrarEvento(id, "Pedido finalizado / retrabalho");
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao finalizar pedido:", err);
    alert("Erro ao finalizar pedido");
  }
}

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao = "") {
  try {
    if (!usuarioLogado) return;

    await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento,
      observacao,
      criado_por: usuarioLogado.email,
      criado_em: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Erro ao registrar evento:", err);
  }
}

// ===============================
// Eventos
// ===============================
btnFiltrar.addEventListener("click", carregarPedidos);

// Auto refresh
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
