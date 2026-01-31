import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
export async function carregarPedidos() {
  await carregarAguardando();     // Ida
  await carregarEmTransporte();   // Ida e Volta
  await carregarRetorno();        // Volta e Retrabalho
}

// =====================
// AGUARDANDO COLETA (IDA)
// =====================
async function carregarAguardando() {
  const div = document.getElementById("aguardando");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando coleta")
    .order("criado_em", { ascending: false });

  if (error) {
    div.innerHTML = `<p>Erro ao carregar pedidos.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "ida")));
}

// =====================
// EM TRANSPORTE (IDA OU VOLTA)
// =====================
async function carregarEmTransporte() {
  const div = document.getElementById("transporte");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Em transporte para Loja 5", "Em transporte para loja de origem"]) // Incluindo os pedidos "Em transporte para loja de origem"
    .order("criado_em", { ascending: false });

  if (error) {
    div.innerHTML = "<p>Erro ao carregar pedidos.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido em transporte.</p>";
    return;
  }

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "emTransporte")));
}

// =====================
// AGUARDANDO RETORNO / RETRABALHO
// =====================
async function carregarRetorno() {
  const div = document.getElementById("retorno");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Aguardando retorno do transporte", "Retrabalho"])
    .order("criado_em", { ascending: false });

  if (error) {
    div.innerHTML = "<p>Erro ao carregar pedidos.</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido aguardando retorno.</p>";
    return;
  }

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "volta")));
}

// =====================
// Criar Card de Pedido
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  let obs = pedido.obs_loja_origem ? `<strong>Observação Loja de Origem:</strong><br><em>${pedido.obs_loja_origem}</em><br>` : "";
  let obsLoja5 = pedido.obs_loja5 ? `<strong>Observação Loja 5:</strong><br><em>${pedido.obs_loja5}</em><br>` : "";

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja:</strong> ${pedido.loja_origem}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    ${obs}
    ${obsLoja5}
    <span class="status-tag status-${statusClasse(pedido.status)}">${pedido.status}</span>
  `;

  const btn = document.createElement("button");

  // Botões de ação
  if (tipo === "ida") {
    btn.textContent = "Iniciar Transporte (Ida)";
    btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
  } else if (tipo === "emTransporte") {
    if (pedido.status === "Em transporte para Loja 5") {
      btn.textContent = "Entregar na Loja 5";
      btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja 5", "Entregue na Loja 5");
    } else if (pedido.status === "Em transporte para loja de origem") {
      btn.textContent = "Entregar na Loja de Origem";
      btn.onclick = () => atualizarStatus(pedido.id, "Recebido na loja de origem", "Entregue na loja de origem");
    }
  } else if (tipo === "volta") {
    btn.textContent = "Iniciar Transporte de Retorno";
    btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", "Transporte iniciado (volta)");
  }

  card.appendChild(btn);
  return card;
}

// =====================
// Atualizar status e registrar evento
// =====================
async function atualizarStatus(id, status, evento) {
  const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
  if (error) {
    console.error(error);
    alert("Erro ao atualizar status.");
    return;
  }

  await registrarEvento(id, evento);
  carregarPedidos(); // Atualiza a tela sem recarregar
}

// =====================
// Registrar evento
// =====================
async function registrarEvento(pedidoId, evento) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;

  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    criado_por: data.user.email,
    criado_em: new Date().toISOString()
  }]);
}

// =====================
// Mapear status para classe CSS
// =====================
function statusClasse(status) {
  if (status.includes("Aguardando")) return "Aguardando";
  if (status.includes("transporte")) return "Transporte";
  if (status.includes("Loja 5") || status.includes("Entregue")) return "Loja5";
  if (status.includes("Finalizado")) return "Finalizado";
  if (status.includes("Retrabalho")) return "Retrabalho";
  return "Aguardando";
}

// =====================
// Inicialização global
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  // Torna funções acessíveis globalmente
  window.carregarPedidos = carregarPedidos;
  window.atualizarStatus = atualizarStatus;

  // Atualiza a cada 5 segundos
  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
