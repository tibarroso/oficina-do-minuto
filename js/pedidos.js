import { supabase } from "./supabase.js";

// =======================
// Verificar login
// =======================
async function verificarLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// =======================
// Criar pedido
// =======================
async function criarPedido() {
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;

  const user = await verificarLogin();
  if (!user) return;

  const { data, error } = await supabase.from("pedidos").insert([{
    loja_origem: user.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
    criado_em: new Date()
  }]);

  if (error) {
    console.error(error);
    alert("Erro ao criar pedido: " + error.message);
    return;
  }

  alert("Pedido criado com sucesso! ID: " + data[0].id);
}

// =======================
// Upload fotos
// =======================
async function uploadFotos(tipo) {
  const input = document.getElementById(tipo === "antes" ? "fotoAntes" : "fotoDepois");
  const files = input.files;
  if (!files || files.length === 0) return alert("Selecione arquivos");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const file of files) {
    const path = `${tipo}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("fotos").upload(path, file);
    if (error) {
      console.error(error);
      alert("Erro ao enviar foto: " + error.message);
      continue;
    }
  }

  alert("Fotos enviadas com sucesso!");
}

// =======================
// Event listeners
// =======================
document.getElementById("btnCriarPedido").addEventListener("click", criarPedido);
document.getElementById("btnUploadAntes").addEventListener("click", () => uploadFotos("antes"));
document.getElementById("btnUploadDepois").addEventListener("click", () => uploadFotos("depois"));
