import { supabase } from "./supabase.js";
// nao remover linha do supabase pois vai ser utilizada neste arquivo no futuro.

// Configuração da URL da API (ambiente local)
const API_URL = 'http://localhost:3000';

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

document.addEventListener('DOMContentLoaded', () => {
    carregarSelectLojas();

    const inputTelefone = document.getElementById('filtro-telefone');
    const inputNome = document.getElementById('filtro-nome');
    const inputCodigo = document.getElementById('filtro-codigo');
    const inputEndereco = document.getElementById('filtro-endereco');
    const inputCpfCnpj = document.getElementById('filtro-cpf');
    
    // Inputs de endereço detalhado
    const inputCep = document.getElementById('filtro-cep');
    const inputNumeroEndereco = document.getElementById('filtro-numero-endereco');
    const inputBairro = document.getElementById('filtro-bairro');
    const inputCidade = document.getElementById('filtro-cidade');
    const inputUf = document.getElementById('filtro-uf');

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
    
    const btnAbrirTicket = document.getElementById('btn-abrir-ticket');

    let cacheClientes = {};
    let ticketSelecionado = null;

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
            if (listBox) listBox.innerHTML = '';
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
            if (listBox) listBox.innerHTML = '<div style="padding: 5px; color: #666;">Pesquisando...</div>';
            
            const url = `${API_URL}/api/oficina/buscar?nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}&loja=${encodeURIComponent(lojaId)}`;
            const response = await fetch(url);
            const resultado = await response.json();

            if (!resultado.sucesso || !resultado.dados || resultado.dados.length === 0) {
                if (listBox) listBox.innerHTML = '<div style="padding: 5px; color: #666;">Nenhum registro encontrado.</div>';
                limparTabelasETela();
                return;
            }

            cacheClientes = {};
            resultado.dados.forEach(ticket => {
                const clienteNome = ticket.cliente || ticket.nome || 'CLIENTE NÃO IDENTIFICADO';
                const clienteTelefone = ticket.telefone || ticket.fone || '';
                const chaveCliente = `${clienteNome}_${clienteTelefone}`;

                if (!cacheClientes[chaveCliente]) {
                    cacheClientes[chaveCliente] = {
                        nome: clienteNome,
                        telefone: clienteTelefone,
                        endereco: ticket.endereco || ticket.cliente_endereco || '',
                        cep: ticket.cliente_cep || ticket.cep || '',
                        numeroEndereco: ticket.cliente_numero || ticket.numero_endereco || '',
                        bairro: ticket.cliente_bairro || ticket.bairro || '',
                        cidade: ticket.cliente_cidade || ticket.cidade || '',
                        uf: ticket.cliente_uf || ticket.uf || '',
                        cpfCnpj: ticket.cpf_cnpj || ticket.cliente_cpf_cnpj || '',
                        codigo: ticket.codigo_cliente || ticket.codigo || '',
                        tickets: []
                    };
                }
                cacheClientes[chaveCliente].tickets.push(ticket);
            });

            renderizarListaClientes();

        } catch (error) {
            console.error('❌ Erro ao buscar dados:', error);
            alert('Falha ao conectar com o servidor local.');
            if (listBox) listBox.innerHTML = '<div style="padding: 5px; color: red;">Erro na conexão.</div>';
        }
    }

    function renderizarListaClientes() {
        if (!listBox) return;
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

        let enderecoCompleto = clienteObj.endereco || '';
        let numeroEnd = clienteObj.numeroEndereco || '';

        // Tratamento inteligente caso o número esteja grudado no endereço principal
        if (!numeroEnd && enderecoCompleto.includes('Nº')) {
            const partes = enderecoCompleto.split(/Nº\s*/i);
            enderecoCompleto = partes[0].replace(/,\s*$/, '').trim();
            numeroEnd = partes[1] ? partes[1].trim() : '';
        } else if (!numeroEnd && /, \d+/.test(enderecoCompleto)) {
            const match = enderecoCompleto.match(/(.*),\s*(\d+)(.*)$/);
            if (match) {
                enderecoCompleto = match[1].trim();
                numeroEnd = match[2].trim();
            }
        }

        // Preenchendo inputs principais
        if (inputEndereco) inputEndereco.value = enderecoCompleto;
        if (inputCpfCnpj) inputCpfCnpj.value = clienteObj.cpfCnpj || '';
        if (inputCodigo) inputCodigo.value = clienteObj.codigo || '';

        // Preenchendo os inputs de endereço detalhado
        if (inputCep) inputCep.value = clienteObj.cep || '';
        if (inputNumeroEndereco) inputNumeroEndereco.value = numeroEnd;
        if (inputBairro) inputBairro.value = clienteObj.bairro || '';
        if (inputCidade) inputCidade.value = clienteObj.cidade || '';
        if (inputUf) inputUf.value = clienteObj.uf || '';

        // --- MONTAGEM COMPLETA DO CADASTRO NA CAIXA "DETALHES ENDEREÇO" ---
        if (detalhesEndereco) {
            let codigo = clienteObj.codigo ? `Cód: ${clienteObj.codigo}` : '';
            let cpfCnpj = clienteObj.cpfCnpj ? `CPF/CNPJ: ${clienteObj.cpfCnpj}` : '';
            let telefone = clienteObj.telefone ? `Tel: ${clienteObj.telefone}` : '';
            let logradouro = enderecoCompleto;
            let numero = numeroEnd ? `Nº ${numeroEnd}` : '';
            let bairro = clienteObj.bairro ? `Bairro: ${clienteObj.bairro}` : '';
            let cidade = clienteObj.cidade || '';
            let uf = clienteObj.uf || '';
            let cidadeUf = (cidade && uf) ? `${cidade} - ${uf}` : (cidade || uf);
            let cep = clienteObj.cep ? `CEP ${clienteObj.cep}` : '';

            let partesCadastro = [codigo, cpfCnpj, telefone, logradouro, numero, bairro, cidadeUf, cep]
                .map(item => String(item).trim())
                .filter(item => item !== '' && item !== 'undefined' && item !== 'null');

            detalhesEndereco.textContent = partesCadastro.length > 0 ? partesCadastro.join(' , ') : 'Cadastro completo não informado';
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

            tr.addEventListener('click', () => {
                document.querySelectorAll('tr.selected-row').forEach(el => el.classList.remove('selected-row'));
                tr.classList.add('selected-row');

                ticketSelecionado = {
                    loja: ticket.loja || lojaId,
                    serie: ticket.serie || 1,
                    numero: ticket.numero
                };
            });

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

    async function carregarEAbrirModalTicket(loja, serie, numero) {
        if (!modalTicket) return;

        modalTicket.style.display = 'flex';
        if (modalTitulo) modalTitulo.textContent = `Ticket nº ${numero} (Série ${serie})`;
        if (modalCorpo) modalCorpo.innerHTML = '<div style="text-align: center; padding: 20px;">Carregando detalhes...</div>';

        try {
            const response = await fetch(`${API_URL}/oficina/ticket/${loja}/${serie}/${numero}`);
            if (!response.ok) throw new Error('Não foi possível carregar o ticket.');

            const dados = await response.json();
            renderizarDetalhesModal(dados);

        } catch (error) {
            console.error('❌ Erro ao buscar ticket:', error);
            if (modalCorpo) {
                modalCorpo.innerHTML = `<div style="color: red; text-align: center; padding: 15px;">
                    Erro ao carregar detalhes do ticket.<br><small>${error.message}</small>
                </div>`;
            }
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
                            ${peca.data_entrega ? ` | Entrega: ${peca.data_entrega}` : ''}
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

        if (modalCorpo) {
            modalCorpo.innerHTML = `
                <div class="ticket-info-grid">
                    <div class="ticket-info-item"><span>Oficina:</span> ${tck.nome_oficina || '-'}</div>
                    <div class="ticket-info-item"><span>Cliente:</span> ${tck.cliente || '-'}</div>
                    <div class="ticket-info-item"><span>Telefone:</span> ${tck.telefone || '-'}</div>
                    <div class="ticket-info-item"><span>Emissão:</span> ${tck.data_emissao || '-'}</div>
                    <div class="ticket-info-item"><span>Previsão:</span> ${tck.data_prevista || '-'}</div>
                    <div class="ticket-info-item"><span>Posição:</span> ${tck.posicao || '-'}</div>
                    <div class="ticket-info-item"><span>Valor Total:</span> R$ ${(tck.valor_final || 0).toFixed(2)}</div>
                    <div class="ticket-info-item"><span>Valor em Aberto:</span> ${((tck.valor_em_aberto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
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
    }

    if (btnAbrirTicket) {
        btnAbrirTicket.addEventListener('click', () => {
            if (!ticketSelecionado) {
                alert('Por favor, clique sobre uma linha de ticket da tabela para selecionar.');
                return;
            }
            carregarEAbrirModalTicket(ticketSelecionado.loja, ticketSelecionado.serie, ticketSelecionado.numero);
        });
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            if (modalTicket) modalTicket.style.display = 'none';
        });
    }

    function limparTabelasETela() {
        if (tabelaAbertos) tabelaAbertos.innerHTML = '';
        if (tabelaEntregues) tabelaEntregues.innerHTML = '';
        if (detalhesEndereco) detalhesEndereco.textContent = '';
        if (inputEndereco) inputEndereco.value = '';
        if (inputCpfCnpj) inputCpfCnpj.value = '';
        if (inputCodigo) inputCodigo.value = '';
        
        if (inputCep) inputCep.value = '';
        if (inputNumeroEndereco) inputNumeroEndereco.value = '';
        if (inputBairro) inputBairro.value = '';
        if (inputCidade) inputCidade.value = '';
        if (inputUf) inputUf.value = '';

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
});
