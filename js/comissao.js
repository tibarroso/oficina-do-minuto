import { supabase } from "./supabase.js";
// nao remover linha do supabase pois vai ser utilizada neste arquivo no futuro.

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';
 // const API_URL = 'http://10.86.1.120:3000';

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
    const partes = dataStr.split('T')[0].split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// =========================================================================
// 📊 FUNÇÃO PARA GERAR O RELATÓRIO DE COMISSÃO POR PERÍODO LIVRE
// =========================================================================
window.carregarRelatorio = async function() {
    const selectLoja = document.getElementById("select-loja");
    const codigoLoja = selectLoja ? selectLoja.value : '';
    
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    if (!codigoLoja) {
        alert('Por favor, selecione uma loja.');
        return;
    }

    if (!dataInicio || !dataFim) {
        alert('Por favor, preencha a Data Início e a Data Fim.');
        return;
    }

    if (dataInicio > dataFim) {
        alert('A data de início não pode ser maior que a data fim.');
        return;
    }

    // Atualiza os cabeçalhos fixos do relatório na tela
    const lblPeriodo = document.getElementById('lblPeriodo');
    if (lblPeriodo) lblPeriodo.innerText = `Período de ${formatarApenasData(dataInicio)} até ${formatarApenasData(dataFim)}`;
    
    const lblGeracao = document.getElementById('lblGeracao');
    if (lblGeracao) lblGeracao.innerText = formatarDataHora(new Date());

    try {
        // Exibe feedback de carregamento
        const conteudoOp = document.getElementById('conteudoOperadores');
        if (conteudoOp) {
            conteudoOp.innerHTML = `<div class="text-center text-muted py-5">Buscando dados do período selecionado...</div>`;
        }

        const divValorGeral = document.getElementById('divValorGeral');
        if (divValorGeral) divValorGeral.style.display = 'none';
        
        // Zera os contadores enquanto busca
        const lblTotalOp = document.getElementById('lblTotalOperadores');
        if (lblTotalOp) lblTotalOp.innerText = `Qtd Operadores: 0`;
        
        const lblTotalPag = document.getElementById('lblTotalPaginas');
        if (lblTotalPag) lblTotalPag.innerText = `Total de Páginas: 1`;

        const urlRequisicao = `${API_URL}/api/relatorio-comissao?codigoLoja=${codigoLoja}&dataInicio=${dataInicio}&dataFim=${dataFim}`;
        console.log("Requisitando URL:", urlRequisicao);

        const response = await fetch(urlRequisicao);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ao buscar comissões.`);
        }

        const dados = await response.json();

        if (dados.error) {
            alert(dados.error);
            if (conteudoOp) conteudoOp.innerHTML = `<div class="alert alert-danger text-center">${dados.error}</div>`;
            return;
        }

        // Se não houver registros no período escolhido
        if (!Array.isArray(dados) || dados.length === 0) {
            if (conteudoOp) {
                conteudoOp.innerHTML = `
                    <div class="alert alert-warning text-center">Nenhum registro de comissão encontrado para o período de ${formatarApenasData(dataInicio)} até ${formatarApenasData(dataFim)}.</div>
                `;
            }
            if (divValorGeral) divValorGeral.style.display = 'none';
            
            const nomeLojaText = selectLoja.selectedOptions[0] ? selectLoja.selectedOptions[0].text : codigoLoja;
            const lblLoja = document.getElementById('lblLoja');
            if (lblLoja) lblLoja.innerText = `Loja: ${nomeLojaText}`;
            return;
        }

        // Define o título da Loja formatado
        const nomeLojaText = selectLoja.selectedOptions[0] ? selectLoja.selectedOptions[0].text : codigoLoja;
        const lblLoja = document.getElementById('lblLoja');
        if (lblLoja) lblLoja.innerText = `Loja: ${nomeLojaText}`;

        // Agrupando os registros por OperadorComissionado
        const agrupadoPorOperador = {};
        dados.forEach(item => {
            const operador = item.OperadorComissionado || 'NÃO INFORMADO';
            if (!agrupadoPorOperador[operador]) {
                agrupadoPorOperador[operador] = [];
            }
            agrupadoPorOperador[operador].push(item);
        });

        // Atualiza a quantidade de operadores
        const totalOperadores = Object.keys(agrupadoPorOperador).length;
        if (lblTotalOp) lblTotalOp.innerText = `Qtd Operadores: ${totalOperadores}`;

        let htmlGeral = '';
        let valorGeralTotal = 0;

        for (const [operador, itens] of Object.entries(agrupadoPorOperador)) {
            let baseCalcTotal = 0;
            let premiaTotalOperador = 0;

            itens.forEach(item => {
                const vlTotal = Number(item.PrecoTotal || 0);
                const desc = Number(item.DescontoTotal || 0);
                const txAd = Number(item.ValorTaxaAdicionalComissao || 0);
                
                const baseCalc = vlTotal - desc + txAd; 
                const vlPrem = Number(item.ValorComissao || 0);

                baseCalcTotal += baseCalc;
                premiaTotalOperador += vlPrem;
            });

            valorGeralTotal += premiaTotalOperador;

            htmlGeral += `
                <div class="operador-section mb-3 p-3 border rounded bg-white shadow-sm">
                    <div class="text-primary fw-bold mb-2" style="font-size: 1.35rem;">Operador: ${operador}</div>
                    <div class="text-secondary" style="font-size: 1.05rem; line-height: 1.6;">
                        <div>Valor Base de Cálculo: <strong>R$ ${formatarMoeda(baseCalcTotal)}</strong></div>
                        <div>Total Geral da Premiação por Operador: <strong class="text-success">R$ ${formatarMoeda(premiaTotalOperador)}</strong></div>
                    </div>
                </div>
            `;
        }

        if (conteudoOp) conteudoOp.innerHTML = htmlGeral;
        
        const lblValorGeralTotal = document.getElementById('lblValorGeralTotal');
        if (lblValorGeralTotal) lblValorGeralTotal.innerText = formatarMoeda(valorGeralTotal);
        
        if (divValorGeral) divValorGeral.style.display = 'inline-flex';

        // 📐 CÁLCULO DINÂMICO DA QUANTIDADE DE PÁGINAS
        setTimeout(() => {
            const relatorioArea = document.getElementById('relatorioArea');
            if (relatorioArea) {
                const alturaConteudo = relatorioArea.scrollHeight;
                const alturaUtilA4 = 920; 
                const paginasDinamicas = Math.max(1, Math.ceil(alturaConteudo / alturaUtilA4));
                const lblTotalPag = document.getElementById('lblTotalPaginas');
                if (lblTotalPag) lblTotalPag.innerText = `Total de Páginas: ${paginasDinamicas}`;
            }
        }, 50);

    } catch (error) {
        console.error('Erro ao processar o relatório de comissões:', error);
        alert('Ocorreu um erro ao buscar os dados da comissão. Verifique a conexão com o servidor.');
        const conteudoOp = document.getElementById('conteudoOperadores');
        if (conteudoOp) {
            conteudoOp.innerHTML = `<div class="alert alert-danger text-center">Erro de conexão ao buscar os dados.</div>`;
        }
    }
};

// Executa a listagem de lojas automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarSelectLojas();

    const inputInicio = document.getElementById('dataInicio');
    const inputFim = document.getElementById('dataFim');

    if (inputInicio && !inputInicio.value) {
        const d = new Date();
        inputInicio.value = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    }
    if (inputFim && !inputFim.value) {
        const d = new Date();
        inputFim.value = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    }
});
