import { supabase } from "./supabase.js";

// Criar pedido
window.criarPedido = async function () {
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;

  // Pega o usuário logado corretamente (Supabase v2)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error(userError);
    alert("Erro ao verificar usuário logado");
    return;
  }
  if (!user) {
    alert("Usuário não logado!");
    return;
  }

  // Inserir pedido no Supabase
  const { data, error } = await supabase
    .from("pedidos")
    .insert([{
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

  alert("Pedido criado com sucesso!");
};

// Upload foto antes
window.uploadAntes = async function () {
  const fileInput = document.getElementById("fotoAntes");
  const file = fileInput.files[0];
  if (!file) {
    alert("Selecione uma foto antes");
    return;
  }

  // Corrige o caminho do upload
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

// Upload foto depois
window.uploadDepois = async function () {
  const fileInput = document.getElementById("fotoDepois");
  const file = fileInput.files[0];
  if (!file) {
    alert("Selecione uma foto depois");
    return;
  }

  // Corrige o caminho do upload
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
