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
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Observação (Ticket / Nº do saco):</strong><br>
        <em>${p.obs_loja_origem || "—"}</em><br><br>

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
    const botao =
      p.status === "Em transporte"
        ? `<button onclick="entregarLoja5('${p.id}')">Entregar na Loja 5</button>`
        : "";

    div.innerHTML += `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Observação (Ticket / Nº do saco):</strong><br>
        <em>${p.obs_loja_origem || "—"}</em><br><br>

        ${botao}
      </div>
    `;
  });
}

// =====================
// Aguardando retorno (VOLTA)
// =====================
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
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Observação (Ticket / Nº do saco):</strong><br>
        <em>${p.obs_loja_origem || "—"}</em><br><br>

        <button onclick="iniciarRetorno('${p.id}')">
          Iniciar Retorno
        </button>
      </div>
    `;
  });
}

// =====================
// Ações
// =====================
window.iniciarTransporte = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Em transporte" })
    .eq("id", id);

  carregarPedidos();
};

window.entregarLoja5 = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Entregue na Loja 5" })
    .eq("id", id);

  carregarPedidos();
};

window.iniciarRetorno = async (id) => {
  await supabase
    .from("pedidos")
    .update({ status: "Em transporte" })
    .eq("id", id);

  carregarPedidos();
};

// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000);
