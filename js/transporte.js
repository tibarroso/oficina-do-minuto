import { supabase } from "./supabase.js";

// =====================
// Inicialização
// =====================
async function carregarPedidos() {
  await carregarAguardando();
  await carregarEmTransporte();
  await carregarRetorno();
}

// =====================
// Pedidos aguardando coleta (ida Loja → Loja 5)
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

        <button onclick="iniciarTransporte('${p.id}')">Iniciar Transporte</button>
      </div>
    `;
  });
}

// =====================
// Pedidos em transporte (ida Loja → Loja 5)
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
// Pedidos retornando (Loja 5 → Loja de origem)
// =====================
async function carregarRetorno() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando retorno do transporte")
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

        <button onclick="entregarLojaOrigem('${p.id}')">Entregar à loja de origem</button>
      </div>
    `;
  });
}

// =====================
// Ações do transporte
// =====================
window.iniciarTransporte = async function (id) {
  await supabase.from("pedidos").update({ status: "Em transporte" }).eq("id", id);
  await registrarEvento(id, "Transporte iniciado", "Pedido retirado da loja de origem");
  carregarPedidos();
};

window.entregarLoja5 = async function (id) {
  await supabase.from("pedidos").update({ status: "Entregue na Loja 5" }).eq("id", id);
  await registrarEvento(id, "Entregue na Loja 5", "Pedido entregue para processamento da Loja 5");

  // Alterar status para retorno após processamento da Loja 5 (simulação)
  await supabase.from("pedidos").update({ status: "Aguardando retorno do transporte" }).eq("id", id);
  carregarPedidos();
};

window.entregarLojaOrigem = async function (id) {
  await supabase.from("pedidos").update({ status: "Entregue na loja de origem" }).eq("id", id);
  await registrarEvento(id, "Transporte finalizou retorno", "Pedido entregue na loja de origem");
  carregarPedidos();
};

// =====================
// Registrar evento na linha do tempo
// =====================
async function registrarEvento(pedidoId, evento, observacao) {
  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    observacao,
    criado_por: "Transporte",
    criado_em: new Date()
  }]);
}

// =====================
// Inicialização
// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000); // Atualiza automaticamente a cada 5s
