import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
export async function carregarPedidos() {
  await carregarAguardando();
  await carregarEmTransporte();
  await carregarRetorno();
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

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido aguardando coleta.");

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "ida")));
}

// =====================
// EM TRANSPORTE
// =====================
async function carregarEmTransporte() {
  const div = document.getElementById("transporte");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", [
      "Em transporte para Loja 5",
      "Em transporte para loja de origem"
    ])
    .order("criado_em", { ascending: false });

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido em transporte.");

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "emTransporte")));
}

// =====================
// RETORNO / RETRABALHO
// =====================
async function carregarRetorno() {
  const div = document.getElementById("retorno");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Aguardando retorno do transporte", "Retrabalho"])
    .order("criado_em", { ascending: false });

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido aguardando retorno.");

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "volta")));
}

// =====================
// CARD
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  const origem = pedido.loja;
  let destino = "-";

  if (pedido.status === "Em transporte para Loja 5") destino = "Loja 5";
  if (pedido.status === "Em transporte para loja de origem") destino = origem;
  if (tipo === "ida") destino = "Loja 5";

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Origem:</strong> ${origem}<br>
    <strong>Destino:</strong> ${destino}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    ${pedido.obs_loja_origem ? `<em>${pedido.obs_loja_origem}</em><br>` : ""}
    <span class="status-tag status-${statusClasse(pedido.status)}">
      ${pedido.status}
    </span>
  `;

  const btn = document.createElement("button");

  if (tipo === "ida") {
    btn.textContent = "Iniciar Transporte (Ida)";
    btn.onclick = () =>
      atualizarStatus(pedido.id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
  }

  if (tipo === "emTransporte") {
    if (pedido.status === "Em transporte para Loja 5") {
      btn.textContent = "Entregar na Loja 5";
      btn.onclick = () =>
        atualizarStatus(pedido.id, "Entregue na Loja 5", "Entregue na Loja 5");
    } else {
      btn.textContent = "Entregar na Loja de Origem";
      btn.onclick = () =>
        atualizarStatus(
          pedido.id,
          "Recebido na loja de origem",
          "Entregue na loja de origem"
        );
    }
  }

  if (tipo === "volta") {
    btn.textContent = "Iniciar Transporte de Retorno";
    btn.onclick = () =>
      atualizarStatus(
        pedido.id,
        "Em transporte para loja de origem",
        "Transporte iniciado (volta)"
      );
  }

  card.appendChild(btn);
  return card;
}

// =====================
// STATUS
// =====================
function statusClasse(status) {
  if (status.includes("Aguardando")) return "Aguardando";
  if (status.includes("transporte")) return "Transporte";
  if (status.includes("Loja 5") || status.includes("Entregue")) return "Loja5";
  if (status.includes("Retrabalho")) return "Retrabalho";
  if (status.includes("Finalizado")) return "Finalizado";
  return "Aguardando";
}

// =====================
// UPDATE
// =====================
async function atualizarStatus(id, status, evento) {
  const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
  if (error) return alert("Erro ao atualizar status.");

  await registrarEvento(id, evento);
  carregarPedidos();
}

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
function erro(div, e) {
  console.error(e);
  div.innerHTML = "<p>Erro ao carregar pedidos.</p>";
}

function vazio(div, msg) {
  div.innerHTML = `<p>${msg}</p>`;
}

// =====================
// BOOT
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  carregarPedidos();
  setInterval(carregarPedidos, 5000);
})();
