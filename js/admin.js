import { supabase } from "./supabase.js";

async function gerarRelatorio() {
  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const rel = document.getElementById("relatorio");
    rel.innerHTML = "<h3>Todos os pedidos</h3>";

    if (!pedidos || pedidos.length === 0) {
      rel.innerHTML += "<p>Nenhum pedido encontrado</p>";
      return;
    }

    // Cria fragmento para melhorar performance
    const fragment = document.createDocumentFragment();

    pedidos.forEach(p => {
      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.innerHTML = `
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br>
        <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}
        <hr>
      `;
      fragment.appendChild(div);
    });

    rel.appendChild(fragment);
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    alert("Erro ao carregar pedidos");
  }
}

// Inicialização
gerarRelatorio();
