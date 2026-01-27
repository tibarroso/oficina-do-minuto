import { supabase } from "./supabase.js";

// ===============================
// Carregar pedidos com filtro e pesquisa
// ===============================
async function carregarPedidos() {
  const status = document.getElementById("filtroStatus").value;
  const pesquisa = document.getElementById("pesquisaOS").value.trim();

  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending:false });

  if (status) query = query.eq("status", status);
  if (pesquisa) query = query.ilike("id", `%${pesquisa}%`).or(`loja_origem.ilike.%${pesquisa}%`);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  let html = "<table><tr><th>OS</th><th>Loja Origem</th><th>Serviço</th><th>Status</th><th>Orçamento</th><th>Observações</th><th>Fotos</th><th>Histórico</th><th>Ações</th></tr>";

  for (let p of data) {
    // Fotos ANTES/DEPOIS
    const fotosAntes = await listarFotos(p.id, "antes");
    const fotosDepois = await listarFotos(p.id, "depois");

    html += `<tr>
      <td>${p.id}</td>
      <td>${p.loja_origem}</td>
      <td>${p.tipo_servico}</td>
      <td>${p.status}</td>
      <td>${p.eh_orcamento ? "Sim" : "Não"}</td>
      <td>${p.obs_loja5 || ""}</td>
      <td>
        Antes: ${fotosAntes.join("<br>")}<br>
        Depois: ${fotosDepois.join("<br>")}
      </td>
      <td><button onclick="verTimeline('${p.id}')">Ver Histórico</button></td>
      <td>
        ${p.status !== "Finalizado" ? `<button onclick="atualizarStatus('${p.id}','Finalizado')">Finalizar</button>` : ""}
      </td>
    </tr>`;
  }

  html += "</table>";
  container.innerHTML = html;
}

// ===============================
// Listar fotos do Supabase Storage
// ===============================
async function listarFotos(pedidoId, tipo) {
  const { data, error } = await supabase.storage.from("fotos").list("", { search:`${tipo}_${pedidoId}_` });
  if (error) return ["Erro ao carregar fotos"];
  return data.map(f => `<a href="${supabase.storage.from("fotos").getPublicUrl(f.name).data.publicUrl}" target="_blank">${f.name}</a>`);
}

// ===============================
// Atualizar status do pedido
// ===============================
window.atualizarStatus = async function(pedidoId, novoStatus) {
  const { error } = await supabase.from("pedidos").update({status:novoStatus}).eq("id", pedidoId);
  if (error) return alert("Erro ao atualizar status: "+error.message);
  alert("Status atualizado!");
  carregarPedidos();
}

// ===============================
// Ver linha do tempo (histórico)
// ===============================
window.verTimeline = async function(pedidoId) {
  const { data } = await supabase.from("pedido_eventos").select("*").eq("pedido_id", pedidoId).order("criado_em",{ascending:true});
  if(!data || data.length===0) return alert("Sem histórico");
  let html = "Histórico do pedido:\n\n";
  data.forEach(e => {
    html += `${e.criado_por} - ${e.evento} - ${e.observacao || ""} - ${new Date(e.criado_em).toLocaleString()}\n`;
  });
  alert(html);
}

// ===============================
// Inicialização
// ===============================
carregarPedidos();
