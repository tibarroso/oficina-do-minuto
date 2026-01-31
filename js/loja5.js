import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  if (!usuarioLogado) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return;
  }

  carregarPedidosLoja5();
  setInterval(carregarPedidosLoja5, 5000); // auto refresh
})();

// =====================
// Carregar pedidos para Loja 5
// =====================
async function carregarPedidosLoja5() {
  await carregarRecebidos();
  await carregarEmServico();
  await carregarProntosRetorno();
}

// =====================
// Pedidos recebidos na Loja 5
// =====================
async function carregarRecebidos() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Entregue na Loja 5")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("pedidosRecebidos");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido recebido.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCardLoja5(p, "recebido")));
  } catch (err) {
    console.error("Erro ao carregar pedidos recebidos:", err);
  }
}

// =====================
// Pedidos em serviço
// =====================
async function carregarEmServico() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Em serviço")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("pedidosEmServico");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido em serviço.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCardLoja5(p, "emServico")));
  } catch (err) {
    console.error("Erro ao carregar pedidos em serviço:", err);
  }
}

// =====================
// Pedidos prontos para transporte (aguardando retorno)
// =====================
async function carregarProntosRetorno() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Aguardando retorno do transporte")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("pedidosProntosRetorno");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido pronto para transporte.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCardLoja5(p, "prontoRetorno")));
  } catch (err) {
    console.error("Erro ao carregar pedidos prontos para transporte:", err);
  }
}

// =====================
// Criar Card Loja 5
// =====================
function criarCardLoja5(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  const statusTag = `<span class="status-tag ${
    tipo === "recebido" ? "status-Loja5" :
    tipo === "emServico" ? "status-Transporte" :
    "status-Transporte"
  }">${pedido.status}</span>`;

  card.innerHTML = `
    ${statusTag}
    <h3>OS: ${pedido.id}</h3>
    <p><strong>Serviço:</strong> ${pedido.tipo_servico}</p>
    <p><strong>Loja Origem:</strong> ${pedido.loja_origem}</p>
    <p><strong>Observação:</strong><br><em>${pedido.obs_loja_origem || "—"}</em></p>
  `;

  const btn = document.createElement("button");

  switch (tipo) {
    case "recebido":
      btn.textContent = "Enviar de volta";
      btn.onclick = () => iniciarTransporteRetorno(pedido.id);
      card.appendChild(btn);
      break;
    case "emServico":
      btn.textContent = "Finalizar serviço";
      btn.onclick = () => finalizarServico(pedido.id);
      card.appendChild(btn);
      break;
    case "prontoRetorno":
      btn.textContent = "Iniciar transporte de retorno";
      btn.onclick = () => iniciarTransporteRetorno(pedido.id);
      card.appendChild(btn);
      break;
  }

  return card;
}

// =====================
// Ações
// =====================
async function finalizarServico(id) {
  await atualizarStatusLoja5(id, "Aguardando retorno do transporte", "Serviço finalizado");
}

async function iniciarTransporteRetorno(id) {
  await atualizarStatusLoja5(id, "Em transporte para loja de origem", "Transporte de retorno iniciado");
}

// =====================
// Atualizar status + registrar evento
// =====================
async function atualizarStatusLoja5(id, status, evento) {
  try {
    const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
    if (error) throw error;

    await registrarEventoLoja5(id, evento);
    carregarPedidosLoja5();
  } catch (err) {
    console.error(`Erro ao atualizar status do pedido ${id}:`, err);
    alert("Erro ao atualizar status do pedido");
  }
}

// =====================
// Registrar evento
// =====================
async function registrarEventoLoja5(pedidoId, evento) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;

    await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento,
      criado_por: data.user.email,
      criado_em: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Erro ao registrar evento:", err);
  }
}

// Tornar funções globais para onclick
window.finalizarServico = finalizarServico;
window.iniciarTransporteRetorno = iniciarTransporteRetorno;
