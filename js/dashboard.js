import { supabase } from "./supabase.js";
import Chart from "chart.js/auto";

const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin"; // admin | loja

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "login.html";
    return null;
  }

  return data.user;
}

// ===============================
// Criar botão Criar Pedido (LOJA)
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo !== "loja") return;

  btnCriarPedidoContainer.innerHTML = `
    <button class="btn-primary" onclick="window.location.href='pedidos.html'">
      ➕ Criar Pedido
    </button>
  `;
}

// ===============================
// Carregar pedidos
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false });

  // Loja vê só os próprios pedidos
  if (usuarioTipo === "loja") {
    query = query.eq("loja_origem", usuarioLogado.email);
  }

  // Filtro status
  if (filtroStatus.value) {
    query = query.eq("status", filtroStatus.value);
  }

  // Pesquisa
  if (pesquisaOS.value.trim()) {
    const p = pesquisaOS.value.trim();
    query = query.or(`id.ilike.%${p}%,loja_origem.ilike.%${p}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  pedidosGlobais = data || [];
  renderizarPedidos(pedidosGlobais);
  atualizarGraficos();
}

// ===============================
// Renderizar pedidos
// ===============================
function renderizarPedidos(pedidos) {
  container.innerHTML = "";

  if (!pedidos.length) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Loja:</strong> ${p.loja_origem}</p>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Status:</strong> ${p.status}</p>

      <label>Observações:</label>
      <textarea id="obs-${p.id}" rows="3">${p.obs_loja5 || ""}</textarea>
      <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>

      <hr>

      <label>Foto Antes:</label>
      <input type="file" id="antes-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','antes')">Enviar Antes</button>
      <div id="preview-antes-${p.id}"></div>

      <label>Foto Depois:</label>
      <input type="file" id="depois-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','depois')">Enviar Depois</button>
      <div id="preview-depois-${p.id}"></div>

      ${
        p.status !== "Finalizado" && usuarioTipo === "admin"
          ? `<button onclick="finalizarPedido('${p.id}')">Finalizar Serviço</button>`
          : ""
      }
    `;

    container.appendChild(card);
  });
}

// ===============================
// Salvar observação
// ===============================
window.salvarObservacao = async (id) => {
  const texto = document.getElementById(`obs-${id}`).value;

  const { error } = await supabase
    .from("pedidos")
    .update({ obs_loja5: texto })
    .eq("id", id);

  if (error) return alert("Erro ao salvar observação");
  alert("Observação salva!");
};

// ===============================
// Upload de fotos (CORRIGIDO)
// ===============================
window.uploadFoto = async (id, tipo) => {
  const input = document.getElementById(`${tipo}-${id}`);
  const files = input.files;
  if (!files.length) return alert("Selecione fotos");

  const preview = document.getElementById(`preview-${tipo}-${id}`);
  preview.innerHTML = "";

  for (const file of files) {
    const fileName = `${tipo}_${id}_${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("fotos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      continue;
    }

    const { data } = supabase.storage
      .from("fotos")
      .getPublicUrl(fileName);

    const img = document.createElement("img");
    img.src = data.publicUrl;
    img.className = "preview";
    preview.appendChild(img);

    const campo = tipo === "antes" ? "foto_antes" : "foto_depois";
    await supabase.from("pedidos").update({ [campo]: data.publicUrl }).eq("id", id);
  }

  alert("Fotos enviadas com sucesso!");
};

// ===============================
// Finalizar pedido (ADMIN)
// ===============================
window.finalizarPedido = async (id) => {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Finalizado" })
    .eq("id", id);

  if (error) return alert("Erro ao finalizar pedido");

  alert("Pedido finalizado!");
  carregarPedidos();
};

// ===============================
// Gráficos
// ===============================
let chartStatus, chartServico;

function atualizarGraficos() {
  const status = {};
  const servico = {};

  pedidosGlobais.forEach(p => {
    status[p.status] = (status[p.status] || 0) + 1;
    servico[p.tipo_servico] = (servico[p.tipo_servico] || 0) + 1;
  });

  if (chartStatus) chartStatus.destroy();
  chartStatus = new Chart(document.getElementById("graficoStatus"), {
    type: "doughnut",
    data: {
      labels: Object.keys(status),
      datasets: [{ data: Object.values(status) }]
    }
  });

  if (chartServico) chartServico.destroy();
  chartServico = new Chart(document.getElementById("graficoServico"), {
    type: "bar",
    data: {
      labels: Object.keys(servico),
      datasets: [{ data: Object.values(servico) }]
    }
  });
}

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (!usuarioLogado) return;

  usuarioTipo = usuarioLogado.email.includes("loja") ? "loja" : "admin";

  criarBotaoPedido();
  btnFiltrar.addEventListener("click", carregarPedidos);
  carregarPedidos();
})();
