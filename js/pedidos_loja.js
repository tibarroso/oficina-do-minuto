import { supabase } from "./supabase.js";

let usuarioLogado = null;
let pedidosGlobais = [];

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) carregarPedidos();
})();

// ===============================
// Criar pedido
// ===============================
const btnCriarPedido = document.getElementById("btnCriarPedido");

btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return alert("Usuário não logado.");

  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipo) return alert("Selecione o tipo de serviço.");

  const { error } = await supabase.from("pedidos").insert([{
    loja_origem: usuarioLogado.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    obs_loja_origem: observacao,
    status: "Aguardando coleta",
    criado_em: new Date().toISOString()
  }]);

  if (error) return alert("Erro ao criar pedido: " + error.message);

  alert("Pedido criado com sucesso!");
  carregarPedidos();

  document.getElementById("tipo").value = "";
  document.getElementById("orcamento").checked = false;
  document.getElementById("observacao").value = "";
});

// ===============================
// Carregar pedidos da loja
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  const filtroStatus = document.getElementById("filtroStatus").value;

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("loja_origem", usuarioLogado.email)
    .order("criado_em", { ascending: false });

  if (filtroStatus) query = query.eq("status", filtroStatus);

  const { data, error } = await query;
  if (error) return alert("Erro ao carregar pedidos");

  pedidosGlobais = data || [];
  renderizarPedidos();
}

// ===============================
// Renderizar pedidos
// ===============================
function renderizarPedidos() {
  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if (!pedidosGlobais.length) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidosGlobais.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    let acoes = "";

    switch (p.status) {

      case "Aguardando coleta":
        acoes = `<button onclick="enviarParaTransporte('${p.id}')">
          Enviar para Transporte
        </button>`;
        break;

      case "Em transporte para loja de origem":
        acoes = `<em>Pedido retornando...</em>`;
        break;

      case "Recebido na loja de origem":
        acoes = `
          <button onclick="finalizarPedido('${p.id}')">
            Finalizar Pedido
          </button>
          <button onclick="retrabalhoPedido('${p.id}')">
            Retrabalho
          </button>
        `;
        break;
    }

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Observação:</strong> ${p.obs_loja_origem || "<em>—</em>"}</p>
      ${acoes}
    `;

    container.appendChild(card);
  });
}

// ===============================
// Ações
// ===============================
window.enviarParaTransporte = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Em transporte para Loja 5" })
    .eq("id", id);

  await registrarEvento(id, "Pedido enviado para transporte");
  carregarPedidos();
};

window.finalizarPedido = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Finalizado" })
    .eq("id", id);

  await registrarEvento(id, "Pedido finalizado");
  carregarPedidos();
};

window.retrabalhoPedido = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Retrabalho" })
    .eq("id", id);

  await registrarEvento(id, "Pedido enviado para retrabalho");
  carregarPedidos();
};

// ===============================
// Registrar evento
// ===============================
async function registrarEvento(pedidoId, evento) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    criado_por: usuarioLogado.email,
    criado_em: new Date().toISOString()
  }]);
}

// ===============================
// Filtro
// ===============================
document.getElementById("btnFiltrar")
  .addEventListener("click", carregarPedidos);

// Auto refresh
setInterval(() => {
  if (usuarioLogado) carregarPedidos();
}, 5000);
