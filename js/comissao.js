import { supabase } from "./supabase.js";
// nao remover linha do supabase pois vai ser utilizada neste arquivo no futuro.

// Configuração dinâmica da URL da API
const API_URL = (window.location.protocol === 'file:' || window.location.hostname === 'tibarroso.github.io')
    ? 'http://10.86.1.120:3000'
    : '';

// =========================================================================
// 🏢 FUNÇÃO PARA CARREGAR DINAMICAMENTE AS LOJAS DA API
// =========================================================================
async function carregarSelectLojas() {
    const selectLoja = document.getElementById("select-loja");
    if (!selectLoja) return;

    try {
        selectLoja.innerHTML = '<option value="">Carregando lojas...</option>';

        const resposta = await fetch(`${API_URL}/lojas/lista`);
        const resultado = await resposta.json();

        if (resultado.sucesso && resultado.lojas) {
            selectLoja.innerHTML = '<option value="">Selecione uma loja...</option>';

            resultado.lojas.forEach(oficina => {
                const option = document.createElement("option");
                option.value = oficina.loja;

                const statusBolinha = oficina.status === "Online" ? "🟢" : "🔴";
                option.textContent = `${statusBolinha} ${oficina.loja} - ${oficina.nome_oficina} (${oficina.status})`;
                
                selectLoja.appendChild(option);
            });
        } else {
            selectLoja.innerHTML = '<option value="">Erro ao carregar lojas</option>';
        }
    } catch (error) {
        console.error("Erro ao carregar as lojas:", error);
        selectLoja.innerHTML = '<option value="">Erro de conexão</option>';
    }
}

// Funções auxiliares de formatação
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

function formatarDataHora(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarApenasData(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// =========================================================================
// 📊 FUNÇÃO PARA GERAR O RELATÓRIO DE COMISSÃO
// =========================================================================
window.carregarRelatorio = async function() {
    const selectLoja = document.getElementById("select-loja");
    const codigoLoja = selectLoja ? selectLoja.value : '';
    
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    if (!codigoLoja || !dataInicio || !dataFim) {
        alert('Por favor, selecione uma loja e preencha as datas de início e fim.');
        return;
    }

    // Atualiza os cabeçalhos fixos do relatório na tela
    document.getElementById('lblPeriodo').innerText = `Período de ${formatarApenasData(dataInicio)} até ${formatarApenasData(dataFim)}`;
    document.getElementById('lblGeracao').innerText = formatarDataHora(new Date());

    try {
        const response = await fetch(`${API_URL}/api/relatorio-comissao?codigoLoja=${codigoLoja}&dataInicio=${dataInicio}&dataFim=${dataFim}`);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor ao buscar comissões.');
        }

        const dados = await response.json();

        if (dados.error) {
            alert(dados.error);
            return;
        }

        // Se não houver registros
        if (dados.length === 0) {
            document.getElementById('conteudoOperadores').innerHTML = `
                <div class="alert alert-warning text-center">Nenhum registro de comissão encontrado para o período informado.</div>
            `;
            document.getElementById('divValorGeral').style.display = 'none';
            const nomeLojaText = selectLoja.selectedOptions[0] ? selectLoja.selectedOptions[0].text : codigoLoja;
            document.getElementById('lblLoja').innerText = `Loja: ${nomeLojaText}`;
            return;
        }

        // Define o título da Loja formatado
        const nomeLojaText = selectLoja.selectedOptions[0] ? selectLoja.selectedOptions[0].text : codigoLoja;
        document.getElementById('lblLoja').innerText = `Loja: ${nomeLojaText}`;

        // Agrupando os registros por OperadorComissionado
        const agrupadoPorOperador = {};
        dados.forEach(item => {
            const operador = item.OperadorComissionado || 'NÃO INFORMADO';
            if (!agrupadoPorOperador[operador]) {
                agrupadoPorOperador[operador] = [];
            }
            agrupadoPorOperador[operador].push(item);
        });

        let htmlGeral = '';
        let valorGeralTotal = 0;

        for (const [operador, itens] of Object.entries(agrupadoPorOperador)) {
            let baseCalcTotal = 0;
            let premiaTotalOperador = 0;
            let linhasTabela = '';

            itens.forEach(item => {
                const vlTotal = Number(item.PrecoTotal || 0);
                const desc = Number(item.DescontoTotal || 0);
                const txAd = Number(item.ValorTaxaAdicionalComissao || 0);
                
                const baseCalc = vlTotal - desc + txAd; 
                const perc = Number(item.com_PorcentagemComissao || 0);
                const vlPrem = Number(item.ValorComissao || 0);

                baseCalcTotal += baseCalc;
                premiaTotalOperador += vlPrem;

                linhasTabela += `
                    <tr>
                        <td>${formatarApenasData(item.Data)}</td>
                        <td class="text-end">${formatarMoeda(vlTotal)}</td>
                        <td class="text-end">${formatarMoeda(desc)}</td>
                        <td class="text-end">${formatarMoeda(txAd)}</td>
                        <td class="text-end">${formatarMoeda(baseCalc)}</td>
                        <td class="text-center">${formatarMoeda(perc)}%</td>
                        <td class="text-end fw-bold">${formatarMoeda(vlPrem)}</td>
                    </tr>
                `;
            });

            valorGeralTotal += premiaTotalOperador;

            htmlGeral += `
                <div class="operador-section">
                    <h6 class="fw-bold text-primary mb-2">Operador: ${operador}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Execução</th>
                                    <th class="text-end">Vl. Total</th>
                                    <th class="text-end">Desc</th>
                                    <th class="text-end">Tx. Ad.</th>
                                    <th class="text-end">Base Calc.</th>
                                    <th class="text-center">% P.</th>
                                    <th class="text-end">Vl. Prem.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasTabela}
                            </tbody>
                        </table>
                    </div>
                    <div class="text-end mt-2">
                        <span class="me-4 text-muted">Valor Base de Cálculo: <strong>R$ ${formatarMoeda(baseCalcTotal)}</strong></span>
                        <span class="me-4 text-muted">Total Premiação por Execução: <strong>R$ ${formatarMoeda(premiaTotalOperador)}</strong></span>
                        <span class="text-dark">Total Geral da Premiação por Operador: <strong>R$ ${formatarMoeda(premiaTotalOperador)}</strong></span>
                    </div>
                </div>
            `;
        }

        document.getElementById('conteudoOperadores').innerHTML = htmlGeral;
        document.getElementById('lblValorGeralTotal').innerText = formatarMoeda(valorGeralTotal);
        document.getElementById('divValorGeral').style.display = 'block';

    } catch (error) {
        console.error('Erro ao processar o relatório de comissões:', error);
        alert('Ocorreu um erro ao buscar os dados da comissão. Verifique a conexão com o servidor.');
    }
};

// Executa a listagem de lojas automaticamente ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarSelectLojas();
});
