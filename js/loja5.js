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
// Carregar pedidos por status da Loja 5
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  // Pedidos entregues na Loja 5 (recebidos)
  const { data: recebidos } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Entregue na Loja 5")
    .order("criado_em", { ascending: false });

  renderPedidos(recebidos, "pedidosRecebidos", "recebido");

  // Pedidos em serviço
  const { data: emServico } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Em serviço")
    .order("criado_em", { ascending: false });

  renderPedidos(emServico, "pedidosEmServico", "emServico");

  // Pedidos prontos para transporte (retorno)
  const { data: prontosRetorno } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando retorno do transporte")
    .order("criado_em", { ascending: false });

  renderPedidos(prontosRetorno, "pedidosProntosRetorno", "prontoRetorno");
}

// ===============================
// Renderizar pedidos
// ===============================
function renderPedidos(pedidos, containerId, tipo) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = `<p>Nenhum pedido ${tipo === "recebido" ? "recebido" : tipo === "emServico" ? "em serviço" : "pronto para transporte"}.</p>`;
    return;
  }

  pedidos.forEach(p => {
    let html = `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>
    `;

    if (tipo === "recebido" || tipo === "emServico") {
      html += `
        <label for="obs-${p.id}">Observações Loja 5</label><br>
        <textarea id="obs-${p.id}" rows="3" style="width:100%;">${p.obs_loja5 || ""}</textarea><br><br>
        <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>
      `;
    }

    if (tipo === "recebido" || tipo === "emServico") {
      html += `<button onclick="concluirServico('${p.id}')">Concluir Serviço</button>`;
    }

    html += `</div>`;
    container.innerHTML += html;
  });
}

// ===============================
// Salvar observação
// ===============================
window.salvarObservacao = async (id) => {
  const texto = document.getElementById(`obs-${id}`).value;

  const { error } = await supabase.from("pedidos").update({
    obs_loja5: texto,
    status: "Em serviço"
  }).eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao salvar observação");
    return;
  }

  alert("Observação salva!");
  carregarPedidos();
};

// ===============================
// Concluir serviço (prepara retorno)
 // ===============================
window.concluirServico = async (id) => {
  const { error } = await supabase.from("pedidos").update({
    status: "Aguardando retorno do transporte"
  }).eq("id", id);

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
  if (usuarioLogado) carregarPedidos();

  // Atualiza automaticamente a cada 5s
  setInterval(carregarPedidos, 5000);
})();
