import { supabase } from "./supabase.js";

// ===============================
// Carregar pedidos da Loja 5
// ===============================
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("tipo_servico", ["Lavanderia", "Sapataria"])
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
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>

        <label>Observações Loja 5</label>
        <textarea id="obs-${p.id}" rows="3">${p.obs_loja5 || ""}</textarea><br><br>

        <input type="file" id="antes-${p.id}">
        <button onclick="uploadFoto('${p.id}','antes')">Foto Antes</button><br><br>

        <input type="file" id="depois-${p.id}">
        <button onclick="uploadFoto('${p.id}','depois')">Foto Depois</button><br><br>

        <button onclick="salvarObservacao('${p.id}')">Salvar</button>
        <button onclick="concluirServico('${p.id}')">Concluir Serviço</button>

        <div id="timeline-${p.id}"></div>
      </div>
    `;

    carregarTimeline(p.id);
  });
}

// ===============================
// Salvar observação
// ===============================
window.salvarObservacao = async (id) => {
  const texto = document.getElementById(`obs-${id}`).value;

  await supabase.from("pedidos").update({
    obs_loja5: texto,
    status: "Em serviço"
  }).eq("id", id);

  await registrarEvento(id, "Em serviço na Loja 5", texto);
  alert("Observação salva!");
};

// ===============================
// Upload foto
// ===============================
window.uploadFoto = async (id, tipo) => {
  const input = document.getElementById(`${tipo}-${id}`);
  const file = input.files[0];
  if (!file) return alert("Selecione uma foto");

  const path = `${tipo}_${id}_${Date.now()}_${file.name}`;
  await supabase.storage.from("fotos").upload(path, file);

  const { data } = supabase.storage.from("fotos").getPublicUrl(path);

  const campo = tipo === "antes" ? "foto_antes" : "foto_depois";
  await supabase.from("pedidos").update({
    [campo]: data.publicUrl
  }).eq("id", id);

  await registrarEvento(id, `Foto ${tipo}`, data.publicUrl);
  alert("Foto enviada!");
};

// ===============================
// Concluir serviço (RETORNO)
// ===============================
window.concluirServico = async (id) => {
  await supabase.from("pedidos").update({
    status: "Aguardando retorno do transporte",
    retornando: true
  }).eq("id", id);

  await registrarEvento(
    id,
    "Serviço concluído na Loja 5",
    "Aguardando transporte para retorno"
  );

  alert("Serviço concluído!");
  carregarPedidos();
};

// ===============================
// Eventos / Timeline
// ===============================
async function registrarEvento(pedidoId, evento, observacao) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: "Loja 5"
  }]);
}

async function carregarTimeline(pedidoId) {
  const { data } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em");

  const div = document.getElementById(`timeline-${pedidoId}`);
  div.innerHTML = "<strong>Histórico</strong><br>";

  data?.forEach(e => {
    div.innerHTML += `
      <div>
        <strong>${e.evento}</strong><br>
        ${e.observacao || ""}<br>
        <small>${new Date(e.criado_em).toLocaleString()}</small>
      </div>
    `;
  });
}

// ===============================
carregarPedidos();
