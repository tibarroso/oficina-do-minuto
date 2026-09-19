import { supabase } from "./supabase.js";

// Referências aos elementos do DOM
const containerPedidos = document.getElementById("containerPedidos");
const successMessage = document.getElementById("successMessage");

// Indicador de carregamento
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

    // Consulta flexível com ILIKE incluindo entregas para retrabalho
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .or(
        "status.ilike.%Entregue na Loja 5%," +
        "status.ilike.%Entregue na Loja de Destino para retrabalho%," +
        "status.ilike.%Em serviço%"
      )
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
// CRIAR CARD DE PEDIDO
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `pedido-${pedido.id}`;

  const statusClass = getStatusClass(pedido.status);
  const lojaOrigemLimpa = pedido.loja_origem
    ? pedido.loja_origem.trim()
    : "Não especificada";

  // Define a loja de origem para onde o pedido retornará
  const lojaOrigemFinal = lojaOrigemLimpa;

  const statusNormalizado = (pedido.status || "").toLowerCase();

  // CONDIÇÕES DOS BOTÕES:
  // 1. "Executar serviço": aparece quando estiver entregue na Loja 5 ou entregue na Loja de Destino para retrabalho
  const podeExecutarServico = 
    statusNormalizado.includes("entregue na loja 5") || 
    statusNormalizado.includes("entregue na loja de destino para retrabalho") ||
    statusNormalizado.includes("retrabalho");

  // 2. "Finalizar Pedido": só aparece quando o status for exatamente "Em serviço"
  const podeFinalizar = statusNormalizado.includes("em serviço");

  card.innerHTML = `
    <div>
      <strong>Ordem de Serviço</strong>
      <p style="font-size: 18px; font-weight: 800; color: var(--primary-blue, #0b53a7);">#OS-${pedido.id}</p>
    </div>

    <div>
      <strong>Loja Origem / Destino</strong>
      <p style="font-size: 14px; font-weight: 600;">${lojaOrigemLimpa} → ${pedido.loja_destino || "Não especificada"}</p>
    </div>

    <div>
      <strong>Serviço</strong>
      <p style="font-size: 14px; color: var(--text-main, #1e293b);">${pedido.tipo_servico || "Não especificado"}</p>
    </div>

    <div>
      <strong>Status Atual</strong><br>
      <span class="status-tag ${statusClass}" style="margin-top: 4px;">${pedido.status}</span>
    </div>

    <div>
      <strong>Observação da Origem</strong>
      <br><em>${pedido.obs_loja_origem || "Nenhuma observação registrada."}</em>
    </div>

    <div>
      <strong>Observação Loja 5</strong>
      <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma nota técnica..." ${statusNormalizado.includes("finalizado") ? "disabled" : ""}>${pedido.obs_loja5 || ""}</textarea>
    </div>

    ${podeExecutarServico ? `<button class="btn-principal" style="background-color: #f39c12; color: #fff; font-weight: 600; padding: 10px; border: none; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 8px;" onclick="executarServico('${pedido.id}')">Executar serviço</button>` : ""}

    ${podeFinalizar ? `<button class="btn-principal" style="background-color: #18BC9C; color: #fff; font-weight: 600; padding: 10px; border: none; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 8px;" onclick="mudarStatusParaFinalizado('${pedido.id}', '${pedido.status}', '${lojaOrigemFinal}')">Finalizar Pedido</button>` : ""}
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
        criado_por: operador,
        criado_em: new Date().toISOString()
      }
    ]);
  } catch (err) {
    console.error("Erro ao registrar evento no banco:", err);
  }
}

// =========================
// MUDAR STATUS PARA 'EM SERVIÇO'
// =========================
window.executarServico = async function (pedidoId) {
  try {
    const elObs = document.getElementById(`obs_loja5_${pedidoId}`);
    const obsLoja5 = elObs ? elObs.value : "";

    const { error } = await supabase
      .from("pedidos")
      .update({
        status: "Em serviço",
        obs_loja5: obsLoja5
      })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao alterar para 'Em serviço':", error);
      alert("Erro ao alterar o status no banco de dados.");
      return;
    }

    await registrarEvento(
      pedidoId,
      "Serviço Iniciado na Central",
      `O pedido entrou em execução na bancada da Loja 5.${obsLoja5 ? ' Nota técnica: ' + obsLoja5 : ''}`
    );

    carregarPedidos();
  } catch (err) {
    console.error("Erro inesperado ao iniciar serviço:", err);
  }
};

// =========================
// MUDAR STATUS PARA 'AGUARDANDO COLETA PARA LOJA DE ORIGEM' (FINALIZAR)
// =========================
window.mudarStatusParaFinalizado = async function (pedidoId, statusActual, lojaOrigem) {
  try {
    const proximoStatus = "Aguardando coleta para loja de Origem";
    const elObs = document.getElementById(`obs_loja5_${pedidoId}`);
    const obsLoja5 = elObs ? elObs.value : "";

    // Atualiza status e observação da Loja 5 sem alterar campos da origem
    const { error } = await supabase
      .from("pedidos")
      .update({
        status: proximoStatus,
        obs_loja5: obsLoja5
      })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao atualizar dados do pedido finalizado:", error);
      alert("Erro ao salvar dados no banco de dados.");
      return;
    }

    // Registra a mensagem referenciando a Loja de Origem
    const textoEvento = `Serviço Pronto na Central. Aguardando coleta para: ${lojaOrigem}`;

    let detalheEvento = (statusActual || "").toLowerCase().includes("retrabalho")
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
  const st = status.toLowerCase();
  if (st.includes("loja 5") || st.includes("retrabalho")) return "status-Loja5";
  if (st.includes("serviço") || st.includes("transporte")) return "status-Transporte";
  if (st.includes("finalizado")) return "status-Finalizado";
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
