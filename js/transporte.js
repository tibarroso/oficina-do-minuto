import { supabase } from "./supabase.js";

// =====================
// Inicialização
// =====================
async function carregarPedidos() {
  await carregarAguardando(); // Ida
  await carregarEmTransporte(); // Ida ou volta
  await carregarRetorno(); // Volta
}

// =====================
// Aguardando coleta (IDA)
// =====================
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
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Observação:</strong><br>
        <em>${p.obs_loja_origem || "—"}</em><br><br>

        <button onclick="iniciarTransporteIda('${p.id}')">Iniciar Transporte (Ida)</button>
      </div>
    `;
  });
}

// =====================
// Em transporte (IDA)
// =====================
async function carregarEmTransporte() {
  const { data } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Em transporte para Loja 5", "Em transporte para loja de origem"])
    .order("criado_em", { ascending: false });

  const div = document.getElementById("transporte");
  div.innerHTML = "";

  if (!data || data.length === 0) {
    div.innerHTML = "<p>Nenhum pedido em transporte.</p>";
    return;
  }

  data.forEach(p => {
    let botao = "";
    if (p.status === "Em transporte para Loja 5") {
      botao = `<button onclick="entregarLoja5('${p.id}')">Entregar na Loja 5</button>`;
    } else if (p.status === "Em transporte para loja de origem") {
      botao = `<button onclick="entregarLojaOrigem('${p.id}')">Entregar na Loja de Origem</button>`;
    }

    div.innerHTML += `
      <div class="card">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br><br>
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

        <button onclick="iniciarTransporteVolta('${p.id}')">Iniciar Retorno</button>
      </div>
    `;
  });
}

// =====================
// Ações
// =====================
window.iniciarTransporteIda = async (id) => {
  await supabase.from("pedidos").update({ status: "Em transporte para Loja 5" }).eq("id", id);
  await registrarEvento(id, "Transporte iniciado (ida)");
  carregarPedidos();
};

window.entregarLoja5 = async (id) => {
  await supabase.from("pedidos").update({ status: "Entregue na Loja 5" }).eq("id", id);
  await registrarEvento(id, "Entregue na Loja 5");
  carregarPedidos();
};

window.iniciarTransporteVolta = async (id) => {
  await supabase.from("pedidos").update({ status: "Em transporte para loja de origem" }).eq("id", id);
  await registrarEvento(id, "Transporte iniciado (volta)");
  carregarPedidos();
};

window.entregarLojaOrigem = async (id) => {
  await supabase.from("pedidos").update({ status: "Recebido na loja de origem" }).eq("id", id);
  await registrarEvento(id, "Entregue na Loja de Origem");
  carregarPedidos();
};

// =====================
// Registrar evento
// =====================
async function registrarEvento(pedidoId, evento) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("pedido_eventos").insert([{
    pedido_id: pedidoId,
    evento,
    criado_por: user.email,
    criado_em: new Date().toISOString()
  }]);
}

// =====================
carregarPedidos();
setInterval(carregarPedidos, 5000);
