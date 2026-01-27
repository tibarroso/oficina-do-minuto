import { supabase } from "./supabase.js";

async function carregarPedidos() {
  await carregarAguardando();
  await carregarEmTransporte();
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

        <button onclick="iniciarTransporte('${p.id}')">
          Iniciar Transporte
        </button>
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

        <button onclick="entregarLoja5('${p.id}')">
          Entregar na Loja 5
        </button>
      </div>
    `;
  });
}

// =====================
// Ações
// =====================
window.iniciarTransporte = async function (id) {
  await supabase
    .from("pedidos")
    .update({ status: "Em transporte" })
    .eq("id", id);

  carregarPedidos();
};

window.entregarLoja5 = async function (id) {
  await supabase
    .from("pedidos")
    .update({ status: "Entregue na Loja 5" })
    .eq("id", id);

  carregarPedidos();
};

// Inicialização
carregarPedidos();
