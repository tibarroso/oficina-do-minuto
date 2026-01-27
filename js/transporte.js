import { supabase } from "./supabase.js";

// Carregar pedidos aguardando coleta
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando coleta")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const lista = document.getElementById("listaPedidos");
  lista.innerHTML = "";

  if (!data || data.length === 0) {
    lista.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  data.forEach(p => {
    lista.innerHTML += `
      <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>

        <button onclick="iniciarTransporte('${p.id}')">Iniciar Transporte</button>
      </div>
    `;
  });
}

// Marcar como em transporte
window.iniciarTransporte = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Em transporte" })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao iniciar transporte");
    return;
  }

  alert("Pedido em transporte!");
  carregarPedidos();
};

// Carregar ao abrir a página
carregarPedidos();
