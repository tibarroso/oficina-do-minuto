import { supabase } from "./supabase.js";

let usuarioLogado = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    alert("Usuário não logado");
    window.location.href = "login.html";
    return null;
  }

  return user;
}

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
    console.error("Erro ao carregar pedidos:", error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const container = document.getElementById("pedidos");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum pedido disponível para a Loja 5.</p>";
    return;
  }

  data.forEach(p => {
    container.innerHTML += `
      <div style="border:1px solid #ccc; padding:12px; margin-bottom:12px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>

        <label>Observações Loja 5</label><br>
        <textarea id="obs-${p.id}" rows="3" style="width:100%;">${p.obs_loja5 || ""}</textarea><br><br>

        <input type="file" id="antes-${p.id}">
        <button onclick="uploadFoto('${p.id}','antes')">Foto Antes</button><br><br>

        <input type="file" id="depois-${p.id}">
        <button onclick="uploadFoto('${p.id}','depois')">Foto Depois</button><br><br>

        <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>
        <button onclick="concluirServico('${p.id}')">Concluir Serviço</button>
      </div>
    `;
  });
}

// ===============================
// Salvar observação
// ===============================
window.salvarObservacao = async (id) => {
  const texto = document.getElementById(`obs-${id}`).value;

  const { error } = await supabase
    .from("pedidos")
    .update({
      obs_loja5: texto,
      status: "Em serviço"
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar observação");
    return;
  }

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

  const { error } = await supabase.storage
    .from("fotos")
    .upload(path, file);

  if (error) {
    console.error(error);
    alert("Erro ao enviar foto");
    return;
  }

  alert("Foto enviada com sucesso!");
};

// ===============================
// Concluir serviço (RETORNO)
// ===============================
window.concluirServico = async (id) => {
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "Aguardando retorno do transporte",
      retornando: true
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao concluir serviço");
    return;
  }

  alert("Serviço concluído! Transporte será acionado.");
  carregarPedidos();
};

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (!usuarioLogado) return;
  carregarPedidos();
})();
