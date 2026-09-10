import { supabase } from "./supabase.js";

// Variável para armazenar o filtro de loja
let filtroAtivo = "Todas";

// =====================
// Inicialização
// =====================
export async function carregarPedidos(filtroLoja = "Todas") {
  filtroAtivo = filtroLoja;

  await carregarAguardando(filtroLoja);     // Ida
  await carregarEmTransporte(filtroLoja);   // Ida e Volta
  await carregarRetorno(filtroLoja);        // Volta e Retrabalho
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

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  div.innerHTML = "";
  for (const p of data) {
    const cardNode = await criarCard(p, "ida");
    div.appendChild(cardNode);
  }
}

// =====================
// EM TRANSPORTE (IDA OU VOLTA)
// =====================
async function carregarEmTransporte(filtroLoja) {
  const div = document.getElementById("transporte");
  if (!div) return;
  div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Carregando pedidos...</p>";

  let query = supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Em transporte para Loja 5", "Em transporte para loja de origem"])
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

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido em transporte.</p>";
    return;
  }

  div.innerHTML = "";
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
    .in("status", ["Aguardando retorno do transporte", "Retrabalho"])
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

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum pedido aguardando retorno.</p>";
    return;
  }

  div.innerHTML = "";
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

  // Carrega o histórico de eventos
  const { data: eventos } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedido.id)
    .order("criado_em", { ascending: true });

  let HTMLeventos = "";
  if (eventos && eventos.length > 0) {
    HTMLeventos = eventos.map(ev => {
      const dataFormatada = new Date(ev.criado_em).toLocaleString('pt-BR');
      return `<li style="margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed #f1f5f9;">• ${ev.evento} <span style="color: #64748b; font-size: 10px;">(${dataFormatada})</span></li>`;
    }).join('');
  } else {
    HTMLeventos = `<li><em style="color: #94a3b8; font-size: 11px;">Nenhum evento registrado.</em></li>`;
  }

  let obs = pedido.obs_loja_origem ? `<p style="margin: 3px 0;"><strong>Obs Origem:</strong> ${pedido.obs_loja_origem}</p>` : "";
  let obsLoja5 = pedido.obs_loja5 ? `<p style="margin: 3px 0;"><strong>Obs Central:</strong> ${pedido.obs_loja5}</p>` : "";

  card.innerHTML = `
    <div style="font-size: 13px; line-height: 1.4; color: #334155;">
      <p style="margin: 0 0 4px 0;"><strong>Loja de Origem:</strong> ${pedido.loja_origem || 'Não informada'}</p>
      <p style="margin: 0 0 4px 0;"><strong>Loja de Destino:</strong> ${pedido.loja_destino || 'Não informada'}</p>
      <p style="margin: 0 0 4px 0;"><strong>OS:</strong> <span style="font-size: 11px;">${pedido.id}</span></p>
      <p style="margin: 0 0 4px 0;"><strong>Serviço:</strong> ${pedido.tipo_servico || 'Geral'}</p>

      <div style="margin: 6px 0;">
        <span class="status-badge status-${statusClasse(pedido.status)}">${pedido.status}</span>
      </div>

      <p style="margin: 0 0 4px 0;"><strong>Orçamento:</strong> ${pedido.orcamento ? 'Sim' : 'Não'}</p>

      ${obs}
      ${obsLoja5}

      <!-- Caixa de eventos com rolagem para limitar a altura -->
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
        <strong style="font-size: 11px; color: #0f172a;">Eventos:</strong>
        <ul style="list-style: none; padding-left: 0; margin-top: 4px; font-size: 11px; max-height: 110px; overflow-y: auto;">
          ${HTMLeventos}
        </ul>
      </div>
    </div>
  `;

  // Botões de Ação
  const acaoContainer = document.createElement("div");
  acaoContainer.style.marginTop = "10px";

  const btn = document.createElement("button");
  btn.className = "btn-verde-dash";
  btn.style.height = "36px";
  btn.style.fontSize = "12px";
  btn.style.width = "100%";

  if (tipo === "ida") {
    btn.textContent = "Iniciar Transporte (Ida)";
    btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para Loja 5", "Transporte iniciado (ida)");
    acaoContainer.appendChild(btn);
  } else if (tipo === "emTransporte") {
    if (pedido.status === "Em transporte para Loja 5") {
      btn.textContent = "Entregar na Loja Central";
      btn.onclick = () => atualizarStatus(pedido.id, "Entregue na Loja 5", "Entregue na Loja 5");
      acaoContainer.appendChild(btn);
    } else if (pedido.status === "Em transporte para loja de origem") {
      btn.textContent = "Entregar na Loja de Origem";
      btn.onclick = () => atualizarStatus(pedido.id, "Recebido na loja de origem", "Entregue na loja de origem");
      acaoContainer.appendChild(btn);
    }
  } else if (tipo === "volta") {
    btn.textContent = "Iniciar Transporte de Retorno";
    btn.onclick = () => atualizarStatus(pedido.id, "Em transporte para loja de origem", "Transporte iniciado (volta)");
    acaoContainer.appendChild(btn);
  }

  if (acaoContainer.hasChildNodes()) {
    card.appendChild(acaoContainer);
  }

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
  carregarPedidos(filtroAtivo);
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
  if (!status) return "Aguardando";
  if (status.includes("Aguardando")) return "Aguardando";
  if (status.includes("transporte")) return "Transporte";
  if (status.includes("Loja 5") || status.includes("Entregue") || status.includes("Recebido")) return "Loja5";
  if (status.includes("Finalizado")) return "Finalizado";
  if (status.includes("Retrabalho")) return "Retrabalho";
  return "Aguardando";
}

// =====================
// Inicialização global
// =====================
(async () => {
  window.carregarPedidos = carregarPedidos;
  window.atualizarStatus = atualizarStatus;

  carregarPedidos(filtroAtivo);

  setInterval(() => carregarPedidos(filtroAtivo), 300000);
})();
