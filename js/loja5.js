import { supabase } from "./supabase.js";

// Referência para o container onde os pedidos serão exibidos
const containerPedidos = document.getElementById("containerPedidos");

// Referência para a mensagem de sucesso
const successMessage = document.getElementById("successMessage");

// Referência para o indicador de carregamento
const loadingMessage = document.createElement('div');
loadingMessage.classList.add('loading-indicator');
loadingMessage.innerHTML = 'Carregando pedidos...';

// Variável para armazenar os pedidos carregados anteriormente
let pedidosAnteriores = [];

// =========================
// CARREGAR PEDIDOS AUTOMATICAMENTE
// =========================
async function carregarPedidos() {
  try {
    containerPedidos.innerHTML = ''; 
    containerPedidos.appendChild(loadingMessage);

    // Buscar pedidos com status "Entregue na Loja 5" OU "Entregue na Loja de Destino para retrabalho"
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .in("status", ["Entregue na Loja 5", "Entregue na Loja de Destino para retrabalho"]) 
      .order("criado_em", { ascending: false }); 

    if (error) throw error;

    containerPedidos.innerHTML = "";  

    if (!data.length) {
      containerPedidos.innerHTML = "<p class='loading'>Nenhum pedido encontrado na central.</p>";
      return;
    }

    data.forEach(pedido => {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedido.id);

      if (!pedidoAnterior || pedido.status !== pedidoAnterior.status || pedido.obs_loja5 !== pedidoAnterior.obs_loja5) {
        const card = criarCardPedido(pedido);
        containerPedidos.appendChild(card);
      }
    });

    pedidosAnteriores = data;

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    containerPedidos.innerHTML = `<p class="error">Erro ao carregar pedidos. Tente novamente.</p>`;
  }
}

// =========================
// CRIAR CARD DE PEDIDO (AÇÃO ÚNICA RAPIDINHA)
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `pedido-${pedido.id}`; 

  const statusClass = getStatusClass(pedido.status);
  const lojaOrigemLimpa = pedido.loja_origem ? pedido.loja_origem.trim() : "Não especificada";

  const podeFinalizar = 
    pedido.status === "Entregue na Loja 5" || 
    pedido.status === "Em transporte para loja de origem" || 
    pedido.status === "Entregue na Loja de Destino para retrabalho";

  // Vinculado estritamente às classes .btn-salvar e .btn-principal do novo arquivo HTML
  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Loja de Origem:</strong> ${lojaOrigemLimpa}<br>
    <strong>Loja de Destino:</strong> ${pedido.loja_destino || "Não especificada"}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico || "Não especificado"}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Observação:</strong><br>
    <em>${pedido.obs_loja_origem || "Nenhuma observação"}</em><br>

    <label style="margin-top: 8px; display: inline-block;" for="obs_loja5_${pedido.id}"><strong>Observação Loja 5:</strong></label><br>
    <textarea id="obs_loja5_${pedido.id}" placeholder="Digite uma observação técnica antes de finalizar..." ${pedido.status === "Finalizado" ? "disabled" : ""}>${pedido.obs_loja5 || ""}</textarea><br>

    ${pedido.status === "Em serviço" ? `<button class="btn-salvar" onclick="mudarStatusParaTransporte('${pedido.id}')">Mover para Transporte</button>` : ''}

    ${podeFinalizar && pedido.status !== "Finalizado" ? `<button class="btn-principal" onclick="mudarStatusParaFinalizado('${pedido.id}', '${pedido.status}', '${lojaOrigemLimpa}')">Finalizar Pedido</button>` : ''}
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

    await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento: evento,
      observacao: observacao, 
      criado_por: operador
    }]);
  } catch (err) {
    console.error("Erro ao registrar evento no banco:", err);
  }
}

// =========================
// MUDAR STATUS PARA 'AGUARDANDO COLETA PARA LOJA DE ORIGEM'
// =========================
window.mudarStatusParaFinalizado = async function(pedidoId, statusActual, lojaOrigem) {
  try {
    const proximoStatus = "Aguardando coleta para loja de Origem";
    const obsLoja5 = document.getElementById(`obs_loja5_${pedidoId}`).value;

    // Duas ações unificadas em uma única transação no Supabase: muda status e grava observações
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

    // REGRA MANDATÓRIA EXIGIDA: Formato exato do histórico do Log
    const textoEvento = `Serviço feito aguando coleta para : ${lojaOrigem}`;

    let detalheEvento = statusActual === "Entregue na Loja de Destino para retrabalho"
      ? `Serviço de retrabalho concluído pela Central.`
      : `Serviço original concluído pela Central.`;

    if (obsLoja5.trim()) {
      detalheEvento += ` Nota técnica: ${obsLoja5}`;
    }

    // Grava na timeline para manter o monitoramento de auditoria
    await registrarEvento(pedidoId, textoEvento, detalheEvento);

    if (successMessage) {
      successMessage.style.display = "block";
    }

    // Atualiza a tela localmente limpando o cache anterior para sumir com o card despachado
    setTimeout(() => {
      if (successMessage) successMessage.style.display = "none";
      pedidosAnteriores = []; 
      carregarPedidos(); 
    }, 1500); 

  } catch (err) {
    console.error("Erro inesperado ao finalizar fluxo:", err);
  }
}

// =========================
// MUDAR STATUS PARA 'EM TRANSPORTE PARA LOJA DE ORIGEM' (FALLBACK EM CASO DE ERROS)
// =========================
window.mudarStatusParaTransporte = async function(pedidoId) {
  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "Em transporte para loja de origem" })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao mudar status para 'Em transporte para loja de origem':", error);
      return;
    }

    await registrarEvento(pedidoId, "Movido para transporte manual na Central", "Pedido forçado manualmente para a fila de trânsito de retorno.");

    pedidosAnteriores = [];
    carregarPedidos();

  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

// =========================
// MAPEAMENTO DE STATUS PARA CLASSE CSS
// =========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  const st = status.trim();
  if (st === "Entregue na Loja 5" || st === "Entregue na Loja de Destino para retrabalho") return "status-Loja5";
  if (st === "Em serviço") return "status-Transporte";
  if (st === "Em transporte para loja de origem") return "status-Transporte-Volta";
  if (st === "Finalizado") return "status-Finalizado";
  if (st === "Retrabalho") return "status-Retrabalho";
  return "status-Aguardando";
}

// =========================
// INICIALIZAÇÃO AUTOMÁTICA
// =========================
carregarPedidos();

window.carregarPedidos = carregarPedidos;
