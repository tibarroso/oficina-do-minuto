import { supabase } from "./supabase.js";

let usuarioLogado = null;

async function verificarLogin() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert("Usuário não logado");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Entregue na Loja 5")
    .order("criado_em", { ascending: false });

  const container = document.getElementById("pedidos");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum pedido disponível para a Loja 5.</p>";
    return;
  }

  data.forEach(p => {
    container.innerHTML += `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>

        <label for="obs-${p.id}">Observações Loja 5</label><br>
        <textarea id="obs-${p.id}" rows="3" style="width:100%;">${p.obs_loja5 || ""}</textarea><br><br>

        <button onclick="salvarObservacao('${p.id}')">Salvar Observação</button>
        <button onclick="concluirServico('${p.id}')">Concluir Serviço</button>
      </div>
    `;
  });
}

window.salvarObservacao = async (id) => {
  const texto = document.getElementById(`obs-${id}`).value;

  await supabase.from("pedidos").update({
    obs_loja5: texto,
    status: "Em serviço"
  }).eq("id", id);

  alert("Observação salva!");
  carregarPedidos();
};

window.concluirServico = async (id) => {
  await supabase.from("pedidos").update({
    status: "Aguardando retorno do transporte"
  }).eq("id", id);

  alert("Serviço concluído! Transporte será acionado.");
  carregarPedidos();
};

// ===============================
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (usuarioLogado) carregarPedidos();
})();
