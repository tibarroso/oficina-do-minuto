import { supabase } from "./supabase.js";

const tipoInput = document.getElementById("tipo");
const orcamentoInput = document.getElementById("orcamento");
const btnCriarPedido = document.getElementById("btnCriarPedido");
const filtroStatus = document.getElementById("filtroStatus");
const btnFiltrar = document.getElementById("btnFiltrar");
const containerPedidos = document.getElementById("containerPedidos");

let usuarioLogado = null;
let pedidosGlobais = [];

// Verificar login
async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// Criar pedido
btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return;
  const tipo = tipoInput.value;
  const orcamento = orcamentoInput.checked;

  const { error } = await supabase.from("pedidos").insert({
    loja_origem: usuarioLogado.email,
    tipo_servico: tipo,
    eh_orcamento: orcamento,
    status: orcamento ? "Aguardando avaliação" : "Aguardando coleta",
    criado_em: new Date()
  });

  if (error) {
    alert("Erro ao criar pedido: " + error.message);
  } else {
    alert("Pedido criado com sucesso!");
    carregarPedidos();
  }
});

// Carregar pedidos da loja
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false })
      .eq("loja_origem", usuarioLogado.email);

  const status = filtroStatus.value;
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return alert("Erro ao carregar pedidos: " + error.message);

  pedidosGlobais = data || [];
  renderizarPedidos();
}

// Renderizar pedidos
function renderizarPedidos() {
  containerPedidos.innerHTML = "";
  if (!pedidosGlobais.length) {
    containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidosGlobais.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}</p>
      <p><strong>Status:</strong> <span class="status">${p.status}</span></p>
      <p><strong>Criado em:</strong> ${new Date(p.criado_em).toLocaleString()}</p>
    `;

    containerPedidos.appendChild(card);
  });
}

// Filtro por status
btnFiltrar.addEventListener("click", carregarPedidos);

// Atualização automática a cada 5 segundos
setInterval(() => {
  if (usuarioLogado) carregarPedidos();
}, 5000);

// Inicialização
(async () => {
  usuarioLogado = await verificarLogin();
  if (!usuarioLogado) return;
  carregarPedidos();
})();
