import { supabase } from "./supabase.js";

// ===============================
// Elementos do DOM
// ===============================
const tipoInput = document.getElementById("tipo");
const lojaOrigemInput = document.getElementById("lojaOrigem");
const lojaDestinoInput = document.getElementById("lojaDestino");
const orcamentoInput = document.getElementById("orcamento");
const observacaoInput = document.getElementById("observacao");
const btnCriarPedido = document.getElementById("btnCriarPedido");

const formTicketModal = document.getElementById("formCriarPedidoTicketModal");

// Tabela ou container onde os pedidos devem ser listados
const tabelaPedidos = document.getElementById("tabelaPedidos") || document.getElementById("listaPedidos");

let usuarioLogado = null;
let pedidoAtualId = null;

// ===============================
// Verificar Login
// ===============================
async function verificarLogin() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      alert("Usuário não logado!");
      window.location.href = "login.html";
      return null;
    }
    return data.user;
  } catch (err) {
    console.error("Erro ao verificar autenticação:", err);
    window.location.href = "login.html";
    return null;
  }
}

// ===============================
// Listar e Renderizar Pedidos na Tela
// ===============================
async function carregarPedidos() {
  if (!tabelaPedidos) return;

  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!pedidos || pedidos.length === 0) {
      tabelaPedidos.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum pedido encontrado.</td></tr>`;
      return;
    }

    tabelaPedidos.innerHTML = pedidos.map(p => `
      <tr>
        <td><b>#${p.id}</b></td>
        <td>${p.loja_origem || '-'}</td>
        <td>${p.loja_destino || '-'}</td>
        <td>${p.tipo_servico || '-'}</td>
        <td><span class="badge ${p.status === 'Aguardando coleta' ? 'bg-warning' : 'bg-info'}">${p.status || 'Pendente'}</span></td>
        <td>${p.obs_loja_origem || '-'}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Erro ao carregar lista de pedidos:", err);
  }
}

// ===============================
// Registrar Evento na Timeline
// ===============================
async function registrarEvento(pedidoId, evento, observacao = "") {
  if (!usuarioLogado) return;

  try {
    const { error } = await supabase
      .from("pedido_eventos")
      .insert([{
        pedido_id: pedidoId,
        evento: evento,
        observacao: observacao,
        criado_por: usuarioLogado.email || "Sistema / Loja",
        criado_em: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao registrar evento no histórico:", err);
  }
}

// ===============================
// Criar Pedido (Formulário do Modal Normal)
// ===============================
btnCriarPedido?.addEventListener("click", async (e) => {
  e.preventDefault();

  if (!usuarioLogado) {
    alert("Usuário não logado!");
    return;
  }

  const tipo = tipoInput ? tipoInput.value.trim() : "";
  const lojaOrigem = lojaOrigemInput ? lojaOrigemInput.value.trim() : "";
  const lojaDestino = lojaDestinoInput ? lojaDestinoInput.value.trim() : "";
  const orcamento = orcamentoInput ? orcamentoInput.checked : false;
  const observacao = observacaoInput ? observacaoInput.value.trim() : "";

  if (!tipo || !lojaOrigem || !lojaDestino) {
    alert("Por favor, preencha todos os campos obrigatórios (Serviço, Loja de Origem e Loja de Destino).");
    return;
  }

  if (lojaOrigem === lojaDestino) {
    alert("A loja de origem não pode ser igual à loja de destino.");
    return;
  }

  const statusInicial = "Aguardando coleta";
  const obsInicial = observacao || `Serviço solicitado: ${tipo}`;

  try {
    if (btnCriarPedido) btnCriarPedido.disabled = true;

    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaOrigem,
        loja_destino: lojaDestino,
        tipo_servico: tipo,
        orcamento: orcamento,
        status: statusInicial,
        obs_loja_origem: obsInicial
      }])
      .select()
      .single();

    if (error) throw error;

    pedidoAtualId = data.id;

    await registrarEvento(pedidoAtualId, statusInicial, obsInicial);

    alert(`Pedido criado com sucesso!\nOS Nº: ${pedidoAtualId}`);

    // Limpar formulário
    if (tipoInput) tipoInput.value = "";
    if (lojaOrigemInput) lojaOrigemInput.value = "";
    if (lojaDestinoInput) lojaDestinoInput.value = "";
    if (orcamentoInput) orcamentoInput.checked = false;
    if (observacaoInput) observacaoInput.value = "";

    // Fecha o modal caso a função exista na janela
    if (typeof window.fecharModal === 'function') window.fecharModal();

    // Atualiza os registros na tela
    await carregarPedidos();

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert(`Erro ao criar pedido: ${err.message || "Verifique o console para mais detalhes."}`);
  } finally {
    if (btnCriarPedido) btnCriarPedido.disabled = false;
  }
});

// ===============================
// Criar Pedido (Formulário por Ticket)
// ===============================
formTicketModal?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!usuarioLogado) {
    alert("Usuário não logado!");
    return;
  }

  const lojaOrigem = document.getElementById("lojaOrigemTicket")?.value;
  const lojaDestino = document.getElementById("lojaDestinoTicket")?.value;
  const tipo = document.getElementById("tipoTicket")?.value;
  const orcamento = document.getElementById("orcamentoTicket")?.checked || false;
  const observacao = document.getElementById("observacaoTicket")?.value;

  if (!lojaOrigem || !lojaDestino || !tipo) {
    alert("Preencha todos os campos obrigatórios do Ticket.");
    return;
  }

  if (lojaOrigem === lojaDestino) {
    alert("A loja de origem e destino devem ser diferentes.");
    return;
  }

  const statusInicial = "Aguardando coleta";

  try {
    const btnSubmit = formTicketModal.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaOrigem,
        loja_destino: lojaDestino,
        tipo_servico: tipo,
        orcamento: orcamento,
        status: statusInicial,
        obs_loja_origem: observacao
      }])
      .select()
      .single();

    if (error) throw error;

    await registrarEvento(data.id, statusInicial, observacao);

    alert(`Pedido gerado por Ticket com sucesso!\nOS Nº: ${data.id}`);

    if (typeof window.fecharModalTicket === 'function') window.fecharModalTicket();

    // Atualiza a tabela na tela
    await carregarPedidos();

  } catch (err) {
    console.error("Erro ao gravar ticket:", err);
    alert(`Erro ao gerar pedido por ticket: ${err.message}`);
  } finally {
    const btnSubmit = formTicketModal.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = false;
  }
});

// ===============================
// Inicialização
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) {
    await carregarPedidos();
  }
});
