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
let pedidoAtualId = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Criar pedido
// ===============================
btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return;

  const tipo = tipoInput.value;
  const orcamento = orcamentoInput.checked;
  const observacao = observacaoInput.value.trim();
  const criadoEm = new Date().toISOString();

  // Status inicial correto: sempre começa na loja de origem
  const statusInicial = orcamento ? "Aguardando avaliação" : "Aguardando coleta";

  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      loja_origem: usuarioLogado.email,
      tipo_servico: tipo,
      eh_orcamento: orcamento,
      status: statusInicial,
      obs_loja_origem: observacao,
      criado_em: criadoEm
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar pedido:", error);
    alert("Erro ao criar pedido: " + error.message);
    return;
  }

  pedidoAtualId = data.id;

  // Registrar evento inicial
  await registrarEvento(
    pedidoAtualId,
    "Pedido criado na loja de origem",
    observacao || `Serviço: ${tipo}`
  );

  alert(`Pedido criado com sucesso!\nOS: ${pedidoAtualId}`);
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
  if (!file) return alert("Selecione uma foto!");

  const path = `${tipo}_${pedidoAtualId}_${Date.now()}_${file.name}`;

  const { error } = await supabase.storage.from("fotos").upload(path, file);
  if (error) {
    console.error("Erro upload:", error);
    alert("Erro ao enviar foto: " + error.message);
    return;
  }

  const { data } = supabase.storage.from("fotos").getPublicUrl(path);
  const field = tipo === "antes" ? "foto_antes" : "foto_depois";

  await supabase.from("pedidos").update({ [field]: data.publicUrl }).eq("id", pedidoAtualId);

  await registrarEvento(
    pedidoAtualId,
    `Foto ${tipo.toUpperCase()} enviada`,
    data.publicUrl
  );

  alert("Foto enviada com sucesso!");
}

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: usuarioLogado.email,
    criado_em: new Date().toISOString()
  }]);
}

// ===============================
// Eventos de botão
// ===============================
if (btnUploadAntes) {
  btnUploadAntes.addEventListener("click", () => uploadFoto(fotoAntesInput, "antes"));
}

if (btnUploadDepois) {
  btnUploadDepois.addEventListener("click", () => uploadFoto(fotoDepoisInput, "depois"));
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
})();
