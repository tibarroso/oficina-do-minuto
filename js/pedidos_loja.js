import { supabase } from "./supabase.js";

let usuarioLogado = null;

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

// Inicializar usuário logado
(async () => {
  usuarioLogado = await verificarLogin();
})();

// Botão criar pedido
const btnCriarPedido = document.getElementById("btnCriarPedido");
btnCriarPedido.addEventListener("click", async () => {
  if (!usuarioLogado) return alert("Usuário não logado.");

  const tipo = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipo) return alert("Selecione o tipo de serviço.");

  const { data, error } = await supabase
    .from("pedidos")
    .insert([{
      loja_origem: usuarioLogado.email,
      tipo_servico: tipo,
      eh_orcamento: orcamento,
      obs_loja_origem: observacao,
      status: "Aguardando coleta",
      criado_em: new Date().toISOString()
    }]);

  if (error) return alert("Erro ao criar pedido: " + error.message);

  alert("Pedido criado com sucesso!");

  // Atualizar lista de pedidos
  if (typeof carregarPedidos === "function") {
    carregarPedidos();
  }

  // Limpar formulário
  document.getElementById("tipo").value = "";
  document.getElementById("orcamento").checked = false;
  document.getElementById("observacao").value = "";
});
