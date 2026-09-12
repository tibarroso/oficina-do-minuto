import { supabase } from "./supabase.js";

// Variável para armazenar o filtro de loja ativo
let filtroAtivo = "Todas";

// TRAVA DE SEGURANÇA: Evita execuções simultâneas e duplicações ao apertar F5
let carregandoEmAndamento = false;

// =====================
// Inicialização Principal
// =====================
export async function carregarPedidos(filtroLoja = "Todas") {
  if (carregandoEmAndamento) return;
  carregandoEmAndamento = true;

  filtroAtivo = filtroLoja;

  try {
    await carregarAguardando(filtroLoja);      // Ida
    await carregarEmTransporte(filtroLoja);   // Ida, Volta e Retrabalho
    await carregarRetorno(filtroLoja);        // Volta e Retrabalho
  } finally {
    carregandoEmAndamento = false;
  }
}

// =====================
// AGUARDANDO COLETA (IDA)
// =====================
async function carregarAguardando(filtroLoja) {
  const div = document.getElementById("aguardando");
  if (!div) return;
  
  div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Carregando pedidos...</p>";

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando coleta")
    .order("criado_em", { ascending: false });

  if (filtroLoja !== "Todas") {
    query = query.eq("loja_origem", filtroLoja);
  }

  const { data, error } = await query;
  if (error) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Erro ao carregar pedidos.</p>";
    console.error(error);
    return;
  }

  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  for (const p of data) {
    const cardNode = await criarCard(p, "ida");
    div.appendChild(cardNode);
  }
}

// =====================
// EM TRANSPORTE (IDA, VOLTA OU RETRABALHO)
// =====================
async function carregarEmTransporte(filtroLoja) {
  const div = document.getElementById("transporte");
  if (!div) return;
  
  div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Carregando pedidos...</p>";

  let query = supabase
    .from("pedidos")
    .select("*")
    .in("status", [
      "Em transporte para Loja 5",
      "Em transporte para loja de origem",
      "Em transporte para loja de Destino para retrabalho"
    ])
    .order("criado_em", { ascending: false });

  if (filtroLoja !== "Todas") {
    query = query.eq("loja_origem", filtroLoja);
  }

  const { data, error } = await query;
  if (error) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Erro ao carregar pedidos.</p>";
    console.error(error);
    return;
  }

  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido em transporte.</p>";
    return;
  }

  for (const p of data) {
    const cardNode = await criarCard(p, "emTransporte");
    div.appendChild(cardNode);
  }
}

// =====================
// AGUARDANDO RETORNO / RETRABALHO
// =====================
async function carregarRetorno(filtroLoja) {
  const div = document.getElementById("retorno");
  if (!div) return;
  
  div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Carregando pedidos...</p>";

  let query = supabase
    .from("pedidos")
    .select("*")
    .in("status", [
      "Aguardando retorno do transporte",
      "Aguardando coleta para loja de Origem",
      "Aguardando coleta para loja de origem",
      "Retrabalho"
    ])
    .order("criado_em", { ascending: false });

  if (filtroLoja !== "Todas") {
    query = query.eq("loja_origem", filtroLoja);
  }

  const { data, error } = await query;
  if (error) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Erro ao carregar pedidos.</p>";
    console.error(error);
    return;
  }

  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido aguardando retorno.</p>";
    return;
  }

  for (const p of data) {
    const cardNode = await criarCard(p, "volta");
    div.appendChild(cardNode);
  }
}

