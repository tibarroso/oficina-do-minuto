import { supabase } from "./supabase.js";

async function carregarPedidos() {
  await carregarAguardando();
  await carregarEmTransporte();
  await carregarRetorno();
}

async function carregarAguardando() {
  const { data } = await supabase
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

async function carregarEmTransporte() {
  const { data } = await supabase
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
      <div class="card">
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

async function carregarRetorno() {
  const { data } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Aguardando retorno do transporte")
    .order("criado_em", { ascending: false });

  const div = document.getElementById("retorno");
  if (!div) return;

  div.innerHTML = "";

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
        <button onclick="iniciarRetorno('${p.id}')">Iniciar Retorno</button>
      </div>
    `;
  });
}

// =====================
// Ações (expostas globalmente)
// =====================
window.iniciarTransporte = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Em transporte", retornando: false })
    .eq("id", id);

  if (error) { console.error(error); alert("Erro ao iniciar transporte"); }
  carregarPedidos();
};

window.entregarLoja5 = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Entregue na Loja 5" })
    .eq("id", id);

  if (error) { console.error(error); alert("Erro ao entregar na Loja 5"); }
  carregarPedidos();
};

window.iniciarRetorno = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Em transporte", retornando: true })
    .eq("id", id);

  if (error) { console.error(error); alert("Erro ao iniciar retorno"); }
  carregarPedidos();
};

window.entregarLojaOrigem = async function (id) {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "Entregue na loja de origem", retornando: false })
    .eq("id", id);

  if (error) { console.error(error); alert("Erro ao entregar na origem"); }
  carregarPedidos();
};

// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000);
