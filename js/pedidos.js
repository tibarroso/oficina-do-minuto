import { supabase } from "./supabase.js";

// Elementos
const tipoInput = document.getElementById("tipo");
const orcamentoInput = document.getElementById("orcamento");
const btnCriarPedido = document.getElementById("btnCriarPedido");
const fotoAntesInput = document.getElementById("fotoAntes");
const btnUploadAntes = document.getElementById("btnUploadAntes");
const fotoDepoisInput = document.getElementById("fotoDepois");
const btnUploadDepois = document.getElementById("btnUploadDepois");

let usuarioLogado = null;

// Verificar login
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// Criar pedido
btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return;

  const tipo = tipoInput.value;
  const orcamento = orcamentoInput.checked;

  const { error } = await supabase.from("pedidos").insert({
    loja_origem: usuarioLogado.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
    criado_em: new Date()
  });

  if (error) {
    console.error(error);
    alert("Erro ao criar pedido: " + error.message);
  } else {
    alert("Pedido criado com sucesso!");
  }
});

// Upload de foto
async function uploadFoto(fileInput, tipo) {
  const file = fileInput.files[0];
  if (!file) return alert("Selecione uma foto!");

  const path = `${tipo}_${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("fotos").upload(path, file);
  if (error) {
    console.error(error);
    alert("Erro ao enviar foto: " + error.message);
    return;
  }

  const { data } = supabase.storage.from("fotos").getPublicUrl(path);
  alert("Foto enviada com sucesso!\nURL: " + data.publicUrl);
}

btnUploadAntes.addEventListener("click", () => uploadFoto(fotoAntesInput, "antes"));
btnUploadDepois.addEventListener("click", () => uploadFoto(fotoDepoisInput, "depois"));

// Inicialização
(async () => {
  usuarioLogado = await verificarLogin();
})();
