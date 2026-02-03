import { supabase } from "./supabase.js";

// ===============================
// Elementos
// ===============================
const tipoInput = document.getElementById("tipo");
const orcamentoInput = document.getElementById("orcamento");
const observacaoInput = document.getElementById("observacao");
const btnCriarPedido = document.getElementById("btnCriarPedido");

const fotoAntesInput = document.getElementById("fotoAntes");
const btnUploadAntes = document.getElementById("btnUploadAntes");

const fotoDepoisInput = document.getElementById("fotoDepois");
const btnUploadDepois = document.getElementById("btnUploadDepois");

let usuarioLogado = null;
let lojaUsuario = null;      // Aqui guardamos o código da loja
let pedidoAtualId = null;

// ===============================
// Verificar login e buscar loja
// ===============================
async function verificarLogin() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }

  // Buscar loja e perfil na tabela usuario
  const email = data.user.email.trim().toLowerCase();

  const { data: userData, error: userError } = await supabase
    .from("usuario")
    .select("perfil, loja")  // Buscamos o campo "loja" na tabela usuario
    .eq("email", email)
    .single();

  if (userError || !userData) {
    alert("Usuário não encontrado na tabela!");
    window.location.href = "login.html";
    return null;
  }

  lojaUsuario = userData.loja;  // A loja do usuário logado
  usuarioLogado = data.user;

  // Adicionamos um log para garantir que a loja está sendo recuperada corretamente
  console.log("Loja do usuário logado:", lojaUsuario);  // Debug

  return data.user;
}

// ===============================
// Criar pedido
// ===============================
btnCriarPedido?.addEventListener("click", async () => {
  if (!usuarioLogado || !lojaUsuario) {
    alert("Usuário não logado ou loja não encontrada!");
    return;
  }

  const tipo = tipoInput.value.trim();
  const orcamento = orcamentoInput.checked;
  const observacao = observacaoInput.value.trim();

  if (!tipo) {
    alert("Selecione o tipo de serviço.");
    return;
  }

  const statusInicial = "Aguardando coleta";

  try {
    // Verificando se o valor de lojaUsuario está correto antes da inserção
    console.log("Criando pedido para a loja:", lojaUsuario);  // Debug

    // Inserir o pedido e associar a loja de origem
    const { data, error } = await supabase
      .from("pedidos")
      .insert([{
        loja_origem: lojaUsuario,  // Aqui usamos o código da loja, não o email
        tipo_servico: tipo,
        eh_orcamento: orcamento,
        status: statusInicial,
        obs_loja_origem: observacao || null,
        criado_em: new Date().toISOString()
      }])
      .select()
      .single();

    // Verificando se ocorreu erro na inserção
    if (error) {
      console.error("Erro na inserção do pedido:", error);
      alert("Erro ao criar pedido: " + error.message);
      return;
    }

    pedidoAtualId = data.id;  // Garantir que o pedido foi criado com sucesso

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
