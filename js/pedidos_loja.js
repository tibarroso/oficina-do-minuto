import { supabase } from "./supabase.js";

// Configuração da URL da API (usando localhost para ambiente de desenvolvimento local)
const API_URL = 'http://localhost:3000';

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos(filtroStatus = "", filtroLoja = "") {
  try {
    // CORRIGIDO: Ordenação por data de criação decrescente (mais recentes primeiro)
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    // REGRA DE OURO DO FILTRO:
    if (filtroStatus && filtroStatus !== "Todos") {
      query = query.eq("status", filtroStatus.trim());
    } else {
      query = query.neq("status", "Finalizado");
    }

    // Aplicando filtro de loja (uso de aspas duplas para tratar nomes com espaços)
    if (filtroLoja && filtroLoja !== "Todas") {
      const lojaLimpa = filtroLoja.trim();
      query = query.or(`loja_origem.eq."${lojaLimpa}",loja_destino.eq."${lojaLimpa}"`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const pedidos = data || [];
    const container = document.getElementById("containerPedidos");
    if (!container) return;
    
    container.innerHTML = "";

    if (!pedidos.length) {
      container.innerHTML = "<p style='text-align: center; width: 100%; display: inline-block;'>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const card = criarCardPedido(pedido);
      container.appendChild(card);
      carregarTimeline(pedido.id, pedido.loja_origem);
    });
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    const container = document.getElementById("containerPedidos");
    if (container) {
      container.innerHTML = `<p style="color:red; text-align: center; width: 100%;">Erro ao carregar pedidos: ${err.message}</p>`;
    }
  }
}

// =========================
// CRIAR CARD DE PEDIDO
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-pedido-${pedido.id}`;

  const statusComparacao = pedido.status ? pedido.status.trim() : "";
  
  const podeInteragir = (
    statusComparacao === "Entregue na loja de origem" || 
    statusComparacao === "Recebido na loja de origem" || 
    statusComparacao === "Retrabalho" 
  );
  const classeStatus = getStatusClass(statusComparacao);

  card.innerHTML = `
    <strong>Loja de Origem:</strong> ${pedido.loja_origem || "Não especificada"}<br>
    <strong>Loja de Destino:</strong> ${pedido.loja_destino || "Não especificada"}<br>
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <strong>Status:</strong> <span class="status-badge ${classeStatus}" style="font-weight:600;">${pedido.status}</span><br>
    <strong>Orçamento:</strong> ${pedido.orcamento ? "Sim" : "Não"}<br>
    <strong>Observação:</strong><br>${pedido.obs_loja_origem || "Nenhuma"}<br>
    
    <div class="timeline" id="timeline-${pedido.id}" style="margin-top: 10px;">
      <strong>Eventos:</strong>
      <div id="timeline-content-${pedido.id}" style="margin-top: 5px;"></div>
    </div>
    
    ${podeInteragir ? `
    <div class="acoes-pedido" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn-finalizar" onclick="window.gerenciarCliqueFinalizar('${statusComparacao}', '${pedido.id}')" style="background-color: #18BC9C; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">Finalizado</button>
      <button class="btn-retrabalho" onclick="window.gerenciarCliqueRetrabalho('${statusComparacao}', '${pedido.id}')" style="background-color: #e74c3c; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">Retrabalho</button>
      
      ${statusComparacao === "Retrabalho" ? `
        <button class="btn-cancelar-retrabalho" onclick="window.cancelarRetrabalho('${pedido.id}')" style="background-color: #34495e; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">Cancelar Retrabalho</button>
      ` : ""}
    </div>` : ""}
  `;

  return card;
}

// Funções globais de interação nos cards
window.gerenciarCliqueFinalizar = function(statusAtual, id) {
  if (statusAtual === "Retrabalho") {
    alert("O pedido está em espera de transporte para retrabalho, não podendo ser finalizado!");
    return;
  }
  atualizarStatus("Finalizado", id);
};

window.gerenciarCliqueRetrabalho = function(statusAtual, id) {
  if (statusAtual === "Retrabalho") {
    alert("Este pedido já está registrado em estado de Retrabalho e aguarda o transporte!");
    return;
  }
  atualizarStatus("Retrabalho", id);
};

// =========================
// CANCELAR RETRABALHO
// =========================
async function cancelarRetrabalho(pedidoId) {
  try {
    if (!confirm("Deseja realmente cancelar o retrabalho deste pedido e voltar ao status anterior?")) {
      return;
    }

    const cardElement = document.getElementById(`card-pedido-${pedidoId}`);
    if (cardElement) cardElement.style.opacity = "0.5";

    const { data: eventos, error: errorEventos } = await supabase
      .from("pedido_eventos")
      .select("evento")
      .eq("pedido_id", pedidoId)
      .order("id", { ascending: false });

    if (errorEventos) throw errorEventos;

    let statusAnterior = "Entregue na loja de origem"; 
    
    if (eventos && eventos.length > 0) {
      const eventoValido = eventos.find(ev => ev.evento !== "Retrabalho");
      if (eventoValido) {
        statusAnterior = eventoValido.evento;
      }
    }

    const obsCancelamento = "Retrabalho cancelado. Retornado ao status anterior.";

    const { error: errorPedido } = await supabase
      .from("pedidos")
      .update({ status: statusAnterior, obs_loja_origem: obsCancelamento })
      .eq("id", pedidoId);

    if (errorPedido) throw errorPedido;

    const { data: userData } = await supabase.auth.getUser();
    const operador = userData?.user?.email || "Sistema / Loja";

    const { error: errorLog } = await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento: statusAnterior, 
      observacao: "Cancelamento de Retrabalho pelo operador.",
      criado_por: operador
    }]);

    if (errorLog) throw errorLog;

    alert(`Retrabalho cancelado! Pedido retornou para: "${statusAnterior}"`);

    const filtroStatus = document.getElementById("filtroStatus")?.value || "";
    const filtroLoja = document.getElementById("filtroLoja")?.value || "";
    
    carregarPedidos(filtroStatus, filtroLoja);

  } catch (err) {
    console.error("Erro ao cancelar retrabalho:", err);
    alert("Erro ao tentar cancelar o retrabalho. Verifique o console.");
    
    const cardElement = document.getElementById(`card-pedido-${pedidoId}`);
    if (cardElement) cardElement.style.opacity = "1";
  }
}
window.cancelarRetrabalho = cancelarRetrabalho;

// =========================
// ATUALIZAR STATUS
// =========================
async function atualizarStatus(novoStatus, pedidoId) {
  try {
    const statusLimpo = novoStatus.trim();
    let novaObservacao = statusLimpo === "Retrabalho" 
      ? "Serviço para ser refeito (Retrabalho)" 
      : "OS concluída e finalizada.";

    const { error: errorPedido } = await supabase
      .from("pedidos")
      .update({ status: statusLimpo, obs_loja_origem: novaObservacao })
      .eq("id", pedidoId);

    if (errorPedido) throw errorPedido;

    const { data: userData } = await supabase.auth.getUser();
    const operador = userData?.user?.email || "Sistema / Loja";

    const { error: errorEvento } = await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento: statusLimpo,                 
      observacao: novaObservacao,        
      criado_por: operador                
    }]);

    if (errorEvento) throw errorEvento;

    alert(`Status atualizado para "${statusLimpo}" com sucesso!`);

    const filtroStatus = document.getElementById("filtroStatus")?.value || "";
    const filtroLoja = document.getElementById("filtroLoja")?.value || "";
    carregarPedidos(filtroStatus, filtroLoja);

  } catch (err) {
    console.error(`Erro ao atualizar status do pedido ${pedidoId}:`, err);
    alert("Erro ao atualizar status do pedido. Veja o console.");
  }
}
window.atualizarStatus = atualizarStatus;

// =========================
// CARREGAR TIMELINE
// =========================
async function carregarTimeline(pedidoId, lojaOrigem) {
  try {
    const { data: eventos, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("id", { ascending: true });

    if (error) throw error;

    const contentDiv = document.getElementById(`timeline-content-${pedidoId}`);
    if (!contentDiv) return;

    contentDiv.innerHTML = ""; 

    if (!eventos || eventos.length === 0) {
      contentDiv.innerHTML = `<span style="color: #7f8c8d; font-style: italic; font-size: 13px;">Nenhum evento registrado.</span>`;
      return;
    }

    const nomeLoja = lojaOrigem ? lojaOrigem.trim() : "loja de origem";

    eventos.forEach(evento => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.style.fontSize = "13px";
      item.style.color = "#000";
      item.style.marginTop = "4px";
      
      const timestamp = evento.criado_em || evento.created_at;
      let dataFormatada = "Data pendente";

      if (timestamp) {
        const dataUtc = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
        dataFormatada = new Date(dataUtc).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo"
        });
      }
      
      let textoExibicao = evento.evento ? evento.evento.trim() : "";
      if (!textoExibicao.startsWith("Status alterado para")) {
        textoExibicao = `Status alterado para ${textoExibicao}`;
      }

      let detalhesObs = "";
      if (textoExibicao.includes("Entregue na loja de origem") || textoExibicao.includes("Recebido na loja de origem")) {
        detalhesObs = `<br><span style="color:#000; font-weight: 500; padding-left: 5px;">↳ Serviço já pode ser avaliado pela gerência da ${nomeLoja}. Caso esteja tudo certo, entre em contato com o cliente.</span>`;
      } else {
        detalhesObs = evento.observacao ? `<br><span style="color:#000;">↳ ${evento.observacao}</span>` : "";
      }

      item.innerHTML = `• ${textoExibicao} (${dataFormatada})${detalhesObs}`;
      contentDiv.appendChild(item);
    });
  } catch (err) {
    console.error(`Erro carregando timeline do pedido ${pedidoId}:`, err);
  }
}

// =========================
// MAPEAMENTO DE CLASSES STATUS
// =========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  const st = status.trim();
  if (st.includes("Loja 5") || st.includes("Central")) return "status-Loja5";
  if (st.includes("transporte") || st.includes("Transporte") || st.includes("serviço")) return "status-Transporte";
  if (st === "Finalizado") return "status-Finalizado";
  if (st === "Retrabalho") return "status-Retrabalho";
  if (st.includes("Aguardando") || st.includes("coleta")) return "status-Aguardando";
  return "status-Aguardando";
}

// =========================
// INICIALIZAÇÃO E EVENTOS
// =========================
document.addEventListener("DOMContentLoaded", () => {
  carregarPedidos();

  // Execução Modal Criar Pedido
  const executarCriacaoPedidoModal = async () => {
    const tipoServico = document.getElementById("tipo")?.value;
    const lojaOrigem = document.getElementById("lojaOrigem")?.value;
    const lojaDestino = document.getElementById("lojaDestino")?.value;
    const orcamento = document.getElementById("orcamento")?.checked || false;
    const observacao = document.getElementById("observacao")?.value.trim() || "";

    const { data: userData } = await supabase.auth.getUser();
    const operador = userData?.user?.email || "Sistema / Loja";

    if (!tipoServico || !lojaOrigem || !lojaDestino) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    try {
      const statusInicial = "Aguardando coleta";
      const obsInicial = observacao || "OS inicial aberta no sistema da loja.";

      const { data, error } = await supabase.from("pedidos").insert([{
        tipo_servico: tipoServico,
        loja_origem: lojaOrigem,
        loja_destino: lojaDestino,
        orcamento,
        obs_loja_origem: obsInicial,
        status: statusInicial
      }]).select();

      if (error) throw error;

      if (data && data.length > 0) {
        await supabase.from("pedido_eventos").insert([{
          pedido_id: data[0].id,
          evento: statusInicial,            
          observacao: obsInicial,            
          criado_por: operador              
        }]);
      }

      alert("Pedido criado com sucesso!");
      document.getElementById("formCriarPedidoModal")?.reset();
      
      if (typeof window.fecharModal === "function") {
        window.fecharModal();
      }
      
      carregarPedidos();
    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      alert("Erro ao criar pedido. Veja o console.");
    }
  };

  // Form 1 - Criar Pedido Normal
  const formCriarPedidoModal = document.getElementById("formCriarPedidoModal");
  if (formCriarPedidoModal) {
    formCriarPedidoModal.addEventListener("submit", (event) => {
      event.preventDefault();
      executarCriacaoPedidoModal();
    });
  }

  // Form 2 - Criar Pedido por Ticket
  const formCriarPedidoTicketModal = document.getElementById("formCriarPedidoTicketModal");
  if (formCriarPedidoTicketModal) {
    formCriarPedidoTicketModal.addEventListener("submit", async (event) => {
      event.preventDefault();

      const tipoServico = document.getElementById("tipoTicket")?.value;
      const lojaOrigem = document.getElementById("lojaOrigemTicket")?.value;
      const lojaDestino = document.getElementById("lojaDestinoTicket")?.value;
      const orcamento = document.getElementById("orcamentoTicket")?.checked || false;
      const observacaoTicket = document.getElementById("observacaoTicket")?.value.trim() || "";

      const { data: userData } = await supabase.auth.getUser();
      const operador = userData?.user?.email || "Sistema / Loja";

      if (!tipoServico || !lojaOrigem || !lojaDestino) {
        alert("Preencha todos os campos obrigatórios!");
        return;
      }

      try {
        const statusInicial = "Aguardando coleta";
        const obsInicial = observacaoTicket || "Pedido criado através do Ticket.";

        const { data, error } = await supabase.from("pedidos").insert([{
          tipo_servico: tipoServico,
          loja_origem: lojaOrigem,
          loja_destino: lojaDestino,
          orcamento: orcamento,
          obs_loja_origem: obsInicial,
          status: statusInicial
        }]).select();

        if (error) throw error;

        if (data && data.length > 0) {
          await supabase.from("pedido_eventos").insert([{
            pedido_id: data[0].id,
            evento: statusInicial,
            observacao: obsInicial,
            criado_por: operador
          }]);
        }

        alert("Pedido por Ticket criado e salvo com sucesso!");
        formCriarPedidoTicketModal.reset();
        
        if (typeof window.fecharModalTicket === "function") {
          window.fecharModalTicket();
        }

        carregarPedidos();
      } catch (err) {
        console.error("Erro ao criar pedido por ticket:", err);
        alert("Erro ao criar pedido por ticket. Veja o console.");
      }
    });
  }

  // Filtro de Pedidos
  document.getElementById("btnFiltrar")?.addEventListener("click", () => {
    const filtroStatus = document.getElementById("filtroStatus")?.value || "";
    const filtroLoja = document.getElementById("filtroLoja")?.value || "";
    carregarPedidos(filtroStatus, filtroLoja);
  });

  // Atualização automática em 30 segundos
  setInterval(() => {
    const elStatus = document.getElementById("filtroStatus");
    const elLoja = document.getElementById("filtroLoja");
    
    const filtroStatus = elStatus ? elStatus.value : "";
    const filtroLoja = elLoja ? elLoja.value : "";
    
    carregarPedidos(filtroStatus, filtroLoja);
  }, 30000); 
});
