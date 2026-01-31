import { supabase } from "./supabase.js";

let usuarioLogado = null;

export async function carregarPedidos() {
  await carregarAguardando();    
  await carregarEmTransporte();  
  await carregarRetorno();       
}

// =====================
// AGUARDANDO COLETA
// =====================
async function carregarAguardando() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando coleta")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("aguardando");
  div.innerHTML = "";

  if (error || !data.length) return div.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";

  data.forEach(p => div.appendChild(criarCard(p, "ida")));
}

// =====================
// EM TRANSPORTE
// =====================
async function carregarEmTransporte() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Em transporte para Loja 5", "Em transporte para loja de origem"])
    .order("criado_em", { ascending: false });

  const div = document.getElementById("transporte");
  div.innerHTML = "";

  if (error || !data.length) return div.innerHTML = "<p>Nenhum pedido em transporte.</p>";

  data.forEach(p => div.appendChild(criarCard(p, "emTransporte")));
}

// =====================
// AGUARDANDO RETORNO / RETRABALHO
// =====================
async function carregarRetorno() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Aguardando retorno do transporte", "Retrabalho"])
    .order("criado_em", { ascending: false });

  const div = document.getElementById("retorno");
  div.innerHTML = "";

  if (error || !data.length) return div.innerHTML = "<p>Nenhum pedido aguardando retorno ou retrabalho.</p>";

  data.forEach(p => div.appendChild(criarCard(p, "volta")));
}

// =====================
// Criar Card
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  // Badge de status
  let statusClass = "";
  if (pedido.status.includes("Aguardando")) statusClass = "status-Aguardando";
  else if (pedido.status.includes("Em transporte")) statusClass = "status-EmTransporte";
  else if (pedido.status.includes("Entregue") || pedido.status.includes("Recebido")) statusClass = "status-Finalizado";
  else if (pedido.status.includes("Retrabalho")) statusClass = "status-Retrabalho";

  // Timeline horizontal
  const timeline = `
    <div class="timeline">
      <div class="timeline-step ${pedido.status.includes("Aguardando") ? "step-Aguardando" : ""}">Aguardando</div>
      <div class="timeline-step ${pedido.status.includes("Em transporte") ? "step-Transporte" : ""}">Transporte</div>
      <div class="timeline-step ${pedido.status.includes("Entregue") || pedido.status.includes("Recebido") ? "step-Entregue" : ""}">Entregue</div>
      <div class="timeline-step ${pedido.status.includes("Retrabalho") ? "step-Retrabalho" : ""}">Retrabalho</div>
    </div>
  `;

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja:</strong> ${pedido.loja_origem}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <strong>Observação:</strong> <em>${pedido.obs_loja_origem || "—"}</em><br>
    <span class="status-badge ${statusClass}">${pedido.status}</span>
    ${timeline}<br>
  `;

  // Botões
  const btn = document.createElement("button");

  switch (tipo) {
    case "ida":
      btn.textContent = "Iniciar Transporte (Ida)";
      btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
      break;
    case "emTransporte":
      if (pedido.status === "Em transporte para Loja 5") {
        btn.textContent = "Entregar na Loja 5";
        btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja 5", "Pedido entregue na Loja 5");
      } else if (pedido.status === "Em transporte para loja de origem") {
        btn.textContent = "Entregar na Loja de Origem";
        btn.onclick = () => atualizarStatus(pedido.id, "Recebido na loja de origem", "Pedido entregue na Loja de Origem");
      }
      break;
    case "volta":
      if (pedido.status === "Aguardando retorno do transporte") {
        btn.textContent = "Iniciar Transporte de Retorno";
        btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", "Transporte de retorno iniciado");
      } else if (pedido.status === "Retrabalho") {
        btn.textContent = "Enviar para retrabalho";
        btn.onclick = () => atualizarStatus(pedido.id, "Retrabalho", "Pedido enviado para retrabalho");
      }
      break;
  }

  if (btn.textContent) card.appendChild(btn);
  return card;
}

// =====================
// Atualizar status e registrar evento
// =====================
async function atualizarStatus(id, status, evento) {
  const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
  if (error) return alert("Erro ao atualizar status do pedido");

  await registrarEvento(id, evento);
  carregarPedidos();
}

// =====================
// Registrar evento
// =====================
async function registrarEvento(pedidoId, evento) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return;

  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    criado_por: data.user.email,
    criado_em: new Date().toISOString()
  }]);
}

// =====================
// Inicialização
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  window.atualizarStatus = atualizarStatus;

  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
