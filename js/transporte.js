import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
export async function carregarPedidos() {
  await carregarAguardando();     // Ida
  await carregarEmTransporte();   // Ida e Volta
  await carregarRetorno();        // Volta
  await carregarRetrabalho();     // Retrabalho
}

// =====================
// AGUARDANDO COLETA (IDA)
// =====================
async function carregarAguardando() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Aguardando coleta", "Aguardando avaliação"])
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("aguardando");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCard(p, "ida")));
  } catch (err) {
    console.error("Erro ao carregar pedidos aguardando coleta:", err);
  }
}

// =====================
// EM TRANSPORTE (IDA ou VOLTA)
// =====================
async function carregarEmTransporte() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", [
        "Em transporte para Loja 5",
        "Em transporte para loja de origem"
      ])
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("transporte");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido em transporte.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCard(p, "emTransporte")));
  } catch (err) {
    console.error("Erro ao carregar pedidos em transporte:", err);
  }
}

// =====================
// AGUARDANDO RETORNO (VOLTA)
// =====================
async function carregarRetorno() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Aguardando retorno do transporte", "Em transporte para loja de origem"])
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("retorno");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido aguardando retorno.</p>";
      return;
    }

    data.forEach(p => div.appendChild(criarCard(p, "volta")));
  } catch (err) {
    console.error("Erro ao carregar pedidos aguardando retorno:", err);
  }
}

// =====================
// RETRABALHO
// =====================
async function carregarRetrabalho() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Retrabalho")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("retorno"); // você pode criar uma div separada se quiser
    if (!div) return;

    data.forEach(p => div.appendChild(criarCard(p, "retrabalho")));
  } catch (err) {
    console.error("Erro ao carregar pedidos em retrabalho:", err);
  }
}

// =====================
// Criar Card de Pedido
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  const observacaoHTML = pedido.obs_loja_origem
    ? `<strong>Observação:</strong><br><em>${pedido.obs_loja_origem}</em><br><br>`
    : "";

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja:</strong> ${pedido.loja_origem}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    ${observacaoHTML}
    <strong>Status:</strong> ${pedido.status}<br><br>
  `;

  const btn = document.createElement("button");

  switch (tipo) {
    case "ida":
      btn.textContent = "Iniciar Transporte (Ida)";
      btn.onclick = () => iniciarTransporteIda(pedido.id);
      break;

    case "emTransporte":
      if (pedido.status === "Em transporte para Loja 5") {
        btn.textContent = "Entregar na Loja 5";
        btn.onclick = () => entregarLoja5(pedido.id);
      } else if (pedido.status === "Em transporte para loja de origem") {
        btn.textContent = "Entregar na Loja de Origem";
        btn.onclick = () => entregarLojaOrigem(pedido.id);
      }
      break;

    case "volta":
      btn.textContent = "Iniciar Transporte de Retorno";
      btn.onclick = () => iniciarTransporteVolta(pedido.id);
      break;

    case "retrabalho":
      btn.textContent = "Enviar para retrabalho concluído";
      btn.onclick = () => finalizarRetrabalho(pedido.id);
      break;
  }

  card.appendChild(btn);
  return card;
}

// =====================
// AÇÕES
// =====================
async function iniciarTransporteIda(id) {
  await atualizarStatus(id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
}

async function entregarLoja5(id) {
  await atualizarStatus(id, "Entregue na Loja 5", "Entregue na Loja 5");
}

async function iniciarTransporteVolta(id) {
  await atualizarStatus(id, "Em transporte para loja de origem", "Transporte iniciado (volta)");
}

async function entregarLojaOrigem(id) {
  await atualizarStatus(id, "Recebido na loja de origem", "Entregue na loja de origem");
}

async function finalizarRetrabalho(id) {
  await atualizarStatus(id, "Finalizado", "Retrabalho concluído");
}

// =====================
// Atualizar status e registrar evento
// =====================
async function atualizarStatus(id, status, evento) {
  try {
    const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
    if (error) throw error;

    await registrarEvento(id, evento);
    carregarPedidos();
  } catch (err) {
    console.error(`Erro ao atualizar status do pedido ${id}:`, err);
    alert("Erro ao atualizar status do pedido");
  }
}

// =====================
// Registrar evento
// =====================
async function registrarEvento(pedidoId, evento) {
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

// =====================
// Inicialização global
// =====================
(async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return;
  }
  usuarioLogado = data.user;

  // tornar funções globais para onclick
  window.iniciarTransporteIda = iniciarTransporteIda;
  window.entregarLoja5 = entregarLoja5;
  window.iniciarTransporteVolta = iniciarTransporteVolta;
  window.entregarLojaOrigem = entregarLojaOrigem;
  window.finalizarRetrabalho = finalizarRetrabalho;

  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
