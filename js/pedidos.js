import { supabase } from "./supabase.js";

// ===============================
// Elementos
// ===============================
const tipoInput = document.getElementById("tipo");
const lojaOrigemInput = document.getElementById("lojaOrigem"); // Novo campo: Loja de Origem
const lojaDestinoInput = document.getElementById("lojaDestino"); // Campo de Loja de Destino
const orcamentoInput = document.getElementById("orcamento");
const observacaoInput = document.getElementById("observacao");
const btnCriarPedido = document.getElementById("btnCriarPedido");

let usuarioLogado = null;
let pedidoAtualId = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return data.user;
}

// ===============================
// Criar pedido
// ===============================
btnCriarPedido?.addEventListener("click", async () => {
  if (!usuarioLogado) {
    alert("Usuário não logado!");
    return;
  }

  const tipo = tipoInput.value.trim();
  const lojaOrigem = lojaOrigemInput.value.trim(); // Obter o valor de Loja de Origem
  const lojaDestino = lojaDestinoInput.value.trim(); // Obter o valor de Loja de Destino
  const orcamento = orcamentoInput.checked;
  const observacao = observacaoInput.value.trim();

  if (!tipo) {
    alert("Selecione o tipo de serviço.");
    return;
  }

  if (!lojaOrigem || !lojaDestino) {
    alert("Por favor, selecione as lojas de origem e destino.");
    return;
  }

  /**
   * STATUS PADRONIZADO
   * ⚠️ NÃO usar status que não existam no fluxo
   */
  const statusInicial = "Aguardando coleta";

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaOrigem, // A loja de origem agora recebe o valor correto
        loja: lojaDestino, // A loja de destino é inserida no campo correto
        tipo_servico: tipo,
        eh_orcamento: orcamento,
        status: statusInicial,
        obs_loja_origem: observacao || null,
        criado_em: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    pedidoAtualId = data.id;

    // Evento inicial
    await registrarEvento(
      pedidoAtualId,
      "Pedido criado",
      observacao || `Serviço: ${tipo}`
    );

    alert(`Pedido criado com sucesso!\nOS: ${pedidoAtualId}`);

    // Limpar formulário
    tipoInput.value = "";
    lojaOrigemInput.value = ""; // Limpa o campo Loja de Origem
    lojaDestinoInput.value = ""; // Limpa o campo Loja de Destino
    orcamentoInput.checked = false;
    observacaoInput.value = "";

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert("Erro ao criar pedido: " + err.message);
  }
});

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao = "") {
  if (!usuarioLogado) return;

  try {
    await supabase
      .from("pedido_eventos")
      .insert([{
        pedido_id: pedidoId,
        evento,
        observacao,
        criado_por: usuarioLogado.email,
        criado_em: new Date().toISOString()
      }]);
  } catch (err) {
    console.error("Erro ao registrar evento:", err);
  }
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
})();
