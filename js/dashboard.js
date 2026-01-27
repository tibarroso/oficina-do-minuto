import { supabase } from "./supabase.js";

// ===============================
// Carregar pedidos
// ===============================
export async function carregarPedidos() {
  const status = document.getElementById("filtroStatus").value;
  const pesquisa = document.getElementById("pesquisaOS").value.trim();

  let query = supabase.from("pedidos").select("*").order("criado_em",{ascending:false});

  if(status) query = query.eq("status", status);
  if(pesquisa) query = query.ilike("id", `%${pesquisa}%`).or(`loja_origem.ilike.%${pesquisa}%`);

  const { data, error } = await query;

  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if(error) { console.error(error); return alert("Erro ao carregar pedidos"); }
  if(!data || data.length === 0) return container.innerHTML="<p>Nenhum pedido encontrado.</p>";

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <p><strong>Loja:</strong> ${p.loja_origem}</p>
      <p><strong>Serviço:</strong> ${p.tipo_servico}</p>
      <p><strong>Status:</strong> ${p.status}</p>
      <p><strong>Orçamento:</strong> ${p.eh_orcamento?"Sim":"Não"}</p>

      <label>Observações:</label>
      <textarea id="obs-${p.id}" rows="3">${p.obs_loja5||""}</textarea>
      <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button><br><br>

      <label>Foto Antes:</label>
      <input type="file" id="antes-${p.id}">
      <button onclick="uploadFoto('${p.id}','antes')">Enviar Antes</button><br><br>

      <label>Foto Depois:</label>
      <input type="file" id="depois-${p.id}">
      <button onclick="uploadFoto('${p.id}','depois')">Enviar Depois</button><br><br>

      ${p.status !== "Finalizado" ? `<button onclick="finalizarPedido('${p.id}')">Finalizar Serviço</button>` : ""}
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
// Upload foto
// ===============================
window.uploadFoto = async function(id,tipo){
  const fileInput = document.getElementById(`${tipo}-${id}`);
  const file = fileInput?.files[0];
  if(!file) return alert(`Selecione uma foto (${tipo})`);

  const path = `${tipo}_${id}_${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("fotos").upload(path, file);
  if(error){ console.error(error); return alert("Erro ao enviar foto: "+error.message); }
  alert("Foto enviada!");
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
// Inicialização
// ===============================
carregarPedidos();
