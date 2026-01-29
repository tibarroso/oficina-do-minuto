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
// Aguardando coleta (IDA)
// =====================
async function carregarAguardando() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .ilike("status", "aguardando coleta")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("aguardando");
  div.innerHTML = "";

  if (error) {
    console.error(error);
    div.innerHTML = "<p>Erro ao carregar.</p>";
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido aguardando coleta.</p>";
    return;
  }

  data.forEach(p => {
    div.innerHTML += `
      <div class="card">
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
// Em transporte (IDA ou VOLTA)
// =====================
async function carregarEmTransporte() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .ilike("status", "em transporte")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("transporte");
  div.innerHTML = "";

  if (error) {
    console.error(error);
    div.innerHTML = "<p>Erro ao carregar.</p>";
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido em transporte.</p>";
    return;
  }

  data.forEach(p => {
    const botao = p.retornando
      ? `<button onclick="entregarLojaOrigem('${p.id}')">Entregar na loja de origem</button>`
      : `<button onclick="entregarLoja5('${p.id}')">Entregar na Loja 5</button>`;

    div.innerHTML += `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Fluxo:</strong> ${p.retornando ? "Retorno" : "Ida"}<br><br>
        ${botao}
      </div>
    `;
  });
}

// =====================
// Aguardando retorno (VOLTA)
// =====================
async function carregarRetorno() {
  const div = document.getElementById("retorno");
  if (!div) return;

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .ilike("status", "aguardando retorno do transporte")
    .order("criado_em", { ascending: false });

  div.innerHTML = "";

  if (error) {
    console.error(error);
    div.innerHTML = "<p>Erro ao carregar.</p>";
    return;
  }

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido aguardando retorno.</p>";
    return;
  }

  data.forEach(p => {
    div.innerHTML += `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja origem:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br><br>
        <button onclick="iniciarRetorno('${p.id}')">
          Iniciar Retorno
        </button>
      </div>
    `;
  });
}

// =====================
// AÇÕES
// =====================
window.iniciarTransporte = async (id) => {
  await supabase.from("pedidos").update({
    status: "Em transporte",
    retornando: false
  }).eq("id", id);

  carregarPedidos();
};

window.entregarLoja5 = async (id) => {
  await supabase.from("pedidos").update({
    status: "Entregue na Loja 5"
  }).eq("id", id);

  carregarPedidos();
};

window.iniciarRetorno = async (id) => {
  await supabase.from("pedidos").update({
    status: "Em transporte",
    retornando: true
  }).eq("id", id);

  carregarPedidos();
};

window.entregarLojaOrigem = async (id) => {
  await supabase.from("pedidos").update({
    status: "Entregue na loja de origem",
    retornando: false
  }).eq("id", id);

  carregarPedidos();
};

// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000);
