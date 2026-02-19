import { supabase } from "./supabase.js";

// ===============================
// Elementos
// ===============================
const tipoInput = document.getElementById("tipo");
const lojaOrigemInput = document.getElementById("lojaOrigem");
const lojaDestinoInput = document.getElementById("lojaDestino");
const orcamentoInput = document.getElementById("orcamento");
const observacaoInput = document.getElementById("observacao");
const btnCriarPedido = document.getElementById("btnCriarPedido");

// 🔹 NOVOS ELEMENTOS
const acoesPedido = document.getElementById("acoesPedido");
const btnFinalizar = document.getElementById("btnFinalizar");
const btnRetrabalho = document.getElementById("btnRetrabalho");

// ===============================
// Status Padronizado
// ===============================
const STATUS = {
  AGUARDANDO_COLETA: "Aguardando coleta",
  RECEBIDO_ORIGEM: "Recebido na loja de origem",
  FINALIZADO: "Finalizado"
};

let usuarioLogado = null;
let pedidoAtualId = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    alert("Usuário não logado!");
    window.location.href = "login.html"; // Redireciona para a página de login se não estiver logado
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
  const lojaOrigem = lojaOrigemInput.value.trim();
  const lojaDestino = lojaDestinoInput.value.trim();
  const orcamento = orcamentoInput.checked;
  const observacao = observacaoInput.value.trim();

  if (!tipo || !lojaOrigem || !lojaDestino) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaOrigem,
        loja_destino: lojaDestino,
        tipo_servico: tipo,
        eh_orcamento: orcamento,
        status: STATUS.AGUARDANDO_COLETA,
        obs_loja_origem: observacao || null,
        criado_em: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    pedidoAtualId = data.id;

    await registrarEvento(
      pedidoAtualId,
      "Pedido criado",
      observacao || `Serviço: ${tipo}`
    );

    alert(`Pedido criado com sucesso!\nOS: ${pedidoAtualId}`);

    tipoInput.value = "";
    lojaOrigemInput.value = "";
    lojaDestinoInput.value = "";
    orcamentoInput.checked = false;
    observacaoInput.value = "";

    // Exibir as ações apenas após o pedido ser criado
    verificarAcoes(STATUS.AGUARDANDO_COLETA);

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert(`Erro ao criar pedido: ${err.message || "Erro desconhecido"}`);
  }
});

// ===============================
// Mostrar ações se status permitir
// ===============================
function verificarAcoes(status) {
  if (!acoesPedido) return;

  if (status === STATUS.RECEBIDO_ORIGEM) {
    acoesPedido.style.display = "block"; // Exibe os botões de ações
  } else {
    acoesPedido.style.display = "none"; // Esconde os botões de ações
  }
}

// ===============================
// Botão FINALIZAR
// ===============================
btnFinalizar?.addEventListener("click", async () => {
  if (!pedidoAtualId) return;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({
        status: STATUS.FINALIZADO
      })
      .eq("id", pedidoAtualId);

    if (error) throw error;

    await registrarEvento(
      pedidoAtualId,
      "Pedido finalizado",
      "Serviço finalizado na loja de origem"
    );

    alert("Pedido finalizado com sucesso!");
    acoesPedido.style.display = "none"; // Oculta as ações após finalizar

  } catch (err) {
    console.error(err);
    alert("Erro ao finalizar pedido.");
  }
});

// ===============================
// Botão RETRABALHO
// ===============================
btnRetrabalho?.addEventListener("click", async () => {
  if (!pedidoAtualId) return;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({
        status: STATUS.AGUARDANDO_COLETA,
        obs_loja_origem: "serviço para ser refeito"
      })
      .eq("id", pedidoAtualId);

    if (error) throw error;

    await registrarEvento(
      pedidoAtualId,
      "Retrabalho solicitado",
      "Serviço para ser refeito"
    );

    alert("Pedido enviado para retrabalho!");
    acoesPedido.style.display = "none"; // Oculta as ações após retrabalho

  } catch (err) {
    console.error(err);
    alert("Erro ao enviar para retrabalho.");
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
document.addEventListener("DOMContentLoaded", async () => {
  usuarioLogado = await verificarLogin();
});
