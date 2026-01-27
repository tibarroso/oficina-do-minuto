import { supabase } from "./supabase.js";

async function gerarRelatorio() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos");
    return;
  }

  const rel = document.getElementById("relatorio");
  rel.innerHTML = "<h3>Todos os pedidos</h3>";

  if (data.length === 0) {
    rel.innerHTML += "<p>Nenhum pedido encontrado</p>";
    return;
  }

  data.forEach(p => {
    rel.innerHTML += `
      <div style="margin-bottom:8px">
        <strong>OS:</strong> ${p.id}<br>
        <strong>Loja:</strong> ${p.loja_origem}<br>
        <strong>Serviço:</strong> ${p.tipo_servico}<br>
        <strong>Status:</strong> ${p.status}<br>
        <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}
        <hr>
      </div>
    `;
  });
}

gerarRelatorio();

