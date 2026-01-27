import { supabase } from "./supabase.js";

// =======================
// Criar pedido
// =======================
window.criarPedido = async function () {
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;

  // Usuário logado (Supabase v2)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error(userError);
    alert("Usuário não logado");
    return;
  }

  const { error } = await supabase
    .from("pedidos")
    .insert({
      loja_origem: user.email,
      tipo_servico: tipo,
      eh_orcamento: orcamento,
      status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
      criado_em: new Date()
    });

  if (error) {
    console.error(error);
    alert("Erro ao criar pedido: " + error.message);
    return;
  }

  alert("Pedido criado com sucesso!");
};

// =======================
// Upload foto ANTES
// =======================
window.uploadAntes = async function () {
  const fileInput = document.getElementById("fotoAntes");
  const file = fileInput?.files[0];
  if (!file) return alert("Selecione uma foto antes");

  // ⚠️ NÃO colocar "fotos/" aqui
  const path = `antes_${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("fotos")
    .upload(path, file);

  if (error) {
    console.error(error);
    alert("Erro ao enviar foto antes: " + error.message);
    return;
  }

  alert("Foto antes enviada!");
};

// =======================
// Upload foto DEPOIS
// =======================
window.uploadDepois = async function () {
  const fileInput = document.getElementById("fotoDepois");
  const file = fileInput?.files[0];
  if (!file) return alert("Selecione uma foto depois");

  // ⚠️ NÃO colocar "fotos/" aqui
  const path = `depois_${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("fotos")
    .upload(path, file);

  if (error) {
    console.error(error);
    alert("Erro ao enviar foto depois: " + error.message);
    return;
  }

  alert("Foto depois enviada!");
};
