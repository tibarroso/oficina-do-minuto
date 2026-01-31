// transporte.js
import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
export async function carregarPedidos() {
  await carregarAguardando();     // Ida
  await carregarEmTransporte();   // Ida e Volta
  await carregarRetorno();        // Volta e retrabalho
}

// =====================
// AGUARDANDO COLETA (IDA)
// =====================
async function carregarAguardando() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Aguardando coleta")
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
      .in("status", ["Em transporte para Loja 5", "Em transporte para loja de origem"])
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
// AGUARDANDO RETORNO / RETRABALHO (VOLTA)
// =====================
async function carregarRetorno() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Aguardando retorno do transporte", "Retrabalho"])
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const div = document.getElementById("retorno");
    div.innerHTML = "";

    if (!data || data.length === 0) {
      div.innerHTML = "<p>Nenhum pedido aguardando retorno ou retrabalho.</p>";
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

  // Timeline simples
  const timeline = `
    <div class="timeline">
      <div class="timeline-step ${pedido.status.includes("Aguardando") ? "step-Aguardando" : ""}">Aguardando</div>
      <div class="timeline-step ${pedido.status.includes("Em transporte") ? "step-Entregue" : ""}">Transporte</div>
      <div class="timeline-step ${pedido.status.includes("Entregue") || pedido.status.includes("Recebido") ? "step-Finalizado" : ""}">Finalizado</div>
      <div class="timeline-step ${pedido.status.includes("Retrabalho") ? "step-Aguardando" : ""}">Retrabalho</div>
    </div>
  `;

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja:</strong> ${pedido.loja_origem}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <strong>Status:</strong> ${pedido.status}<br>
    <strong>Observação:</strong> <em>${pedido.obs_loja_origem || "—"}</em><br>
    ${timeline}<br>
  `;

  // Botões
  const btn = document.createElement("button");

  switch (tipo) {
    case "ida":
      btn.textContent = "Iniciar Transporte (Ida)";
      btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
      card.appendChild(btn);
      break;
    case "emTransporte":
      if (pedido.status === "Em transporte para Loja 5") {
        btn.textContent = "Entregar na Loja 5";
        btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja 5", "Pedido entregue na Loja 5");
      } else if (pedido.status === "Em transporte para loja de origem") {
        btn.textContent = "Entregar na Loja de Origem";
        btn.onclick = () => atualizarStatus(pedido.id, "Recebido na loja de origem", "Pedido entregue na Loja de Origem");
      }
      card.appendChild(btn);
      break;
    case "volta":
      if (pedido.status === "Aguardando retorno do transporte") {
        btn.textContent = "Iniciar Transporte de Retorno";
        btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", "Transporte de retorno iniciado");
        card.appendChild(btn);
      } else if (pedido.status === "Retrabalho") {
        btn.textContent = "Enviar para retrabalho";
        btn.onclick = () => atualizarStatus(pedido.id, "Retrabalho", "Pedido enviado para retrabalho");
        card.appendChild(btn);
      }
      break;
  }

  return card;
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

  // Tornar funções globais para onclick
  window.atualizarStatus = atualizarStatus;

  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
