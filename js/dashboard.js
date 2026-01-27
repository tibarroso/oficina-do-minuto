import { supabase } from "./supabase.js";
import Chart from "chart.js/auto";

const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");

let pedidosGlobais = []; // Para gráficos
let usuarioLogado = null;

// ===============================
// Verificar login
// ===============================
export async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Erro ao verificar usuário:", error);
    alert("Erro de autenticação");
    window.location.href = "login.html";
    return null;
  }
  if (!user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Carregar pedidos
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

  // 🔹 Filtrar por loja se for usuário loja
  if (usuarioLogado.email.includes("loja")) {
    query = query.eq("loja_origem", usuarioLogado.email);
  }

  // 🔹 Filtrar por status
  const status = filtroStatus.value;
  if (status) query = query.eq("status", status);

  // 🔹 Filtrar por pesquisa OS ou loja
  const pesquisa = pesquisaOS.value.trim();
  if (pesquisa) {
    query = query.or(`id.ilike.%${pesquisa}%,loja_origem.ilike.%${pesquisa}%`);
  }

  const { data, error } = await query;
  if (error) { 
    console.error(error); 
    return alert("Erro ao carregar pedidos"); 
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
  if (!pedidos || pedidos.length === 0) return container.innerHTML = "<p>Nenhum pedido encontrado.</p>";

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    const timelineHTML = `
      <div class="timeline">
        <div class="timeline-step ${p.status==='Aguardando coleta'?'step-Aguardando':''}${p.status==='Entregue na Loja 5'?'step-Entregue':''}${p.status==='Finalizado'?'step-Finalizado':''}">Aguardando</div>
        <div class="timeline-step ${p.status==='Entregue na Loja 5'?'step-Entregue':''}${p.status==='Finalizado'?'step-Finalizado':''}">Entregue</div>
        <div class="timeline-step ${p.status==='Finalizado'?'step-Finalizado':''}">Finalizado</div>
      </div>
    `;

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <span class="status-tag ${p.status==='Aguardando coleta'?'status-Aguardando':p.status==='Entregue na Loja 5'?'status-Entregue':'status-Finalizado'}">${p.status}</span>
      <p><strong>Loja:</strong> ${p.loja_origem}</p>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento?"Sim":"Não"}</p>
      ${timelineHTML}

      <label>Observações:</label>
      <textarea id="obs-${p.id}" rows="3">${p.obs_loja5||""}</textarea>
      <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button><br><br>

      <label>Fotos:</label><br>
      <input type="file" id="antes-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','antes')">Enviar Antes</button>
      <div id="preview-antes-${p.id}"></div><br>

      <input type="file" id="depois-${p.id}" multiple>
      <button onclick="uploadFoto('${p.id}','depois')">Enviar Depois</button>
      <div id="preview-depois-${p.id}"></div><br>

      ${p.status!=='Finalizado'?`<button onclick="finalizarPedido('${p.id}')">Finalizar Serviço</button>`:''}
    `;

    container.appendChild(card);
  });
}

// ===============================
// Salvar observações
// ===============================
window.salvarObservacao = async function(id){
  const texto = document.getElementById(`obs-${id}`).value;
  const { error } = await supabase.from("pedidos").update({obs_loja5:texto}).eq("id",id);
  if(error){ console.error(error); return alert("Erro ao salvar observação"); }
  alert("Observação salva!");
}

// ===============================
// Upload múltiplo de fotos
// ===============================
window.uploadFoto = async function(id,tipo){
  const fileInput = document.getElementById(`${tipo}-${id}`);
  const files = fileInput?.files;
  if(!files || files.length===0) return alert(`Selecione fotos (${tipo})`);

  const previewDiv = document.getElementById(`preview-${tipo}-${id}`);
  previewDiv.innerHTML = "";

  for(const file of files){
    const path = `${tipo}_${id}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("fotos").upload(path,file);
    if(error){ console.error(error); continue; }

    const { data } = supabase.storage.from("fotos").getPublicUrl(path);
    const img = document.createElement("img");
    img.src = data.publicUrl;
    img.className = "preview";
    previewDiv.appendChild(img);

    // Atualizar tabela
    const field = tipo==='antes'?'foto_antes':'foto_depois';
    await supabase.from("pedidos").update({[field]:data.publicUrl}).eq("id",id);
  }

  alert("Fotos enviadas e preview atualizado!");
}

// ===============================
// Finalizar pedido
// ===============================
window.finalizarPedido = async function(id){
  const { error } = await supabase.from("pedidos").update({status:"Finalizado"}).eq("id",id);
  if(error){ console.error(error); return alert("Erro ao finalizar pedido"); }
  alert("Pedido finalizado!");
  carregarPedidos();
}

// ===============================
// Gráficos
// ===============================
let chartStatus, chartServico;
function atualizarGraficos(){
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach(p=>{
    statusCount[p.status] = (statusCount[p.status]||0)+1;
    servicoCount[p.tipo_servico] = (servicoCount[p.tipo_servico]||0)+1;
  });

  const ctxStatus = document.getElementById("graficoStatus").getContext("2d");
  if(chartStatus) chartStatus.destroy();
  chartStatus = new Chart(ctxStatus,{
    type:"doughnut",
    data:{
      labels:Object.keys(statusCount),
      datasets:[{data:Object.values(statusCount), backgroundColor:["#f0ad4e","#5bc0de","#5cb85c"]}]
    }
  });

  const ctxServico = document.getElementById("graficoServico").getContext("2d");
  if(chartServico) chartServico.destroy();
  chartServico = new Chart(ctxServico,{
    type:"bar",
    data:{
      labels:Object.keys(servicoCount),
      datasets:[{label:"Pedidos por Serviço", data:Object.values(servicoCount), backgroundColor:"#337ab7"}]
    },
    options:{scales:{y:{beginAtZero:true}}}
  });
}

// ===============================
// Inicialização
// ===============================
(async ()=>{
  usuarioLogado = await verificarLogin();
  if(!usuarioLogado) return;

  // Filtro
  btnFiltrar.addEventListener("click", carregarPedidos);

  // Carregar pedidos
  carregarPedidos();
})();
