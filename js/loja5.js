import { supabase } from "./supabase.js";

// Referências aos elementos do DOM
const containerPedidos = document.getElementById("containerPedidos");
const successMessage = document.getElementById("successMessage");

// Indicator de carregamento
const loadingMessage = document.createElement("div");
loadingMessage.classList.add("loading");
loadingMessage.innerHTML = "Buscando ordens de serviço ativas na central...";

// =========================
// CARREGAR PEDIDOS AUTOMATICAMENTE
// =========================
export async function carregarPedidos() {
  if (!containerPedidos) return;

  try {
    containerPedidos.innerHTML = "";
    containerPedidos.appendChild(loadingMessage);

    // Consulta no Supabase incluindo os status correspondentes à Loja 5
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", [
        "Entregue na Loja 5",
        "Entregue na Loja de Destino para retrabalho",
        "Em serviço"
      ])
      .order("id", { ascending: false });

    if (error) throw error;

    containerPedidos.innerHTML = "";

    // Se nenhum registro for retornado
    if (!data || data.length === 0) {
      containerPedidos.innerHTML =
        '<p class="loading">Nenhum pedido em processamento encontrado na central.</p>';
      return;
    }

    // Renderiza cada card diretamente
    data.forEach((pedido) => {
      const card = criarCardPedido(pedido);
      containerPedidos.appendChild(card);
    });

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    if (containerPedidos) {
      containerPedidos.innerHTML = `<p class="loading" style="color: #ef4444;">Erro ao carregar pedidos: ${err.message}</p>`;
    }
  }
}

// =========================
// CRIAR CARD DE PEDIDO (DESIGN COMPATÍVEL COM CSS NOVO)
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `pedido-${pedido.id}`;

  const statusClass = getStatusClass(pedido.status);
  const lojaOrigemLimpa = pedido.loja_origem
    ? pedido.loja_origem.trim()
    : "Não especificada";

  const podeFinalizar =
    pedido.status === "Entregue na Loja 5" ||
    pedido.status === "Em transporte para loja de origem" ||
    pedido.status === "Entregue na Loja de Destino para retrabalho" ||
    pedido.status === "Em serviço";

  card.innerHTML = `
    <div>
      <strong>Ordem de Serviço</strong>
      <p style="font-size: 18px; font-weight: 800; color: var(--primary-blue);">#OS-${pedido.id}</p>
    </div>

    <div>
      <strong>Loja Origem / Destino</strong>
      <p style="font-size: 14px; font-weight: 600;">${lojaOrigemLimpa} → ${pedido.loja_destino || "Não especificada"}</p>
    </div>

    <div>
      <strong>Serviço</strong>
      <p style="font-size: 14px; color: var(--text-main);">${pedido.tipo_servico || "Não especificado"}</p>
    </div>

    <div>
      <strong>Status Atual</strong><br>
      <span class="status-tag ${statusClass}" style="margin-top: 4px;">${pedido.status}</span>
    </div>

    <div>
      <strong>Observação da Origem</strong>
      <em>${pedido.obs_loja_origem || "Nenhuma observação registrada."}</em>
    </div>

    <div>
      <strong>Observação Loja 5</strong>
      <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma nota técnica antes de finalizar..." ${pedido.status === "Finalizado" ? "disabled" : ""}>${pedido.obs_loja5 || ""}</textarea>
    </div>

    ${pedido.status === "Em serviço" ? `<button class="btn-salvar" onclick="mudarStatusParaTransporte('${pedido.id}')">Mover para Transporte</button>` : ""}

    ${podeFinalizar && pedido.status !== "Finalizado" ? `<button class="btn-principal" onclick="mudarStatusParaFinalizado('${pedido.id}', '${pedido.status}', '${lojaOrigemLimpa}')">Finalizar Pedido</button>` : ""}
  `;

  return card;
}

// =========================
// REGISTRAR LOGS NA TABELA DE EVENTOS
// =========================
async function registrarEvento(pedidoId, evento, observacao = "") {
  try {
    const { data } = await supabase.auth.getUser();
    const operador = data?.user?.email || "loja5@minuto.com";

    await supabase.from("pedido_eventos").insert([
      {
        pedido_id: pedidoId,
        evento: evento,
        observacao: observacao,
        criado_por: operador
      }
    ]);
  } catch (err) {
    console.error("Erro ao registrar evento no banco:", err);
  }
}

// =========================
// MUDAR STATUS PARA 'AGUARDANDO COLETA PARA LOJA DE ORIGEM'
// =========================
window.mudarStatusParaFinalizado = async function (pedidoId, statusActual, lojaOrigem) {
  try {
    const proximoStatus = "Aguardando coleta para loja de Origem";
    const elObs = document.getElementById(`obs_loja5_${pedidoId}`);
    const obsLoja5 = elObs ? elObs.value : "";

    const { error } = await supabase
      .from("pedidos")
      .update({
        status: proximoStatus,
        obs_loja_origem: "Serviço Pronto na Central. Aguardando retirada.",
        obs_loja5: obsLoja5
      })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar dados do pedido finalizado:", error);
      alert("Erro ao salvar dados no banco de dados.");
      return;
    }

    const textoEvento = `Serviço feito aguardando coleta para: ${lojaOrigem}`;

    let detalheEvento =
      statusActual === "Entregue na Loja de Destino para retrabalho"
        ? "Serviço de retrabalho concluído pela Central."
        : "Serviço original concluído pela Central.";

    if (obsLoja5.trim()) {
      detalheEvento += ` Nota técnica: ${obsLoja5}`;
    }

    await registrarEvento(pedidoId, textoEvento, detalheEvento);

    if (successMessage) {
      successMessage.style.display = "block";
    }

    setTimeout(() => {
      if (successMessage) successMessage.style.display = "none";
      carregarPedidos();
    }, 1500);
  } catch (err) {
    console.error("Erro inesperado ao finalizar fluxo:", err);
  }
};

// =========================
// MUDAR STATUS PARA 'EM TRANSPORTE PARA LOJA DE ORIGEM'
// =========================
window.mudarStatusParaTransporte = async function (pedidoId) {
  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "Em transporte para loja de origem" })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao mudar status para 'Em transporte para loja de origem':", error);
      return;
    }

    await registrarEvento(
      pedidoId,
      "Movido para transporte manual na Central",
      "Pedido forçado manualmente para a fila de trânsito de retorno."
    );

    carregarPedidos();
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
};

// =========================
// MAPEAMENTO DE STATUS PARA CLASSE CSS
// =========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  const st = status.trim();
  if (
    st === "Entregue na Loja 5" ||
    st === "Entregue na Loja de Destino para retrabalho"
  )
    return "status-Loja5";
  if (st === "Em serviço") return "status-Transporte";
  if (st === "Em transporte para loja de origem") return "status-Transporte";
  if (st === "Finalizado") return "status-Finalizado";
  if (st === "Retrabalho") return "status-Retrabalho";
  return "status-Aguardando";
}

// =========================
// INICIALIZAÇÃO IMEDIATA E ROBUSTA
// =========================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", carregarPedidos);
} else {
  carregarPedidos();
}

window.carregarPedidos = carregarPedidos;
