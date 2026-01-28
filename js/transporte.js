import { supabase } from "./supabase.js";

// =====================
// Carregar todos os pedidos
// =====================
async function carregarPedidos() {
  await carregarAguardando();
  await carregarEmTransporte();
  await carregarLoja5(); // pedidos retornando da Loja 5
}

// =====================
// Aguardando coleta
// =====================
async function carregarAguardando() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando coleta")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("aguardando");
  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  data.forEach(p => {
    div.innerHTML += `
      <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br><br>

        <button onclick="iniciarTransporte('${p.id}')">Iniciar Transporte → Loja 5</button>
      </div>
    `;
  });
}

// =====================
// Em transporte
// =====================
async function carregarEmTransporte() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Em transporte")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("transporte");
  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido em transporte.</p>";
    return;
  }

  data.forEach(p => {
    div.innerHTML += `
      <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br><br>

        <button onclick="entregarLoja5('${p.id}')">Entregar na Loja 5</button>
      </div>
    `;
  });
}

// =====================
// Retorno da Loja 5
// =====================
async function carregarLoja5() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Retorno da Loja 5")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("retornoLoja");
  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido retornando da Loja 5.</p>";
    return;
  }

  data.forEach(p => {
    div.innerHTML += `
      <div style="border:1px solid #ccc; padding:8px; margin-bottom:8px;">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br><br>

        <button onclick="entregarLojaOrigem('${p.id}')">Entregar de volta à loja origem</button>
      </div>
    `;
  });
}

// =====================
// Ações
// =====================
window.iniciarTransporte = async function (id) {
  await supabase.from("pedidos").update({ status: "Em transporte" }).eq("id", id);
  await registrarEvento(id, "Transporte iniciado", "Pedido saiu da loja para Loja 5");
  carregarPedidos();
};

window.entregarLoja5 = async function (id) {
  await supabase.from("pedidos").update({ status: "Entregue na Loja 5" }).eq("id", id);
  await registrarEvento(id, "Entregue na Loja 5", "Pedido entregue para processamento");
  carregarPedidos();
};

// Entregar pedido de volta da Loja 5 para loja de origem
window.entregarLojaOrigem = async function (id) {
  await supabase.from("pedidos").update({ status: "Entregue na loja de origem" }).eq("id", id);
  await registrarEvento(id, "Retorno da Loja 5", "Pedido retornou à loja de origem");
  carregarPedidos();
};

// =====================
// Registrar evento
// =====================
async function registrarEvento(pedidoId, evento, observacao) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: "Transporte"
  }]);
}

// =====================
// Inicialização
// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000); // atualizar a cada 5 segundos
