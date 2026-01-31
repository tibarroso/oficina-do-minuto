import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
export async function carregarPedidos() {
  await carregarAguardando();     // Ida
  await carregarEmTransporte();   // Ida e Volta
  await carregarRetorno();        // Volta
}

// =====================
// AGUARDANDO COLETA (IDA) — inclui orçamento
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
      .in("status", ["Aguardando retorno do transporte"])
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
// Criar Card de Pedido
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  let observacaoHTML = "";
  if (pedido.obs_loja_origem) {
    observacaoHTML = `<strong>Observação:</strong><br><em>${pedido.obs_loja_origem}</em><br><br>`;
  }

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja:</strong> ${pedido.loja_origem}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    ${observacaoHTML}
    <strong>Status:</strong> ${pedido.status}
  `;

  const btn = document.createElement("button");

  switch (tipo) {
    case "ida":
      btn.textContent = pedido.status === "Aguardando avaliação" 
        ? "Aguardar Avaliação"
        : "Iniciar Transporte (Ida)";
      btn.disabled = pedido.status === "Aguardando avaliação";
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
// Inicialização
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  // tornar funções acessíveis globalmente para onclick dos botões
  window.iniciarTransporteIda = iniciarTransporteIda;
  window.entregarLoja5 = entregarLoja5;
  window.iniciarTransporteVolta = iniciarTransporteVolta;
  window.entregarLojaOrigem = entregarLojaOrigem;

  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
