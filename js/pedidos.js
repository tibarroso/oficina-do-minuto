import { supabase } from "./supabase.js";

// =======================
// Criar pedido
// =======================
window.criarPedido = async function() {
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error(userError);
    return alert("Usuário não logado");
  }

  const { error } = await supabase.from("pedidos").insert({
    loja_origem: user.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
    criado_em: new Date()
  });

  if(error){ console.error(error); return alert("Erro ao criar pedido: " + error.message); }

  alert("Pedido criado com sucesso!");
};

// =======================
// Upload múltiplo fotos ANTES
// =======================
window.uploadAntes = async function(){
  const files = document.getElementById("fotoAntes")?.files;
  if(!files || files.length === 0) return alert("Selecione fotos antes");

  for(const file of files){
    const path = `antes_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("fotos").upload(path,file);
    if(error){ console.error(error); continue; }
  }

  alert("Fotos antes enviadas!");
};

// =======================
// Upload múltiplo fotos DEPOIS
// =======================
window.uploadDepois = async function(){
  const files = document.getElementById("fotoDepois")?.files;
  if(!files || files.length === 0) return alert("Selecione fotos depois");

  for(const file of files){
    const path = `depois_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("fotos").upload(path,file);
    if(error){ console.error(error); continue; }
  }

  alert("Fotos depois enviadas!");
};
