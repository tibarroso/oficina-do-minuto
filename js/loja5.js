import { supabase } from "./supabase.js";

let usuarioLogado = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    alert("Usuário não logado");
    window.location.href = "login.html";
    return null;
  }
  return data.user;
}

// ===============================
// Carregar pedidos por status da Loja 5
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  try {
    // Pedidos entregues na Loja 5 (recebidos)
    const { data: recebidos, error: errRecebidos } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Entregue na Loja 5")
      .order("criado_em", { ascending: false });

    if (errRecebidos) throw errRecebidos;
    renderPedidos(recebidos, "pedidosRecebidos", "recebido");

    // Pedidos em serviço
    const { data: emServico, error: errEmServico } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Em serviço")
      .order("criado_em", { ascending: false });

    if (errEmServico) throw errEmServico;
    renderPedidos(emServico, "pedidosEmServico", "emServico");

    // Pedidos prontos para transporte (retorno)
    const { data: prontosRetorno, error: errProntos } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Aguardando retorno do transporte")
      .order("criado_em", { ascending: false });

    if (errProntos) throw errProntos;
    renderPedidos(prontosRetorno, "pedidosProntosRetorno", "prontoRetorno");

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
  }
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
    const html = document.createElement("div");
    html.classList.add("card");
    html.innerHTML = `
      <strong>OS:</strong> ${p.id}<br>
      <strong>Loja origem:</strong> ${p.loja_origem}<br>
      <strong>Serviço:</strong> ${p.tipo_servico}<br>
      <strong>Status:</strong> ${p.status}<br><br>
    `;

    if (tipo === "recebido" || tipo === "emServico") {
      const textarea = document.createElement("textarea");
      textarea.id = `obs-${p.id}`;
      textarea.rows = 3;
      textarea.style.width = "100%";
      textarea.value = p.obs_loja5 || "";
      html.appendChild(document.createTextNode("Observações Loja 5"));
      html.appendChild(document.createElement("br"));
      html.appendChild(textarea);
      html.appendChild(document.createElement("br"));
      html.appendChild(document.createElement("br"));

      const btnSalvar = document.createElement("button");
      btnSalvar.textContent = "Salvar Observação";
      btnSalvar.addEventListener("click", () => salvarObservacao(p.id));
      html.appendChild(btnSalvar);

      html.appendChild(document.createElement("br"));

      const btnConcluir = document.createElement("button");
      btnConcluir.textContent = "Concluir Serviço";
      btnConcluir.addEventListener("click", () => concluirServico(p.id));
      html.appendChild(btnConcluir);
    }

    container.appendChild(html);
  });
}

// ===============================
// Salvar observação
// ===============================
async function salvarObservacao(id) {
  const textarea = document.getElementById(`obs-${id}`);
  if (!textarea) return;

  const texto = textarea.value.trim();

  try {
    const { error } = await supabase.from("pedidos").update({
      obs_loja5: texto,
      status: "Em serviço"
    }).eq("id", id);

    if (error) throw error;

    alert("Observação salva!");
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao salvar observação:", err);
    alert("Erro ao salvar observação");
  }
}

// ===============================
// Concluir serviço (prepara retorno)
// ===============================
async function concluirServico(id) {
  try {
    const { error } = await supabase.from("pedidos").update({
      status: "Aguardando retorno do transporte"
    }).eq("id", id);

    if (error) throw error;

    alert("Serviço concluído! Transporte será acionado.");
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao concluir serviço:", err);
    alert("Erro ao concluir serviço");
  }
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) carregarPedidos();

  // Atualiza automaticamente a cada 5s
  setInterval(() => {
    if (usuarioLogado) carregarPedidos();
  }, 5000);
})();
