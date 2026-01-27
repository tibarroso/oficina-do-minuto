import { supabase } from "./supabase.js";

// ===============================
// Verifica usuário logado
// ===============================
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error(error);
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Criar pedido
// ===============================
async function criarPedido() {
  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const user = await verificarLogin();
  if (!user) return;

  const { error } = await supabase.from("pedidos").insert({
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
  carregarPedidos(); // Recarrega lista
}

// ===============================
// Carregar pedidos da loja logada
// ===============================
async function carregarPedidos() {
  const user = await verificarLogin();
  if (!user) return;

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("loja_origem", user.email)
    .order("criado_em", { ascending: false });

  const container = document.getElementById("pedidos");
  container.innerHTML = "";

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar pedidos</p>";
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "pedido-card";

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <span class="status-tag ${p.status==='Aguardando coleta'?'status-Aguardando':p.status==='Entregue na Loja 5'?'status-Entregue':'status-Finalizado'}">${p.status}</span>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>

      <label>Observações:</label>
      <textarea id="obs-${p.id}" rows="3">${p.obs_loja5 || ""}</textarea>
      <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button><br><br>

      <label>Fotos Antes:</label>
      <input type="file" id="antes-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','antes')">Enviar Antes</button>
      <div id="preview-antes-${p.id}" class="preview"></div><br>

      <label>Fotos Depois:</label>
      <input type="file" id="depois-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','depois')">Enviar Depois</button>
      <div id="preview-depois-${p.id}" class="preview"></div><br>

      ${p.status !== 'Finalizado' ? `<button onclick="finalizarPedido('${p.id}')">Finalizar Pedido</button>` : ""}
    `;

    container.appendChild(card);
  });
}

// ===============================
// Salvar observação
// ===============================
window.salvarObservacao = async function(id) {
  const texto = document.getElementById(`obs-${id}`).value;
  const { error } = await supabase.from("pedidos").update({ obs_loja5: texto }).eq("id", id);
  if (error) {
    console.error(error);
    return alert("Erro ao salvar observação");
  }
  alert("Observação salva!");
};

// ===============================
// Upload fotos Antes/Depois
// ===============================
window.uploadFoto = async function(id, tipo) {
  const fileInput = document.getElementById(`${tipo}-${id}`);
  const files = fileInput?.files;
  if (!files || files.length === 0) return alert(`Selecione arquivos (${tipo})`);

  const previewDiv = document.getElementById(`preview-${tipo}-${id}`);
  previewDiv.innerHTML = "";

  for (const file of files) {
    const path = `${tipo}_${id}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("fotos").upload(path, file);
    if (error) { console.error(error); continue; }

    const { data } = supabase.storage.from("fotos").getPublicUrl(path);
    const img = document.createElement("img");
    img.src = data.publicUrl;
    previewDiv.appendChild(img);

    // Atualiza campo na tabela
    const field = tipo === 'antes' ? 'foto_antes' : 'foto_depois';
    await supabase.from("pedidos").update({ [field]: data.publicUrl }).eq("id", id);
  }

  alert("Fotos enviadas e preview atualizado!");
};

// ===============================
// Finalizar pedido
// ===============================
window.finalizarPedido = async function(id) {
  const { error } = await supabase.from("pedidos").update({ status: "Finalizado" }).eq("id", id);
  if (error) { console.error(error); return alert("Erro ao finalizar pedido"); }
  alert("Pedido finalizado!");
  carregarPedidos();
};

// ===============================
// Inicialização
// ===============================
document.getElementById("btnCriar").addEventListener("click", criarPedido);
carregarPedidos();
