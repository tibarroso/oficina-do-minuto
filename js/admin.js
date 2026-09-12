import { supabase } from "./supabase.js";

// Função auxiliar para criar badges de status elegantes e coloridos
function obterEstiloStatus(status) {
  const s = status.toLowerCase();
  if (s.includes("finalizado") || s.includes("entregue")) {
    return { bg: "#e8f8f5", texto: "#18BC9C" }; // Verde sutil
  }
  if (s.includes("transporte") || s.includes("coleta")) {
    return { bg: "#eef2f7", texto: "#2980b9" }; // Azul sutil
  }
  if (s.includes("retrabalho") || s.includes("orçamento")) {
    return { bg: "#fdedec", texto: "#e74c3c" }; // Vermelho sutil
  }
  return { bg: "#fef9e7", texto: "#f39c12" }; // Amarelo/Laranja sutil
}

async function gerarRelatorio() {
  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    const rel = document.getElementById("relatorio");
    rel.innerHTML = ""; // Limpa o carregando

    if (!pedidos || pedidos.length === 0) {
      rel.innerHTML = "<p style='text-align: center; color: #777; padding: 20px;'>Nenhum pedido encontrado no banco de dados.</p>";
      return;
    }

    // Criação da tabela elegante com estilos embutidos limpos
    const tabela = document.createElement("table");
    tabela.style.width = "100%";
    tabela.style.borderCollapse = "collapse";
    tabela.style.fontFamily = "'Poppins', sans-serif";
    tabela.style.fontSize = "14px";

    // Cabeçalho da Tabela
    tabela.innerHTML = `
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ebd; text-align: left;">
          <th style="padding: 15px; color: #555; font-weight: 600;">OS</th>
          <th style="padding: 15px; color: #555; font-weight: 600;">Loja Origem</th>
          <th style="padding: 15px; color: #555; font-weight: 600;">Serviço</th>
          <th style="padding: 15px; color: #555; font-weight: 600;">Status</th>
          <th style="padding: 15px; color: #555; font-weight: 600;">Orçamento</th>
          <th style="padding: 15px; color: #555; font-weight: 600;">Data do Registro</th>
        </tr>
      </thead>
      <tbody id="corpoTabela"></tbody>
    `;

    const corpoTabela = tabela.querySelector("#corpoTabela");

    pedidos.forEach((p, index) => {
      const tr = document.createElement("tr");
      
      // Efeito zebra alternando as cores das linhas
      tr.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#fbfcfc";
      tr.style.borderBottom = "1px solid #f1f1f1";
      tr.style.transition = "background-color 0.2s";
      
      // Efeito hover elegante ao passar o mouse na linha
      tr.addEventListener("mouseover", () => tr.style.backgroundColor = "#f2f4f4");
      tr.addEventListener("mouseout", () => tr.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#fbfcfc");

      // Tratamentos de valores nulos
      const osId = p.id ?? "N/A";
      const lojaOrigem = p.loja_origem ?? "Não informada";
      const tipoServico = p.tipo_servico ?? "Não especificado";
      const statusPedido = p.status ?? "Sem status";
      
      // Formata as cores do status baseado no texto retornado
      const coresStatus = obterEstiloStatus(statusPedido);

      // Tratamento da Data
      let dataFormatada = "⚠️ Não informada";
      if (p.criado_em) {
        const data = new Date(p.criado_em);
        dataFormatada = data.toLocaleDateString("pt-BR") + " - " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }

      tr.innerHTML = `
        <td style="padding: 15px; font-weight: 600; color: #2c3e50;">#${osId}</td>
        <td style="padding: 15px; color: #555;">${lojaOrigem}</td>
        <td style="padding: 15px; color: #555;"><span style="background: #f0f3f4; padding: 4px 8px; border-radius: 6px; font-size: 13px;">${tipoServico}</span></td>
        <td style="padding: 15px;">
          <span style="background-color: ${coresStatus.bg}; color: ${coresStatus.texto}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
            ${statusPedido}
          </span>
        </td>
        <td style="padding: 15px; color: #555;">
          ${p.eh_orcamento ? '<span style="color: #e74c3c; font-weight: 500;">⚠️ Sim</span>' : "Não"}
        </td>
        <td style="padding: 15px; color: #888; font-size: 13px;">${dataFormatada}</td>
      `;

      corpoTabela.appendChild(tr);
    });

    rel.appendChild(tabela);
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    const rel = document.getElementById("relatorio");
    rel.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Erro ao carregar dados. Detalhes: ${err.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  gerarRelatorio();
});
