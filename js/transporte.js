import { supabase } from "./supabase.js";

let usuarioLogado = null;

// Enum de Status
const Status = {
  AGUARDANDO_COLETA: "Aguardando coleta",
  EM_TRANSPORTE_LOJA5: "Em transporte para Loja 5",
  EM_TRANSPORTE_ORIGEM: "Em transporte para loja de origem",
  AGUARDANDO_RETORNO: "Aguardando retorno do transporte",
  RETRABALHO: "Retrabalho",
  FINALIZADO: "Finalizado",
};

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
    .eq("status", Status.AGUARDANDO_COLETA)
    .order("criado_em", { ascending: false });

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido aguardando coleta.");

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "ida")));
}

// =====================
// EM TRANSPORTE (IDA OU VOLTA)
// =====================
async function carregarEmTransporte() {
  const div = document.getElementById("transporte");
  div.innerHTML = "<p>Carregando pedidos...</p>";

  const filtroLoja = document.getElementById("filtroLoja").value;
  
  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });
  
  // Filtro de status e loja
  if (filtroLoja !== "Todas") {
    query = query.eq("loja", filtroLoja);
  }
  
  query = query.in("status", [
    Status.EM_TRANSPORTE_LOJA5,
    Status.EM_TRANSPORTE_ORIGEM,
  ]);

  const { data, error } = await query;

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido em transporte.");

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
    .in("status", [Status.AGUARDANDO_RETORNO, Status.RETRABALHO])
    .order("criado_em", { ascending: false });

  if (error) return erro(div, error);
  if (!data?.length) return vazio(div, "Nenhum pedido aguardando retorno.");

  div.innerHTML = "";
  data.forEach(p => div.appendChild(criarCard(p, "volta")));
}

// =====================
// CRIAR CARD DE PEDIDO
// =====================
function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  const origem = pedido.loja;
  let destino = "-";

  // Definindo destinos
  if (pedido.status === Status.EM_TRANSPORTE_LOJA5) destino = "Loja 5";
  if (pedido.status === Status.EM_TRANSPORTE_ORIGEM) destino = origem;
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
      atualizarStatus(pedido.id, Status.EM_TRANSPORTE_LOJA5, "Transporte iniciado (ida)");
  }

  if (tipo === "emTransporte") {
    if (pedido.status === Status.EM_TRANSPORTE_LOJA5) {
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
        Status.EM_TRANSPORTE_ORIGEM,
        "Transporte iniciado (volta)"
      );
  }

  card.appendChild(btn);
  return card;
}

// =====================
// MAPEAR STATUS PARA CLASSE CSS
// =====================
function statusClasse(status) {
  switch (status) {
    case Status.AGUARDANDO_COLETA:
      return "Aguardando";
    case Status.EM_TRANSPORTE_LOJA5:
    case Status.EM_TRANSPORTE_ORIGEM:
      return "Transporte";
    case Status.FINALIZADO:
      return "Finalizado";
    case Status.RETRABALHO:
      return "Retrabalho";
    default:
      return "Aguardando";
  }
}

// =====================
// ATUALIZAR STATUS E REGISTRAR EVENTO
// =====================
async function atualizarStatus(id, status, evento) {
  const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
  if (error) return alert("Erro ao atualizar status.");

  await registrarEvento(id, evento);
  carregarPedidos();
}

// =====================
// REGISTRAR EVENTO
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
// MANIPULAR ERRO
// =====================
function erro(div, e) {
  console.error(e);
  div.innerHTML = "<p>Erro ao carregar pedidos.</p>";
}

function vazio(div, msg) {
  div.innerHTML = `<p>${msg}</p>`;
}

// =====================
// INICIALIZAÇÃO GLOBAL
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;

  carregarPedidos();
  setInterval(carregarPedidos, 5000); // Atualiza a cada 5 segundos
})();
