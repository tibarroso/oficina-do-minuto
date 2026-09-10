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

let usuarioLogado = null;
let pedidoAtualId = null;

// ===============================
// Verificar Login
// ===============================
async function verificarLogin() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
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
// Criar Pedido
// ===============================
btnCriarPedido?.addEventListener("click", async (e) => {
  e.preventDefault(); // Evita recarregamento de formulários se estiver dentro de uma tag <form>

  if (!usuarioLogado) {
    alert("Usuário não logado!");
    return;
  }

  const tipo = tipoInput ? tipoInput.value.trim() : "";
  const lojaOrigem = lojaOrigemInput ? lojaOrigemInput.value.trim() : "";
  const lojaDestino = lojaDestinoInput ? lojaDestinoInput.value.trim() : "";
  const orcamento = orcamentoInput ? orcamentoInput.checked : false;
  const observacao = observacaoInput ? observacaoInput.value.trim() : "";

  // Validação dos campos obrigatórios
  if (!tipo || !lojaOrigem || !lojaDestino) {
    alert("Por favor, preencha todos os campos obrigatórios (Serviço, Loja de Origem e Loja de Destino).");
    return;
  }

  // STATUS PADRONIZADO DO FLUXO
  const statusInicial = "Aguardando coleta";
  const obsInicial = observacao || `Serviço solicitado: ${tipo}`;

  try {
    // Desabilita o botão para evitar envios duplicados em cliques múltiplos
    if (btnCriarPedido) btnCriarPedido.disabled = true;

    // 1. Inserir na tabela de 'pedidos'
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

    // 2. Registrar o evento inicial na timeline ('pedido_eventos')
    await registrarEvento(
      pedidoAtualId,
      statusInicial,
      obsInicial
    );

    alert(`Pedido criado com sucesso!\nOS Nº: ${pedidoAtualId}`);

    // 3. Limpar formulário
    if (tipoInput) tipoInput.value = "";
    if (lojaOrigemInput) lojaOrigemInput.value = "";
    if (lojaDestinoInput) lojaDestinoInput.value = "";
    if (orcamentoInput) orcamentoInput.checked = false;
    if (observacaoInput) observacaoInput.value = "";

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert(`Erro ao criar pedido: ${err.message || "Verifique o console para mais detalhes."}`);
  } finally {
    if (btnCriarPedido) btnCriarPedido.disabled = false;
  }
});

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
        criado_por: usuarioLogado.email || "Sistema / Loja"
      }]);

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao registrar evento no histórico:", err);
  }
}

// ===============================
// Inicialização
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  usuarioLogado = await verificarLogin();
});
