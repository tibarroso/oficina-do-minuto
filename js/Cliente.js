// Importa o cliente Supabase se necessário, mas a busca principal usa a nossa API Express
import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos da tela
    const inputTelefone = document.querySelector('.search-panel input');
    const inputNome = document.querySelectorAll('.search-panel input')[1];
    const btnSearch = document.querySelector('.btn-search');
    const listBox = document.querySelector('.list-box');
    const tabelaAbertos = document.querySelector('.table-container tbody');
    const tabelasContainer = document.querySelectorAll('.table-container');
    const tabelaEntregues = tabelasContainer[1] ? tabelasContainer[1].querySelector('tbody') : null;
    const detalhesEndereco = document.querySelector('.details-box');

    let cacheClientes = {}; // Armazena os tickets agrupados por cliente

    // Função principal de pesquisa
    async function realizarBusca() {
        const nome = inputNome.value.trim();
        const telefone = inputTelefone.value.trim();

        if (!nome && !telefone) {
            alert('Por favor, informe ao menos o Nome ou o Telefone para pesquisar.');
            return;
        }

        try {
            listBox.innerHTML = '<div style="padding: 5px; color: #666;">Pesquisando...</div>';
            
            // Monta a URL com os parâmetros de busca
            const url = `${API_URL}/api/oficina/buscar?nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}`;
            
            const response = await fetch(url);
            const resultado = await response.json();

            if (!resultado.sucesso || !resultado.dados || resultado.dados.length === 0) {
                listBox.innerHTML = '<div style="padding: 5px; color: #666;">Nenhum registro encontrado.</div>';
                if (tabelaAbertos) tabelaAbertos.innerHTML = '';
                if (tabelaEntregues) tabelaEntregues.innerHTML = '';
                if (detalhesEndereco) detalhesEndereco.textContent = '';
                return;
            }

            // Agrupa os tickets retornados por Cliente (Nome + Telefone)
            cacheClientes = {};
            resultado.dados.forEach(ticket => {
                const chaveCliente = `${ticket.cliente}_${ticket.telefone}`;
                if (!cacheClientes[chaveCliente]) {
                    cacheClientes[chaveCliente] = {
                        nome: ticket.cliente,
                        telefone: ticket.telefone,
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
            div.textContent = `${clienteObj.nome} (${clienteObj.telefone})`;
            
            // Seleciona o primeiro cliente por padrão
            if (index === 0) {
                div.classList.add('selected');
                exibirDetalhesCliente(clienteObj);
            }

            // Evento de clique para alternar o cliente selecionado
            div.addEventListener('click', () => {
                document.querySelectorAll('.list-box div').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                exibirDetalhesCliente(clienteObj);
            });

            listBox.appendChild(div);
        });
    }

    // Preenche as tabelas de tickets e endereço com base no cliente selecionado
    function exibirDetalhesCliente(clienteObj) {
        if (tabelaAbertos) tabelaAbertos.innerHTML = '';
        if (tabelaEntregues) tabelaEntregues.innerHTML = '';

        if (detalhesEndereco) {
            detalhesEndereco.textContent = `Cliente: ${clienteObj.nome} | Telefone: ${clienteObj.telefone}`;
        }

        clienteObj.tickets.forEach(ticket => {
            // Verifica se o ticket está totalmente entregue
            let ehEntregue = false;
            if (ticket.pecas && ticket.pecas.length > 0) {
                ehEntregue = ticket.pecas.every(p => 
                    p.servicos.every(s => s.status && s.status.toLowerCase() === 'entregue')
                );
            }

            const tr = document.createElement('tr');
            const dataEmissaoFormatada = ticket.data_emissao ? ticket.data_emissao.split(' ')[0] : '';

            if (!ehEntregue) {
                tr.className = 'highlight-purple';
                tr.innerHTML = `
                    <td>${ticket.serie || 1}</td>
                    <td>${ticket.numero}</td>
                    <td>${dataEmissaoFormatada}</td>
                    <td>${ticket.posicao || ''}</td>
                    <td>${ticket.observacao_geral ? '*' : ''}</td>
                `;
                if (tabelaAbertos) tabelaAbertos.appendChild(tr);
            } else {
                tr.className = 'highlight-green';
                tr.innerHTML = `
                    <td>${ticket.serie || 1}</td>
                    <td>${ticket.numero}</td>
                    <td>${dataEmissaoFormatada}</td>
                    <td>*</td>
                `;
                if (tabelaEntregues) tabelaEntregues.appendChild(tr);
            }
        });
    }

    // Eventos de clique e teclado
    btnSearch.addEventListener('click', realizarBusca);

    inputNome.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusca();
    });

    inputTelefone.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusca();
    });

    // Opcional: Se já abrir com valor no input, executa a busca automaticamente
    if (inputNome.value.trim()) {
        realizarBusca();
    }
});
