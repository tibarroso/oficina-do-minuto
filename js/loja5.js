import { supabase } from "./supabase.js";

// ===============================
// Carregar pedidos da Loja 5
// ===============================
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("tipo_servico", ["Lavanderia", "Sapataria"], "Bordado"])
    .in("status", ["Entregue na Loja 5", "Em serviço"])
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const container = document.getElementById("pedidos");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum pedido para a Loja 5.</p>";
    return;
  }

  data.forEach(p => {
    container.innerHTML += `
      <div style="border:1px solid #ccc; padding:14px; margin-bottom:14px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br>
        <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}<br><br>

        <label><strong>Observações da Loja 5</strong></label><br>
        <textarea id="obs-${p.id}" rows="3" style="width:100%;">${p.obs_loja5 || ""}</textarea><br><br>

        <label>Foto Antes:</label><br>
        <input type="file" id="antes-${p.id}">
        <button onclick="uploadFoto('${p.id}','antes')">Enviar Antes</button><br><br>

        <label>Foto Depois:</label><br>
        <input type="file" id="depois-${p.id}">
        <button onclick="uploadFoto('${p.id}','depois')">Enviar Depois</button><br><br>

        <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>
        <button onclick="concluirServico('${p.id}')">Concluir Serviço</button>

        <div id="timeline-${p.id}" style="margin-top:10px;"></div>
      </div>
    `;

    carregarTimeline(p.id);
  });
}

// ===============================
// Salvar observação Loja 5
// ===============================
window.salvarObservacao = async function (id) {
  const texto = document.getElementById(`obs-${id}`).value;

  const { error } = await supabase
    .from("pedidos")
    .update({ obs_loja5: texto, status: "Em serviço" })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar observação");
    return;
  }

  await registrarEvento(id, "Pedido em serviço na Loja 5", texto);
  alert("Observação salva!");
};

// ===============================
// Upload fotos (ANTES / DEPOIS)
// ===============================
window.uploadFoto = async function (id, tipo) {
  const fileInput = document.getElementById(`${tipo}-${id}`);
  const file = fileInput?.files[0];
  if (!file) return alert("Selecione uma foto");

  const path = `${tipo}_${id}_${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("fotos")
    .upload(path, file);

  if (error) {
    console.error(error);
    alert("Erro ao enviar foto");
    return;
  }

  await registrarEvento(
    id,
    `Foto ${tipo.toUpperCase()} enviada`,
    path
  );

  alert("Foto enviada com sucesso!");
};

// ===============================
// Concluir serviço (RETORNO)
// ===============================
window.concluirServico = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Aguardando retorno do transporte" })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao concluir serviço");
    return;
  }

  await registrarEvento(
    id,
    "Serviço concluído na Loja 5",
    "Aguardando transporte para retorno"
  );

  alert("Serviço concluído! Transporte será acionado.");
  carregarPedidos();
};

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento, observacao) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: "Loja 5"
  }]);
}

// ===============================
// Timeline
// ===============================
async function carregarTimeline(pedidoId) {
  const { data } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  let html = "<strong>Histórico</strong><br>";

  if (!data || data.length === 0) {
    html += "<small>Sem eventos</small>";
  } else {
    data.forEach(e => {
      html += `
        <div style="border-left:3px solid #555; padding-left:8px; margin:6px 0;">
          <strong>${e.evento}</strong><br>
          ${e.observacao || ""}<br>
          <small>${new Date(e.criado_em).toLocaleString()} - ${e.criado_por}</small>
        </div>
      `;
    });
  }

  document.getElementById(`timeline-${pedidoId}`).innerHTML = html;
}

// ===============================
// Inicialização
// ===============================
carregarPedidos();
