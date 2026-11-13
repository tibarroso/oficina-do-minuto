// Função auxiliar para formatar valores monetários no padrão brasileiro (R$)
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Função auxiliar para formatar Data e Hora (ex: para o campo Geração)
function formatarDataHora(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Função auxiliar para formatar apenas a Data (DD/MM/AAAA)
function formatarApenasData(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// Função principal disparada pelo botão "Gerar Relatório"
async function carregarRelatorio() {
    const codigoLoja = document.getElementById('codigoLoja').value;
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    if (!codigoLoja || !dataInicio || !dataFim) {
        alert('Por favor, preencha todos os campos do filtro (Loja, Data Início e Data Fim).');
        return;
    }

    // Atualiza os cabeçalhos fixos do relatório na tela
    document.getElementById('lblPeriodo').innerText = `Período de ${formatarApenasData(dataInicio)} até ${formatarApenasData(dataFim)}`;
    document.getElementById('lblGeracao').innerText = formatarDataHora(new Date());

    try {
        // Chamada para a rota do backend que criamos anteriormente
        const response = await fetch(`/api/relatorio-comissao?codigoLoja=${codigoLoja}&dataInicio=${dataInicio}&dataFim=${dataFim}`);
        
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
            document.getElementById('lblLoja').innerText = `Loja: ${codigoLoja}`;
            return;
        }

        // Define o título da Loja
        document.getElementById('lblLoja').innerText = `Loja: ${dados[0].com_CodigoLoja} - OFICINA DO MINUTO`;

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

        // Itera sobre cada operador para montar sua tabela e subtotais
        for (const [operador, itens] of Object.entries(agrupadoPorOperador)) {
            let baseCalcTotal = 0;
            let premiaTotalOperador = 0;
            let linhasTabela = '';

            itens.forEach(item => {
                const vlTotal = Number(item.PrecoTotal || 0);
                const desc = Number(item.DescontoTotal || 0);
                const txAd = Number(item.ValorTaxaAdicionalComissao || 0);
                
                // Base de Cálculo = Preço Total - Desconto + Taxa Adicional
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

            // Soma acumulada para o valor geral da premiação de todos os operadores
            valorGeralTotal += premiaTotalOperador;

            // Bloco HTML renderizado para cada operador
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

        // Injeta o conteúdo gerado no HTML e atualiza o rodapé geral com o valor somado de todos os operadores
        document.getElementById('conteudoOperadores').innerHTML = htmlGeral;
        document.getElementById('lblValorGeralTotal').innerText = formatarMoeda(valorGeralTotal);
        document.getElementById('divValorGeral').style.display = 'block';

    } catch (error) {
        console.error('Erro ao processar o relatório de comissões:', error);
        alert('Ocorreu um erro ao buscar os dados da comissão. Verifique a conexão com o servidor.');
    }
}