// =====================
// Criar Card de Pedido Proporcional
// =====================
async function criarCard(pedido, tipo) {
  const card = document.createElement("div");
  card.classList.add("card");

  const statusComparacao = pedido.status ? pedido.status.trim() : "";

  const { data: eventos } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedido.id)
    .order("criado_em", { ascending: true });

  let HTMLeventos = "";
  if (eventos && eventos.length > 0) {
    const eventosUnicos = eventos.filter((ev, index, self) =>
      index === self.findIndex((t) => (
        t.evento === ev.evento && t.criado_em === ev.criado_em
      ))
    );

    HTMLeventos = eventosUnicos.map(ev => {
      const dataFormatada = new Date(ev.criado_em).toLocaleString('pt-BR');
      const obsTexto = ev.observacao ? ` - <em style="color: #475569;">${ev.observacao}</em>` : "";
      return `<li style="margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed #f1f5f9;">• <strong>${ev.evento}</strong>${obsTexto} <span style="color: #64748b; font-size: 10px;">(${dataFormatada})</span></li>`;
    }).join('');
  } else {
    HTMLeventos = `<li><em style="color: #94a3b8; font-size: 11px;">Nenhum evento registrado.</em></li>`;
  }

  let obs = pedido.obs_loja_origem ? `<p style="margin: 3px 0;"><strong>Obs Origem:</strong> ${pedido.obs_loja_origem}</p>` : "";
  let obsLoja5 = pedido.obs_loja5 ? `<p style="margin: 3px 0;"><strong>Obs Central:</strong> ${pedido.obs_loja5}</p>` : "";
  let lojaDestino = pedido.loja_destino ? `<p style="margin: 0 0 4px 0;"><strong>Loja de Destino:</strong> ${pedido.loja_destino}</p>` : "";

  card.innerHTML = `
    <div style="font-size: 13px; line-height: 1.4; color: #334155;">
      <p style="margin: 0 0 4px 0;"><strong>Loja de Origem:</strong> ${pedido.loja_origem || 'Não informada'}</p>
      ${lojaDestino}
      <p style="margin: 0 0 4px 0;"><strong>OS:</strong> <span style="font-size: 11px;">${pedido.id}</span></p>
      <p style="margin: 0 0 4px 0;"><strong>Serviço:</strong> ${pedido.tipo_servico || 'Geral'}</p>

      <div style="margin: 6px 0;">
        <span class="status-badge status-${statusClasse(statusComparacao)}">${pedido.status}</span>
      </div>

      <p style="margin: 0 0 4px 0;"><strong>Orçamento:</strong> ${pedido.orcamento ? 'Sim' : 'Não'}</p>

      ${obs}
      ${obsLoja5}

      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
        <strong style="font-size: 11px; color: #0f172a;">Histórico de Eventos:</strong>
        <ul style="list-style: none; padding-left: 0; margin-top: 4px; font-size: 11px; max-height: 110px; overflow-y: auto;">
          ${HTMLeventos}
        </ul>
      </div>
    </div>
  `;

  const acaoContainer = document.createElement("div");
  acaoContainer.style.marginTop = "10px";

  const btn = document.createElement("button");
  btn.className = "btn-verde-dash";
  btn.style.height = "36px";
  btn.style.fontSize = "12px";
  btn.style.width = "100%";
  btn.style.cursor = "pointer";

  const observacaoAtualDoPedido = pedido.obs_loja_origem || "";

  if (tipo === "ida") {
    btn.textContent = "Iniciar Transporte (Ida)";
    btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para Loja 5", observacaoAtualDoPedido);
    acaoContainer.appendChild(btn);
  } else if (tipo === "emTransporte") {
    if (statusComparacao === "Em transporte para Loja 5") {
      btn.textContent = "Entregar na Loja Central (Loja 5)";
      btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja 5", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    } else if (statusComparacao === "Em transporte para loja de origem") {
      btn.textContent = "Entregar na Loja de Origem";
      btn.onclick = () => atualizarStatus(pedido.id, "Recebido na loja de origem", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    } else if (statusComparacao === "Em transporte para loja de Destino para retrabalho") {
      btn.textContent = "Entregar na Loja de Destino";
      btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja de Destino para retrabalho", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    }
  } else if (tipo === "volta") {
    if (statusComparacao === "Retrabalho") {
      btn.textContent = "Iniciar Transporte de Retrabalho";
      btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de Destino para retrabalho", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    } else if (statusComparacao === "Aguardando coleta para loja de Origem" || statusComparacao === "Aguardando coleta para loja de origem") {
      btn.textContent = "Iniciar Transporte de Retorno (Retrabalho)";
      btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    } else if (statusComparacao === "Aguardando retorno do transporte") {
      btn.textContent = "Iniciar Transporte de Retorno";
      btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", observacaoAtualDoPedido);
      acaoContainer.appendChild(btn);
    }
  }

  if (acaoContainer.hasChildNodes()) {
    card.appendChild(acaoContainer);
  }

  return card;
}

// =====================
// Atualizar status e registrar evento
// =====================
async function atualizarStatus(id, novoStatus, observacaoDoPedido = "") {
  const { error } = await supabase.from("pedidos").update({ status: novoStatus }).eq("id", id);
  if (error) {
    console.error(error);
    alert("Erro ao atualizar status.");
    return;
  }

  await registrarEvento(id, novoStatus, observacaoDoPedido);
  carregarPedidos(filtroAtivo);
}

// =====================
// Registrar Logs na Tabela de Eventos
// =====================
async function registrarEvento(pedidoId, statusComoEvento, observacaoTabelaPedidos = "") {
  try {
    const { data } = await supabase.auth.getUser();
    const operador = data?.user?.email || "Motorista / Logística";

    await supabase.from("pedido_eventos").insert([{
      pedido_id: pedidoId,
      evento: statusComoEvento,
      observacao: observacaoTabelaPedidos,
      criado_por: operador,
      criado_em: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Erro ao registrar evento de logística:", err);
  }
}

// =====================
// Mapear status para classe CSS
// =====================
function statusClasse(status) {
  if (!status) return "Aguardando";
  if (status.includes("Aguardando") || status.includes("coleta")) return "Aguardando";
  if (status.includes("transporte") || status.includes("Transporte")) return "Transporte";
  if (status.includes("Loja 5") || status.includes("Entregue") || status.includes("Recebido")) return "Loja5";
  if (status.includes("Finalizado")) return "Finalizado";
  if (status.includes("Retrabalho")) return "Retrabalho";
  return "Aguardando";
}

// Exposição global opcional para escopos window
window.carregarPedidos = carregarPedidos;
window.atualizarStatus = atualizarStatus;
