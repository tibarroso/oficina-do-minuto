import { supabase } from "./supabase.js";

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('filtro-telefone');
    const inputNome = document.getElementById('filtro-nome');
    const inputCodigo = document.getElementById('filtro-codigo');
    const inputEndereco = document.getElementById('filtro-endereco');
    const inputCpfCnpj = document.getElementById('filtro-cpf');
    const selectLoja = document.getElementById('select-loja');

    const btnSearch = document.getElementById('btn-pesquisar');
    const listBox = document.getElementById('lista-resultados');
    
    const tabelaAbertos = document.getElementById('tabela-abertos-body');
    const tabelaEntregues = document.getElementById('tabela-entregues-body');
    
    const detalhesEndereco = document.getElementById('detalhes-endereco-box');

    // Elementos do Modal Flutuante e Botão Ticket
    const modalTicket = document.getElementById('modal-ticket');
    const modalTitulo = document.getElementById('modal-ticket-titulo');
    const modalCorpo = document.getElementById('modal-ticket-corpo');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    
    // Procura o botão "Ticket"
    const btnAbrirTicket = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Ticket') && btn.id !== 'btn-pesquisar'
    );

    let cacheClientes = {};
    let ticketSelecionado = null; // Guarda { loja, serie, numero } do ticket selecionado

    const pad = (n) => String(n).padStart(2, '0');

    function formatarData(dataStr) {
        if (!dataStr) return '';
        const limpa = String(dataStr).split(' ')[0];
        const partes = limpa.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        const d = new Date(dataStr);
        if (!isNaN(d.getTime())) {
            return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        }
        return dataStr;
    }

    if (selectLoja) {
        selectLoja.addEventListener('change', () => {
            limparTabelasETela();
            listBox.innerHTML = '';
            cacheClientes = {};
            ticketSelecionado = null;
        });
    }

    async function realizarBusca() {
        const nome = inputNome ? inputNome.value.trim() : '';
        const telefone = inputTelefone ? inputTelefone.value.trim() : '';
        const lojaId = selectLoja ? selectLoja.value : '';

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
        ticketSelecionado = null;

        if (inputEndereco) inputEndereco.value = clienteObj.endereco || '';
        if (inputCpfCnpj) inputCpfCnpj.value = clienteObj.cpfCnpj || '';
        if (inputCodigo) inputCodigo.value = clienteObj.codigo || '';

        if (detalhesEndereco) {
            detalhesEndereco.textContent = clienteObj.endereco;
        }

        const lojaId = selectLoja ? selectLoja.value : 100;

        clienteObj.tickets.forEach(ticket => {
            let ehEntregue = false;
            let ehAnulado = false;

            if (ticket.pecas && ticket.pecas.length > 0) {
                const todosAnulados = ticket.pecas.every(p => 
                    p.servicos && p.servicos.every(s => s.status && s.status.toUpperCase() === 'X')
                );

                if (todosAnulados) {
                    ehAnulado = true;
                } else {
                    ehEntregue = ticket.pecas.every(p => 
                        p.servicos && p.servicos.every(s => {
                            const st = s.status ? s.status.toUpperCase() : '';
                            return st === 'ENTREGUE' || st === 'X';
                        })
                    );
                }
            }

            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            // Evento para SELEÇÃO DO TICKET
            tr.addEventListener('click', () => {
                document.querySelectorAll('tr.selected-row').forEach(el => el.classList.remove('selected-row'));
                tr.classList.add('selected-row');

                ticketSelecionado = {
                    loja: ticket.loja || lojaId,
                    serie: ticket.serie || 1,
                    numero: ticket.numero
                };
            });

            // Duplo clique já abre o modal do ticket diretamente
            tr.addEventListener('dblclick', () => {
                carregarEAbrirModalTicket(ticket.loja || lojaId, ticket.serie || 1, ticket.numero);
            });

            const dataEmissaoFormatada = formatarData(ticket.data_emissao);
            const temObs = ticket.observacao_geral ? '*' : '';

            const valorPago = ticket.pago !== undefined ? ticket.pago : ticket.status_pagamento;
            const isPago = 
                valorPago === true || 
                valorPago === 1 || 
                valorPago === '1' || 
                (typeof valorPago === 'string' && ['s', 'sim', 'true', 'yes', 'pago'].includes(valorPago.trim().toLowerCase()));

            const isDelivery = ticket.delivery === true;
            const isOrcamento = ticket.tipo === 'ORCAMENTO';
            const isOrcNaoAprovado = ticket.status_orcamento === 'NAO_APROVADO';

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

            if (ehAnulado || ehEntregue) {
                const indicador = ehAnulado ? 'X' : (temObs || '');
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
                        if (p.servicos) {
                            p.servicos.forEach(s => {
                                if (s.status && s.status.toLowerCase().includes('disponível')) temDisponivel = true;
                            });
                        }
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

    // --- LÓGICA DO MODAL DE TICKET ---

    async function carregarEAbrirModalTicket(loja, serie, numero) {
        if (!modalTicket) return;

        modalTicket.style.display = 'flex';
        modalTitulo.textContent = `Ticket nº ${numero} (Série ${serie})`;
        modalCorpo.innerHTML = '<div style="text-align: center; padding: 20px;">Carregando detalhes...</div>';

        try {
            const response = await fetch(`${API_URL}/oficina/ticket/${loja}/${serie}/${numero}`);
            if (!response.ok) throw new Error('Não foi possível carregar o ticket.');

            const dados = await response.json();
            renderizarDetalhesModal(dados);

        } catch (error) {
            console.error('❌ Erro ao buscar ticket:', error);
            modalCorpo.innerHTML = `<div style="color: red; text-align: center; padding: 15px;">
                Erro ao carregar detalhes do ticket.<br><small>${error.message}</small>
            </div>`;
        }
    }

    function renderizarDetalhesModal(tck) {
        let pecasHtml = '';

        if (tck.pecas && tck.pecas.length > 0) {
            pecasHtml = tck.pecas.map(peca => {
                let servicosRows = '';
                if (peca.servicos && peca.servicos.length > 0) {
                    servicosRows = peca.servicos.map(s => `
                        <tr>
                            <td>${s.descricao || '-'}</td>
                            <td>${s.quantidade || 1}</td>
                            <td>R$ ${(s.preco || 0).toFixed(2)}</td>
                            <td>${s.status || '-'}</td>
                            <td>${s.executor || '-'}</td>
                        </tr>
                    `).join('');
                } else {
                    servicosRows = `<tr><td colspan="5">Nenhum serviço associado</td></tr>`;
                }

                return `
                    <div class="peca-card">
                        <div class="peca-header">
                            Item ${peca.item}: ${peca.descricao} 
                            ${peca.cor ? ` | Cor: ${peca.cor}` : ''} 
                            ${peca.marca ? ` | Marca: ${peca.marca}` : ''}
                        </div>
                        ${peca.observacao_peca ? `<div style="font-style: italic; color: #555;">Obs: ${peca.observacao_peca}</div>` : ''}
                        <table class="tabela-servicos">
                            <thead>
                                <tr>
                                    <th>Serviço</th>
                                    <th>Qtd</th>
                                    <th>Preço</th>
                                    <th>Status</th>
                                    <th>Executor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${servicosRows}
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('');
        } else {
            pecasHtml = '<div style="padding: 10px;">Nenhuma peça/item cadastrado.</div>';
        }

        modalCorpo.innerHTML = `
            <div class="ticket-info-grid">
                <div class="ticket-info-item"><span>Oficina:</span> ${tck.nome_oficina || '-'}</div>
                <div class="ticket-info-item"><span>Cliente:</span> ${tck.cliente || '-'}</div>
                <div class="ticket-info-item"><span>Telefone:</span> ${tck.telefone || '-'}</div>
                <div class="ticket-info-item"><span>Emissão:</span> ${tck.data_emissao || '-'}</div>
                <div class="ticket-info-item"><span>Previsão:</span> ${tck.data_prevista || '-'}</div>
                <div class="ticket-info-item"><span>Posição:</span> ${tck.posicao || '-'}</div>
                <div class="ticket-info-item"><span>Valor Total:</span> R$ ${(tck.valor_final || 0).toFixed(2)}</div>
            </div>

            ${tck.observacao_geral ? `
                <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 6px; margin-bottom: 10px; border-radius: 3px;">
                    <strong>Obs. Geral:</strong> ${tck.observacao_geral}
                </div>
            ` : ''}

            <div class="section-title">Itens / Peças do Ticket</div>
            <div class="pecas-container">
                ${pecasHtml}
            </div>
        `;
    }

    // Clique no botão "Ticket"
    if (btnAbrirTicket) {
        btnAbrirTicket.addEventListener('click', () => {
            if (!ticketSelecionado) {
                alert('Por favor, clique sobre uma linha de ticket da tabela para selecionar.');
                return;
            }
            carregarEAbrirModalTicket(ticketSelecionado.loja, ticketSelecionado.serie, ticketSelecionado.numero);
        });
    }

    // Fechar Modal
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            modalTicket.style.display = 'none';
        });
    }

    // Fechar ao clicar fora da janela modal
//    window.addEventListener('click', (e) => {
//        if (e.target === modalTicket) {
//            modalTicket.style.display = 'none';
//        }
//    });

    window.addEventListener('click', (e) => {
    if (e.target === modalTicket) {
        // Se a janela estiver aberta e o usuário clicar fora, não faz nada
         return;
        }
    });

    

    function limparTabelasETela() {
        if (tabelaAbertos) tabelaAbertos.innerHTML = '';
        if (tabelaEntregues) tabelaEntregues.innerHTML = '';
        if (detalhesEndereco) detalhesEndereco.textContent = '';
        if (inputEndereco) inputEndereco.value = '';
        if (inputCpfCnpj) inputCpfCnpj.value = '';
        if (inputCodigo) inputCodigo.value = '';
        ticketSelecionado = null;
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
