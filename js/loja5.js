import { supabase } from "./supabase.js";

const form = document.getElementById("formLoja5");
const containerPedidos = document.getElementById("containerPedidos");

// Evento de envio do formulário para criar pedido
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const tipoServico = document.getElementById("tipoServico").value;
  const observacaoLoja5 = document.getElementById("observacaoLoja5").value;

  if (!tipoServico) {
    alert("Selecione o tipo de serviço.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .insert([
        {
          tipo_servico: tipoServico,
          obs_loja5: observacaoLoja5,
          status: "Entregue na Loja 5",
          criado_em: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao criar pedido.");
      return;
    }

    alert("Pedido criado com sucesso!");
    form.reset();
    carregarPedidos();
  } catch (err) {
    console.error("Erro inesperado:", err);
    alert("Erro inesperado ao criar pedido.");
  }
});

// Função para carregar e listar pedidos da Loja 5
async function carregarPedidos() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("status", "Entregue na Loja 5")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar pedidos:", error);
      containerPedidos.innerHTML = "<p>Erro ao carregar pedidos.</p>";
      return;
    }

    if (!data.length) {
      containerPedidos.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    containerPedidos.innerHTML = "";

    data.forEach((pedido) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <strong>OS:</strong> ${pedido.id}<br>
        <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
        <strong>Observação Loja 5:</strong><br><em>${pedido.obs_loja5 || "—"}</em>
        <br><small>Criado em: ${new Date(pedido.criado_em).toLocaleString()}</small>
      `;
      containerPedidos.appendChild(card);
    });
  } catch (err) {
    console.error("Erro inesperado ao carregar pedidos:", err);
    containerPedidos.innerHTML = "<p>Erro inesperado ao carregar pedidos.</p>";
  }
}

// Carrega os pedidos assim que a página carrega
carregarPedidos();
