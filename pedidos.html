import { supabase } from "./supabase.js";

// ===============================
// Elementos
// ===============================
const tipoInput = document.getElementById("tipo");
const orcamentoInput = document.getElementById("orcamento");
const observacaoInput = document.getElementById("observacao");
const btnCriarPedido = document.getElementById("btnCriarPedido");

// Capturando o valor selecionado para a loja
const lojaSelect = document.getElementById("lojaSelect");

const fotoAntesInput = document.getElementById("fotoAntes");
const btnUploadAntes = document.getElementById("btnUploadAntes");

const fotoDepoisInput = document.getElementById("fotoDepois");
const btnUploadDepois = document.getElementById("btnUploadDepois");

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

  usuarioLogado = data.user;
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
  const orcamento = orcamentoInput.checked;
  const observacao = observacaoInput.value.trim();
  const lojaSelecionada = lojaSelect.value; // Valor selecionado para loja

  if (!tipo) {
    alert("Selecione o tipo de serviço.");
    return;
  }

  const statusInicial = "Aguardando coleta";

  try {
    // Verificando o valor de lojaSelecionada antes da inserção
    console.log("Loja selecionada:", lojaSelecionada);  // Debug

    // Inserir o pedido e associar a loja de origem
    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaSelecionada,  // A loja selecionada (ex: '1', '2')
        tipo_servico: tipo,
        eh_orcamento: orcamento,
        status: statusInicial,
        obs_loja_origem: observacao || null,
        criado_em: new Date().toISOString()
      }])
      .select()
      .single();

    // Verificando erro na inserção
    if (error) {
      console.error("Erro na inserção do pedido:", error);
      alert("Erro ao criar pedido: " + error.message);
      return;
    }

    pedidoAtualId = data.id;  // Garantir que o pedido foi criado com sucesso
    console.log("Pedido criado com sucesso, ID:", pedidoAtualId);  // Debug

    // Registrar o evento de criação
    await registrarEvento(
      pedidoAtualId,
      "Pedido criado",
      observacao || `Serviço: ${tipo}`
    );

    alert(`Pedido criado com sucesso!\nOS: ${pedidoAtualId}`);

    // Limpar formulário após criar o pedido
    tipoInput.value = "";
    orcamentoInput.checked = false;
    observacaoInput.value = "";

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert("Erro ao criar pedido: " + err.message);
  }
});

// ===============================
// Upload de foto (ANTES / DEPOIS)
// ===============================
async function uploadFoto(fileInput, tipo) {
  if (!pedidoAtualId) {
    alert("Crie o pedido antes de enviar fotos!");
    return;
  }

  const file = fileInput.files[0];
  if (!file) {
    alert("Selecione uma foto!");
    return;
  }

  const path = `${tipo}_${pedidoAtualId}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

  try {
    const { error: uploadError } = await supabase
      .storage
      .from("fotos")
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase
      .storage
      .from("fotos")
      .getPublicUrl(path);

    const field = tipo === "antes" ? "foto_antes" : "foto_depois";

    // Atualizar o pedido com o link da foto
    await supabase
      .from("pedidos")
      .update({ [field]: urlData.publicUrl })
      .eq("id", pedidoAtualId);

    // Registrar o evento de upload de foto
    await registrarEvento(
      pedidoAtualId,
      `Foto ${tipo.toUpperCase()} enviada`,
      urlData.publicUrl
    );

    alert("Foto enviada com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar foto:", err);
    alert("Erro ao enviar foto: " + err.message);
  }
}

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
// Eventos de botão
// ===============================
btnUploadAntes?.addEventListener("click", () =>
  uploadFoto(fotoAntesInput, "antes")
);

btnUploadDepois?.addEventListener("click", () =>
  uploadFoto(fotoDepoisInput, "depois")
);

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
})();
