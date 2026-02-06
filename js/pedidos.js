async function criarPedido() {
  if (!usuarioLogado) {
    alert("Usuário não logado!");
    return;
  }

  const tipo = tipoInput.value.trim();
  const lojaOrigem = lojaOrigemInput.value.trim();
  const lojaDestino = lojaDestinoInput.value.trim();
  const orcamento = orcamentoInput.checked; // true ou false
  const observacao = observacaoInput.value.trim();

  // Verificação de campos obrigatórios
  if (!tipo || !lojaOrigem || !lojaDestino) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  const statusInicial = "Aguardando coleta";  // Status inicial do pedido

  try {
    // Preparar os dados para inserção
    const pedidoData = {
      loja_origem: lojaOrigem,
      loja_destino: lojaDestino,
      tipo_servico: tipo,
      eh_orcamento: orcamento,  // booleano
      status: statusInicial,
      obs_loja_origem: observacao || null,  // Pode ser null ou texto
      criado_em: new Date().toISOString()  // Formato ISO 8601
    };

    console.log("Dados do pedido:", pedidoData);  // Log para depuração

    // Inserir o pedido na tabela 'pedidos'
    const { data, error } = await supabase
      .from("pedidos")
      .insert([pedidoData])
      .select()
      .single();

    if (error) throw error;

    pedidoAtualId = data.id;

    // Registrar evento de criação
    await registrarEvento(
      pedidoAtualId,
      "Pedido criado",
      observacao || `Serviço: ${tipo}`
    );

    alert(`Pedido criado com sucesso!\nOS: ${pedidoAtualId}`);

    // Limpar formulário após a criação
    limparFormulario();

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert("Erro ao criar pedido. Veja o console.");
  }
}
