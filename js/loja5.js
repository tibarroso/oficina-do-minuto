import { supabase } from "./supabase.js";

// ===============================
// Carregar pedidos da Loja 5
// ===============================
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("tipo_servico", ["Lavanderia", "Sapataria"])
    .eq("status", "Entregue na Loja 5")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const container = document.getElementById("pedidos");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum pedido entregue para a Loja 5.</p>";
    return;
  }

  data.forEach(p => {
    container.innerHTML += `
      <div style="border:1px solid #ccc; padding:12px; margin-bottom:12px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br>
        <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}<br><br>

        <label>Observações da Loja 5:</label><br>
        <textarea id="obs-${p.id}" rows="3" style="width:100%;">${p.obs_loja5 || ""}</textarea><br><br>

        <label>Foto Antes:</label><br>
        <input type="file" id="antes-${p.id}">
        <button onclick="uploadAntes('${p.id}')">Enviar Antes</button><br><br>

        <label>Foto Depois:</label><br>
        <input type="file" id="depois-${p.id}">
        <button onclick="uploadDepois('${p.id}')">Enviar Depois</button><br><br>

        <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>
        <button onclick="finalizarPedido('${p.id}')">Finalizar Serviço</button>
      </div>
    `;
  });
}

// ===============================
// Salvar observação Loja 5
// ===============================
window.salvarObservacao = async function (id) {
  const texto = document.getElementById(`obs-${id}`).value;

  const { error } = await supabase
    .from("pedidos")
    .update({ obs_loja5: texto })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar observação");
    return;
  }

  alert("Observação salva com sucesso!");
};

// ===============================
// Upload foto ANTES
// ===============================
window.uploadAntes = async function (id) {
  const fileInput = document.getElementById(`antes-${id}`);
  const file = fileInput?.files[0];
  if (!file) return alert("Selecione uma foto antes");

  const path = `antes_${id}_${Date.now()}_${file.name}`;

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

// ===============================
// Upload foto DEPOIS
// ===============================
window.uploadDepois = async function (id) {
  const fileInput = document.getElementById(`depois-${id}`);
  const file = fileInput?.files[0];
  if (!file) return alert("Selecione uma foto depois");

  const path = `depois_${id}_${Date.now()}_${file.name}`;

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

// ===============================
// Finalizar pedido
// ===============================
window.finalizarPedido = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Finalizado" })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao finalizar pedido");
    return;
  }

  alert("Pedido finalizado com sucesso!");
  carregarPedidos();
};

// Inicialização
carregarPedidos();
