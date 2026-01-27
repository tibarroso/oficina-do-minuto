import { supabase } from "./supabase.js";

window.criarPedido = async function () {
  const tipo = document.getElementById("tipo").value;
  const orc = document.getElementById("orcamento").checked;

  await supabase.from("pedidos").insert({
    loja_origem: "Loja 1",
    tipo_servico: tipo,
    eh_orcamento: orc,
    status: orc ? "Aguardando avaliação" : "Aguardando coleta"
  });

  alert("Pedido criado");
};

import { supabase } from "./supabase.js";

async function uploadFoto(pedidoId, file, tipo) {
  const path = `pedidos/${pedidoId}/${tipo}_${Date.now()}.jpg`;

  await supabase.storage
    .from("fotos")
    .upload(path, file);
}
