import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Seleção dos elementos do DOM baseados na estrutura do Cliente.html
    const inputs = document.querySelectorAll('.search-panel input');
    const inputTelefone = inputs[0];
    const inputNome = inputs[1];
    const inputCodigo = inputs[2];
    const inputEndereco = inputs[3];
    const inputCpfCnpj = inputs[4];

    const btnSearch = document.querySelector('.btn-search');
    const listBox = document.querySelector('.list-box');
    
    const tabelasContainer = document.querySelectorAll('.table-container');
    const tabelaAbertos = tabelasContainer[0] ? tabelasContainer[0].querySelector('tbody') : null;
    const tabelaEntregues = tabelasContainer[1] ? tabelasContainer[1].querySelector('tbody') : null;
    
    const detalhesEndereco = document.querySelector('.details-box');

    let cacheClientes = {}; // Armazena os clientes e seus tickets agrupados

    // Função principal para buscar dados da API
    async function realizarBusca() {
        const nome = inputNome.value.trim();
        const telefone = inputTelefone.value.trim();

        if (!nome && !telefone) {
            alert('Por favor, informe ao menos o Nome ou o Telefone para pesquisar.');
            return;
        }

        try {
            listBox.innerHTML = '<div style="padding: 5px; color: #666;">Pesquisando...</div>';
            
            const url = `${API_URL}/api/oficina/buscar?nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}`;
            const response = await fetch(url);
            const resultado = await response.json();

            if (!resultado.sucesso || !resultado.dados || resultado.dados.length === 0) {
                listBox.innerHTML = '<div style="padding: 5px; color: #666;">Nenhum registro encontrado.</div>';
                limparTabelasETela();
                return;
            }

            // Agrupa os tickets retornados por Cliente (Nome + Telefone)
            cacheClientes = {};
            resultado.dados.forEach(ticket => {
                const clienteNome = ticket.cliente || 'CLIENTE NÃO IDENTIFICADO';
                const clienteTelefone = ticket.telefone || '';
                const chaveCliente = `${clienteNome}_${clienteTelefone}`;

                if (!cacheClientes[chaveCliente]) {
                    cacheClientes[chaveCliente] = {
                        nome: clienteNome,
                        telefone: clienteTelefone,
                        endereco: ticket.endereco || 'Endereço não informado',
                        cpfCnpj: ticket.cpf_cnpj || '',
                        codigo: ticket.codigo_cliente || '',
                        tickets: []
                    };
                }
                cacheClientes[chaveCliente].tickets.push(ticket);
            });

            renderizarListaClientes();

        } catch (error) {
            console.error('❌ Erro ao buscar dados:', error);
            alert('Falha ao conectar com o servidor local.');
            listBox.innerHTML = '<div style="padding: 5px; color: red;">Erro na conexão.</div>';
        }
    }

    // Renderiza a lista de clientes encontrados no painel esquerdo
    function renderizarListaClientes() {
        listBox.innerHTML = '';
        const chaves = Object.keys(cacheClientes);

        chaves.forEach((chave, index) => {
            const clienteObj = cacheClientes[chave];
            const div = document.createElement('div');
            
            const telFormatado = clienteObj.telefone ? ` (${clienteObj.telefone})` : '';
            div.textContent = `${clienteObj.nome}${telFormatado}`;
            div.title = `${clienteObj.nome}${telFormatado}`;

            if (index === 0) {
                div.classList.add('selected');
                preencherDadosCliente(clienteObj);
            }

            div.addEventListener('click', () => {
                document.querySelectorAll('.list-box div').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                preencherDadosCliente(clienteObj);
            });

            listBox.appendChild(div);
        });
    }

    // Preenche os campos do cliente selecionado e separa os tickets nas tabelas corretas
    function preencherDadosCliente(clienteObj) {
        if (tabelaAbertos) tabelaAbertos.innerHTML = '';
        if (tabelaEntregues) tabelaEntregues.innerHTML = '';

        if (inputEndereco) inputEndereco.value = clienteObj.endereco || '';
        if (inputCpfCnpj) inputCpfCnpj.value = clienteObj.cpfCnpj || '';
        if (inputCodigo) inputCodigo.value = clienteObj.codigo || '';

        if (detalhesEndereco) {
            detalhesEndereco.textContent = clienteObj.endereco;
        }

        clienteObj.tickets.forEach(ticket => {
            let ehEntregue = false;
            let ehAnulado = false;
            let ehOrcamento = false;
            let ehOrcNaoAprovado = false;
            let ehPago = false; // Defina aqui se houver regra de pagamento no ticket/serviço

            if (ticket.pecas && ticket.pecas.length > 0) {
                const todosAnulados = ticket.pecas.every(p => 
                    p.servicos.every(s => s.status && s.status.toUpperCase() === 'X')
                );

                if (todosAnulados) {
                    ehAnulado = true;
                } else {
                    ehEntregue = ticket.pecas.every(p => 
                        p.servicos.every(s => {
                            const st = s.status ? s.status.toUpperCase() : '';
                            return st === 'ENTREGUE' || st === 'X';
                        })
                    );
                }
            }

            const tr = document.createElement('tr');
            const dataEmissaoFormatada = ticket.data_emissao ? ticket.data_emissao.split(' ')[0] : '';
            const temObs = ticket.observacao_geral ? '*' : '';

            // Regras de Cores com base na sua tabela:
            if (ehAnulado) {
                tr.className = 'status-anulado'; // Laranja / Salmão
            } else if (ehEntregue) {
                // Se entregue, verifica se foi pago ou não pago
                tr.className = ehPago ? 'status-entregue-pago' : 'status-entregue-nao-pago'; // Verde-alface ou Amarelo-pálido
            } else if (ehOrcNaoAprovado) {
                tr.className = 'status-orc-nao-aprovado'; // Laranja-claro / Pêssego
            } else if (ehOrcamento) {
                tr.className = 'status-orcamento'; // Azul-celeste / Ciano
            } else {
                // Em aberto padrão (Pago vs Não Pago)
                tr.className = ehPago ? 'status-pago' : 'status-nao-pago'; // Cinzento ou Amarelo-claro
            }

            // Atribuição de colunas e dados conforme tabela
            if (ehAnulado || ehEntregue) {
                const indicador = ehAnulado ? 'X' : (temObs || '*');
                tr.innerHTML = `
                    <td>${ticket.serie || 1}</td>
                    <td>${ticket.numero}</td>
                    <td>${dataEmissaoFormatada}</td>
                    <td>${indicador}</td>
                `;
                if (tabelaEntregues) tabelaEntregues.appendChild(tr);
            } else {
                let temDisponivel = false;
                if (ticket.pecas) {
                    ticket.pecas.forEach(p => {
                        p.servicos.forEach(s => {
                            if (s.status && s.status.toLowerCase().includes('disponível')) temDisponivel = true;
                        });
                    });
                }
                const indicadorStatus = temObs + (temDisponivel ? 'D' : '');

                tr.innerHTML = `
                    <td>${ticket.serie || 1}</td>
                    <td>${ticket.numero}</td>
                    <td>${dataEmissaoFormatada}</td>
                    <td>${ticket.posicao || ''}</td>
                    <td>${indicadorStatus}</td>
                `;
                if (tabelaAbertos) tabelaAbertos.appendChild(tr);
            }
        });
    }

    function limparTabelasETela() {
        if (tabelaAbertos) tabelaAbertos.innerHTML = '';
        if (tabelaEntregues) tabelaEntregues.innerHTML = '';
        if (detalhesEndereco) detalhesEndereco.textContent = '';
        if (inputEndereco) inputEndereco.value = '';
        if (inputCpfCnpj) inputCpfCnpj.value = '';
        if (inputCodigo) inputCodigo.value = '';
    }

    if (btnSearch) {
        btnSearch.addEventListener('click', realizarBusca);
    }

    if (inputNome) {
        inputNome.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') realizarBusca();
        });
    }

    if (inputTelefone) {
        inputTelefone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') realizarBusca();
        });
    }

    if (inputNome && inputNome.value.trim()) {
        realizarBusca();
    }
});
