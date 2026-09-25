import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('filtro-telefone');
    const inputNome = document.getElementById('filtro-nome');
    const inputCodigo = document.getElementById('filtro-codigo');
    const inputEndereco = document.getElementById('filtro-endereco');
    const inputCpfCnpj = document.getElementById('filtro-cpf');
    const selectLoja = document.getElementById('select-loja'); // Elemento <select> da loja

    const btnSearch = document.getElementById('btn-pesquisar');
    const listBox = document.getElementById('lista-resultados');
    
    const tabelaAbertos = document.getElementById('tabela-abertos-body');
    const tabelaEntregues = document.getElementById('tabela-entregues-body');
    
    const detalhesEndereco = document.getElementById('detalhes-endereco-box');

    let cacheClientes = {};

    // Limpa os resultados se o usuário trocar a loja no select
    if (selectLoja) {
        selectLoja.addEventListener('change', () => {
            limparTabelasETela();
            listBox.innerHTML = '';
            cacheClientes = {};
        });
    }

    async function realizarBusca() {
        const nome = inputNome ? inputNome.value.trim() : '';
        const telefone = inputTelefone ? inputTelefone.value.trim() : '';
        const lojaId = selectLoja ? selectLoja.value : ''; // Pega o ID da loja selecionada

        if (!lojaId) {
            alert('Por favor, selecione uma loja antes de pesquisar.');
            return;
        }

        if (!nome && !telefone) {
            alert('Por favor, informe ao menos o Nome ou o Telefone para pesquisar.');
            return;
        }

        try {
            listBox.innerHTML = '<div style="padding: 5px; color: #666;">Pesquisando...</div>';
            
            // Passando o parâmetro 'loja' junto na requisição para a API
            const url = `${API_URL}/api/oficina/buscar?nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}&loja=${encodeURIComponent(lojaId)}`;
            const response = await fetch(url);
            const resultado = await response.json();

            if (!resultado.sucesso || !resultado.dados || resultado.dados.length === 0) {
                listBox.innerHTML = '<div style="padding: 5px; color: #666;">Nenhum registro encontrado.</div>';
                limparTabelasETela();
                return;
            }

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
            // Mantido exatamente como você pediu (data original com split)
            const dataEmissaoFormatada = ticket.data_emissao ? ticket.data_emissao.split(' ')[0] : '';
            const temObs = ticket.observacao_geral ? '*' : '';

            // Validação ultra-flexível do status de pagamento
            const valorPago = ticket.pago !== undefined ? ticket.pago : ticket.status_pagamento;
            const isPago = 
                valorPago === true || 
                valorPago === 1 || 
                valorPago === '1' || 
                (typeof valorPago === 'string' && ['s', 'sim', 'true', 'yes', 'pago'].includes(valorPago.trim().toLowerCase()));

            const isDelivery = ticket.delivery === true;
            const isOrcamento = ticket.tipo === 'ORCAMENTO';
            const isOrcNaoAprovado = ticket.status_orcamento === 'NAO_APROVADO';

            // --- ORDEM DE PRIORIDADE CORRIGIDA ---
            if (ehAnulado) {
                tr.className = 'status-anulado';
            } else if (ehEntregue) {
                tr.className = isPago ? 'status-entregue-pago' : 'status-entregue-nao-pago';
            } else if (isDelivery) {
                tr.className = 'status-delivery';
            } else if (isOrcNaoAprovado) {
                tr.className = 'status-orc-nao-aprovado';
            } else if (isOrcamento) {
                tr.className = 'status-orcamento';
            } else {
                tr.className = isPago ? 'status-pago' : 'status-nao-pago';
            }

            // Inserção na tabela correta
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
