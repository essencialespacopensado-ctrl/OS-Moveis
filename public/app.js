/* Gestão Pró — app principal (React + htm, sem etapa de build) */
const html = htm.bind(React.createElement);
const { useState, useEffect, useMemo, useRef, useCallback } = React;
// Versão carregada (do ?v= do app.js) — usada para avisar quando sair versão nova.
const APP_VERSAO = ((document.currentScript && document.currentScript.src) || '').match(/[?&]v=([\w.-]+)/)?.[1] || '';
function useNovaVersao() {
  const [nova, setNova] = useState('');
  useEffect(() => {
    if (!APP_VERSAO) return;
    const checar = async () => {
      try {
        const t = await (await fetch('/?_=' + Date.now(), { cache: 'no-store' })).text();
        const v = t.match(/app\.js\?v=([\w.-]+)/)?.[1];
        if (v && v !== APP_VERSAO) setNova(v);
      } catch {}
    };
    const id = setInterval(checar, 60000);
    const vis = () => document.visibilityState === 'visible' && checar();
    document.addEventListener('visibilitychange', vis);
    setTimeout(checar, 8000);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return nova;
}
// Cor fixa de cada cliente — a mesma em todas as telas.
const PALETA_CLI = ['#1E3A5F', '#B45309', '#15803D', '#9D174D', '#0E7490', '#6B4423', '#7C3AED', '#B91C1C', '#1D4ED8', '#4D7C0F', '#C2410C', '#0F766E', '#86198F', '#374151', '#A16207', '#BE185D', '#3730A3', '#166534', '#9A3412', '#155E75', '#6D28D9', '#854D0E', '#1F2937', '#047857', '#DB2777', '#2563EB', '#65A30D', '#EA580C', '#0891B2', '#7E22CE'];
const chaveCli = (nome) => String(nome || '').split(/\s[-–]\s/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function corCliente(nome) {
  const k = chaveCli(nome);
  const m = window.__CORES_CLI || {};
  if (m[k]) return m[k];
  let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETA_CLI[h % PALETA_CLI.length];
}
// Dá uma cor exclusiva para cada cliente novo e guarda na empresa (fica fixa para sempre).
async function garantirCoresClientes(sessao, nomes) {
  const m = { ...(window.__CORES_CLI || {}) };
  const usadas = Object.values(m);
  let mudou = false;
  for (const n of [...new Set(nomes.map(chaveCli))].filter(Boolean).sort()) {
    if (m[n]) continue;
    const livre = PALETA_CLI.find(c => !usadas.includes(c)) || PALETA_CLI[usadas.length % PALETA_CLI.length];
    m[n] = livre; usadas.push(livre); mudou = true;
  }
  if (mudou) { window.__CORES_CLI = m; try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { coresClientes: m }); } catch {} }
}
const corOS = (o) => corCliente(o?.cliente?.nome || '');
const NOVIDADES = [
  ['214', ['💬 Orçamentos pelo WhatsApp: em Compras da OS, "Pedir orçamento no WhatsApp" cria um link com a lista de materiais para cada parceiro escolhido e abre o WhatsApp com a mensagem pronta. O parceiro abre o link, vê a lista e anexa o PDF com valor e condições de pagamento — cai direto na OS, mostrando quem já retornou (✅) e quem falta (⏳), com botão para cobrar. A cada orçamento que chega aparece o aviso "já recebeu N orçamento(s)".', '📲 Cadastro do WhatsApp de cada parceiro em Compras → 🏢 Parceiros.']],
  ['212', ['📦 Dinabox automático: materiais entram sozinhos na lista de compras de cada OS e as peças na aba 🧩 Peças. Em Compras dá para desmarcar o que veio do Dinabox (sai da lista) e adicionar itens novos normalmente. Configurações → 📦 Dinabox mostra a última atualização e tem "Buscar agora".']],
  ['211', ['📦 Dinabox: a lista de materiais de cada lote aparece na folha de compras da OS (com botão para colocar na lista de compras), e a nova aba 🧩 Peças mostra todas as peças do lote por módulo, com busca e ✓ de conferência.']],
  ['210', ['🛒 Folha de compras padrão agora é só a lista de materiais, no mesmo estilo da Ordem de entrega: separada por categoria, cada item com ☐ para marcar recebido, quantidade e código/marca.']],
  ['209', ['🔧 Diário de obra e peças extras pedidas pelo montador agora ficam só dentro da aba Montagem da OS (saiu a aba Diário separada).']],
  ['208', ['👤 Página geral do cliente (toque no cliente em Clientes): dados, status da obra, pendências, check-list de finalização com subtítulos, abas de OSs, puxadores, eletros, contrato e atas.', '🗒 Aba Montagem da OS: planejamento de execução (lista com ✓), eletros com foto e puxadores puxados da OS, e o vídeo do projeto finalizado.']],
  ['207', ['← Botão Voltar dentro da OS: volta para a aba anterior (ex.: de Montagem para Andamento) e, no começo, fecha a OS e volta para a tela de antes.']],
  ['206', ['🔧 Nova aba Montagem na OS: cole o link do QR Code do projeto 3D do Dinabox e o montador abre direto na obra (botão Abrir, QR Code para o celular e copiar). Também mostra o endereço com mapa, WhatsApp do cliente e atalhos para a ordem de entrega, diário e folha.']],
  ['205', ['📲 iPhone/iPad: botão "Instalar" no topo mostra o passo a passo para colocar o Gestão Pró na tela de início (Safari → Compartilhar → Adicionar à Tela de Início).', '🤔 Quando a IA está pensando, o ajudante coloca a mão no queixo.']],
  ['204', ['👷 Nome e foto do ajudante agora ficam em Configurações (administrador) e aparecem iguais em todos os aparelhos. No bonequinho ficam só: Me mostra esta tela, Fazer uma pergunta, Onde fica…? e Voltar para casa.', '✦ Saiu o botão "Peça qualquer coisa" — as perguntas agora são pelo bonequinho.']],
  ['203', ['🖥 As telas agora usam toda a largura do monitor e se ajustam sozinhas no celular e tablet.', '👣 O ajudante anda de lado, dando passinhos, e deixa pegadas pelo caminho. Quando está longe do canto aparece um 🏠 ao lado dele para voltar ao ponto de partida. O menu dele não fica mais cortado no topo da tela.']],
  ['202', ['👷 A fala do ajudante não fica mais atrás do menu lateral: ele aparece por cima de tudo e o balão abre para o lado que tem espaço.']],
  ['201', ['👷 Ajudante: dá para dar nome a ele e colocar uma foto, que vira o rosto (caricatura, cabeção). Ele mexe braços e pernas o tempo todo, as falas aparecem por cima das janelas e tem o botão 🏠 Voltar para casa.']],
  ['200', ['👷 Novo ajudante: o Zé, um bonequinho animado que anda pela tela. Toque nele: "Me mostra esta tela" (ele vai até cada parte e explica) ou "Onde fica…?" (ele anda até o lugar no menu e destaca). Dá para esconder.', '↙ Botões ❓, 🆕 e ← Voltar de volta bem no canto esquerdo.']],
  ['199', ['🎨 Menu lateral com as cores do app (escuro com destaque âmbar).', '✅ Clientes → "Concluir clientes em massa": marque os clientes e conclua todas as OSs em aberto deles de uma vez (pede senha e motivo).']],
  ['198', ['🧭 Botões flutuantes (❓, 🆕, ← Voltar) não ficam mais em cima do menu lateral.']],
  ['197', ['🧭 Novo visual: menu lateral azul à esquerda (como o Conta Azul) com as seções Geral, Clientes, Produção, Compras, Equipe e Financeiro — toque para abrir as telas de cada uma. No celular o menu abre pelo ☰.']],
  ['196', ['💾 No final do preenchimento da OS: salvar em 📄 PDF, 📝 Word ou 📊 Excel (Excel com abas OS, Móveis e Especificações).']],
  ['195', ['🔑 Palavras-chave (vidro, pintura, serralheria…) aparecem destacadas só 1 vez em cada móvel e nunca nos títulos.']],
  ['108', ['🖨 Folha de compras padrão pode ser impressa em branco (sem itens) para preencher à mão.']],
  ['158', ['🎤 Busca por voz no Início: toque no microfone e fale o cliente, nº ou ambiente.']],
  ['178', ['🔧 Corrigido: avançar a esteira para "Projeto" escondia a OS como se a obra estivesse concluída. Agora só a última etapa (Conclusão) tira a OS da tela.']],
  ['194', ['⚪ Bolinhas de cor ocultas na OS e na folha de impressão por enquanto.']],
  ['193', ['🎯 Ordens a terceiros: se o móvel marcado não fala nada da categoria (ex.: espelho), não aparece nada dele — só entra o que está especificado para aquela categoria.']],
  ['192', ['📍 Endereço de montagem obrigatório no final do preenchimento da OS (campo em vermelho até preencher). Sem ele a OS não pode ser revisada nem avançar para produção.']],
  ['191', ['🎯 Ordens a terceiros: as especificações trazem só o que é da categoria escolhida e dos móveis marcados (ex.: Vidros não puxa mais couro, puxador ou box).', '📷 Em todas as fotos dá para escolher Câmera ou Galeria.']],
  ['190', ['🧾 Botão renomeado para "Ordens a terceiros". Agora você marca para quais móveis da OS é a ordem (A, B, C…) e as especificações se ajustam; as fotos já vêm ligadas ao móvel quando só um está marcado.']],
  ['189', ['🧾 Ordem para parceiro: as especificações agora vêm só do que é ligado ao tipo escolhido (ex.: Pintura puxa laca, cores, verniz; Vidros puxa vidros e espelhos…). Cada foto pede de qual móvel é (A, B, C…), e isso sai na impressão.', '📐 Serralheria exige o PDF do desenho técnico (fica salvo na ordem, botão 📐 para abrir).']],
  ['188', ['🧪 Zerar (testes) agora limpa toda a atividade da OS — esteiras, tempos, paradas, liberações, parceiros, compras, peças extras, diário e cronograma — deixando só a OS.', '🔓 O aviso de liberado com pendência também sai na folha de impressão.']],
  ['187', ['🧾 Botão "Ordem de pintura, serralheria…" na OS: escolha o tipo e o parceiro, prazo, fotos; as especificações já vêm da OS (pode editar). Salva na OS e imprime.', '📍 Endereço de montagem obrigatório para mandar para produção ou concluir.', '🔓 A senha para avançar com pendência agora é cadastrada pelo administrador em Configurações. "Vou resolver" leva direto para Compras.']],
  ['186', ['🔓 OS liberada com pendência mostra um aviso chamativo (pequeno) no topo da OS com o motivo, quem liberou e quando — some quando as pendências forem resolvidas.']],
  ['185', ['✍ Folha da OS e Ordem de entrega: os nomes dos móveis aparecem no mesmo padrão de escrita da OS (ex.: PERFUMEIRO → Perfumeiro).']],
  ['184', ['⛔ Avançar para Produção ou concluir com pendência abre uma janela com o que falta (toque no item para ir resolver). Dá para levar mesmo assim com a senha do gerente/administrador e motivo — fica registrado. O aviso vermelho não fica mais aparecendo à toa.', '📣 Alerta em tela cheia (e notificação do sistema com o app minimizado) quando um orçamento pedido ao parceiro fica sem resposta há mais de 1 dia — para cobrar o parceiro. Dá para adiar 2 h ou para amanhã.']],
  ['183', ['⛔ A OS não conclui se tiver pendência: o último avanço do escritório e a última etapa da produção ficam travados enquanto houver compras, parceiros, peças extras ou pendências do diário. Toque no item que falta para ir direto à aba (Compras, Diário…).']],
  ['182', ['🚚 Nova aba Ordem de entrega na OS: escolha os móveis que vão na entrega e imprima um check-list ☐ de cada móvel com medidas, MDF, ferragens, puxadores, LED e todos os acessórios do conjunto, com assinaturas de expedição, montador e cliente.', '📄 Folha da OS: depois do cliente aparece o endereço de montagem; saiu o número 01 dos conjuntos.']],
  ['181', ['🔧 Corrigido: concluir etapas da esteira da produção fazia a esteira do escritório pular sozinha até "OS concluída". Agora as duas esteiras são independentes — o escritório só avança quando você toca ▶.']],
  ['180', ['📄 Folha da OS: no topo, em destaque, o ambiente (ex.: BWC Master); embaixo o nome do cliente; cada conjunto mostra os nomes dos móveis que você digitou.', '⬆ Se a tela atualizar no meio de um envio de arquivo, fica um aviso discreto embaixo mostrando o que parou, com ✕ para fechar.']],
  ['179', ['🔧 Corrigido: avançar a esteira para "Projeto" escondia a OS e mostrava 100%. As etapas estavam com códigos internos trocados — o administrador vê um aviso no Início com o botão 🔧 Corrigir (nomes e ordem não mudam).', '🧱 Tamponamento e prateleiras escolhidos em cada conjunto agora ficam salvos e aparecem na folha de impressão.', '🙈 No Editar OS, o móvel não repete mais o nome do ambiente que já aparece no topo.']],
  ['177', ['📋 Lista de OSs por cliente: a barra de etapas começa zerada e só acende quando a esteira avança; a OS não pula mais de lugar quando você toca ▶ (fica na mesma posição, por número).']],
  ['176', ['💾 Corrigido: ao salvar a OS, os acabamentos, puxadores, ferragens e demais especificações de cada conjunto de móveis estavam sendo perdidos. Agora tudo fica salvo.']],
  ['175', ['⏸ Parar esteira: na aba Andamento da OS, botão "Parar esteira" pede o motivo; a OS mostra o aviso vermelho com quanto tempo está parada e o botão ▶ Retomar. Fica o histórico das paradas, e a OS aparece como ⏸ Parada na visão por cliente.', '💡 Sugestões e anotações: marque pessoas da equipe (@nome) e anexe fotos 📷. Novo filtro 🔔 Para mim.', '✕ Corrigido: o botão de fechar o aviso do microfone agora funciona.']],
  ['174', ['✕ O aviso de microfone (sem microfone / bloqueado) agora tem botão para fechar, e não volta mais.']],
  ['173', ['💡 Nova aba Sugestões & anotações (em Geral): escreva ou fale uma ideia ou anotação, marque como feita, filtre por tipo. Toda a equipe vê.']],
  ['172', ['✅ Corrigido: a OS que chega na última etapa (Conclusão) sai da visão por cliente.']],
  ['171', ['📌 A busca/microfone saiu de cima das telas: agora fica no topo, junto dos botões da conta, em todos os aparelhos.']],
  ['170', ['✅ Na visão por cliente, a OS concluída sai da tela automaticamente; o cliente some quando todas as OSs dele terminam. Para achar uma concluída, use a busca.']],
  ['169', ['⏱ A voz agora espera 1 segundo depois que você termina de falar para executar — dá tempo de falar a frase inteira.']],
  ['168', ['📱 No celular a busca/voz virou uma bolinha pequena (🔍, ou 🎙 verde quando está ouvindo) que não cobre mais a tela; toque nela para digitar. Ela também fica atrás das janelas abertas.']],
  ['167', ['🎤 No PC a voz agora liga sozinha no primeiro clique ou tecla (o Chrome exige isso) e não briga mais com o microfone do assistente/busca do Início. Se o navegador bloquear o microfone, aparece o aviso de como liberar.', '📍 Barra de busca no centro, embaixo, sem ficar atrás de outros botões.']],
  ['166', ['📌 Busca e voz agora ficam fixas e discretas no canto da tela, em TODAS as páginas: fale ou digite e abre na hora (OS, cliente, telas). Toque no 🎤 para ligar/desligar a voz.', '🔧 Corrigido: a busca do Início não apagava mais o que você digita.']],
  ['165', ['🔍 A busca do Início agora acha tudo: OSs, clientes e também telas e funções (compras, financeiro, equipe, amostras, cronograma, catálogo…). Digite ou fale e toque no resultado — ou Enter para ir direto.']],
  ['164', ['📄 Nova folha de impressão da OS: colorida, compacta, organizada por conjunto de móveis, com as especificações de cada conjunto em blocos coloridos e sem campos vazios.', '🟢 Voz ligada ao abrir o app: no Início o assistente já fica ouvindo — fale "cozinha da Cris", "vai pra compras"... Botão Voz ligada/desligada para desligar quando quiser.', '🖱 Rolar dentro da lista de opções não fecha mais; ao rolar a página a lista acompanha.']],
  ['163', ['🔝 Listas de opções/catálogo agora abrem flutuando por cima de tudo, no lugar certo.']],
  ['162', ['👁 Botão "Ver OS" no topo da OS: abre a OS pronta, na folha. Fica destacado depois de revisada.', '⚡ Assistente instantâneo: fale ou escreva "abre a cozinha da Cris", "26 045", "imprime a OS da Aline" ou "vai pra compras" — abre na hora, sem esperar a IA. Perguntas e mudanças continuam indo para a IA.']],
  ['161', ['🔝 Listas de catálogo agora abrem na frente das outras linhas.']],
  ['159', ['🎤 Busca por voz no Início: fale o cliente, nº ou ambiente (ex.: "cozinha da Cris", "26 045") e a OS já abre.', '🧲 Uma categoria só para puxadores, perfis, cavas, Zen e pegadores; lâminas ficam só em Acabamentos.']],
  ['157', ['🪑 Sem nome de ambiente no bloco (o ambiente já está no nº/nome da OS): cada "+ Adicionar móvel" abre direto o móvel para preencher.']],
  ['156', ['🪑 Móvel novo começa sem nome (você escolhe: balcão, guarda-roupa…).', '🎨 Acabamentos começam em MDF; saiu "chapa rápida" (fabricantes) — use a busca.', '📐 Acabamento interno e externo um embaixo do outro, sem espaços em branco.']],
  ['155', ['📈 Toda OS começa em 0%: sem parceiros, o % é metade etapa da OS e metade produção.']],
  ['154', ['🧾 Cabeçalho da edição sem o nome do cliente repetido; 🎨 Cores num botão (abre as bolinhas só quando quiser).', '🔧 Corrigido: tocar na linha da categoria (Acabamentos, Portas, Lâminas, LED…) agora abre e fecha.']],
  ['153', ['🪑 "+ Adicionar móvel" cria um bloco novo (como um ambiente) com todas as categorias.', '👆 A própria linha da categoria abre/fecha (sem botão Aplica).', '🧱 Tamponamento foi para dentro de Acabamentos & materiais.']],
  ['152', ['🧹 Saiu o aviso "Revisar: largura, altura…" dos móveis.']],
  ['151', ['🎨 Materiais (MDF, Fórmica, Lâmina, Madeira, Laca) viraram botões pequenos lado a lado.', '📦 Caixa, frentes, prateleiras e ⚙ espessuras ficam só dentro de Acabamentos & materiais.']],
  ['150', ['🧱 Saiu "parede revestida" dos conjuntos.', '⚙ Espessuras configuráveis (caixa, frentes e prateleiras) — botão ⚙ Espessuras no conjunto; e nova linha de espessura das prateleiras.', '📋 O conjunto mostra todas as etapas da OS de uma vez, cada uma fechada; o conteúdo só aparece ao tocar em Aplica.', '🎨 Catálogos coloridos por categoria, com fundo tecnológico animado; lâminas, perfis e puxadores agora são uma categoria só, em lista.']],
  ['149', ['🔘 Corrigido: o botão Aplica agora aparece (pulsando) embaixo do nome de cada categoria fechada.']],
  ['148', ['🔘 Botão único "Aplica" animado, logo abaixo do nome de cada categoria e de cada material.']],
  ['147', ['🎨 Em Acabamentos & materiais, cada tipo (MDF, Fórmica, Lâmina, Madeira, Laca) é uma linha numerada com Aplica / Não aplica; só o que aplica abre.']],
  ['146', ['📏 Catálogos da OS em lista, um embaixo do outro e numerados em sequência, todos fechados; cada linha só tem Aplica / Não aplica (saíram os botões "possui LED" etc.).']],
  ['145', ['👤 Dados do cliente: toque no nome do cliente no topo da OS.', '✏️ A edição já abre direto nos conjuntos de móveis; o aviso da esteira saiu.']],
  ['144', ['🪑 Tudo o que se edita na etapa 2 fica dentro de cada conjunto de móveis: materiais, tamponamento, parede/painel, observações e catálogos. Saíram os blocos soltos da OS.']],
  ['143', ['🔒 A OS só fica bloqueada para edição depois de marcada como revisada (aí pede motivo para editar).']],
  ['142', ['📋 Edição da OS mais enxuta: cabeçalho numa linha só (nº, cliente, ambiente, prazo, etapa, revisar, PDF).', '🎨 Cada conjunto já mostra na frente a cor do MDF da caixa e das frentes com a espessura em um toque; o resto fica em "Mais detalhes".']],
  ['141', ['🙈 Catálogos começam escondidos; só abrem quando você toca em ✓ Aplica.']],
  ['140', ['✓/✕ Cada catálogo (acabamentos, portas, LED, ferragens, fechaduras, vidros, tecidos) tem botão Aplica / Não aplica; ao marcar Não aplica ele fecha.']],
  ['139', ['🎨 Acabamentos e materiais agora ficam dentro de cada conjunto de móveis (botão "Acabamentos & materiais deste conjunto"), e não mais soltos na OS.']],
  ['138', ['📑 Leitura do contrato revisável: todos os dados lidos (cliente, endereços, prazo, arquiteto, nº, valor, pagamento) ficam editáveis antes de criar as OS; campos vazios em amarelo.', '📍 Novo campo "Endereço de montagem" no cliente e na OS (também lido do contrato).']],
  ['137', ['🧪 Botão de testes ao lado do 🛠 Desenvolvedor: escolha OS e zere as esteiras (escritório e produção) e os tempos.']],
  ['136', ['▶ Botão para iniciar cada esteira (escritório e produção).', '⏱ Tempo de cada etapa aparece embaixo dela (e o tempo da etapa atual correndo), mais o total do escritório e da produção.']],
  ['135', ['🗂🏭 Duas esteiras na OS (aba Andamento): uma com as etapas do escritório e outra com as etapas da produção, cada uma com avançar/voltar.']],
  ['134', ['🏭 Na OS (aba Andamento) a esteira agora é a das etapas da OS, igual à lista: trilho colorido + ▶ Avançar e ◀ Voltar (com motivo), e o seletor interna/terceirizada.']],
  ['133', ['🔤 Correção automática: ao terminar de digitar um nome (cliente, ambiente, móvel, arquiteto, obra), ele já vira o padrão e com acento certo (suite → Suíte, area de servico → Área de Serviço, Fabricio → Fabrício).', '🔤 Os textos do cronograma semanal também foram padronizados.']],
  ['132', ['🔤 Todos os nomes já cadastrados (clientes, ambientes, arquitetos, cronograma, pedidos, amostras) foram corrigidos para o mesmo padrão. OS novas já entram padronizadas.']],
  ['131', ['🔤 Nomes de clientes e ambientes sempre escritos do mesmo jeito (ex.: "SUÍTE MASTER" e "suite master" → "Suíte Master"; siglas como BWC e LED ficam em maiúsculas).', '🔴 Na folha da OS, palavras-chave como VIDROS, SERRALHERIA, PINTURA, LACA, PEDRA, ESPELHO, TAPEÇARIA, ESQUADRIA, LED aparecem em CAIXA ALTA e em vermelho.']],
  ['130', ['🎨 A aba "Por temas" saiu de dentro da OS.']],
  ['129', ['⏱ Tempo ganho/perdido virou botão (no Início e no Cronograma).', '✦ O botão do assistente pisca com "Peça qualquer coisa" (a barra de lembrete saiu).', '🆕 Botão discreto de atualizações no canto; o cartão de novidades no Início tem "Entendi" para fechar.']],
  ['128', ['👥 Ao tocar num cliente no Quadro geral, abre a lista de OS do cliente (com avançar/voltar etapa e projeto).', '🤝 Obra terceirizada: botão "Pedido do parceiro" para o parceiro pedir à fábrica molduras, usinagem, corte, fita, furação, pintura… (na OS → Andamento e em Peças extras).']],
  ['127', ['🆕 Novidades em ordem: da versão mais nova para a mais antiga.']],
  ['126', ['👤 Nova seção Clientes (ao lado de Geral) reunindo Cadastro de clientes, Reuniões & Projetos e Contratos, com 3 botões grandes para começar.']],
  ['125', ['🆕 "O que mudou" agora fica no próprio app: cartão no Início com a versão atual e a aba Geral → Novidades com o histórico completo.']],
  ['124', ['🏭 A esteira de produção aparece num lugar só: na OS, aba Andamento. Um botão escolhe Produção interna, Terceirizada interna ou Terceirizada externa. Os parceiros (vidros, esquadrias, pintura…) continuam.']],
  ['123', ['🆕 A janela "O que mudou" agora aparece sempre depois de cada atualização (também no celular) e tem o botão 🆕 Novidades no topo para rever.']],
  ['122', ['👤 Nova aba Clientes (Geral): cadastro manual ou pelo contrato; ao salvar, os dados vão para todas as OS do cliente e saem na folha de impressão.', '✏️ Na edição da OS, os dados do cliente ficam num botão discreto (👤 Dados do cliente).']],
  ['121', ['🏭 Ao abrir a OS, a primeira aba é "Andamento": % de conclusão, compras e parceiros recebidos, pendências e a execução (etapa 3) para marcar ali mesmo.', '← Botão Voltar para a página anterior em todas as telas.']],
  ['120', ['📑 Contrato e 🎤 Iniciar reunião viraram botões no topo da edição da OS (abrem em janela).', '🏭 A execução (etapa 3) já aparece ao abrir a edição, abaixo dos dados do cliente.', '🪑 Conjuntos de móveis simplificados: só nome, quantidade e observações — medidas e materiais ficam nas Especificações.']],
  ['119', ['✏️ Edição da OS: a etapa 1 tem só os dados do cliente; a etapa 2 começa pelos conjuntos de móveis (+ Adicionar conjunto), depois especificações. Contrato, ata e andamento ficam no fim, recolhidos.']],
  ['118', ['🛠 Acesso do desenvolvedor com login + senha e "Esqueci a senha" (link no seu e-mail).']],
  ['117', ['📐 Listas de OS por cliente em mosaico: cada cartão tem só a altura das suas OS, sem espaço em branco.']],
  ['116', ['📐 Quadro geral: cartões dos clientes com tamanho proporcional ao número de OS e lado a lado, sem desperdiçar espaço. As OS de um cliente ficam em grade.']],
  ['115', ['🧠 Mapa: ao tocar em qualquer balão aparecem escritas todas as possibilidades daquele nível (seção, tela e cada função com como fazer, o que muda e onde impacta).']],
  ['114', ['🧠 Manual virou mapa mental: toque em seção → tela → função e veja como fazer, o que muda e onde impacta (com atalhos).']],
  ['113', ['📖 Manual completo em Geral → Manual, com busca.', '❓ Botão "Como funciona" em cada tela, mostrando o manual daquela aba.', '🤖 Lembrete: em caso de dúvida, pergunte ao assistente.']],
  ['112', ['⏳ Ao dar mais dias no cronograma, aparece o alerta de cliente em atraso (e dos clientes empurrados junto), mostrando se passa do prazo de entrega.', '⏩ Quando alguém conclui antes do prazo, o app pergunta se quer adiantar as próximas tarefas dele ou ajudar uma OS atrasada, abatendo dias.', '🔮 Quadro geral → Previsão de finalização: por cliente e por OS, com base no cronograma, compras e parceiros, avisando prazos perto ou em risco.']],
  ['111', ['📈 Quadro geral: barra de conclusão em % por cliente, por OS e o andamento geral de todas as obras (etapa da OS + produção + parceiros).']],
  ['110', ['✏️ Nome do cliente editável direto na OS (lápis ao lado do nome). Se o cliente tiver outras OS, dá para trocar em todas de uma vez.']],
  ['109', ['👥 Clientes com nome quase igual (ex.: Silmara x Sillmara) aparecem em aviso no Quadro geral com botão para juntar.', '👥 Ao criar ou importar OS com nome parecido com um cliente existente, o app pergunta se é o mesmo.', '🤖 A IA também organiza: diga "junta a Sillmara com a Silmara".']],
  ['107', ['📋 Folha de compras padrão aparece sempre na aba 🛒 Compras da OS, mesmo sem itens.']],
  ['106', ['⚡ Quadro geral → "Agora em andamento": tudo que está sendo feito hoje e por quem ao mesmo tempo (marcenaria, serralheria, vidros, pintura, terceirizados). Veja por OS ou por quem.']],
  ['105', ['📅 Enviar ao cronograma: escolha 👷 Internos (equipe cadastrada) ou 🤝 Terceirizados (parceiros) e toque no nome.']],
  ['104', ['📅 Botões da OS (Enviar ao cronograma etc.) com o texto completo.', '📋 Folha de compras padrão na OS: item, quantidade, comprar ou estoque, com quem foi comprado, prazo de entrega e ✓ recebido (atrasados em vermelho). A impressão segue o mesmo modelo.']],
  ['103', ['📦 Nova aba Amostras (Geral): quem levou nossas amostras, o que voltou e o que o cliente deixou aqui — com atraso destacado.', '🧾 Notas & financeiro na OS: só lançar a nota, forma de pagamento e em quantas vezes — já vai para Contas a pagar.', '📦 Amostras também dentro de cada OS.', '📅 Janela "Enviar para cronograma" mais compacta.', '🆕 Esta mensagem de novidades aparece a cada atualização.']],
  ['101', ['📓 Diário de obra mais simples: escolha o tipo, fale ou fotografe e salve. Pendências com ✓ e fotos por dia.', '📓 Diário também dentro da OS.']],
  ['100', ['🔐 Grupos e permissões: escolha quem vê cada tela (Equipe → Grupos e permissões).']],
  ['99', ['⏸ Pausar / ✖ Cancelar envios e 🔁 tentar de novo quando a IA falha.']],
];
NOVIDADES.sort((a, b) => Number(b[0]) - Number(a[0]));
function CartaoNovidades({ irPara }) {
  const [v, it] = NOVIDADES[0];
  const [fechado, setFechado] = useState(() => { try { return localStorage.getItem('gp-card-novid') === v; } catch { return false; } });
  if (fechado) return null;
  return html`<div class="card novid-card"><div class="row" style=${{ justifyContent: 'space-between' }}><b>🆕 O que mudou — versão ${v}</b><button class="btn btn-sm btn-ghost" onClick=${() => irPara('novidades')}>Ver todas →</button></div><ul class="novid">${it.map((t, i) => html`<li key=${i}>${t}</li>`)}</ul>
    <button class="btn btn-primary btn-sm" style=${{ alignSelf: 'flex-end' }} onClick=${() => { try { localStorage.setItem('gp-card-novid', v); } catch {} setFechado(true); }}>Entendi</button></div>`;
}
/* ---------- Sugestões & anotações ---------- */
/* Botões de foto: câmera ou galeria */
function FotoBtns({ onFiles, multiple = true, rotulo = '' }) {
  const fn = (e) => { onFiles(e.target.files); e.target.value = ''; };
  return html`<span class="foto-btns">${rotulo && html`<small class="dim">${rotulo}</small>`}
    <label class="btn btn-sm">📷 Câmera<input type="file" accept="image/*" capture="environment" style=${{ display: 'none' }} onChange=${fn} /></label>
    <label class="btn btn-sm">🖼 Galeria<input type="file" accept="image/*" multiple=${multiple} style=${{ display: 'none' }} onChange=${fn} /></label></span>`;
}
function TelaSugestoes({ sessao }) {
  const [lista, setLista] = useState(null);
  const [txt, setTxt] = useState('');
  const [tipo, setTipo] = useState('sugestao');
  const [filtro, setFiltro] = useState('abertas');
  const [interim, setInterim] = useState('');
  const fala = useFala({ onFinal: t => setTxt(v => (v ? v + ' ' : '') + t), onInterim: setInterim });
  const [equipe, setEquipe] = useState([]); const [marc, setMarc] = useState([]); const [fotos, setFotos] = useState([]); const [salvando, setSalvando] = useState(false);
  const [verFoto, setVerFoto] = useState(null);
  useEffect(() => { const { onSnapshot } = F().fsMod; return onSnapshot(col('empresas', sessao.empresaId, 'usuarios'), s => setEquipe(s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo !== false && u.nome))); }, [sessao.empresaId]);
  const addFotos = async (files) => { const n = []; for (const f of [...files].slice(0, 6 - fotos.length)) { try { n.push(await fotoCompacta(f)); } catch {} } setFotos(v => [...v, ...n]); };
  const C = () => col('empresas', sessao.empresaId, 'sugestoes');
  useEffect(() => { const { onSnapshot, query, orderBy } = F().fsMod; return onSnapshot(query(C(), orderBy('em', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([])); }, [sessao.empresaId]);
  const salvar = async () => { const t = (txt + ' ' + interim).trim(); if (!t && !fotos.length) return; if (salvando) return; setSalvando(true); fala.parar();
    try { await F().fsMod.addDoc(C(), { texto: t, tipo, autor: sessao.nome, uid: sessao.uid || '', em: nowIso(), feita: false, marcados: marc, fotos }); setTxt(''); setInterim(''); setMarc([]); setFotos([]); } catch (e) { alert('Não salvou: ' + e.message); }
    setSalvando(false); };
  const souEu = (x) => (x.marcados || []).some(n => norm(n) === norm(sessao.nome));
  const up = (x, p) => F().fsMod.updateDoc(F().fsMod.doc(F().db, 'empresas', sessao.empresaId, 'sugestoes', x.id), p);
  const apagar = (x) => { if (confirm('Apagar esta ' + (x.tipo === 'nota' ? 'anotação' : 'sugestão') + '?')) F().fsMod.deleteDoc(F().fsMod.doc(F().db, 'empresas', sessao.empresaId, 'sugestoes', x.id)); };
  const vis = (lista || []).filter(x => filtro === 'todas' || (filtro === 'feitas' ? x.feita : filtro === 'notas' ? x.tipo === 'nota' && !x.feita : filtro === 'sugestoes' ? x.tipo !== 'nota' && !x.feita : filtro === 'minhas' ? souEu(x) && !x.feita : !x.feita));
  const n = (f) => (lista || []).filter(f).length;
  return html`<div class="fade-up stack sug" style=${{ gap: '12px' }}>
    <div class="card page-card stack sug-novo">
      <div class="row" style=${{ justifyContent: 'space-between' }}><b style=${{ fontSize: '17px' }}>💡 Sugestões & anotações</b>
        <div class="seg-mini">${[['sugestao', '💡 Sugestão'], ['nota', '📝 Anotação']].map(([k, t]) => html`<button key=${k} class=${tipo === k ? 'on' : ''} onClick=${() => setTipo(k)}>${t}</button>`)}</div></div>
      <div class="row" style=${{ gap: '6px', flexWrap: 'nowrap', alignItems: 'stretch' }}>
        <textarea class="inp" rows="2" style=${{ flex: 1 }} placeholder=${tipo === 'nota' ? 'Anote algo… (ou toque no 🎤 e fale)' : 'Sua ideia para melhorar a empresa ou o app… (ou fale)'} value=${txt + (interim ? ' ' + interim : '')} onInput=${e => setTxt(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar(); }}></textarea>
        <div class="stack" style=${{ gap: '6px' }}>
          <button class=${'btn btn-sm' + (fala.ouvindo ? ' btn-mic-on pulse' : ' btn-teal')} onClick=${() => fala.ouvindo ? fala.parar() : fala.iniciar()}>${fala.ouvindo ? '■' : '🎤'}</button>
          <${FotoBtns} onFiles=${addFotos} />
          <button class="btn btn-primary btn-sm" disabled=${salvando} onClick=${salvar}>${salvando ? '…' : 'Salvar'}</button></div>
      </div>
      ${fotos.length > 0 && html`<div class="dia-fotos">${fotos.map((f, i) => html`<span key=${i}><img src=${f} /><button onClick=${() => setFotos(fotos.filter((_, j) => j !== i))}>✕</button></span>`)}</div>`}
      ${equipe.length > 0 && html`<div class="sug-marcar"><small class="dim">Marcar:</small>${equipe.map(u => { const on = marc.includes(u.nome); return html`<button key=${u.uid} class=${'sug-pessoa' + (on ? ' on' : '')} onClick=${() => setMarc(on ? marc.filter(n => n !== u.nome) : [...marc, u.nome])}>@${u.nome.split(' ')[0]}</button>`; })}</div>`}
    </div>
    <div class="seg-mini" style=${{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>${[['abertas', 'Abertas', n(x => !x.feita)], ['minhas', '🔔 Para mim', n(x => souEu(x) && !x.feita)], ['sugestoes', '💡 Sugestões', n(x => x.tipo !== 'nota' && !x.feita)], ['notas', '📝 Anotações', n(x => x.tipo === 'nota' && !x.feita)], ['feitas', '✅ Feitas', n(x => x.feita)], ['todas', 'Todas', n(() => true)]].map(([k, t, c]) => html`<button key=${k} class=${filtro === k ? 'on' : ''} onClick=${() => setFiltro(k)}>${t} <small>${c}</small></button>`)}</div>
    ${lista === null ? html`<div class="dim">Carregando…</div>` : !vis.length ? html`<div class="vazio dim">Nada aqui ainda.</div>` : html`<div class="sug-lista">
      ${vis.map(x => html`<div key=${x.id} class=${'sug-item ' + (x.tipo === 'nota' ? 'nota' : 'ideia') + (x.feita ? ' feita' : '')}>
        ${x.texto && html`<div class="sug-txt">${x.texto}</div>`}
        ${(x.fotos || []).length > 0 && html`<div class="sug-fotos">${x.fotos.map((f, i) => html`<img key=${i} src=${f} onClick=${() => setVerFoto(f)} />`)}</div>`}
        ${(x.marcados || []).length > 0 && html`<div class="sug-marcados">${x.marcados.map(n => html`<span key=${n} class=${norm(n) === norm(sessao.nome) ? 'eu' : ''}>@${n.split(' ')[0]}</span>`)}</div>`}
        <div class="sug-rod"><small>${x.tipo === 'nota' ? '📝' : '💡'} ${x.autor || ''} · ${fmtData(x.em)}${x.feita && x.feitaPor ? ' · ✅ ' + x.feitaPor : ''}</small>
          <span class="row" style=${{ gap: '4px' }}><button class="btn btn-ghost btn-sm" title=${x.feita ? 'Reabrir' : 'Marcar como feita'} onClick=${() => up(x, x.feita ? { feita: false } : { feita: true, feitaPor: sessao.nome, feitaEm: nowIso() })}>${x.feita ? '↺' : '✅'}</button>
          <button class="btn btn-ghost btn-sm" title="Apagar" onClick=${() => apagar(x)}>🗑</button></span></div>
      </div>`)}</div>`}
    ${verFoto && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${() => setVerFoto(null)}><img src=${verFoto} style=${{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: '12px', margin: 'auto' }} /></div>`, document.body)}
  </div>`;
}

function TelaNovidades() {
  return html`<div class="fade-up stack"><div class="page-head"><div><h2>🆕 Novidades</h2><div class="dim">Tudo o que mudou no app, da versão mais nova para a mais antiga.</div></div></div>
    ${NOVIDADES.map(([v, it], k) => html`<div key=${v} class=${'card novid-card' + (k === 0 ? ' nova' : '')}><b>Versão ${v}${k === 0 ? ' · atual' : ''}</b><ul class="novid">${it.map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>`)}</div>`;
}
function Novidades({ sessao }) {
  const atual = NOVIDADES[0][0];
  const lsGet = () => { try { return localStorage.getItem('gp-versao-vista') || ''; } catch { return ''; } };
  const [ver, setVer] = useState(null);
  useEffect(() => {
    window.__abrirNovidades = () => setVer(String(Number(atual) - 3));
    (async () => { let v = lsGet(); try { const d = await F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'usuarios', sessao.uid)); const fv = d.data()?.versaoVista || ''; if (!v || (fv && Number(fv) < Number(v))) v = fv; } catch {}
      if (Number(v || 0) < Number(atual)) setTimeout(() => setVer(v || String(Number(atual) - 3)), 1200); })();
  }, []);
  if (!ver) return null;
  const lista = NOVIDADES.filter(([v]) => Number(v) > Number(ver));
  const ok = () => { try { localStorage.setItem('gp-versao-vista', atual); } catch {} F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'usuarios', sessao.uid), { versaoVista: atual }, { merge: true }).catch(() => {}); setVer(null); };
  if (!lista.length) return null;
  return ReactDOM.createPortal(html`<div class="modal-fundo novid-fundo" onClick=${e => e.target === e.currentTarget && ok()}><div class="card modal-caixa stack novid-caixa" style=${{ width: 'min(520px,100%)' }}>
    <div class="sec-title">🆕 O que mudou</div>
    ${lista.map(([v, itens]) => html`<div key=${v}><small class="dim">Versão ${v}</small><ul class="novid">${itens.map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div>`)}
    <button class="btn btn-primary btn-block" onClick=${ok}>Entendi</button></div></div>`, document.body);
}
const recarregarApp = async () => { try { const ks = await caches?.keys?.(); ks && ks.forEach(k => caches.delete(k)); } catch {} location.reload(); };

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* =========================================================
   Utilidades
   ========================================================= */
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'empresa';
const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const fmtData = (v) => {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : (v.toDate ? v.toDate() : new Date(v));
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
};
const nowIso = () => new Date().toISOString();
const padNum = (n) => String(n || 0).padStart(4, '0');
// Número da OS no padrão ANO.SEQUÊNCIA (ex: 26.001). Vale também para as OSs antigas.
const anoDe = (o) => {
  const d = o && (o.criadoEm || o.dataAntiga);
  const m = String(d || '').match(/(20\d\d)/);
  return m ? m[1].slice(2) : String(new Date().getFullYear()).slice(2);
};
function numOS(o) {
  if (o == null) return '';
  if (typeof o === 'string' && o.includes('.')) return o;
  if (typeof o !== 'object') return String(new Date().getFullYear()).slice(2) + '.' + String(o || 0).padStart(3, '0');
  if (o.codigo) return o.codigo;
  return (o.ano || anoDe(o)) + '.' + String(o.numero || 0).padStart(3, '0');
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function waitFirebase() {
  return new Promise((resolve) => {
    if (window.__fb && (window.__fb.ready || window.__fb.error)) return resolve(window.__fb);
    window.addEventListener('fb-done', () => resolve(window.__fb), { once: true });
  });
}

let toastTimer = null;
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = useCallback((texto, tipo = 'info') => {
    setMsg({ texto, tipo });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setMsg(null), 3800);
  }, []);
  const el = msg ? html`<div class="toast" role="status" style=${{ borderColor: msg.tipo === 'erro' ? 'var(--danger)' : msg.tipo === 'ok' ? 'var(--ok)' : 'var(--line-strong)' }}>${msg.texto}</div>` : null;
  return [show, el];
}

/* =========================================================
   Modelo de OS
   ========================================================= */
const ESPESSURAS = ['6', '15', '18', '25'];
const TIPOS_FERRAGEM = ['Dobradiça', 'Corrediça', 'Sistema de gaveta', 'Articulador', 'Abertura', 'Porta de correr', 'Canto e despenseiro', 'Closet e cozinha', 'Outro'];
const STATUS_OS = [
  { v: 'elaboracao', t: '1. Elaboração', c: 'chip' },
  { v: 'projetos', t: '2. Projetos', c: 'chip chip-azul' },
  { v: 'producao', t: '3. Produção', c: 'chip chip-teal' },
  { v: 'liberacao', t: '4. Aguard. liberação p/ entrega', c: 'chip chip-warn' },
  { v: 'montagem', t: '5. Montagem', c: 'chip chip-roxo' },
  { v: 'concluida', t: '6. Concluída', c: 'chip chip-ok' },
];
/* Etapas do escritório personalizadas: a esteira da produção não mexe sozinha nelas */
const etapasPadrao = () => STATUS_OS.map(x => x.v).join() === 'elaboracao,projetos,producao,liberacao,montagem,concluida';
const osConcluida = (o) => STATUS_OS.length > 1 ? o?.status === STATUS_OS[STATUS_OS.length - 1].v : o?.status === 'concluida';
/* ---------- Grupos de acesso (quem vê o quê) ---------- */
const TELAS_ACESSO = [
  ['Geral', [['inicio', 'Início'], ['quadro', 'Quadro geral'], ['importar', 'Importar (IA)'], ['amostras', 'Amostras']]],
  ['Clientes', [['clientes', 'Cadastro de clientes'], ['projetos', 'Reuniões & Projetos'], ['contratos', 'Contratos']]],
  ['Produção', [['os', 'Ordens de Serviço'], ['cronograma', 'Cronograma'], ['pedidos', 'Peças extras'], ['catalogo', 'Catálogo'], ['excluir', 'Excluir OSs']]],
  ['Compras', [['compras', 'Compras, notas e parceiros']]],
  ['Equipe', [['equipe', 'Equipe e acessos']]],
  ['Financeiro', [['financeiro', 'Resultado por OS'], ['contas', 'Contas & custos operacionais']]],
  ['Sistema', [['config', 'Configurações']]],
];
const TODAS_TELAS = TELAS_ACESSO.flatMap(g => g[1].map(t => t[0]));
const GRUPOS_PADRAO = [
  { v: 'admin', t: 'Administrador', abas: TODAS_TELAS, fixo: true },
  { v: 'gerente', t: 'Gerente', abas: TODAS_TELAS.filter(x => !['equipe', 'config'].includes(x)) },
  { v: 'financeiro', t: 'Financeiro', abas: ['inicio', 'quadro', 'contratos', 'clientes', 'os', 'compras', 'financeiro', 'contas'] },
  { v: 'compras', t: 'Compras', abas: ['inicio', 'os', 'pedidos', 'catalogo', 'compras'] },
  { v: 'projetista', t: 'Projetista', abas: ['inicio', 'quadro', 'contratos', 'clientes', 'projetos', 'importar', 'os', 'cronograma', 'pedidos', 'catalogo', 'amostras'] },
  { v: 'vendedor', t: 'Vendedor', abas: ['inicio', 'quadro', 'contratos', 'clientes', 'projetos', 'os', 'catalogo', 'amostras'] },
  { v: 'producao', t: 'Produção', abas: ['inicio', 'os', 'cronograma', 'pedidos', 'catalogo'] },
  { v: 'montador', t: 'Montador', abas: ['inicio', 'os', 'cronograma', 'pedidos'] },
];
let PAPEIS = GRUPOS_PADRAO;
function aplicarGrupos(lista) {
  const l = Array.isArray(lista) && lista.length ? lista : GRUPOS_PADRAO;
  PAPEIS = [GRUPOS_PADRAO[0], ...l.filter(g => g.v !== 'admin')];
}
function abasDoUsuario(sessao) {
  if (sessao.papel === 'admin') return TODAS_TELAS;
  if (Array.isArray(sessao.abasProprias)) return sessao.abasProprias;
  const g = PAPEIS.find(p => p.v === sessao.papel);
  return g ? g.abas : ['inicio', 'os'];
}
const pode = (sessao, aba) => abasDoUsuario(sessao).includes(aba);

const novoMovel = (nome = '') => ({
  id: rand(8), nome, quantidade: 1, largura: '', altura: '', profundidade: '',
  mdfCaixa: { fabricante: '', cor: '', espessura: '18' },
  mdfFrente: { fabricante: '', cor: '', espessura: '18' },
  fitaBorda: '', portas: '', gavetas: '',
  ferragens: [], puxador: '', iluminacao: '', observacoes: '', revisar: [],
});
const novoAmbiente = (nome = '') => ({ id: rand(8), nome, moveis: [] });

// Garante que um JSON vindo da IA (ou de uma OS antiga) tenha todos os campos certinhos.
function sanearOS(o) {
  o = o || {};
  const s = (v) => (v == null ? '' : String(v));
  const mdf = (m) => ({ fabricante: s(m?.fabricante), cor: s(m?.cor), espessura: s(m?.espessura || '').replace(/\D/g, '') || '' });
  return {
    cliente: { nome: s(o.cliente?.nome), telefone: s(o.cliente?.telefone), endereco: s(o.cliente?.endereco), enderecoMontagem: s(o.cliente?.enderecoMontagem), obra: s(o.cliente?.obra) },
    prazoEntrega: s(o.prazoEntrega),
    observacoesGerais: s(o.observacoesGerais),
    ...(o.padrao && typeof o.padrao === 'object' ? { padrao: o.padrao } : {}),
    ...(o.tamponamento && typeof o.tamponamento === 'object' ? { tamponamento: o.tamponamento } : {}),
    ...(o.responsavel ? { responsavel: s(o.responsavel) } : {}),
    ...(o.arquiteto ? { arquiteto: s(o.arquiteto) } : {}),
    ...(o.ambienteResumo ? { ambienteResumo: s(o.ambienteResumo) } : {}),
    ambientes: (Array.isArray(o.ambientes) ? o.ambientes : []).map(a => ({
      ...JSON.parse(JSON.stringify(a || {})),
      id: a.id || rand(8),
      nome: s(a.nome),
      moveis: (Array.isArray(a.moveis) ? a.moveis : []).map(m => ({
        ...novoMovel(),
        id: m.id || rand(8),
        nome: s(m.nome),
        quantidade: Number(m.quantidade) || 1,
        largura: s(m.largura), altura: s(m.altura), profundidade: s(m.profundidade),
        mdfCaixa: mdf(m.mdfCaixa), mdfFrente: mdf(m.mdfFrente),
        fitaBorda: s(m.fitaBorda), portas: s(m.portas), gavetas: s(m.gavetas),
        ferragens: (Array.isArray(m.ferragens) ? m.ferragens : []).map(f => ({
          id: f.id || rand(6), tipo: s(f.tipo), fabricante: s(f.fabricante), modelo: s(f.modelo), quantidade: s(f.quantidade),
        })),
        puxador: s(m.puxador), iluminacao: s(m.iluminacao), observacoes: s(m.observacoes),
        revisar: Array.isArray(m.revisar) ? m.revisar.map(s).filter(Boolean) : [],
      })),
    })),
  };
}

// "Impressão digital" da OS: se duas OS tiverem o mesmo cliente e os mesmos móveis,
// medidas e cores, elas geram o mesmo código — é assim que o app barra OS repetida.
async function impressaoDigital(os) {
  const base = {
    c: norm(os.cliente?.nome),
    a: (os.ambientes || []).map(a => ({
      n: norm(a.nome),
      m: (a.moveis || []).map(m => [norm(m.nome), norm(m.largura), norm(m.altura), norm(m.profundidade), norm(m.mdfCaixa?.cor), norm(m.mdfFrente?.cor)].join('|')).sort(),
    })).sort((x, y) => x.n.localeCompare(y.n)),
  };
  return sha256(JSON.stringify(base));
}

/* =========================================================
   Firebase: autenticação e dados
   ========================================================= */
const F = () => window.__fb;
const emailDe = (login, empresaId) => `${norm(login).replace(/[^a-z0-9._-]/g, '')}@${empresaId}.osmoveis.app`;
const col = (...p) => F().fsMod.collection(F().db, ...p);
const docRef = (...p) => F().fsMod.doc(F().db, ...p);

function traduzErroAuth(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Usuário ou senha incorretos.';
  if (c.includes('email-already-in-use')) return 'Esse login já existe nessa empresa. Escolha outro.';
  if (c.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (c.includes('network')) return 'Sem internet. Confira a conexão e tente de novo.';
  if (c.includes('operation-not-allowed')) return 'O login por usuário e senha ainda não foi liberado no Firebase.';
  if (c.includes('permission-denied')) return 'Sem permissão. As regras do banco ainda não foram publicadas.';
  return 'Não foi possível concluir: ' + (e?.message || c || 'erro desconhecido');
}

async function listarEmpresas() {
  const { getDocs } = F().fsMod;
  const snap = await getDocs(col('empresas_publico'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function cadastrarEmpresa({ nome, cnpj, cidade, adminNome, login, senha }) {
  const { authMod, fsMod, auth } = F();
  const existentes = await listarEmpresas();
  if (existentes.some(e => norm(e.nome) === norm(nome) && norm(e.cidade) === norm(cidade))) {
    throw new Error('Já existe uma empresa com esse nome nessa cidade. Peça o acesso ao administrador dela.');
  }
  const empresaId = slug(nome) + '-' + rand(4);
  const cred = await authMod.createUserWithEmailAndPassword(auth, emailDe(login, empresaId), senha);
  const uid = cred.user.uid;
  const agora = nowIso();
  await fsMod.setDoc(docRef('usuarios_index', uid), { empresaId, papel: 'admin', nome: adminNome, login: norm(login) });
  await fsMod.setDoc(docRef('empresas', empresaId), { nome, cnpj: cnpj || '', cidade: cidade || '', osSeq: 0, criadoEm: agora });
  await fsMod.setDoc(docRef('empresas', empresaId, 'usuarios', uid), { nome: adminNome, login: norm(login), papel: 'admin', ativo: true, criadoEm: agora });
  await fsMod.setDoc(docRef('empresas_publico', empresaId), { nome, cidade: cidade || '' });
  return empresaId;
}

// Cadastra alguém da equipe sem deslogar o administrador (usa uma segunda conexão).
async function cadastrarUsuario(empresaId, { nome, login, senha, papel }) {
  const { appMod, authMod, fsMod, cfg } = F();
  let sec;
  try { sec = appMod.getApp('secundario'); } catch { sec = appMod.initializeApp(cfg, 'secundario'); }
  const secAuth = authMod.getAuth(sec);
  const cred = await authMod.createUserWithEmailAndPassword(secAuth, emailDe(login, empresaId), senha);
  const uid = cred.user.uid;
  await authMod.signOut(secAuth);
  await fsMod.setDoc(docRef('usuarios_index', uid), { empresaId, papel, nome, login: norm(login) });
  await fsMod.setDoc(docRef('empresas', empresaId, 'usuarios', uid), { nome, login: norm(login), papel, ativo: true, criadoEm: nowIso() });
}

async function chamarIA(tarefa, dados = {}, imagens = []) {
  const user = F().auth.currentUser;
  if (!user) throw new Error('Faça login de novo.');
  const token = await user.getIdToken();
  const mostrar = tarefa !== 'assistente' && tarefa !== 'traduzir';
  const corpo = JSON.stringify({ tarefa, dados, imagens });
  const base = PROG.st ? Math.max(PROG.st.pct || 0, 40) : 5;
  let espera = null;
  if (mostrar) PROG.set({ label: '⬆️ Enviando para a IA…', pct: base, erro: false, arquivo: PROG.st?.arquivo || (corpo.length > 1048576 ? (corpo.length / 1048576).toFixed(1) + ' MB' : Math.ceil(corpo.length / 1024) + ' KB') });
  try {
    let resp;
    for (let tent = 1; ; tent++) {
    await CTRL.ponto();
    resp = await new Promise((ok, falha) => {
      const x = new XMLHttpRequest(); CTRL.xhr = x; x.onabort = () => falha(new Error('Cancelado por você.')); x.open('POST', '/api/ia'); x.setRequestHeader('content-type', 'application/json'); x.setRequestHeader('authorization', 'Bearer ' + token);
      if (mostrar) x.upload.onprogress = (e) => { if (e.lengthComputable) PROG.set({ pct: base + (e.loaded / e.total) * (70 - base) * 0.5 + 0, label: '⬆️ Enviando… ' + Math.round(e.loaded / e.total * 100) + '%' }); };
      if (mostrar) x.upload.onload = () => { PROG.set({ label: '🤖 A IA está lendo…', pct: Math.max(PROG.st?.pct || 0, 60) }); espera = setInterval(() => { const p = PROG.st?.pct || 60; PROG.set({ pct: p + (96 - p) * 0.06 }); }, 700); };
      x.onload = () => ok({ status: x.status, texto: x.responseText });
      x.onerror = () => falha(new Error('Sem conexão com o servidor. Confira a internet.'));
      x.send(corpo);
    });
    clearInterval(espera); CTRL.xhr = null;
    if (![502, 503, 504, 429, 529].includes(resp.status) || tent >= 4) break;
    if (mostrar) PROG.set({ label: '🔁 Servidor ocupado — tentando de novo (' + (tent + 1) + ' de 4)…' });
    for (let i = 0; i < tent * 8; i++) { await CTRL.ponto(); await new Promise(r => setTimeout(r, 500)); }
    }
    let body = {}; try { body = JSON.parse(resp.texto); } catch {}
    if (resp.status < 200 || resp.status >= 300) throw new Error(body.erro || 'A IA não respondeu (erro ' + resp.status + ').');
    if (mostrar) PROG.fim(true);
    return body.resultado;
  } catch (e) { clearInterval(espera); if (mostrar) PROG.fim(false); throw e; }
}

/* ---------- OS: criar sem repetir, com número único ---------- */
async function acharDuplicada(empresaId, fp, ignorarId) {
  const { getDocs, query, where, limit } = F().fsMod;
  const snap = await getDocs(query(col('empresas', empresaId, 'os'), where('fingerprint', '==', fp), limit(3)));
  const d = snap.docs.find(x => x.id !== ignorarId);
  return d ? { id: d.id, ...d.data() } : null;
}

/* Numeração: sempre segue as OSs que existem (apagou → o número volta a ficar livre) */
async function numerosUsados(empresaId) {
  const snap = await F().fsMod.getDocs(col('empresas', empresaId, 'os'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
function lerCodigo(txt) {
  const t = String(txt || '');
  let m = t.match(/(?:^|[^\d])(\d{2})\s*[.,\-_ ]\s*(\d{1,4})(?!\d)/);
  if (m) return { ano: m[1], numero: parseInt(m[2], 10) };
  m = t.match(/(?:^|[^\d])(\d{2})(\d{3})(?!\d)/);
  if (m) return { ano: m[1], numero: parseInt(m[2], 10) };
  return null;
}
const codigoDe = (ano, n) => ano + '.' + String(n).padStart(3, '0');
function proximoLivre(lista, ano) {
  const usados = lista.filter(o => numOS(o).startsWith(ano + '.')).map(o => parseInt(numOS(o).split('.')[1], 10) || 0);
  return (usados.length ? Math.max(...usados) : 0) + 1;
}
async function ajustarSequencia(sessao) {
  try {
    const lista = await numerosUsados(sessao.empresaId);
    const seq = {};
    lista.forEach(o => { const [a, n] = numOS(o).split('.'); const v = parseInt(n, 10) || 0; if (a && v > (seq[a] || 0)) seq[a] = v; });
    const ano = String(new Date().getFullYear()).slice(2); if (!seq[ano]) seq[ano] = 0;
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { seqAno: seq, osSeq: lista.length });
  } catch {}
}
function pedirTexto(titulo, ph, ini = '') {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    function M() { const [v, setV] = useState(ini); return html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(420px,100%)' }}>
      <div class="sec-title">${titulo}</div><input class="inp" autoFocus placeholder=${ph} value=${v} onInput=${e => setV(e.target.value)} onKeyDown=${e => e.key === 'Enter' && fim(v)} />
      <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${() => fim('')}>Cancelar</button><button class="btn btn-grande btn-primary" style=${{ flex: 1 }} onClick=${() => fim(v)}>OK</button></div></div></div>`; }
    root.render(html`<${M} />`);
  });
}
/* Caixa de escolha (aviso com opções) */
function escolher(titulo, texto, opcoes, links) {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    root.render(html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(520px,100%)' }}>
      <div class="sec-title">⚠️ ${titulo}</div><div style=${{ whiteSpace: 'pre-line' }}>${texto}</div>
      ${(links || []).length > 0 && html`<div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}>${links.map((l, i) => html`<button key=${i} class="btn btn-sm" onClick=${l.fn}>${l.t}</button>`)}</div>`}
      <div class="stack" style=${{ gap: '6px' }}>${opcoes.map((o, i) => html`<button key=${i} class=${'btn btn-grande btn-block ' + (o.cls || '')} onClick=${() => fim(o.v)}>${o.t}${o.d ? html`<small style=${{ display: 'block', fontWeight: 400, opacity: .8 }}>${o.d}</small>` : ''}</button>`)}</div>
    </div></div>`);
  });
}
/* ---------- Clientes com nome quase igual (ex.: Silmara x Sillmara) ---------- */
const baseCli = (n) => String(n || '').split(/\s[-–]\s/)[0].trim();
const chaveSom = (n) => norm(baseCli(n)).replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
function cliParecido(a, b) { const x = baseCli(a), y = baseCli(b); if (!x || !y || x === y) return false; const kx = chaveSom(x), ky = chaveSom(y); if (kx === ky) return true;
  return Math.min(kx.length, ky.length) >= 6 && lev(kx, ky) <= 1; }
function gruposClientesParecidos(oss) {
  const nomes = [...new Set((oss || []).map(o => baseCli(o.cliente?.nome)).filter(Boolean))]; const vistos = new Set(), grupos = [];
  nomes.forEach(n => { if (vistos.has(n)) return; const g = [n, ...nomes.filter(m => m !== n && !vistos.has(m) && cliParecido(n, m))]; if (g.length > 1) { g.forEach(x => vistos.add(x)); grupos.push(g.map(x => [x, oss.filter(o => baseCli(o.cliente?.nome) === x).length]).sort((a, b) => b[1] - a[1])); } });
  return grupos;
}
async function unificarCliente(sessao, oss, de, para, quem = '') {
  const { writeBatch, getDocs } = F().fsMod; const E = sessao.empresaId; const b = writeBatch(F().db); let n = 0;
  const troca = (nome) => { const r = String(nome || ''); return baseCli(r) === de ? para + r.slice(baseCli(r).length + (r.length - r.trimStart().length)) : r; };
  oss.filter(o => baseCli(o.cliente?.nome) === de).forEach(o => { b.update(docRef('empresas', E, 'os', o.id), { cliente: { ...(o.cliente || {}), nome: troca(o.cliente.nome) }, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); n++; });
  try { (await getDocs(col('empresas', E, 'tarefas'))).docs.forEach(d => { const t = d.data(); if (t.cliente && baseCli(t.cliente) === de) b.update(d.ref, { cliente: troca(t.cliente) }); }); } catch {}
  await b.commit();
  oss.filter(o => baseCli(o.cliente?.nome) === de).forEach(o => registrar(sessao, o.id, quem + '👤', 'Nome do cliente unificado', de + ' → ' + para));
  return n;
}
function AvisoClientes({ sessao, lista, toast }) {
  const grupos = gruposClientesParecidos(lista);
  if (!grupos.length) return null;
  const unir = async (g, para) => { try { let n = 0; for (const [de] of g) if (de !== para) n += await unificarCliente(sessao, lista, de, para); toast(n + ' OS agora com o nome "' + para + '".', 'ok'); } catch (e) { toast(e.message, 'erro'); } };
  return html`<div class="card aviso-cli"><b>⚠ Clientes com nome quase igual — é a mesma pessoa?</b>
    ${grupos.map((g, k) => html`<div key=${k} class="aviso-g"><span>${g.map(([n, q]) => html`<span class="aviso-n">${n} <small>(${q} OS)</small></span>`)}</span>
      <span class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${g.map(([n]) => html`<button key=${n} class="btn btn-sm btn-primary" onClick=${() => unir(g, n)}>Juntar como "${n}"</button>`)}</span></div>`)}
  </div>`;
}

async function criarOS(sessao, conteudo, extras = {}) {
  const { fsMod } = F();
  const os = sanearOS(conteudo);
  os.cliente.nome = nomePadrao(os.cliente.nome); (os.ambientes || []).forEach(a => { a.nome = nomePadrao(a.nome); }); if (os.ambienteResumo) os.ambienteResumo = nomePadrao(os.ambienteResumo);
  try { const nm = baseCli(os.cliente?.nome); if (nm) { const lst = (await fsMod.getDocs(col('empresas', sessao.empresaId, 'os'))).docs.map(d => d.data()); const par = [...new Set(lst.map(o => baseCli(o.cliente?.nome)).filter(x => cliParecido(nm, x)))];
    if (par.length) { const r = await escolher('Cliente parecido', 'Já existe cliente com nome quase igual:\n"' + par.join('", "') + '"\nNovo: "' + nm + '"', [...par.map(x => ({ v: x, t: 'É o mesmo — usar "' + x + '"', cls: 'btn-primary' })), { v: '__novo', t: 'É outro cliente — manter "' + nm + '"' }]);
      if (r && r !== '__novo') os.cliente = { ...os.cliente, nome: r + String(os.cliente.nome).slice(baseCli(os.cliente.nome).length) }; } } } catch {}
  const fp = await impressaoDigital(os);
  const dup = await acharDuplicada(sessao.empresaId, fp);
  if (dup) {
    const err = new Error(`Já existe a OS nº ${numOS(dup)} igual a esta (mesmo cliente, mesmos móveis, medidas e cores). Abra a OS existente em vez de criar outra.`);
    err.duplicada = dup;
    throw err;
  }
  const empRef = docRef('empresas', sessao.empresaId);
  const osRef = fsMod.doc(col('empresas', sessao.empresaId, 'os'));
  const agora = nowIso();
  let numero = 0, codigo = '';
  let ano = String(new Date().getFullYear()).slice(2);
  const existentes = await numerosUsados(sessao.empresaId);
  if (extras.fixo) {
    ano = extras.fixo.ano; numero = extras.fixo.numero;
    if (existentes.some(o => numOS(o) === codigoDe(ano, numero))) throw new Error('O número ' + codigoDe(ano, numero) + ' já está em uso.');
  } else numero = proximoLivre(existentes, ano);
  codigo = codigoDe(ano, numero);
  await fsMod.runTransaction(F().db, async (tx) => {
    const e = await tx.get(empRef);
    const ed = e.data() || {};
    const seqs = ed.seqAno || {};
    tx.update(empRef, { osSeq: existentes.length + 1, seqAno: { ...seqs, [ano]: Math.max(numero, proximoLivre(existentes, ano) - 1) } });
    tx.set(osRef, {
      ...os, numero, ano, codigo, fingerprint: fp, status: STATUS_OS[0]?.v || 'elaboracao', modoExecucao: 'interna',
      projetoId: extras.projetoId || '', origem: extras.origem || 'manual',
      numeroAntigo: extras.numeroAntigo || '', dataAntiga: extras.dataAntiga || '', arquivoOrigem: extras.arquivoOrigem || '',
      criadoPor: sessao.nome, criadoEm: agora, atualizadoEm: agora, atualizadoPor: sessao.nome,
    });
  });
  return { id: osRef.id, numero: codigo, codigo };
}

/* =========================================================
   Leitura de arquivos (PDF, Word, Excel, fotos)
   ========================================================= */
function lerArrayBuffer(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
}
function lerTexto(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
}
function canvasParaJpeg(canvas, q = 0.82) { return canvas.toDataURL('image/jpeg', q); }
async function imagemParaJpeg(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return canvasParaJpeg(c);
  } finally { URL.revokeObjectURL(url); }
}

// Devolve { texto, imagens } de qualquer arquivo aceito.
/* ---------- Barra de transferência (arquivos e IA) ---------- */
const CTRL = { pausado: false, cancelado: false, xhr: null,
  pausar() { this.pausado = !this.pausado; PROG.set({ pausado: this.pausado }); },
  cancelar() { this.cancelado = true; this.pausado = false; try { this.xhr && this.xhr.abort(); } catch {} PROG.set({ label: '✖ Cancelando…', pausado: false }); },
  reset() { this.pausado = false; this.cancelado = false; },
  async ponto() { while (this.pausado && !this.cancelado) await new Promise(r => setTimeout(r, 300)); if (this.cancelado) throw new Error('Cancelado por você.'); },
};
const PROG = { st: null, t: null,
  set(p) { clearTimeout(this.t); this.st = { ...(this.st || {}), ...p }; try { if (!this.st.interrompido) localStorage.setItem('osm_prog', JSON.stringify({ ...this.st, em: Date.now() })); } catch {} window.dispatchEvent(new Event('prog')); },
  fim(ok = true) { if (!this.st) return; this.set({ pct: 100, label: ok ? '✓ Pronto' : '⚠ Não deu certo', erro: !ok }); try { localStorage.removeItem('osm_prog'); } catch {} this.t = setTimeout(() => { this.st = null; window.dispatchEvent(new Event('prog')); }, ok ? 900 : 2500); },
  fechar() { this.st = null; try { localStorage.removeItem('osm_prog'); } catch {} window.dispatchEvent(new Event('prog')); },
};
/* Se a tela atualizou no meio de um envio, mostra discretamente o que ficou pela metade */
try { const v = JSON.parse(localStorage.getItem('osm_prog') || 'null'); if (v && (v.pct || 0) < 100 && Date.now() - (v.em || 0) < 864e5) PROG.st = { ...v, interrompido: true }; else localStorage.removeItem('osm_prog'); } catch {}
function BarraTransferencia() {
  const [, f] = useState(0);
  useEffect(() => { const h = () => f(x => x + 1); window.addEventListener('prog', h); return () => window.removeEventListener('prog', h); }, []);
  const st = PROG.st; if (!st) return null;
  const pct = Math.max(2, Math.min(100, Math.round(st.pct || 0)));
  if (st.interrompido) return html`<div class="transf-mini"><span>⚠ Envio interrompido (a tela atualizou)${st.arquivo ? ': ' + st.arquivo.split(' · ')[0] : ''} — parou em ${pct}%. Envie de novo.</span><button onClick=${() => PROG.fechar()}>✕</button></div>`;
  return html`<div class="transf-top"><i style=${{ width: pct + '%' }}></i></div>
    <div class=${'transf-card' + (st.erro ? ' erro' : pct >= 100 ? ' ok' : '')}>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' }}><b>${st.label || 'Carregando…'}</b><span>${pct}%</span></div>
      ${st.arquivo && html`<small>${st.arquivo}</small>`}
      <div class=${'transf-barra' + (st.pausado ? ' pausada' : '')}><i style=${{ width: pct + '%' }}></i></div>
      ${pct < 100 && html`<div class="row" style=${{ gap: '8px', justifyContent: 'flex-end' }}>
        <button class="transf-btn" onClick=${() => CTRL.pausar()}>${st.pausado ? '▶ Continuar' : '⏸ Pausar'}</button>
        <button class="transf-btn" onClick=${() => CTRL.cancelar()}>✖ Cancelar</button></div>`}
    </div>`;
}
async function extrairArquivo(file) {
  await CTRL.ponto();
  PROG.set({ label: '📂 Lendo o arquivo…', arquivo: file.name + ' · ' + (file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.ceil(file.size / 1024) + ' KB'), pct: 3, erro: false });
  try { const r = await extrairArquivo0(file); PROG.set({ pct: 40, label: '✓ Arquivo lido' }); return r; } catch (e) { PROG.fim(false); throw e; }
}
async function extrairArquivo0(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: await lerArrayBuffer(file) }).promise;
    let texto = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      await CTRL.ponto();
      PROG.set({ label: '📄 Lendo página ' + p + ' de ' + pdf.numPages, pct: 5 + p / pdf.numPages * 30 });
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      let linhaY = null, linha = '';
      const linhas = [];
      for (const it of tc.items) {
        const y = Math.round(it.transform[5]);
        if (linhaY !== null && Math.abs(y - linhaY) > 3) { linhas.push(linha); linha = ''; }
        linha += (linha && !linha.endsWith(' ') ? ' ' : '') + it.str;
        linhaY = y;
      }
      if (linha) linhas.push(linha);
      texto += `\n--- Página ${p} ---\n` + linhas.join('\n');
    }
    const imagens = [];
    // PDF escaneado (só imagem): transforma as páginas em fotos pra IA ler.
    if (texto.replace(/--- Página \d+ ---/g, '').trim().length < 80) {
      for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
        PROG.set({ label: '🖼 Preparando imagem da página ' + p, pct: 20 + p / Math.min(pdf.numPages, 10) * 18 });
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1.6 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        imagens.push(canvasParaJpeg(c, 0.78));
      }
      texto = '';
    }
    return { texto: texto.trim(), imagens, paginas: pdf.numPages };
  }
  if (nome.endsWith('.docx')) {
    const r = await mammoth.extractRawText({ arrayBuffer: await lerArrayBuffer(file) });
    return { texto: r.value.trim(), imagens: [] };
  }
  if (nome.endsWith('.doc')) {
    throw new Error('Arquivo .doc antigo: abra no Word e salve como .docx (ou PDF) para importar.');
  }
  if (/\.(xlsx|xlsm|xls|ods|csv)$/.test(nome)) {
    const wb = XLSX.read(await lerArrayBuffer(file), { type: 'array' });
    const texto = wb.SheetNames.map(n => `--- Planilha ${n} ---\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ' | ' })).join('\n');
    return { texto: texto.trim(), imagens: [] };
  }
  if (/\.(txt|md)$/.test(nome)) return { texto: (await lerTexto(file)).trim(), imagens: [] };
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/.test(nome)) {
    return { texto: '', imagens: [await imagemParaJpeg(file)] };
  }
  throw new Error('Formato não suportado. Use PDF, Word (.docx), Excel, texto ou foto.');
}

/* =========================================================
   Voz: reconhecimento pelo microfone (Chrome / Edge)
   ========================================================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function useFala({ onFinal, onInterim, global: ehGlobal } = {}) {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState('');
  const recRef = useRef(null);
  const querRef = useRef(false);
  const cbRef = useRef({ onFinal, onInterim });
  cbRef.current = { onFinal, onInterim };

  const iniciar = useCallback(() => {
    if (!SR) { setErro('Este navegador não reconhece voz. Use o Google Chrome ou o Microsoft Edge.'); return; }
    setErro('');
    const rec = new SR();
    rec.lang = (window.__I18N && window.__I18N.locale()) || 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) { try { window.__I18N && window.__I18N.detectar(r[0].transcript); } catch {} cbRef.current.onFinal?.(r[0].transcript.trim()); }
        else interim += r[0].transcript;
      }
      cbRef.current.onInterim?.(interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        querRef.current = false;
        setErro('O navegador bloqueou o microfone. Clique no cadeado ao lado do endereço do site e permita o microfone.');
      } else if (ev.error === 'audio-capture') {
        querRef.current = false;
        setErro('Nenhum microfone encontrado neste aparelho.');
      }
    };
    rec.onend = () => {
      cbRef.current.onInterim?.('');
      // O Chrome para sozinho depois de um tempo; se ainda queremos ouvir, reinicia.
      if (querRef.current) { try { rec.start(); } catch {} } else { setOuvindo(false); if (!ehGlobal) setTimeout(() => window.__vozGlobal?.retomar(), 300); }
    };
    recRef.current = rec;
    querRef.current = true;
    if (!ehGlobal) window.__vozGlobal?.pausar();
    try { rec.start(); setOuvindo(true); } catch (e) { setErro('Não consegui ligar o microfone.'); }
  }, []);

  const parar = useCallback(() => {
    querRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setOuvindo(false);
    if (!ehGlobal) setTimeout(() => window.__vozGlobal?.retomar(), 300);
  }, []);

  useEffect(() => () => { querRef.current = false; try { recRef.current?.abort(); } catch {} }, []);
  return { ouvindo, erro, iniciar, parar, suportado: !!SR };
}

/* =========================================================
   Catálogo (base + itens salvos pela empresa)
   ========================================================= */
let CATALOGO_BASE = [];
const catalogoBasePronto = fetch('/catalogo.json').then(r => r.json()).then(d => { CATALOGO_BASE = d; return d; }).catch(() => []);

function useCatalogo(empresaId) {
  const [base, setBase] = useState(CATALOGO_BASE);
  const [meus, setMeus] = useState([]);
  useEffect(() => { catalogoBasePronto.then(setBase); }, []);
  useEffect(() => {
    if (!empresaId) return;
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas', empresaId, 'catalogo'), (s) => setMeus(s.docs.map(d => ({ id: d.id, ...d.data(), daEmpresa: true }))));
  }, [empresaId]);
  const todos = useMemo(() => {
    const vistos = new Set();
    const out = [];
    for (const it of [...meus, ...base]) {
      const k = norm(it.tipo + '|' + it.fabricante + '|' + it.nome);
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ ...it, _busca: norm([it.tipo, it.fabricante, it.linha, it.nome].join(' ')) });
    }
    return out;
  }, [base, meus]);
  return todos;
}

function buscarNoCatalogo(itens, termo, filtro = {}) {
  const tokens = norm(termo).split(' ').filter(Boolean);
  const res = [];
  for (const it of itens) {
    if (filtro.tipos && !filtro.tipos.includes(it.tipo)) continue;
    if (filtro.fabricante && norm(it.fabricante) !== norm(filtro.fabricante) && tokens.length === 0) continue;
    if (filtro.linha && it.tipo === 'Ferragem' && norm(it.linha) !== norm(filtro.linha) && tokens.length === 0) continue;
    if (tokens.every(t => it._busca.includes(t))) res.push(it);
    if (res.length >= 60) break;
  }
  if (filtro.fabricante) res.sort((a, b) => (norm(b.fabricante) === norm(filtro.fabricante)) - (norm(a.fabricante) === norm(filtro.fabricante)));
  return res;
}

async function salvarNoCatalogo(empresaId, catalogo, item, autor) {
  if (!item.nome?.trim()) return;
  const k = norm(item.tipo + '|' + (item.fabricante || '') + '|' + item.nome);
  if (catalogo.some(c => norm(c.tipo + '|' + (c.fabricante || '') + '|' + c.nome) === k)) return;
  if (catalogo.some(c => c.tipo === item.tipo && norm(c.nome) === norm(item.nome))) return;
  const { addDoc } = F().fsMod;
  await addDoc(col('empresas', empresaId, 'catalogo'), {
    tipo: item.tipo, fabricante: (item.fabricante || '').trim(), linha: (item.linha || '').trim(), nome: item.nome.trim(),
    criadoPor: autor || '', criadoEm: nowIso(),
  });
}

function resumoCatalogo(itens) {
  const grupos = {};
  for (const it of itens) {
    const k = it.tipo === 'MDF' ? `MDF ${it.fabricante}` : `${it.tipo} ${it.fabricante || ''} ${it.linha || ''}`.trim();
    (grupos[k] = grupos[k] || []).push(it.nome);
  }
  return Object.entries(grupos).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n');
}

// Campo de texto com busca em tempo real no catálogo.
// O que for digitado e não existir é salvo no catálogo da empresa ao sair do campo.
function CatalogoInput({ value, onChange, onPick, catalogo, filtro, placeholder, salvarComo, sessao, className = 'inp inp-sm', review }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(0);
  const [termo, setTermo] = useState(null);
  const texto = termo ?? value ?? '';
  const opcoes = useMemo(() => aberto ? buscarNoCatalogo(catalogo, texto, filtro) : [], [aberto, texto, catalogo, filtro?.fabricante, filtro?.linha]);
  const existe = texto.trim() && catalogo.some(c => norm(c.nome) === norm(texto) && (!filtro?.tipos || filtro.tipos.includes(c.tipo)));

  const escolher = (it) => {
    setTermo(null); setAberto(false);
    onChange(it.nome);
    onPick?.(it);
  };
  const aoSair = () => {
    setTimeout(() => {
      setAberto(false);
      if (termo != null) {
        onChange(termo);
        setTermo(null);
        if (termo.trim() && salvarComo && sessao) {
          salvarNoCatalogo(sessao.empresaId, catalogo, { ...salvarComo(termo), nome: termo }, sessao.nome).catch(() => {});
        }
      }
    }, 160);
  };
  const tecla = (e) => {
    if (!aberto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, opcoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && opcoes[sel]) { e.preventDefault(); escolher(opcoes[sel]); }
    else if (e.key === 'Escape') setAberto(false);
  };

  return html`
    <div class="cat-wrap">
      <input class=${className + (review ? ' need-review' : '')} value=${texto} placeholder=${placeholder}
        onFocus=${() => { setAberto(true); setSel(0); }}
        onInput=${e => { setTermo(e.target.value); setAberto(true); setSel(0); }}
        onBlur=${aoSair} onKeyDown=${tecla} autocomplete="off" />
      ${aberto && (opcoes.length > 0 || (texto.trim() && !existe)) && html`
        <div class="cat-drop">
          ${opcoes.map((it, i) => html`
            <div key=${it.id || i} class=${'cat-opt' + (i === sel ? ' sel' : '')} onMouseDown=${e => { e.preventDefault(); escolher(it); }}>
              <span style=${{ flex: 1 }}>${it.nome}</span>
              <span class="fab">${[it.fabricante, it.linha].filter(Boolean).join(' · ')}</span>
            </div>`)}
          ${texto.trim() && !existe && salvarComo && html`
            <div class="cat-opt new" onMouseDown=${e => { e.preventDefault(); }}>
              + “${texto.trim()}” será salvo no catálogo ao sair do campo
            </div>`}
        </div>`}
    </div>`;
}

/* =========================================================
   Tela de login (mesmo estilo do Gerenciador de Culto)
   ========================================================= */
function Marca({ grande }) {
  return html`
    <div class=${grande ? 'login-brand' : 'brand-mini'}>
      <div class=${'brand-mark' + (grande ? ' mark' : '')}>GP</div>
      ${grande ? html`
        <h1><span class="grad-text">Gestão Pró</span></h1>
        <div class="muted" style=${{ fontSize: '14px' }}>Contrato, ata e ordem de serviço de móveis planejados</div>
      ` : html`<div>
        <div style=${{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', lineHeight: 1.1 }}>Gestão Pró</div>
      </div>`}
    </div>`;
}

function Senha({ value, onInput, placeholder = 'Senha', id }) {
  const [ver, setVer] = useState(false);
  return html`
    <div class="pass-wrap">
      <input id=${id} class="inp" type=${ver ? 'text' : 'password'} placeholder=${placeholder} value=${value} onInput=${onInput} style=${{ paddingRight: '42px' }} />
      <button type="button" onClick=${() => setVer(v => !v)} title=${ver ? 'Ocultar senha' : 'Mostrar senha'}>${ver ? '🙈' : '👁️'}</button>
    </div>`;
}

function TelaLogin() {
  const [modo, setModo] = useState('entrar');
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [esqueci, setEsqueci] = useState(false);
  const [devAberto, setDevAberto] = useState(false);

  const [empresaId, setEmpresaId] = useState(() => { try { return localStorage.getItem('osm_empresa') || ''; } catch { return ''; } });
  const [filtroEmp, setFiltroEmp] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);

  const [c, setC] = useState({ nome: '', cnpj: '', cidade: '', adminNome: '', login: '', senha: '', senha2: '' });
  const setCampo = (k) => (e) => setC(v => ({ ...v, [k]: e.target.value }));

  useEffect(() => {
    listarEmpresas().then(setEmpresas).catch(e => setErro(traduzErroAuth(e))).finally(() => setCarregando(false));
  }, []);

  const empresasFiltradas = useMemo(() => {
    const t = norm(filtroEmp);
    return empresas.filter(e => !t || norm(e.nome + ' ' + e.cidade).includes(t));
  }, [empresas, filtroEmp]);

  const entrar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!empresaId) return setErro('Escolha a sua empresa.');
    if (!login.trim() || !senha) return setErro('Digite usuário e senha.');
    setOcupado(true);
    try {
      const { authMod, auth } = F();
      await authMod.setPersistence(auth, lembrar ? authMod.browserLocalPersistence : authMod.browserSessionPersistence);
      await authMod.signInWithEmailAndPassword(auth, emailDe(login, empresaId), senha);
      try { localStorage.setItem('osm_empresa', empresaId); } catch {}
    } catch (e2) { setErro(traduzErroAuth(e2)); }
    setOcupado(false);
  };

  const cadastrar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!c.nome.trim()) return setErro('Informe o nome da empresa.');
    if (!c.cidade.trim()) return setErro('Informe a cidade.');
    if (!c.adminNome.trim()) return setErro('Informe o seu nome.');
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(c.login.trim())) return setErro('O login deve ter pelo menos 3 letras ou números, sem espaços.');
    if (c.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    if (c.senha !== c.senha2) return setErro('As duas senhas estão diferentes.');
    setOcupado(true);
    try {
      const id = await cadastrarEmpresa({ nome: c.nome.trim(), cnpj: c.cnpj.trim(), cidade: c.cidade.trim(), adminNome: c.adminNome.trim(), login: c.login.trim(), senha: c.senha });
      try { localStorage.setItem('osm_empresa', id); } catch {}
    } catch (e2) { setErro(e2.code ? traduzErroAuth(e2) : e2.message); }
    setOcupado(false);
  };

  return html`
    <div class="login-page">
      <div class="fade-up" style=${{ width: '100%', maxWidth: modo === 'cadastrar' ? '480px' : '420px' }}>
        <${Marca} grande=${true} />
        <div class="glass login-card">
          <div class="seg">
            <button class=${modo === 'entrar' ? 'on' : ''} onClick=${() => { setModo('entrar'); setErro(''); }}>Entrar</button>
            <button class=${modo === 'cadastrar' ? 'on' : ''} onClick=${() => { setModo('cadastrar'); setErro(''); }}>Cadastrar Empresa</button>
          </div>
          ${erro && html`<div class="error-box">${erro}</div>`}

          ${modo === 'entrar' ? html`
            <form onSubmit=${entrar} class="stack" style=${{ gap: '10px' }}>
              ${empresas.length > 8 && html`
                <input id="f-busca-emp" class="inp" placeholder="Buscar empresa…" value=${filtroEmp} onInput=${e => setFiltroEmp(e.target.value)} />`}
              <select id="f-empresa" class="inp" value=${empresaId} onChange=${e => setEmpresaId(e.target.value)}>
                <option value="">${carregando ? 'Carregando empresas…' : 'Empresa…'}</option>
                ${empresasFiltradas.map(e => html`<option key=${e.id} value=${e.id}>${e.nome}${e.cidade ? ' — ' + e.cidade : ''}</option>`)}
              </select>
              <input id="f-login" class="inp" placeholder="Usuário" value=${login} onInput=${e => setLogin(e.target.value)} autocomplete="username" />
              <${Senha} id="f-senha" value=${senha} onInput=${e => setSenha(e.target.value)} />
              <label class="row muted" style=${{ fontSize: '13px', gap: '8px' }}>
                <input type="checkbox" checked=${lembrar} onChange=${e => setLembrar(e.target.checked)} style=${{ width: '16px', height: '16px' }} />
                Manter conectado neste aparelho
              </label>
              <button type="submit" class="btn btn-primary btn-lg btn-block" disabled=${ocupado}>${ocupado ? 'Entrando…' : 'Entrar no Sistema'}</button>
              <button type="button" class="btn btn-ghost btn-sm" onClick=${() => setEsqueci(v => !v)}>Esqueci minha senha</button>
              ${esqueci && html`<div class="warn-box">Peça ao administrador da sua empresa. Ele entra em <b>Equipe</b> e cria um novo acesso pra você. Depois de entrar, você troca a senha em <b>Minha conta</b>.</div>`}
              <div class="dim" style=${{ textAlign: 'center' }}>Sua empresa não aparece? Cadastre na aba ao lado.</div>
            </form>
          ` : html`
            <form onSubmit=${cadastrar} class="stack" style=${{ gap: '10px' }}>
              <div class="section-label">Empresa</div>
              <input id="c-nome" class="inp" placeholder="Nome da empresa" value=${c.nome} onInput=${setCampo('nome')} />
              <div class="grid2">
                <input id="c-cnpj" class="inp" placeholder="CNPJ (opcional)" value=${c.cnpj} onInput=${setCampo('cnpj')} />
                <input id="c-cidade" class="inp" placeholder="Cidade" value=${c.cidade} onInput=${setCampo('cidade')} />
              </div>
              <div class="section-label">Administrador</div>
              <input id="c-admin" class="inp" placeholder="Seu nome" value=${c.adminNome} onInput=${setCampo('adminNome')} />
              <input id="c-login" class="inp" placeholder="Login de acesso (ex: paulo)" value=${c.login} onInput=${setCampo('login')} />
              <${Senha} id="c-senha" value=${c.senha} onInput=${setCampo('senha')} placeholder="Senha (mínimo 6)" />
              <${Senha} id="c-senha2" value=${c.senha2} onInput=${setCampo('senha2')} placeholder="Repita a senha" />
              <button type="submit" class="btn btn-primary btn-lg btn-block" disabled=${ocupado}>${ocupado ? 'Cadastrando…' : 'Cadastrar Empresa'}</button>
              <div class="dim">Depois de entrar, você cadastra a equipe (projetistas, vendedores, produção) em <b>Equipe</b>.</div>
            </form>
          `}
        </div>
      </div>
      <button class="dev-corner" title="Acesso do desenvolvedor" aria-label="Acesso do desenvolvedor" onClick=${() => setDevAberto(true)}>⚙</button>
      ${devAberto && html`<${LoginDev} fechar=${() => setDevAberto(false)} />`}
    </div>`;
}

/* =========================================================
   Desenvolvedor: login discreto e painel
   ========================================================= */
const EMAIL_DEV = 'desenvolvedor@painel.gestaopro.app';

function LoginDev({ fechar }) {
  const [cfg, setCfg] = useState(undefined);
  const [login, setLogin] = useState(''), [email, setEmail] = useState('');
  const [senha, setSenha] = useState(''), [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState(''), [ok, setOk] = useState(''), [ocupado, setOcupado] = useState(false);
  useEffect(() => { F().fsMod.getDoc(docRef('config', 'dev')).then(s => setCfg(s.exists() ? s.data() : null)).catch(() => setCfg({})); }, []);
  const emailConta = () => cfg?.email || EMAIL_DEV;
  const entrar = async (e) => {
    e.preventDefault(); setErro(''); setOk('');
    if (cfg?.login && norm(login) !== norm(cfg.login)) return setErro('Login ou senha incorretos.');
    if (!senha) return setErro('Digite a senha.');
    setOcupado(true);
    try { const { authMod, auth } = F(); await authMod.setPersistence(auth, authMod.browserLocalPersistence); await authMod.signInWithEmailAndPassword(auth, emailConta(), senha); }
    catch (e2) { setErro(traduzErroAuth(e2)); setOcupado(false); }
  };
  const esqueci = async () => {
    setErro(''); setOk('');
    if (!cfg?.email) return setErro('Este acesso antigo não tem e-mail de recuperação. Veja a instrução abaixo para recriar.');
    try { await F().authMod.sendPasswordResetEmail(F().auth, cfg.email); setOk('Enviamos um link para ' + cfg.email.replace(/(.{2}).+(@.+)/, '$1•••$2') + '. Abra o e-mail e crie a senha nova.'); }
    catch (e2) { setErro(traduzErroAuth(e2)); }
  };
  const criar = async (e) => {
    e.preventDefault(); setErro('');
    if (norm(login).length < 3) return setErro('Escolha um login com pelo menos 3 letras.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErro('Informe um e-mail válido (para recuperar a senha).');
    if (senha.length < 8) return setErro('Use uma senha com pelo menos 8 caracteres.');
    if (senha !== senha2) return setErro('As duas senhas estão diferentes.');
    setOcupado(true);
    try {
      window.__criandoDev = true; const { authMod, auth, fsMod } = F(); await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      const cred = await authMod.createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      await fsMod.setDoc(docRef('config', 'dev'), { uid: cred.user.uid, login: login.trim(), email: email.trim().toLowerCase(), criadoEm: nowIso() });
    } catch (e2) { setErro(traduzErroAuth(e2)); setOcupado(false); }
  };
  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <form class="modal" onSubmit=${cfg === null ? criar : entrar}>
        <h3>🛠 Desenvolvedor</h3>
        ${erro && html`<div class="error-box">${erro}</div>`}
        ${ok && html`<div class="warn-box">${ok}</div>`}
        ${cfg === undefined ? html`<div class="dim">Carregando…</div>`
          : cfg === null ? html`
            <div class="dim">Primeiro acesso: crie o login e a senha do painel do desenvolvedor. O e-mail serve para recuperar a senha.</div>
            <input class="inp" placeholder="Login (ex.: paulo)" value=${login} onInput=${e => setLogin(e.target.value)} autoComplete="username" />
            <input class="inp" type="email" placeholder="Seu e-mail (recuperação)" value=${email} onInput=${e => setEmail(e.target.value)} />
            <${Senha} id="dev-s1" value=${senha} onInput=${e => setSenha(e.target.value)} placeholder="Senha (mínimo 8)" />
            <${Senha} id="dev-s2" value=${senha2} onInput=${e => setSenha2(e.target.value)} placeholder="Repita a senha" />
            <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Criando…' : 'Criar acesso'}</button>`
          : html`
            ${cfg.login && html`<input class="inp" placeholder="Login" value=${login} onInput=${e => setLogin(e.target.value)} autoComplete="username" />`}
            <${Senha} id="dev-s" value=${senha} onInput=${e => setSenha(e.target.value)} placeholder="Senha do desenvolvedor" />
            <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Entrando…' : 'Entrar'}</button>
            <button type="button" class="btn btn-ghost btn-sm" onClick=${esqueci}>Esqueci a senha</button>
            ${!cfg.email && html`<small class="dim">Acesso antigo (sem login). Para criar login e senha novos: no Firebase → Firestore, apague o documento config/dev; ao voltar aqui aparece "Primeiro acesso".</small>`}`}
        <button type="button" class="btn btn-ghost btn-sm" onClick=${fechar}>Cancelar</button>
      </form>
    </div>`;
}

function PainelDev({ toast }) {
  const [empresas, setEmpresas] = useState(null);
  const [contagens, setContagens] = useState({});
  const [statusIA, setStatusIA] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas'), s => setEmpresas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))),
      () => setEmpresas([]));
  }, []);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => {}); }, []);
  useEffect(() => {
    if (!empresas) return;
    const { getCountFromServer } = F().fsMod;
    empresas.forEach(async (e) => {
      if (contagens[e.id]) return;
      try {
        const [u, p, o] = await Promise.all(['usuarios', 'projetos', 'os'].map(c => getCountFromServer(col('empresas', e.id, c)).then(r => r.data().count)));
        setContagens(v => ({ ...v, [e.id]: { u, p, o } }));
      } catch {}
    });
  }, [empresas]);

  const pausar = async (e, pausada) => {
    await F().fsMod.updateDoc(docRef('empresas', e.id), { pausada, pausadaEm: pausada ? nowIso() : null });
    toast(pausada ? `${e.nome} pausada.` : `${e.nome} reativada.`, 'ok');
    setConfirmar(null);
  };
  const ocultar = async (e, oculta) => {
    const { deleteDoc, setDoc, updateDoc } = F().fsMod;
    if (oculta) await deleteDoc(docRef('empresas_publico', e.id));
    else await setDoc(docRef('empresas_publico', e.id), { nome: e.nome, cidade: e.cidade || '' });
    await updateDoc(docRef('empresas', e.id), { ocultaNoLogin: oculta });
    toast(oculta ? `${e.nome} não aparece mais no login.` : `${e.nome} voltou a aparecer no login.`, 'ok');
    setConfirmar(null);
  };

  const lista = (empresas || []).filter(e => !busca || norm(e.nome + ' ' + e.cidade + ' ' + e.cnpj).includes(norm(busca)));
  const tot = Object.values(contagens).reduce((a, c) => ({ u: a.u + c.u, p: a.p + c.p, o: a.o + c.o }), { u: 0, p: 0, o: 0 });

  return html`
    <div class="shell">
      <div class="topbar glass">
        <${Marca} />
        <span class="chip chip-accent">Painel do desenvolvedor</span>
        <button class="btn btn-sm btn-ghost" onClick=${() => F().authMod.signOut(F().auth)}>Sair</button>
      </div>
      <div class="page-head">
        <div><h2>Empresas cadastradas</h2>
          <div class="dim">${(empresas || []).length} empresas · ${tot.u} usuários · ${tot.p} projetos · ${tot.o} OS</div></div>
        <div class="row">
          <span class=${'chip ' + (statusIA?.ia ? 'chip-ok' : 'chip-warn')}>IA ${statusIA?.ia ? 'ligada' : 'sem chave'}</span>
          <span class=${'chip ' + (statusIA?.firebase ? 'chip-ok' : 'chip-danger')}>Servidor ${statusIA ? 'ok' : '…'}</span>
        </div>
      </div>
      <input id="dev-busca" class="inp" placeholder="Buscar empresa, cidade ou CNPJ…" value=${busca} onInput=${e => setBusca(e.target.value)} style=${{ marginBottom: '12px' }} />
      <div class="list">
        ${empresas === null && html`<div class="card muted">Carregando…</div>`}
        ${empresas && lista.length === 0 && html`<div class="card muted">Nenhuma empresa ainda.</div>`}
        ${lista.map(e => {
          const c = contagens[e.id];
          const conf = confirmar?.id === e.id ? confirmar.acao : null;
          return html`
            <div key=${e.id} class="list-item" style=${{ cursor: 'default', flexWrap: 'wrap' }}>
              <div class="grow" style=${{ minWidth: '200px' }}>
                <div class="title">${e.nome}</div>
                <div class="dim">${[e.cidade, e.cnpj].filter(Boolean).join(' · ') || '—'} · desde ${fmtData(e.criadoEm)}</div>
                <div class="dim">${c ? `${c.u} usuários · ${c.p} projetos · ${c.o} OS (último nº ${padNum(e.osSeq || 0)})` : 'contando…'}</div>
              </div>
              ${e.pausada && html`<span class="chip chip-danger">Pausada</span>`}
              ${e.ocultaNoLogin && html`<span class="chip">Oculta no login</span>`}
              ${conf ? html`
                <span class="dim">${conf === 'pausar' ? 'Pausar o acesso?' : conf === 'ocultar' ? 'Tirar da lista do login?' : ''}</span>
                <button class="btn btn-sm btn-danger" onClick=${() => conf === 'pausar' ? pausar(e, true) : ocultar(e, true)}>Confirmar</button>
                <button class="btn btn-sm" onClick=${() => setConfirmar(null)}>Não</button>
              ` : html`
                ${e.pausada
                  ? html`<button class="btn btn-sm btn-teal" onClick=${() => pausar(e, false)}>Reativar</button>`
                  : html`<button class="btn btn-sm" onClick=${() => setConfirmar({ id: e.id, acao: 'pausar' })}>Pausar</button>`}
                ${e.ocultaNoLogin
                  ? html`<button class="btn btn-sm" onClick=${() => ocultar(e, false)}>Mostrar no login</button>`
                  : html`<button class="btn btn-sm btn-ghost" onClick=${() => setConfirmar({ id: e.id, acao: 'ocultar' })}>Ocultar do login</button>`}
              `}
            </div>`;
        })}
      </div>
    </div>`;
}

/* =========================================================
   Projetos: cliente, documentos, ata ao vivo
   ========================================================= */
function TelaProjetos({ sessao, catalogo, toast, abrirOS }) {
  const [projetos, setProjetos] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'projetos'), orderBy('criadoEm', 'desc')), s => setProjetos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  const lista = projetos.filter(p => !busca || norm(p.cliente?.nome + ' ' + p.titulo + ' ' + p.cliente?.obra).includes(norm(busca)));
  const projeto = projetos.find(p => p.id === aberto);
  if (projeto) return html`<${Projeto} projeto=${projeto} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setAberto(null)} abrirOS=${abrirOS} />`;

  return html`
    <div class="fade-up">
      <div class="hero-ia">
        <div>
          <div class="hero-eyebrow">● Inteligência artificial de marcenaria</div>
          <h2>Reuniões & Projetos</h2>
          <div class="hero-sub">Assistente que filtra conversas paralelas, gera atas por ambiente e móvel e preenche a ordem de serviço sozinho.</div>
        </div>
        <button class="btn btn-laranja" onClick=${() => setNovo(true)}>✦ + Nova reunião / projeto</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><span class="hs-ico">📄</span><div><b class="mono">${projetos.length}</b><div>Projetos e reuniões registrados</div></div></div>
        <div class="hero-stat"><span class="hs-ico">✅</span><div><b class="mono">${projetos.filter(p => p.temAta).length}</b><div>Com ata da reunião</div></div></div>
        <div class="hero-stat"><span class="hs-ico">🗂️</span><div><b class="mono">${projetos.filter(p => p.osNumero).length}</b><div>Já viraram ordem de serviço</div></div></div>
      </div>
      <div class="page-head" style=${{ marginTop: '4px' }}>
        <div class="sec-title">Histórico (${projetos.length})</div>
      </div>
      <input id="busca-proj" class="inp" placeholder="Buscar cliente ou obra…" value=${busca} onInput=${e => setBusca(e.target.value)} style=${{ marginBottom: '12px' }} />
      <div class="list">
        ${lista.length === 0 && html`<div class="card muted">Nenhum projeto ainda. Clique em <b>+ Novo projeto</b> para começar pelo cliente.</div>`}
        ${lista.map(p => html`
          <div key=${p.id} class="list-item" onClick=${() => setAberto(p.id)}>
            <div class="grow">
              <div class="title">${p.cliente?.nome || 'Sem nome'}</div>
              <div class="dim">${[p.titulo, p.cliente?.obra].filter(Boolean).join(' · ') || '—'} · criado em ${fmtData(p.criadoEm)}</div>
            </div>
            ${p.temAta && html`<span class="chip chip-teal">Ata</span>`}
            ${p.qtdDocs ? html`<span class="chip">${p.qtdDocs} doc.</span>` : null}
            ${p.osNumero ? html`<span class="chip chip-accent">OS ${numOS(p.osNumero)}</span>` : null}
          </div>`)}
      </div>
      ${novo && html`<${NovoProjeto} sessao=${sessao} projetos=${projetos} fechar=${() => setNovo(false)} criado=${(id) => { setNovo(false); setAberto(id); }} toast=${toast} />`}
    </div>`;
}

function NovoProjeto({ sessao, projetos, fechar, criado, toast }) {
  const [f, setF] = useState({ nome: '', telefone: '', endereco: '', obra: '', titulo: '' });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));
  const salvar = async (forcar) => {
    if (!f.nome.trim()) return setErro('Informe o nome do cliente.');
    const igual = projetos.find(p => norm(p.cliente?.nome) === norm(f.nome) && norm(p.titulo) === norm(f.titulo));
    if (igual && !forcar) { setAviso(igual); return; }
    const { addDoc } = F().fsMod;
    const ref = await addDoc(col('empresas', sessao.empresaId, 'projetos'), {
      cliente: { nome: f.nome.trim(), telefone: f.telefone.trim(), endereco: f.endereco.trim(), obra: f.obra.trim() },
      titulo: f.titulo.trim(), criadoEm: nowIso(), criadoPor: sessao.nome, qtdDocs: 0, temAta: false,
    });
    toast('Projeto criado.', 'ok');
    criado(ref.id);
  };
  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="modal">
        <h3>Novo projeto</h3>
        ${erro && html`<div class="error-box">${erro}</div>`}
        ${aviso && html`<div class="warn-box">Já existe um projeto de <b>${aviso.cliente?.nome}</b>${aviso.titulo ? ' (' + aviso.titulo + ')' : ''}. Abra o existente, ou dê um título diferente (ex: "Dormitório casal").
          <div class="row" style=${{ marginTop: '8px' }}>
            <button class="btn btn-sm btn-teal" onClick=${() => criado(aviso.id)}>Abrir o existente</button>
            <button class="btn btn-sm" onClick=${() => salvar(true)}>Criar outro mesmo assim</button>
          </div></div>`}
        <div class="field"><label class="lbl" for="np-nome">Cliente</label><input id="np-nome" class="inp" value=${f.nome} onInput=${set('nome')} autoFocus /></div>
        <div class="field"><label class="lbl" for="np-tit">Título do projeto</label><input id="np-tit" class="inp" placeholder="Ex: Apartamento completo, Cozinha e área gourmet" value=${f.titulo} onInput=${set('titulo')} /></div>
        <div class="grid2">
          <div class="field"><label class="lbl" for="np-tel">Telefone</label><input id="np-tel" class="inp" value=${f.telefone} onInput=${set('telefone')} /></div>
          <div class="field"><label class="lbl" for="np-obra">Obra / Condomínio</label><input id="np-obra" class="inp" value=${f.obra} onInput=${set('obra')} /></div>
        </div>
        <div class="field"><label class="lbl" for="np-end">Endereço da obra</label><input id="np-end" class="inp" value=${f.endereco} onInput=${set('endereco')} /></div>
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          <button class="btn btn-ghost" onClick=${fechar}>Cancelar</button>
          <button class="btn btn-primary" onClick=${() => salvar(false)}>Criar projeto</button>
        </div>
      </div>
    </div>`;
}

function Projeto({ projeto, sessao, catalogo, toast, voltar, abrirOS }) {
  const [aba, setAba] = useState('docs');
  const [docs, setDocs] = useState([]);
  const [ata, setAta] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroGerar, setErroGerar] = useState(null);
  const base = ['empresas', sessao.empresaId, 'projetos', projeto.id];

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const u1 = onSnapshot(query(col(...base, 'documentos'), orderBy('criadoEm', 'asc')), s => setDocs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(docRef(...base, 'ata', 'atual'), s => setAta(s.exists() ? s.data() : { estrutura: null, transcricao: '' }));
    return () => { u1(); u2(); };
  }, [projeto.id]);

  const gerarOS = async () => {
    setErroGerar(null);
    if (!docs.length && !ata?.estrutura) { setErroGerar({ msg: 'Envie o contrato/detalhamento ou faça a ata antes de gerar a OS.' }); return; }
    setGerando(true);
    try {
      const documentos = docs.map(d => `=== ${d.categoria.toUpperCase()}: ${d.nome} ===\n${d.texto || ''}`).join('\n\n');
      const res = await chamarIA('gerar_os', {
        cliente: projeto.cliente, documentos, ata: ata?.estrutura || {}, catalogo: resumoCatalogo(catalogo),
      });
      res.cliente = { ...projeto.cliente, ...Object.fromEntries(Object.entries(res.cliente || {}).filter(([, v]) => v)) };
      const { id, numero } = await criarOS(sessao, res, { projetoId: projeto.id, origem: 'ia' });
      await F().fsMod.updateDoc(docRef(...base), { osId: id, osNumero: numero });
      toast(`OS nº ${numOS(numero)} criada. Confira os campos em amarelo.`, 'ok');
      abrirOS(id);
    } catch (e) {
      setErroGerar({ msg: e.message, dup: e.duplicada });
    }
    setGerando(false);
  };

  return html`
    <div class="fade-up">
      <button class="btn btn-ghost btn-sm" onClick=${voltar} style=${{ marginTop: '6px' }}>← Projetos</button>
      <div class="page-head">
        <div>
          <h2>${projeto.cliente?.nome}</h2>
          <div class="dim">${[projeto.titulo, projeto.cliente?.obra, projeto.cliente?.endereco, projeto.cliente?.telefone].filter(Boolean).join(' · ')}</div>
        </div>
        <div class="row">
          ${projeto.osId && html`<button class="btn" onClick=${() => abrirOS(projeto.osId)}>Abrir OS ${numOS(projeto.osNumero)}</button>`}
          <button class="btn btn-primary" onClick=${gerarOS} disabled=${gerando}>${gerando ? 'Gerando OS… (até 1 min)' : '⚡ Gerar OS automática'}</button>
        </div>
      </div>
      ${erroGerar && html`<div class="error-box" style=${{ marginBottom: '12px' }}>${erroGerar.msg}
        ${erroGerar.dup && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => abrirOS(erroGerar.dup.id)}>Abrir OS ${numOS(erroGerar.dup)}</button>`}</div>`}
      <div class="nav" style=${{ paddingTop: 0 }}>
        <button class=${'nav-tile' + (aba === 'docs' ? ' on' : '')} onClick=${() => setAba('docs')}><span class="ico">📄</span>Contrato e detalhamentos ${docs.length ? `(${docs.length})` : ''}</button>
        <button class=${'nav-tile' + (aba === 'ata' ? ' on' : '')} onClick=${() => setAba('ata')}><span class="ico">🎙️</span>Ata da reunião</button>
      </div>
      ${aba === 'docs'
        ? html`<${Documentos} base=${base} docs=${docs} sessao=${sessao} toast=${toast} />`
        : html`<${AtaAoVivo} base=${base} ata=${ata} catalogo=${catalogo} toast=${toast} />`}
    </div>`;
}

function Documentos({ base, docs, sessao, toast }) {
  const [categoria, setCategoria] = useState('contrato');
  const [fila, setFila] = useState([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  const [ver, setVer] = useState(null);

  const enviar = async (files) => {
    const lista = [...files];
    for (const file of lista) {
      const key = rand(6);
      setFila(f => [...f, { key, nome: file.name, status: 'Lendo arquivo…' }]);
      const upd = (status, erro) => setFila(f => f.map(x => x.key === key ? { ...x, status, erro } : x));
      try {
        let { texto, imagens, paginas } = await extrairArquivo(file);
        if (!texto && imagens.length) {
          upd('Lendo a imagem com IA…');
          const r = await chamarIA('ler_imagens', {}, imagens);
          texto = String(r?.texto || '');
        }
        if (!texto.trim()) throw new Error('Não encontrei texto nesse arquivo.');
        const { addDoc, updateDoc, increment } = F().fsMod;
        await addDoc(col(...base, 'documentos'), { nome: file.name, categoria, texto: texto.slice(0, 600000), paginas: paginas || null, criadoEm: nowIso(), criadoPor: sessao.nome });
        await updateDoc(docRef(...base), { qtdDocs: increment(1) });
        upd('Pronto ✓');
        setTimeout(() => setFila(f => f.filter(x => x.key !== key)), 2500);
      } catch (e) { upd('Erro', e.message); }
    }
  };

  const remover = async (d) => {
    const { deleteDoc, updateDoc, increment } = F().fsMod;
    await deleteDoc(docRef(...base, 'documentos', d.id));
    await updateDoc(docRef(...base), { qtdDocs: increment(-1) });
    toast('Documento removido.');
  };

  return html`
    <div class="stack">
      <div class="card stack">
        <div class="row">
          <span class="lbl" style=${{ margin: 0 }}>Tipo do documento:</span>
          ${['contrato', 'detalhamento', 'outro'].map(c => html`
            <button key=${c} class=${'btn btn-sm' + (categoria === c ? ' btn-teal' : '')} onClick=${() => setCategoria(c)}>${c === 'contrato' ? 'Contrato' : c === 'detalhamento' ? 'Detalhamento / projeto' : 'Outro'}</button>`)}
        </div>
        <div class=${'drop-zone' + (over ? ' over' : '')}
          onClick=${() => inputRef.current.click()}
          onDragOver=${e => { e.preventDefault(); setOver(true); }} onDragLeave=${() => setOver(false)}
          onDrop=${e => { e.preventDefault(); setOver(false); enviar(e.dataTransfer.files); }}>
          <div style=${{ fontSize: '28px' }}>📎</div>
          <div style=${{ fontWeight: 700 }}>Arraste aqui ou clique para escolher</div>
          <div class="dim">PDF, Word (.docx), Excel, texto ou foto do documento</div>
          <input ref=${inputRef} type="file" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { enviar(e.target.files); e.target.value = ''; }} />
        </div>
        ${fila.map(f => html`<div key=${f.key} class=${f.erro ? 'error-box' : 'dim'}>${f.nome}: ${f.status}${f.erro ? ' — ' + f.erro : ''}</div>`)}
      </div>
      <div class="list">
        ${docs.map(d => html`
          <div key=${d.id} class="list-item" style=${{ cursor: 'default' }}>
            <span style=${{ fontSize: '22px' }}>${d.categoria === 'contrato' ? '📝' : d.categoria === 'detalhamento' ? '📐' : '📄'}</span>
            <div class="grow">
              <div class="title">${d.nome}</div>
              <div class="dim">${d.categoria} · ${(d.texto || '').length.toLocaleString('pt-BR')} caracteres lidos · ${fmtData(d.criadoEm)}</div>
            </div>
            <button class="btn btn-sm" onClick=${() => setVer(d)}>Ver texto</button>
            <button class="btn btn-sm btn-danger" onClick=${() => remover(d)}>Remover</button>
          </div>`)}
      </div>
      ${ver && html`
        <div class="modal-bg" onClick=${e => e.target === e.currentTarget && setVer(null)}>
          <div class="modal" style=${{ maxWidth: '760px' }}>
            <div class="row"><h3 style=${{ flex: 1 }}>${ver.nome}</h3><button class="btn btn-sm" onClick=${() => setVer(null)}>Fechar</button></div>
            <pre class="transcript" style=${{ maxHeight: '65vh', whiteSpace: 'pre-wrap', margin: 0 }}>${ver.texto}</pre>
          </div>
        </div>`}
    </div>`;
}

function AtaAoVivo({ base, ata, catalogo, toast }) {
  const [interim, setInterim] = useState('');
  const [transcricao, setTranscricao] = useState('');
  const [estrutura, setEstrutura] = useState(null);
  const [pendente, setPendente] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroIA, setErroIA] = useState('');
  const [nota, setNota] = useState('');
  const carregado = useRef(false);
  const ultimoEnvio = useRef(Date.now());
  const transcRef = useRef(null);
  const estadoRef = useRef({});
  estadoRef.current = { pendente, estrutura, processando, transcricao };

  // Carrega o que já foi salvo, uma vez.
  useEffect(() => {
    if (ata && !carregado.current) {
      carregado.current = true;
      setTranscricao(ata.transcricao || '');
      setEstrutura(ata.estrutura || null);
    }
  }, [ata]);

  const fala = useFala({
    onFinal: (t) => {
      if (!t) return;
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setTranscricao(v => v + (v ? '\n' : '') + `[${hora}] ${t}`);
      setPendente(v => v + ' ' + t);
    },
    onInterim: setInterim,
  });

  useEffect(() => { if (transcRef.current) transcRef.current.scrollTop = transcRef.current.scrollHeight; }, [transcricao, interim]);

  const salvar = async (dados) => {
    const { setDoc, updateDoc } = F().fsMod;
    await setDoc(docRef(...base, 'ata', 'atual'), { ...dados, atualizadoEm: nowIso() }, { merge: true });
    if (dados.estrutura) await updateDoc(docRef(...base), { temAta: true }).catch(() => {});
  };

  const atualizarAta = useCallback(async () => {
    const { pendente: trecho, estrutura: atual, processando: busy, transcricao: tudo } = estadoRef.current;
    if (busy || !trecho.trim()) return;
    setProcessando(true); setErroIA('');
    ultimoEnvio.current = Date.now();
    const enviado = trecho;
    try {
      const nova = await chamarIA('ata', { ataAtual: atual || {}, trecho: enviado, catalogo: resumoCatalogo(catalogo.filter(c => c.tipo !== 'Puxador')).slice(0, 9000) });
      setEstrutura(nova);
      setPendente(v => v.startsWith(enviado) ? v.slice(enviado.length) : v);
      await salvar({ estrutura: nova, transcricao: tudo });
    } catch (e) { setErroIA(e.message); }
    setProcessando(false);
  }, [catalogo]);

  // Atualiza a ata sozinho enquanto o microfone está ligado.
  useEffect(() => {
    if (!fala.ouvindo) return;
    const t = setInterval(() => {
      const p = estadoRef.current.pendente.trim();
      const passou = Date.now() - ultimoEnvio.current;
      if ((p.length >= 400 && passou > 25000) || (p.length >= 40 && passou > 75000)) atualizarAta();
    }, 5000);
    return () => clearInterval(t);
  }, [fala.ouvindo, atualizarAta]);

  // Guarda a transcrição de tempos em tempos (não perde nada se a internet cair).
  useEffect(() => {
    if (!carregado.current) return;
    const t = setTimeout(() => { salvar({ transcricao }).catch(() => {}); }, 8000);
    return () => clearTimeout(t);
  }, [transcricao]);

  const parar = async () => {
    fala.parar();
    setTimeout(() => atualizarAta(), 600);
  };

  const addNota = () => {
    if (!nota.trim()) return;
    setTranscricao(v => v + (v ? '\n' : '') + `[nota] ${nota.trim()}`);
    setPendente(v => v + ' ' + nota.trim());
    setNota('');
  };

  // Edição simples da ata (remover e acrescentar pontos).
  const editarEstrutura = async (fn) => {
    const e = clone(estrutura) || { ambientes: [], decisoes: [], pendencias: [] };
    fn(e);
    setEstrutura(e);
    await salvar({ estrutura: e });
  };

  const [limpar, setLimpar] = useState(false);
  const zerar = async () => {
    setTranscricao(''); setEstrutura(null); setPendente(''); setLimpar(false);
    await F().fsMod.setDoc(docRef(...base, 'ata', 'atual'), { estrutura: null, transcricao: '', atualizadoEm: nowIso() });
    await F().fsMod.updateDoc(docRef(...base), { temAta: false }).catch(() => {});
    toast('Ata apagada.');
  };

  return html`
    <div class="stack">
      <div class="card stack">
        <div class="row">
          ${fala.ouvindo
            ? html`<button class="btn btn-lg btn-mic-on pulse" onClick=${parar}>■ Parar gravação</button>`
            : html`<button class="btn btn-lg btn-primary" onClick=${fala.iniciar}>🎙️ ${transcricao ? 'Continuar ouvindo a reunião' : 'Começar a ouvir a reunião'}</button>`}
          <button class="btn" onClick=${atualizarAta} disabled=${processando || !pendente.trim()}>${processando ? 'Organizando a ata…' : '↻ Atualizar ata agora'}</button>
          <span class="dim" style=${{ marginLeft: 'auto' }}>${fala.ouvindo ? 'Ouvindo · a ata se atualiza sozinha' : pendente.trim() ? 'Há fala nova ainda não organizada' : ''}</span>
        </div>
        ${!fala.suportado && html`<div class="warn-box">Para ouvir a reunião, abra o app no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>.</div>`}
        ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
        ${erroIA && html`<div class="error-box">${erroIA}</div>`}
        <div>
          <div class="lbl">Transcrição (o que o microfone ouviu)</div>
          <div class="transcript" ref=${transcRef}>
            ${transcricao || (!interim && html`<span class="dim">Deixe o computador ou tablet no centro da mesa. Conversas paralelas ficam na transcrição, mas não entram na ata.</span>`)}
            ${interim && html`<span class="interim">${transcricao ? '\n' : ''}${interim}</span>`}
          </div>
        </div>
        <div class="row" style=${{ flexWrap: 'nowrap' }}>
          <input id="ata-nota" class="inp" placeholder="Anotar algo à mão (ex: cliente vai mandar foto do porcelanato)" value=${nota} onInput=${e => setNota(e.target.value)} onKeyDown=${e => e.key === 'Enter' && addNota()} />
          <button class="btn" onClick=${addNota}>Anotar</button>
        </div>
      </div>

      ${estrutura ? html`
        <div class="stack">
          ${estrutura.resumo && html`<div class="card"><div class="section-label">Resumo</div><div>${estrutura.resumo}</div></div>`}
          ${(estrutura.ambientes || []).map((a, ai) => html`
            <div key=${ai} class="amb">
              <div class="amb-head"><span>🏠</span><h3>${a.nome}</h3></div>
              <div class="amb-body">
                ${(a.pontosGerais || []).length > 0 && html`<ul class="pontos">${a.pontosGerais.map((p, pi) => html`<li key=${pi}>${p} <button class="x-btn" title="Remover" onClick=${() => editarEstrutura(e => e.ambientes[ai].pontosGerais.splice(pi, 1))}>✕</button></li>`)}</ul>`}
                ${(a.moveis || []).map((m, mi) => html`
                  <div key=${mi} class="movel-block">
                    <h4>${m.nome}</h4>
                    <ul class="pontos">${(m.pontos || []).map((p, pi) => html`<li key=${pi}>${p} <button class="x-btn" title="Remover" onClick=${() => editarEstrutura(e => e.ambientes[ai].moveis[mi].pontos.splice(pi, 1))}>✕</button></li>`)}</ul>
                  </div>`)}
              </div>
            </div>`)}
          <div class="grid2">
            <div class="card"><div class="section-label">Decisões gerais</div>
              <ul class="pontos">${(estrutura.decisoes || []).map((p, i) => html`<li key=${i}>${p} <button class="x-btn" onClick=${() => editarEstrutura(e => e.decisoes.splice(i, 1))}>✕</button></li>`)}</ul>
              ${!(estrutura.decisoes || []).length && html`<div class="dim">Nenhuma ainda.</div>`}
            </div>
            <div class="card"><div class="section-label" style=${{ color: 'var(--warn)' }}>Pendências</div>
              <ul class="pontos">${(estrutura.pendencias || []).map((p, i) => html`<li key=${i}>${p} <button class="x-btn" onClick=${() => editarEstrutura(e => e.pendencias.splice(i, 1))}>✕</button></li>`)}</ul>
              ${!(estrutura.pendencias || []).length && html`<div class="dim">Nenhuma.</div>`}
            </div>
          </div>
        </div>
      ` : html`<div class="card muted">A ata aparece aqui organizada por ambiente e por móvel, conforme a reunião acontece.</div>`}

      ${(transcricao || estrutura) && html`
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          ${limpar
            ? html`<span class="dim">Apagar a ata e a transcrição?</span><button class="btn btn-sm btn-danger" onClick=${zerar}>Sim, apagar</button><button class="btn btn-sm" onClick=${() => setLimpar(false)}>Não</button>`
            : html`<button class="btn btn-sm btn-ghost" onClick=${() => setLimpar(true)}>Apagar ata</button>`}
        </div>`}
    </div>`;
}

/* =========================================================
   Ordens de serviço: lista e editor
   ========================================================= */
function TelaOS({ sessao, catalogo, toast, osAberta, setOsAberta }) {
  const [reab, setReab] = useState(null);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState(() => { const b = window.__buscaOS || ''; window.__buscaOS = ''; return b; });
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pedirNome, setPedirNome] = useState(false);
  const [nomeCli, setNomeCli] = useState('');
  const [execucao, setExecucao] = useState('');
  const [soPrazo, setSoPrazo] = useState(false);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('osm_vista2') || 'cliente'; } catch { return 'cliente'; } });
  useEffect(() => { try { localStorage.setItem('osm_vista2', vista); } catch {} }, [vista]);
  const [vozInterim, setVozInterim] = useState('');
  const voz = useFala({ onFinal: t => { setBusca(t.replace(/^(buscar|procurar|abrir)\s+/i, '').replace(/^os\s+/i, '').replace(/[.!?]$/, '')); }, onInterim: setVozInterim });

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  if (osAberta) return html`<${EditorOS} key=${osAberta} osId=${osAberta} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setOsAberta(null)} />`;

  const stOf = (o) => STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao');
  const execOf = (o) => o.modoExecucao || 'interna';
  const filtradas = lista.filter(o =>
    (!status || (status === 'atrasadas' ? atrasada(o) : stOf(o) === status)) &&
    (!execucao || execOf(o) === execucao) &&
    (!soPrazo || !!lerPrazo(o.prazoEntrega)) &&
    (!busca || norm(`${numOS(o)} ${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')} ${(STATUS_OS.find(x => x.v === stOf(o)) || {}).t}`).includes(norm(busca))))
    .sort((x, y) => soPrazo ? ((lerPrazo(x.prazoEntrega) || 0) - (lerPrazo(y.prazoEntrega) || 0)) : 0);

  const nova = async () => {
    setErro(null);
    if (!nomeCli.trim()) { setErro({ message: 'Digite o nome do cliente para criar a OS.' }); return; }
    setCriando(true);
    try {
      const { id } = await criarOS(sessao, { cliente: { nome: nomeCli.trim() }, ambientes: [] }, { origem: 'manual' });
      setPedirNome(false); setNomeCli('');
      setOsAberta(id);
    } catch (e) { setErro(e); }
    setCriando(false);
  };

  // Métricas
  const agora = Date.now(), dia = 86400000;
  const ativas = lista.filter(o => !osConcluida(o));
  const prox7 = ativas.filter(o => { const d = lerPrazo(o.prazoEntrega); return d && d.getTime() >= agora && d.getTime() - agora <= 7 * dia; }).length;
  const hoje = new Date();
  const noMes = ativas.filter(o => { const d = lerPrazo(o.prazoEntrega); return d && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear(); }).length;
  const noPrazo = ativas.filter(o => !atrasada(o)).length;
  const nExec = (m) => lista.filter(o => execOf(o) === m).length;
  const pc = (n) => lista.length ? ` (${Math.round(n * 100 / lista.length)}%)` : ' (0%)';
  const clientes = new Set(lista.map(o => norm(o.cliente?.nome)).filter(Boolean)).size;
  const tiposAmb = new Set(lista.flatMap(o => (o.ambientes || []).map(a => norm(a.nome))).filter(Boolean)).size;
  const cnt = (v) => lista.filter(o => stOf(o) === v).length;
  const pf = (n) => lista.length ? Math.round(n * 100 / lista.length) + '% do fluxo' : '0% do fluxo';
  const nAtr = lista.filter(atrasada).length;
  const tiles = [
    { t: 'Total de OSs', n: lista.length, s: '100% da carteira', cls: '' },
    ...STATUS_OS.map(x => ({ t: x.t, n: cnt(x.v), s: pf(cnt(x.v)), cls: ({ elaboracao: '', projetos: 'tile-azul', producao: 'tile-teal', liberacao: 'tile-warn', montagem: 'tile-roxo', concluida: 'tile-ok' })[x.v] || 'tile-cust', f: x.v, cor: x.cor })),
    { t: 'Vencidas', n: nAtr, s: nAtr ? 'Precisa de atenção' : 'Em dia', cls: nAtr ? 'tile-danger' : '', f: 'atrasadas' },
  ];

  const cartao = (o) => {
    const x = STATUS_OS.find(y => y.v === stOf(o)) || STATUS_OS[0];
    const nMov = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).length, 0);
    const nRev = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).filter(m => (m.revisar || []).length).length, 0);
    return { x, nMov, nRev };
  };

  return html`
    <div class="fade-up stack" style=${{ gap: '16px' }}>
      <div class="page-head" style=${{ margin: 0 }}>
        <div><h2>Ordens de Serviço</h2><div class="dim">Acompanhe a fabricação, prazos e modo de execução de cada projeto</div></div>
        <button class="btn btn-primary" onClick=${() => setPedirNome(v => !v)} disabled=${criando}>+ Nova OS</button>
      </div>
      ${pedirNome && html`
        <div class="card row" style=${{ flexWrap: 'nowrap' }}>
          <input id="nova-os-cli" class="inp" placeholder="Nome do cliente" value=${nomeCli} onInput=${e => setNomeCli(e.target.value)} onKeyDown=${e => e.key === 'Enter' && nova()} autoFocus />
          <button class="btn btn-primary" onClick=${nova} disabled=${criando}>${criando ? 'Criando…' : 'Criar'}</button>
        </div>`}
      ${erro && html`<div class="error-box">${erro.message}
        ${erro.duplicada && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => setOsAberta(erro.duplicada.id)}>Abrir OS ${numOS(erro.duplicada)}</button>`}</div>`}

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <div><div class="sec-title">〰 Fluxo & métricas</div><div class="dim">Dados da produção e prazos em tempo real</div></div>
          <span class="chip">${lista.length} OSs cadastradas</span>
        </div>
        <div class="tiles">
          ${tiles.map(t => html`
            <button key=${t.t} class=${'tile ' + t.cls + (t.f && status === t.f ? ' sel' : '')} onClick=${() => t.f && setStatus(v => v === t.f ? '' : t.f)}>
              <div class="tile-t">${t.t}</div><div class="tile-n mono">${t.n}</div><div class="tile-s">${t.s}</div>
            </button>`)}
        </div>
        <div class="paineis">
          <div class="painel"><div class="painel-t">📅 Prazos & entregas</div>
            <div class="kv"><span>Próximos 7 dias</span><b>${prox7} entregas</b></div>
            <div class="kv"><span>Previstas neste mês</span><b>${noMes}</b></div>
            <div class="kv"><span>Ativas no prazo</span><b style=${{ color: 'var(--ok)' }}>${noPrazo}</b></div></div>
          <div class="painel"><div class="painel-t">🔀 Modos de execução</div>
            <div class="kv"><span>Fabricação interna</span><b>${nExec('interna')}${pc(nExec('interna'))}</b></div>
            <div class="kv"><span>Terceirizada</span><b style=${{ color: 'var(--warn)' }}>${nExec('terceirizada')}${pc(nExec('terceirizada'))}</b></div>
            <div class="kv"><span>Híbrida / mista</span><b style=${{ color: 'var(--roxo)' }}>${nExec('mista')}${pc(nExec('mista'))}</b></div></div>
          <div class="painel"><div class="painel-t">📈 Volume & eficiência</div>
            <div class="kv"><span>Clientes atendidos</span><b>${clientes}</b></div>
            <div class="kv"><span>Tipos de ambientes</span><b>${tiposAmb}</b></div>
            <div class="kv"><span>Projetos em andamento</span><b style=${{ color: 'var(--warn)' }}>${ativas.length}</b></div></div>
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ gap: '8px' }}>
          <div class="busca-voz">
            <input id="busca-os" class="inp" placeholder="🔍 Pesquisar por OS, cliente, obra, ambiente… ou fale" value=${busca + (vozInterim ? ' ' + vozInterim : '')} onInput=${e => setBusca(e.target.value)} />
            ${voz.suportado && html`<button class=${'btn btn-sm' + (voz.ouvindo ? ' btn-mic-on pulse' : '')} onClick=${() => { if (voz.ouvindo) voz.parar(); else { setBusca(''); voz.iniciar(); } }}>🎤 ${voz.ouvindo ? 'Ouvindo…' : 'Falar'}</button>`}
          </div>
          <span class="dim">Execução:</span>
          ${[['', 'Todas'], ['interna', 'Interna'], ['terceirizada', 'Terceirizada'], ['mista', 'Mista']].map(([v, t]) => html`<button key=${t} class=${'pill' + (execucao === v ? ' on' : '')} onClick=${() => setExecucao(v)}>${t}</button>`)}
          <button class=${'pill' + (soPrazo ? ' on' : '')} onClick=${() => setSoPrazo(v => !v)}>📅 Prazos</button>
          <div class="pillnav" style=${{ marginLeft: 'auto' }}>
            ${[['cliente', '👥 Por cliente'], ['grade', '▦ Grade'], ['quadro', '▥ Quadro'], ['galeria', '▣ Galeria'], ['compacta', '☰ Compacta']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}
          </div>
        </div>
        <div class="row dim" style=${{ gap: '6px', marginTop: '8px', fontSize: '12px' }}>
          Exemplos de fala: ${['Buscar Davi', 'Cozinha', 'OS 0001', 'Em produção'].map(x => html`<button key=${x} class="pill" onClick=${() => setBusca(x.replace(/^Buscar /, '').replace(/^OS /, '').replace('Em produção', 'Produção'))}>🎤 "${x}"</button>`)}
        </div>
      </div>

      ${filtradas.length === 0 ? html`<div class="vazio"><div style=${{ fontSize: '24px' }}>📄</div><b>Nenhuma ordem de serviço encontrada</b><div class="dim">${lista.length ? 'Nenhuma OS corresponde aos filtros.' : 'Crie a primeira OS, gere a partir de uma reunião ou importe as antigas.'}</div></div>`
      : vista === 'cliente' ? (() => {
        const g = {};
        filtradas.filter(o => busca || !osConcluida(o)).forEach(o => { const k = norm(o.cliente?.nome) || '—'; (g[k] = g[k] || { nome: o.cliente?.nome || 'Sem cliente', oss: [] }).oss.push(o); });
        const salvarEt = async (o, k, st, motivo) => {
          const et = { ...(o.execucao?.etapas || {}) }; et[k] = { ...(et[k] || {}), status: st, ...(st === 'pronto' ? { concluidaEm: nowIso(), concluidaPor: sessao.nome } : {}), ...(st === 'andamento' && !et[k]?.iniciadaEm ? { iniciadaEm: nowIso(), iniciadaPor: sessao.nome } : {}) };
          const patch = { execucao: { ...(o.execucao || {}), etapas: et }, atualizadoEm: nowIso(), atualizadoPor: sessao.nome };
          if (motivo) patch.reaberturas = [...(o.reaberturas || []), { oque: 'Etapa ' + (ETAPAS_FAB.find(e => e[0] === k) || [])[1] + ' reaberta', motivo, quem: sessao.nome, quando: nowIso() }];
          const semMont = ETAPAS_FAB.filter(([x]) => x !== 'montagem').every(([x]) => et[x]?.status === 'pronto');
          if (etapasPadrao() && st === 'pronto' && ['elaboracao', 'projetos'].includes(stOf(o))) { patch.status = 'producao'; patch.statusHist = [...(o.statusHist || []), { st: 'producao', em: nowIso(), quem: sessao.nome }]; }
          if (etapasPadrao() && st === 'pronto' && semMont && stOf(o) === 'producao') { patch.status = 'liberacao'; patch.statusHist = [...(o.statusHist || []), { st: 'liberacao', em: nowIso(), quem: sessao.nome }]; }
          if (etapasPadrao() && st === 'pronto' && k === 'montagem' && ETAPAS_FAB.every(([x]) => et[x]?.status === 'pronto')) { patch.status = 'concluida'; patch.statusHist = [...(o.statusHist || []), { st: 'concluida', em: nowIso(), quem: sessao.nome }]; }
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), patch); toast((ETAPAS_FAB.find(e => e[0] === k) || [])[1] + (st === 'pronto' ? ' concluída' : ' reaberta'), 'ok'); } catch (e) { toast(e.message, 'erro'); }
        };
        const avancar = async (o) => {
          const i = STATUS_OS.findIndex(x => x.v === stOf(o)); const prox = STATUS_OS[i + 1]; if (!prox) return;
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { status: prox.v, statusHist: [...(o.statusHist || []), { st: prox.v, em: nowIso(), quem: sessao.nome }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); toast(numOS(o) + ' → ' + prox.t.replace(/^\d\. /, ''), 'ok'); }
          catch (e) { toast(e.message, 'erro'); }
        };
        const grupos = Object.values(g).map(x => ({ ...x, ini: x.oss.filter(o => stOf(o) !== 'elaboracao' && !osConcluida(o)).length }))
          .sort((a, b) => (b.ini > 0) - (a.ini > 0) || a.nome.localeCompare(b.nome));
        const voltar = async (o, alvo, motivo) => {
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { status: alvo.v, statusHist: [...(o.statusHist || []), { st: alvo.v, em: nowIso(), quem: sessao.nome }], reaberturas: [...(o.reaberturas || []), { oque: 'Status: ' + (STATUS_OS.find(x => x.v === stOf(o)) || {}).t + ' → ' + alvo.t, motivo, quem: sessao.nome, quando: nowIso() }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); toast(numOS(o) + ' voltou para ' + alvo.t.replace(/^\d+\. /, ''), 'ok'); }
          catch (e) { toast(e.message, 'erro'); }
        };
        return html`${reab && html`<${SenhaMotivo} titulo=${numOS(reab.o) + ': voltar para ' + reab.volta.t.replace(/^\d+\. /, '')} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${(m) => voltar(reab.o, reab.volta, m)} fechar=${() => setReab(null)} />`}<div class="os-clis">${grupos.map(x => html`
          <div key=${x.nome} class=${'os-cli' + (x.ini ? ' ativo' : '')} style=${{ '--cc': corCliente(x.nome) }}>
            <div class="os-cli-top"><b>${nomePadrao(x.nome)}</b><span>${x.oss.length} ${x.oss.length === 1 ? 'OS' : 'OSs'}${x.ini ? html` · <em>▶ ${x.ini} em andamento</em>` : ''}</span></div>
            ${x.oss.slice().sort((a, b) => (Number(b.numero) || 0) - (Number(a.numero) || 0)).map(o => {
              const st = stOf(o), i = STATUS_OS.findIndex(y => y.v === st), prox = STATUS_OS[i + 1], x2 = STATUS_OS[i] || { c: 'chip', t: st || '' };
              const iniciada = st !== 'elaboracao' && st !== 'concluida';
              return html`<div key=${o.id} class=${'os-cli-os st-bg-' + st + (iniciada ? ' iniciada' : '') + (atrasada(o) ? ' atras' : '')}>
                <button class="os-cli-info" onClick=${() => setOsAberta(o.id)}>
                  <span class="mono">${numOS(o)}${bolinhas(o)}</span>
                  <span class="nm"><b>${nomePadrao((o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || o.ambienteResumo) || '—'}</b>
                    <small>${o.prazoEntrega ? '🚚 ' + o.prazoEntrega : ''}${atrasada(o) ? ' ⚠ atrasada' : ''}</small></span>
                  <span class="os-trilho">${STATUS_OS.slice(1).map((s2, j) => html`<i key=${s2.v} title=${s2.t} class=${j + 1 < i ? 'f' : j + 1 === i ? 'a' : ''}></i>`)}</span>
                  <span class=${x2.c + ' mini'}>${x2.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</span>
                </button>
                ${i > 0 && html`<button class="btn-voltar" title=${'Voltar para ' + STATUS_OS[i - 1].t} onClick=${(ev) => { ev.stopPropagation(); setReab({ o, volta: STATUS_OS[i - 1] }); }}>◀</button>`}
                ${prox ? html`<button class="btn-avancar" title=${'Avançar para ' + prox.t} onClick=${(ev) => { ev.stopPropagation(); avancar(o); }}>▶<small>${prox.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Liberação')}</small></button>` : html`<span class="btn-avancar ok">✓</span>`}
              </div>
`; })}
          </div>`)}</div>`; })()
      : vista === 'quadro' ? html`
        <div class="kanban">
          ${STATUS_OS.map(col => html`
            <div key=${col.v} class="kan-col">
              <div class="kan-head"><span class=${col.c}>${col.t}</span><span class="dim">${filtradas.filter(o => stOf(o) === col.v).length}</span></div>
              ${filtradas.filter(o => stOf(o) === col.v).map(o => { const { nMov } = cartao(o); return html`
                <div key=${o.id} class="kan-card" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
                  <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
                  <b>${o.cliente?.nome || '—'}</b>
                  <div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'} · ${nMov} móveis</div>
                  ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
                </div>`; })}
            </div>`)}
        </div>`
      : vista === 'galeria' || vista === 'grade' ? html`
        <div class=${vista === 'galeria' ? 'galeria' : 'grade'}>
          ${filtradas.map(o => { const { x, nMov, nRev } = cartao(o); return html`
            <div key=${o.id} class="os-card" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
              <div class="row" style=${{ justifyContent: 'space-between' }}><span class="os-num">OS ${numOS(o)}${bolinhas(o)}</span><span class=${x.c}>${x.t}</span></div>
              <div class="title" style=${{ fontSize: vista === 'galeria' ? '18px' : '15.5px', fontWeight: 700 }}>${o.cliente?.nome || 'Cliente não informado'}</div>
              ${o.cliente?.obra && html`<div class="dim">${o.cliente.obra}</div>`}
              <div class="row" style=${{ gap: '4px' }}>${(o.ambientes || []).slice(0, vista === 'galeria' ? 8 : 4).map(a => html`<span key=${a.id || a.nome} class="chip">${a.nome}</span>`)}</div>
              <div class="dim">${nMov} móveis · ${({ interna: 'Interna', terceirizada: 'Terceirizada', mista: 'Mista' })[execOf(o)]}${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
              <div class="row" style=${{ gap: '4px' }}>
                ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
                ${nRev > 0 && html`<span class="chip chip-warn">${nRev} p/ revisar</span>`}
                ${o.origem === 'importada' && html`<span class="chip">Importada</span>`}
              </div>
            </div>`; })}
        </div>`
      : html`
        <div class="list">
          ${filtradas.map(o => { const { x, nMov, nRev } = cartao(o); return html`
            <div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
              <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
              <div class="grow">
                <div class="title">${o.cliente?.nome || 'Cliente não informado'}</div>
                <div class="dim">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || 'Sem ambientes'} · ${nMov} móveis${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
              </div>
              ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
              ${nRev > 0 && html`<span class="chip chip-warn">${nRev} p/ revisar</span>`}
              ${o.revisao?.em && o.revisao.em >= (o.atualizadoEm || '') ? html`<span class="chip chip-ok" title=${'Revisada por ' + o.revisao.por}>✅ Revisada</span>` : html`<span class="chip" title=${'Alterada por ' + (o.atualizadoPor || '')}>✏️ ${o.atualizadoPor || ''}</span>`}
              <span class=${x.c}>${x.t}</span>
            </div>`; })}
        </div>`}
    </div>`;
}

function EditorOS({ osId, sessao, catalogo, toast, voltar }) {
  const [os, setOs] = useState(null);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dup, setDup] = useState(null);
  const [falaTexto, setFalaTexto] = useState('');
  const [falaInterim, setFalaInterim] = useState('');
  const [aplicandoVoz, setAplicandoVoz] = useState(false);
  const [erroVoz, setErroVoz] = useState('');
  const [imprimir, setImprimir] = useState(false);
  const [apagar, setApagar] = useState(false);
  const ref = docRef('empresas', sessao.empresaId, 'os', osId);
  const sujoRef = useRef(false);
  sujoRef.current = sujo;
  const versao = useRef(0);

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(ref, (s) => {
      if (!s.exists()) { setOs(false); return; }
      // Não sobrescreve o que está sendo digitado aqui; recebe mudanças de outros aparelhos quando não há edição local.
      if (!sujoRef.current) setOs({ id: s.id, ...s.data() });
    });
  }, [osId]);

  const alterar = (fn0) => {
    const fn = (o) => { const antes = o.status; fn0(o); if (o.status && o.status !== antes) o.statusHist = [...(o.statusHist || []), { st: o.status, em: nowIso(), quem: sessao.nome }]; };
    versao.current++;
    setOs(o => { const n = clone(o); fn(n); return n; });
    setSujo(true);
  };

  const [sairDepois, setSairDepois] = useState(false);
  useEffect(() => { if (sairDepois && !sujo && !salvando) { toast('OS salva.', 'ok'); voltar(); } }, [sairDepois, sujo, salvando]);
  // Salva sozinho 1,2 s depois da última alteração.
  useEffect(() => {
    if (!sujo || !os) return;
    const t = setTimeout(async () => {
      const v = versao.current;
      setSalvando(true);
      try {
        const limpo = sanearOS(os);
        const fp = await impressaoDigital(limpo);
        const outra = await acharDuplicada(sessao.empresaId, fp, osId);
        if (outra) { setDup(outra); setSalvando(false); return; }
        setDup(null);
        const { updateDoc } = F().fsMod;
        await updateDoc(ref, { ...limpo, padrao: os.padrao || {}, execucao: os.execucao || {}, tamponamento: os.tamponamento || {}, responsavel: os.responsavel || '', arquiteto: os.arquiteto || '', modoExecucao: os.modoExecucao || 'interna', ambienteResumo: os.ambienteResumo || '', cores: temCores(os) ? os.cores : null, historico: os.historico || [], alteracoes: os.alteracoes || [], reaberturas: os.reaberturas || [], ata: os.ata || null, contrato: os.contrato || null, parceiros: os.parceiros || {}, statusHist: os.statusHist || [], status: os.status || 'elaboracao', fingerprint: fp, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
        if (versao.current === v) setSujo(false);
      } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
      setSalvando(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [os, sujo]);

  const fala = useFala({
    onFinal: (t) => setFalaTexto(v => (v ? v + ' ' : '') + t),
    onInterim: setFalaInterim,
  });
  const [etapa, setEtapa] = useState(2);
  const [organizando, setOrganizando] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [snapLib, setSnapLib] = useState(null);
  const [motivoLib, setMotivoLib] = useState('');
  const [imprimirPedido, setImprimirPedido] = useState(null);
  const [pedirVoltar, setPedirVoltar] = useState(null);
  const [painelCA, setPainelCA] = useState(null);
  const [verCores, setVerCores] = useState(false);
  const [pedirLib, setPedirLib] = useState(false);
  const fabricantesMDF = useMemo(() => [...new Set(catalogo.filter(c => c.tipo === 'MDF').map(c => c.fabricante).filter(Boolean))].sort(), [catalogo]);

  const aplicarVoz = async () => {
    fala.parar();
    const texto = (falaTexto + ' ' + falaInterim).trim();
    if (!texto) return;
    setAplicandoVoz(true); setErroVoz('');
    try {
      const atual = sanearOS(os);
      const nova = sanearOS(await chamarIA('voz_os', { fala: texto, os: atual, catalogo: resumoCatalogo(catalogo) }));
      alterar(o => { o.cliente = nova.cliente; o.prazoEntrega = nova.prazoEntrega; o.observacoesGerais = nova.observacoesGerais; o.ambientes = nova.ambientes; if (nova.padrao) o.padrao = { ...(o.padrao || {}), ...nova.padrao }; if (nova.tamponamento?.tipo) o.tamponamento = nova.tamponamento; });
      setFalaTexto(''); setFalaInterim('');
      toast('Aplicado na OS.', 'ok');
    } catch (e) { setErroVoz(e.message); }
    setAplicandoVoz(false);
  };

  const excluir = async () => {
    await F().fsMod.deleteDoc(ref);
    toast('OS excluída.');
    voltar();
  };

  if (os === null) return html`<div class="card muted">Carregando OS…</div>`;
  if (os === false) return html`<div class="card">Essa OS não existe mais. <button class="btn btn-sm" onClick=${voltar}>Voltar</button></div>`;

  const setCli = (k) => (e) => alterar(o => { o.cliente = o.cliente || {}; o.cliente[k] = e.target.value; });
  const st = STATUS_OS.find(s => s.v === os.status) || STATUS_OS[0];

  const idxSt = Math.max(0, STATUS_OS.findIndex(x => x.v === (os.status || 'elaboracao')));
  const prazoD = lerPrazo(os.prazoEntrega);
  const diasPrazo = prazoD ? Math.ceil((prazoD.getTime() - Date.now()) / 86400000) : null;
  const ETAPAS = [
    { n: 1, t: 'Dados da OS', s: 'Cliente, obra & prazos' },
    { n: 2, t: 'Conjuntos & especificações', s: 'Móveis, MDF, ferragens, LED' },
    { n: 3, t: 'Execução', s: 'Interna vs. terceirizada' },
  ];
  const ir = (n) => { setEtapa(n); window.scrollTo(0, 0); };
  const revisadaOk = !!(os.revisao?.em && (!os.atualizadoEm || os.revisao.em >= os.atualizadoEm));
  const bloqueada = revisadaOk && !liberada;
  const pdf = () => { setImprimir(true); setTimeout(() => { window.print(); setImprimir(false); }, 150); };
  const P = os.padrao || {};
  const setP = (fn) => alterar(o => { o.padrao = o.padrao || {}; fn(o.padrao); });

  const organizar = async () => {
    setOrganizando(true);
    try {
      const nova = await chamarIA('organizar_os', { os: { ...sanearOS(os), padrao: os.padrao || {}, tamponamento: os.tamponamento || {}, responsavel: os.responsavel || '', arquiteto: os.arquiteto || '' }, catalogo: resumoCatalogo(catalogo) });
      const n = sanearOS(nova);
      alterar(o => {
        o.cliente = { ...o.cliente, ...Object.fromEntries(Object.entries(n.cliente).filter(([, v]) => v)) };
        if (n.ambientes.length) o.ambientes = n.ambientes;
        if (n.observacoesGerais) o.observacoesGerais = n.observacoesGerais;
        if (n.prazoEntrega && !o.prazoEntrega) o.prazoEntrega = n.prazoEntrega;
        if (n.padrao) o.padrao = { ...(o.padrao || {}), ...n.padrao };
        if (n.tamponamento?.tipo && !o.tamponamento?.tipo) o.tamponamento = n.tamponamento;
        ['responsavel', 'arquiteto', 'ambienteResumo'].forEach(k => { if (n[k] && !o[k]) o[k] = n[k]; });
      });
      toast('Pronto: informações colocadas nos campos certos. Confira.', 'ok');
    } catch (e) { toast('Não consegui organizar agora: ' + e.message, 'erro'); }
    setOrganizando(false);
  };
  const cartaoVoz = html`
        <div class="card stack" style=${{ borderColor: fala.ouvindo ? 'var(--danger)' : undefined }}>
          <div class="row">
            ${fala.ouvindo
              ? html`<button class="btn btn-mic-on pulse" onClick=${aplicarVoz}>■ Parar e aplicar na OS</button>`
              : html`<button class="btn btn-teal" onClick=${fala.iniciar} disabled=${aplicandoVoz}>🎤 Preencher falando</button>`}
            ${!fala.ouvindo && falaTexto && html`<button class="btn" onClick=${aplicarVoz} disabled=${aplicandoVoz}>${aplicandoVoz ? 'Aplicando…' : 'Aplicar na OS'}</button>`}
            ${aplicandoVoz && html`<span class="dim">Aplicando o que você falou…</span>`}
          </div>
          ${fala.ouvindo || falaTexto ? html`<div class="transcript" style=${{ maxHeight: '120px' }}>${falaTexto}<span class="interim"> ${falaInterim}</span></div>`
            : html`<div class="dim">Ex.: "Na cozinha, balcão da pia 1800 por 900 por 550, caixa Duratex Branco Diamante 18, frente Arauco Sálvia, três gavetas com Tandem Blum."</div>`}
          ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
          ${erroVoz && html`<div class="error-box">${erroVoz}</div>`}
        </div>`;
  return html`
    <div class=${'fade-up stack' + (temCores(os) ? ' os-pintada' : '')} style=${{ gap: '14px', ...(temCores(os) ? varsCores(os.cores) : {}) }}>
      <div class="card page-card row" style=${{ justifyContent: 'space-between', padding: '10px 14px' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${voltar}>← Voltar para lista de OSs</button>
          <span class="dim">${salvando ? 'Salvando…' : dup ? '' : sujo ? 'Alterações pendentes' : 'Tudo salvo ✓'}</span>
          <button class="btn btn-sm btn-verde" disabled=${sairDepois} onClick=${() => setSairDepois(true)}>${sairDepois ? 'Salvando…' : '💾 Salvar e fechar'}</button>
        </div>
        <div class="row" style=${{ gap: '6px' }}>
          <button class=${'btn btn-sm' + (verCores ? ' btn-primary' : '')} onClick=${() => setVerCores(v => !v)}>🎨 Cores</button>
          ${verCores && html`<${PaletaOS} os=${os} alterar=${alterar} sessao=${sessao} toast=${toast} travada=${bloqueada} />`}
          <button class="btn btn-sm" onClick=${organizar} disabled=${organizando || bloqueada} title="A IA coloca cada informação no seu campo">${organizando ? 'Organizando…' : '✨ Organizar campos'}</button>
        </div>
      </div>

      <div class="card page-card etapas-bar" style=${{ display: 'none' }}>
        ${ETAPAS.map((e, i) => html`
          ${i > 0 && html`<span class="dim">›</span>`}
          <button key=${e.n} class=${'etapa-bt' + (etapa === e.n ? ' on' : '')} onClick=${() => ir(e.n)}>
            <span class="etapa-n">${e.n}</span><span><b>Etapa ${e.n}: ${e.t}</b><br/><small>${e.s}</small></span>
          </button>`)}
      </div>

      ${dup && html`<div class="error-box">Esta OS ficou igual à <b>OS nº ${numOS(dup)}</b> (mesmo cliente, móveis, medidas e cores). A alteração não foi salva, pra não duplicar. Mude algo que diferencie as duas.</div>`}

      ${(() => { const rev = os.revisao; const ok = rev?.em && (!os.atualizadoEm || rev.em >= os.atualizadoEm); const stx = STATUS_OS[idxSt] || STATUS_OS[0];
        return html`<div class="os-cab" style=${{ '--cc': corOS(os) }}>
          <span class="os-num num-badge">${numOS(os)}</span>
          <div class="grow os-cab-cli" title="Dados do cliente" onClick=${() => setPainelCA('cliente')}><b>${nomePadrao(os.cliente?.nome) || 'Cliente não informado'} <span class="dim" style=${{ fontSize: '12px' }}>👤 ✏️</span></b><small>${nomePadrao((os.ambientes || []).map(x => x.nome).join(', ') || os.ambienteResumo) || '—'}${os.prazoEntrega ? ' · 🚚 ' + os.prazoEntrega : ''}</small></div>
          <span class=${stx.c}>${stx.t.replace(/^\d+\. /, '')}</span>
          ${ok ? html`<span class="rev-ok" title=${'Revisada por ' + rev.por}>✅ Revisada</span>` : html`<button class="btn btn-sm rev-btn" disabled=${sujo || salvando} onClick=${async () => { if (!String(os.cliente?.enderecoMontagem || '').trim()) { toast('📍 Preencha o endereço de montagem (no fim da OS) antes de revisar.', 'erro'); document.getElementById('os-endm2')?.scrollIntoView({ block: 'center' }); document.getElementById('os-endm2')?.focus(); return; } try { await F().fsMod.updateDoc(ref, { revisao: { por: sessao.nome, em: new Date(Date.now() + 1000).toISOString() }, revisoes: [...(os.revisoes || []), { por: sessao.nome, em: nowIso() }] }); toast('OS marcada como revisada.', 'ok'); } catch (e) { toast(e.message, 'erro'); } }}>☐ Revisar</button>`}
          ${os.id && html`<button class=${'btn btn-sm ver-os-btn' + (ok ? ' pronta' : '')} title="Ver a OS pronta" onClick=${() => { if (sujo && !confirm('Há mudanças não salvas. Ver a OS mesmo assim?')) return; window.__modoFicha = 'folha'; window.__abrirOS && window.__abrirOS(os.id); }}>👁 Ver OS</button>`}
          <button class="btn btn-sm" title="Exportar PDF" onClick=${pdf}>📄</button>
        </div>`; })()}

      ${bloqueada && html`<div class="card page-card trava-aviso row" style=${{ justifyContent: 'space-between' }}>
        <div><b>🔒 OS revisada — bloqueada para edição.</b><div class="dim">Para editar é preciso a sua senha e o motivo da alteração (fica no histórico).</div></div>
        <button class="btn btn-marrom" onClick=${() => setPedirLib(true)}>🔓 Desbloquear para editar</button></div>`}
      ${(os.historico || []).length > 0 && html`<details class="card page-card"><summary class="dim">📜 Histórico de alterações após pronta (${os.historico.length})</summary>
        ${os.historico.map((h, i) => html`<div key=${i} class="item-lista"><span>${h.motivo}<br/><small class="dim">${h.quem} · ${fmtData(h.quando)}</small></span></div>`)}</details>`}

      ${liberada && snapLib && (() => { const itens = diffOS(snapLib, os); return html`
        <div class="card page-card stack pedido-alt">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div><div class="sec-title">📝 Pedido de alteração em andamento</div><div class="dim">Motivo: <b>${motivoLib}</b></div></div>
            <span class="chip chip-accent">${itens.length} ${itens.length === 1 ? 'alteração' : 'alterações'}</span>
          </div>
          ${itens.length === 0 ? html`<div class="dim">Altere o que precisar na OS. Cada mudança aparece aqui: "estou alterando isso, de … para …".</div>` : html`
            <div class="alt-lista">${itens.map((it, i) => html`<div key=${i} class="alt-item"><b>${it.campo}</b><span class="de">${it.de}</span><span class="seta">→</span><span class="para">${it.para}</span></div>`)}</div>`}
          <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
            <button class="btn" onClick=${() => { setLiberada(false); setSnapLib(null); }}>Bloquear sem gerar pedido</button>
            <button class="btn btn-marrom" disabled=${!itens.length} onClick=${() => {
              const pedido = { n: (os.alteracoes || []).length + 1, motivo: motivoLib, quem: sessao.nome, quando: nowIso(), itens };
              alterar(o => { o.alteracoes = [...(o.alteracoes || []), pedido]; });
              setLiberada(false); setSnapLib(null); setImprimirPedido(pedido);
              setTimeout(() => { window.print(); setImprimirPedido(null); }, 250);
              toast('Pedido de alteração nº ' + pedido.n + ' gerado. OS bloqueada de novo.', 'ok');
            }}>✓ Concluir alteração e gerar pedido</button>
          </div>
        </div>`; })()}
      <${LinhaDoTempo} os=${os} sessao=${sessao} />
      ${(os.alteracoes || []).length > 0 && html`<details class="card page-card"><summary class="dim">📝 Pedidos de alteração (${os.alteracoes.length})</summary>
        ${os.alteracoes.slice().reverse().map(p => html`<div key=${p.n} class="item-lista" style=${{ alignItems: 'flex-start' }}><span><b>Nº ${p.n}</b> — ${p.motivo}<br/><small class="dim">${p.itens.length} itens · ${p.quem} · ${fmtData(p.quando)}</small>
          <div class="alt-lista mini">${p.itens.slice(0, 6).map((it, i) => html`<div key=${i} class="alt-item"><b>${it.campo}</b><span class="de">${it.de}</span><span class="seta">→</span><span class="para">${it.para}</span></div>`)}${p.itens.length > 6 ? html`<small class="dim">+${p.itens.length - 6}…</small>` : ''}</div></span>
          <button class="btn btn-sm" onClick=${() => { setImprimirPedido(p); setTimeout(() => { window.print(); setImprimirPedido(null); }, 250); }}>🖨 Imprimir</button></div>`)}</details>`}
      ${imprimirPedido && ReactDOM.createPortal(html`<${ImpressaoPedido} os=${os} pedido=${imprimirPedido} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      <fieldset class="trava" disabled=${bloqueada}>
      <div class="row os-ferr" style=${{ gap: '8px', flexWrap: 'wrap' }}>
        <button class="btn btn-anim" onClick=${() => setPainelCA('contrato')}>📑 Contrato</button>
        <button class="btn btn-anim btn-teal" onClick=${() => setPainelCA('ata')}>🎤 Iniciar reunião</button>
      </div>
      ${painelCA && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setPainelCA(null)}><div class="card modal-caixa stack" style=${{ width: 'min(760px,100%)' }}>
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${painelCA === 'contrato' ? '📑 Contrato' : painelCA === 'cliente' ? '👤 Dados do cliente' : '🎤 Reunião / ata'}</div><button class="x-btn" onClick=${() => setPainelCA(null)}>✕</button></div>
        ${painelCA === 'cliente' ? html`<div class="stack"><small class="dim">Para mudar em todas as OS do cliente, use Geral → 👤 Clientes.</small>          <div class="card page-card stack">
            <div class="sec-title">👤 Dados do cliente</div>
            <div class="field"><label class="lbl" for="os-cli">Cliente</label><input id="os-cli" class="inp" value=${os.cliente?.nome || ''} onInput=${setCli('nome')} onBlur=${e => alterar(o => { o.cliente = { ...(o.cliente || {}), nome: nomePadrao(e.target.value) }; })} /></div>
            <div class="grid2">
              <div class="field"><label class="lbl" for="os-tel">Telefone</label><input id="os-tel" class="inp" value=${os.cliente?.telefone || ''} onInput=${setCli('telefone')} /></div>
              <div class="field"><label class="lbl" for="os-obra">Obra / local</label><input id="os-obra" class="inp" value=${os.cliente?.obra || ''} onInput=${setCli('obra')} /></div>
            </div>
            <div class="field"><label class="lbl" for="os-end">Endereço do cliente</label><input id="os-end" class="inp" value=${os.cliente?.endereco || ''} onInput=${setCli('endereco')} /></div>
            <div class="field"><label class="lbl" for="os-endm">📍 Endereço de montagem</label><input id="os-endm" class="inp" placeholder="Se for diferente do endereço do cliente" value=${os.cliente?.enderecoMontagem || ''} onInput=${setCli('enderecoMontagem')} /></div>
            <div class="grid2">
              <div class="field"><label class="lbl" for="os-resp">Responsável</label><input id="os-resp" class="inp" value=${os.responsavel || ''} placeholder=${sessao.nome} onInput=${e => alterar(o => { o.responsavel = e.target.value; })} /></div>
              <div class="field"><label class="lbl" for="os-arq">Arquiteto / designer</label><input id="os-arq" class="inp" value=${os.arquiteto || ''} onInput=${e => alterar(o => { o.arquiteto = e.target.value; })} onBlur=${e => alterar(o => { o.arquiteto = nomePadrao(e.target.value); })} /></div>
            </div>
            <div class="field"><label class="lbl" for="os-amb">Ambiente(s) planejado(s)</label><input id="os-amb" class="inp" placeholder="Ex: Cozinha gourmet, suíte master, closet" value=${os.ambienteResumo || (os.ambientes || []).map(a => a.nome).join(', ')} onInput=${e => alterar(o => { o.ambienteResumo = e.target.value; })} onBlur=${e => alterar(o => { o.ambienteResumo = nomePadrao(e.target.value); })} /></div>
            <div class="field"><label class="lbl" for="os-prazo">Prazo de entrega (dd/mm/aaaa)</label><input id="os-prazo" class="inp" placeholder="Ex: 30/11/2026" value=${os.prazoEntrega || ''} onInput=${e => alterar(o => { o.prazoEntrega = e.target.value; })} /></div>
          </div>
</div>` : painelCA === 'contrato' ? html`<${ContratoOS} os=${os} alterar=${alterar} catalogo=${catalogo} toast=${toast} />` : html`<${AtaOS} os=${os} alterar=${alterar} catalogo=${catalogo} toast=${toast} />`}
      </div></div>`, document.body)}
      ${etapa !== 3 && html`
        ${cartaoVoz}
        <div class="card page-card">
          <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '10px' }}>
            <div><div class="sec-title"><span class="num-sec">🪑</span> Móveis</div><div class="dim">Cada móvel com seus acabamentos e detalhes</div></div>
            <button class="btn btn-marrom" onClick=${() => alterar(o => { o.ambientes = o.ambientes || []; const na = novoAmbiente(''); na.moveis = [novoMovel('')]; o.ambientes.push(na); })}>+ Adicionar móvel</button>
          </div>
          <div class="stack">
            ${(os.ambientes || []).map((a, ai) => html`<${AmbienteOS} key=${a.id || ai} amb=${a} ai=${ai} alterar=${alterar} catalogo=${catalogo} sessao=${sessao} padraoGeral=${P} />`)}
            ${!(os.ambientes || []).length && html`<div class="vazio dim">Nenhum conjunto ainda. Adicione, fale, ou gere a OS a partir de uma reunião.</div>`}
          </div>
        </div>
        `}


      </fieldset>
      ${pedirVoltar && html`<${SenhaMotivo} titulo=${'Voltar a OS para ' + pedirVoltar.t.replace(/^\d\. /, '')} texto="Voltar um processo que já começou precisa de senha e motivo." botao="Voltar etapa"
        onOk=${async (motivo) => { alterar(o => { o.reaberturas = [...(o.reaberturas || []), { oque: 'Status da OS: ' + (STATUS_OS.find(x => x.v === o.status) || {}).t + ' → ' + pedirVoltar.t, motivo, quem: sessao.nome, quando: nowIso() }]; o.status = pedirVoltar.v; }); toast('Processo reaberto.', 'ok'); }} fechar=${() => setPedirVoltar(null)} />`}
      ${(os.reaberturas || []).length > 0 && html`<details class="card page-card"><summary class="dim">↺ Reaberturas de processo (${os.reaberturas.length})</summary>${os.reaberturas.slice().reverse().map((r, i) => html`<div key=${i} class="item-lista"><span><b>${r.oque}</b><br/>${r.motivo}<br/><small class="dim">${r.quem} · ${fmtData(r.quando)}</small></span></div>`)}</details>`}
      ${pedirLib && html`<${SenhaMotivo} titulo=${'Editar a OS ' + numOS(os) + ' (já pronta)'} texto="Diga o que vai ser alterado e por quê." botao="Desbloquear"
        onOk=${async (motivo) => { setSnapLib(JSON.parse(JSON.stringify(os))); setMotivoLib(motivo); alterar(o => { o.historico = [...(o.historico || []), { motivo, quem: sessao.nome, quando: nowIso() }]; }); setLiberada(true); toast('OS desbloqueada. Tudo o que você mudar vai para o pedido de alteração.', 'ok'); }} fechar=${() => setPedirLib(false)} />`}

      <div class=${'card page-card end-final' + (String(os.cliente?.enderecoMontagem || '').trim() ? ' ok' : '')}>
        <label class="lbl" for="os-endm2">📍 Endereço de montagem <b style=${{ color: 'var(--danger)' }}>*obrigatório</b></label>
        <input id="os-endm2" class="inp" placeholder="Rua, número, bairro, cidade — onde o móvel vai ser montado" value=${os.cliente?.enderecoMontagem || ''} onInput=${setCli('enderecoMontagem')} />
        ${!String(os.cliente?.enderecoMontagem || '').trim() && html`<small style=${{ color: 'var(--danger)' }}>Sem o endereço de montagem a OS não pode ser revisada nem avançar para produção.</small>`}
      </div>
      <div class="rodape-escuro">
        <button class="btn btn-ghost" style=${{ color: '#e7e5e4' }} onClick=${() => etapa > 1 ? ir(etapa - 1) : voltar()}>← ${etapa > 1 ? 'Etapa ' + (etapa - 1) : 'Voltar para lista de OSs'}</button>
        <div class="row">
          <span class="exp-lbl">Salvar em:</span>
          <button class="btn btn-sm" title="Abre a impressão — escolha Salvar como PDF" onClick=${pdf}>📄 PDF</button>
          <button class="btn btn-sm" onClick=${() => exportarOS(os, 'word', sessao.empresaNome)}>📝 Word</button>
          <button class="btn btn-sm" onClick=${() => exportarOS(os, 'excel', sessao.empresaNome)}>📊 Excel</button>
          <button class="btn btn-amarelo" onClick=${voltar}>✓ Salvar e voltar para a lista</button>
        </div>
      </div>

      <div class="dim" style=${{ textAlign: 'right' }}>Para excluir esta OS use a aba <b>🗑 Excluir OSs</b> (pede senha e motivo).</div>
      ${imprimir && !imprimirPedido && ReactDOM.createPortal(html`<${ImpressaoOS} os=${os} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      <datalist id="lista-fab-mdf">${fabricantesMDF.map(f => html`<option key=${f} value=${f} />`)}</datalist>
    </div>`;
}


/* ---------- Preencher só o que está vazio ---------- */
const vazio = (v) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(vazio));
function preencherVazios(alvo, fonte, cont = { n: 0 }) {
  if (!fonte || typeof fonte !== 'object') return cont;
  for (const [k, v] of Object.entries(fonte)) {
    if (vazio(v) || k === 'revisar' || k === 'id') continue;
    const atual = alvo[k];
    if (vazio(atual)) { alvo[k] = JSON.parse(JSON.stringify(v)); cont.n++; }
    else if (!Array.isArray(v) && typeof v === 'object' && typeof atual === 'object' && !Array.isArray(atual)) preencherVazios(atual, v, cont);
  }
  return cont;
}
function mesclarOS(o, nova) {
  const n = sanearOS(nova);
  const cont = { n: 0 };
  o.cliente = o.cliente || {};
  preencherVazios(o.cliente, n.cliente, cont);
  ['prazoEntrega', 'observacoesGerais', 'responsavel', 'arquiteto', 'ambienteResumo'].forEach(k => { if (vazio(o[k]) && !vazio(n[k])) { o[k] = n[k]; cont.n++; } });
  if (n.tamponamento) { o.tamponamento = o.tamponamento || {}; preencherVazios(o.tamponamento, n.tamponamento, cont); }
  if (n.padrao) { o.padrao = o.padrao || {}; preencherVazios(o.padrao, n.padrao, cont); }
  o.ambientes = o.ambientes || [];
  for (const a of n.ambientes) {
    const ex = o.ambientes.find(x => norm(x.nome) === norm(a.nome));
    if (!ex) { o.ambientes.push(a); cont.n += 1 + a.moveis.length; continue; }
    ex.moveis = ex.moveis || [];
    for (const m of a.moveis) {
      const em = ex.moveis.find(x => norm(x.nome) === norm(m.nome));
      if (!em) { ex.moveis.push(m); cont.n++; } else preencherVazios(em, m, cont);
    }
  }
  return cont.n;
}

/* ---------- Contrato dentro da OS ---------- */
function ContratoOS({ os, alterar, catalogo, toast }) {
  const [rodando, setRodando] = useState('');
  const [erro, setErro] = useState('');
  const inp = useRef(null);
  const c = os.contrato || {};
  const setC = (k, v) => alterar(o => { o.contrato = { ...(o.contrato || {}), [k]: v }; });
  const enviar = async (files) => {
    if (!files?.length) return;
    setErro('');
    try {
      let texto = '', imagens = [];
      for (const f of files) {
        setRodando('Lendo ' + f.name + '…');
        const r = await extrairArquivo(f);
        texto += `\n=== ${f.name} ===\n` + r.texto;
        imagens = imagens.concat(r.imagens || []).slice(0, 12);
      }
      setRodando('A IA está extraindo o que importa…');
      const res = await chamarIA('contrato_os', { texto, temImagens: imagens.length > 0, os: sanearOS(os), catalogo: resumoCatalogo(catalogo) }, imagens);
      let n = 0;
      alterar(o => {
        n = mesclarOS(o, res);
        const k = res.contrato || {};
        o.contrato = { ...(o.contrato || {}) };
        Object.entries(k).forEach(([kk, v]) => { if (vazio(o.contrato[kk]) && !vazio(v)) o.contrato[kk] = Array.isArray(v) ? v.join('\n') : String(v); });
        o.contrato.arquivos = [...(o.contrato.arquivos || []), ...[...files].map(f => ({ nome: f.name, em: nowIso() }))];
      });
      toast(`Contrato lido: ${n} campos da OS preenchidos. Confira.`, 'ok');
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><div class="sec-title">📑 Contrato & documentos</div><div class="dim">Coloque o contrato (PDF, Word, Excel ou foto). A IA preenche a OS só onde ainda está vazio.</div></div>
        <button class="btn btn-marrom" disabled=${!!rodando} onClick=${() => inp.current?.click()}>${rodando ? '⏳ ' + rodando : '⬆ Colocar contrato'}</button>
        <input ref=${inp} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { enviar([...e.target.files]); e.target.value = ''; }} />
      </div>
      <div class="drop-mini" onDragOver=${e => e.preventDefault()} onDrop=${e => { e.preventDefault(); enviar([...e.dataTransfer.files]); }}>Ou arraste o contrato aqui</div>
      ${erro && html`<div class="error-box">${erro}</div>`}
      ${(c.arquivos || []).length > 0 && html`<div class="row" style=${{ gap: '5px' }}>${c.arquivos.map((a, i) => html`<span key=${i} class="chip">📄 ${a.nome}</span>`)}</div>`}
      <div class="grid3">
        ${[['numero', 'Nº do contrato'], ['dataAssinatura', 'Data de assinatura'], ['valorTotal', 'Valor total'], ['formaPagamento', 'Forma de pagamento'], ['prazoContratual', 'Prazo contratual'], ['garantia', 'Garantia']].map(([k, t]) => html`
          <div key=${k} class="field"><span class="lbl">${t}</span><input class="inp" value=${c[k] || ''} onInput=${e => setC(k, e.target.value)} /></div>`)}
      </div>
      <div class="field"><span class="lbl">Cláusulas importantes (multas, o que não está incluso, condições de entrega)</span>
        <textarea class="inp" rows="3" value=${c.clausulasImportantes || ''} onInput=${e => setC('clausulasImportantes', e.target.value)}></textarea></div>
    </div>`;
}

/* ---------- Ata da reunião ao vivo dentro da OS ---------- */
function AtaOS({ os, alterar, catalogo, toast }) {
  const [trecho, setTrecho] = useState('');
  const [interim, setInterim] = useState('');
  const [status, setStatus] = useState('');
  const pend = useRef('');
  const rodando = useRef(false);
  const osRef = useRef(os); osRef.current = os;
  const ata = os.ata || {};
  const processar = async (forcar) => {
    const t = pend.current.trim();
    if (rodando.current || (!forcar && t.length < 350) || !t) return;
    rodando.current = true; pend.current = '';
    try {
      setStatus('IA escrevendo a ata…');
      const nova = await chamarIA('ata', { ataAtual: osRef.current.ata || {}, trecho: t, catalogo: resumoCatalogo(catalogo) });
      alterar(o => { o.ata = { ...nova, atualizadaEm: nowIso() }; });
      setStatus('Preenchendo o que falta na OS…');
      const res = await chamarIA('preencher_os', { ata: nova, os: { ...sanearOS(osRef.current), padrao: osRef.current.padrao || {}, tamponamento: osRef.current.tamponamento || {} }, catalogo: resumoCatalogo(catalogo) });
      let n = 0; alterar(o => { n = mesclarOS(o, res); });
      setStatus(n ? `✓ Ata atualizada · ${n} campos preenchidos` : '✓ Ata atualizada');
    } catch (e) { pend.current = t + ' ' + pend.current; setStatus('⚠ ' + e.message); }
    rodando.current = false;
  };
  const fala = useFala({
    onFinal: (t) => { setTrecho(v => (v + ' ' + t).slice(-3000)); pend.current += ' ' + t; processar(false); },
    onInterim: setInterim,
  });
  const parar = () => { fala.parar(); setTimeout(() => processar(true), 400); };
  const setAta = (fn) => alterar(o => { o.ata = o.ata || {}; fn(o.ata); });
  const linhas = (arr) => (arr || []).join('\n');
  const deLinhas = (t) => t.split('\n').map(x => x.trim()).filter(Boolean);
  return html`
    <div class="card page-card stack" style=${{ borderColor: fala.ouvindo ? 'var(--danger)' : undefined }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><div class="sec-title">🎙 Ata da reunião</div><div class="dim">Ligue durante a reunião: a IA escreve a ata por ambiente, ignora conversa paralela e preenche na OS só o que ainda está vazio.</div></div>
        ${fala.ouvindo ? html`<button class="btn btn-mic-on pulse" onClick=${parar}>■ Parar reunião</button>`
          : html`<button class="btn btn-teal" onClick=${fala.iniciar}>🎤 Iniciar reunião</button>`}
      </div>
      ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
      ${(fala.ouvindo || trecho) && html`<div class="transcript" style=${{ maxHeight: '90px' }}>${trecho.slice(-600)}<span class="interim"> ${interim}</span></div>`}
      ${status && html`<div class="dim">${status}</div>`}
      <div class="row" style=${{ gap: '6px' }}>
        <button class="btn btn-sm" disabled=${!os.ata} onClick=${async () => { pend.current = pend.current || ' '; setStatus('Preenchendo…'); try { const res = await chamarIA('preencher_os', { ata: os.ata, os: { ...sanearOS(os), padrao: os.padrao || {} }, catalogo: resumoCatalogo(catalogo) }); let n = 0; alterar(o => { n = mesclarOS(o, res); }); setStatus(`✓ ${n} campos preenchidos`); } catch (e) { setStatus('⚠ ' + e.message); } }}>✨ Preencher OS com a ata</button>
        <span class="dim">Tudo abaixo pode ser editado à mão.</span>
      </div>
      <div class="field"><span class="lbl">Resumo</span><textarea class="inp" rows="2" value=${ata.resumo || ''} onInput=${e => setAta(a => { a.resumo = e.target.value; })}></textarea></div>
      ${(ata.ambientes || []).map((a, i) => html`
        <div key=${i} class="acab-box">
          <input class="inp inp-sm" style=${{ fontWeight: 700 }} value=${a.nome || ''} onInput=${e => setAta(x => { x.ambientes[i].nome = e.target.value; })} />
          <textarea class="inp" rows="2" placeholder="Pontos gerais do ambiente (um por linha)" value=${linhas(a.pontosGerais)} onInput=${e => setAta(x => { x.ambientes[i].pontosGerais = deLinhas(e.target.value); })}></textarea>
          ${(a.moveis || []).map((m, j) => html`<div key=${j} class="field"><span class="lbl">${m.nome}</span><textarea class="inp" rows="2" value=${linhas(m.pontos)} onInput=${e => setAta(x => { x.ambientes[i].moveis[j].pontos = deLinhas(e.target.value); })}></textarea></div>`)}
        </div>`)}
      <button class="btn btn-sm btn-ghost" onClick=${() => setAta(a => { a.ambientes = [...(a.ambientes || []), { nome: 'Novo ambiente', pontosGerais: [], moveis: [] }]; })}>+ Ambiente na ata</button>
      <div class="grid2">
        <div class="field"><span class="lbl">Decisões</span><textarea class="inp" rows="3" value=${linhas(ata.decisoes)} onInput=${e => setAta(a => { a.decisoes = deLinhas(e.target.value); })}></textarea></div>
        <div class="field"><span class="lbl">Pendências</span><textarea class="inp" rows="3" value=${linhas(ata.pendencias)} onInput=${e => setAta(a => { a.pendencias = deLinhas(e.target.value); })}></textarea></div>
      </div>
    </div>`;
}

/* ---------- Aba Contratos: lê o contrato e cria/atualiza as OSs ---------- */
// Ordem das OSs: primeiro as áreas com pedra — banheiros/lavabo, lavanderia, cozinhas — depois as demais.
const temPedra = (a) => /pedra|granito|marmore|quartzo|silestone|dekton|porcelanato|bancada|marmoraria|cuba/.test(norm(JSON.stringify(a)));
function ordemAmb(a) {
  const n = norm(a.nome);
  if (/banh|bwc|wc|lavabo|toalete|sanitario|suite.*banho|sala de banho/.test(n)) return 0;
  if (/lavanderia|area de servico|servico/.test(n)) return 1;
  if (/cozinha|copa|gourmet|churrasq|espaco gourmet/.test(n)) return 2;
  if (temPedra(a)) return 3;
  return 4;
}
const ROTULO_ORDEM = ['🚿 Banheiro / lavabo', '🧺 Lavanderia', '🍳 Cozinha', '🪨 Com pedra', 'Demais'];
const ordenarAmbs = (ambs) => ambs.map((a, i) => ({ a, i })).sort((x, y) => ordemAmb(x.a) - ordemAmb(y.a) || x.i - y.i).map(x => x.a);

function TelaContratos({ sessao, catalogo, toast, abrirOS }) {
  const [lista, setLista] = useState([]);
  const [oss, setOss] = useState([]);
  const [rodando, setRodando] = useState('');
  const [erro, setErro] = useState('');
  const [res, setRes] = useState(null); // resultado da IA em revisão
  const [marcados, setMarcados] = useState({});
  const [destino, setDestino] = useState('novas'); // novas | existente
  const [osAlvo, setOsAlvo] = useState('');
  const inp = useRef(null);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'contratos'), orderBy('criadoEm', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setOss([]));
    return () => { a(); b(); };
  }, []);
  const ler = async (files) => {
    if (!files?.length) return;
    setErro(''); setRes(null);
    try {
      let texto = '', imagens = [];
      for (const f of files) { setRodando('Lendo ' + f.name + '…'); const r = await extrairArquivo(f); texto += `\n=== ${f.name} ===\n` + r.texto; imagens = imagens.concat(r.imagens || []).slice(0, 12); }
      setRodando('A IA está extraindo o contrato…');
      const r = await chamarIA('contrato_os', { texto, temImagens: imagens.length > 0, os: {}, catalogo: resumoCatalogo(catalogo) }, imagens);
      const os = sanearOS(r);
      os.ambientes = ordenarAmbs(os.ambientes);
      setRes({ os, contrato: r.contrato || {}, arquivos: [...files].map(f => f.name) });
      setMarcados(Object.fromEntries(os.ambientes.map((_, i) => [i, true])));
      const mesmo = oss.find(o => norm(o.cliente?.nome) && norm(o.cliente?.nome) === norm(os.cliente.nome));
      if (mesmo) { setDestino('existente'); setOsAlvo(mesmo.id); } else setDestino('novas');
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  const txtC = (v) => Array.isArray(v) ? v.join('\n') : String(v || '');
  const aplicar = async () => {
    const { os, contrato, arquivos } = res;
    const dadosC = Object.fromEntries(Object.entries(contrato).map(([k, v]) => [k, txtC(v)]));
    const ambs = os.ambientes.filter((_, i) => marcados[i]);
    setRodando('Gravando…');
    try {
      const criadas = [];
      if (destino === 'novas') {
        const base = { ...os, ambientes: [] };
        const grupos = ambs.length ? ambs.map(a => [a]) : [[]];
        for (const g of grupos) {
          try {
            const { id, codigo } = await criarOS(sessao, { ...base, ambientes: g, ambienteResumo: g.map(a => a.nome).join(', ') }, { origem: 'contrato' });
            await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', id), { contrato: { ...dadosC, arquivos: arquivos.map(nome => ({ nome, em: nowIso() })) } });
            criadas.push({ id, codigo, amb: g.map(a => a.nome).join(', ') });
          } catch (e) { if (e.duplicada) criadas.push({ id: e.duplicada.id, codigo: numOS(e.duplicada), amb: 'já existia' }); else throw e; }
        }
      } else {
        const alvo = oss.find(o => o.id === osAlvo);
        if (!alvo) throw new Error('Escolha a OS.');
        const o = JSON.parse(JSON.stringify(alvo));
        const n = mesclarOS(o, { ...os, ambientes: ambs });
        o.contrato = { ...(o.contrato || {}) };
        Object.entries(dadosC).forEach(([k, v]) => { if (vazio(o.contrato[k]) && v) o.contrato[k] = v; });
        o.contrato.arquivos = [...(o.contrato.arquivos || []), ...arquivos.map(nome => ({ nome, em: nowIso() }))];
        const { id, ...resto } = o;
        await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', id), { ...resto, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
        criadas.push({ id, codigo: numOS(alvo), amb: n + ' campos preenchidos' });
      }
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'contratos'), {
        cliente: os.cliente.nome || '', obra: os.cliente.obra || '', ...dadosC, arquivos, ambientes: ambs.map(a => a.nome),
        oss: criadas, criadoPor: sessao.nome, criadoEm: nowIso(),
      });
      toast(destino === 'novas' ? `${criadas.length} OS criadas pelo contrato.` : 'OS atualizada pelo contrato.', 'ok');
      setRes(null);
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  const C = res?.contrato || {};
  return html`
    <div class="fade-up stack">
      <div><h2>Contratos</h2><div class="dim">Coloque o contrato: a IA extrai cliente, ambientes, materiais, prazos e condições, e cria as OSs (uma por ambiente) ou completa uma OS que já existe.</div></div>
      <div class="card page-card stack drop-grande" onDragOver=${e => e.preventDefault()} onDrop=${e => { e.preventDefault(); ler([...e.dataTransfer.files]); }}>
        <div style=${{ fontSize: '30px' }}>📑</div>
        <b>${rodando || 'Arraste o contrato aqui ou toque para escolher'}</b>
        <div class="dim">PDF, Word, Excel ou foto — pode mandar vários arquivos (contrato + anexos)</div>
        <button class="btn btn-marrom" disabled=${!!rodando} onClick=${() => inp.current?.click()}>⬆ Escolher contrato</button>
        <input ref=${inp} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { ler([...e.target.files]); e.target.value = ''; }} />
      </div>
      ${erro && html`<div class="error-box">${erro}</div>`}

      ${res && html`
        <div class="card page-card stack" style=${{ borderColor: '#b45309' }}>
          <div class="sec-title">✅ Revise o que a IA leu do contrato</div>
          <div class="dim" style=${{ marginTop: '-6px' }}>Tudo é editável. Campos em amarelo ficaram vazios — preencha antes de criar as OS.</div>
          <div class="grid3">
            ${[['Cliente', 'c', 'nome'], ['Telefone', 'c', 'telefone'], ['Obra', 'c', 'obra'], ['Endereço do cliente', 'c', 'endereco'], ['Endereço de montagem', 'c', 'enderecoMontagem'], ['Prazo de entrega', 'o', 'prazoEntrega'], ['Arquiteto', 'o', 'arquiteto'], ['Nº contrato', 'k', 'numero'], ['Assinatura', 'k', 'dataAssinatura'], ['Valor', 'k', 'valorTotal'], ['Pagamento', 'k', 'formaPagamento']].map(([t, onde, k]) => { const v = onde === 'c' ? res.os.cliente[k] : onde === 'o' ? res.os[k] : txtC(C[k]); return html`<div key=${k} class="field"><span class="lbl">${t}</span><input class=${'inp inp-sm' + (!v ? ' need-review' : '')} value=${v || ''} onInput=${e => { const val = e.target.value; setRes(r => onde === 'c' ? { ...r, os: { ...r.os, cliente: { ...r.os.cliente, [k]: val } } } : onde === 'o' ? { ...r, os: { ...r.os, [k]: val } } : { ...r, contrato: { ...r.contrato, [k]: val } }); }} onBlur=${e => ['nome', 'obra', 'arquiteto'].includes(k) && setRes(r => onde === 'c' ? { ...r, os: { ...r.os, cliente: { ...r.os.cliente, [k]: nomePadrao(e.target.value) } } } : { ...r, os: { ...r.os, [k]: nomePadrao(e.target.value) } })} /></div>`; })}
          </div>
          ${txtC(C.clausulasImportantes) && html`<div class="dica"><b>Cláusulas importantes:</b><div style=${{ whiteSpace: 'pre-wrap' }}>${txtC(C.clausulasImportantes)}</div></div>`}
          <span class="lbl">Ambientes encontrados (${res.os.ambientes.length})</span>
          <div class="dim" style=${{ fontSize: '12px' }}>Cada ambiente vira uma OS, nesta ordem: banheiros/lavabo → lavanderia → cozinhas → demais áreas com pedra → resto.</div>
          ${(() => { let k = 0; return res.os.ambientes.map((a, i) => { const o = ordemAmb(a); const nPrev = marcados[i] && destino === 'novas' ? ++k : null; return html`<label key=${i} class="item-lista" style=${{ cursor: 'pointer' }}><span><input type="checkbox" checked=${!!marcados[i]} onChange=${e => setMarcados({ ...marcados, [i]: e.target.checked })} /> ${nPrev ? html`<span class="chip chip-accent">${nPrev}ª OS</span> ` : ''}<b>${a.nome}</b> <span class="dim">· ${a.moveis.length} móveis</span></span><span class="chip">${ROTULO_ORDEM[o]}${o < 3 && temPedra(a) ? ' · 🪨' : ''}</span></label>`; }); })()}
          <div class="opcoes3" style=${{ gridTemplateColumns: '1fr 1fr' }}>
            <button class=${'opc' + (destino === 'novas' ? ' on' : '')} onClick=${() => setDestino('novas')}><b>Criar OSs novas</b><small>Uma OS para cada ambiente marcado</small></button>
            <button class=${'opc' + (destino === 'existente' ? ' on' : '')} onClick=${() => setDestino('existente')}><b>Completar OS existente</b><small>Preenche só o que estiver vazio</small></button>
          </div>
          ${destino === 'existente' && html`<select class="inp" value=${osAlvo} onChange=${e => setOsAlvo(e.target.value)}><option value="">Escolha a OS…</option>${oss.map(o => html`<option key=${o.id} value=${o.id}>${numOS(o)} — ${o.cliente?.nome || ''} · ${(o.ambientes || []).map(a => a.nome).join(', ')}</option>`)}</select>`}
          <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
            <button class="btn" onClick=${() => setRes(null)}>Cancelar</button>
            <button class="btn btn-marrom" disabled=${!!rodando || (destino === 'existente' && !osAlvo)} onClick=${aplicar}>${destino === 'novas' ? `Criar ${Object.values(marcados).filter(Boolean).length || 1} OS` : 'Completar a OS'}</button>
          </div>
        </div>`}

      <div class="card page-card stack">
        <div class="sec-title">📚 Contratos lidos</div>
        ${lista.length === 0 ? html`<div class="dim">Nenhum contrato ainda.</div>` : lista.map(c => html`
          <div key=${c.id} class="item-lista" style=${{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
            <span style=${{ flex: 1, minWidth: '200px' }}><b>${c.cliente || 'Cliente'}</b>${c.numero ? html` · nº ${c.numero}` : ''}${c.valorTotal ? html` · ${c.valorTotal}` : ''}
              <br/><small class="dim">${(c.arquivos || []).join(', ')} · ${c.criadoPor} · ${fmtData(c.criadoEm)}</small></span>
            <span class="row" style=${{ gap: '4px' }}>${(c.oss || []).map(o => html`<button key=${o.id} class="btn btn-sm" onClick=${() => abrirOS(o.id)} title=${o.amb}>OS ${o.codigo}</button>`)}</span>
          </div>`)}
      </div>
    </div>`;
}

/* ---------- Diário de obra por OS (ambiente): pendências faladas + fotos ---------- */
async function fotoCompacta(file) { return imagemParaJpeg(file, 1024); }
function DiarioOS({ sessao, os, toast }) {
  const [itens, setItens] = useState(null);
  const [texto, setTexto] = useState('');
  const [interim, setInterim] = useState('');
  const [fotos, setFotos] = useState([]);
  const [tipo, setTipo] = useState('');
  const [filtroD, setFiltroD] = useState('abertas');
  const [salvando, setSalvando] = useState(false);
  const [verFoto, setVerFoto] = useState(null);
  const cam = useRef(null), gal = useRef(null);
  const base = ['empresas', sessao.empresaId, 'os', os.id, 'diario'];
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col(...base), orderBy('em', 'desc')), s => setItens(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setItens([]));
  }, [os.id]);
  const fala = useFala({ onFinal: (t) => setTexto(v => (v ? v + ' ' : '') + t), onInterim: setInterim });
  const addFotos = async (files) => {
    const novas = [];
    for (const f of [...files].slice(0, 6 - fotos.length)) { try { novas.push(await fotoCompacta(f)); } catch {} }
    setFotos(v => [...v, ...novas].slice(0, 6));
  };
  const contar = async (lista) => {
    const abertas = lista.filter(i => i.tipo === 'pendencia' && !i.resolvida).length;
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { pendAbertas: abertas, diarioN: lista.length, diarioEm: nowIso() });
  };
  const salvar = async () => {
    fala.ouvindo && fala.parar();
    const t = (texto + ' ' + interim).trim();
    if (!t && !fotos.length) return toast('Fale, escreva ou tire uma foto.');
    setSalvando(true);
    try {
      const doc = { tipo, texto: t, fotos, quem: sessao.nome, em: nowIso(), resolvida: false };
      if (tipo === 'final' && !fotos.length) { setSalvando(false); return toast('Tire a foto do que foi montado hoje.'); }
      const r = await F().fsMod.addDoc(col(...base), doc);
      if (tipo === 'final') await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { ultimoFinal: { em: doc.em, quem: sessao.nome, foto: fotos[0], texto: t } });
      await contar([{ id: r.id, ...doc }, ...(itens || [])]);
      setTexto(''); setInterim(''); setFotos([]); setTipo('');
      registrar(sessao, os.id, tipo === 'pendencia' ? '⚠️' : tipo === 'final' ? '🌇' : '📓', tipo === 'pendencia' ? 'Pendência no diário de obra' : tipo === 'final' ? 'Foto do final do dia' : 'Registro no diário de obra', t.slice(0, 160));
      toast(tipo === 'pendencia' ? 'Pendência registrada.' : 'Registro salvo no diário.', 'ok');
    } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
    setSalvando(false);
  };
  const resolver = async (it, v) => {
    let motivo = '';
    if (!v) { motivo = await pedirMotivo('Reabrir pendência'); if (!motivo) return; }
    registrar(sessao, os.id, v ? '✅' : '↺', v ? 'Pendência resolvida' : 'Pendência reaberta', (motivo ? motivo + ' — ' : '') + String(it.texto || '').slice(0, 120));
    await F().fsMod.updateDoc(docRef(...base, it.id), { resolvida: v, resolvidaPor: v ? sessao.nome : '', resolvidaEm: v ? nowIso() : '' });
    await contar((itens || []).map(x => x.id === it.id ? { ...x, resolvida: v } : x));
  };
  const abertas = (itens || []).filter(i => i.tipo === 'pendencia' && !i.resolvida);
  const nFotos = (itens || []).reduce((n, i) => n + (i.fotos || []).length, 0);
  const TIPOS_D = [['pendencia', '⚠', 'Problema / pendência', 'Falta peça, defeito, algo a resolver', '#dc2626'], ['final', '🌇', 'Final do dia', 'Foto do que foi montado hoje', '#d97706'], ['registro', '📝', 'Anotação', 'O que foi feito, recado, observação', '#2563eb'], ['foto', '📷', 'Só foto', 'Registrar fotos da obra', '#0d9488']];
  const tInfo = TIPOS_D.find(t => t[0] === tipo);
  const filtrados = (itens || []).filter(i => filtroD === 'abertas' ? (i.tipo === 'pendencia' && !i.resolvida) : filtroD === 'fotos' ? (i.fotos || []).length : true);
  const porDia = []; filtrados.forEach(i => { const d = String(i.em).slice(0, 10); const g = porDia.find(x => x[0] === d); g ? g[1].push(i) : porDia.push([d, [i]]); });
  const nomeDia = (d) => { const h = isoD(new Date()), o = isoD(new Date(Date.now() - 864e5)); return d === h ? 'Hoje' : d === o ? 'Ontem' : new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); };
  return html`
    <div class="dia-topo">
      <div><div class="sheet-t" style=${{ margin: 0 }}>📓 Diário de obra</div><div class="dim">${numOS(os)} · ${(os.cliente?.nome || '').split(/\s[-–]\s/)[0]} · ${(os.ambientes || []).map(a => a.nome).join(', ') || os.ambienteResumo || ''}</div></div>
      <div class="dia-kpis"><span class=${abertas.length ? 'ruim' : 'bom'}>${abertas.length ? '⚠ ' + abertas.length + ' em aberto' : '✓ Sem pendências'}</span><span>📷 ${nFotos}</span><span>📝 ${(itens || []).length}</span></div>
    </div>
    ${!tipo ? html`<div class="dia-escolha"><div class="lbl">O que você quer registrar?</div>
      <div class="dia-cards">${TIPOS_D.map(([v, ic, t, d, c]) => html`<button key=${v} class="dia-card" style=${{ '--c': c }} onClick=${() => { setTipo(v); if (v === 'final' || v === 'foto') setTimeout(() => cam.current?.click(), 50); }}><span class="dia-ic">${ic}</span><b>${t}</b><small>${d}</small></button>`)}</div></div>`
    : html`<div class="dia-box" style=${{ '--c': tInfo[4] }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><b style=${{ color: tInfo[4] }}>${tInfo[1]} ${tInfo[2]}</b><button class="btn btn-sm btn-ghost" onClick=${() => { setTipo(''); setTexto(''); setFotos([]); fala.ouvindo && fala.parar(); }}>✕ Cancelar</button></div>
      ${tipo !== 'foto' && html`<textarea class="inp" rows="3" placeholder=${tipo === 'pendencia' ? 'Ex: falta 1 dobradiça na porta do balcão…' : tipo === 'final' ? 'O que foi montado hoje (opcional)' : 'Escreva ou toque em 🎤 e fale'} value=${texto + (interim ? ' ' + interim : '')} onInput=${e => { setTexto(e.target.value); setInterim(''); }}></textarea>`}
      <div class="dia-acoes">
        ${tipo !== 'foto' && (fala.ouvindo ? html`<button class="btn btn-grande btn-mic-on pulse" onClick=${fala.parar}>■ Parar</button>` : html`<button class="btn btn-grande btn-teal" onClick=${fala.iniciar}>🎤 Falar</button>`)}
        <button class="btn btn-grande" onClick=${() => cam.current?.click()}>📷 Tirar foto</button>
        <button class="btn btn-grande btn-ghost" onClick=${() => gal.current?.click()}>🖼️ Galeria</button>
      </div>
      ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
      ${fotos.length > 0 && html`<div class="dia-fotos">${fotos.map((f, i) => html`<span key=${i}><img src=${f} /><button onClick=${() => setFotos(fotos.filter((_, j) => j !== i))}>✕</button></span>`)}</div>`}
      <button class="btn btn-grande btn-verde btn-block" disabled=${salvando} onClick=${async () => { await salvar(); }}>${salvando ? 'Salvando…' : '✓ Salvar'}</button>
    </div>`}
    <input ref=${cam} type="file" accept="image/*" capture="environment" hidden onChange=${e => { addFotos(e.target.files); e.target.value = ''; }} />
    <input ref=${gal} type="file" accept="image/*" multiple hidden onChange=${e => { addFotos(e.target.files); e.target.value = ''; }} />
    <div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>${[['abertas', '⚠ Em aberto (' + abertas.length + ')'], ['tudo', '📅 Tudo por dia'], ['fotos', '📷 Fotos']].map(([v, t]) => html`<button key=${v} class=${filtroD === v ? 'on' : ''} onClick=${() => setFiltroD(v)}>${t}</button>`)}</div>
    ${itens === null ? html`<div class="dim">Carregando…</div>` : !filtrados.length ? html`<div class="vazio dim">${filtroD === 'abertas' ? '✓ Nenhuma pendência em aberto.' : 'Nada registrado ainda.'}</div>`
      : filtroD === 'fotos' ? html`<div class="dia-galeria">${filtrados.flatMap(it => (it.fotos || []).map((f, k) => html`<img key=${it.id + k} src=${f} title=${fmtData(it.em)} onClick=${() => setVerFoto(f)} />`))}</div>`
      : porDia.map(([d, lst]) => html`<div key=${d}><div class="dia-dia">${nomeDia(d)}</div>${lst.map(it => html`
      <div key=${it.id} class=${'dia-item ' + it.tipo + (it.resolvida ? ' ok' : '')}>
        ${it.tipo === 'pendencia' && html`<button class=${'dia-ck' + (it.resolvida ? ' on' : '')} title=${it.resolvida ? 'Reabrir' : 'Marcar como resolvida'} onClick=${() => resolver(it, !it.resolvida)}>${it.resolvida ? '✓' : ''}</button>`}
        <div class="grow">
          <div class="dia-cab"><span>${(TIPOS_D.find(t => t[0] === it.tipo) || [])[1] || '📝'} <b>${new Date(it.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b> · ${it.quem}</span></div>
          ${it.texto && html`<div class="dia-txt">${it.texto}</div>`}
          ${(it.fotos || []).length > 0 && html`<div class="dia-fotos">${it.fotos.map((f, i) => html`<span key=${i}><img src=${f} onClick=${() => setVerFoto(f)} /></span>`)}</div>`}
          ${it.resolvida && it.resolvidaPor && html`<small class="dim">✓ Resolvida por ${it.resolvidaPor} · ${fmtData(it.resolvidaEm)}</small>`}
        </div>
      </div>`)}</div>`)}
    ${verFoto && html`<div class="foto-cheia" onClick=${() => setVerFoto(null)}><img src=${verFoto} /></div>`}`;
}

/* ---------- Pagamento de nota / conta ligado à OS ---------- */
const pgNovo = () => ({ lancar: true, forma: '', conta: '', parcelas: 1, venc: isoD(new Date()), pago: false });
function PagamentoBox({ pg, setPg, total }) {
  const n = Math.max(1, parseInt(pg.parcelas, 10) || 1);
  return html`<div class="pg-box">
    <span class="lbl">Forma de pagamento</span>
    <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${FORMAS_PG.map(f => html`<button key=${f} class=${'pill' + (pg.forma === f ? ' on' : '')} onClick=${() => setPg({ ...pg, forma: f })}>${f}</button>`)}</div>
    <span class="lbl">Em quantas vezes</span>
    <div class="row" style=${{ gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>${[1, 2, 3, 4, 5, 6, 10, 12].map(k => html`<button key=${k} class=${'pill' + (n === k ? ' on' : '')} onClick=${() => setPg({ ...pg, parcelas: k })}>${k === 1 ? 'À vista' : k + 'x'}</button>`)}
      <span class="dim" style=${{ marginLeft: '6px' }}>1º venc.</span><input class="inp inp-sm" style=${{ width: '140px' }} type="date" value=${pg.venc} onInput=${e => setPg({ ...pg, venc: e.target.value })} /></div>
    <div class="pg-resumo">${n > 1 ? n + ' × ' + brl(Math.round(total / n * 100) / 100) : brl(total) + ' à vista'}${pg.forma ? ' · ' + pg.forma : ''}</div>
  </div>`;
}
async function lancarPagamentoOS(sessao, os, { descricao, categoria, total, tipo = 'pagar', notaId = '', nf = '' }, pg) {
  if (!pg?.lancar || !numBR(total)) return 0;
  const n = Math.max(1, parseInt(pg.parcelas, 10) || 1), grupo = n > 1 ? rand(8) : '';
  const vp = Math.round(numBR(total) / n * 100) / 100;
  const b = F().fsMod.writeBatch(F().db);
  for (let k = 0; k < n; k++) b.set(F().fsMod.doc(col('empresas', sessao.empresaId, 'lancamentos')), { tipo, categoria, descricao, valor: k === n - 1 ? Math.round((numBR(total) - vp * (n - 1)) * 100) / 100 : vp, venc: addMes(pg.venc, k), parcela: n > 1 ? (k + 1) + '/' + n : '', recorrente: false, grupo, forma: pg.forma || '', conta: pg.conta || '', pago: false, pagoEm: '', osId: os.id, osCod: numOS(os), cliente: os.cliente?.nome || '', notaId, nf, criadoEm: nowIso(), por: sessao.nome });
  await b.commit();
  registrar(sessao, os.id, tipo === 'pagar' ? '💸' : '💰', (tipo === 'pagar' ? 'Conta a pagar: ' : 'A receber: ') + descricao, n + 'x · ' + brl(numBR(total)) + (pg.forma ? ' · ' + pg.forma : ''));
  return n;
}
function FinanceiroOS({ sessao, os, toast }) {
  const [notas, setNotas] = useState(null), [lanc, setLanc] = useState([]), [novo, setNovo] = useState(null), [comp, setComp] = useState(null);
  useEffect(() => { const { onSnapshot, query, where } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'notas'), where('osId', '==', os.id)), s => setNotas(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setNotas([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'lancamentos'), where('osId', '==', os.id)), s => setLanc(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const c = onSnapshot(docRef('empresas', sessao.empresaId, 'compras', os.id), d => setComp(d.data() || {}), () => {});
    return () => { a(); b(); c(); }; }, [os.id]);
  const soma = (l) => l.reduce((n, x) => n + numBR(x.valor), 0);
  const rec = lanc.filter(x => x.tipo === 'receber'), pag = lanc.filter(x => x.tipo === 'pagar');
  const contrato = numBR(os.financeiro?.valor), material = (comp?.itens || []).reduce((n, i) => n + numBR(i.valor), 0);
  const pagar = async (x) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'lancamentos', x.id), { pago: !x.pago, pagoEm: !x.pago ? nowIso() : '', pagoPor: !x.pago ? sessao.nome : '' }); registrar(sessao, os.id, x.pago ? '↺' : '✅', (x.pago ? 'Desmarcado: ' : (x.tipo === 'pagar' ? 'Pago: ' : 'Recebido: ')) + x.descricao + (x.parcela ? ' (' + x.parcela + ')' : ''), brl(x.valor)); } catch (e) { toast(e.message, 'erro'); } };
  const salvarNovo = async () => { const v = numBR(novo.valor); if (!v) return toast('Informe o valor.'); try { await lancarPagamentoOS(sessao, os, { descricao: novo.descricao || novo.categoria, categoria: novo.categoria, total: v, tipo: novo.tipo }, { ...novo.pg, lancar: true }); toast('Lançado no financeiro.', 'ok'); setNovo(null); } catch (e) { toast(e.message, 'erro'); } };
  const Linha = (x) => html`<div key=${x.id} class=${'fo-l' + (x.pago ? ' ok' : x.venc < isoD(new Date()) ? ' atraso' : '')}>
    <button class=${'dia-ck' + (x.pago ? ' on' : '')} onClick=${() => pagar(x)}>${x.pago ? '✓' : ''}</button>
    <span class="grow"><b>${x.descricao}</b><small>${[x.parcela, x.forma, x.conta, x.pago ? (x.tipo === 'pagar' ? 'pago' : 'recebido') : 'vence ' + dm(x.venc)].filter(Boolean).join(' · ')}</small></span><b>${brl(x.valor)}</b></div>`;
  const Grupo = (tit, l, cor) => { const pg = l.filter(x => x.pago); return html`<div class="fo-g"><div class="fo-gt" style=${{ color: cor }}>${tit} <small>${pg.length} de ${l.length} · ${brl(soma(pg))} feito · falta ${brl(soma(l) - soma(pg))}</small></div>${l.sort((a, b) => String(a.venc).localeCompare(b.venc)).map(Linha)}</div>`; };
  return html`<div class="stack">
    <${ComprasOS} sessao=${sessao} os=${os} toast=${toast} soNota=${true} />
    ${(notas || []).length > 0 && html`<div class="fo-gt">🧾 Notas desta OS</div>`}
    ${(notas || []).sort((a, b) => String(b.data).localeCompare(a.data)).map(n => { const ps = pag.filter(x => x.notaId === n.id); return html`<div key=${n.id} class="fo-l">
      <span class="grow"><b>NF ${n.numero || 's/n'} · ${n.fornecedor}</b><small>${[fmtData(n.data), n.pagamento?.forma, ps.length ? (ps.length > 1 ? ps.length + 'x · ' : '') + ps.filter(x => x.pago).length + ' de ' + ps.length + ' pagas' : ''].filter(Boolean).join(' · ')}</small></span><b>${brl(numBR(n.total) || (n.linhas || []).reduce((t, l) => t + numBR(l.valorTotal), 0))}</b></div>`; })}
  </div>`;
}

/* ---------- Amostras: nossas emprestadas + itens que o cliente deixou ---------- */
function Amostras({ sessao, toast, os }) {
  const [l, setL] = useState(null), [f, setF] = useState(os ? 'fora' : 'fora'), [novo, setNovo] = useState(null), [oss, setOss] = useState([]);
  const E = sessao.empresaId, hoje = isoD(new Date());
  useEffect(() => { const { onSnapshot, query, where } = F().fsMod; const c = col('empresas', E, 'amostras');
    const a = onSnapshot(os ? query(c, where('osId', '==', os.id)) : c, s => setL(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setL([]));
    const b = os ? () => {} : onSnapshot(col('empresas', E, 'os'), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { a(); b(); }; }, [os?.id]);
  const fora = (l || []).filter(x => x.tipo === 'nossa' && !x.devolvidoEm), dev = (l || []).filter(x => x.devolvidoEm), cli = (l || []).filter(x => x.tipo === 'cliente' && !x.devolvidoEm);
  const vis = f === 'fora' ? fora : f === 'cliente' ? cli : dev;
  const salvar = async () => { const n = novo; if (!n.item.trim()) return toast('Escreva qual amostra/item.'); if (!n.quem.trim()) return toast(n.tipo === 'nossa' ? 'Quem levou?' : 'De qual cliente?');
    const o = os || oss.find(x => x.id === n.osId);
    try { await F().fsMod.addDoc(col('empresas', E, 'amostras'), { ...n, item: n.item.trim(), quem: n.quem.trim(), osId: o?.id || '', osCod: o ? numOS(o) : '', criadoEm: nowIso(), por: sessao.nome, devolvidoEm: '' });
      o && registrar(sessao, o.id, '📦', (n.tipo === 'nossa' ? 'Amostra emprestada: ' : 'Cliente deixou: ') + n.item, n.quem); toast('Registrado.', 'ok'); setNovo(null); } catch (e) { toast(e.message, 'erro'); } };
  const devolver = async (x) => { let mot = ''; if (x.devolvidoEm) { mot = await pedirMotivo('Desfazer devolução'); if (!mot) return; }
    try { await F().fsMod.updateDoc(docRef('empresas', E, 'amostras', x.id), { devolvidoEm: x.devolvidoEm ? '' : nowIso(), devolvidoPor: x.devolvidoEm ? '' : sessao.nome }); x.osId && registrar(sessao, x.osId, x.devolvidoEm ? '↺' : '✅', (x.devolvidoEm ? 'Devolução desfeita: ' : x.tipo === 'nossa' ? 'Amostra devolvida: ' : 'Item devolvido ao cliente: ') + x.item, mot || x.quem); } catch (e) { toast(e.message, 'erro'); } };
  const apagar = async (x) => { const m = await pedirMotivo('Apagar registro', x.item + ' — ' + x.quem); if (!m) return; await F().fsMod.deleteDoc(docRef('empresas', E, 'amostras', x.id)); };
  const nomeCli = os ? (os.cliente?.nome || '').split(/\s[-–]\s/)[0] : '';
  const itensAnt = [...new Set((l || []).map(x => x.item))];
  return html`<div class="stack">
    <div class="row" style=${{ gap: '6px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <div class="seg-mini">${[['fora', '📤 Fora com alguém (' + fora.length + ')'], ['cliente', '📥 Do cliente, com a gente (' + cli.length + ')'], ['dev', '✓ Devolvidas (' + dev.length + ')']].map(([v, t]) => html`<button key=${v} class=${f === v ? 'on' : ''} onClick=${() => setF(v)}>${t}</button>`)}</div>
      <div class="row" style=${{ gap: '6px' }}>
        <button class="btn btn-sm btn-primary" onClick=${() => setNovo({ tipo: 'nossa', item: '', quem: nomeCli, contato: '', saiu: hoje, prev: '', obs: '', osId: '' })}>📤 Emprestar amostra</button>
        <button class="btn btn-sm" onClick=${() => setNovo({ tipo: 'cliente', item: '', quem: nomeCli, contato: '', saiu: hoje, prev: '', obs: '', osId: '' })}>📥 Cliente deixou algo</button></div></div>
    ${novo && html`<div class="card stack">
      <b>${novo.tipo === 'nossa' ? '📤 Nossa amostra saindo' : '📥 Item que o cliente deixou aqui'}</b>
      <div class="grid2">
        <input class="inp" list="amostras-ant" placeholder=${novo.tipo === 'nossa' ? 'Qual amostra? (ex: chapa Freijó, puxador…)' : 'O quê? (ex: amostra de tecido, pedra, tinta…)'} value=${novo.item} onInput=${e => setNovo({ ...novo, item: e.target.value })} />
        <input class="inp" placeholder=${novo.tipo === 'nossa' ? 'Quem levou? (cliente, arquiteto…)' : 'Cliente'} value=${novo.quem} onInput=${e => setNovo({ ...novo, quem: e.target.value })} />
        <input class="inp" placeholder="Telefone / contato (opcional)" value=${novo.contato} onInput=${e => setNovo({ ...novo, contato: e.target.value })} />
        ${!os && html`<select class="inp" value=${novo.osId} onChange=${e => setNovo({ ...novo, osId: e.target.value })}><option value="">OS ligada (opcional)</option>${oss.slice().sort((a, b) => numOS(a).localeCompare(numOS(b))).map(o => html`<option key=${o.id} value=${o.id}>${numOS(o)} ${(o.cliente?.nome || '').split(/\s[-–]\s/)[0]}</option>`)}</select>`}
        <div class="field"><span class="lbl">${novo.tipo === 'nossa' ? 'Saiu em' : 'Deixou em'}</span><input class="inp" type="date" value=${novo.saiu} onInput=${e => setNovo({ ...novo, saiu: e.target.value })} /></div>
        <div class="field"><span class="lbl">${novo.tipo === 'nossa' ? 'Devolver até (opcional)' : 'Devolver ao cliente até (opcional)'}</span><input class="inp" type="date" value=${novo.prev} onInput=${e => setNovo({ ...novo, prev: e.target.value })} /></div>
      </div>
      <input class="inp" placeholder="Observação (opcional)" value=${novo.obs} onInput=${e => setNovo({ ...novo, obs: e.target.value })} />
      <datalist id="amostras-ant">${itensAnt.map(i => html`<option key=${i} value=${i} />`)}</datalist>
      <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setNovo(null)}>Cancelar</button><button class="btn btn-primary" style=${{ flex: 1 }} onClick=${salvar}>💾 Registrar</button></div></div>`}
    ${l === null ? html`<div class="dim">Carregando…</div>` : !vis.length ? html`<div class="vazio dim">${f === 'fora' ? 'Nenhuma amostra fora.' : f === 'cliente' ? 'Nada do cliente guardado aqui.' : 'Nenhuma devolução ainda.'}</div>`
      : vis.sort((a, b) => String(a.prev || '9').localeCompare(String(b.prev || '9')) || String(b.saiu).localeCompare(a.saiu)).map(x => { const atras = !x.devolvidoEm && x.prev && x.prev < hoje; const dias = Math.round((Date.now() - new Date(x.saiu + 'T12:00')) / 864e5); return html`<div key=${x.id} class=${'fo-l' + (atras ? ' atraso' : '') + (x.devolvidoEm ? ' ok' : '')}>
        <button class=${'dia-ck' + (x.devolvidoEm ? ' on' : '')} title=${x.devolvidoEm ? 'Desfazer' : 'Marcar como devolvida'} onClick=${() => devolver(x)}>${x.devolvidoEm ? '✓' : ''}</button>
        <span class="grow"><b>${x.tipo === 'nossa' ? '📤' : '📥'} ${x.item}</b><small>${[(x.tipo === 'nossa' ? 'com ' : 'de ') + x.quem, x.contato, x.osCod && !os ? 'OS ' + x.osCod : '', (x.tipo === 'nossa' ? 'saiu ' : 'deixou ') + dm(x.saiu) + (x.devolvidoEm ? '' : ' (' + dias + ' dias)'), x.devolvidoEm ? 'devolvida ' + fmtData(x.devolvidoEm) + (x.devolvidoPor ? ' · ' + x.devolvidoPor : '') : x.prev ? (atras ? '⚠ atrasada — era até ' : 'até ') + dm(x.prev) : '', x.obs].filter(Boolean).join(' · ')}</small></span>
        <button class="x-btn" onClick=${() => apagar(x)}>✕</button></div>`; })}
  </div>`;
}
function TelaAmostras({ sessao, toast }) {
  return html`<div class="fade-up stack"><div class="page-head"><div><h2>📦 Amostras</h2><div class="dim">Quem levou nossas amostras, o que já voltou, e o que clientes deixaram aqui.</div></div></div>
    <div class="card page-card"><${Amostras} sessao=${sessao} toast=${toast} /></div></div>`;
}

/* ---------- Pedidos (peças extras, terceiros e compras) ---------- */
const PED_TIPOS = [['interno', '🪵', 'Peça extra', 'Produção interna'], ['parceiro', '🤝', 'Pedido do parceiro', 'Parceiro pede p/ a fábrica'], ['terceiro', '🤝', 'Terceirizado', 'Parceiro faz'], ['compra', '🛒', 'Compra', 'Comprar material']];
const PED_ITENS = [['peca', '🟫', 'Peça MDF'], ['cabideiro', '➖', 'Cabideiro'], ['tapafuro', '⚪', 'Tapa-furo'], ['dobradica', '🔩', 'Acab. dobradiça'], ['tinta', '🎨', 'Tinta p/ retoque'], ['frente', '🚪', 'Porta / frente'], ['gaveta', '🗄️', 'Gaveta'], ['prateleira', '📚', 'Prateleira'], ['outro', '📦', 'Outra peça']];
const PED_ST = {
  interno: [['solicitado', 'Solicitado', '#9ca3af'], ['producao', 'Em produção', '#f59e0b'], ['pronto', 'Pronto na fábrica', '#2563eb'], ['entregue', 'Entregue na obra', '#16a34a']],
  terceiro: [['orcar', 'A orçar', '#9ca3af'], ['aguard_orc', 'Aguard. orçamento', '#f59e0b'], ['aguard_aprov', 'Aguard. aprovação', '#ea580c'], ['pedido', 'Pedido feito', '#2563eb'], ['recebido', 'Recebido', '#0d9488'], ['entregue', 'Entregue na obra', '#16a34a']],
};
PED_ST.compra = PED_ST.terceiro; PED_ST.parceiro = PED_ST.interno;
const PED_ITENS_PARC = [['moldura', '🖼️', 'Moldura'], ['usinagem', '⚙️', 'Usinagem'], ['corte', '🪚', 'Corte'], ['fita', '🎞️', 'Fita de borda'], ['furacao', '🕳️', 'Furação'], ['pintura', '🎨', 'Pintura / laca'], ['peca', '🟫', 'Peça MDF'], ['outro', '📦', 'Outro serviço']];
PED_ITENS_PARC.forEach(x => { if (!PED_ITENS.some(y => y[0] === x[0])) PED_ITENS.push(x); });
const stPed = (p) => (PED_ST[p.tipo] || PED_ST.interno).find(s => s[0] === p.st) || (PED_ST[p.tipo] || PED_ST.interno)[0];
const pedAberto = (p) => p.st !== 'entregue';
const resumoPed = (p) => [p.qtd ? p.qtd + '×' : '', (PED_ITENS.find(i => i[0] === p.item) || [])[2] || '', p.cor, p.larg || p.alt ? (p.larg || '?') + '×' + (p.alt || '?') + 'mm' : '', p.esp ? p.esp + 'mm' : '', p.fita && Object.values(p.fita).some(Boolean) ? 'fita ' + ['cima', 'baixo', 'esq', 'dir'].filter(k => p.fita[k]).join('/') : '', p.veio ? 'veio ' + ({ h: '↔', v: '↕', x: 'indif.' })[p.veio] : ''].filter(Boolean).join(' · ');

function NovoPedido({ sessao, os, toast, fechar, catalogo, doParceiro }) {
  const [p, setP] = useState({ tipo: doParceiro ? 'parceiro' : 'interno', item: doParceiro ? 'moldura' : 'peca', parceiro: doParceiro ? (os.execucao?.parceiro?.nome || '') : '', qtd: 1, cor: '', larg: '', alt: '', esp: '18', fita: { cima: false, baixo: false, esq: false, dir: false }, veio: '', prazo: '', obs: '', fotos: [] });
  const [salvando, setSalvando] = useState(false);
  const cam = useRef(null);
  const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  const fala = useFala({ onFinal: (t) => setP(x => ({ ...x, obs: (x.obs ? x.obs + ' ' : '') + t })) });
  const ehPeca = ['peca', 'frente', 'gaveta', 'prateleira', 'moldura', 'corte', 'fita'].includes(p.item);
  const ck = [['Qtd', p.qtd > 0], ['Cor', !!p.cor], ['Tamanho', !ehPeca || (p.larg && p.alt)], ['Espessura', !ehPeca || !!p.esp], ['Fita', !ehPeca || Object.values(p.fita).some(Boolean) || p.semFita], ['Veio', !ehPeca || !!p.veio], ['Prazo', !!p.prazo]];
  const salvar = async () => {
    setSalvando(true);
    try {
      const st = (PED_ST[p.tipo] || PED_ST.interno)[0][0];
      if (doParceiro && !String(p.parceiro || '').trim()) { setSalvando(false); return toast('Informe qual parceiro está pedindo.'); }
      registrar(sessao, os.id, doParceiro ? '🤝' : '🪵', doParceiro ? 'Pedido do parceiro ' + p.parceiro + ': ' + (PED_ITENS.find(x => x[0] === p.item) || [])[2] : 'Pedido de peça extra', (p.obs || '').slice(0, 120));
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'pedidos'), { ...p, st, osId: os.id, osCod: numOS(os), cliente: os.cliente?.nome || '', ambiente: (os.ambientes || []).map(a => a.nome).join(', ') || os.ambienteResumo || '', quem: sessao.nome, em: nowIso(), hist: [{ st, quem: sessao.nome, em: nowIso() }] });
      toast('Pedido enviado.', 'ok'); fechar();
    } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
    setSalvando(false);
  };
  return html`
    <div class="sheet-t">${doParceiro ? '🤝 Pedido do parceiro para a fábrica' : '🪵 Pedir peça extra'}</div>
    ${doParceiro && html`<div class="field"><span class="lbl">Parceiro que está pedindo</span><input class="inp" value=${p.parceiro} placeholder="Nome do parceiro" onInput=${e => set('parceiro', e.target.value)} /></div>`}
    <div class="dim" style=${{ marginTop: '-6px' }}>${numOS(os)} · ${os.cliente?.nome} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div>
    <span class="lbl">O que precisa?</span>
    <div class="ped-itens">${(doParceiro ? PED_ITENS_PARC : PED_ITENS.filter(x => !PED_ITENS_PARC.slice(0, 6).some(y => y[0] === x[0]))).map(([k, ic, t]) => html`<button key=${k} class=${'ped-item' + (p.item === k ? ' on' : '')} onClick=${() => set('item', k)}><span>${ic}</span>${t}</button>`)}</div>
    <div class="ped-linha">
      <div class="field"><span class="lbl">Quantidade</span><div class="stepper"><button onClick=${() => set('qtd', Math.max(1, (+p.qtd || 1) - 1))}>−</button><b>${p.qtd}</b><button onClick=${() => set('qtd', (+p.qtd || 0) + 1)}>+</button></div></div>
      <div class="field" style=${{ flex: 1 }}><span class="lbl">Cor / acabamento</span><${CatalogoInput} value=${p.cor} placeholder="Ex: Freijó Duratex, branco TX…" catalogo=${catalogo} filtro=${{ tipos: ['MDF'] }} sessao=${sessao} onChange=${v => set('cor', v)} onPick=${it => set('cor', [it.nome, it.fabricante].filter(Boolean).join(' '))} className="inp" /></div>
    </div>
    ${ehPeca && html`
      <div class="ped-peca">
        <div class="ped-desenho">
          <div class="ped-chapa">
            ${['cima', 'baixo', 'esq', 'dir'].map(l => html`<button key=${l} class=${'fita-l ' + l + (p.fita[l] ? ' on' : '')} title=${'Fita ' + l} onClick=${() => setP(x => ({ ...x, semFita: false, fita: { ...x.fita, [l]: !x.fita[l] } }))}></button>`)}
            <div class=${'veio-marca v-' + (p.veio || 'n')}>${p.veio === 'h' ? '↔' : p.veio === 'v' ? '↕' : ''}</div>
            <input class="med larg" inputmode="numeric" placeholder="Larg." value=${p.larg} onInput=${e => set('larg', e.target.value.replace(/\D/g, ''))} />
            <input class="med alt" inputmode="numeric" placeholder="Alt." value=${p.alt} onInput=${e => set('alt', e.target.value.replace(/\D/g, ''))} />
          </div>
          <small class="dim">Toque nas bordas da peça para marcar a fita. Medidas em mm.</small>
        </div>
        <div class="stack" style=${{ gap: '8px' }}>
          <div><span class="lbl">Espessura</span><div class="row" style=${{ gap: '5px' }}>${['6', '15', '18', '25', '36'].map(e => html`<button key=${e} class=${'pill' + (p.esp === e ? ' on' : '')} onClick=${() => set('esp', e)}>${e}</button>`)}</div></div>
          <div><span class="lbl">Sentido do veio</span><div class="row" style=${{ gap: '5px' }}>${[['h', '↔ Horizontal'], ['v', '↕ Vertical'], ['x', 'Sem veio']].map(([k, t]) => html`<button key=${k} class=${'pill' + (p.veio === k ? ' on' : '')} onClick=${() => set('veio', k)}>${t}</button>`)}</div></div>
          <label class="row dim" style=${{ gap: '5px' }}><input type="checkbox" checked=${!!p.semFita} onChange=${e => setP(x => ({ ...x, semFita: e.target.checked, fita: e.target.checked ? { cima: false, baixo: false, esq: false, dir: false } : x.fita }))} /> Sem fita de borda</label>
        </div>
      </div>`}
    <div class="ped-linha">
      <div class="field"><span class="lbl">Precisa até</span><input class="inp" type="date" value=${p.prazo} onInput=${e => set('prazo', e.target.value)} /></div>
      <div class="field" style=${{ flex: 1 }}><span class="lbl">Observação</span><div class="row" style=${{ flexWrap: 'nowrap', gap: '4px' }}><input class="inp" placeholder="Ex: porta do aéreo riscou na montagem" value=${p.obs} onInput=${e => set('obs', e.target.value)} />
        <button class=${'btn ' + (fala.ouvindo ? 'btn-mic-on pulse' : 'btn-teal')} onClick=${fala.ouvindo ? fala.parar : fala.iniciar}>🎤</button>
        <${FotoBtns} multiple=${false} onFiles=${async (fs) => { const f = fs[0]; if (f) { const img = await imagemParaJpeg(f, 1024); setP(x => ({ ...x, fotos: [...x.fotos, img].slice(0, 6) })); } }} />
        <input ref=${cam} type="file" accept="image/*" capture="environment" hidden onChange=${async e => { const f = e.target.files[0]; e.target.value = ''; if (f) { const img = await imagemParaJpeg(f, 1024); setP(x => ({ ...x, fotos: [...x.fotos, img].slice(0, 4) })); } }} /></div></div>
    </div>
    ${p.fotos.length > 0 && html`<div class="dia-fotos">${p.fotos.map((f, i) => html`<span key=${i}><img src=${f} /><button onClick=${() => setP(x => ({ ...x, fotos: x.fotos.filter((_, j) => j !== i) }))}>✕</button></span>`)}</div>`}
    <div class="ped-check">${ck.map(([t, ok]) => html`<span key=${t} class=${ok ? 'ok' : ''}>${ok ? '✓' : '○'} ${t}</span>`)}</div>
    <button class="btn btn-grande btn-verde btn-block" disabled=${salvando} onClick=${salvar}>${salvando ? 'Enviando…' : '📦 Enviar pedido'}</button>`;
}

function CartaoPedido({ p, sessao, toast, pedirSenha }) {
  const sts = PED_ST[p.tipo] || PED_ST.interno;
  const i = sts.findIndex(s => s[0] === p.st), prox = sts[i + 1], s = sts[i] || sts[0];
  const mudar = async (st, motivo) => {
    registrar(sessao, p.osId, motivo ? '↺' : '🪵', 'Peça extra: ' + ((PED_ST[p.tipo] || PED_ST.interno).find(x => x[0] === st) || [, st])[1], motivo || '');
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'pedidos', p.id), { st, hist: [...(p.hist || []), { st, quem: sessao.nome, em: nowIso(), ...(motivo ? { motivo } : {}) }] }); }
    catch (e) { toast(e.message, 'erro'); }
  };
  const tp = PED_TIPOS.find(t => t[0] === p.tipo) || PED_TIPOS[0];
  return html`
    <div class="ped-card" style=${{ borderLeftColor: s[2] }}>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <span><b>${(PED_ITENS.find(x => x[0] === p.item) || [])[1]} ${(PED_ITENS.find(x => x[0] === p.item) || [])[2]}</b> <small class="dim">${tp[1]} ${tp[2]}</small></span>
        <span class="ped-st" style=${{ background: s[2] }}>${s[1]}</span>
      </div>
      <div class="ped-res">${resumoPed(p)}</div>
      ${p.obs && html`<div class="dim">${p.obs}</div>`}
      ${(p.fotos || []).length > 0 && html`<div class="dia-fotos">${p.fotos.map((f, j) => html`<span key=${j}><img src=${f} onClick=${() => window.open(f)} /></span>`)}</div>`}
      <div class="ped-trilho">${sts.map((x, j) => html`<i key=${x[0]} title=${x[1]} style=${{ background: j <= i ? x[2] : '#e7e5e4' }}></i>`)}</div>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <small class="dim">${p.osCod} · ${p.ambiente} · ${p.quem} · ${fmtData(p.em)}${p.prazo ? ' · até ' + p.prazo.split('-').reverse().slice(0, 2).join('/') : ''}${p.parceiro ? ' · ' + p.parceiro : ''}</small>
        <span class="row" style=${{ gap: '4px' }}>
          ${i > 0 && html`<button class="btn btn-sm btn-ghost" title="Voltar" onClick=${() => pedirSenha('Voltar pedido para "' + sts[i - 1][1] + '"', (m) => mudar(sts[i - 1][0], m))}>↺</button>`}
          ${prox && html`<button class="btn btn-sm btn-verde" onClick=${() => mudar(prox[0])}>✓ ${prox[1]}</button>`}
        </span>
      </div>
    </div>`;
}

function PedidosOS({ sessao, os, toast, catalogo }) {
  const [lista, setLista] = useState(null);
  const [novo, setNovo] = useState(false);
  const [conf, setConf] = useState(null);
  const terc = ['terceirizada', 'terc_int', 'terc_ext'].includes(os.modoExecucao);
  useEffect(() => {
    const { onSnapshot, query, where } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'pedidos'), where('osId', '==', os.id)), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.em).localeCompare(String(a.em)))), () => setLista([]));
  }, [os.id]);
  if (novo) return html`<${NovoPedido} sessao=${sessao} os=${os} toast=${toast} catalogo=${catalogo} doParceiro=${novo === 'parceiro'} fechar=${() => setNovo(false)} />`;
  return html`
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sheet-t">🪵 Peças extras</div><span class="row" style=${{ gap: '6px' }}>${terc && html`<button class="btn btn-anim" style=${{ background: '#7c3aed', color: '#fff' }} onClick=${() => setNovo('parceiro')}>🤝 Pedido do parceiro</button>`}<button class="btn btn-verde" onClick=${() => setNovo(true)}>＋ Pedir peça</button></span></div>
    ${lista === null ? html`<div class="dim">Carregando…</div>` : lista.length === 0 ? html`<div class="vazio dim">Nenhuma peça pedida. O marceneiro toca em “Pedir peça” quando precisar de algo na obra.</div>` : lista.map(p => html`<${CartaoPedido} key=${p.id} p=${p} sessao=${sessao} toast=${toast} pedirSenha=${(t, fn) => setConf({ t, fn })} />`)}
    ${conf && html`<${SenhaMotivo} titulo=${conf.t} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${conf.fn} fechar=${() => setConf(null)} />`}`;
}

function TelaPedidos({ sessao, toast, abrirOS }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('abertos');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [conf, setConf] = useState(null);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'pedidos'), orderBy('em', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const l = (lista || []).filter(p => (p.tipo || 'interno') === 'interno' && (filtro === 'todos' || pedAberto(p)) && (!tipo || p.tipo === tipo) && (!busca || norm([p.cliente, p.osCod, p.ambiente, resumoPed(p), p.obs].join(' ')).includes(norm(busca))));
  const cont = (t) => (lista || []).filter(p => pedAberto(p) && (!t || p.tipo === t)).length;
  return html`
    <div class="fade-up stack qg">
      <div><h2>Peças extras</h2><div class="dim">Peças que os marceneiros pediram na obra. Para pedir: Quadro geral → cliente → ambiente → 🪵 Peças extras.</div></div>
      <div class="qg-filtros">${(PED_ST.interno).map(([k, t, c]) => html`<span key=${k} class="qg-f" style=${{ borderColor: c }}>${t} <b>${(lista || []).filter(p => (p.st || 'solicitado') === k).length}</b></span>`)}</div>
      <div class="row" style=${{ gap: '6px' }}><input class="inp" style=${{ flex: 1 }} placeholder="🔍 Buscar cliente, OS, peça…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        <div class="seg-mini"><button class=${filtro === 'abertos' ? 'on' : ''} onClick=${() => setFiltro('abertos')}>Em aberto</button><button class=${filtro === 'todos' ? 'on' : ''} onClick=${() => setFiltro('todos')}>Todos</button></div></div>
      ${lista === null ? html`<div class="card">Carregando…</div>` : l.length === 0 ? html`<div class="card vazio dim">Nenhum pedido.</div>` : l.map(p => html`<div key=${p.id}><div class="ped-cli" onClick=${() => abrirOS(p.osId)}><b>${p.cliente}</b> · ${p.osCod} ${p.ambiente}</div><${CartaoPedido} p=${p} sessao=${sessao} toast=${toast} pedirSenha=${(t, fn) => setConf({ t, fn })} /></div>`)}
      ${conf && html`<${SenhaMotivo} titulo=${conf.t} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${conf.fn} fechar=${() => setConf(null)} />`}
    </div>`;
}

/* ---------- Tempos da obra (por etapa) ---------- */
function temposOS(o) {
  const ini = o.contrato?.dataAssinatura && lerPrazo(o.contrato.dataAssinatura) ? lerPrazo(o.contrato.dataAssinatura).getTime() : Date.parse(o.criadoEm || '') || null;
  if (!ini) return null;
  const fim = osConcluida(o) ? (Date.parse((o.statusHist || []).slice().reverse().find(h => h.st === 'concluida')?.em || '') || Date.parse(o.atualizadoEm || '') || Date.now()) : Date.now();
  const hist = (o.statusHist || []).filter(h => h.em).map(h => ({ st: h.st, t: Date.parse(h.em) })).sort((a, b) => a.t - b.t);
  const seg = [];
  let atual = 'elaboracao', t0 = ini;
  for (const h of hist) { if (h.t > t0) seg.push({ st: atual, d: h.t - t0 }); atual = h.st; t0 = Math.max(t0, h.t); }
  if (atual !== 'concluida' && fim > t0) seg.push({ st: atual, d: fim - t0 });
  const porSt = {}; seg.forEach(x => { porSt[x.st] = (porSt[x.st] || 0) + x.d; });
  return { total: fim - ini, porSt, temHist: hist.length > 0 };
}
const dias = (ms) => { const d = ms / 86400000; return d < 1 ? Math.max(1, Math.round(ms / 3600000)) + 'h' : Math.round(d) + (Math.round(d) === 1 ? ' dia' : ' dias'); };
const COR_ST = { elaboracao: '#a8a29e', projetos: '#3b82f6', producao: '#0d9488', liberacao: '#f59e0b', montagem: '#7c3aed', concluida: '#16a34a' };
function BarraTempos({ o }) {
  const t = temposOS(o); if (!t) return null;
  const tot = Object.values(t.porSt).reduce((a, b) => a + b, 0) || 1;
  return html`<div class="tempos">
    <div class="tempos-top"><span>⏱ Obra: <b>${dias(t.total)}</b></span>${t.porSt.projetos ? html`<span>📐 Projeto: <b>${dias(t.porSt.projetos)}</b></span>` : ''}${t.porSt.producao ? html`<span>🏭 Produção: <b>${dias(t.porSt.producao)}</b></span>` : ''}</div>
    <div class="tempos-barra">${STATUS_OS.filter(s => t.porSt[s.v]).map(s => html`<i key=${s.v} title=${s.t + ': ' + dias(t.porSt[s.v])} style=${{ width: (t.porSt[s.v] / tot * 100) + '%', background: COR_ST[s.v] }}></i>`)}</div>
  </div>`;
}

/* ---------- Folha de pendências de finalização (PDF) ---------- */
async function montarFolha(sessao, oss) {
  const { getDocs, query, where } = F().fsMod;
  const out = [];
  for (const o of oss) {
    const d = await getDocs(col('empresas', sessao.empresaId, 'os', o.id, 'diario'));
    const pend = d.docs.map(x => x.data()).filter(x => x.tipo === 'pendencia' && !x.resolvida).sort((a, b) => String(a.em).localeCompare(String(b.em)));
    const pq = await getDocs(query(col('empresas', sessao.empresaId, 'pedidos'), where('osId', '==', o.id)));
    const peds = pq.docs.map(x => x.data()).filter(pedAberto);
    out.push({ o, pend, peds });
  }
  return out;
}
function ImpressaoFolha({ dados, empresa }) {
  const cli = dados[0]?.o.cliente?.nome || '';
  const cor = temCores(dados[0]?.o) ? dados[0].o.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const nP = dados.reduce((n, x) => n + x.pend.length + x.peds.length, 0);
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div class="row" style=${{ gap: '12px', flexWrap: 'nowrap' }}><${LogoImp} empresa=${empresa} /><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">Pendências de finalização</div><div class="po-sub">${cli} · ${dados.length} ${dados.length === 1 ? 'ambiente' : 'ambientes'}</div></div></div>
      <div class="po-num"><div class="po-cod">${nP}</div><div class="po-meta">itens em aberto · ${new Date().toLocaleDateString('pt-BR')}</div></div></div>
    ${dados.map(({ o, pend, peds }) => html`
      <div key=${o.id} class="po-amb">
        <div class="po-amb-t"><span>${numOS(o)}</span>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</div>
        ${pend.length + peds.length === 0 ? html`<div style=${{ padding: '6px 10px', color: '#16a34a' }}>✓ Sem pendências</div>` : html`
        <table><thead><tr><th style=${{ width: '28px' }}>✓</th><th>Pendência / pedido</th><th style=${{ width: '22%' }}>Registrado</th></tr></thead><tbody>
          ${pend.map((p, i) => html`<tr key=${'d' + i}><td><span class="caixa"></span></td><td>⚠ ${p.texto || '(foto)'}${(p.fotos || []).length ? html`<div class="folha-fotos">${p.fotos.slice(0, 3).map((f, j) => html`<img key=${j} src=${f} />`)}</div>` : ''}</td><td>${fmtData(p.em)} · ${p.quem}</td></tr>`)}
          ${peds.map((p, i) => html`<tr key=${'p' + i}><td><span class="caixa"></span></td><td>📦 ${resumoPed(p)}${p.obs ? ' — ' + p.obs : ''} <b>(${stPed(p)[1]})</b></td><td>${fmtData(p.em)} · ${p.quem}</td></tr>`)}
        </tbody></table>`}
      </div>`)}
    <div class="po-obs" style=${{ marginTop: '10px' }}><b>Observações da vistoria</b><div style=${{ height: '60px' }}></div></div>
    <div class="po-ass">${['Montador', 'Responsável técnico', 'Cliente'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · ${cli}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Folha de compras padrão (importada do PCP Dinabox) ---------- */
const PARC_PADRAO = [
  { nome: 'Laca Nobre', esp: 'Pintura / laca' }, { nome: 'Projetta', esp: 'Vidros' }, { nome: 'Adeblu', esp: 'Esquadrias e lâminas' },
  { nome: 'Pintura Ezequiel', esp: 'Pintura' }, { nome: 'Pintura Celso', esp: 'Pintura' }, { nome: 'Eduardo', esp: '' }, { nome: 'Marmoraria Itália', esp: 'Pedras' },
];
const CAT_COMPRA = ['Chapas', 'Lâminas', 'Fitas de borda', 'Ferragens', 'Puxadores', 'Perfis', 'Iluminação', 'Vidros', 'Pedras', 'Tecidos', 'Pintura', 'Acessórios', 'Químicos', 'Outros'];
const ICO_CAT = { 'Chapas': '🟫', 'Lâminas': '🌳', 'Fitas de borda': '🎞️', 'Ferragens': '🔩', 'Puxadores': '🔘', 'Perfis': '📏', 'Iluminação': '💡', 'Vidros': '🪟', 'Pedras': '🪨', 'Tecidos': '🧵', 'Pintura': '🎨', 'Acessórios': '🧩', 'Químicos': '🧪', 'Outros': '📦' };
/* Situação de cada item de compra */
const ST_COMPRA = [['orcar', 'Falta orçar', '#9ca3af'], ['orcando', 'Orçando', '#f59e0b'], ['aprovacao', 'Aguard. aprovação', '#ea580c'], ['pedido', 'Pedido feito', '#2563eb'], ['recebido', 'Recebido', '#16a34a']];
const stCompra = (i) => i.st || (i.recebido ? 'recebido' : i.comprado ? 'pedido' : (i.orcs || []).length ? 'orcando' : 'orcar');
const infoStC = (v) => ST_COMPRA.find(x => x[0] === v) || ST_COMPRA[0];
const ETAPA_C = { pre: '⚡ Pré-pedido', pedido: '📦 Pedido principal' };
const numBR = (v) => { if (typeof v === 'number') return isFinite(v) ? v : 0; const t = String(v ?? '').trim().replace(/[R$\s]/g, ''); if (!t) return 0; if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.')) || 0; if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, '')) || 0; return Number(t) || 0; };
/* Detalhe de um item: orçamentos, fornecedor escolhido, valor, previsão */
function ItemCompraModal({ item, parceiros, salvar, fechar }) {
  const [it, setIt] = useState({ orcs: [], ...item, st: stCompra(item) });
  const [o, setO] = useState({ forn: '', valor: '' });
  const melhor = (it.orcs || []).length ? it.orcs.reduce((a, b) => (numBR(b.valor) < numBR(a.valor) ? b : a)) : null;
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${ICO_CAT[it.categoria] || '📦'} ${it.descricao}</div><button class="x-btn" onClick=${fechar}>✕</button></div>
    <div class="dim">${[it.qtd && it.qtd + ' ' + (it.unidade || ''), it.marca, it.obs].filter(Boolean).join(' · ')}</div>
    <div class="st-trilho">${ST_COMPRA.map(([v, t, c]) => html`<button key=${v} class=${it.st === v ? 'on' : ''} style=${{ '--c': c }} onClick=${() => setIt({ ...it, st: v })}>${t}</button>`)}</div>
    <div class="row" style=${{ gap: '6px' }}><span class="lbl">Etapa</span>${Object.entries(ETAPA_C).map(([k, t]) => html`<button key=${k} class=${'pill' + ((it.etapa || 'pedido') === k ? ' on' : '')} onClick=${() => setIt({ ...it, etapa: k })}>${t}</button>`)}</div>
    <div class="sec-title" style=${{ fontSize: '14px' }}>💬 Orçamentos</div>
    ${(it.orcs || []).map((x, k) => html`<div key=${k} class=${'fl-i' + (melhor === x ? ' melhor' : '')}><span style=${{ flex: 1 }}>${x.forn}${melhor === x && it.orcs.length > 1 ? ' 🏆' : ''}</span><b>${brl(numBR(x.valor))}</b>
      <button class="btn btn-sm" onClick=${() => setIt({ ...it, parceiro: x.forn, valor: numBR(x.valor), st: ['orcar', 'orcando'].includes(it.st) ? 'aprovacao' : it.st })}>Escolher</button>
      <button class="x-btn" onClick=${() => setIt({ ...it, orcs: it.orcs.filter((_, j) => j !== k) })}>✕</button></div>`)}
    <div class="row" style=${{ gap: '5px', flexWrap: 'nowrap' }}>
      <input class="inp inp-sm" list="lista-parc" placeholder="Fornecedor" value=${o.forn} onInput=${e => setO({ ...o, forn: e.target.value })} />
      <input class="inp inp-sm" style=${{ width: '110px' }} inputmode="decimal" placeholder="R$ total" value=${o.valor} onInput=${e => setO({ ...o, valor: e.target.value })} />
      <button class="btn btn-sm btn-primary" onClick=${() => { if (!o.forn || !o.valor) return; setIt({ ...it, orcs: [...(it.orcs || []), { forn: o.forn.trim(), valor: numBR(o.valor), em: nowIso() }], st: it.st === 'orcar' ? 'orcando' : it.st }); setO({ forn: '', valor: '' }); }}>＋</button>
      <datalist id="lista-parc">${parceiros.map(p => html`<option key=${p.nome} value=${p.nome} />`)}</datalist>
    </div>
    <div class="grid2">
      <div class="field"><span class="lbl">Comprado com</span><input class="inp" list="lista-parc" value=${it.parceiro || ''} onInput=${e => setIt({ ...it, parceiro: e.target.value })} /></div>
      <div class="field"><span class="lbl">Valor (R$)</span><input class="inp" inputmode="decimal" value=${it.valor || ''} onInput=${e => setIt({ ...it, valor: e.target.value })} /></div>
      <div class="field"><span class="lbl">Previsão de entrega</span><input class="inp" type="date" value=${it.previsao || ''} onInput=${e => setIt({ ...it, previsao: e.target.value })} /></div>
      <div class="field"><span class="lbl">Nota fiscal</span><input class="inp" value=${it.nf || ''} onInput=${e => setIt({ ...it, nf: e.target.value })} /></div>
    </div>
    <button class="btn btn-grande btn-verde btn-block" onClick=${() => { const st = it.st; salvar({ ...it, valor: numBR(it.valor), comprado: st === 'pedido' || st === 'recebido', recebido: st === 'recebido', recebidoEm: st === 'recebido' ? (it.recebidoEm || nowIso()) : '', pedidoEm: ['pedido', 'recebido'].includes(st) ? (it.pedidoEm || nowIso()) : '' }); fechar(); }}>💾 Salvar item</button>
  </div></div>`, document.body);
}
/* ---------- Orçamentos de compra pelos parceiros (link + WhatsApp) ---------- */
const soNum = (t) => String(t || '').replace(/\D/g, '');
const linkWa = (num, txt) => { let n = soNum(num); if (n && !n.startsWith('55')) n = '55' + n; return 'https://wa.me/' + n + '?text=' + encodeURIComponent(txt); };
const linkCot = (id) => location.origin + '/orcamento.html?c=' + id;
function OrcamentosOS({ sessao, os, toast, itens, parceiros }) {
  const [cots, setCots] = useState([]), [resp, setResp] = useState({}), [novo, setNovo] = useState(false);
  useEffect(() => { const M = F().fsMod; return M.onSnapshot(M.query(M.collection(F().db, 'cotacoes'), M.where('empresaId', '==', sessao.empresaId), M.where('osId', '==', os.id)), s => setCots(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}); }, [os.id]);
  useEffect(() => { const M = F().fsMod; const us = cots.map(c => M.onSnapshot(M.collection(F().db, 'cotacoes', c.id, 'respostas'), s => setResp(r => ({ ...r, [c.id]: s.docs.map(d => ({ id: d.id, ...d.data() })) })), () => {})); return () => us.forEach(u => u()); }, [cots.map(c => c.id).join()]);
  const voltaram = cots.filter(c => (resp[c.id] || []).length), faltam = cots.filter(c => !(resp[c.id] || []).length);
  const verPdf = (r) => { if (!r.pdf) return; const b = atob(r.pdf.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); window.open(URL.createObjectURL(new Blob([a], { type: r.pdf.slice(5, r.pdf.indexOf(';')) })), '_blank'); };
  const avisar = (c) => window.open(linkWa(c.whats, 'Olá ' + c.parceiro + '! Para a OS ' + c.osCod + ' já recebemos ' + voltaram.length + ' orçamento(s). Aguardamos o seu: ' + linkCot(c.id)), '_blank');
  return html`<div class="card stack orc-card">
    <div class="row" style=${{ justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}><b>💬 Orçamentos dos parceiros ${cots.length ? html`<span class="chip">${voltaram.length}/${cots.length} retornaram</span>` : ''}</b>
      <button class="btn btn-sm btn-verde" disabled=${!itens.length} onClick=${() => setNovo(true)}>📤 Pedir orçamento no WhatsApp</button></div>
    ${!cots.length ? html`<small class="dim">Monte a lista de materiais abaixo e toque em "Pedir orçamento" para mandar o link aos parceiros. Eles anexam o PDF no próprio link e ele cai aqui.</small>` : html`<div class="orc-lista">
      ${cots.map(c => { const rs = resp[c.id] || []; return html`<div key=${c.id} class=${'orc-p' + (rs.length ? ' ok' : '')}>
        <div class="row" style=${{ justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}><b>${rs.length ? '✅' : '⏳'} ${c.parceiro}</b><span class="row" style=${{ gap: '4px' }}>
          ${!rs.length && html`<button class="btn btn-sm" onClick=${() => avisar(c)}>📣 Cobrar</button>`}
          <button class="btn btn-sm btn-ghost" title="Copiar link" onClick=${() => { navigator.clipboard?.writeText(linkCot(c.id)); toast('Link copiado.', 'ok'); }}>🔗</button></span></div>
        ${rs.map(r => html`<div key=${r.id} class="orc-r"><span>${r.valor ? html`<b>R$ ${r.valor}</b> · ` : ''}${r.condicoes}${r.prazo ? ' · ' + r.prazo : ''}</span>${r.pdf && html`<button class="btn btn-sm btn-primary" onClick=${() => verPdf(r)}>📄 Ver PDF</button>`}<small class="dim">${fmtData(r.em)}</small>${r.obs && html`<div class="dim" style=${{ width: '100%' }}>${r.obs}</div>`}</div>`)}
      </div>`; })}</div>
      ${faltam.length > 0 && voltaram.length > 0 && html`<button class="btn btn-sm" style=${{ alignSelf: 'flex-start' }} onClick=${() => faltam.forEach((c, i) => setTimeout(() => avisar(c), i * 900))}>📣 Avisar os ${faltam.length} que faltam: "já recebemos ${voltaram.length} orçamento(s)"</button>`}`}
    ${novo && html`<${PedirOrcamento} sessao=${sessao} os=${os} itens=${itens} parceiros=${parceiros} toast=${toast} fechar=${() => setNovo(false)} />`}
  </div>`;
}
function PedirOrcamento({ sessao, os, itens, parceiros, toast, fechar }) {
  const lista = (parceiros || []).filter(p => p.nome);
  const [sel, setSel] = useState([]), [prazo, setPrazo] = useState(''), [obs, setObs] = useState(''), [criados, setCriados] = useState(null), [rod, setRod] = useState(false);
  const comprar = itens.filter(i => i.origem !== 'estoque' && !i.comprado);
  const [envi, setEnvi] = useState({});
  const abrirWa = (c, w) => { const u = linkWa(c.whats, msg(c)); if (w && !w.closed) w.location.href = u; else window.open(u, '_blank'); setEnvi(e => ({ ...e, [c.id]: true })); };
  const criar = async () => { if (!sel.length) return toast('Escolha ao menos um parceiro.'); setRod(true);
    const temW = sel.some(n => lista.find(x => x.nome === n)?.whats); let w = null; try { if (temW) w = window.open('', '_blank'); if (w) w.document.write('<p style="font:16px sans-serif;padding:20px">Abrindo WhatsApp…</p>'); } catch {}
    try { const M = F().fsMod; const out = [];
      for (const nome of sel) { const p = lista.find(x => x.nome === nome); const id = rand(10) + rand(10);
        await M.setDoc(M.doc(F().db, 'cotacoes', id), { empresaId: sessao.empresaId, empresaNome: sessao.empresaNome || '', osId: os.id, osCod: numOS(os), titulo: nomePadrao((os.ambientes || []).map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo) || 'Materiais', parceiro: nome, whats: p?.whats || '', itens: comprar.map(i => ({ descricao: i.descricao, qtd: String(i.qtd || ''), unidade: i.unidade || '', categoria: i.categoria || 'Outros' })), prazoResposta: prazo, obs, criadoPor: sessao.nome, em: nowIso() });
        out.push({ id, nome, whats: p?.whats || '' }); }
      registrar(sessao, os.id, '💬', 'Orçamento pedido a ' + sel.join(', '), ''); setCriados(out);
      const pri = out.find(c => c.whats); if (pri) abrirWa(pri, w); else if (w) w.close();
    } catch (e) { if (w) w.close(); toast('Não criou: ' + e.message, 'erro'); } setRod(false); };
  const msg = (c) => 'Olá ' + c.nome + '! Segue a lista de materiais para orçamento (OS ' + numOS(os) + ').' + (prazo ? ' Precisamos até ' + prazo.split('-').reverse().join('/') + '.' : '') + ' Abra o link, confira e anexe o PDF do orçamento com as condições de pagamento: ' + linkCot(c.id);
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">📤 Pedir orçamento · ${numOS(os)}</div><button class="x-btn" onClick=${fechar}>✕</button></div>
    ${criados ? html`<div class="stack">${(() => { const prox = criados.find(c => c.whats && !envi[c.id]); return prox ? html`<button class="btn btn-verde" style=${{ fontSize: '17px', padding: '14px' }} onClick=${() => abrirWa(prox)}>📲 Enviar para o próximo: ${prox.nome}</button>` : html`<div class="ok-box" style=${{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '10px', fontWeight: 700, color: '#166534' }}>✅ WhatsApp aberto para todos. É só tocar em Enviar em cada conversa.</div>`; })()}
      <small class="dim">O WhatsApp abre com a mensagem e o link prontos — toque em Enviar lá.</small>
      ${criados.map(c => html`<div key=${c.id} class="row" style=${{ gap: '6px', alignItems: 'center' }}><b style=${{ flex: 1 }}>${c.nome}</b>${c.whats ? html`<a class="btn btn-verde" target="_blank" rel="noopener" href=${linkWa(c.whats, msg(c))} onClick=${() => setEnvi(e => ({ ...e, [c.id]: true }))}>${envi[c.id] ? '✓ Aberto' : '📲 Abrir'}</a>` : html`<button class="btn" onClick=${() => { navigator.clipboard?.writeText(msg(c)); toast('Mensagem copiada (parceiro sem WhatsApp cadastrado).', 'ok'); }}>📋 Copiar mensagem</button>`}</div>`)}
      <button class="btn" onClick=${fechar}>Pronto</button></div>`
    : html`<small class="dim">${comprar.length} itens a comprar vão no link. Escolha os parceiros (cadastre o WhatsApp em Compras → 🏢 Parceiros).</small>
      <div class="orc-sel">${lista.map(p => { const on = sel.includes(p.nome); return html`<button key=${p.nome} class=${'sug-pessoa' + (on ? ' on' : '')} onClick=${() => setSel(on ? sel.filter(x => x !== p.nome) : [...sel, p.nome])}>${on ? '✓ ' : ''}${p.nome}${p.whats ? ' 📲' : ''}</button>`; })}</div>
      <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}><div class="field" style=${{ flex: 1 }}><span class="lbl">Responder até</span><input class="inp" type="date" value=${prazo} onInput=${e => setPrazo(e.target.value)} /></div></div>
      <div class="field"><span class="lbl">Observação para o parceiro</span><input class="inp" value=${obs} onInput=${e => setObs(e.target.value)} placeholder="Ex: entrega na fábrica, cotar com frete" /></div>
      <button class="btn btn-primary" disabled=${rod} onClick=${criar}>${rod ? 'Criando…' : '📲 Gerar e enviar (' + sel.length + ')'}</button>`}
  </div></div>`, document.body);
}
/* Aviso global: cada orçamento que chega gera alerta "já recebeu N orçamento(s)" */
function AvisoOrcamentos({ sessao, toast }) {
  useEffect(() => { const M = F().fsMod; const subs = {}; let primeira = true; const vistos = (() => { try { return new Set(JSON.parse(localStorage.getItem('osm_orc_vistos') || '[]')); } catch { return new Set(); } })();
    const salvarV = () => { try { localStorage.setItem('osm_orc_vistos', JSON.stringify([...vistos].slice(-500))); } catch {} };
    const porOS = {};
    const u = M.onSnapshot(M.query(M.collection(F().db, 'cotacoes'), M.where('empresaId', '==', sessao.empresaId)), s => {
      s.docs.forEach(d => { if (subs[d.id]) return; const c = d.data();
        subs[d.id] = M.onSnapshot(M.collection(F().db, 'cotacoes', d.id, 'respostas'), rs => { rs.docs.forEach(r => { const k = d.id + '/' + r.id; (porOS[c.osId] = porOS[c.osId] || new Set()).add(k);
          if (vistos.has(k)) return; vistos.add(k); salvarV(); const n = porOS[c.osId].size; const txt = '📩 OS ' + c.osCod + ': orçamento de ' + c.parceiro + ' chegou — já recebeu ' + n + ' orçamento' + (n > 1 ? 's' : '') + '.';
          toast(txt, 'ok'); try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Gestão Pró — orçamento recebido', { body: txt, tag: k }); } catch {} }); }, () => {}); }); }, () => {});
    return () => { u(); Object.values(subs).forEach(f => f()); }; }, []);
  return null;
}
function ComprasOS({ sessao, os, toast, soNota }) {
  const [doc, setDoc] = useState(undefined);
  const [lendo, setLendo] = useState('');
  const [prev, setPrev] = useState(null);
  const [novo, setNovo] = useState({ categoria: 'Ferragens', descricao: '', qtd: '', unidade: 'un' });
  const [imprimir, setImprimir] = useState(false);
  const [modo, setModo] = useState('folha');
  const [escolher, setEscolher] = useState(null); // {ids:[...]} para escolher parceiro
  const [itemAb, setItemAb] = useState(null);
  const inpDet = useRef(null);
  const [parceiros, setParceiros] = useState([]);
  const [novoParc, setNovoParc] = useState('');
  const inp = useRef(null);
  const ref = docRef('empresas', sessao.empresaId, 'compras', os.id);
  const [cfgE, setCfgE] = useState({});
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId), d => { setParceiros(d.data()?.parceirosLista || PARC_PADRAO); setCfgE(d.data() || {}); }, () => {}), []);
  const [nfOS, setNfOS] = useState(null);
  const inpNfOS = useRef(null);
  const lerNfOS = async (file) => {
    if (!file) return; setLendo('Lendo a nota…');
    try {
      const r = await extrairArquivo(file); const cats = catsEmpresa(cfgE), regras = cfgE.regrasCategoria || [];
      const res = await chamarIA('nota_fiscal', { texto: r.texto, temImagens: (r.imagens || []).length > 0, categorias: cats, exemplos: regras.slice(-120), empresa: sessao.empresaNome || '' }, r.imagens || []);
      const linhas = (res.itens || []).map(arrumarLinhaNF).map(li => { let best = '', sc = 0; itens.forEach(i => { const p = parecido(li.descricao, i.descricao); if (p > sc) { sc = p; best = i.id; } }); return { ...li, categoria: categoriaPorRegra(regras, li.descricao) || (cats.includes(li.categoria) ? li.categoria : 'Outros'), osId: os.id, itemId: sc >= 0.5 ? best : '' }; });
      setNfOS({ arquivo: file.name, ...fornecedorDaNota(res, sessao, cfgE), numero: res.numero || '', data: res.data || isoD(new Date()), total: numBR(res.total), totalProdutos: numBR(res.totalProdutos), linhas, pg: pgNovo() });
    } catch (e2) { toast('Não li a nota: ' + e2.message, 'erro'); }
    setLendo('');
  };
  const confirmarNfOS = async () => {
    const nf = nfOS; let lista = [...itens];
    nf.linhas.forEach(l => { const v = numBR(l.valorTotal); const k = lista.findIndex(x => x.id === l.itemId);
      const base = { st: 'recebido', recebido: true, comprado: true, recebidoEm: nowIso(), parceiro: nf.fornecedor, nf: nf.numero, valorUnit: numBR(l.valorUnit) };
      if (k >= 0) lista[k] = { ...lista[k], ...base, valor: v }; else lista.push({ id: rand(6), categoria: l.categoria || 'Outros', descricao: l.descricao, qtd: l.qtd, unidade: l.unidade, valor: v, ...base }); });
    try {
      await gravar(lista, { __log: 'Nota fiscal ' + nf.numero + ' — ' + nf.fornecedor + ' (' + nf.linhas.length + ' itens · ' + brl(nf.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0)) + ')' });
      const { pg, ...nfD } = nf; const tot = numBR(nf.total) || nf.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0);
      const rn = await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'notas'), { ...nfD, osId: os.id, osCod: numOS(os), pagamento: pg.lancar ? { forma: pg.forma, parcelas: pg.parcelas, venc: pg.venc } : null, criadoEm: nowIso(), por: sessao.nome });
      await lancarPagamentoOS(sessao, os, { descricao: 'NF ' + (nf.numero || 's/n') + ' — ' + nf.fornecedor, categoria: 'Material (NF)', total: tot, notaId: rn.id, nf: nf.numero || '' }, pg);
      const mp = mesclarParceiro(parceiros, nf); const regras = cfgE.regrasCategoria || [];
      const nr = [...regras.filter(r => !nf.linhas.some(l => norm(l.descricao) === norm(r.d))), ...nf.linhas.map(l => ({ d: l.descricao, c: l.categoria }))].slice(-600);
      await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: mp.lista, regrasCategoria: nr });
      toast('Nota lançada nesta OS · preços atualizados.', 'ok'); setNfOS(null);
    } catch (e2) { toast('Não salvou: ' + e2.message, 'erro'); }
  };
  const salvarParceiros = async (l) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: l }); } catch (e) { toast(e.message, 'erro'); } };
  useEffect(() => F().fsMod.onSnapshot(ref, d => setDoc(d.exists() ? d.data() : null), () => setDoc(null)), [os.id]);
  const itens = doc?.itens || [];
  const gravar = async (novos, extra = {}) => { if (extra.__log) { registrar(sessao, os.id, '🛒', extra.__log); delete extra.__log; } try { await F().fsMod.setDoc(ref, { osId: os.id, osCod: numOS(os), cliente: os.cliente?.nome || '', itens: novos, atualizadoEm: nowIso(), atualizadoPor: sessao.nome, ...extra }, { merge: true }); } catch (e) { toast(e.message, 'erro'); } };
  const importar = async (file) => {
    if (!file) return;
    try {
      setLendo('Lendo ' + file.name + '…');
      const r = await extrairArquivo(file);
      setLendo('A IA está montando a folha…');
      const det = importar.det; importar.det = false;
      const res = await chamarIA(det ? 'levantar_materiais' : 'compras_dinabox', { texto: r.texto, temImagens: (r.imagens || []).length > 0 }, r.imagens || []);
      setPrev({ arquivo: file.name, det, itens: (res.itens || []).map(i => ({ ...i, etapa: i.etapa === 'pre' ? 'pre' : 'pedido', categoria: CAT_COMPRA.includes(i.categoria) ? i.categoria : 'Outros', ok: true })) });
    } catch (e) { toast('Não importou: ' + e.message, 'erro'); }
    setLendo('');
  };
  const confirmar = async () => {
    const add = prev.itens.filter(i => i.ok).map(({ ok, motivo, ...i }) => ({ ...i, id: rand(6), comprado: false }));
    await gravar([...itens, ...add], { origem: prev.contrato ? (doc?.origem || 'Contrato') : (prev.det ? 'Detalhamento · ' : 'Dinabox PCP · ') + prev.arquivo, __log: (prev.contrato ? 'Itens do contrato que faltavam na lista (' : prev.det ? 'Levantamento de materiais do detalhamento (' : 'Folha de compras importada (') + add.length + ' itens)' });
    toast(add.length + ' itens na folha de compras.', 'ok'); setPrev(null);
  };
  const marcarSt = null;
  const marcar = async (id) => { const it = itens.find(i => i.id === id); let mot = ''; if (it?.comprado) { mot = await pedirMotivo('Desmarcar compra', 'Este item já estava comprado. Informe o motivo.'); if (!mot) return; } registrar(sessao, os.id, it?.comprado ? '↺' : '🛒', (it?.comprado ? 'Compra desmarcada: ' : 'Comprado: ') + (it?.descricao || '') + (it?.parceiro ? ' · ' + it.parceiro : ''), mot); return gravar(itens.map(i => i.id === id ? { ...i, st: !i.comprado ? 'pedido' : 'orcar', recebido: false, comprado: !i.comprado, compradoPor: !i.comprado ? sessao.nome : '', compradoEm: !i.comprado ? nowIso() : '' } : i)); };
  const remover = (id) => gravar(itens.filter(i => i.id !== id));
  const mudar = (id, patch) => gravar(itens.map(i => i.id === id ? { ...i, ...patch } : i));
  const receber = async (i) => { let mot = ''; if (i.recebido) { mot = await pedirMotivo('Desmarcar recebido', i.descricao); if (!mot) return; }
    registrar(sessao, os.id, i.recebido ? '↺' : '📦', (i.recebido ? 'Recebimento desfeito: ' : i.origem === 'estoque' ? 'Separado do estoque: ' : 'Recebido: ') + i.descricao + (i.parceiro && i.origem !== 'estoque' ? ' · ' + i.parceiro : ''), mot);
    mudar(i.id, i.recebido ? { recebido: false, st: i.comprado ? 'pedido' : 'orcar', recebidoEm: '' } : { recebido: true, comprado: true, st: 'recebido', recebidoEm: nowIso(), recebidoPor: sessao.nome }); };
  const hojeC = isoD(new Date());
  const folhaPadrao = () => { const cats = [...new Set([...CAT_COMPRA, ...itens.map(i => i.categoria || 'Outros')])].map(c => [c, itens.filter(i => (i.categoria || 'Outros') === c)]).filter(([, l]) => l.length);
    const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
    return html`<div class="po po2 oe fc-lista" style=${varsCores(cor)}>
      <div class="po-topo"><div><div class="po-emp">${sessao.empresaNome || 'Gestão Pró'} · Lista de materiais</div>
        <div class="po-tit">${nomePadrao((os.ambientes || []).map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo) || 'Materiais'}</div>
        <div class="po-sub"><b>${nomePadrao(os.cliente?.nome) || ''}</b>${(os.cliente?.enderecoMontagem || os.cliente?.endereco) ? ' · 📍 ' + (os.cliente.enderecoMontagem || os.cliente.endereco) : ''}</div></div>
        <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">${itens.length} itens · ${itens.filter(i => i.recebido).length} recebidos</div></div></div>
      ${!itens.length ? html`<div class="vazio dim">Nenhum item ainda — use 📐 Levantar do detalhamento, 📥 Dinabox, 📑 Conferir com o contrato, ou adicione abaixo.</div>` : cats.map(([c, l]) => html`<div key=${c} class="po2-amb">
        <div class="po2-amb-t"><b>${ICO_CAT[c] || '📦'} ${c}</b><em>${l.length} itens</em></div>
        ${l.map(i => html`<div key=${i.id} class=${'oe-movel fc-it' + (i.recebido ? ' ok' : '')}>
          <div class="oe-mt"><button class=${'oe-box fc-ck' + (i.recebido ? ' on' : '')} title="Marcar recebido" onClick=${() => receber(i)}>${i.recebido ? '✓' : ''}</button>
            <b style=${{ cursor: 'pointer' }} onClick=${() => setItemAb(i)}>${i.descricao}</b><em>${i.qtd} ${i.unidade || ''}</em></div>
          ${(i.codigo || i.marca || i.obs) ? html`<div class="oe-itens"><div class="oe-it">${[i.codigo, i.marca, i.obs].filter(Boolean).join(' · ')}</div></div>` : ''}
        </div>`)}</div>`)}
      <div class="po-ass">${['Separado / conferido', 'Recebido na fábrica'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    </div>`; };
  const grupos = modo === 'parceiro'
    ? [...new Set(itens.map(i => i.parceiro || ''))].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b)).map(p => [p || 'Sem parceiro definido', itens.filter(i => (i.parceiro || '') === p), p])
    : modo === 'etapa' ? [['⚡ Pré-pedido (comprar já)', itens.filter(i => i.etapa === 'pre')], ['📦 Pedido principal', itens.filter(i => i.etapa !== 'pre')]].filter(([, l]) => l.length)
    : [...new Set([...CAT_COMPRA, ...itens.map(i => i.categoria || 'Outros')])].map(c => [c, itens.filter(i => (i.categoria || 'Outros') === c)]).filter(([, l]) => l.length);
  const feitos = itens.filter(i => i.comprado).length;
  const blocoNF = html`
    <button class="btn btn-grande btn-verde btn-block" disabled=${!!lendo} onClick=${() => inpNfOS.current?.click()}>🧾 Lançar nota fiscal desta OS (recebimento + preços)</button>
    <input ref=${inpNfOS} type="file" hidden accept=".pdf,.xml,.txt,image/*" onChange=${e => { lerNfOS(e.target.files[0]); e.target.value = ''; }} />
    ${nfOS && ReactDOM.createPortal(html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(820px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🧾 NF ${nfOS.numero} → OS ${numOS(os)}</div><button class="x-btn" onClick=${() => setNfOS(null)}>✕</button></div>
      <div class="field"><span class="lbl">Fornecedor (quem vendeu)</span><input class="inp" value=${nfOS.fornecedor} onInput=${e => setNfOS({ ...nfOS, fornecedor: e.target.value, suspeito: false })} /></div>
      ${nfOS.suspeito && html`<div class="error-box">⚠️ Esse nome parece ser a sua própria empresa. Troque pelo nome do fornecedor.</div>`}
      <div class="dim">Confira quantidade e total de cada item (o preço unitário é calculado sozinho) e a qual material da lista ele corresponde.</div>
      <div class="nf-linhas">${nfOS.linhas.map((l, k) => html`<div key=${k} class="nf-l">
        <div><b>${l.descricao}</b>
          <div class="row" style=${{ gap: '4px', flexWrap: 'nowrap', alignItems: 'center' }}>
            <input class="inp inp-sm" style=${{ width: '70px' }} inputmode="decimal" value=${l.qtd} onChange=${e => setNfOS({ ...nfOS, linhas: nfOS.linhas.map((x, j) => j === k ? arrumarLinhaNF({ ...x, qtd: e.target.value, valorUnit: 0 }) : x) })} /><small>${l.unidade || ''} ×</small><b>${brl(numBR(l.valorUnit))}</b><small>=</small>
            <input class="inp inp-sm" style=${{ width: '100px' }} inputmode="decimal" value=${numBR(l.valorTotal).toFixed(2).replace('.', ',')} onChange=${e => setNfOS({ ...nfOS, linhas: nfOS.linhas.map((x, j) => j === k ? arrumarLinhaNF({ ...x, valorTotal: e.target.value, valorUnit: 0 }) : x) })} /></div></div>
        <select class="inp inp-sm" value=${l.itemId} onChange=${e => setNfOS({ ...nfOS, linhas: nfOS.linhas.map((x, j) => j === k ? { ...x, itemId: e.target.value } : x) })}><option value="">➕ novo item na lista</option>${itens.map(i => html`<option key=${i.id} value=${i.id}>${i.descricao}</option>`)}</select>
      </div>`)}</div>
      <div>Soma dos itens: <b>${brl(nfOS.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0))}</b> · total da nota ${brl(nfOS.total)}</div>
      <${PagamentoBox} pg=${nfOS.pg} setPg=${pg => setNfOS({ ...nfOS, pg })} total=${numBR(nfOS.total) || nfOS.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0)} />
      <button class="btn btn-grande btn-verde btn-block" onClick=${() => { if (!nfOS.pg.forma) return toast('Escolha a forma de pagamento.'); confirmarNfOS(); }}>💾 Lançar nota</button>
    </div></div>`, document.body)}
  `;
  if (soNota) return blocoNF;
  if (prev) return html`
    <div class="sheet-t">📥 Conferir importação</div>
    <div class="dim">${prev.arquivo} · ${prev.itens.length} itens encontrados. Desmarque o que não for comprar.</div>
    <div class="compras-lista">${prev.itens.map((i, k) => html`<label key=${k} class=${'compra-i' + (i.ok ? '' : ' off')}><input type="checkbox" checked=${i.ok} onChange=${e => setPrev(p => ({ ...p, itens: p.itens.map((x, j) => j === k ? { ...x, ok: e.target.checked } : x) }))} />
      <span>${ICO_CAT[i.categoria]}</span><span class="grow"><b>${i.etapa === 'pre' ? '⚡ ' : ''}${i.descricao}</b><small>${[i.codigo, i.marca, i.categoria, i.ambiente, i.etapa === 'pre' ? 'PRÉ-PEDIDO' : ''].filter(Boolean).join(' · ')}</small></span><b class="compra-q">${i.qtd} ${i.unidade || ''}</b></label>`)}</div>
    <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setPrev(null)}>Cancelar</button><button class="btn btn-verde" style=${{ flex: 1 }} onClick=${confirmar}>✓ Colocar ${prev.itens.filter(i => i.ok).length} itens na folha</button></div>`;
  return html`
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sheet-t">🛒 Folha de compras</div>
      ${html`<button class="btn btn-sm" onClick=${() => { setImprimir(true); setTimeout(() => { window.print(); setImprimir(false); }, 300); }}>🖨 Imprimir folha padrão</button>`}</div>
    <div class="grid2">
      <button class="btn btn-grande" disabled=${!!lendo} onClick=${() => { importar.det = true; inp.current?.click(); }}>${lendo && importar.det !== false ? lendo : '📐 Levantar do detalhamento do arquiteto'}</button>
      <button class="btn btn-grande" disabled=${!!lendo} onClick=${() => { importar.det = false; inp.current?.click(); }}>📥 Importar folha do PCP (Dinabox)</button>
    </div>
    <input ref=${inp} type="file" hidden accept=".pdf,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { importar(e.target.files[0]); e.target.value = ''; }} />
    ${blocoNF}
    <button class="btn btn-grande btn-block" disabled=${!!lendo} onClick=${async () => {
      setLendo('Conferindo com o contrato…');
      try {
        const { fingerprint, ...dadosOS } = os;
        const res = await chamarIA('conferir_compras', { os: JSON.stringify({ cliente: dadosOS.cliente, padrao: dadosOS.padrao, ambientes: dadosOS.ambientes, observacoesGerais: dadosOS.observacoesGerais, contrato: dadosOS.contrato }), lista: itens.map(i => '- ' + [i.categoria, i.descricao, i.marca, i.qtd].filter(Boolean).join(' | ')).join('\n'), categorias: CAT_COMPRA });
        const f = (res.faltando || []).map(i => ({ ...i, etapa: i.etapa === 'pre' ? 'pre' : 'pedido', categoria: i.categoria || 'Outros', origem: 'contrato', obs: i.motivo || '', ok: true }));
        if (!f.length) toast('✓ Tudo que está no contrato já está na lista de compras.', 'ok'); else setPrev({ arquivo: 'Conferência com o contrato', det: true, contrato: true, itens: f });
      } catch (e) { toast('Não consegui conferir: ' + e.message, 'erro'); }
      setLendo('');
    }}>📑 Conferir com o contrato (achar o que falta na lista)</button>
    <small class="dim">O detalhamento do arquiteto já separa o que é <b>⚡ pré-pedido</b> (lâminas, Blum, itens sem pronta entrega). A folha do Dinabox traz o pedido grosso (chapas, fitas, ferragens).</small>
    ${itens.length > 0 && html`<div class="st-resumo">${ST_COMPRA.map(([v, t, c]) => { const n = itens.filter(i => stCompra(i) === v).length; return n ? html`<span key=${v} style=${{ background: c }}>${t}: ${n}</span>` : null; })}<span style=${{ background: '#1f2937' }}>Total: ${brl(itens.reduce((n, i) => n + numBR(i.valor), 0))}</span></div>`}
    ${doc === undefined ? html`<div class="dim">Carregando…</div>` : itens.length === 0 ? html`<div class="sheet-t" style=${{ fontSize: '15px' }}>📋 Folha de compras padrão</div>${folhaPadrao()}` : html`
      <div class="compras-prog"><i style=${{ width: (feitos / itens.length * 100) + '%' }}></i><span>${feitos}/${itens.length} comprados · ${itens.filter(i => i.recebido).length} recebidos · ${itens.filter(i => i.origem === 'estoque').length} do estoque</span></div>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <div class="seg-mini"><button class=${modo === 'folha' ? 'on' : ''} onClick=${() => setModo('folha')}>📋 Folha padrão</button><button class=${modo === 'etapa' ? 'on' : ''} onClick=${() => setModo('etapa')}>Por etapa</button><button class=${modo === 'categoria' ? 'on' : ''} onClick=${() => setModo('categoria')}>Por categoria</button><button class=${modo === 'parceiro' ? 'on' : ''} onClick=${() => setModo('parceiro')}>🤝 Por parceiro</button></div>
      </div>
      ${modo === 'folha' ? html`<${OrcamentosOS} sessao=${sessao} os=${os} toast=${toast} itens=${itens} parceiros=${parceiros} /><${MateriaisDinabox} sessao=${sessao} os=${os} toast=${toast} itens=${itens} gravar=${gravar} />${folhaPadrao()}` : grupos.map(([c, l, parcNome]) => html`<div key=${c}><div class="compra-cat row" style=${{ justifyContent: 'space-between' }}><span>${modo === 'parceiro' ? (parcNome ? '🤝' : '❔') : ICO_CAT[c]} ${c} <small>${l.filter(i => i.comprado).length}/${l.length}</small></span>
          <span class="row" style=${{ gap: '4px' }}>
            <button class="btn btn-sm btn-ghost" onClick=${() => setEscolher({ ids: l.map(i => i.id) })}>🤝 ${modo === 'parceiro' ? 'Trocar' : 'Parceiro p/ todos'}</button>
            ${modo === 'parceiro' && parcNome && html`<button class="btn btn-sm" onClick=${() => { setImprimir(parcNome); setTimeout(() => { window.print(); setImprimir(false); }, 300); }}>🖨 Pedido p/ ${parcNome}</button>`}
          </span></div>
        <div class="compras-lista">${l.map(i => html`<div key=${i.id} class=${'compra-i' + (i.comprado ? ' feito' : '')}>
          <button class="compra-ck" onClick=${() => marcar(i.id)}>${i.comprado ? '✓' : ''}</button>
          <span class="grow" style=${{ cursor: 'pointer' }} onClick=${() => setItemAb(i)}><b>${i.etapa === 'pre' ? '⚡ ' : ''}${i.origem === 'contrato' ? '📑 ' : ''}${i.descricao}</b><small>${[i.codigo, i.marca, i.obs, i.previsao && stCompra(i) === 'pedido' ? '🚚 ' + dm(i.previsao) : '', (i.orcs || []).length ? (i.orcs.length + ' orç.') : ''].filter(Boolean).join(' · ')}</small>
            <span class="st-chip" style=${{ background: infoStC(stCompra(i))[2] }}>${infoStC(stCompra(i))[1]}${i.valor ? ' · ' + brl(numBR(i.valor)) : ''}</span></span>
          <button class=${'parc-chip' + (i.parceiro ? ' tem' : '')} onClick=${() => setEscolher({ ids: [i.id] })}>${i.parceiro ? '🤝 ' + i.parceiro : '＋ parceiro'}</button>
          <b class="compra-q">${i.qtd} ${i.unidade || ''}</b><button class="x-btn" onClick=${() => remover(i.id)}>✕</button></div>`)}</div></div>`)}`}
    <div class="compra-add">
      <select class="inp inp-sm" value=${novo.categoria} onChange=${e => setNovo({ ...novo, categoria: e.target.value })}>${CAT_COMPRA.map(c => html`<option key=${c}>${c}</option>`)}</select>
      <input class="inp inp-sm" placeholder="Item" value=${novo.descricao} onInput=${e => setNovo({ ...novo, descricao: e.target.value })} />
      <input class="inp inp-sm" placeholder="Qtd" style=${{ width: '60px' }} value=${novo.qtd} onInput=${e => setNovo({ ...novo, qtd: e.target.value })} />
      <button class="btn btn-sm btn-primary" onClick=${() => { if (!novo.descricao) return; gravar([...itens, { ...novo, id: rand(6), comprado: false }]); setNovo({ ...novo, descricao: '', qtd: '' }); }}>＋</button>
    </div>
    ${escolher && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setEscolher(null)}>
      <div class="card modal-caixa stack">
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🤝 Comprar de qual parceiro? <small class="dim">(${escolher.ids.length} ${escolher.ids.length === 1 ? 'item' : 'itens'})</small></div><button class="x-btn" onClick=${() => setEscolher(null)}>✕</button></div>
        <div class="parc-grade">
          ${parceiros.map((pa, k) => html`<button key=${k} class="parc-op" onClick=${() => { registrar(sessao, os.id, '🤝', 'Compra com parceiro: ' + pa.nome, itens.filter(i => escolher.ids.includes(i.id)).map(i => i.descricao).join(', ').slice(0, 160)); gravar(itens.map(i => escolher.ids.includes(i.id) ? { ...i, parceiro: pa.nome } : i)); setEscolher(null); }}><b>${pa.nome}</b><small>${pa.esp || ''}</small></button>`)}
          <button class="parc-op sem" onClick=${() => { gravar(itens.map(i => escolher.ids.includes(i.id) ? { ...i, parceiro: '' } : i)); setEscolher(null); }}><b>Nenhum</b><small>limpar</small></button>
        </div>
        <div class="row" style=${{ gap: '5px', flexWrap: 'nowrap' }}><input class="inp inp-sm" placeholder="Novo parceiro / fornecedor" value=${novoParc} onInput=${e => setNovoParc(e.target.value)} />
          <button class="btn btn-sm btn-primary" onClick=${() => { const n = novoParc.trim(); if (!n) return; salvarParceiros([...parceiros, { nome: n, esp: '' }]); setNovoParc(''); }}>＋ Cadastrar</button></div>
        <details><summary class="dim">Gerenciar lista de parceiros</summary>
          ${parceiros.map((pa, k) => html`<div key=${k} class="row" style=${{ gap: '5px', flexWrap: 'nowrap', marginTop: '4px' }}>
            <input class="inp inp-sm" value=${pa.nome} onChange=${e => salvarParceiros(parceiros.map((x, j) => j === k ? { ...x, nome: e.target.value } : x))} />
            <input class="inp inp-sm" placeholder="Especialidade" value=${pa.esp || ''} onChange=${e => salvarParceiros(parceiros.map((x, j) => j === k ? { ...x, esp: e.target.value } : x))} />
            <button class="x-btn" onClick=${() => salvarParceiros(parceiros.filter((_, j) => j !== k))}>✕</button></div>`)}
        </details>
      </div></div>`, document.body)}
    ${itemAb && html`<${ItemCompraModal} item=${itemAb} parceiros=${parceiros} fechar=${() => setItemAb(null)} salvar=${(ni) => { gravar(itens.map(x => x.id === ni.id ? ni : x)); if (stCompra(ni) !== stCompra(itemAb)) registrar(sessao, os.id, '🛒', infoStC(stCompra(ni))[1] + ': ' + ni.descricao, [ni.parceiro, ni.valor ? brl(ni.valor) : ''].filter(Boolean).join(' · ')); }} />`}
    ${imprimir && ReactDOM.createPortal(html`<${ImpressaoCompras} os=${os} doc=${typeof imprimir === 'string' ? { ...doc, itens: itens.filter(i => i.parceiro === imprimir), parceiro: imprimir } : doc} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}`;
}
function LogoImp({ empresa }) { return window.__LOGO ? html`<img class="po-logo" src=${window.__LOGO} alt=${empresa || ''} />` : null; }
function ImpressaoCompras({ os, doc, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const itens = doc?.itens || [];
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div class="row" style=${{ gap: '12px', flexWrap: 'nowrap' }}><${LogoImp} empresa=${empresa} /><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">${doc?.parceiro ? 'Pedido de compra' : 'Folha de compras'}</div>${doc?.parceiro ? html`<div class="po-sub">Fornecedor: <b>${doc.parceiro}</b></div>` : ''}<div class="po-sub">${os.cliente?.nome || ''} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div></div></div>
      <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">${itens.length} itens · ${new Date().toLocaleDateString('pt-BR')}${doc?.origem ? ' · ' + doc.origem : ''}</div></div></div>
    ${!itens.length && html`<div class="po-amb"><div class="po-amb-t"><span>—</span>Itens</div><table><thead><tr><th style=${{ width: '46px' }}>Receb.</th><th>Descrição</th><th style=${{ width: '11%' }}>Qtd</th><th style=${{ width: '11%' }}>Comprar / estoque</th><th style=${{ width: '18%' }}>Comprado com</th><th style=${{ width: '12%' }}>Prazo entrega</th></tr></thead>
      <tbody>${Array.from({ length: 18 }, (_, k) => html`<tr key=${k} style=${{ height: '28px' }}><td class="c"><span class="caixa"></span></td><td></td><td></td><td class="c">☐ C  ☐ E</td><td></td><td></td></tr>`)}</tbody></table></div>`}
    ${CAT_COMPRA.map(c => [c, itens.filter(i => i.categoria === c)]).filter(([, l]) => l.length).map(([c, l]) => html`
      <div key=${c} class="po-amb"><div class="po-amb-t"><span>${l.length}</span>${c}</div>
        <table><thead><tr><th style=${{ width: '46px' }}>Receb.</th><th>Descrição</th><th style=${{ width: '11%' }}>Qtd</th><th style=${{ width: '11%' }}>Comprar / estoque</th><th style=${{ width: '18%' }}>Comprado com</th><th style=${{ width: '12%' }}>Prazo entrega</th></tr></thead>
          <tbody>${l.map(i => html`<tr key=${i.id}><td class="c">${i.recebido ? '✔' : html`<span class="caixa"></span>`}</td><td><b>${i.descricao}</b>${i.codigo || i.marca || i.obs ? html`<br/><small>${[i.codigo, i.marca, i.obs].filter(Boolean).join(' · ')}</small>` : ''}</td><td class="c"><b>${i.qtd} ${i.unidade || ''}</b></td><td class="c">${i.origem === 'estoque' ? 'Estoque' : 'Comprar'}</td><td>${i.origem === 'estoque' ? '—' : (i.parceiro || '')}</td><td class="c">${i.origem === 'estoque' ? '—' : dm(i.previsao || '')}</td></tr>`)}</tbody></table></div>`)}
    <div class="po-ass">${['Solicitado por', 'Compras', 'Recebido na fábrica'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Vídeos do móvel montado na marcenaria (para o montador) ---------- */
function embedVideo(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return 'https://drive.google.com/file/d/' + dr[1] + '/preview';
  return null;
}
function VideosOS({ sessao, os, toast }) {
  const [url, setUrl] = useState(''); const [tit, setTit] = useState('');
  const vids = os.videos || [];
  const salvar = async (lista) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { videos: lista }); } catch (e) { toast(e.message, 'erro'); } };
  return html`
    <div class="sheet-t">🎬 Vídeos do móvel montado</div>
    <div class="dim" style=${{ marginTop: '-6px' }}>Grave o móvel montado na marcenaria e cole o link (YouTube ou Google Drive) — o montador assiste aqui antes de montar na obra.</div>
    <div class="dia-box">
      <input class="inp" placeholder="Título (ex: Balcão da pia montado)" value=${tit} onInput=${e => setTit(e.target.value)} />
      <input class="inp" placeholder="Cole o link do vídeo (YouTube / Google Drive)" value=${url} onInput=${e => setUrl(e.target.value)} />
      <button class="btn btn-grande btn-verde btn-block" disabled=${!/^https?:\/\//.test(url.trim())} onClick=${() => { salvar([{ url: url.trim(), titulo: tit.trim() || 'Vídeo de montagem', quem: sessao.nome, em: nowIso() }, ...vids]); setUrl(''); setTit(''); toast('Vídeo adicionado.', 'ok'); }}>＋ Adicionar vídeo</button>
    </div>
    ${vids.length === 0 ? html`<div class="vazio dim">Nenhum vídeo ainda.</div>` : vids.map((v, i) => { const e = embedVideo(v.url); return html`
      <div key=${i} class="video-card">
        <div class="row" style=${{ justifyContent: 'space-between' }}><b>🎬 ${v.titulo}</b><button class="x-btn" onClick=${() => salvar(vids.filter((_, j) => j !== i))}>✕</button></div>
        ${e ? html`<iframe src=${e} allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>` : html`<a class="btn btn-block" href=${v.url} target="_blank" rel="noopener">▶ Abrir vídeo</a>`}
        <small class="dim">${v.quem} · ${fmtData(v.em)}</small>
      </div>`; })}`;
}

/* ---------- Quadro geral: andamento de cada cliente (celular, só botões) ---------- */
const TIPOS_PARC = [
  ['vidros', '🪟', 'Vidros & espelhos'], ['pintura', '🎨', 'Pintura / laca'], ['tapecaria', '🛋️', 'Tapeçaria'],
  ['corte', '✂️', 'Corte terceirizado'], ['lamina', '🌳', 'Lâminas / esquadrias'], ['pedra', '🪨', 'Pedra / marmoraria'],
  ['serralheria', '⚙️', 'Serralheria / metais'], ['outro', '📦', 'Outro parceiro'],
];
const ST_PARC = [
  ['orcar', 'Pedir orçamento', 'A orçar', '#9ca3af'],
  ['aguard_orc', 'Orçamento pedido', 'Aguard. orçamento', '#f59e0b'],
  ['aguard_aprov', 'Orçamento chegou', 'Aguard. aprovação', '#ea580c'],
  ['pedido', 'Aprovado / mandado fazer', 'Mandado fazer', '#2563eb'],
  ['recebido', 'Recebido na fábrica', 'Recebido ✓', '#16a34a'],
];
function parceirosDaOS(o) {
  const Ps = [o.padrao || {}, ...(o.ambientes || []).map(a => a.padrao).filter(Boolean)], et = o.execucao?.etapas || {}, salvo = o.parceiros || {};
  const algum = (f) => Ps.some(P => { try { return !!f(P); } catch { return false; } });
  const auto = {
    vidros: algum(P => P.vidros?.ativo),
    pintura: algum(P => P.acab?.interno?.tipo === 'laca' || P.acab?.externo?.tipo === 'laca') || et.pintura?.onde === 'terceirizada',
    tapecaria: algum(P => P.tec?.ativo) || et.tapecaria?.onde === 'terceirizada',
    corte: et.corte?.onde === 'terceirizada',
    lamina: algum(P => P.acab?.interno?.tipo === 'lamina' || P.acab?.externo?.tipo === 'lamina'),
  };
  return TIPOS_PARC.filter(([k]) => (auto[k] || salvo[k]) && salvo[k]?.st !== 'nao')
    .map(([k, ic, t]) => ({ k, ic, t, ...(salvo[k] || {}), st: salvo[k]?.st || 'orcar' }));
}
const infoSt = (st) => ST_PARC.find(x => x[0] === st) || ST_PARC[0];

/* ---------- Agora em andamento: tudo que está sendo feito e por quem ---------- */
function AgoraAndamento({ sessao, lista, abrirOS }) {
  const [tar, setTar] = useState([]), [peds, setPeds] = useState([]), [ver, setVer] = useState('os'), [aberto, setAberto] = useState(true);
  useEffect(() => { const a = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'tarefas'), s => setTar(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const b = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'pedidos'), s => setPeds(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}); return () => { a(); b(); }; }, []);
  const hoje = isoD(new Date());
  const ativ = [];
  tar.filter(t => t.status !== 'concluida' && t.inicio <= hoje && t.fim >= hoje).forEach(t => ativ.push({ osId: t.osId, quem: t.pessoa, oque: t.texto || (GRADES.find(g => g[0] === t.grade) || [])[1] || 'Tarefa', cor: corGrade(t.grade), ic: '👷', ate: t.fim, interno: true }));
  (lista || []).filter(o => !osConcluida(o)).forEach(o => {
    parceirosDaOS(o).filter(p => p.st === 'pedido').forEach(p => ativ.push({ osId: o.id, quem: p.parceiro || p.fornecedor || p.nome || p.t, oque: p.t, cor: '#7c3aed', ic: p.ic, ate: p.previsao || p.prazo || '' }));
    const et = o.execucao?.etapas || {}; ETAPAS_FAB.forEach(([k, t]) => { if (et[k]?.status === 'andamento' && !ativ.some(a => a.osId === o.id && norm(a.oque).includes(norm(t).split(' ')[0]))) ativ.push({ osId: o.id, quem: et[k].onde === 'terceirizada' ? 'Terceirizado' : 'Fábrica', oque: t, cor: '#d97706', ic: '🏭', ate: '' }); });
  });
  peds.filter(p => p.tipo === 'terceiro' && p.st === 'pedido').forEach(p => ativ.push({ osId: p.osId, quem: p.parceiro || 'Terceirizado', oque: resumoPed(p) || 'Peça terceirizada', cor: '#0d9488', ic: '🤝', ate: p.prazo || '' }));
  const osDe = (id) => (lista || []).find(o => o.id === id);
  const porOS = [...new Set(ativ.map(a => a.osId).filter(Boolean))].map(id => [osDe(id), ativ.filter(a => a.osId === id)]).filter(([o]) => o);
  const porQuem = [...new Set(ativ.map(a => a.quem))].sort().map(q => [q, ativ.filter(a => a.quem === q)]);
  const nomeOS = (o) => numOS(o) + ' ' + (o.cliente?.nome || '').split(/\s[-–]\s/)[0];
  const Chip = (a, mostrarOS) => { const o = osDe(a.osId); return html`<div class="ag-chip" style=${{ '--c': a.cor }}><span>${a.ic}</span><span class="grow"><b>${mostrarOS ? (o ? nomeOS(o) : '') : a.quem}</b><small>${a.oque}${a.ate ? ' · até ' + dm(a.ate) : ''}${a.ate && a.ate < hoje ? ' ⚠' : ''}</small></span></div>`; };
  return html`<div class="card ag-box">
    <div class="row" style=${{ justifyContent: 'space-between', gap: '8px' }}>
      <b style=${{ fontSize: '16px', cursor: 'pointer' }} onClick=${() => setAberto(!aberto)}>⚡ Agora em andamento <span class="ag-n">${ativ.length}</span> ${aberto ? '▾' : '▸'}</b>
      ${aberto && html`<div class="seg-mini"><button class=${ver === 'os' ? 'on' : ''} onClick=${() => setVer('os')}>Por OS</button><button class=${ver === 'quem' ? 'on' : ''} onClick=${() => setVer('quem')}>Por quem</button></div>`}</div>
    ${aberto && (!ativ.length ? html`<div class="dim">Nada em andamento hoje.</div>` : html`<div class="ag-grade">
      ${ver === 'os' ? porOS.map(([o, l]) => html`<div key=${o.id} class="ag-col" style=${{ '--cc': corOS(o) }}><div class="ag-tit" onClick=${() => abrirOS(o.id)}>${nomeOS(o)} <small>${l.length} frente${l.length > 1 ? 's' : ''}</small></div>${l.map(a => Chip(a, false))}</div>`)
        : porQuem.map(([q, l]) => html`<div key=${q} class="ag-col"><div class="ag-tit">${l[0].ic} ${q}</div>${l.map(a => Chip(a, true))}</div>`)}
    </div>`)}
  </div>`;
}

/* % de conclusão da obra: etapa da OS (40%) + produção na fábrica (40%) + parceiros recebidos (20%) */
function pctObra(o) {
  if (osConcluida(o)) return 100;
  const i = Math.max(0, STATUS_OS.findIndex(x => x.v === o.status)), nS = Math.max(1, STATUS_OS.length - 1);
  const et = o.execucao?.etapas || {}; const fab = ETAPAS_FAB.reduce((n, [k]) => n + (et[k]?.status === 'pronto' ? 1 : et[k]?.status === 'andamento' ? 0.5 : 0), 0) / ETAPAS_FAB.length;
  const pr = parceirosDaOS(o);
  if (!pr.length) return Math.round((i / nS) * 50 + fab * 50);
  return Math.round((i / nS) * 40 + fab * 40 + pr.filter(p => p.st === 'recebido').length / pr.length * 20);
}
const corPct = (p) => p >= 100 ? '#16a34a' : p >= 70 ? '#65a30d' : p >= 40 ? '#d97706' : '#dc2626';
function BarraPct({ p, grande }) { return html`<div class=${'pct-barra' + (grande ? ' g' : '')}><i style=${{ width: p + '%', background: corPct(p) }}></i><span>${p}%</span></div>`; }

/* ---------- Previsão de finalização (cronograma + compras + parceiros) ---------- */
function PrevisaoEntregas({ sessao, lista, abrirOS }) {
  const [tar, setTar] = useState([]), [comp, setComp] = useState({}), [ver, setVer] = useState('cliente');
  useEffect(() => { const a = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'tarefas'), s => setTar(s.docs.map(d => d.data())), () => {});
    const b = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'compras'), s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); setComp(m); }, () => {}); return () => { a(); b(); }; }, []);
  const hoje = isoD(new Date());
  const prev = (lista || []).filter(o => !osConcluida(o)).map(o => {
    const ts = tar.filter(t => t.osId === o.id); const abertas = ts.filter(t => t.status !== 'concluida');
    const fimCron = abertas.map(t => t.fim).sort().pop() || '';
    const itens = (comp[o.id]?.itens || []).filter(i => !i.recebido && i.origem !== 'estoque');
    const fimComp = itens.map(i => i.previsao).filter(Boolean).sort().pop() || '';
    const semPrev = itens.filter(i => !i.previsao).length;
    const pr = parceirosDaOS(o).filter(p => p.st !== 'recebido'); const fimParc = pr.map(p => paraIso(p.previsao)).filter(Boolean).sort().pop() || '';
    const base = [fimComp, fimParc].filter(Boolean).sort().pop() || '';
    const fim = [fimCron, base ? somaUteis(base, 2) : ''].filter(Boolean).sort().pop() || '';
    const prazo = paraIso(o.prazoEntrega); const falta = prazo ? uteisEntre(hoje, prazo) : null;
    const folga = prazo && fim ? (fim <= prazo ? uteisEntre(fim, prazo) : -uteisEntre(prazo, fim)) : null;
    const st = !prazo ? 'sem' : prazo < hoje ? 'vencido' : folga !== null && folga < 0 ? 'estoura' : falta <= 5 ? 'perto' : folga !== null && folga <= 3 ? 'apertado' : !fim ? 'semdados' : 'ok';
    return { o, fim, fimCron, fimComp, fimParc, semPrev, pend: itens.length, parcPend: pr.length, abertas: abertas.length, prazo, falta, folga, st };
  });
  const ST = { vencido: ['🔴', 'Prazo vencido', '#b91c1c'], estoura: ['🔴', 'Vai passar do prazo', '#dc2626'], perto: ['🟠', 'Prazo chegando', '#ea580c'], apertado: ['🟡', 'Apertado', '#ca8a04'], semdados: ['⚪', 'Sem cronograma/compras', '#64748b'], ok: ['🟢', 'No prazo', '#16a34a'], sem: ['⚪', 'Sem prazo de entrega', '#94a3b8'] };
  const ordem = ['vencido', 'estoura', 'perto', 'apertado', 'semdados', 'ok', 'sem'];
  const alertas = prev.filter(p => ['vencido', 'estoura', 'perto'].includes(p.st));
  const porCli = {}; prev.forEach(p => { const k = baseCli(p.o.cliente?.nome) || '—'; (porCli[k] = porCli[k] || []).push(p); });
  const cliRows = Object.entries(porCli).map(([k, l]) => { const pior = l.slice().sort((a, b) => ordem.indexOf(a.st) - ordem.indexOf(b.st))[0]; return { k, l, st: pior.st, fim: l.map(p => p.fim).filter(Boolean).sort().pop() || '', prazo: l.map(p => p.prazo).filter(Boolean).sort()[0] || '' }; }).sort((a, b) => ordem.indexOf(a.st) - ordem.indexOf(b.st) || String(a.prazo || '9').localeCompare(b.prazo || '9'));
  const Det = (p) => html`<small>${[p.fimCron ? '📅 cronograma até ' + dm(p.fimCron) + (p.abertas ? ' (' + p.abertas + ' tarefa' + (p.abertas > 1 ? 's' : '') + ')' : '') : '📅 sem cronograma', p.pend ? '🛒 ' + p.pend + ' compra(s) a chegar' + (p.fimComp ? ' até ' + dm(p.fimComp) : '') + (p.semPrev ? ' · ' + p.semPrev + ' sem data' : '') : '🛒 compras ok', p.parcPend ? '🤝 ' + p.parcPend + ' parceiro(s)' + (p.fimParc ? ' até ' + dm(p.fimParc) : '') : ''].filter(Boolean).join(' · ')}</small>`;
  const Linha = (p, cli) => { const s = ST[p.st]; return html`<div key=${p.o.id} class="pv-l" style=${{ '--c': s[2] }} onClick=${() => abrirOS(p.o.id)}>
    <span class="pv-st">${s[0]}</span><span class="grow"><b>${numOS(p.o)} ${cli ? (p.o.cliente?.nome || '') : (p.o.ambientes || []).map(a => a.nome).join(', ') || p.o.ambienteResumo || ''}</b>${Det(p)}</span>
    <span class="pv-d"><small>Previsão</small><b>${p.fim ? dm(p.fim) : '—'}</b></span><span class="pv-d"><small>Entrega</small><b>${p.prazo ? dm(p.prazo) : '—'}</b></span>
    <span class="pv-tag" style=${{ background: s[2] }}>${s[1]}${p.folga !== null && p.st !== 'sem' ? ' · ' + (p.folga >= 0 ? p.folga + 'd folga' : -p.folga + 'd além') : ''}${p.st === 'perto' ? ' · faltam ' + p.falta + 'd' : ''}</span></div>`; };
  return html`<div class="stack">
    ${alertas.length > 0 && html`<div class="card pv-alerta"><b>⏰ Atenção: ${alertas.length} OS com prazo em risco</b>${alertas.map(p => html`<div key=${p.o.id} onClick=${() => abrirOS(p.o.id)} style=${{ cursor: 'pointer' }}>${ST[p.st][0]} <b>${numOS(p.o)} ${baseCli(p.o.cliente?.nome)}</b> — ${ST[p.st][1]}${p.prazo ? ' (entrega ' + dm(p.prazo) + (p.st === 'perto' ? ', faltam ' + p.falta + ' dias úteis' : '') + ')' : ''}</div>`)}</div>`}
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="seg-mini"><button class=${ver === 'cliente' ? 'on' : ''} onClick=${() => setVer('cliente')}>👤 Por cliente</button><button class=${ver === 'os' ? 'on' : ''} onClick=${() => setVer('os')}>📋 Por OS</button></div>
      <small class="dim">Previsão = maior data entre cronograma e chegada de compras/parceiros (+2 dias úteis para produzir).</small></div>
    ${ver === 'os' ? prev.slice().sort((a, b) => ordem.indexOf(a.st) - ordem.indexOf(b.st) || String(a.prazo || '9').localeCompare(b.prazo || '9')).map(p => Linha(p, true))
      : cliRows.map(c => html`<div key=${c.k} class="card pv-cli" style=${{ '--c': ST[c.st][2] }}><div class="row" style=${{ justifyContent: 'space-between' }}><b>${ST[c.st][0]} ${c.k}</b><span class="row" style=${{ gap: '10px' }}><span class="pv-d"><small>Previsão final</small><b>${c.fim ? dm(c.fim) : '—'}</b></span><span class="pv-d"><small>1ª entrega</small><b>${c.prazo ? dm(c.prazo) : '—'}</b></span><span class="pv-tag" style=${{ background: ST[c.st][2] }}>${ST[c.st][1]}</span></span></div>${c.l.map(p => Linha(p, false))}</div>`)}
  </div>`;
}

function QuadroGeral({ sessao, abrirOS, toast, catalogo }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [sheet, setSheet] = useState(null); // {osId, tipo:'parc'|'prod'|'add', k}
  const [conf, setConf] = useState(null); // {titulo, oque, fazer(motivo)}
  const [cliSel, setCliSel] = useState(null);
  const [visaoQ, setVisaoQ] = useState('obras');
  const [folha, setFolha] = useState(null);
  const [pedAb, setPedAb] = useState({});
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'pedidos'), s => { const m = {}; s.docs.forEach(d => { const x = d.data(); if (pedAberto(x)) m[x.osId] = (m[x.osId] || 0) + 1; }); setPedAb(m); }, () => {}), []);
  const imprimirFolha = async (oss) => { toast('Montando a folha…'); try { const dados = await montarFolha(sessao, oss); setFolha(dados); setTimeout(() => { window.print(); setFolha(null); }, 400); } catch (e) { toast(e.message, 'erro'); } };
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const salvar = async (o, patch, msg) => {
    if (patch.status && patch.status !== o.status) patch = { ...patch, statusHist: [...(o.statusHist || []), { st: patch.status, em: nowIso(), quem: sessao.nome }] };
    if (patch.execucao?.etapas) { const et = { ...patch.execucao.etapas }; Object.keys(et).forEach(k => { if (et[k]?.status === 'andamento' && !et[k].iniciadaEm) et[k] = { ...et[k], iniciadaEm: nowIso(), iniciadaPor: sessao.nome }; }); patch = { ...patch, execucao: { ...patch.execucao, etapas: et } }; }
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { ...patch, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); if (msg) toast(msg, 'ok'); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const setParc = (o, k, patch, msg) => {
    const atual = (o.parceiros || {})[k] || {};
    const hist = patch.st && patch.st !== atual.st ? [...(atual.hist || []), { st: patch.st, quem: sessao.nome, em: nowIso() }] : (atual.hist || []);
    salvar(o, { parceiros: { ...(o.parceiros || {}), [k]: { ...atual, st: atual.st || 'orcar', ...patch, hist } } }, msg);
  };
  const concluirEtapa = (o, k) => {
    const etapas = { ...(o.execucao?.etapas || {}) };
    etapas[k] = { ...(etapas[k] || {}), status: 'pronto', concluidaEm: nowIso() };
    const i = ETAPAS_FAB.findIndex(e => e[0] === k), prox = ETAPAS_FAB[i + 1]?.[0];
    if (prox && prox !== 'montagem' && (etapas[prox]?.status || 'pendente') === 'pendente') etapas[prox] = { ...(etapas[prox] || {}), status: 'andamento' };
    const todas = ETAPAS_FAB.every(([x]) => etapas[x]?.status === 'pronto');
    const semMontagem = ETAPAS_FAB.filter(([x]) => x !== 'montagem').every(([x]) => etapas[x]?.status === 'pronto');
    const status = todas ? 'concluida' : etapas.montagem?.status === 'andamento' ? 'montagem' : semMontagem ? 'liberacao' : 'producao';
    salvar(o, { execucao: { ...(o.execucao || {}), etapas }, ...(etapasPadrao() && !osConcluida(o) ? { status } : {}) }, '✓ ' + ETAPAS_FAB[i][1] + ' concluída');
  };
  const reab = (o, oque, motivo) => [...(o.reaberturas || []), { oque, motivo, quem: sessao.nome, quando: nowIso() }];
  const voltarEtapa = (o, k) => {
    const t = (ETAPAS_FAB.find(e => e[0] === k) || [])[1];
    setConf({ titulo: 'Reabrir etapa: ' + t, fazer: async (motivo) => {
      const etapas = { ...(o.execucao?.etapas || {}) };
      etapas[k] = { ...(etapas[k] || {}), status: 'andamento' };
      await salvar(o, { execucao: { ...(o.execucao || {}), etapas }, reaberturas: reab(o, 'Etapa ' + t + ' reaberta', motivo) }, 'Etapa reaberta');
    } });
  };
  const voltarParc = (o, p, v) => {
    setConf({ titulo: p.t + ': voltar para "' + infoSt(v)[2] + '"', fazer: async (motivo) => {
      const atual = (o.parceiros || {})[p.k] || {};
      await salvar(o, { parceiros: { ...(o.parceiros || {}), [p.k]: { ...atual, st: v, hist: [...(atual.hist || []), { st: v, quem: sessao.nome, em: nowIso(), motivo }] } }, reaberturas: reab(o, p.t + ': ' + infoSt(atual.st || 'orcar')[2] + ' → ' + infoSt(v)[2], motivo) }, 'Situação voltada');
    } });
  };
  const ativas = (lista || []).filter(o => !osConcluida(o));
  const cards = ativas.map(o => {
    const parc = parceirosDaOS(o);
    const et = o.execucao?.etapas || {};
    const feitas = ETAPAS_FAB.filter(([k]) => et[k]?.status === 'pronto').length;
    const pendParc = parc.filter(p => p.st !== 'recebido');
    return { o, parc, et, feitas, pendParc, atras: atrasada(o), aprov: parc.some(p => p.st === 'aguard_aprov') };
  }).filter(c => {
    if (busca && !norm(numOS(c.o) + ' ' + (c.o.cliente?.nome || '') + ' ' + (c.o.ambientes || []).map(a => a.nome).join(' ')).includes(norm(busca))) return false;
    if (filtro === 'parceiros') return c.pendParc.length > 0;
    if (filtro === 'aprovacao') return c.aprov;
    if (filtro === 'atrasadas') return c.atras;
    return true;
  });
  const cont = { parceiros: ativas.filter(o => parceirosDaOS(o).some(p => p.st !== 'recebido')).length, aprovacao: ativas.filter(o => parceirosDaOS(o).some(p => p.st === 'aguard_aprov')).length, atrasadas: ativas.filter(atrasada).length };
  const osSheet = sheet && (lista || []).find(x => x.id === sheet.osId);
  const pSheet = osSheet && sheet.tipo === 'parc' ? parceirosDaOS(osSheet).find(p => p.k === sheet.k) || { k: sheet.k, st: 'orcar', ...(TIPOS_PARC.find(t => t[0] === sheet.k) ? { ic: TIPOS_PARC.find(t => t[0] === sheet.k)[1], t: TIPOS_PARC.find(t => t[0] === sheet.k)[2] } : {}) } : null;

  return html`
    <div class="fade-up stack qg">
      <div><h2>Quadro geral</h2><div class="dim">Toque no cliente para ver o andamento de cada ambiente, parceiros e o diário de obra.</div></div>
      <div class="seg-mini qg-visao"><button class=${visaoQ === 'obras' ? 'on' : ''} onClick=${() => setVisaoQ('obras')}>🏗 Obras</button><button class=${visaoQ === 'prev' ? 'on' : ''} onClick=${() => setVisaoQ('prev')}>🔮 Previsão de finalização</button></div>
      ${visaoQ === 'prev' ? html`<${PrevisaoEntregas} sessao=${sessao} lista=${lista} abrirOS=${abrirOS} />` : html`<div class="stack">
      <${AvisoClientes} sessao=${sessao} lista=${lista} toast=${toast} />
      <${AgoraAndamento} sessao=${sessao} lista=${lista} abrirOS=${abrirOS} />
      <div class="qg-filtros">
        ${[['todas', 'Todas', ativas.length], ['parceiros', 'Pendências de parceiro', cont.parceiros], ['aprovacao', 'Aguard. aprovação', cont.aprovacao], ['atrasadas', 'Atrasadas', cont.atrasadas]].map(([v, t, n]) => html`
          <button key=${v} class=${'qg-f' + (filtro === v ? ' on' : '') + (v === 'atrasadas' && n ? ' perigo' : '')} onClick=${() => setFiltro(v)}>${t} <b>${n}</b></button>`)}
      </div>
      <input class="inp" placeholder="🔍 Buscar cliente, OS ou ambiente" value=${busca} onInput=${e => setBusca(e.target.value)} />
      <div class="qg-leg">${ST_PARC.map(s => html`<span key=${s[0]}><i style=${{ background: s[3] }}></i>${s[2]}</span>`)}</div>
      ${lista === null ? html`<div class="card">Carregando…</div>` : cards.length === 0 ? html`<div class="card vazio dim">Nada por aqui.</div>` : !cliSel ? (() => {
        const grupos = {};
        cards.forEach(c => { const k = norm(c.o.cliente?.nome) || '—'; (grupos[k] = grupos[k] || { nome: c.o.cliente?.nome || 'Sem cliente', cards: [] }).cards.push(c); });
        const todasP = cards.map(c => pctObra(c.o)); const geral = todasP.length ? Math.round(todasP.reduce((a, b) => a + b, 0) / todasP.length) : 0;
        return [html`<div key="__geral" class="card pct-geral"><div class="row" style=${{ justifyContent: 'space-between' }}><b>📈 Andamento geral das obras</b><small class="dim">${Object.keys(grupos).length} clientes · ${cards.length} OS</small></div><${BarraPct} p=${geral} grande=${true} />
          <div class="pct-mini">${Object.values(grupos).map(g => { const p = Math.round(g.cards.reduce((n, c) => n + pctObra(c.o), 0) / g.cards.length); return { g, p }; }).sort((a, b) => a.p - b.p).map(({ g, p }) => html`<div key=${g.nome} class="pct-lin" onClick=${() => setCliSel(norm(g.cards[0].o.cliente?.nome) || '—')}><span>${g.nome.split(/\s[-–]\s/)[0]}</span><${BarraPct} p=${p} /></div>`)}</div></div>`, html`<div key="__cli" class="qg-clientes">${Object.entries(grupos).sort((a, b) => b[1].cards.some(c => c.atras) - a[1].cards.some(c => c.atras) || a[1].nome.localeCompare(b[1].nome)).map(([k, g]) => {
          const tot = g.cards.length * 6, feitas = g.cards.reduce((n, c) => n + c.feitas, 0);
          const pend = g.cards.reduce((n, c) => n + c.pendParc.length, 0), atr = g.cards.filter(c => c.atras).length, pendD = g.cards.reduce((n, c) => n + (c.o.pendAbertas || 0), 0);
          const prazos = g.cards.map(c => lerPrazo(c.o.prazoEntrega)).filter(Boolean).sort((a, b) => a - b);
          const cor = corCliente(g.nome);
          return html`<button key=${k} class=${'qg-cliente' + (atr ? ' atras' : '')} style=${{ '--cc': cor, flex: g.cards.length + ' 1 ' + Math.min(560, 180 + g.cards.length * 70) + 'px' }} onClick=${() => { window.__buscaOS = g.nome; window.__irPara && window.__irPara('os'); }}>
            <div class="qg-cli"><b>${nomePadrao(g.nome)}</b><small>${g.cards.length} ${g.cards.length === 1 ? 'ambiente' : 'ambientes'} · ${g.cards.map(c => (c.o.ambientes || [])[0]?.nome || c.o.ambienteResumo || numOS(c.o)).slice(0, 4).join(', ')}${g.cards.length > 4 ? '…' : ''}</small></div>
            <div class="pct-rot"><small>Conclusão da obra</small><${BarraPct} p=${Math.round(g.cards.reduce((n, c) => n + pctObra(c.o), 0) / g.cards.length)} /></div>
            <div class="qg-badges">
              <span title="Produção">🏭 ${Math.round(tot ? feitas / tot * 100 : 0)}%</span>
              ${pend > 0 && html`<span class="b-par" title="Parceiros pendentes">🤝 ${pend}</span>`}
              ${pendD > 0 && html`<span class="b-dia" title="Pendências do diário">📓 ${pendD}</span>`}
              ${atr > 0 && html`<span class="b-atr">⚠ ${atr}</span>`}
              ${prazos[0] && html`<span>🚚 ${prazos[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`}
            </div>
          </button>`; })}</div>`];
      })() : html`
        <div class="row" style=${{ gap: '8px', justifyContent: 'space-between' }}><span class="row" style=${{ gap: '8px' }}><button class="btn btn-sm" onClick=${() => setCliSel(null)}>← Clientes</button><b class="qg-cli-nome" style=${{ '--cc': corCliente(cards.find(c => norm(c.o.cliente?.nome) === cliSel)?.o.cliente?.nome || '') }}>${cards.find(c => norm(c.o.cliente?.nome) === cliSel)?.o.cliente?.nome || ''}</b></span>
          <button class="btn btn-sm" onClick=${() => imprimirFolha(cards.filter(c => (norm(c.o.cliente?.nome) || '—') === cliSel).map(c => c.o))}>🖨 Folha de pendências</button></div>
        <div class="qg-oss">${cards.filter(c => (norm(c.o.cliente?.nome) || '—') === cliSel).map(({ o, parc, et, feitas, atras }) => html`
        <div key=${o.id} class=${'qg-card' + (atras ? ' atras' : '')} style=${{ '--cc': corOS(o) }}>
          <div class="qg-top" onClick=${() => abrirOS(o.id)}>
            <b class="qg-num">${numOS(o)}</b>
            <div class="qg-cli"><b>${o.cliente?.nome || 'Cliente'}</b><small>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</small></div>
            <span class=${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).c + ' qg-st'}>${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</span>
            <div class=${'qg-prazo' + (atras ? ' atras' : '')}>${o.prazoEntrega ? (atras ? '⚠ ' : '🚚 ') + o.prazoEntrega.slice(0, 5) : '—'}</div>
          </div>
          <div class="pct-rot"><small>Conclusão</small><${BarraPct} p=${pctObra(o)} /></div>
          <button class="qg-prod" onClick=${() => setSheet({ osId: o.id, tipo: 'prod' })}>
            ${ETAPAS_FAB.map(([k, t]) => { const s = et[k]?.status || 'pendente'; return html`<span key=${k} class=${'qg-seg ' + s}><i></i><small>${t.split(' ')[0]}</small></span>`; })}
            <em>${feitas}/6</em>
          </button>
          <div class="qg-parc">
            ${parc.map(p => { const s = infoSt(p.st); return html`<button key=${p.k} class="qg-chip" style=${{ borderColor: s[3], background: s[3] + '1f' }} onClick=${() => setSheet({ osId: o.id, tipo: 'parc', k: p.k })}>
              <span>${p.ic}</span>${p.t.split(/[ /]/)[0]}<b style=${{ color: s[3] }}>· ${s[2]}</b>${p.previsao ? html`<small>${p.previsao.slice(0, 5)}</small>` : ''}</button>`; })}
            <button class="qg-chip add" onClick=${() => setSheet({ osId: o.id, tipo: 'add' })}>＋ parceiro</button>
          </div>
          <${BarraTempos} o=${o} />
          <div class="qg-acoes">
            <button class=${'qg-diario' + (o.pendAbertas ? ' tem' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'diario' })}>📓 Diário${o.pendAbertas ? html` · <b>${o.pendAbertas}</b>` : ''}</button>
            <button class=${'qg-diario' + (pedAb[o.id] ? ' tem-ped' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'pedidos' })}>🪵 Peças${pedAb[o.id] ? html` · <b>${pedAb[o.id]}</b>` : ''}</button>
            <button class="qg-diario" onClick=${() => setSheet({ osId: o.id, tipo: 'compras' })}>🛒 Compras</button>
            <button class=${'qg-diario' + ((o.videos || []).length ? ' tem-vid' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'videos' })}>🎬 Vídeos${(o.videos || []).length ? html` · <b>${o.videos.length}</b>` : ''}</button>
            <button class="qg-diario" onClick=${() => imprimirFolha([o])}>🖨 Pendências</button>
          </div>
          ${o.ultimoFinal?.foto && html`<button class="final-dia" onClick=${() => setSheet({ osId: o.id, tipo: 'diario' })}><img src=${o.ultimoFinal.foto} /><span>🌇 Final do dia · ${new Date(o.ultimoFinal.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}${o.ultimoFinal.quem ? ' · ' + o.ultimoFinal.quem : ''}</span></button>`}
        </div>`)}</div>`}

      ${osSheet && ReactDOM.createPortal(html`
        <div class="sheet-fundo" onClick=${e => e.target === e.currentTarget && setSheet(null)}>
          <div class="sheet">
            <div class="sheet-alça"></div>
            <div class="row" style=${{ justifyContent: 'space-between' }}><div><b>${numOS(osSheet)}</b> · ${osSheet.cliente?.nome}</div><button class="x-btn" onClick=${() => setSheet(null)}>✕</button></div>

            ${sheet.tipo === 'prod' && html`
              <div class="sheet-t">🏭 Produção na fábrica</div>
              ${osSheet.status === 'liberacao' && html`<button class="btn btn-grande btn-verde btn-block" onClick=${() => { const et2 = { ...(osSheet.execucao?.etapas || {}) }; et2.montagem = { ...(et2.montagem || {}), status: 'andamento' }; salvar(osSheet, { status: 'montagem', execucao: { ...(osSheet.execucao || {}), etapas: et2 } }, 'Liberado para entrega/montagem'); }}>🚚 Liberar para entrega / montagem</button>`}
              ${ETAPAS_FAB.map(([k, t]) => { const e = osSheet.execucao?.etapas?.[k] || {}; const s = e.status || 'pendente'; return html`
                <div key=${k} class=${'sheet-linha ' + s}>
                  <div><b>${t}</b><small>${s === 'pronto' ? '✓ Pronto' : s === 'andamento' ? 'Em andamento' : 'Pendente'}${e.onde === 'terceirizada' ? ' · terceirizado' : ''}${e.prazo ? ' · até ' + e.prazo : ''}</small></div>
                  ${s === 'pronto' ? html`<button class="btn btn-sm" onClick=${() => voltarEtapa(osSheet, k)}>Reabrir</button>`
                    : html`<button class="btn btn-grande btn-verde" onClick=${() => concluirEtapa(osSheet, k)}>✓ Concluir</button>`}
                </div>`; })}`}

            ${sheet.tipo === 'parc' && pSheet && html`
              <div class="sheet-t">${pSheet.ic} ${pSheet.t}</div>
              ${(() => { const i = ST_PARC.findIndex(x => x[0] === pSheet.st); const prox = ST_PARC[i + 1]; return prox
                ? html`<button class="btn btn-grande btn-verde btn-block" onClick=${() => setParc(osSheet, pSheet.k, { st: prox[0] }, pSheet.t + ': ' + prox[2])}>✓ ${prox[1]}</button>`
                : html`<div class="ok-box">✓ Recebido na fábrica</div>`; })()}
              <div class="sheet-passos">
                ${ST_PARC.map(([v, , t, c], i) => { const at = ST_PARC.findIndex(x => x[0] === pSheet.st); return html`
                  <button key=${v} class=${'sheet-passo' + (i <= at ? ' feito' : '') + (i === at ? ' atual' : '')} style=${i <= at ? { background: c, borderColor: c } : undefined} onClick=${() => i < at ? voltarParc(osSheet, pSheet, v) : setParc(osSheet, pSheet.k, { st: v })}>${i < at ? '✓ ' : ''}${t}</button>`; })}
              </div>
              <div class="grid2">
                <div class="field"><span class="lbl">Parceiro / fornecedor</span><input class="inp" value=${pSheet.parceiro || ''} placeholder="Ex: Projetta" onChange=${e => setParc(osSheet, pSheet.k, { parceiro: e.target.value })} /></div>
                <div class="field"><span class="lbl">Previsão (dd/mm)</span><input class="inp" inputmode="numeric" value=${pSheet.previsao || ''} placeholder="Ex: 03/10" onChange=${e => setParc(osSheet, pSheet.k, { previsao: e.target.value })} /></div>
              </div>
              <div class="field"><span class="lbl">Valor / observação</span><input class="inp" value=${pSheet.obs || ''} placeholder="Ex: R$ 1.850 · 4 portas reflecta bronze" onChange=${e => setParc(osSheet, pSheet.k, { obs: e.target.value })} /></div>
              ${(pSheet.hist || []).length > 0 && html`<details><summary class="dim">Histórico</summary>${pSheet.hist.slice().reverse().map((h, i) => html`<div key=${i} class="dim" style=${{ fontSize: '12px' }}>${infoSt(h.st)[2]} · ${h.quem} · ${fmtData(h.em)}</div>`)}</details>`}
              <button class="btn btn-sm btn-ghost" onClick=${() => { setParc(osSheet, pSheet.k, { st: 'nao' }, 'Removido do quadro'); setSheet(null); }}>Não precisa deste parceiro nesta OS</button>`}

            ${sheet.tipo === 'diario' && html`<${DiarioOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'compras' && html`<${ComprasOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'videos' && html`<${VideosOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'pedidos' && html`<${PedidosOS} sessao=${sessao} os=${osSheet} toast=${toast} catalogo=${catalogo} />`}
            ${sheet.tipo === 'add' && html`
              <div class="sheet-t">Adicionar parceiro nesta OS</div>
              <div class="sheet-grade">
                ${TIPOS_PARC.map(([k, ic, t]) => html`<button key=${k} class="btn btn-grande" onClick=${() => { setParc(osSheet, k, { st: 'orcar' }, t + ' adicionado'); setSheet({ osId: osSheet.id, tipo: 'parc', k }); }}><span style=${{ fontSize: '22px' }}>${ic}</span><br/>${t}</button>`)}
              </div>`}
          </div>
        </div>`, document.body)}
      </div>`}
      ${folha && ReactDOM.createPortal(html`<${ImpressaoFolha} dados=${folha} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      ${conf && html`<${SenhaMotivo} titulo=${conf.titulo} texto="Este processo já foi iniciado. Para reabrir/voltar, informe o motivo e a senha." botao="Confirmar" onOk=${conf.fazer} fechar=${() => setConf(null)} />`}
    </div>`;
}

/* ---------- Cronogramas: agenda semanal (modelo padrão), mês, produção e entregas ---------- */
const DIAS_SEM = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const GRADES_PADRAO = [
  ['entregas', '🚚 Entregas', 'Viagem', '#0E7490'],
  ['montagem', '🔧 Montagem', 'Equipe', '#15803D'],
  ['producao', '🪵 Produção', 'Pessoa', '#A16207'],
  ['terceirizados', '🤝 Terceirizados', 'Parceiro', '#7C3AED'],
  ['marceneiros', '🪚 Marceneiros', 'Marceneiro', '#B45309'],
];
const GRADES = GRADES_PADRAO.map(x => [...x]);
const corGrade = (k) => (GRADES.find(g => g[0] === k) || [])[3] || '#78716c';
function EditorCategorias({ sessao, toast, fechar }) {
  const [l, setL] = useState(() => GRADES.map(([k, t, rot, cor]) => ({ k, t, rot, cor: cor || '#78716c' })));
  const [salvando, setSalvando] = useState(false);
  const mv = (i, d) => { const a = [...l]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setL(a); };
  const salvar = async () => {
    if (l.some(x => !x.t.trim())) return toast('Toda categoria precisa de nome.');
    setSalvando(true);
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { gradesCfg: l.map(x => ({ ...x, t: x.t.trim(), rot: (x.rot || 'Pessoa').trim() })) }); toast('Categorias salvas.', 'ok'); fechar(); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
    setSalvando(false);
  };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🗂 Categorias do cronograma</div><button class="x-btn" onClick=${fechar}>✕</button></div>
      <div class="dim">Renomeie, mude a cor, reordene, crie ou tire categorias. Dica: comece o nome com um emoji (ex: 🎨 Pintura).</div>
      ${l.map((x, i) => html`<div key=${x.k} class="cat-linha" style=${{ borderLeftColor: x.cor }}>
        <input type="color" value=${x.cor} onInput=${e => setL(l.map((y, j) => j === i ? { ...y, cor: e.target.value } : y))} />
        <input class="inp inp-sm" value=${x.t} placeholder="Nome" onInput=${e => setL(l.map((y, j) => j === i ? { ...y, t: e.target.value } : y))} />
        <input class="inp inp-sm" style=${{ maxWidth: '110px' }} value=${x.rot} placeholder="Linha (ex: Pessoa)" onInput=${e => setL(l.map((y, j) => j === i ? { ...y, rot: e.target.value } : y))} />
        <button class="btn btn-sm btn-ghost" onClick=${() => mv(i, -1)}>▲</button><button class="btn btn-sm btn-ghost" onClick=${() => mv(i, 1)}>▼</button>
        <button class="btn btn-sm btn-ghost" title="Remover" onClick=${async () => { if ((await escolher('Remover categoria', 'Remover "' + x.t + '" do cronograma? O que já foi escrito nela fica guardado, mas deixa de aparecer.', [{ v: 's', t: 'Remover', cls: 'btn-danger' }, { v: 'n', t: 'Cancelar' }])) === 's') setL(l.filter((_, j) => j !== i)); }}>🗑</button>
      </div>`)}
      <button class="btn" onClick=${() => setL([...l, { k: 'cat_' + rand(5), t: '📌 Nova categoria', rot: 'Pessoa', cor: '#2563eb' }])}>＋ Nova categoria</button>
      <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setL(GRADES_PADRAO.map(([k, t, rot, cor]) => ({ k, t, rot, cor })))}>Restaurar padrão</button>
        <button class="btn btn-grande btn-verde" style=${{ flex: 1 }} disabled=${salvando} onClick=${salvar}>💾 Salvar categorias</button></div>
    </div></div>`, document.body);
}
const LISTAS = [
  ['entregasObs', 'Entregas sem data / observações', '🚚'],
  ['usinagens', 'Corte – usinagens e orgânicos', '✂️'], ['cortes', 'Corte – cortes', '✂️'],
  ['fitaExtras', 'Fita – extras', '🎞️'], ['fitaLimpeza', 'Fita – fitar e limpeza', '🎞️'],
  ['liberado', 'Liberado marceneiro', '✅'], ['prontoMontagem', 'Pronto para montagem', '📦'],
];
const agendaPadrao = (semana) => ({
  semana, prioridades: '',
  grades: {
    entregas: [{ nome: 'Viagem 1', dias: ['', '', '', '', ''] }, { nome: 'Viagem 2', dias: ['', '', '', '', ''] }],
    montagem: ['RICARDO + AJUDANTE', 'LUCAS + CLEITON', 'EQUIPE NOVA'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    producao: ['EDINHO', 'ROMILDO + ANTÔNIO'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    terceirizados: ['FERNANDO', 'PETER', 'CRIS', 'CRISTIANO'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    marceneiros: ['CRIS', 'CLEITON', 'HERMANN', 'CRISTIANO', 'MELK'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
  },
  listas: {},
  fornecedores: ['PINTURA – LACA NOBRE', 'VIDROS – PROJETTA', 'PINTURA – EZEQUIEL', 'PINTURA – CELSO', 'ESQUADRIAS E LÂMINAS – ADEBLU', 'EDUARDO'].map(nome => ({ nome, itens: '' })),
});
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const segundaDe = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
const deIso = (t) => { const [a, m, d] = t.split('-').map(Number); return new Date(a, m - 1, d); };
const mesmoDia = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const linhaOS = (o) => `OS:${numOS(o)} – ${o.cliente?.nome || ''}${(o.ambientes || []).length ? ' – ' + o.ambientes.map(a => a.nome).join(', ') : ''}`;
// O que as OSs cadastradas trazem sozinhas para cada dia (entrega e prazos das etapas).
function eventosOS(lista, dia) {
  const ev = [];
  for (const o of lista || []) {
    if (mesmoDia(lerPrazo(o.prazoEntrega), dia) && !osConcluida(o)) ev.push({ o, t: 'entrega', txt: '🚚 Entrega' });
    const et = o.execucao?.etapas || {};
    for (const [k, t] of ETAPAS_FAB) if (et[k]?.prazo && mesmoDia(lerPrazo(et[k].prazo), dia) && et[k].status !== 'pronto') ev.push({ o, t: k, txt: t });
  }
  return ev;
}

function OSPicker({ lista, onPick }) {
  const [q, setQ] = useState(''); const [ab, setAb] = useState(false);
  const res = (lista || []).filter(o => !q || norm(linhaOS(o)).includes(norm(q))).slice(0, 40);
  const fechar = () => { setAb(false); setQ(''); };
  return html`<span class="opc-wrap"><button type="button" class="btn btn-ghost btn-sm" onClick=${() => setAb(true)}>+ OS</button>
    ${ab && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="card modal-caixa stack os-picker">
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">Escolher OS</div><button class="x-btn" onClick=${fechar}>✕</button></div>
        <input class="inp" autoFocus placeholder="Buscar cliente, nº da OS ou ambiente…" value=${q} onInput=${e => setQ(e.target.value)} onKeyDown=${e => e.key === 'Escape' && fechar()} />
        <div class="os-picker-lista">
          ${res.map(o => html`<button type="button" key=${o.id} class="opc-i" style=${{ borderLeft: '5px solid ' + corOS(o), background: corOS(o) + '10' }} onClick=${() => { onPick(linhaOS(o), o); fechar(); }}>
            <span><b>${numOS(o)}</b> — ${o.cliente?.nome || 'Cliente'}<small>${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'}${o.prazoEntrega ? ' · entrega ' + o.prazoEntrega : ''}</small></span></button>`)}
          ${!res.length && html`<div class="dim">Nenhuma OS encontrada.</div>`}
        </div>
      </div></div>`, document.body)}</span>`;
}
// Encontra as OSs citadas num texto da agenda (OS:26.098) e devolve as cores dos clientes.
function osCitadas(txt, lista) {
  const t = norm(txt); if (!t || !(lista || []).length) return [];
  const achadas = [];
  const soDig = (x) => String(x || '').replace(/\D/g, '');
  // 1) números de OS (novo 26.098, antigo 26.92 / 2694)
  for (const m of String(txt).matchAll(/(?:os\s*:?\s*)?(\d{2})\s*[.,]\s*(\d{1,4})|os\s*:?\s*(\d{3,6})/gi)) {
    const cod = m[3] ? m[3] : m[1] + m[2];
    const o = lista.find(o => soDig(o.numeroAntigo) === cod) || lista.find(o => soDig(numOS(o)) === (m[1] ? m[1] + m[2].padStart(3, '0') : cod));
    if (o) achadas.push(o);
  }
  // 2) nome do cliente (inteiro ou a parte antes do " - ")
  if (!achadas.length) {
    const vistos = new Set();
    for (const o of lista) {
      const nome = o.cliente?.nome || ''; const k = norm(nome); if (!k || vistos.has(k)) continue; vistos.add(k);
      const primeiro = norm(nome).split(' ')[0];
      const unico = primeiro.length >= 4 && !['casa', 'apto', 'apartamento', 'escritorio', 'loja', 'sala'].includes(primeiro) && lista.filter(x => norm(x.cliente?.nome).split(' ')[0] === primeiro && norm(x.cliente?.nome) !== k).length === 0;
      const chaves = [k, norm(nome.split(/\s[-–]\s/)[0]), unico ? primeiro : ''].filter(c => c.length >= 2);
      const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (chaves.some(c => new RegExp('(^|[^a-z0-9])' + esc(c) + (c === primeiro && unico ? '' : '([^a-z0-9]|$)')).test(t))) achadas.push(o);
    }
  }
  return achadas;
}
const corCelula = (txt, lista) => { const o = osCitadas(txt, lista)[0]; return o ? { background: corOS(o) + '1c', boxShadow: 'inset 4px 0 0 ' + corOS(o) } : undefined; };
const tagsOS = (txt, lista) => { const os = osCitadas(txt, lista); const vis = new Set(); const uni = os.filter(o => { const k = norm((o.cliente?.nome || '').split(/\s[-–]\s/)[0]); if (vis.has(k)) return false; vis.add(k); return true; }); return uni.length ? html`<div class="ag-tags">${uni.map(o => html`<span key=${o.id} role="button" style=${{ background: corOS(o), cursor: 'pointer' }} onClick=${() => window.__abrirOS && window.__abrirOS(o.id)}>${(o.cliente?.nome || '').split(/\s[-–]\s/)[0]}</span>`)}</div>` : null; };
const addLinha = (txt, l) => (txt ? txt.replace(/\s+$/, '') + '\n' : '') + l;

/* ---------- Tarefas com prazo final (cronograma do marceneiro) ---------- */
const isoD = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const deIsoD = (t) => { const [a, m, d] = String(t).split('-').map(Number); return new Date(a, m - 1, d); };
const fimSemana = (d) => d.getDay() === 0 || d.getDay() === 6;
const paraIso = (x) => { x = String(x || ''); if (/^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10); const d = lerPrazo(x); return d ? isoD(d) : ''; };
async function alertaAtraso(sessao, lista) {
  const { getDoc, updateDoc, increment } = F().fsMod; const linhas = [];
  for (const { t, n, fim, auto } of lista) {
    let prazo = '';
    if (t.osId) { try { const d = await getDoc(docRef('empresas', sessao.empresaId, 'os', t.osId)); prazo = paraIso(d.data()?.prazoEntrega); await updateDoc(d.ref, { diasAtraso: increment(n), ultimoAtraso: { dias: n, em: nowIso(), pessoa: t.pessoa, auto: !!auto } }); } catch {} }
    const estoura = prazo && fim > prazo;
    linhas.push((estoura ? '🔴 ' : '🟠 ') + [t.osCod, (t.cliente || t.texto || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ') + ' — +' + n + (n === 1 ? ' dia' : ' dias') + ' (' + t.pessoa + ', termina ' + dm(fim) + ')' + (prazo ? (estoura ? ' · PASSA do prazo de entrega ' + dm(prazo) : ' · prazo de entrega ' + dm(prazo)) : ''));
  }
  await escolher('Cliente em atraso', linhas.join('\n') + '\n\nQuando alguém terminar antes do prazo, o app vai perguntar se quer usar o dia para abater esse atraso.', [{ v: 'ok', t: 'Entendi', cls: 'btn-primary' }]);
}
function somaUteis(t, n) { const d = deIsoD(t); let k = Math.abs(n), s = Math.sign(n); while (k > 0) { d.setDate(d.getDate() + s); if (!fimSemana(d)) k--; } return isoD(d); }
function uteisEntre(a, b) { if (b <= a) return 0; let n = 0; const d = deIsoD(a); while (isoD(d) < b) { d.setDate(d.getDate() + 1); if (!fimSemana(d)) n++; } return n; }
const dm = (t) => t ? t.split('-').reverse().slice(0, 2).join('/') : '';

function useTarefas(sessao) {
  const [t, setT] = useState([]);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'tarefas'), s => setT(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setT([])), []);
  return t;
}
/* Resultado do prazo: compara o dia que concluiu com o prazo estipulado */
function resultadoPrazo(t) {
  const hoje = isoD(new Date()), prev = t.fimOriginal || t.fim;
  const dif = hoje === prev ? 0 : hoje > prev ? uteisEntre(prev, hoje) : -uteisEntre(hoje, prev);
  const txt = dif === 0 ? '✅ No prazo' : dif > 0 ? '⚠️ ' + dif + (dif === 1 ? ' dia' : ' dias') + ' a mais' : '⭐ ' + (-dif) + (dif === -1 ? ' dia' : ' dias') + ' antes';
  const pr = (t.prorrogacoes || []).filter(p => !p.auto);
  return { dif, txt, d: 'Prazo estipulado: ' + dm(prev) + (t.fim !== prev ? ' (ajustado p/ ' + dm(t.fim) + ')' : '') + ' · concluída ' + dm(hoje) + ' · ' + txt + (pr.length ? ' · prorrogações: ' + pr.map(p => '+' + p.dias + 'd ' + p.motivo).join('; ') : '') };
}
/* Escreve a tarefa nos dias da agenda semanal (linha da pessoa) */
async function escreverNaAgenda(sessao, grade, pessoa, ini, fim, linha) {
  const porSemana = {};
  for (let d = deIsoD(ini); isoD(d) <= fim; d.setDate(d.getDate() + 1)) {
    const wd = (d.getDay() + 6) % 7; if (wd > 4) continue;
    const sem = iso(segundaDe(d)); (porSemana[sem] = porSemana[sem] || []).push(wd);
  }
  const { getDoc, setDoc } = F().fsMod;
  for (const [sem, dias] of Object.entries(porSemana)) {
    const ref = docRef('empresas', sessao.empresaId, 'agenda', sem);
    const snap = await getDoc(ref);
    const ag = snap.exists() ? snap.data() : agendaPadrao(sem);
    ag.grades = ag.grades || {}; ag.grades[grade] = ag.grades[grade] || [];
    let row = ag.grades[grade].find(r => norm(r.nome) === norm(pessoa));
    if (!row) { row = { nome: pessoa, dias: ['', '', '', '', ''] }; ag.grades[grade].push(row); }
    row.dias = row.dias || ['', '', '', '', ''];
    dias.forEach(i => { const v = row.dias[i] || ''; if (!v.includes(linha)) row.dias[i] = (v ? v + '\n' : '') + linha; });
    await setDoc(ref, { ...ag, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
  }
  return Object.values(porSemana).reduce((n, d) => n + d.length, 0);
}
/* Tira da agenda as linhas desta tarefa (quando muda de dia/pessoa) */
async function removerDaAgenda(sessao, grade, pessoa, ini, fim, chave) {
  if (!chave) return;
  const sems = new Set();
  for (let d = deIsoD(ini); isoD(d) <= fim; d.setDate(d.getDate() + 1)) sems.add(iso(segundaDe(d)));
  const { getDoc, setDoc } = F().fsMod;
  for (const sem of sems) {
    const ref = docRef('empresas', sessao.empresaId, 'agenda', sem); const snap = await getDoc(ref); if (!snap.exists()) continue;
    const ag = snap.data(); const row = (ag.grades?.[grade] || []).find(r => norm(r.nome) === norm(pessoa)); if (!row) continue;
    let mudou = false;
    row.dias = (row.dias || []).map((v, i) => { const d = new Date(deIso(sem)); d.setDate(d.getDate() + i); const di = isoD(d); if (di < ini || di > fim) return v; const nv = String(v || '').split('\n').filter(l => !l.includes(chave)).join('\n'); if (nv !== v) mudou = true; return nv; });
    if (mudou) await setDoc(ref, { ...ag, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
  }
}
function NovaTarefa({ sessao, lista, pessoa: pessoa0, grade: grade0, inicio: inicio0, fechar, toast, osInicial, aoLancar }) {
  const inicio = inicio0 || isoD(new Date());
  const [pessoa, setPessoa] = useState(pessoa0 || '');
  const [grade, setGrade] = useState(grade0 || 'producao');
  const [nomes, setNomes] = useState({});
  const [tipoExec, setTipoExec] = useState('interno');
  const [equipeN, setEquipeN] = useState([]), [terc, setTerc] = useState([]);
  useEffect(() => { F().fsMod.getDocs(col('empresas', sessao.empresaId, 'usuarios')).then(s => setEquipeN(s.docs.map(d => d.data()).filter(u => u.ativo !== false).map(u => u.nome).filter(Boolean))).catch(() => {});
    F().fsMod.getDoc(docRef('empresas', sessao.empresaId)).then(d => setTerc((d.data()?.parceirosLista || []).map(p => p.nome).filter(Boolean))).catch(() => {}); }, []);
  useEffect(() => { if (pessoa0) return; F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(segundaDe(new Date())))).then(d => { const g = d.data()?.grades || {}; const m = {}; Object.keys(g).forEach(k => { m[k] = [...new Set((g[k] || []).map(r => r.nome).filter(Boolean))]; }); setNomes(m); }).catch(() => {}); }, []);
  const [osSel, setOsSel] = useState(osInicial || null);
  const [aviso, setAviso] = useState('');
  const avisar = (m) => { setAviso(m); toast(m); };
  const [q, setQ] = useState('');
  const [ini, setIni] = useState(inicio);
  const [fim, setFim] = useState(inicio);
  const [texto, setTexto] = useState('');
  const res = (lista || []).filter(o => !osConcluida(o) && (!q || norm(linhaOS(o) + ' ' + (o.numeroAntigo || '')).includes(norm(q)))).slice(0, 30);
  const salvar = async () => {
    if (!pessoa.trim()) return avisar('Escolha quem vai executar.');
    if (!osSel && !texto.trim()) return avisar('Escolha a OS ou escreva a tarefa.');
    if (fim < ini) return avisar('O prazo final não pode ser antes do início.');
    let iniF = ini, fimF = fim;
    try {
      const todas = (await F().fsMod.getDocs(col('empresas', sessao.empresaId, 'tarefas'))).docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'concluida');
      if (osSel) {
        const dup = todas.find(t => t.osId === osSel.id && t.grade === grade);
        if (dup) return avisar('Bloqueado: a OS ' + numOS(osSel) + ' já está neste cronograma com ' + dup.pessoa + ' (' + dm(dup.inicio) + ' a ' + dm(dup.fim) + '). Use ＋ Mais dias nela em vez de lançar de novo.');
        const junto = todas.find(t => t.osId === osSel.id && t.inicio <= fimF && t.fim >= iniF);
        if (junto) return avisar('Bloqueado: a OS ' + numOS(osSel) + ' já está com ' + junto.pessoa + ' de ' + dm(junto.inicio) + ' a ' + dm(junto.fim) + '. A mesma OS não pode estar em dois lugares ao mesmo tempo — escolha datas depois de ' + dm(junto.fim) + '.');
      }
      const choque = todas.filter(t => norm(t.pessoa) === norm(pessoa) && t.inicio <= fimF && t.fim >= iniF).sort((a, b) => a.fim.localeCompare(b.fim));
      if (choque.length) {
        const ult = choque[choque.length - 1];
        const dur = uteisEntre(iniF, fimF);
        const novoIni = somaUteis(ult.fim, 1), novoFim = somaUteis(novoIni, dur);
        const r = await escolher('Choque de datas', pessoa + ' já tem tarefa nesses dias:\n' + choque.map(t => '• ' + [t.osCod, t.cliente].filter(Boolean).join(' ') + ' (' + dm(t.inicio) + ' a ' + dm(t.fim) + ')').join('\n') + '\n\nUma tarefa não pode sobrepor a outra.',
          [{ v: 'depois', t: 'Começar depois: ' + dm(novoIni) + ' a ' + dm(novoFim), cls: 'btn-primary' }, { v: 'nao', t: 'Cancelar e escolher outras datas' }]);
        if (r !== 'depois') return avisar('Escolha outras datas ou outra pessoa.');
        iniF = novoIni; fimF = novoFim; setIni(novoIni); setFim(novoFim);
      }
    } catch (e) { return avisar('Não consegui conferir o cronograma: ' + e.message); }
    const ini2 = iniF, fim2 = fimF;
    try {
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'tarefas'), { pessoa, grade, inicio: ini2, fim: fim2, fimOriginal: fim2, texto: texto.trim(), osId: osSel?.id || '', osCod: osSel ? numOS(osSel) : '', cliente: osSel?.cliente?.nome || '', ambiente: osSel ? (osSel.ambientes || []).map(a => a.nome).join(', ') : '', status: 'andamento', prorrogacoes: [], quem: sessao.nome, em: nowIso() });
      if (osSel) registrar(sessao, osSel.id, '📅', 'Entrou no cronograma: ' + pessoa + ' · prazo ' + dm(fim2), 'De ' + dm(ini2) + ' a ' + dm(fim2) + ' (' + (uteisEntre(ini2, fim2) + 1) + ' dias úteis)' + (texto.trim() ? ' — ' + texto.trim() : ''));
      let nd = 0;
      if (!pessoa0) nd = await escreverNaAgenda(sessao, grade, pessoa.trim(), ini2, fim2, [osSel ? numOS(osSel) + ' ' + (osSel.cliente?.nome || '').split(/\s[-–]\s/)[0] : '', texto.trim()].filter(Boolean).join(' – '));
      toast('Lançado no cronograma de ' + pessoa + (nd ? ' · ' + nd + (nd === 1 ? ' dia escrito' : ' dias escritos') + ' (' + dm(ini2) + ' a ' + dm(fim2) + ')' : '') + '.', 'ok'); fechar(); aoLancar && aoLancar();
    } catch (e) { avisar('Não salvou: ' + e.message); }
  };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack nt-compacto" style=${{ width: 'min(460px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">📅 ${pessoa0 ? 'Nova tarefa · ' + pessoa0 : 'Enviar para o cronograma'}</div><button class="x-btn" onClick=${fechar}>✕</button></div>
      ${!pessoa0 && html`<div class="stack" style=${{ gap: '6px' }}>
        <span class="lbl">Qual cronograma?</span>
        <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${GRADES.map(([k, t]) => html`<button key=${k} class=${'pill' + (grade === k ? ' on' : '')} onClick=${() => { setGrade(k); setPessoa(''); }}>${t}</button>`)}</div>
        <span class="lbl">Quem vai executar?</span>
        <div class="fc-orig" style=${{ alignSelf: 'flex-start' }}><button class=${tipoExec === 'interno' ? 'on' : ''} onClick=${() => { setTipoExec('interno'); setPessoa(''); }}>👷 Internos</button><button class=${tipoExec === 'terceiro' ? 'on est' : ''} onClick=${() => { setTipoExec('terceiro'); setPessoa(''); }}>🤝 Terceirizados</button></div>
        ${(() => { const l = tipoExec === 'interno' ? [...new Set([...equipeN, ...(nomes[grade] || [])])] : terc; return l.length ? html`<div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${l.map(n => html`<button key=${n} class=${'pill' + (pessoa === n ? ' on' : '')} onClick=${() => { setPessoa(n); setAviso(''); }}>${n}</button>`)}</div>` : html`<small class="dim">${tipoExec === 'interno' ? 'Ninguém cadastrado na equipe.' : 'Nenhum terceirizado cadastrado (cadastre em Compras → Parceiros).'}</small>`; })()}
        ${false && (nomes[grade] || []).length > 0 && html`<div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${nomes[grade].map(n => html`<button key=${n} class=${'pill' + (pessoa === n ? ' on' : '')} onClick=${() => { setPessoa(n); setAviso(''); }}>${n}</button>`)}</div>`}
        <input class="inp" placeholder="Nome (ou escolha acima)" value=${pessoa} onInput=${e => setPessoa(e.target.value)} />
      </div>`}
      ${osSel ? html`<div class="tar-os" style=${{ '--cc': corOS(osSel) }}><b>${numOS(osSel)}</b> ${osSel.cliente?.nome} · ${(osSel.ambientes || []).map(a => a.nome).join(', ')} <button class="x-btn" onClick=${() => setOsSel(null)}>trocar</button></div>`
        : html`<input class="inp" autoFocus placeholder="🔍 Buscar OS (nº novo ou antigo, cliente, ambiente)" value=${q} onInput=${e => setQ(e.target.value)} />
          <div class="os-picker-lista" style=${{ maxHeight: '30vh' }}>${res.map(o => html`<button key=${o.id} class="opc-i" style=${{ borderLeft: '5px solid ' + corOS(o), background: corOS(o) + '10' }} onClick=${() => setOsSel(o)}><span><b>${numOS(o)}</b>${o.numeroAntigo ? html` <small style=${{ display: 'inline' }}>(antiga ${o.numeroAntigo})</small>` : ''} — ${o.cliente?.nome}<small>${(o.ambientes || []).map(a => a.nome).join(', ')}</small></span></button>`)}</div>`}
      <div class="grid2">
        <div class="field"><span class="lbl">Início</span><input class="inp" type="date" value=${ini} onInput=${e => { setIni(e.target.value); if (fim < e.target.value) setFim(e.target.value); }} /></div>
        <div class="field"><span class="lbl">📅 Prazo final de execução</span><input class="inp" type="date" value=${fim} min=${ini} onInput=${e => setFim(e.target.value)} /></div>
      </div>
      <div class="row" style=${{ gap: '5px' }}><span class="dim">Duração:</span>${[1, 2, 3, 5, 10].map(n => html`<button key=${n} class=${'pill' + (uteisEntre(ini, fim) + 1 === n ? ' on' : '')} onClick=${() => setFim(somaUteis(ini, n - 1))}>${n} ${n === 1 ? 'dia' : 'dias'}</button>`)}<span class="dim">(dias úteis)</span></div>
      <input class="inp" placeholder="O que vai ser feito (ex: produzir cristaleira, montar ilha)" value=${texto} onInput=${e => setTexto(e.target.value)} />
      ${aviso && html`<div class="error-box">⚠️ ${aviso}</div>`}
      <button class="btn btn-grande btn-verde btn-block" onClick=${salvar}>💾 Salvar no cronograma</button>
    </div></div>`, document.body);
}
function DetalheTarefa({ sessao, t, todas, fechar, toast }) {
  const [dias, setDias] = useState(1);
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState('');
  const hoje = isoD(new Date());
  const atrasada = t.status !== 'concluida' && t.fim < hoje;
  const usarSobra = async () => {
    const hoje = isoD(new Date()); if (!(hoje < t.fim)) return;
    const sobra = uteisEntre(hoje, t.fim); if (sobra <= 0) return;
    const minhas = todas.filter(x => x.id !== t.id && norm(x.pessoa) === norm(t.pessoa) && x.status !== 'concluida' && x.inicio > hoje).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const atrasadas = todas.filter(x => x.id !== t.id && x.status !== 'concluida' && norm(x.pessoa) !== norm(t.pessoa) && ((x.prorrogacoes || []).some(p => !p.auto) || x.fim < hoje));
    const ops = [...(minhas.length ? [{ v: 'antecipar', t: '⏩ Adiantar as próximas tarefas de ' + t.pessoa + ' em ' + sobra + (sobra === 1 ? ' dia' : ' dias'), d: minhas.slice(0, 3).map(x => (x.osCod || x.texto) + ' ' + dm(x.inicio)).join(' · '), cls: 'btn-primary' }] : []),
      ...atrasadas.slice(0, 6).map(x => ({ v: 'ajudar:' + x.id, t: '🤝 Ajudar ' + [x.osCod, (x.cliente || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ') + ' (' + x.pessoa + ')', d: 'Abate até ' + sobra + ' dia(s) do atraso · termina ' + dm(x.fim) + ((x.prorrogacoes || []).filter(p => !p.auto).length ? ' · teve +' + (x.prorrogacoes || []).filter(p => !p.auto).reduce((a, p) => a + (p.dias || 0), 0) + 'd' : '') })),
      { v: 'nao', t: 'Não usar agora' }];
    const r = await escolher('Terminou antes!', t.pessoa + ' terminou ' + sobra + (sobra === 1 ? ' dia útil' : ' dias úteis') + ' antes do prazo (' + dm(t.fim) + ').\nQuer usar esse tempo para buscar prazo?', ops);
    if (!r || r === 'nao') return;
    const { writeBatch } = F().fsMod; const b = writeBatch(F().db); const E = sessao.empresaId; const amanha = somaUteis(hoje, 1);
    b.update(docRef('empresas', E, 'tarefas', t.id), { fim: hoje, fimPlanejado: t.fim });
    if (t.osCod) removerDaAgenda(sessao, t.grade, t.pessoa, amanha, t.fim, t.osCod).catch(() => {});
    if (r === 'antecipar') {
      for (const x of minhas) { const ni = somaUteis(x.inicio, -sobra) < amanha ? amanha : somaUteis(x.inicio, -sobra); const d = uteisEntre(ni, x.inicio); if (d <= 0) continue; const nf = somaUteis(x.fim, -d);
        b.update(docRef('empresas', E, 'tarefas', x.id), { inicio: ni, fim: nf, antecipacoes: [...(x.antecipacoes || []), { dias: d, em: nowIso(), quem: sessao.nome, motivo: 'Terminou antes: ' + (t.osCod || t.texto) }] });
        if (x.osCod) { removerDaAgenda(sessao, x.grade, x.pessoa, x.inicio, x.fim, x.osCod).catch(() => {}); escreverNaAgenda(sessao, x.grade, x.pessoa, ni, nf, [x.osCod, (x.cliente || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ')).catch(() => {}); }
        registrar(sessao, x.osId, '⏩', 'Adiantado ' + d + 'd (' + x.pessoa + '): ' + dm(x.inicio) + ' → ' + dm(ni), t.pessoa + ' terminou ' + (t.osCod || '') + ' antes'); }
      await b.commit(); toast('Próximas tarefas de ' + t.pessoa + ' adiantadas ' + sobra + ' dia(s).', 'ok'); return;
    }
    const x = todas.find(y => y.id === r.split(':')[1]); if (!x) return;
    const k = Math.min(sobra, Math.max(1, uteisEntre(x.inicio > hoje ? x.inicio : hoje, x.fim)));
    const nf = somaUteis(x.fim, -k) < hoje ? hoje : somaUteis(x.fim, -k);
    b.update(docRef('empresas', E, 'tarefas', x.id), { fim: nf, ajudas: [...(x.ajudas || []), { pessoa: t.pessoa, dias: k, de: amanha, em: nowIso(), quem: sessao.nome }] });
    await b.commit();
    const linha = [x.osCod, (x.cliente || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ') || x.texto;
    if (x.osCod) removerDaAgenda(sessao, x.grade, x.pessoa, somaUteis(nf, 1), x.fim, x.osCod).catch(() => {});
    escreverNaAgenda(sessao, t.grade, t.pessoa, amanha, somaUteis(amanha, k - 1), linha + ' (ajuda)').catch(() => {});
    registrar(sessao, x.osId, '🤝', t.pessoa + ' ajuda ' + x.pessoa + ' — abate ' + k + 'd', 'Termina ' + dm(x.fim) + ' → ' + dm(nf));
    toast(t.pessoa + ' vai ajudar ' + linha + '. Prazo ' + dm(x.fim) + ' → ' + dm(nf) + '.', 'ok');
  };
  const concluir = async (v) => { let mot = ''; if (!v) { mot = await pedirMotivo('Reabrir tarefa'); if (!mot) return; } { const rp = v ? resultadoPrazo(t) : null; registrar(sessao, t.osId, v ? (rp.dif > 0 ? '⚠️' : '✅') : '↺', v ? 'Concluída (' + t.pessoa + ') — ' + rp.txt : 'Tarefa reaberta: ' + t.pessoa, v ? rp.d : mot); } try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { status: v ? 'concluida' : 'andamento', concluidaEm: v ? nowIso() : '', concluidaPor: v ? sessao.nome : '' }); toast(v ? 'Tarefa concluída.' : 'Tarefa reaberta.', 'ok'); fechar(); if (v) usarSobra().catch(e => toast(e.message, 'erro')); } catch (e) { toast(e.message, 'erro'); } };
  const excluir = async () => { const mot = await pedirMotivo('Excluir do cronograma', 'A tarefa sai do cronograma de ' + t.pessoa + '. Informe o motivo.'); if (!mot) return; registrar(sessao, t.osId, '🗑', 'Excluída do cronograma: ' + t.pessoa + ' (' + dm(t.inicio) + ' a ' + dm(t.fim) + ')', mot); try { await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id)); if (t.osCod) removerDaAgenda(sessao, t.grade, t.pessoa, t.inicio, t.fim, t.osCod).catch(() => {}); fechar(); } catch (e) { toast(e.message, 'erro'); } };
  const [mv, setMv] = useState({ pessoa: t.pessoa, grade: t.grade || 'producao', inicio: t.inicio, fim: t.fim, motivo: '' });
  const [nomesMv, setNomesMv] = useState([]);
  useEffect(() => { F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(segundaDe(new Date())))).then(d => { const g = d.data()?.grades?.[mv.grade] || []; setNomesMv([...new Set(g.map(r => r.nome).filter(Boolean))]); }).catch(() => {}); }, [mv.grade]);
  const mover = async () => {
    if (mv.motivo.trim().length < 5) return toast('O motivo é obrigatório (pelo menos 5 letras).');
    if (!mv.pessoa.trim()) return toast('Escolha quem vai executar.');
    if (mv.fim < mv.inicio) return toast('O prazo final não pode ser antes do início.');
    if (mv.pessoa === t.pessoa && mv.grade === t.grade && mv.inicio === t.inicio && mv.fim === t.fim) return toast('Nada mudou.');
    const junto = t.osId && todas.find(x => x.id !== t.id && x.status !== 'concluida' && x.osId === t.osId && x.inicio <= mv.fim && x.fim >= mv.inicio);
    if (junto) return toast('Bloqueado: a OS já está com ' + junto.pessoa + ' de ' + dm(junto.inicio) + ' a ' + dm(junto.fim) + '. Não pode estar em dois lugares ao mesmo tempo.', 'erro');
    const choque = todas.filter(x => x.id !== t.id && x.status !== 'concluida' && norm(x.pessoa) === norm(mv.pessoa) && x.inicio <= mv.fim && x.fim >= mv.inicio);
    if (choque.length) return toast('Bloqueado: ' + mv.pessoa + ' já tem ' + choque.map(x => (x.osCod || x.texto) + ' (' + dm(x.inicio) + ' a ' + dm(x.fim) + ')').join(', ') + '.');
    try {
      await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { pessoa: mv.pessoa.trim(), grade: mv.grade, inicio: mv.inicio, fim: mv.fim, mudancas: [...(t.mudancas || []), { de: { pessoa: t.pessoa, inicio: t.inicio, fim: t.fim }, para: { pessoa: mv.pessoa.trim(), inicio: mv.inicio, fim: mv.fim }, motivo: mv.motivo.trim(), quem: sessao.nome, em: nowIso() }] });
      const linha = [t.osCod, (t.cliente || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ') || t.texto;
      if (t.osCod) await removerDaAgenda(sessao, t.grade, t.pessoa, t.inicio, t.fim, t.osCod);
      await escreverNaAgenda(sessao, mv.grade, mv.pessoa.trim(), mv.inicio, mv.fim, linha);
      registrar(sessao, t.osId, '↔️', 'Mudou no cronograma: ' + t.pessoa + ' ' + dm(t.inicio) + '–' + dm(t.fim) + ' → ' + mv.pessoa.trim() + ' ' + dm(mv.inicio) + '–' + dm(mv.fim), mv.motivo.trim());
      toast('Tarefa movida.', 'ok'); fechar();
    } catch (e) { toast('Não moveu: ' + e.message, 'erro'); }
  };
  const prorrogar = async () => {
    if (motivo.trim().length < 5) return toast('O motivo é obrigatório (pelo menos 5 letras).');
    const novoFim = novaData || somaUteis(t.fim, dias);
    const n = uteisEntre(t.fim, novoFim);
    if (n <= 0) return toast('Escolha uma data depois de ' + dm(t.fim) + '.');
    const { writeBatch } = F().fsMod; const b = writeBatch(F().db);
    const reg = { dias: n, motivo: motivo.trim(), quem: sessao.nome, em: nowIso(), fimAntes: t.fim, fimDepois: novoFim };
    b.update(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { fim: novoFim, prorrogacoes: [...(t.prorrogacoes || []), reg] });
    // empurra as tarefas seguintes da mesma pessoa
    const seguintes = todas.filter(x => x.id !== t.id && x.pessoa === t.pessoa && x.status !== 'concluida' && x.inicio > t.fim);
    seguintes.forEach(x => b.update(docRef('empresas', sessao.empresaId, 'tarefas', x.id), { inicio: somaUteis(x.inicio, n), fim: somaUteis(x.fim, n), prorrogacoes: [...(x.prorrogacoes || []), { dias: n, motivo: 'Ajuste automático: ' + (t.cliente || t.texto) + ' atrasou (' + motivo.trim() + ')', quem: sessao.nome, em: nowIso(), fimAntes: x.fim, fimDepois: somaUteis(x.fim, n), auto: true }] }));
    registrar(sessao, t.osId, '⏳', `Prazo prorrogado +${n}d (${t.pessoa}): ${dm(t.fim)} → ${dm(novoFim)}`, motivo.trim()); seguintes.forEach(x => registrar(sessao, x.osId, '⏳', `Prazo ajustado +${n}d (${x.pessoa})`, 'Atraso em ' + (t.cliente || t.texto)));
    try { await b.commit(); if (t.grade && t.pessoa) escreverNaAgenda(sessao, t.grade, t.pessoa, somaUteis(t.fim, 1), novoFim, [t.osCod, (t.cliente || '').split(/\s[-–]\s/)[0]].filter(Boolean).join(' ') || t.texto || 'Tarefa').catch(() => {}); fechar();
      alertaAtraso(sessao, [{ t, n, fim: novoFim }, ...seguintes.map(x => ({ t: x, n, fim: somaUteis(x.fim, n), auto: true }))]); } catch (e) { toast(e.message, 'erro'); }
  };
  const seguintesPrev = todas.filter(x => x.id !== t.id && x.pessoa === t.pessoa && x.status !== 'concluida' && x.inicio > t.fim && x.inicio >= t.inicio);
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack" style=${{ width: 'min(520px,100%)', '--cc': t.cliente ? corCliente(t.cliente) : '#57534e' }}>
      <div class="tar-cab"><div><b>${t.cliente || 'Tarefa'}</b><small>${[t.osCod, t.ambiente].filter(Boolean).join(' · ')}</small></div><button class="x-btn" style=${{ color: '#fff' }} onClick=${fechar}>✕</button></div>
      ${t.texto && html`<div>${t.texto}</div>`}
      <div class="tar-datas"><span>👷 <b>${t.pessoa}</b></span><span>▶ ${dm(t.inicio)}</span><span class=${atrasada ? 'vermelho' : ''}>📅 prazo <b>${dm(t.fim)}</b>${t.fimOriginal && t.fimOriginal !== t.fim ? html` <s class="dim">${dm(t.fimOriginal)}</s>` : ''}</span>
        <span>${t.status === 'concluida' ? '✅ Concluída' : atrasada ? '⚠ Atrasada' : '⏳ Em execução'}</span></div>
      ${t.status !== 'concluida' ? html`
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-grande btn-verde" style=${{ flex: 1 }} onClick=${() => concluir(true)}>✓ Concluída</button>
          <button class=${'btn btn-grande' + (atrasada ? ' btn-marrom' : '')} style=${{ flex: 1 }} onClick=${() => setModo(modo === 'mais' ? '' : 'mais')}>＋ Mais dias</button>
          <button class="btn btn-grande" style=${{ flex: 1 }} onClick=${() => setModo(modo === 'mover' ? '' : 'mover')}>↔️ Mudar dia / profissional</button>
        </div>
        ${modo === 'mover' && html`<div class="dia-box">
          <span class="lbl">Cronograma</span>
          <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${GRADES.map(([k, tt]) => html`<button key=${k} class=${'pill' + (mv.grade === k ? ' on' : '')} onClick=${() => setMv({ ...mv, grade: k })}>${tt}</button>`)}</div>
          <span class="lbl">Profissional</span>
          ${nomesMv.length > 0 && html`<div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${nomesMv.map(n => html`<button key=${n} class=${'pill' + (mv.pessoa === n ? ' on' : '')} onClick=${() => setMv({ ...mv, pessoa: n })}>${n}</button>`)}</div>`}
          <input class="inp" value=${mv.pessoa} onInput=${e => setMv({ ...mv, pessoa: e.target.value })} />
          <div class="grid2"><div class="field"><span class="lbl">Início</span><input class="inp" type="date" value=${mv.inicio} onInput=${e => { const ni = e.target.value; const dur = uteisEntre(mv.inicio, mv.fim); setMv({ ...mv, inicio: ni, fim: somaUteis(ni, dur) }); }} /></div>
            <div class="field"><span class="lbl">Prazo final</span><input class="inp" type="date" min=${mv.inicio} value=${mv.fim} onInput=${e => setMv({ ...mv, fim: e.target.value })} /></div></div>
          <textarea class="inp" rows="2" placeholder="Motivo da mudança (obrigatório)" value=${mv.motivo} onInput=${e => setMv({ ...mv, motivo: e.target.value })}></textarea>
          <button class="btn btn-grande btn-verde btn-block" onClick=${mover}>💾 Salvar mudança</button>
        </div>`}
        ${modo === 'mais' && html`<div class="dia-box">
          <span class="lbl">Quantos dias a mais? (dias úteis)</span>
          <div class="row" style=${{ gap: '5px' }}>${[1, 2, 3, 5].map(n => html`<button key=${n} class=${'pill' + (!novaData && dias === n ? ' on' : '')} onClick=${() => { setDias(n); setNovaData(''); }}>+${n}</button>`)}
            <span class="dim">ou nova data:</span><input class="inp inp-sm" style=${{ width: 'auto' }} type="date" min=${t.fim} value=${novaData} onInput=${e => setNovaData(e.target.value)} /></div>
          <div class="dim">Novo prazo: <b>${dm(novaData || somaUteis(t.fim, dias))}</b>${seguintesPrev.length ? html` · também empurra <b>${seguintesPrev.length}</b> tarefa(s) seguinte(s) de ${t.pessoa}` : ''}</div>
          <textarea class="inp" rows="2" placeholder="Motivo (obrigatório): ex. faltou chapa, retrabalho na pintura…" value=${motivo} onInput=${e => setMotivo(e.target.value)}></textarea>
          <button class="btn btn-grande btn-marrom btn-block" onClick=${prorrogar}>Confirmar novo prazo</button>
        </div>`}` : html`<button class="btn" onClick=${() => concluir(false)}>↺ Reabrir tarefa</button>`}
      ${(t.prorrogacoes || []).length > 0 && html`<details open><summary class="dim">Prorrogações (${t.prorrogacoes.length})</summary>${t.prorrogacoes.map((p, i) => html`<div key=${i} class="tar-prorr">+${p.dias}d · ${dm(p.fimAntes)} → ${dm(p.fimDepois)} · ${p.motivo}<small>${p.quem} · ${fmtData(p.em)}</small></div>`)}</details>`}
      <button class="btn btn-danger" onClick=${excluir}>🗑 Excluir do cronograma</button>
    </div></div>`, document.body);
}

function AgendaSemana({ sessao, lista, semana, setSemana, toast }) {
  const [grupoSel, setGrupoSel0] = useState(() => { if (window.__focoAgenda) return 'todos'; try { return localStorage.getItem('osm_grupo') || 'producao'; } catch { return 'producao'; } });
  const [editCat, setEditCat] = useState(false);
  const setGrupoSel = (k) => { setGrupoSel0(k); try { localStorage.setItem('osm_grupo', k); } catch {} };
  const tarefas = useTarefas(sessao);
  const [novaT, setNovaT] = useState(null);
  const [verT, setVerT] = useState(null);
  const [doc, setDoc] = useState(undefined);
  const [sujo, setSujo] = useState(false);
  const [importando, setImportando] = useState('');
  const inp = useRef(null);
  const ref = docRef('empresas', sessao.empresaId, 'agenda', semana);
  useEffect(() => {
    setDoc(undefined); setSujo(false);
    return F().fsMod.onSnapshot(ref, d => { if (!sujoRef.current) setDoc(d.exists() ? d.data() : null); });
  }, [semana]);
  const sujoRef = useRef(false); sujoRef.current = sujo;
  useEffect(() => {
    const f = window.__focoAgenda; if (!f || !doc) return;
    setTimeout(() => {
      const el = f.p ? document.querySelector(`td[data-p="${f.p}"][data-d="${f.d}"]`) || document.querySelector(`td[data-p="${f.p}"]`) : document.querySelector(`td[data-d="${f.d}"]`);
      if (el) { const tr = el.closest('tr'); el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); tr && tr.classList.add('foco-linha'); el.classList.add('foco-cel'); setTimeout(() => { tr && tr.classList.remove('foco-linha'); el.classList.remove('foco-cel'); }, 4000); }
      window.__focoAgenda = null;
    }, 400);
  }, [doc]);
  const salvoRef = useRef(null);
  useEffect(() => { if (!sujo && doc) salvoRef.current = doc; }, [doc, sujo]);
  const logCitacoes = (antes, depois) => {
    try {
      GRADES.forEach(([k, tit]) => (depois?.grades?.[k] || []).forEach((r, ri) => (r.dias || []).forEach((v, di) => {
        if (!String(v || '').trim()) return;
        const velho = antes?.grades?.[k]?.[ri]?.dias?.[di] || '';
        const ja = new Set(osCitadas(velho, lista).map(o => o.id));
        const novas = osCitadas(v, lista).filter(o => !ja.has(o.id));
        const d = new Date(deIso(semana)); d.setDate(d.getDate() + di);
        registrarVarias(sessao, novas, '📅', 'Entrou no cronograma: ' + String(tit).replace(/^\S+ /, '') + (r.nome ? ' · ' + r.nome : '') + ' · ' + dm(isoD(d)), String(v).split('\n')[0].slice(0, 120));
      })));
    } catch {}
  };
  useEffect(() => {
    if (!sujo || !doc) return;
    const t = setTimeout(async () => { try { await F().fsMod.setDoc(ref, { ...doc, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); logCitacoes(salvoRef.current, doc); salvoRef.current = doc; setSujo(false); } catch (e) { toast('Não salvou a agenda: ' + e.message, 'erro'); } }, 900);
    return () => clearTimeout(t);
  }, [doc, sujo]);
  const mudar = (fn) => { setDoc(d => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n; }); setSujo(true); };
  const seg = deIso(semana);
  const diasD = DIAS_SEM.map((_, i) => { const d = new Date(seg); d.setDate(d.getDate() + i); return d; });
  const mover = (n) => { const d = new Date(seg); d.setDate(d.getDate() + 7 * n); setSemana(iso(d)); };
  const criar = async (copiar) => {
    let base = agendaPadrao(semana);
    if (copiar) {
      const ant = new Date(seg); ant.setDate(ant.getDate() - 7);
      const a = await F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(ant)));
      if (a.exists()) { const x = a.data(); base = { ...base, grades: Object.fromEntries(Object.entries(x.grades || {}).map(([k, rows]) => [k, rows.map(r => ({ nome: r.nome, dias: ['', '', '', '', ''] }))])), fornecedores: (x.fornecedores || []).map(f => ({ nome: f.nome, itens: f.itens })), listas: { liberado: x.listas?.liberado || '', prontoMontagem: x.listas?.prontoMontagem || '' }, prioridades: x.prioridades || '' }; }
      else toast('Não achei a semana anterior; criei no modelo padrão.');
    }
    setDoc(base); setSujo(true);
  };
  const importar = async (file) => {
    if (!file) return;
    try {
      setImportando('Lendo ' + file.name + '…');
      let r;
      if (file.name.toLowerCase().endsWith('.docx')) {
        // Mantém as tabelas (dias da semana em colunas) para a IA entender.
        const h = await mammoth.convertToHtml({ arrayBuffer: await lerArrayBuffer(file) });
        const dv = document.createElement('div'); dv.innerHTML = h.value;
        dv.querySelectorAll('table').forEach(t => { const txt = [...t.rows].map(tr => [...tr.cells].map(c => c.innerText.replace(/\s*\n\s*/g, ' / ').trim()).join(' | ')).join('\n'); const pre = document.createElement('p'); pre.textContent = '\n[TABELA]\n' + txt + '\n[/TABELA]\n'; t.replaceWith(pre); });
        r = { texto: dv.innerText, imagens: [] };
      } else r = await extrairArquivo(file);
      setImportando('A IA está montando a agenda…');
      const res = await chamarIA('agenda_semana', { texto: r.texto, temImagens: (r.imagens || []).length > 0, modelo: agendaPadrao(semana) }, r.imagens || []);
      const n = { ...agendaPadrao(semana), ...res, semana };
      Object.keys(n.grades || {}).forEach(k => { n.grades[k] = (n.grades[k] || []).map(x => ({ nome: String(x.nome || ''), dias: [0, 1, 2, 3, 4].map(i => String((x.dias || [])[i] || '')) })); });
      n.fornecedores = (n.fornecedores || []).map(f => ({ nome: String(f.nome || ''), itens: Array.isArray(f.itens) ? f.itens.join('\n') : String(f.itens || '') }));
      Object.keys(n.listas || {}).forEach(k => { if (Array.isArray(n.listas[k])) n.listas[k] = n.listas[k].join('\n'); });
      if (Array.isArray(n.prioridades)) n.prioridades = n.prioridades.join('\n');
      if (res.semanaDetectada && /^\d{4}-\d{2}-\d{2}$/.test(res.semanaDetectada) && res.semanaDetectada !== semana) toast('O arquivo parece ser da semana de ' + deIso(res.semanaDetectada).toLocaleDateString('pt-BR') + '. Troque a semana se quiser salvar lá.');
      setDoc(n); setSujo(true); toast('Agenda importada. Confira.', 'ok');
    } catch (e) { toast('Não importou: ' + e.message, 'erro'); }
    setImportando('');
  };
  const autoDia = (i, filtro) => eventosOS(lista, diasD[i]).filter(filtro);
  const tituloSemana = diasD[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' a ' + diasD[4].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return html`
    <div class="stack">
      ${novaT && html`<${NovaTarefa} sessao=${sessao} lista=${lista} pessoa=${novaT.pessoa} grade=${novaT.grade} inicio=${novaT.inicio} toast=${toast} fechar=${() => setNovaT(null)} />`}
      ${verT && html`<${DetalheTarefa} sessao=${sessao} t=${tarefas.find(x => x.id === verT.id) || verT} todas=${tarefas} toast=${toast} fechar=${() => setVerT(null)} />`}
      <div class="card page-card row" style=${{ justifyContent: 'space-between' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${() => mover(-1)}>‹</button>
          <b style=${{ fontSize: '17px' }}>Semana ${tituloSemana}</b>
          <button class="btn btn-sm" onClick=${() => mover(1)}>›</button>
          <button class="btn btn-sm btn-ghost" onClick=${() => setSemana(iso(segundaDe(new Date())))}>Hoje</button>
          <span class="dim">${sujo ? 'Salvando…' : doc ? 'Salvo ✓' : ''}</span>
        </div>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" disabled=${!!importando} onClick=${() => inp.current?.click()}>${importando || '⬆ Importar agenda (Word/PDF/foto)'}</button>
          <input ref=${inp} type="file" hidden accept=".docx,.pdf,.xlsx,.txt,image/*" onChange=${e => { importar(e.target.files[0]); e.target.value = ''; }} />
          <button class="btn btn-sm btn-danger" onClick=${async () => {
            const fimSem = isoD(new Date(deIso(semana).getTime() + 6 * 864e5));
            const daSemana = (tarefas || []).filter(t => t.inicio <= fimSem && t.fim >= semana);
            const r = await escolher('Apagar cronograma', 'Semana de ' + dm(semana) + ' a ' + dm(fimSem) + '.\n' + (doc ? 'Tem texto escrito na agenda. ' : '') + daSemana.length + ' tarefa(s) lançadas nesta semana.\nIsso não pode ser desfeito.',
              [{ v: 'tudo', t: '🗑 Apagar a semana inteira (agenda + tarefas)', cls: 'btn-danger' }, { v: 'agenda', t: 'Apagar só o texto da agenda' }, { v: 'tar', t: 'Apagar só as tarefas (' + daSemana.length + ')' }, { v: 'nao', t: 'Cancelar' }]);
            if (r === 'nao' || !r) return;
            if (r === 'geral') {
              if ((await escolher('Zerar tudo?', 'Vai apagar TODAS as semanas da agenda e TODAS as tarefas. Não pode ser desfeito.', [{ v: 'sim', t: 'Sim, zerar o cronograma', cls: 'btn-danger' }, { v: 'nao', t: 'Cancelar' }])) !== 'sim') return;
              try {
                const { getDocs, writeBatch } = F().fsMod; sujoRef.current = false; setSujo(false);
                const docs = [...(await getDocs(col('empresas', sessao.empresaId, 'agenda'))).docs, ...(await getDocs(col('empresas', sessao.empresaId, 'tarefas'))).docs];
                for (let i = 0; i < docs.length; i += 400) { const b = writeBatch(F().db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
                setDoc(null); toast('Cronograma zerado: ' + docs.length + ' registros apagados.', 'ok');
              } catch (e) { toast('Não apagou: ' + e.message, 'erro'); }
              return;
            }
            if (r === 'todas' && (await escolher('Tem certeza?', 'Vai apagar ' + (tarefas || []).length + ' tarefas de todo o cronograma.', [{ v: 'sim', t: 'Sim, apagar todas', cls: 'btn-danger' }, { v: 'nao', t: 'Cancelar' }])) !== 'sim') return;
            try {
              const { writeBatch } = F().fsMod; const b = writeBatch(F().db);
              if (r === 'tudo' || r === 'agenda') { b.delete(ref); sujoRef.current = false; setSujo(false); }
              const alvo = r === 'todas' ? (tarefas || []) : (r === 'tudo' || r === 'tar') ? daSemana : [];
              alvo.slice(0, 450).forEach(t => b.delete(docRef('empresas', sessao.empresaId, 'tarefas', t.id)));
              await b.commit(); setSujo(false); if (r === 'tudo' || r === 'agenda') setDoc(null);
              toast('Cronograma apagado.', 'ok');
            } catch (e) { toast('Não apagou: ' + e.message, 'erro'); }
          }}>🗑 Apagar</button>
          ${doc && html`<button class="btn btn-sm" onClick=${() => { document.body.classList.add('imp-agenda'); setTimeout(() => { window.print(); document.body.classList.remove('imp-agenda'); }, 100); }}>🖨 Imprimir</button>`}
        </div>
      </div>

      ${doc === undefined ? html`<div class="card">Carregando…</div>` : doc === null ? html`
        <div class="card page-card stack" style=${{ alignItems: 'center', textAlign: 'center' }}>
          <b>Esta semana ainda não tem agenda.</b>
          <div class="dim">As entregas e prazos das OSs cadastradas já aparecem sozinhos quando você criar.</div>
          <div class="row"><button class="btn btn-marrom" onClick=${() => criar(true)}>Criar copiando equipes da semana anterior</button><button class="btn" onClick=${() => criar(false)}>Criar no modelo padrão</button></div>
        </div>` : html`
        <div class="agenda-print">
          <div class="card page-card stack">
            <div class="sec-title">⭐ Prioridades da semana</div>
            <textarea class="inp" rows="2" placeholder="Uma por linha" value=${doc.prioridades || ''} onInput=${e => mudar(d => { d.prioridades = e.target.value; })}></textarea>
          </div>
          <div class="grupos-crono">${[['todos', '📋 Todos'], ...GRADES.map(([k, t]) => [k, t])].map(([k, t]) => html`<button key=${k} class=${'grupo-b' + (grupoSel === k ? ' on' : '')} style=${k !== 'todos' ? { '--gc': corGrade(k) } : null} onClick=${() => setGrupoSel(k)}>${t}${k !== 'todos' ? html`<small>${(doc.grades?.[k] || []).reduce((n, r) => n + (r.dias || []).filter(v => String(v || '').trim()).length, 0)}</small>` : ''}</button>`)}
            ${sessao.papel === 'admin' && html`<button class="grupo-b grupo-edit" onClick=${() => setEditCat(true)}>✏️ Categorias</button>`}<${BotaoMetricas} sessao=${sessao} /></div>
          ${editCat && html`<${EditorCategorias} sessao=${sessao} toast=${toast} fechar=${() => setEditCat(false)} />`}
          ${GRADES.filter(([k]) => grupoSel === 'todos' || grupoSel === k).map(([k, t, rot]) => html`
            <div key=${k} class="card page-card stack">
              <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${t}</div>
                <button class="btn btn-sm btn-ghost" onClick=${() => mudar(d => { d.grades[k] = [...(d.grades[k] || []), { nome: '', dias: ['', '', '', '', ''] }]; })}>+ ${rot}</button></div>
              <div class="ag-scroll"><table class="ag">
                <thead><tr><th class="ag-nome"></th>${diasD.map((d, i) => html`<th key=${i} class=${mesmoDia(d, new Date()) ? 'hoje' : ''}>${DIAS_SEM[i].toUpperCase()} – ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</th>`)}</tr></thead>
                <tbody>
                  ${(k === 'entregas' || k === 'montagem') && html`<tr class="ag-auto"><td class="ag-nome">📌 Das OSs</td>${diasD.map((_, i) => html`<td key=${i}>${autoDia(i, e => k === 'entregas' ? e.t === 'entrega' : e.t === 'montagem').map((e, j) => html`<div key=${j} class=${'ag-chip' + (e.o.entregaFeita ? ' feito' : '')} style=${{ borderLeftColor: corOS(e.o), background: corOS(e.o) + '14' }}>${e.txt}: <b>${numOS(e.o)}</b> ${e.o.cliente?.nome}
                        <button class=${'cel-ok' + (e.o.entregaFeita ? ' on' : '')} onClick=${async () => { let mot = ''; if (e.o.entregaFeita) { mot = await pedirMotivo('Reabrir entrega', 'A entrega já foi marcada como feita. Informe o motivo.'); if (!mot) return; } registrar(sessao, e.o.id, e.o.entregaFeita ? '↺' : '🚚', e.o.entregaFeita ? 'Entrega reaberta' : 'Entrega concluída', mot); try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', e.o.id), { entregaFeita: e.o.entregaFeita ? null : { por: sessao.nome, em: nowIso() } }); } catch (er) { toast(er.message, 'erro'); } }}>${e.o.entregaFeita ? '✓ Entregue' : '✓ Concluir'}</button></div>`)}</td>`)}</tr>`}
                  ${(doc.grades?.[k] || []).map((r, ri) => html`<tr key=${ri}>
                    <td class="ag-nome"><input class="ag-inp" value=${r.nome} placeholder=${rot} onInput=${e => mudar(d => { d.grades[k][ri].nome = e.target.value; })} />
                      <button class="x-btn" title="Remover linha" onClick=${() => mudar(d => { d.grades[k].splice(ri, 1); })}>×</button></td>
                    ${r.dias.map((v, di) => { const dISO = isoD(diasD[di]); const tsk = tarefas.filter(t => norm(t.pessoa) === norm(r.nome) && t.inicio <= dISO && t.fim >= dISO); return html`<td key=${di} data-p=${norm(r.nome)} data-d=${dISO} style=${corCelula(v, lista)}>
                      ${tsk.map(t => { const c = t.cliente ? corCliente(t.cliente) : '#57534e'; const atr = t.status !== 'concluida' && t.fim < isoD(new Date()); const ult = t.fim === dISO; return html`<button key=${t.id} class=${'tar-bar' + (t.status === 'concluida' ? ' ok' : '') + (atr ? ' atr' : '') + (t.inicio === dISO ? ' ini' : '') + (ult ? ' fim' : '')} style=${{ '--cc': c }} onClick=${() => setVerT(t)} title=${(t.cliente || '') + ' ' + (t.texto || '')}>
                        ${t.inicio === dISO || di === 0 ? html`<b>${(t.cliente || t.texto || '').split(/\s[-–]\s/)[0]}</b> <small>${t.ambiente || t.texto}</small>` : html`<small>…</small>`}
                        ${ult ? html`<em>${t.status === 'concluida' ? '✓' : atr ? '⚠' : '📅'} ${dm(t.fim)}</em>` : ''}</button>
                        ${ult && t.status !== 'concluida' ? html`<button class="cel-ok tar-ok" onClick=${async () => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { status: 'concluida', concluidaEm: nowIso(), concluidaPor: sessao.nome }); { const rp = resultadoPrazo(t); registrar(sessao, t.osId, rp.dif > 0 ? '⚠️' : '✅', 'Concluída (' + t.pessoa + ') — ' + rp.txt, rp.d); toast('Tarefa concluída — ' + rp.txt, 'ok'); } } catch (er) { toast(er.message, 'erro'); } }}>✓ Concluir tarefa</button><button class="cel-ok cel-mais tar-ok" onClick=${() => setVerT(t)}>＋ Mais dias</button>` : ''}`; })}
                      ${tagsOS(v, lista)}${(() => { const fk = k + '|' + norm(r.nome) + '|' + di; const fe = doc.feitos?.[fk]; const l1 = String(v).split('\n')[0].trim(); const ultimoDia = di === r.dias.length - 1 || !String(r.dias[di + 1] || '').includes(l1); return v.trim() && ultimoDia && !tsk.length ? html`${!fe && html`<button class="cel-ok cel-mais" title="Precisa de mais dias" onClick=${async () => {
                        const n = await escolher('Mais dias', 'Quantos dias úteis a mais para:\n' + l1, [1, 2, 3, 5].map(x => ({ v: x, t: '+' + x + (x === 1 ? ' dia' : ' dias') })).concat([{ v: 0, t: 'Cancelar' }])); if (!n) return;
                        const mot = await pedirMotivo('Motivo dos dias a mais', 'Por que precisa de mais ' + n + (n === 1 ? ' dia' : ' dias') + '?'); if (!mot) return;
                        const ini = somaUteis(dISO, 1), fimN = somaUteis(dISO, n);
                        const fimSem = isoD(diasD[diasD.length - 1]);
                        mudar(d => { const row = d.grades[k][ri]; for (let j = di + 1; j < row.dias.length; j++) { if (isoD(diasD[j]) <= fimN) { const cv = row.dias[j] || ''; if (!cv.includes(l1)) row.dias[j] = (cv ? cv + '\n' : '') + l1; } } d.prorrogacoes = [...(d.prorrogacoes || []), { linha: l1, pessoa: r.nome, de: dISO, ate: fimN, dias: n, motivo: mot, quem: sessao.nome, em: nowIso() }]; });
                        if (fimN > fimSem) await escreverNaAgenda(sessao, k, r.nome, somaUteis(fimSem, 1) > ini ? somaUteis(fimSem, 1) : ini, fimN, l1);
                        registrarVarias(sessao, osCitadas(v, lista), '⏳', 'Mais ' + n + (n === 1 ? ' dia' : ' dias') + ' no cronograma (' + r.nome + '): ' + dm(dISO) + ' → ' + dm(fimN), mot);
                        toast('+' + n + (n === 1 ? ' dia' : ' dias') + ' até ' + dm(fimN) + '.', 'ok');
                      }}>＋ Mais dias</button>`}<button class=${'cel-ok' + (fe ? ' on' : '')} title=${fe ? 'Concluído por ' + fe.por + ' — toque para desfazer' : 'Marcar como concluído'} onClick=${async () => { let mot = ''; if (fe) { mot = await pedirMotivo('Reabrir no cronograma', 'Já estava concluído. Informe o motivo para reabrir.'); if (!mot) return; } registrarVarias(sessao, osCitadas(v, lista), fe ? '↺' : '✅', (fe ? 'Reaberto no cronograma: ' : 'Concluído no cronograma: ') + (r.nome || '') + ' · ' + dm(isoD(diasD[di])), mot || v.split('\n')[0]); mudar(d => { d.feitos = d.feitos || {}; if (d.feitos[fk]) { d.reaberturas = [...(d.reaberturas || []), { fk, motivo: mot, quem: sessao.nome, em: nowIso() }]; delete d.feitos[fk]; } else d.feitos[fk] = { por: sessao.nome, em: nowIso() }; }); }}>${fe ? '✓ Concluído · ' + fe.por.split(' ')[0] : '✓ Concluir'}</button>` : null; })()}<textarea class=${'ag-cel' + (doc.feitos?.[k + '|' + norm(r.nome) + '|' + di] ? ' feito' : '')} rows="2" value=${v} onInput=${e => mudar(d => { d.grades[k][ri].dias[di] = e.target.value; })}></textarea>
                      <span class="cel-acoes"><button class="btn btn-ghost btn-sm" title="Tarefa com prazo" onClick=${() => setNovaT({ pessoa: r.nome, grade: k, inicio: dISO })}>📅</button><${OSPicker} lista=${lista} onPick=${(l, o) => {
                        if (o) {
                          const outro = []; GRADES.forEach(([k2, t2]) => (doc.grades?.[k2] || []).forEach((r2, ri2) => { if (k2 === k && ri2 === ri) return; if (osCitadas(r2.dias?.[di] || '', [o]).length) outro.push(r2.nome || t2.replace(/^\S+ /, '')); }));
                          (tarefas || []).forEach(t => { if (t.osId === o.id && t.status !== 'concluida' && t.inicio <= dISO && t.fim >= dISO && norm(t.pessoa) !== norm(r.nome)) outro.push(t.pessoa); });
                          if (outro.length) return toast('Bloqueado: a OS ' + numOS(o) + ' já está com ' + [...new Set(outro)].join(', ') + ' neste dia. A mesma OS não pode estar em dois lugares ao mesmo tempo.', 'erro');
                        }
                        mudar(d => { d.grades[k][ri].dias[di] = addLinha(d.grades[k][ri].dias[di], l); });
                      }} /></span></td>`; })}
                  </tr>`)}
                </tbody>
              </table></div>
            </div>`)}
          <div class="grid2" style=${{ alignItems: 'start' }}>
            ${LISTAS.map(([k, t, ic]) => {
              const auto = k === 'cortes' ? 'corte' : k === 'fitaLimpeza' ? 'fita' : null;
              const autos = auto ? diasD.flatMap(d => eventosOS(lista, d)).filter(e => e.t === auto) : [];
              return html`<div key=${k} class="card page-card stack">
                <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${ic} ${t}</div><${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.listas = d.listas || {}; d.listas[k] = addLinha(d.listas[k], l); })} /></div>
                ${autos.map((e, j) => html`<div key=${j} class="ag-chip">📌 ${e.txt} até ${e.o.execucao.etapas[auto].prazo}: <b>${numOS(e.o)}</b> ${e.o.cliente?.nome}</div>`)}
                <textarea class="inp" rows="4" placeholder="Uma por linha" value=${doc.listas?.[k] || ''} onInput=${e => mudar(d => { d.listas = d.listas || {}; d.listas[k] = e.target.value; })}></textarea>
              </div>`; })}
          </div>
          <div class="card page-card stack">
            <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🏭 Fornecedores & parceiros (pintura, vidros, lâminas…)</div>
              <button class="btn btn-sm btn-ghost" onClick=${() => mudar(d => { d.fornecedores = [...(d.fornecedores || []), { nome: '', itens: '' }]; })}>+ Fornecedor</button></div>
            <div class="grid3" style=${{ alignItems: 'start' }}>
              ${(doc.fornecedores || []).map((f, fi) => html`<div key=${fi} class="acab-box">
                <div class="row" style=${{ flexWrap: 'nowrap', gap: '4px' }}><input class="ag-inp" style=${{ fontWeight: 700 }} value=${f.nome} placeholder="Fornecedor" onInput=${e => mudar(d => { d.fornecedores[fi].nome = e.target.value; })} />
                  <${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.fornecedores[fi].itens = addLinha(d.fornecedores[fi].itens, l); })} />
                  <button class="x-btn" onClick=${() => mudar(d => { d.fornecedores.splice(fi, 1); })}>×</button></div>
                <textarea class="inp" rows="3" value=${f.itens} placeholder="O que está com este fornecedor e previsão" onInput=${e => mudar(d => { d.fornecedores[fi].itens = e.target.value; })}></textarea>
              </div>`)}
            </div>
          </div>
        </div>`}
    </div>`;
}

function AgendaMes({ sessao, lista, setSemana, setVista }) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [agendas, setAgendas] = useState({});
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'agenda'), s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); setAgendas(m); }, () => {}), []);
  const ini = segundaDe(mes);
  const semanas = [];
  const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  for (let d = new Date(ini); d <= fimMes && semanas.length < 6; d.setDate(d.getDate() + 7)) semanas.push(new Date(d));
  const itensAgenda = (dia) => {
    const s = agendas[iso(segundaDe(dia))]; if (!s) return [];
    const i = (dia.getDay() + 6) % 7; if (i > 4) return [];
    const out = [];
    GRADES.forEach(([k, t]) => (s.grades?.[k] || []).forEach(r => { const v = (r.dias?.[i] || '').trim(); if (v) { const o = osCitadas(v, lista || [])[0]; out.push({ k, ok: !!s.feitos?.[k + '|' + norm(r.nome) + '|' + i], nome: r.nome || '', txt: v.split('\n')[0], c: o ? corOS(o) : '' }); } }));
    return out;
  };
  const cor = Object.fromEntries(GRADES.map(g => [g[0], g[3] || '#78716c']));
  const hoje = new Date();
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
          <b style=${{ fontSize: '18px', textTransform: 'capitalize' }}>${mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>
          <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
        </div>
        <div class="row dim" style=${{ gap: '10px', fontSize: '12px' }}>${GRADES.map(([k, t]) => html`<span key=${k} class="row" style=${{ gap: '4px' }}><i class="leg" style=${{ background: cor[k] }}></i>${t.replace(/^\S+ /, '')}</span>`)}<span>🚚 entrega de OS · 📌 prazo de etapa</span></div>
      </div>
      <div class="mes">
        ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => html`<div key=${d} class="mes-h">${d}</div>`)}
        ${semanas.flatMap(s => Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return d; })).map(d => {
          const ev = eventosOS(lista, d); const ag = itensAgenda(d);
          return html`<div key=${iso(d)} class=${'mes-d' + (d.getMonth() !== mes.getMonth() ? ' fora' : '') + (mesmoDia(d, hoje) ? ' hoje' : '')} onClick=${() => { setSemana(iso(segundaDe(d))); setVista('semana'); }}>
            <b>${d.getDate()}</b>
            ${ev.slice(0, 4).map((e, j) => html`<div key=${'e' + j} class=${'mes-ev cli' + (e.t === 'entrega' ? ' ent' : '')} style=${{ '--cc': corOS(e.o) }}>${e.t === 'entrega' ? '🚚' : '📌'} <b>${numOS(e.o)}</b> ${(e.o.cliente?.nome || '').split(/\s[-–]\s/)[0]}${e.t !== 'entrega' ? ' · ' + e.txt : ''}</div>`)}
            ${ag.slice(0, 4).map((a, j) => html`<div key=${'a' + j} class=${'mes-ev' + (a.c ? ' cli' : '') + (a.ok ? ' feito' : '')} style=${a.c ? { '--cc': a.c, '--gc': cor[a.k] } : { borderLeftColor: cor[a.k] }}>${a.ok ? '✓ ' : ''}${a.nome && html`<i class="mes-nome" style=${{ background: cor[a.k] }}>${a.nome.split(/[\s+]/)[0]}</i>`}${a.txt}</div>`)}
            ${ev.length + ag.length > 8 && html`<small class="dim">+${ev.length + ag.length - 8} mais</small>`}
          </div>`; })}
      </div>
    </div>`;
}

/* ---------- Cronogramas de produção e entregas ---------- */
function TelaCronograma({ sessao, abrirOS, toast }) {
  const [lista, setLista] = useState(null);
  const [vista, setVista] = useState('semana');
  const [semana, setSemana] = useState(() => { const d = window.__semanaIr ? deIsoD(window.__semanaIr) : new Date(); window.__semanaIr = null; return iso(segundaDe(d)); });
  const [semanas, setSemanas] = useState(8);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ini = new Date(hoje); ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7));
  const dias = semanas * 7;
  const pos = (d) => d ? Math.max(0, Math.min(100, (d - ini) / 86400000 / dias * 100)) : null;
  const ativas = (lista || []).filter(o => !osConcluida(o));
  const cores = { corte: '#6B7280', fita: '#A16207', cavas: '#0E7490', pintura: '#BE185D', tapecaria: '#7C3AED', montagem: '#15803D' };
  const entregas = (lista || []).filter(o => lerPrazo(o.prazoEntrega)).sort((a, b) => lerPrazo(a.prazoEntrega) - lerPrazo(b.prazoEntrega));
  const semanaDe = (d) => { const s = new Date(d); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
  const grupos = {};
  entregas.forEach(o => { const d = lerPrazo(o.prazoEntrega); const k = d < hoje && !osConcluida(o) ? 'Atrasadas' : 'Semana de ' + semanaDe(d).toLocaleDateString('pt-BR'); (grupos[k] = grupos[k] || []).push(o); });
  return html`
    <div class="fade-up stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><h2>Cronogramas</h2><div class="dim">Agenda semanal da fábrica, visão do mês, produção por etapa e entregas. As OSs cadastradas aparecem sozinhas pelas datas.</div></div>
        <div class="seg-mini">${[['semana', '📋 Semana'], ['mes', '🗓 Mês'], ['producao', '🏭 Produção'], ['entregas', '🚚 Entregas']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}</div>
      </div>
      ${lista === null ? html`<div class="card">Carregando…</div>`
      : vista === 'semana' ? html`<${AgendaSemana} sessao=${sessao} lista=${lista} semana=${semana} setSemana=${setSemana} toast=${toast} />`
      : vista === 'mes' ? html`<${AgendaMes} sessao=${sessao} lista=${lista} setSemana=${setSemana} setVista=${setVista} />`
      : vista === 'producao' ? html`
        <div class="card page-card stack">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div class="row" style=${{ gap: '8px' }}>${ETAPAS_FAB.map(([k, t]) => html`<span key=${k} class="row dim" style=${{ gap: '4px' }}><i class="leg" style=${{ background: cores[k] }}></i>${t}</span>`)}</div>
            <select class="inp inp-sm" style=${{ width: 'auto' }} value=${semanas} onChange=${e => setSemanas(+e.target.value)}>${[4, 8, 12, 16].map(n => html`<option key=${n} value=${n}>${n} semanas</option>`)}</select>
          </div>
          <div class="gantt">
            <div class="g-row g-head"><div class="g-nome">OS</div><div class="g-trilha">${Array.from({ length: semanas }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i * 7); return html`<span key=${i} style=${{ left: (i / semanas * 100) + '%' }}>${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`; })}
              <b class="g-hoje" style=${{ left: pos(hoje) + '%' }}></b></div></div>
            ${ativas.map(o => {
              const et = o.execucao?.etapas || {};
              let ant = lerPrazo(o.criadoEm?.slice(0, 10).split('-').reverse().join('/')) || hoje;
              const barras = ETAPAS_FAB.map(([k, t]) => { const e = et[k] || {}; const fim = lerPrazo(e.prazo); const r = fim ? { k, t, de: ant, ate: fim, st: e.status || 'pendente' } : null; if (fim) ant = fim; return r; }).filter(Boolean);
              const entrega = lerPrazo(o.prazoEntrega);
              return html`<div key=${o.id} class="g-row" style=${{ '--cc': corOS(o) }} onClick=${() => abrirOS(o.id)}>
                <div class="g-nome"><b>${numOS(o)}</b> ${o.cliente?.nome || ''}<small>${(o.ambientes || []).map(a => a.nome).join(', ')}</small></div>
                <div class="g-trilha">
                  ${barras.map(b => html`<i key=${b.k} class=${'g-bar ' + b.st} title=${b.t + ' até ' + b.ate.toLocaleDateString('pt-BR')} style=${{ left: pos(b.de) + '%', width: Math.max(1.2, pos(b.ate) - pos(b.de)) + '%', background: cores[b.k] }}>${b.t}</i>`)}
                  ${!barras.length && html`<span class="dim g-vazio">Defina os prazos das etapas na Etapa 3 da OS</span>`}
                  ${entrega && html`<b class="g-entrega" title=${'Entrega ' + o.prazoEntrega} style=${{ left: pos(entrega) + '%' }}>🚚</b>`}
                  <b class="g-hoje" style=${{ left: pos(hoje) + '%' }}></b>
                </div></div>`; })}
            ${!ativas.length && html`<div class="vazio dim">Nenhuma OS em andamento.</div>`}
          </div>
        </div>` : html`
        <div class="stack">
          ${Object.entries(grupos).map(([g, os]) => html`
            <div key=${g} class="card page-card stack">
              <div class="sec-title" style=${g === 'Atrasadas' ? { color: 'var(--danger)' } : undefined}>${g === 'Atrasadas' ? '⚠ ' : '📅 '}${g} <span class="chip">${os.length}</span></div>
              ${os.map(o => html`<div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => abrirOS(o.id)}>
                <div class="os-num">${numOS(o)}</div>
                <div class="grow"><div class="title">${o.cliente?.nome || '—'}</div><div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ')} · ${o.cliente?.endereco || o.cliente?.obra || ''}</div></div>
                <b>${o.prazoEntrega}</b><span class=${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).c}>${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</span>
              </div>`)}
            </div>`)}
          ${!entregas.length && html`<div class="card vazio dim">Nenhuma OS com prazo de entrega definido.</div>`}
        </div>`}
    </div>`;
}

/* ---------- Pedido de alteração (OS pronta/desbloqueada) ---------- */
const IGNORAR_DIFF = new Set(['atualizadoEm', 'atualizadoPor', 'historico', 'alteracoes', 'reaberturas', 'fingerprint', 'id', 'revisar', 'hist', 'arquivos', 'atualizadaEm', 'concluidaEm', 'ata']);
const ROT_DIFF = {
  cliente: 'Cliente', nome: 'Nome', telefone: 'Telefone', endereco: 'Endereço', obra: 'Obra', prazoEntrega: 'Prazo de entrega', observacoesGerais: 'Observações',
  responsavel: 'Responsável', arquiteto: 'Arquiteto', tamponamento: 'Tamponamento', tipo: 'Tipo', espessura: 'Espessura', modoExecucao: 'Execução',
  padrao: 'Especificações', acab: 'Acabamento', interno: 'Interno', externo: 'Externo', desc: 'Descrição', fabricante: 'Fabricante', esp: 'Espessura',
  portas: 'Portas', modelo: 'Modelo', obs: 'Obs.', laminas: 'Lâminas', perfis: 'Perfis', puxadores: 'Puxadores', led: 'LED', ferragens: 'Ferragens',
  dobradicas: 'Dobradiças', corredicas: 'Corrediças', correr: 'Portas de correr', passagem: 'Portas de passagem', marca: 'Marca', fech: 'Fechaduras',
  vidros: 'Vidros', tec: 'Tecidos', parede: 'Parede', quantidade: 'Qtd', largura: 'Largura', altura: 'Altura', profundidade: 'Profundidade',
  mdfCaixa: 'MDF caixa', mdfFrente: 'MDF frente', cor: 'Cor', fitaBorda: 'Fita', gavetas: 'Gavetas', puxador: 'Puxador', iluminacao: 'Iluminação',
  ambientes: 'Ambiente', moveis: 'Móvel', ativo: 'Ativo', ambienteResumo: 'Ambientes', tipo: 'Tipo',
  observacoes: 'Observações', execucao: 'Execução', etapas: 'Etapas', status: 'Status', prazo: 'Prazo', onde: 'Onde', parceiros: 'Parceiros', cores: 'Cores', contrato: 'Contrato',
};
const valTxt = (v) => v == null || v === '' ? '(vazio)' : Array.isArray(v) ? (v.every(x => typeof x !== 'object') ? v.join('; ') || '(vazio)' : v.length + ' itens') : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : typeof v === 'object' ? JSON.stringify(v) : String(v);
function diffOS(a, b, caminho = [], out = []) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const A = a || [], B = b || [];
    const deObj = [...A, ...B].some(x => x && typeof x === 'object');
    if (!deObj) { if (JSON.stringify(A) !== JSON.stringify(B)) out.push({ campo: caminho.join(' › '), de: valTxt(A), para: valTxt(B) }); return out; }
    const chave = (x, i) => x?.id || x?.nome || i;
    const mapA = new Map(A.map((x, i) => [chave(x, i), x])), mapB = new Map(B.map((x, i) => [chave(x, i), x]));
    for (const [k, x] of mapB) { const nome = x?.nome || ('item ' + k); if (!mapA.has(k)) out.push({ campo: [...caminho, nome].join(' › '), de: '(não existia)', para: 'ADICIONADO' }); else diffOS(mapA.get(k), x, [...caminho, nome], out); }
    for (const [k, x] of mapA) if (!mapB.has(k)) out.push({ campo: [...caminho, x?.nome || ('item ' + k)].join(' › '), de: 'existia', para: 'REMOVIDO' });
    return out;
  }
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
    const ks = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of ks) { if (IGNORAR_DIFF.has(k)) continue; diffOS((a || {})[k], (b || {})[k], [...caminho, ROT_DIFF[k] || k], out); }
    return out;
  }
  const na = a == null || a === '' || a === false ? '' : a, nb = b == null || b === '' || b === false ? '' : b;
  if (String(na) !== String(nb)) out.push({ campo: caminho.join(' › '), de: valTxt(a), para: valTxt(b) });
  return out;
}
/* ---------- Registro de eventos na linha do tempo da OS ---------- */
function registrar(sessao, osId, ic, t, d) {
  if (!osId || !sessao?.empresaId) return Promise.resolve();
  return F().fsMod.addDoc(col('empresas', sessao.empresaId, 'os', osId, 'eventos'), { q: nowIso(), ic, t, d: d || '', p: sessao.nome || '' }).catch(() => {});
}
function registrarVarias(sessao, oss, ic, t, d) { const vis = new Set(); (oss || []).forEach(o => { if (o && !vis.has(o.id)) { vis.add(o.id); registrar(sessao, o.id, ic, t, d); } }); }
/* Pede só o motivo (sem senha) — usado no cronograma */
function pedirMotivo(titulo, texto) {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    function M() {
      const [m, setM] = useState('');
      return html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fim(null)}>
        <div class="card modal-caixa stack" style=${{ width: 'min(460px,100%)' }}>
          <div class="sec-title">↺ ${titulo}</div>
          <div class="dim">${texto || 'Isso já foi salvo. Informe o motivo para reabrir.'}</div>
          <textarea class="inp" rows="3" autoFocus placeholder="Motivo (obrigatório)" value=${m} onInput=${e => setM(e.target.value)}></textarea>
          <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${() => fim(null)}>Cancelar</button>
            <button class="btn btn-grande btn-marrom" style=${{ flex: 1 }} onClick=${() => m.trim().length < 5 ? alertaMin() : fim(m.trim())}>Confirmar</button></div>
        </div></div>`;
    }
    const alertaMin = () => { const t = el.querySelector('textarea'); if (t) { t.style.borderColor = '#dc2626'; t.placeholder = 'Escreva o motivo (mín. 5 letras)'; t.focus(); } };
    root.render(html`<${M} />`);
  });
}


/* ---------- OS por temas (visual, colorido) ---------- */
const TEMAS_COR = { cli: '#2563eb', acab: '#d97706', portas: '#7c3aed', pux: '#ca8a04', ferr: '#475569', fech: '#0d9488', par: '#92400e', amb: '#16a34a', obs: '#dc2626' };
function VisaoTemas({ os }) {
  const P = os.padrao || {}, Fe = P.ferragens || {};
  const fl = (k) => Object.values(Fe[k] || {}).filter(Boolean).join(' · ');
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const tamp = os.tamponamento?.tipo && os.tamponamento.tipo !== 'sem' ? (os.tamponamento.tipo === 'aparente' ? 'Aparente' : 'Não aparente') + (os.tamponamento.espessura ? ' · ' + os.tamponamento.espessura + ' mm' : '') : '';
  const temas = [
    ['cli', '👤', 'Cliente & obra', [['Cliente', os.cliente?.nome], ['Telefone', os.cliente?.telefone], ['Obra', os.cliente?.obra], ['Endereço', os.cliente?.endereco], ['Endereço de montagem', os.cliente?.enderecoMontagem], ['Prazo de entrega', os.prazoEntrega ? dm(os.prazoEntrega) + '/' + os.prazoEntrega.slice(0, 4) : ''], ['Arquiteto', os.arquiteto], ['Responsável', os.responsavel], ['Tamponamento', tamp], ['Execução', ({ interna: 'Interna', terceirizada: 'Terceirizada', mista: 'Mista' })[os.modoExecucao || 'interna']]]],
    ['acab', '🎨', 'Acabamentos', [['Interno', textoAcab(P.acab?.interno)], ['Externo', textoAcab(P.acab?.externo)], ['Outras', P.outras]]],
    ['portas', '🚪', 'Portas & frentes', [['Modelo', P.portas?.modelo], ['Usinagem', P.portas?.obs], ['Lâminas', (P.laminas || []).join('; ')], ['Perfis', (P.perfis || []).join('; ')]]],
    ['pux', '💡', 'Puxadores & iluminação', [['Puxadores', (P.puxadores || []).join('; ')], ['LED', P.led?.ativo ? [P.led.fita, P.led.temp, P.led.perfil, P.led.fonte, P.led.locais].filter(Boolean).join(' · ') : '']]],
    ['ferr', '🔩', 'Ferragens', [['Dobradiças', fl('dobradicas')], ['Corrediças', fl('corredicas')], ['Portas de correr', fl('correr')], ['Portas de passagem', fl('passagem')]]],
    ['fech', '🔒', 'Fechaduras, vidros & tecidos', [['Fechaduras', textoFech(P.fech) || (P.fechaduras || []).join('; ')], ['Vidros', textoVidro(P.vidros)], ['Tecidos', textoTec(P.tec) || (P.tecidos || []).join('; ')]]],
    ['par', '🧱', 'Paredes / painéis', [['Parede inteira', P.parede?.ativo ? [P.parede.espec, P.parede.paginacao, P.parede.fixacao].filter(Boolean).join(' — ') : '']]],
  ].map(([k, ic, t, l]) => [k, ic, t, l.filter(([, v]) => v)]).filter(([, , , l]) => l.length);
  const tema = (k, ic, t, corpo, n) => html`<div key=${k} class="tema" style=${{ '--tc': TEMAS_COR[k] }}><div class="tema-t"><span>${ic}</span>${t}${n ? html`<em>${n}</em>` : ''}</div>${corpo}</div>`;
  return html`<div class="temas">
    ${temas.map(([k, ic, t, l]) => tema(k, ic, t, html`<div class="tema-kv">${l.map(([a, b]) => html`<div key=${a}><small>${a}</small><b>${b}</b></div>`)}</div>`))}
    ${tema('amb', '📐', 'Ambientes & móveis', html`${(os.ambientes || []).map((a, ai) => html`<div key=${a.id || ai} class="tema-amb"><div class="tema-amb-t">${String(ai + 1).padStart(2, '0')} · ${a.nome || 'Ambiente'}</div>
      ${(a.moveis || []).map(m => html`<div key=${m.id} class="tema-mov"><b>${m.quantidade > 1 ? m.quantidade + '× ' : ''}${m.nome}</b>
        <span class="tm-med">${[m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ')} mm</span>
        <div class="tm-chips">${[mdf(m.mdfCaixa) && '📦 ' + mdf(m.mdfCaixa), mdf(m.mdfFrente) && '🚪 ' + mdf(m.mdfFrente), m.fitaBorda && '🎞 ' + m.fitaBorda, m.portas && 'Portas: ' + m.portas, m.gavetas && 'Gavetas: ' + m.gavetas, m.puxador && '🔘 ' + m.puxador, m.iluminacao && '💡 ' + m.iluminacao, ...(m.ferragens || []).map(f => '🔩 ' + (f.quantidade ? f.quantidade + '× ' : '') + [f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' '))].filter(Boolean).map((c, i) => html`<span key=${i}>${c}</span>`)}</div>
        ${m.observacoes && html`<div class="tm-obs">${m.observacoes}</div>`}</div>`)}
      ${!(a.moveis || []).length && html`<div class="dim">Sem móveis cadastrados</div>`}</div>`)}`, (os.ambientes || []).length + ' amb.')}
    ${os.observacoesGerais && tema('obs', '📝', 'Observações gerais', html`<div style=${{ whiteSpace: 'pre-line' }}>${os.observacoesGerais}</div>`)}
  </div>`;
}

/* ---------- OS no calendário ---------- */
function CalendarioOS({ sessao, os }) {
  const [tar, setTar] = useState(null);
  const [ags, setAgs] = useState({});
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  useEffect(() => { const { onSnapshot, query, where } = F().fsMod; return onSnapshot(query(col('empresas', sessao.empresaId, 'tarefas'), where('osId', '==', os.id)), s => setTar(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setTar([])); }, [os.id]);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'agenda'), s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); setAgs(m); }, () => {}), []);
  const cor = corOS(os), hoje = isoD(new Date());
  const cod = numOS(os), cli = norm((os.cliente?.nome || '').split(/\s[-–]\s/)[0]);
  const itensDia = (d) => {
    const di = isoD(d), out = [];
    (tar || []).forEach(t => { if ((d.getDay() + 6) % 7 < 5 && t.inicio <= di && t.fim >= di) out.push({ t: t.pessoa, ok: t.status === 'concluida', atr: t.status !== 'concluida' && t.fim < hoje, fim: t.fim === di, foco: { p: norm(t.pessoa), d: di } }); });
    const wd = (d.getDay() + 6) % 7; const ag = ags[iso(segundaDe(d))];
    if (ag && wd < 5) GRADES.forEach(([k]) => (ag.grades?.[k] || []).forEach(r => { const v = r.dias?.[wd] || ''; if ((v.includes(cod) || (cli && norm(v).includes(cli))) && !out.some(x => norm(x.t) === norm(r.nome))) out.push({ t: r.nome, ok: !!ag.feitos?.[k + '|' + norm(r.nome) + '|' + wd], foco: { p: norm(r.nome), d: di } }); }));
    if (os.prazoEntrega === di) out.push({ t: '🚚 Entrega', ent: true, ok: !!os.entregaFeita, foco: { d: di } });
    return out;
  };
  const ini = segundaDe(mes), fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0), dias = [];
  for (let d = new Date(ini); d <= fimMes || dias.length % 7; d.setDate(d.getDate() + 1)) dias.push(new Date(d));
  return html`<div class="cal-mes" style=${{ '--cc': cor }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}>
      <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
      <b style=${{ textTransform: 'capitalize' }}>${mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>
      <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
    </div>
    <div class="calm">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x, i) => html`<div key=${'h' + i} class="calm-h">${x}</div>`)}
      ${dias.map(d => { const it = itensDia(d); const di = isoD(d); return html`<div key=${di} class=${'calm-d' + (d.getMonth() !== mes.getMonth() ? ' fora' : '') + (di === hoje ? ' hoje' : '') + (it.length ? ' tem' : '')} onClick=${() => it.length && window.__irCronograma && window.__irCronograma(di, it[0].foco)}>
        <b>${d.getDate()}</b>${it.map((x, j) => html`<i key=${j} class=${(x.ok ? 'ok' : '') + (x.atr ? ' atr' : '') + (x.ent ? ' ent' : '') + (x.fim ? ' fim' : '')}>${x.ok ? '✓ ' : x.fim ? '🏁 ' : ''}${String(x.t).split(/[\s+]/)[0]}</i>`)}</div>`; })}
    </div>
    <div class="dim" style=${{ fontSize: '12px' }}>Toque num dia colorido para abrir o cronograma naquela linha. 🏁 = prazo final · ✓ = concluído</div>
  </div>`;
}

/* ---------- Ficha da OS finalizada (abre de qualquer lugar) ---------- */
const durTxt = (ms) => { if (!(ms > 0)) return ''; const h = ms / 36e5; if (h < 1) return Math.max(1, Math.round(ms / 6e4)) + ' min'; if (h < 24) return Math.round(h) + ' h'; const d = Math.floor(h / 24), r = Math.round(h % 24); return d + 'd' + (r ? ' ' + r + 'h' : ''); };
/* Andamento da OS dentro da ficha: % + parceiros + execução (etapa 3) editável */
/* Pendências travam o avanço; gerente/admin pode liberar com senha */
async function hashTxt(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gp:' + t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function LiberarPendencias({ sessao, falta, titulo, irAba, fechar, onOk }) {
  const [modo, setModo] = useState('');
  const [senha, setSenha] = useState(''), [motivo, setMotivo] = useState(''), [erro, setErro] = useState(''), [rod, setRod] = useState(false);
  const chefe = ['admin', 'gerente'].includes(sessao.papel);
  const liberarCodigo = async () => {
    if (motivo.trim().length < 5) return setErro('Escreva o motivo.'); if (!senha) return setErro('Digite a senha de liberação.');
    const h = window.__senhaLib; if (!h) return setErro('O administrador ainda não cadastrou a senha de liberação (Configurações).');
    setRod(true); if ((await hashTxt(senha)) !== h) { setRod(false); return setErro('Senha incorreta.'); }
    await onOk(motivo.trim() + ' (senha de liberação)'); fechar(); };
  const definir = async () => { const t = await pedirTexto('Nova senha de liberação (para a equipe levar com pendência)', 'Mínimo 4 caracteres'); if (!t || t.length < 4) return; await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { senhaLiberacao: await hashTxt(t) }); window.__senhaLib = await hashTxt(t); alert('Senha de liberação salva.'); };
  if (modo === 'chefe') return html`<${SenhaMotivo} titulo=${titulo + ' com pendência'} texto="Gerente/administrador: confirme com a sua senha e o motivo." botao="Liberar" onOk=${onOk} fechar=${fechar} />`;
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(520px,100%)' }}>
    <div class="sec-title">⛔ ${titulo}: falta resolver</div>
    <div class="ficha-falta"><b>⚠ Falta ${falta.length} ${falta.length === 1 ? 'coisa' : 'coisas'}</b>${falta.map(([f, ab], i) => html`<button key=${i} class="falta-it" onClick=${() => irAba(ab)}>• ${f} <small>→ abrir</small></button>`)}</div>
    ${modo === 'codigo' ? html`<div class="stack">
      <input class="inp" placeholder="Motivo (obrigatório)" value=${motivo} onInput=${e => setMotivo(e.target.value)} />
      <input class="inp" type="password" placeholder="Senha de liberação do gerente" value=${senha} onInput=${e => setSenha(e.target.value)} />
      ${erro && html`<div class="erro-txt" style=${{ color: 'var(--danger)' }}>${erro}</div>`}
      <button class="btn btn-primary" disabled=${rod} onClick=${liberarCodigo}>🔓 Liberar</button></div>`
    : html`<div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}>
      <button class="btn" onClick=${() => irAba('compras')}>Vou resolver → Compras</button>
      <button class="btn btn-danger" style=${{ flex: 1 }} onClick=${() => setModo(chefe ? 'chefe' : 'codigo')}>🔓 Levar mesmo assim (senha do gerente/adm)</button></div>`}
  </div></div>`, document.body);
}
/* ---------- Ordem para parceiro (pintura, serralheria, vidros…) ---------- */
const GRUPOS_TIPO = {};
const ALLOW_TIPO = { vidros: { Vidros: 1 }, tapecaria: { Tecidos: 1 }, pintura: { Acabamentos: 0, Portas: 0 }, serralheria: { 'Puxadores & perfis': 0, Ferragens: 0 }, pedra: { Acabamentos: 0 }, lamina: { Acabamentos: 0 }, corte: { Acabamentos: 1 } };
const RE_TIPO = {
  pintura: /laca|pint|\bcor(es)?\b|verniz|tinta|fosc|brilh|acetin|primer|\bpu\b|seladora|patina|pátina|ral\b|suvinil|coral/i,
  vidros: /vidro|espelh|cristal|temperad|bisot|jatead|fum[eê]|reflecta/i,
  tapecaria: /tecid|couro|estof|tape[cç]|espuma|almofad|courino|linho|veludo|capiton/i,
  serralheria: /serralh|metal|ferro|alum[ií]n|inox|lat[aã]o|estrutura met|solda|tubo|cantoneira|perfil met/i,
  pedra: /pedra|m[aá]rmor|granit|quartz|silestone|dekton|nanoglass|porcelanato|cuba/i,
  lamina: /l[aâ]mina|madeira|freij|carvalh|nogueira|cumaru|ripad|natural/i,
  corte: /mdf|mdp|chapa|corte|espessura|\d+\s?mm/i,
};
function specsParceiro(o, tipo, sel) {
  const temSel = sel && sel.size > 0;
  const re = RE_TIPO[tipo]; const L = [];
  const pedacos = (t) => String(t || '').split(/(?<=[.;])\s+|\s+-\s+|\n/).map(x => x.trim()).filter(Boolean);
  (o.ambientes || []).forEach((a, ai) => {
    const linhas = [];
    (a.moveis || []).forEach((m, mi) => {
      if (temSel && !sel.has(ai + '-' + mi)) return;
      const campos = [m.observacoes, m.puxador, m.iluminacao, [m.mdfCaixa?.fabricante, m.mdfCaixa?.cor].filter(Boolean).join(' '), [m.mdfFrente?.fabricante, m.mdfFrente?.cor].filter(Boolean).join(' ')].flatMap(pedacos);
      const rel = re ? campos.filter(x => re.test(x)) : campos;
      if (!rel.length && re) return;
      const med = [m.largura, m.altura, m.profundidade].some(Boolean) ? ' — ' + [m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ') + ' mm' : '';
      linhas.push('• ' + String.fromCharCode(65 + mi) + ') ' + nomePadrao(m.nome) + (m.quantidade > 1 ? ' (' + m.quantidade + 'x)' : '') + med);
      rel.forEach(x => linhas.push('     ' + x));
    });
    const AL = ALLOW_TIPO[tipo];
    gruposEspec(a.padrao || o.padrao).forEach(([, t, , li]) => { if (AL && !(t in AL)) return; li.forEach(([k, v]) => { const l = t + (k ? ' · ' + k : '') + ': ' + v; if (!AL || AL[t] || re.test(l)) linhas.push('   ' + l); }); });
    if (temSel && !linhas.some(l => l.startsWith('•'))) return;
    if (linhas.length) { L.push('▸ ' + (nomePadrao(a.nome) || 'Conjunto')); L.push(...linhas); }
  });
  return L.length ? L.join('\n') : '';
}
function OrdemParceiro({ sessao, o, fechar, toast }) {
  const [tipo, setTipo] = useState('pintura');
  const [parc, setParc] = useState(''), [prazo, setPrazo] = useState(''), [fotos, setFotos] = useState([]);
  const [selM, setSelM] = useState(() => new Set());
  const [texto, setTexto] = useState(() => specsParceiro(o, 'pintura'));
  const [salv, setSalv] = useState(false);
  const [pdf, setPdf] = useState(null);
  const lerPdf = (f) => { if (!f) return; if (f.size > 750 * 1024) return toast('PDF muito grande (máx. 750 KB). Exporte o desenho mais leve.', 'erro'); const r = new FileReader(); r.onload = () => setPdf({ nome: f.name, data: r.result }); r.readAsDataURL(f); };
  const lista = (window.__parcLista || []).map(p => p.nome).filter(Boolean).sort();
  const mudaTipo = (t) => { setTipo(t); setTexto(specsParceiro(o, t, selM)); };
  const togM = (k) => { const n = new Set(selM); n.has(k) ? n.delete(k) : n.add(k); setSelM(n); setTexto(specsParceiro(o, tipo, n)); };
  const movChips = (o.ambientes || []).flatMap((a, ai) => (a.moveis || []).map((m, mi) => ({ k: ai + '-' + mi, t: String.fromCharCode(65 + mi) + ') ' + nomePadrao(m.nome) })));
  const T = TIPOS_PARC.find(x => x[0] === tipo) || TIPOS_PARC[0];
  const addFotos = async (files) => { const n = []; for (const f of [...files].slice(0, 8 - fotos.length)) { try { n.push({ src: await fotoCompacta(f), movel: selM.size === 1 ? (movChips.find(x => selM.has(x.k)) || {}).t || '' : '' }); } catch {} } setFotos(v => [...v, ...n]); };
  const moveisL = movChips.map(x => x.t);
  const imprimir = (x) => { const w = window.open('', '_blank'); if (!w) return toast('Permita pop-ups para imprimir.', 'erro');
    const esc = (t) => String(t || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    w.document.write(`<html><head><meta charset="utf-8"><title>Ordem de ${esc(x.titulo)} — ${numOS(o)}</title><style>body{font:14px Arial,sans-serif;margin:24px;color:#1c1917}h1{margin:0;font-size:22px}.top{display:flex;justify-content:space-between;border-bottom:4px solid #b45309;padding-bottom:10px;margin-bottom:12px}.cod{font:800 22px monospace}.kv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.kv div{background:#f5f5f4;border-radius:8px;padding:6px 9px}.kv small{display:block;color:#78716c;font-size:10px;text-transform:uppercase}pre{white-space:pre-wrap;font:13px/1.5 Arial;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px}.fotos img{width:31%;margin:1%;border-radius:8px}.ass{display:flex;gap:30px;margin-top:40px}.ass div{flex:1;border-top:1px solid #333;text-align:center;font-size:11px;padding-top:4px}</style></head><body>
      <div class="top"><div><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase">${esc(sessao.empresaNome || '')}</div><h1>${esc(x.ic)} Ordem de ${esc(x.titulo)}</h1><div>${esc(nomePadrao(o.cliente?.nome))}</div></div><div class="cod">${numOS(o)}</div></div>
      <div class="kv"><div><small>Parceiro</small><b>${esc(x.parceiro || '—')}</b></div><div><small>Prazo</small><b>${esc(x.prazo ? x.prazo.split('-').reverse().join('/') : '—')}</b></div><div><small>Emitida</small><b>${esc(fmtData(x.em))} · ${esc(x.por)}</b></div></div>
      <pre>${esc(x.texto)}</pre>${x.pdf ? `<p>📐 <b>Desenho técnico anexo:</b> ${esc(x.pdf.nome)}</p>` : ''}<div class="fotos">${(x.fotos || []).map(f => typeof f === 'string' ? `<img src="${f}">` : `<figure style="display:inline-block;width:31%;margin:1%"><img src="${f.src}" style="width:100%;border-radius:8px"><figcaption style="font-size:11px;font-weight:bold">${esc(f.movel || '')}</figcaption></figure>`).join('')}</div>
      <div class="ass"><div>Emitido por</div><div>Parceiro — recebi</div></div><script>setTimeout(()=>print(),400)<\/script></body></html>`); w.document.close(); };
  const salvar = async (imp) => { if (!parc.trim()) return toast('Escolha o parceiro.'); if (fotos.some(f => !f.movel)) return toast('Diga de qual móvel é cada foto.'); if (tipo === 'serralheria' && !pdf) return toast('📐 Serralheria: anexe o PDF do desenho técnico.', 'erro'); setSalv(true);
    const x = { tipo, titulo: T[2], ic: T[1], parceiro: parc.trim(), prazo, texto, fotos, ...(pdf ? { pdf } : {}), em: nowIso(), por: sessao.nome };
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { ordensParceiro: [...(o.ordensParceiro || []), x] }); registrar(sessao, o.id, T[1], 'Ordem de ' + T[2] + ' para ' + x.parceiro, ''); toast('Ordem salva.', 'ok'); if (imp) imprimir(x); fechar(); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); } setSalv(false); };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(640px,100%)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🧾 Ordens a terceiros · ${numOS(o)}</div><button class="x-btn" onClick=${fechar}>✕</button></div>
    <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${TIPOS_PARC.map(([k, ic, t]) => html`<button key=${k} class=${'sug-pessoa' + (tipo === k ? ' on' : '')} onClick=${() => mudaTipo(k)}>${ic} ${t}</button>`)}</div>
    <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}>
      <div class="field" style=${{ flex: 2, minWidth: '180px' }}><span class="lbl">Parceiro</span><input class="inp" list="op-parc" placeholder="Escolha ou digite" value=${parc} onInput=${e => setParc(e.target.value)} /><datalist id="op-parc">${lista.map(n => html`<option key=${n} value=${n} />`)}</datalist></div>
      <div class="field" style=${{ flex: 1, minWidth: '140px' }}><span class="lbl">Prazo</span><input class="inp" type="date" value=${prazo} onInput=${e => setPrazo(e.target.value)} /></div></div>
    <div class="field"><span class="lbl">Para quais móveis da OS? <small class="dim">(nenhum marcado = todos os relacionados)</small></span><div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${movChips.map(x => html`<button key=${x.k} class=${'sug-pessoa' + (selM.has(x.k) ? ' on' : '')} onClick=${() => togM(x.k)}>${selM.has(x.k) ? '✓ ' : ''}${x.t}</button>`)}</div></div>
    <div class="field"><span class="lbl">Especificações (puxadas da OS — pode editar)</span><textarea class="inp" rows="9" placeholder="Nada na OS especificado para esta categoria nos móveis marcados. Descreva aqui o que vai para o parceiro." value=${texto} onInput=${e => setTexto(e.target.value)}></textarea></div>
    <div class="row" style=${{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>${tipo === 'serralheria' && html`<label class=${'btn btn-sm' + (pdf ? ' btn-verde' : ' op-falta')}>📐 ${pdf ? pdf.nome : 'PDF do desenho técnico (obrigatório)'}<input type="file" accept="application/pdf" style=${{ display: 'none' }} onChange=${e => { lerPdf(e.target.files[0]); e.target.value = ''; }} /></label>`}
      <${FotoBtns} onFiles=${addFotos} rotulo="Fotos (escolha o móvel de cada uma):" />
    </div>
    ${fotos.length > 0 && html`<div class="op-fotos">${fotos.map((f, i) => html`<div key=${i} class="op-foto"><img src=${f.src} /><button class="op-x" onClick=${() => setFotos(fotos.filter((_, j) => j !== i))}>✕</button>
      <select class=${'inp inp-sm' + (f.movel ? '' : ' op-falta')} value=${f.movel} onChange=${e => setFotos(fotos.map((g, j) => j === i ? { ...g, movel: e.target.value } : g))}><option value="">De qual móvel?</option>${moveisL.map(n => html`<option key=${n} value=${n}>${n}</option>`)}</select></div>`)}</div>`}
    <div class="row" style=${{ gap: '8px', justifyContent: 'flex-end' }}><button class="btn" disabled=${salv} onClick=${() => salvar(false)}>💾 Salvar</button><button class="btn btn-primary" disabled=${salv} onClick=${() => salvar(true)}>🖨 Salvar e imprimir</button></div>
    ${(o.ordensParceiro || []).length > 0 && html`<details><summary>📁 ${o.ordensParceiro.length} ordem(ns) já emitida(s)</summary>${o.ordensParceiro.slice().reverse().map((x, i) => html`<div key=${i} class="row" style=${{ justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e7e5e4' }}><span>${x.ic} ${x.titulo} · <b>${x.parceiro}</b> <small class="dim">${fmtData(x.em)}</small></span><span>${x.pdf && html`<button class="btn btn-ghost btn-sm" title=${x.pdf.nome} onClick=${() => { const w = window.open(); if (w) w.document.write('<iframe src="' + x.pdf.data + '" style="border:0;width:100%;height:100vh"></iframe>'); }}>📐</button>`}<button class="btn btn-ghost btn-sm" onClick=${() => imprimir(x)}>🖨</button></span></div>`)}</details>`}
  </div></div>`, document.body);
}
/* ---------- Aba Montagem: links 3D (Dinabox) e o que o montador precisa ---------- */
/* Planejamento de execução (check-list livre na OS) */
function PlanejamentoExec({ sessao, o, toast }) {
  const [t, setT] = useState('');
  const L = o.planejamento || [];
  const salvar = (l) => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { planejamento: l }).catch(e => toast(e.message, 'erro'));
  const add = () => { const x = t.trim(); if (!x) return; salvar([...L, { t: x, ok: false, por: sessao.nome, em: nowIso() }]); setT(''); };
  const feitos = L.filter(x => x.ok).length;
  return html`<div class="card stack"><div class="row" style=${{ justifyContent: 'space-between' }}><b>🗒 Planejamento de execução</b>${L.length > 0 && html`<span class="chip">${feitos}/${L.length}</span>`}</div>
    ${L.map((x, i) => html`<label key=${i} class=${'plan-it' + (x.ok ? ' ok' : '')}><input type="checkbox" checked=${!!x.ok} onChange=${() => salvar(L.map((y, j) => j === i ? { ...y, ok: !y.ok, okPor: sessao.nome, okEm: nowIso() } : y))} /><span>${x.t}</span><small>${x.ok && x.okPor ? '✓ ' + x.okPor : x.por || ''}</small><button class="btn btn-ghost btn-sm" onClick=${e => { e.preventDefault(); salvar(L.filter((_, j) => j !== i)); }}>✕</button></label>`)}
    <div class="row" style=${{ gap: '6px', flexWrap: 'nowrap' }}><input class="inp" placeholder="Ex: 1º dia — instalar aéreos da cozinha" value=${t} onInput=${e => setT(e.target.value)} onKeyDown=${e => e.key === 'Enter' && add()} /><button class="btn btn-primary" onClick=${add}>＋</button></div></div>`;
}
/* Eletros e puxadores da OS — puxadores vêm sozinhos da OS; eletros com foto */
function puxadoresDaOS(o) { const r = []; (o.ambientes || []).forEach(a => { const P = a.padrao || o.padrao || {}; [...(P.puxadores || []), ...(P.perfis || [])].forEach(x => r.push([nomePadrao(a.nome) || '', x])); (a.moveis || []).forEach(m => m.puxador && r.push([nomePadrao(m.nome), m.puxador])); }); const v = new Set(); return r.filter(([, x]) => { const k = norm(x); if (v.has(k)) return false; v.add(k); return true; }); }
function EletrosPuxadores({ sessao, o, toast }) {
  const [n, setN] = useState({ nome: '', modelo: '', medidas: '', foto: '' });
  const E = o.eletros || [];
  const salvar = (l) => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { eletros: l }).catch(e => toast(e.message, 'erro'));
  const foto = async (f) => { if (f) try { setN(v => ({ ...v, foto: '' })); const u = await fotoCompacta(f); setN(v => ({ ...v, foto: u })); } catch {} };
  const pux = puxadoresDaOS(o);
  return html`<div class="card stack"><b>🔌 Eletros e ✋ puxadores</b>
    <div class="ep-grade">
      ${pux.map(([onde, x], i) => html`<div key=${'p' + i} class="ep-card pux"><div class="ep-foto">✋</div><div><b>${x}</b><small>${onde ? 'Puxador · ' + onde : 'Puxador'}</small></div></div>`)}
      ${E.map((x, i) => html`<div key=${'e' + i} class="ep-card"><div class="ep-foto">${x.foto ? html`<img src=${x.foto} />` : '🔌'}</div><div style=${{ flex: 1 }}><b>${x.nome}</b><small>${[x.modelo, x.medidas].filter(Boolean).join(' · ')}</small></div><button class="btn btn-ghost btn-sm" onClick=${() => salvar(E.filter((_, j) => j !== i))}>✕</button></div>`)}
      ${!pux.length && !E.length && html`<div class="dim">Nenhum puxador especificado nem eletro cadastrado.</div>`}
    </div>
    <div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}>
      <input class="inp" style=${{ flex: 2, minWidth: '140px' }} placeholder="Eletro (ex: Cooktop 5 bocas)" value=${n.nome} onInput=${e => setN({ ...n, nome: e.target.value })} />
      <input class="inp" style=${{ flex: 2, minWidth: '120px' }} placeholder="Marca / modelo" value=${n.modelo} onInput=${e => setN({ ...n, modelo: e.target.value })} />
      <input class="inp" style=${{ flex: 1, minWidth: '100px' }} placeholder="Medidas de embutir" value=${n.medidas} onInput=${e => setN({ ...n, medidas: e.target.value })} />
      <label class=${'btn btn-sm' + (n.foto ? ' btn-verde' : '')}>📷${n.foto ? ' ✓' : ''}<input type="file" accept="image/*" style=${{ display: 'none' }} onChange=${e => { foto(e.target.files[0]); e.target.value = ''; }} /></label>
      <button class="btn btn-primary" onClick=${() => { if (!n.nome.trim()) return toast('Escreva o eletro.'); salvar([...E, { ...n, nome: n.nome.trim() }]); setN({ nome: '', modelo: '', medidas: '', foto: '' }); }}>＋ Eletro</button></div></div>`;
}
/* ---------- Página geral do cliente ---------- */
const CHECK_PADRAO = [
  { tit: 'Antes da montagem', itens: ['Endereço e acesso confirmados', 'Medidas finais conferidas', 'Eletros e pedras no local', 'Elétrica e hidráulica prontas'] },
  { tit: 'Montagem', itens: ['Todos os móveis entregues', 'Ferragens reguladas', 'Puxadores instalados', 'Iluminação testada'] },
  { tit: 'Finalização da obra', itens: ['Limpeza final', 'Fotos finais', 'Pendências zeradas', 'Cliente assinou o recebimento'] },
];
function PaginaCliente({ sessao, c, oss, editar, fechar, toast }) {
  const [aba, setAba] = useState('oss'), [atas, setAtas] = useState([]), [novoIt, setNovoIt] = useState({}), [novaSec, setNovaSec] = useState('');
  const ck = c.checklist || CHECK_PADRAO.map(s => ({ tit: s.tit, itens: s.itens.map(t => ({ t, ok: false })) }));
  const salvarCk = (l) => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'clientes', c.id), { checklist: l }).catch(e => toast(e.message, 'erro'));
  useEffect(() => { F().fsMod.getDocs(col('empresas', sessao.empresaId, 'projetos')).then(s => setAtas(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => norm(baseCli(p.cliente?.nome)) === norm(c.nome)))).catch(() => {}); }, [c.id]);
  const ativas = oss.filter(o => !osConcluida(o));
  const pend = [];
  oss.forEach(o => { if (o.parada) pend.push(['⏸', numOS(o) + ' parada: ' + o.parada.motivo, o.id, 'andamento']); parceirosDaOS(o).filter(p => p.st !== 'recebido').forEach(p => pend.push([p.ic, numOS(o) + ' · ' + p.t + ': ' + infoSt(p.st)[2], o.id, 'compras'])); });
  const pct = oss.length ? Math.round(oss.reduce((n, o) => n + pctObra(o), 0) / oss.length) : 0;
  const pux = oss.flatMap(o => puxadoresDaOS(o).map(([onde, x]) => [numOS(o) + (onde ? ' · ' + onde : ''), x]));
  const ele = oss.flatMap(o => (o.eletros || []).map(e => ({ ...e, os: numOS(o) })));
  const tot = ck.reduce((n, s) => n + s.itens.length, 0), ok = ck.reduce((n, s) => n + s.itens.filter(i => i.ok).length, 0);
  const abrirOS = (id) => { fechar(); window.__abrirOS && window.__abrirOS(id); };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack pcli" style=${{ width: 'min(980px,100%)', '--cc': corCliente(c.nome) }}>
    <div class="pcli-cab"><div><h2>${nomePadrao(c.nome)}</h2><small>${[c.telefone, c.arquiteto ? 'Arq. ' + c.arquiteto : ''].filter(Boolean).join(' · ')}</small>${(c.enderecoMontagem || c.endereco) && html`<div><small>📍 ${c.enderecoMontagem || c.endereco}</small></div>`}</div>
      <div class="row" style=${{ gap: '6px' }}>${c.telefone && html`<a class="btn btn-sm" target="_blank" rel="noopener" href=${'https://wa.me/55' + String(c.telefone).replace(/\D/g, '').replace(/^55/, '')}>💬</a>`}<button class="btn btn-sm" onClick=${editar}>✏️ Dados</button><button class="x-btn" onClick=${fechar}>✕</button></div></div>
    <div class="pcli-kpis"><div><small>Status da obra</small><${BarraPct} p=${pct} /></div><div><small>OSs</small><b>${ativas.length} em aberto · ${oss.length - ativas.length} concluídas</b></div><div><small>Pendências</small><b style=${{ color: pend.length ? 'var(--danger)' : '' }}>${pend.length}</b></div><div><small>Finalização</small><b>${ok}/${tot}</b></div></div>
    ${pend.length > 0 && html`<div class="ficha-falta"><b>⚠ Pendências</b>${pend.map(([ic, t, id, modo], i) => html`<button key=${i} class="falta-it" title="Abrir para resolver" onClick=${() => { window.__modoFicha = modo; fechar && fechar(); setTimeout(() => window.__abrirOS && window.__abrirOS(id), 50); }}>${ic} ${t} <small>→ resolver</small></button>`)}</div>`}
    <div class="seg-mini" style=${{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>${[['oss', '📋 OSs'], ['check', '✅ Finalização'], ['pux', '✋ Puxadores'], ['ele', '🔌 Eletros'], ['contrato', '📑 Contrato'], ['atas', '🎙 Atas']].map(([k, t]) => html`<button key=${k} class=${aba === k ? 'on' : ''} onClick=${() => setAba(k)}>${t}</button>`)}</div>
    ${aba === 'oss' && html`<div class="pcli-lista">${oss.map(o => { const st = (STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]); return html`<button key=${o.id} class="pcli-os" onClick=${() => abrirOS(o.id)}><b class="mono">${numOS(o)}</b><span>${nomePadrao((o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || o.ambienteResumo) || '—'}</span><span class=${st.c + ' mini'}>${st.t.replace(/^\d+\. /, '')}</span><${BarraPct} p=${pctObra(o)} /></button>`; })}</div>`}
    ${aba === 'check' && html`<div class="stack">${ck.map((sec, si) => html`<div key=${si} class="pcli-sec"><div class="pcli-sec-t">${sec.tit} <small>${sec.itens.filter(i => i.ok).length}/${sec.itens.length}</small></div>
        ${sec.itens.map((it, ii) => html`<label key=${ii} class=${'plan-it' + (it.ok ? ' ok' : '')}><input type="checkbox" checked=${!!it.ok} onChange=${() => salvarCk(ck.map((s2, a2) => a2 !== si ? s2 : { ...s2, itens: s2.itens.map((x, b2) => b2 !== ii ? x : { ...x, ok: !x.ok, por: sessao.nome, em: nowIso() }) }))} /><span>${it.t}</span><small>${it.ok && it.por ? '✓ ' + it.por : ''}</small></label>`)}
        <div class="row" style=${{ gap: '6px', flexWrap: 'nowrap' }}><input class="inp inp-sm" placeholder="Novo lembrete" value=${novoIt[si] || ''} onInput=${e => setNovoIt({ ...novoIt, [si]: e.target.value })} /><button class="btn btn-sm" onClick=${() => { const t = (novoIt[si] || '').trim(); if (!t) return; salvarCk(ck.map((s2, a2) => a2 !== si ? s2 : { ...s2, itens: [...s2.itens, { t, ok: false }] })); setNovoIt({ ...novoIt, [si]: '' }); }}>＋</button></div></div>`)}
      <div class="row" style=${{ gap: '6px', flexWrap: 'nowrap' }}><input class="inp" placeholder="Novo subtítulo (ex: Vistoria)" value=${novaSec} onInput=${e => setNovaSec(e.target.value)} /><button class="btn" onClick=${() => { if (!novaSec.trim()) return; salvarCk([...ck, { tit: novaSec.trim(), itens: [] }]); setNovaSec(''); }}>＋ Subtítulo</button></div></div>`}
    ${aba === 'pux' && html`<div class="ep-grade">${pux.length ? pux.map(([onde, x], i) => html`<div key=${i} class="ep-card pux"><div class="ep-foto">✋</div><div><b>${x}</b><small>${onde}</small></div></div>`) : html`<div class="dim">Nenhum puxador especificado nas OSs.</div>`}</div>`}
    ${aba === 'ele' && html`<div class="ep-grade">${ele.length ? ele.map((x, i) => html`<div key=${i} class="ep-card"><div class="ep-foto">${x.foto ? html`<img src=${x.foto} />` : '🔌'}</div><div><b>${x.nome}</b><small>${[x.os, x.modelo, x.medidas].filter(Boolean).join(' · ')}</small></div></div>`) : html`<div class="dim">Nenhum eletro cadastrado. Cadastre na aba Montagem de cada OS.</div>`}</div>`}
    ${aba === 'contrato' && html`<div class="stack"><small class="dim">Contratos e detalhamentos do cliente ficam na tela Contratos.</small><button class="btn btn-primary" style=${{ alignSelf: 'flex-start' }} onClick=${() => { fechar(); window.__buscaOS = c.nome; window.__irPara && window.__irPara('contratos'); }}>📑 Abrir contratos</button></div>`}
    ${aba === 'atas' && html`<div class="pcli-lista">${atas.length ? atas.map(p => html`<button key=${p.id} class="pcli-os" onClick=${() => { fechar(); window.__irPara && window.__irPara('projetos'); }}><b>🎙</b><span>${p.titulo || 'Reunião'}</span><small class="dim">${fmtData(p.criadoEm || p.em || '')}</small></button>`) : html`<div class="dim">Nenhuma ata de reunião deste cliente.</div>`}</div>`}
  </div></div>`, document.body);
}
/* ---------- Dados do Dinabox (materiais e peças por OS) ---------- */
function codigosDoLote(nome) { const r = []; String(nome || '').replace(/(?:^|\D)26\s?(\d{2,3})(?!\d)/g, (m, n) => { r.push('26.' + n.padStart(3, '0')); return m; }); return [...new Set(r)]; }
async function importarDinabox(sessao, lotes, comCompras = true) {
  const L = window.__listaOS || []; const por = {};
  lotes.forEach(l => codigosDoLote(l.nome).forEach(c => (por[c] = por[c] || []).push(l)));
  const M = F().fsMod; let n = 0; const b = M.writeBatch(F().db);
  Object.entries(por).forEach(([c, ls]) => { const o = L.find(x => x.codigo === c); if (!o) return; const ant = (o.dinabox?.lotes || []).filter(x => !ls.some(y => y.lote === x.lote)); const ex = o.links3d || []; const nl = []; ls.forEach(l => (l.qr || []).forEach(q => { const url = 'https://www.dinabox.app/apps/3d/module-viewer/?qrcode=' + q; if (!ex.some(e => e.url === url) && !nl.some(e => e.url === url)) nl.push({ url, nome: nomePadrao(String(l.nome).replace(/^OS\s*[\d\s]+(E\s*[\d\s]+)?/i, '')) || 'Projeto 3D', por: 'Dinabox', em: nowIso() }); }));
    b.update(docRef('empresas', sessao.empresaId, 'os', o.id), { dinabox: { em: nowIso(), lotes: [...ant, ...ls.map(({ qr, ...r }) => r)] }, ...(nl.length ? { links3d: [...ex, ...nl] } : {}) }); n++; });
  await b.commit();
  if (comCompras) for (const [c, ls] of Object.entries(por)) { const o = L.find(x => x.codigo === c); if (o) { try { await preencherComprasDinabox(sessao, o, ls); } catch {} } }
  return n;
}
const chaveMat = (m) => norm([m.d, m.m].filter(Boolean).join(' · '));
const chaveOff = (m) => chaveMat(m).replace(/[.~*/\[\]]/g, '_');
async function preencherComprasDinabox(sessao, o, lotes) {
  const M = F().fsMod; const ref = docRef('empresas', sessao.empresaId, 'compras', o.id);
  const snap = await M.getDoc(ref); const itens = (snap.exists() && snap.data().itens) || []; const off = o.dinaboxOff || {};
  const novos = []; lotes.forEach(l => (l.mats || []).forEach(m => { const k = chaveMat(m); if (off[chaveOff(m)] || itens.some(i => norm(i.descricao) === k) || novos.some(i => norm(i.descricao) === k)) return;
    novos.push({ id: rand(8), descricao: [m.d, m.m].filter(Boolean).join(' · '), qtd: m.q, unidade: '', categoria: m.c || 'Outros', origem: 'comprar', etapa: 'principal', fonte: 'Dinabox' }); }));
  if (novos.length) await M.setDoc(ref, { osId: o.id, osCod: numOS(o), cliente: o.cliente?.nome || '', itens: [...itens, ...novos], atualizadoEm: nowIso(), atualizadoPor: 'Dinabox' }, { merge: true });
  return novos.length;
}
async function sincronizarDinabox(sessao, toast, forcar) {
  try { const tk = await F().auth.currentUser.getIdToken(); const r = await fetch('/api/dinabox-pull', { headers: { authorization: 'Bearer ' + tk } }); const d = await r.json();
    if (!d.em || !(d.lotes || []).length) { if (forcar) toast('Ainda não chegaram dados do Dinabox.'); return 0; }
    if (!forcar && window.__dinaboxEm && d.em <= window.__dinaboxEm) return 0;
    const n = await importarDinabox(sessao, d.lotes, true);
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { dinaboxEm: d.em }); window.__dinaboxEm = d.em;
    toast('📦 Dinabox: materiais e peças atualizados em ' + n + ' OS.', 'ok'); return n;
  } catch (e) { if (forcar) toast('Dinabox: ' + e.message, 'erro'); return 0; }
}
function ouvirDinabox(sessao, toast) {
  if (sessao.papel === 'admin') { setTimeout(() => sincronizarDinabox(sessao, toast), 8000); setInterval(() => sincronizarDinabox(sessao, toast), 30 * 60000); }
  window.addEventListener('message', async (e) => { if (!/^https:\/\/(www\.)?dinabox\.app$/.test(e.origin) || e.data?.tipo !== 'dinabox-import') return;
    if (sessao.papel !== 'admin') return toast('Só o administrador pode importar do Dinabox.', 'erro');
    try { const n = await importarDinabox(sessao, e.data.lotes || []); toast('📦 Dinabox: materiais e peças atualizados em ' + n + ' OS.', 'ok'); e.source?.postMessage({ tipo: 'dinabox-ok', n }, e.origin); } catch (er) { toast('Não importou: ' + er.message, 'erro'); } });
}
function MateriaisDinabox({ sessao, os, toast, itens, gravar }) {
  const lotes = os.dinabox?.lotes || []; if (!lotes.length) return null;
  const off = os.dinaboxOff || {};
  const tog = async (m) => { const k = chaveMat(m); const usar = offK(m);
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { ['dinaboxOff.' + chaveOff(m)]: usar ? null : true }).catch(e => toast(e.message, 'erro'));
    if (usar) { if (!itens.some(i => norm(i.descricao) === k)) gravar([...itens, { id: rand(8), descricao: [m.d, m.m].filter(Boolean).join(' · '), qtd: m.q, unidade: '', categoria: m.c || 'Outros', origem: 'comprar', etapa: 'principal', fonte: 'Dinabox' }]); }
    else gravar(itens.filter(i => !(norm(i.descricao) === k && !i.comprado && !i.recebido))); };
  const offK = (m) => !!off[chaveOff(m)];
  return html`<details class="card din-card"><summary><b>📦 Do Dinabox: ${lotes.reduce((n, l) => n + (l.mats || []).length, 0)} materiais</b> <small class="dim">${lotes.length} lote(s) · ${fmtData(os.dinabox.em)} · toque para desmarcar o que não vai comprar</small></summary>
    ${lotes.map(l => { const g = {}; (l.mats || []).forEach(m => (g[m.c || 'Outros'] = g[m.c || 'Outros'] || []).push(m)); return html`<div key=${l.lote} class="po2-amb"><div class="po2-amb-t"><b>${l.nome}</b><em>lote ${l.lote}</em></div>
      ${Object.entries(g).map(([c, ms]) => html`<div key=${c} class="oe-acess"><div class="oe-acess-t">${c}</div>${ms.map((m, i) => { const des = offK(m); return html`<label key=${i} class=${'oe-it din-it' + (des ? ' off' : '')}><input type="checkbox" checked=${!des} onChange=${() => tog(m)} /><b>${m.q}</b> · ${m.d} <small>${m.m}</small></label>`; })}</div>`)}</div>`; })}</details>`;
}
function PecasDinabox({ sessao, o, toast }) {
  const lotes = o.dinabox?.lotes || []; const conf = o.pecasConf || {}; const [q, setQ] = useState('');
  const tog = (k) => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { ['pecasConf.' + k]: conf[k] ? null : { por: sessao.nome, em: nowIso() } }).catch(e => toast(e.message, 'erro'));
  if (!lotes.length) return html`<div class="card"><div class="vazio dim">Nenhuma lista de peças do Dinabox para esta OS ainda.</div></div>`;
  const tot = lotes.reduce((n, l) => n + (l.pcs || []).length, 0), ok = Object.values(conf).filter(Boolean).length;
  return html`<div class="stack po po-pecas"><div class="row" style=${{ gap: '8px', alignItems: 'center' }}><b>🧩 Lista de peças (Dinabox)</b><span class="chip">${ok}/${tot} conferidas</span><input class="inp inp-sm" style=${{ flex: 1 }} placeholder="🔍 Buscar peça, código, material" value=${q} onInput=${e => setQ(e.target.value)} /></div>
    ${lotes.map(l => { const g = {}; (l.pcs || []).forEach((p, i) => { if (q && !norm(Object.values(p).join(' ')).includes(norm(q))) return; (g[p.g || 'Peças'] = g[p.g || 'Peças'] || []).push([p, i]); });
      return html`<div key=${l.lote} class="po2-amb"><div class="po2-amb-t"><b>${l.nome}</b><em>${(l.pcs || []).length} peças</em></div>
      ${Object.entries(g).map(([mod, ps]) => html`<div key=${mod} class="pc-mod"><div class="oe-acess-t">${mod}</div>
        ${ps.map(([p, i]) => { const k = l.lote + '_' + i; const f = conf[k]; return html`<label key=${k} class=${'pc-it' + (f ? ' ok' : '')}><input type="checkbox" checked=${!!f} onChange=${() => tog(k)} /><b class="mono">${p.c}</b><span class="pc-n">${p.q}× ${p.n}</span><small>${p.m}</small><span class="mono pc-d">${p.l} × ${p.a}</span>${p.u && html`<em>Usinagem: ${p.u}</em>`}</label>`; })}</div>`)}</div>`; })}</div>`;
}
function MontagemFicha({ sessao, o, toast, irAba }) {
  const [url, setUrl] = useState(''), [nome, setNome] = useState(''), [qr, setQr] = useState(null);
  const links = o.links3d || [];
  const salvar = (l) => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { links3d: l, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }).catch(e => toast(e.message, 'erro'));
  const add = () => { let u = url.trim(); if (!u) return toast('Cole o link do QR Code do Dinabox.'); if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    salvar([...links, { url: u, nome: nome.trim() || 'Projeto 3D', por: sessao.nome, em: nowIso() }]); setUrl(''); setNome(''); toast('Link salvo.', 'ok'); };
  const end = o.cliente?.enderecoMontagem || o.cliente?.endereco || '';
  return html`<div class="stack">
    <div class="card stack mont-card">
      <b>🧊 Projeto 3D para a montagem</b>
      <small class="dim">No Dinabox, abra o lote → "Obter link QRCODE" → copie o link e cole aqui. O montador abre direto na obra.</small>
      ${links.length ? html`<div class="mont-links">${links.map((l, i) => html`<div key=${i} class="mont-link">
          <a class="btn btn-primary" href=${l.url} target="_blank" rel="noopener">🧊 Abrir ${l.nome}</a>
          <button class="btn btn-sm" title="Mostrar QR Code" onClick=${() => setQr(l)}>▦ QR</button>
          <button class="btn btn-sm" title="Copiar link" onClick=${() => { navigator.clipboard?.writeText(l.url); toast('Link copiado.', 'ok'); }}>📋</button>
          <button class="btn btn-sm btn-ghost" title="Remover" onClick=${() => confirm('Remover este link?') && salvar(links.filter((_, j) => j !== i))}>🗑</button></div>`)}</div>`
        : html`<div class="vazio dim">Nenhum link 3D ainda.</div>`}
      <div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}><input class="inp" style=${{ flex: 3, minWidth: '200px' }} placeholder="Cole aqui o link do QR Code do Dinabox" value=${url} onInput=${e => setUrl(e.target.value)} />
        <input class="inp" style=${{ flex: 1, minWidth: '120px' }} placeholder="Nome (ex: Banheiro filha)" value=${nome} onInput=${e => setNome(e.target.value)} />
        <button class="btn btn-verde" onClick=${add}>＋ Salvar link</button></div>
    </div>
    <div class="card stack"><b>📍 Endereço de montagem</b>${end ? html`<div class="row" style=${{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}><span style=${{ flex: 1 }}>${end}</span><a class="btn btn-sm" target="_blank" rel="noopener" href=${'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end)}>🗺 Abrir no mapa</a></div>` : html`<div class="dim">Não preenchido.</div>`}
      ${o.cliente?.telefone && html`<a class="btn btn-sm" style=${{ alignSelf: 'flex-start' }} href=${'https://wa.me/55' + String(o.cliente.telefone).replace(/\D/g, '').replace(/^55/, '')} target="_blank" rel="noopener">💬 WhatsApp do cliente</a>`}</div>
    <div class="card stack mont-diario"><b>📓 Diário de obra</b><${DiarioOS} sessao=${sessao} os=${o} toast=${toast} /></div>
    <div class="card stack"><b>🪵 Peças extras pedidas na montagem</b><small class="dim">O montador pede aqui as peças que faltaram ou precisam ser refeitas.</small><${PedidosOS} sessao=${sessao} os=${o} toast=${toast} catalogo=${window.__CATALOGO || []} /></div>
    <${PlanejamentoExec} sessao=${sessao} o=${o} toast=${toast} />
    <${EletrosPuxadores} sessao=${sessao} o=${o} toast=${toast} />
    <div class="card stack"><b>🎬 Vídeo do projeto finalizado</b><small class="dim">Coloque aqui o vídeo/render do projeto para a equipe ver como deve ficar.</small><${VideosOS} sessao=${sessao} os=${o} toast=${toast} /></div>
    <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}>
      <button class="btn" onClick=${() => irAba('entrega')}>🚚 Ordem de entrega (check-list)</button>
      <button class="btn" onClick=${() => irAba('folha')}>📄 Folha da OS</button></div>
    ${qr && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${() => setQr(null)}><div class="card modal-caixa stack" style=${{ width: 'min(360px,100%)', textAlign: 'center' }}>
      <b>${qr.nome}</b><img style=${{ width: '100%', imageRendering: 'pixelated' }} src=${'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr.url)} alt="QR Code" />
      <small class="dim">Aponte a câmera do celular para abrir o 3D.</small><button class="btn" onClick=${() => setQr(null)}>Fechar</button></div></div>`, document.body)}
  </div>`;
}
function AndamentoFicha({ sessao, o, toast, pend, compras, peds, falta = [], irAba }) {
  const [bloq, setBloq] = useState(null);
  const exigir = (titulo, acao) => { if (!String(o.cliente?.enderecoMontagem || '').trim()) return toast('📍 Falta o endereço de montagem: abra Editar OS e preencha no final da OS.', 'erro'); if (!falta.length) return acao(); setBloq({ titulo, acao }); };
  const alterar = async (fn) => {
    const c = JSON.parse(JSON.stringify(o)); fn(c); const patch = {};
    Object.keys(c).forEach(k => { if (k !== 'id' && JSON.stringify(c[k]) !== JSON.stringify(o[k])) patch[k] = c[k]; });
    if (!Object.keys(patch).length) return;
    if (patch.status && patch.status !== o.status) patch.statusHist = [...(o.statusHist || []), { st: patch.status, em: nowIso(), quem: sessao.nome }];
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { ...patch, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const p = pctObra(o), parc = parceirosDaOS(o), rec = compras.filter(i => i.recebido).length;
  const parar = async () => { const m = await pedirMotivo('Parar esteira'); if (!m) return; await alterar(x => { x.parada = { motivo: m, por: sessao.nome, em: nowIso() }; }); registrar(sessao, o.id, '⏸', 'Esteira parada', m); };
  const retomar = async () => { const pd = o.parada; await alterar(x => { x.paradas = [...(x.paradas || []), { ...pd, fim: nowIso(), fimPor: sessao.nome }]; delete x.parada; x.parada = null; }); registrar(sessao, o.id, '▶', 'Esteira retomada', pd?.motivo || ''); };
  return html`<div class=${'stack' + (o.parada ? ' est-parada' : '')}>
    ${bloq && html`<${LiberarPendencias} sessao=${sessao} falta=${falta} titulo=${bloq.titulo} irAba=${(ab) => { setBloq(null); irAba && irAba(ab); }} fechar=${() => setBloq(null)} onOk=${async (mot) => { registrar(sessao, o.id, '🔓', bloq.titulo + ' com pendência (liberado)', mot); await bloq.acao(); try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { liberacoes: [...(o.liberacoes || []), { oque: bloq.titulo, motivo: mot, por: sessao.nome, em: nowIso(), falta: falta.map(x => x[0]) }] }); } catch {} }} />`}
    ${o.parada ? html`<div class="parada-box"><div><b>⏸ Esteira parada</b> há ${durTxt(Date.now() - new Date(o.parada.em))}<div class="parada-mot">Motivo: ${o.parada.motivo}</div><small>por ${o.parada.por} · ${fmtData(o.parada.em)}</small></div><button class="btn btn-verde btn-anim" onClick=${retomar}>▶ Retomar esteira</button></div>`
      : html`<div class="row" style=${{ justifyContent: 'flex-end' }}><button class="btn btn-sm btn-parar" onClick=${parar}>⏸ Parar esteira</button></div>`}
    ${(o.paradas || []).length > 0 && html`<details class="parada-hist"><summary>⏸ ${o.paradas.length} parada(s) anteriores · ${durTxt(o.paradas.reduce((n, x) => n + (new Date(x.fim) - new Date(x.em)), 0))} paradas no total</summary>${o.paradas.slice().reverse().map((x, i) => html`<div key=${i}><b>${durTxt(new Date(x.fim) - new Date(x.em))}</b> · ${x.motivo} <small class="dim">(${x.por}, ${fmtData(x.em)})</small></div>`)}</details>`}
    <div class="card stack"><div class="row" style=${{ justifyContent: 'space-between' }}><b>📈 Conclusão da obra</b><small class="dim">${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</small></div><${BarraPct} p=${p} grande=${true} />
      <div class="fo-kpis">
        <div><small>🛒 Compras recebidas</small><b>${rec}/${compras.length}</b></div>
        <div><small>🤝 Parceiros recebidos</small><b>${parc.filter(x => x.st === 'recebido').length}/${parc.length}</b></div>
        <div><small>⚠ Pendências do diário</small><b style=${{ color: pend.length ? 'var(--danger)' : '' }}>${pend.length}</b></div>
        <div><small>🪵 Peças extras abertas</small><b>${peds.filter(pedAberto).length}</b></div>
        <div><small>🚚 Entrega</small><b>${o.prazoEntrega || '—'}</b></div>
      </div>
      ${parc.length > 0 && html`<div class="qg-parc">${parc.map(x => { const st = infoSt(x.st); return html`<span key=${x.k} class="qg-chip" style=${{ borderColor: st[3], background: st[3] + '1f' }}><span>${x.ic}</span>${x.t.split(/[ /]/)[0]}<b style=${{ color: st[3] }}>· ${st[2]}</b>${x.previsao ? html`<small>${String(x.previsao).slice(0, 5)}</small>` : ''}</span>`; })}</div>`}
    </div>
    ${(() => { const st = STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || ''), i = STATUS_OS.findIndex(y => y.v === st), prox = STATUS_OS[i + 1], ant = STATUS_OS[i - 1];
      const modo = o.modoExecucao === 'terceirizada' ? 'terc_ext' : (o.modoExecucao || 'interna');
      const mudar = async (alvo, motivo) => { const patch = { status: alvo.v, statusHist: [...(o.statusHist || []), { st: alvo.v, em: nowIso(), quem: sessao.nome }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome }; if (motivo) patch.reaberturas = [...(o.reaberturas || []), { oque: 'Status: ' + (STATUS_OS[i] || {}).t + ' → ' + alvo.t, motivo, quem: sessao.nome, quando: nowIso() }];
        try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), patch); registrar(sessao, o.id, motivo ? '↺' : '➡️', 'Etapa: ' + alvo.t.replace(/^\d+\. /, ''), motivo || ''); } catch (e) { toast(e.message, 'erro'); } };
      return html`<div class="card stack">
        <div class="row" style=${{ justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}><b>🗂 Esteira do escritório</b>
          <div class="seg-mini">${[['interna', '🏭 Produção interna'], ['terc_int', '🤝 Terceirizada interna'], ['terc_ext', '🚚 Terceirizada externa']].map(([v, t]) => html`<button key=${v} class=${modo === v ? 'on' : ''} onClick=${() => alterar(x => { x.modoExecucao = v; })}>${t}</button>`)}</div></div>
        ${(() => { const H = (o.statusHist || []).filter(h => h.em); const t0 = o.inicioEscritorio || H[0]?.em; const dur = {}; H.forEach((h, k) => { const fim = H[k + 1]?.em || (h.st === st ? nowIso() : null); if (fim) dur[h.st] = (dur[h.st] || 0) + (new Date(fim) - new Date(h.em)); });
          return html`<div class="est-os">${STATUS_OS.map((s2, j) => html`<div key=${s2.v} class=${'est-os-p' + (j < i ? ' f' : j === i && t0 ? ' a' : '')}><i>${j < i ? '✓' : j + 1}</i><small>${s2.t.replace(/^\d+\. /, '')}</small>${dur[s2.v] ? html`<em class="est-t">${j === i ? '⏱ ' : ''}${durTxt(dur[s2.v])}</em>` : ''}</div>`)}</div>
          ${t0 ? html`<small class="dim">⏱ Total no escritório: <b>${durTxt(Date.now() - new Date(t0))}</b> · iniciado ${fmtData(t0)}</small>` : ''}`; })()}
        ${!(o.inicioEscritorio || (o.statusHist || []).length) ? html`<button class="btn btn-primary btn-anim" onClick=${() => alterar(x => { x.inicioEscritorio = nowIso(); x.statusHist = [{ st: x.status || STATUS_OS[0].v, em: nowIso(), quem: sessao.nome }]; })}>▶ Iniciar esteira do escritório</button>` : html`<div class="row" style=${{ gap: '8px' }}>
          ${ant && html`<button class="btn btn-anim" onClick=${async () => { const m = await pedirMotivo('Voltar para ' + ant.t.replace(/^\d+\. /, '')); if (m) mudar(ant, m); }}>◀ Voltar etapa</button>`}
          ${prox ? html`<button class="btn btn-verde btn-anim" style=${{ flex: 1 }} onClick=${() => (prox === STATUS_OS[STATUS_OS.length - 1] || /produ/i.test(prox.t)) ? exigir('Avançar para ' + prox.t.replace(/^\d+\. /, ''), () => mudar(prox)) : mudar(prox)}>▶ Avançar para ${prox.t.replace(/^\d+\. /, '')}</button>` : html`<div class="ok-box" style=${{ flex: 1 }}>✅ OS concluída</div>`}
        </div>`}</div>`; })()}
    ${(() => { const et = o.execucao?.etapas || {}; const i = ETAPAS_FAB.findIndex(([k]) => et[k]?.status !== 'pronto'); const atual = i < 0 ? ETAPAS_FAB.length : i;
      const prox = ETAPAS_FAB[atual], ant = ETAPAS_FAB[atual - 1];
      const salvarEt = (fn, log, mot) => alterar(x => { x.execucao = x.execucao || {}; x.execucao.etapas = x.execucao.etapas || {}; fn(x.execucao.etapas, x); if (mot) x.reaberturas = [...(x.reaberturas || []), { oque: log, motivo: mot, quem: sessao.nome, quando: nowIso() }]; registrar(sessao, o.id, mot ? '↺' : '🏭', log, mot || ''); });
      const concluir = () => atual === ETAPAS_FAB.length - 1 ? exigir('Concluir a produção', concluir0) : concluir0();
      const concluir0 = () => salvarEt((E, x) => { E[prox[0]] = { ...(E[prox[0]] || {}), status: 'pronto', concluidaEm: nowIso(), concluidaPor: sessao.nome }; const n = ETAPAS_FAB[atual + 1]; if (n) E[n[0]] = { ...(E[n[0]] || {}), status: 'andamento', iniciadaEm: nowIso() }; }, 'Produção: ' + prox[1] + ' concluída');
      const voltar = async () => { const m = await pedirMotivo('Reabrir ' + ant[1]); if (!m) return; salvarEt(E => { E[ant[0]] = { ...(E[ant[0]] || {}), status: 'andamento' }; if (prox) E[prox[0]] = { ...(E[prox[0]] || {}), status: 'pendente' }; }, 'Produção: ' + ant[1] + ' reaberta', m); };
      return html`<div class="card stack"><b>🏭 Esteira da produção</b>
        ${(() => { const iniP = ETAPAS_FAB.map(([k]) => et[k]?.iniciadaEm).filter(Boolean).sort()[0];
          return html`<div class="est-os">${ETAPAS_FAB.map(([k, t], j) => { const e = et[k] || {}; const ms = e.iniciadaEm ? (new Date(e.concluidaEm || Date.now()) - new Date(e.iniciadaEm)) : 0; return html`<div key=${k} class=${'est-os-p' + (j < atual ? ' f' : j === atual && e.status === 'andamento' ? ' a' : '')}><i>${j < atual ? '✓' : j + 1}</i><small>${t}</small>${ms ? html`<em class="est-t">${e.status === 'pronto' ? '' : '⏱ '}${durTxt(ms)}</em>` : ''}</div>`; })}</div>
          ${iniP ? html`<small class="dim">⏱ Total na produção: <b>${durTxt((ETAPAS_FAB.every(([k]) => et[k]?.status === 'pronto') ? new Date(ETAPAS_FAB.map(([k]) => et[k]?.concluidaEm).filter(Boolean).sort().pop()) : Date.now()) - new Date(iniP))}</b> · iniciada ${fmtData(iniP)}</small>` : ''}`; })()}
        ${ETAPAS_FAB.every(([k]) => !et[k]?.status || et[k]?.status === 'pendente') ? html`<button class="btn btn-primary btn-anim" onClick=${() => salvarEt(E => { E[ETAPAS_FAB[0][0]] = { ...(E[ETAPAS_FAB[0][0]] || {}), status: 'andamento', iniciadaEm: nowIso() }; }, 'Produção iniciada')}>▶ Iniciar esteira da produção</button>` : ''}
        <div class="row" style=${{ gap: '8px' }}>
          ${ant && html`<button class="btn btn-anim" onClick=${voltar}>◀ Reabrir etapa</button>`}
          ${prox ? html`<button class="btn btn-verde btn-anim" style=${{ flex: 1 }} onClick=${concluir}>✓ Concluir ${prox[1]}${ETAPAS_FAB[atual + 1] ? ' → ' + ETAPAS_FAB[atual + 1][1] : ''}</button>` : html`<div class="ok-box" style=${{ flex: 1 }}>✅ Produção concluída</div>`}
        </div></div>`; })()}
    ${['terceirizada', 'terc_int', 'terc_ext'].includes(o.modoExecucao) && html`<div class="card stack"><${PedidosOS} sessao=${sessao} os=${o} toast=${toast} catalogo=${window.__CATALOGO || []} /></div>`}
  </div>`;
}
function FichaOS({ sessao, osId, fechar, editar, toast }) {
  const [o, setO] = useState(undefined);
  const [compras, setCompras] = useState([]);
  const [peds, setPeds] = useState([]);
  const [pend, setPend] = useState([]);
  useEffect(() => {
    const { onSnapshot, query, where } = F().fsMod; const e = sessao.empresaId;
    const u = [
      onSnapshot(docRef('empresas', e, 'os', osId), d => setO(d.exists() ? { id: d.id, ...d.data() } : null), () => setO(null)),
      onSnapshot(docRef('empresas', e, 'compras', osId), d => setCompras(d.exists() ? (d.data().itens || []) : []), () => {}),
      onSnapshot(query(col('empresas', e, 'pedidos'), where('osId', '==', osId)), s => setPeds(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(col('empresas', e, 'os', osId, 'diario'), s => setPend(s.docs.map(d => d.data()).filter(x => x.tipo === 'pendencia' && !x.resolvida)), () => {}),
    ];
    return () => u.forEach(f => f && f());
  }, [osId]);
  const [enviar, setEnviar] = useState(false);
  useEffect(() => { window.__ultimaOS = osId; }, [osId]);
  const [ordP, setOrdP] = useState(false);
  const histV = useRef([]), pularHist = useRef(false), ultV = useRef(null);
  const [modoV, setModoV] = useState(() => { const m = window.__modoFicha; window.__modoFicha = null; return ({ calendario: 'cal', folha: 'folha' })[m] || (['andamento', 'montagem', 'pecas', 'compras', 'fin', 'amostras', 'folha', 'entrega', 'cal'].includes(m) ? m : 'andamento'); });
  useEffect(() => { if (ultV.current && ultV.current !== modoV && !pularHist.current) histV.current.push(ultV.current); pularHist.current = false; ultV.current = modoV; }, [modoV]);
  const [tarOS, setTarOS] = useState([]);
  useEffect(() => { const { onSnapshot, query, where } = F().fsMod; return onSnapshot(query(col('empresas', sessao.empresaId, 'tarefas'), where('osId', '==', osId)), s => setTarOS(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'concluida').sort((a, b) => a.inicio.localeCompare(b.inicio))), () => {}); }, [osId]);
  const [todas, setTodas] = useState([]);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => setTodas(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}), []);
  useEffect(() => { if (o === null) fechar(); }, [o]);
  if (!o) return null;
  const fin = osConcluida(o);
  const editarMot = async () => {
    const revisada = o.revisao?.em && (!o.atualizadoEm || o.revisao.em >= o.atualizadoEm);
    if (!revisada) return editar(osId);
    const mot = await pedirMotivo('Abrir OS ' + numOS(o) + ' para edição', 'A OS já está salva. Informe o motivo da edição.');
    if (!mot) return;
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { reaberturas: [...(o.reaberturas || []), { oque: 'Aberta para edição', motivo: mot, quem: sessao.nome, quando: nowIso() }] }); } catch {}
    editar(osId);
  };
  const imprimir = () => { document.body.classList.add('imp-ficha'); setTimeout(() => { window.print(); document.body.classList.remove('imp-ficha'); }, 150); };
  const cor = corOS(o);
  const et = o.execucao?.etapas || {};
  const parc = parceirosDaOS(o);
  const faltaCompra = compras.filter(i => !i.comprado);
  const pedAb = peds.filter(pedAberto);
  const parcAb = parc.filter(p => p.st !== 'recebido');
  const etAb = ETAPAS_FAB.filter(([k]) => et[k] && et[k].status !== 'pronto' && et[k].onde !== 'nao');
  const faltaI = [
    ...parcAb.map(p => [p.ic + ' ' + p.t + ': ' + infoSt(p.st)[2], 'compras']),
    ...faltaCompra.map(i => ['🛒 Comprar: ' + (i.qtd ? i.qtd + ' ' : '') + i.descricao + (i.parceiro ? ' (' + i.parceiro + ')' : ''), 'compras']),
    ...pedAb.map(p => ['🪵 Peça extra: ' + resumoPed(p), 'andamento']),
    ...pend.map(p => ['⚠️ Pendência: ' + String(p.texto || '').slice(0, 90), 'montagem']),
  ];
  const falta = faltaI.map(x => x[0]);
  const fim = (o.statusHist || []).slice().reverse().find(h => h.st === 'concluida');
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack ficha" style=${{ width: 'min(720px,100%)', '--cc': cor }}>
      <div class="ficha-cab"><button class="ficha-voltar" title="Voltar" onClick=${() => { const h = histV.current; if (h.length) { pularHist.current = true; setModoV(h.pop()); } else fechar(); }}>←</button><div><div class="ficha-num">${numOS(o)} <span>${fin ? '✅ Finalizada' + (fim ? ' · ' + fmtData(fim.em) : '') : ((STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0] || {}).t || '').replace(/^\d+\. /, '')}</span></div>
        <b>${nomePadrao(o.cliente?.nome)} <button class="edit-cli" title="Editar nome do cliente" onClick=${async () => {
          const antigo = o.cliente?.nome || ''; const novo = nomePadrao(await pedirTexto('✏️ Nome do cliente', 'Nome do cliente', antigo) || ''); if (!novo || novo === antigo) return;
          const outras = baseCli(antigo) && baseCli(antigo) !== baseCli(novo) ? (await F().fsMod.getDocs(col('empresas', sessao.empresaId, 'os'))).docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.id !== o.id && baseCli(x.cliente?.nome) === baseCli(antigo)) : [];
          let todas = false; if (outras.length) { const r = await escolher('Trocar em todas?', '"' + baseCli(antigo) + '" tem mais ' + outras.length + ' OS.', [{ v: 't', t: 'Trocar em todas as ' + (outras.length + 1) + ' OS', cls: 'btn-primary' }, { v: 'u', t: 'Só nesta OS' }]); if (!r) return; todas = r === 't'; }
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { cliente: { ...(o.cliente || {}), nome: novo }, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); registrar(sessao, o.id, '👤', 'Nome do cliente', antigo + ' → ' + novo);
            if (todas) await unificarCliente(sessao, outras, baseCli(antigo), baseCli(novo)); toast('Nome atualizado' + (todas ? ' em ' + (outras.length + 1) + ' OS.' : '.'), 'ok'); } catch (e) { toast(e.message, 'erro'); } }}>✏️</button></b><small>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}${o.prazoEntrega ? ' · entrega ' + dm(o.prazoEntrega) : ''}</small></div>
        <button class="x-btn" style=${{ color: '#fff' }} onClick=${fechar}>✕</button></div>

      <div class="ficha-acoes">
        <button class="btn btn-grande btn-primary" onClick=${editarMot}>✏️ Editar OS</button>
        <button class="btn btn-grande" onClick=${imprimir}>🖨 Imprimir</button>
        ${tarOS.length ? html`<button class="btn btn-grande btn-verde" onClick=${() => { const t = tarOS[0]; const h = isoD(new Date()); const d = t.inicio <= h && t.fim >= h ? h : t.inicio; fechar(); window.__irCronograma && window.__irCronograma(d, { p: norm(t.pessoa), d }); }}>📅 Ver no cronograma</button>`
          : html`<button class="btn btn-grande btn-verde" onClick=${() => setEnviar(true)}>📅 Enviar ao cronograma</button>`}
        <button class=${'btn btn-grande' + (modoV === 'cal' ? ' btn-primary' : '')} onClick=${() => setModoV(modoV === 'cal' ? 'andamento' : 'cal')}>📆 Ver no calendário</button>
        <button class="btn btn-grande btn-ordem-parc" onClick=${() => setOrdP(true)}>🧾 Ordens a terceiros</button>
      </div>
      ${ordP && html`<${OrdemParceiro} sessao=${sessao} o=${o} toast=${toast} fechar=${() => setOrdP(false)} />`}
      ${(o.liberacoes || []).length > 0 && falta.length > 0 && (() => { const L = o.liberacoes[o.liberacoes.length - 1]; return html`<div class="lib-aviso" title=${'Pendências na liberação: ' + (L.falta || []).join('; ')}>🔓 <b>Liberado com pendência</b> · ${L.oque} — <i>${L.motivo}</i> <small>(${L.por}, ${fmtData(L.em)})</small></div>`; })()}
      <div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>${[['andamento', '🏭 Andamento'], ['montagem', '🔧 Montagem'], ['pecas', '🧩 Peças'], ['compras', '🛒 Compras'], ['fin', '🧾 Notas & financeiro'], ['amostras', '📦 Amostras'], ['folha', '📄 Folha de impressão'], ['entrega', '🚚 Ordem de entrega'], ['cal', '📆 Calendário']].filter(([k]) => k !== 'fin' || pode(sessao, 'financeiro') || pode(sessao, 'compras')).map(([k, t]) => html`<button key=${k} class=${modoV === k ? 'on' : ''} onClick=${() => setModoV(k)}>${t}</button>`)}</div>
      ${modoV === 'temas' && html`<${VisaoTemas} os=${o} />`}
      ${modoV === 'pecas' && html`<${PecasDinabox} sessao=${sessao} o=${o} toast=${toast} />`}
      ${modoV === 'montagem' && html`<${MontagemFicha} sessao=${sessao} o=${o} toast=${toast} irAba=${setModoV} />`}
      ${modoV === 'andamento' && html`<${AndamentoFicha} falta=${faltaI} irAba=${setModoV} sessao=${sessao} o=${o} toast=${toast} pend=${pend} compras=${compras} peds=${peds} />`}
      ${modoV === 'cal' && html`<${CalendarioOS} sessao=${sessao} os=${o} />`}
      ${modoV === 'fin' && html`<div class="ficha-compras"><${FinanceiroOS} sessao=${sessao} os=${o} toast=${toast} /></div>`}
      ${modoV === 'amostras' && html`<div class="ficha-compras"><${Amostras} sessao=${sessao} toast=${toast} os=${o} /></div>`}
      ${modoV === 'diario' && html`<${MontagemFicha} sessao=${sessao} o=${o} toast=${toast} irAba=${setModoV} />`}
      ${modoV === 'compras' && html`<div class="ficha-compras"><${ComprasOS} sessao=${sessao} os=${o} toast=${toast} /></div>`}
      <div class=${'ficha-papel' + (modoV === 'folha' || modoV === 'entrega' ? '' : ' so-imp')}>${modoV === 'entrega' ? html`<${OrdemEntrega} os=${o} empresa=${sessao.empresaNome} />` : html`<${ComChaves} dep=${JSON.stringify(o).length}><${ImpressaoOS} os=${o} empresa=${sessao.empresaNome} /></${ComChaves}>`}</div>
      ${fin && html`<div class=${'ficha-falta' + (falta.length ? '' : ' ok')}>${falta.length ? html`<b>⚠ Falta ${falta.length} ${falta.length === 1 ? 'coisa' : 'coisas'}</b>${faltaI.map(([f, ab], i) => html`<button key=${i} class="falta-it" onClick=${() => setModoV(ab)}>• ${f} <small>→ abrir</small></button>`)}` : html`<b>✓ Nada pendente — tudo comprado, recebido e concluído</b>`}</div>`}
      ${fin && html`<div class="ficha-sec">🤝 Terceiros / parceiros</div>
      ${parc.length ? html`<div class="ficha-lista">${parc.map(p => { const i = infoSt(p.st); return html`<div key=${p.k} class="fl-i"><span>${p.ic} <b>${p.t}</b>${p.fornecedor || p.nome ? html` <small>${p.fornecedor || p.nome}</small>` : ''}</span><span class="fl-st" style=${{ background: i[3] }}>${i[2]}</span></div>`; })}</div>` : html`<div class="dim">Nenhum item com terceiros.</div>`}

      <div class="ficha-sec">🛒 Compras <small class="dim">${compras.length - faltaCompra.length}/${compras.length} compradas</small></div>
      ${compras.length ? html`<div class="ficha-lista">${compras.map((i, j) => html`<div key=${j} class="fl-i"><span>${i.comprado ? '✅' : '⬜'} ${i.qtd ? i.qtd + ' ' : ''}${i.descricao}${i.parceiro ? html` <small>${i.parceiro}</small>` : ''}</span><span class="fl-st" style=${{ background: i.comprado ? '#16a34a' : '#dc2626' }}>${i.comprado ? 'Comprado' : 'Falta'}</span></div>`)}</div>` : html`<div class="dim">Sem folha de compras.</div>`}

      ${peds.length > 0 && html`<div class="ficha-sec">🪵 Peças extras</div><div class="ficha-lista">${peds.map(p => { const s = ((PED_ST[p.tipo] || PED_ST.interno).find(x => x[0] === p.st) || []); return html`<div key=${p.id} class="fl-i"><span>${resumoPed(p)}</span><span class="fl-st" style=${{ background: s[2] || '#9ca3af' }}>${s[1] || p.st}</span></div>`; })}</div>`}

`}
      <${LinhaDoTempo} os=${o} sessao=${sessao} />
      <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${fechar}>Fechar</button>
        <button class="btn btn-grande btn-primary" style=${{ flex: 1 }} onClick=${editarMot}>✏️ Editar OS</button></div>
      ${enviar && html`<${NovaTarefa} sessao=${sessao} lista=${todas} osInicial=${o} toast=${toast} fechar=${() => setEnviar(false)} aoLancar=${fechar} />`}
    </div></div>`, document.body);
}
function linhaDoTempo(os, extras) {
  const ev = [];
  if (os.criadoEm) ev.push({ q: os.criadoEm, ic: '🆕', t: 'OS criada', d: (os.origem ? 'origem: ' + os.origem : ''), p: os.criadoPor });
  (os.historico || []).forEach(h => ev.push({ q: h.quando, ic: '🔓', t: 'Desbloqueada para edição', d: h.motivo, p: h.quem }));
  (os.alteracoes || []).forEach(a => ev.push({ q: a.quando, ic: '📝', t: 'Pedido de alteração nº ' + a.n + ' (' + a.itens.length + ' itens)', d: a.motivo, p: a.quem }));
  (os.reaberturas || []).forEach(r => ev.push({ q: r.quando, ic: '↺', t: r.oque, d: r.motivo, p: r.quem }));
  Object.entries(os.execucao?.etapas || {}).forEach(([k, e]) => { if (e.concluidaEm) ev.push({ q: e.concluidaEm, ic: '✅', t: 'Etapa concluída: ' + ((ETAPAS_FAB.find(x => x[0] === k) || [])[1] || k) }); });
  Object.entries(os.parceiros || {}).forEach(([k, pa]) => (pa.hist || []).forEach(h => ev.push({ q: h.em, ic: '🤝', t: ((TIPOS_PARC.find(x => x[0] === k) || [])[2] || k) + ': ' + infoSt(h.st)[2], d: h.motivo || '', p: h.quem })));
  (os.contrato?.arquivos || []).forEach(a => ev.push({ q: a.em, ic: '📑', t: 'Contrato anexado: ' + a.nome }));
  (os.revisoes || []).forEach(r => ev.push({ q: r.em, ic: '☑️', t: 'Revisada', p: r.por }));
  if (os.restauradaEm) ev.push({ q: os.restauradaEm, ic: '♻️', t: 'OS restaurada', p: os.restauradaPor });
  (os.statusHist || []).forEach(h => ev.push({ q: h.em, ic: '➡️', t: 'Etapa da OS: ' + ((STATUS_OS.find(x => x.v === h.st) || {}).t || h.st).replace(/^\d+\. /, ''), p: h.quem }));
  Object.entries(os.execucao?.etapas || {}).forEach(([k, e]) => { if (e.iniciadaEm) ev.push({ q: e.iniciadaEm, ic: '▶️', t: 'Iniciou: ' + ((ETAPAS_FAB.find(x => x[0] === k) || [])[1] || k), p: e.iniciadaPor }); });
  (extras || []).forEach(e => ev.push(e));
  if (os.atualizadoEm) ev.push({ q: os.atualizadoEm, ic: '💾', t: 'Última modificação', p: os.atualizadoPor, ultima: true });
  return ev.filter(e => e.q).sort((a, b) => String(b.q).localeCompare(String(a.q)));
}
function LinhaDoTempo({ os, sessao }) {
  const [extras, setExtras] = useState([]);
  useEffect(() => { if (!os?.id || !sessao?.empresaId) return; return F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os', os.id, 'eventos'), s => setExtras(s.docs.map(d => d.data())), () => setExtras([])); }, [os?.id]);
  const ev = linhaDoTempo(os, extras);
  return html`<details class="card page-card"><summary><b>🕒 Linha do tempo — datas das modificações</b> <span class="chip">${ev.length}</span></summary>
    <div class="tl">${ev.map((e, i) => html`<div key=${i} class=${'tl-i' + (e.ultima ? ' ult' : '')}><span class="tl-ic">${e.ic}</span>
      <div><div class="tl-d">${new Date(e.q).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}${e.p ? ' · ' + e.p : ''}</div><b>${e.t}</b>${e.d ? html`<div class="dim">${e.d}</div>` : ''}</div></div>`)}</div></details>`;
}

function ImpressaoPedido({ os, pedido, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">Pedido de alteração nº ${pedido.n}</div><div class="po-sub">${os.cliente?.nome || ''} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div></div>
      <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">${fmtData(pedido.quando)} · ${pedido.quem}</div></div></div>
    <div class="po-obs" style=${{ marginTop: '12px' }}><b>Motivo</b><div>${pedido.motivo}</div></div>
    <div class="po-sec"><span>${pedido.itens.length}</span> O que está sendo alterado</div>
    <table><thead><tr><th style=${{ width: '34%' }}>Item</th><th>Como era</th><th>Como fica</th></tr></thead>
      <tbody>${pedido.itens.map((it, i) => html`<tr key=${i}><td><b>${it.campo}</b></td><td style=${{ color: '#991b1b', textDecoration: it.para === 'ADICIONADO' ? 'none' : 'line-through' }}>${it.de}</td><td style=${{ color: '#166534', fontWeight: 700 }}>${it.para}</td></tr>`)}</tbody></table>
    <div class="po-ass">${['Solicitado por', 'Produção (ciente)', 'Cliente (de acordo)'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)} · alteração ${pedido.n}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Confirmação com senha + motivo (excluir / editar OS pronta) ---------- */
async function conferirSenha(senha) {
  const { authMod, auth } = F();
  const u = auth.currentUser;
  if (!u) throw new Error('Sessão expirada. Entre de novo.');
  await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email, senha));
}
function SenhaMotivo({ titulo, texto, botao = 'Confirmar', perigo, onOk, fechar, semMotivo }) {
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [rodando, setRodando] = useState(false);
  const ok = async () => {
    if (!semMotivo && motivo.trim().length < 5) return setErro('Escreva o motivo (obrigatório, pelo menos 5 letras).');
    if (!senha) return setErro('Digite a sua senha.');
    setRodando(true); setErro('');
    try { await conferirSenha(senha); await onOk(motivo.trim() || (semMotivo ? 'Apagadas em lote (importação incorreta)' : '')); fechar(); }
    catch (e) { setErro(/password|credential/i.test(e.code || e.message) ? 'Senha incorreta.' : e.message); setRodando(false); }
  };
  return html`
    <div class="modal-fundo" onClick=${e => e.target === e.currentTarget && !rodando && fechar()}>
      <div class="card modal-caixa stack">
        <div class="sec-title">${perigo ? '🗑' : '🔓'} ${titulo}</div>
        ${texto && html`<div class="dim">${texto}</div>`}
        ${!semMotivo && html`<div class="field"><span class="lbl">Motivo (obrigatório)</span><textarea class="inp" rows="3" placeholder="Ex: cliente cancelou o ambiente / OS duplicada / correção de medida" value=${motivo} onInput=${e => setMotivo(e.target.value)} autoFocus></textarea></div>`}
        <div class="field"><span class="lbl">Sua senha</span><input class="inp" type="password" autocomplete="current-password" value=${senha} onInput=${e => setSenha(e.target.value)} onKeyDown=${e => e.key === 'Enter' && ok()} /></div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
          <button class="btn" onClick=${fechar} disabled=${rodando}>Cancelar</button>
          <button class=${'btn ' + (perigo ? 'btn-danger' : 'btn-primary')} onClick=${ok} disabled=${rodando}>${rodando ? 'Conferindo…' : botao}</button>
        </div>
      </div>
    </div>`;
}

async function excluirOS(sessao, os, motivo) {
  const { fsMod } = F();
  const { id, ...dados } = os;
  await fsMod.setDoc(docRef('empresas', sessao.empresaId, 'exclusoes', id), {
    osId: id, codigo: numOS(os), cliente: os.cliente?.nome || '', status: os.status || '', motivo,
    excluidoPor: sessao.nome, excluidoEm: nowIso(), dados: JSON.parse(JSON.stringify(dados)),
  });
  await fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'os', id));
  if (!excluirOS.lote) ajustarSequencia(sessao);
}

function TelaExcluir({ sessao, toast }) {
  const [lista, setLista] = useState(null);
  const [hist, setHist] = useState([]);
  const [busca, setBusca] = useState('');
  const [alvo, setAlvo] = useState(null);
  const [sel, setSel] = useState([]);
  const [lote, setLote] = useState(false);
  const [limparH, setLimparH] = useState(false);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'exclusoes'), orderBy('excluidoEm', 'desc')), s => setHist(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setHist([]));
    return () => { a(); b(); };
  }, []);
  const restaurar = async (h) => {
    if ((lista || []).some(o => numOS(o) === h.codigo)) {
      const prox = codigoDe(h.codigo.split('.')[0], proximoLivre(lista, h.codigo.split('.')[0]));
      const r = await escolher('Número já em uso', `A OS ${h.codigo} não pode voltar com o mesmo número: ele já está sendo usado por outra OS.`, [{ v: 'prox', t: 'Restaurar com o próximo número livre: ' + prox, cls: 'btn-primary' }, { v: 'nao', t: 'Cancelar' }]);
      if (r !== 'prox') return;
      const [a, n] = prox.split('.'); h = { ...h, dados: { ...h.dados, ano: a, numero: parseInt(n, 10), codigo: prox } };
    }
    try {
      await F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'os', h.osId), { ...h.dados, restauradaEm: nowIso(), restauradaPor: sessao.nome });
      await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'exclusoes', h.id));
      toast('OS ' + h.codigo + ' restaurada.', 'ok');
    } catch (e) { toast('Não restaurou: ' + e.message, 'erro'); }
  };
  const filtradas = (lista || []).filter(o => !busca || norm(numOS(o) + ' ' + (o.cliente?.nome || '') + ' ' + (o.ambientes || []).map(a => a.nome).join(' ')).includes(norm(busca)));
  return html`
    <div class="fade-up stack">
      <div><h2>Excluir OSs</h2><div class="dim">Para excluir é obrigatório digitar a <b>sua senha</b> e o <b>motivo</b>. Tudo fica registrado no histórico abaixo e pode ser restaurado.</div></div>
      <div class="card page-card stack">
        <input class="inp" placeholder="Buscar por número, cliente ou ambiente…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        ${filtradas.length > 0 && html`<div class="sel-barra">
          <label class="sel-todas"><input type="checkbox" checked=${filtradas.every(o => sel.includes(o.id))} onChange=${e => setSel(e.target.checked ? [...new Set([...sel, ...filtradas.map(o => o.id)])] : sel.filter(id => !filtradas.some(o => o.id === id)))} /> Selecionar todas (${filtradas.length})</label>
          ${sel.length > 0 && html`<button class="btn btn-sm" onClick=${() => setSel([])}>Limpar</button><button class="btn btn-danger" onClick=${() => setLote(true)}>🗑 Apagar ${sel.length} ${sel.length === 1 ? 'OS' : 'OSs'}</button>`}
        </div>`}
        ${lista === null ? html`<div class="dim">Carregando…</div>` : filtradas.length === 0 ? html`<div class="vazio dim">Nenhuma OS.</div>` : html`
          <div class="list">${filtradas.map(o => html`
            <div key=${o.id} class=${'list-item' + (sel.includes(o.id) ? ' sel-on' : '')} style=${pinta(o)}>
              <input type="checkbox" class="sel-ck" checked=${sel.includes(o.id)} onChange=${() => setSel(sel.includes(o.id) ? sel.filter(x => x !== o.id) : [...sel, o.id])} />
              <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
              <div class="grow"><div class="title">${o.cliente?.nome || 'Cliente não informado'}</div><div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'} · ${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</div></div>
              <button class="btn btn-sm btn-danger" onClick=${() => setAlvo(o)}>🗑 Excluir</button>
            </div>`)}</div>`}
      </div>
      <div class="card page-card stack">
        <div class="row" style=${{ justifyContent: 'space-between', gap: '8px' }}><div class="sec-title">📜 Histórico de exclusões</div>
          ${hist.length > 0 && html`<button class="btn btn-sm btn-danger" onClick=${() => setLimparH(true)}>🧹 Limpar histórico permanentemente</button>`}</div>
        ${hist.length === 0 ? html`<div class="dim">Nenhuma OS excluída.</div>` : hist.map(h => html`
          <div key=${h.id} class="item-lista" style=${{ alignItems: 'flex-start' }}>
            <span><b>OS ${h.codigo}</b> — ${h.cliente}<br/><span class="dim">Motivo: ${h.motivo}</span><br/><small class="dim">Excluída por ${h.excluidoPor} em ${fmtData(h.excluidoEm)}</small></span>
            ${sessao.papel === 'admin' && html`<button class="btn btn-sm" onClick=${() => restaurar(h)}>↩ Restaurar</button>`}
          </div>`)}
      </div>
      ${limparH && html`<${SenhaMotivo} perigo semMotivo titulo="Limpar histórico permanentemente" texto=${'As ' + hist.length + ' OSs do histórico serão apagadas para sempre e NÃO poderão mais ser restauradas.'} botao="Apagar para sempre"
        onOk=${async () => { const { writeBatch } = F().fsMod; for (let i = 0; i < hist.length; i += 400) { const b = writeBatch(F().db); hist.slice(i, i + 400).forEach(h => b.delete(docRef('empresas', sessao.empresaId, 'exclusoes', h.id))); await b.commit(); } toast('Histórico limpo.', 'ok'); }} fechar=${() => setLimparH(false)} />`}
      ${lote && html`<${SenhaMotivo} perigo semMotivo titulo=${'Apagar ' + sel.length + (sel.length === 1 ? ' OS' : ' OSs')} texto=${'Serão apagadas: ' + (lista || []).filter(o => sel.includes(o.id)).map(o => numOS(o)).join(', ') + '. Ficam no histórico e podem ser restauradas.'} botao=${'Apagar ' + sel.length}
        onOk=${async (motivo) => { let n = 0; excluirOS.lote = true; for (const o of (lista || []).filter(o => sel.includes(o.id))) { try { await excluirOS(sessao, o, motivo); n++; } catch (e) { toast('Erro em ' + numOS(o) + ': ' + e.message, 'erro'); } } excluirOS.lote = false; await ajustarSequencia(sessao); setSel([]); toast(n + (n === 1 ? ' OS apagada.' : ' OSs apagadas.') + ' Numeração ajustada.', 'ok'); }} fechar=${() => setLote(false)} />`}
      ${alvo && html`<${SenhaMotivo} perigo titulo=${'Excluir a OS ' + numOS(alvo)} texto=${(alvo.cliente?.nome || '') + ' — o número não será reaproveitado.'} botao="Excluir OS"
        onOk=${async (motivo) => { await excluirOS(sessao, alvo, motivo); toast('OS ' + numOS(alvo) + ' excluída.', 'ok'); }} fechar=${() => setAlvo(null)} />`}
    </div>`;
}

/* ---------- Cores da OS (3 bolinhas) ---------- */
const PALETAS = [
  ['Madeira', ['#6B4423', '#C8A27A', '#1F2937']], ['Grafite', ['#111827', '#6B7280', '#F59E0B']],
  ['Verde', ['#1F4D3A', '#8FB39B', '#C59B27']], ['Azul', ['#1E3A5F', '#7DA2C9', '#E0B24A']],
  ['Vinho', ['#632B30', '#D6BEB2', '#3E4144']], ['Terracota', ['#A85A44', '#E8D5C4', '#2B2B2A']],
];
const temCores = (o) => Array.isArray(o?.cores) && o.cores.length === 3;
const varsCores = (c) => ({ '--c1': c[0], '--c2': c[1], '--c3': c[2] });
const pinta = (o) => { const c = corOS(o); return { borderLeft: '5px solid ' + c, background: 'linear-gradient(90deg,' + c + '14,#fff 60%)' }; };
const MOSTRAR_CORES = false; /* bolinhas de cor ocultas por enquanto */
const bolinhas = (o) => MOSTRAR_CORES && temCores(o) ? html`<span class="bolinhas">${o.cores.map((c, i) => html`<i key=${i} style=${{ background: c }}></i>`)}</span>` : null;

function PaletaOS({ os, alterar, sessao, toast, travada }) {
  const [aberto, setAberto] = useState(false);
  const [c, setC] = useState(temCores(os) ? os.cores : PALETAS[0][1]);
  const [padrao, setPadrao] = useState(null);
  useEffect(() => { if (aberto && padrao === null) F().fsMod.getDoc(docRef('empresas', sessao.empresaId)).then(d => setPadrao(d.data()?.coresPadrao || false)).catch(() => setPadrao(false)); }, [aberto]);
  const aplicar = (cores) => { alterar(o => { o.cores = cores; }); setC(cores); };
  const salvarPadrao = async () => {
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { coresPadrao: c }); setPadrao(c); toast('Cores salvas como padrão da empresa.', 'ok'); }
    catch (e) { toast('Não salvou o padrão: ' + e.message, 'erro'); }
  };
  return html`
    <span class="opc-wrap">
      <button class="btn btn-sm btn-cores" disabled=${travada} onClick=${() => setAberto(!aberto)} title="Cores da OS"><span class="bolinhas">${c.map((x, i) => html`<i key=${i} style=${{ background: temCores(os) ? x : '#ddd' }}></i>`)}</span> Cores</button>
      ${aberto && html`
        <div class="opc-pop" style=${{ width: '300px' }}>
          <div class="opc-g">Escolha as 3 cores</div>
          <div class="row" style=${{ gap: '10px', justifyContent: 'center', padding: '6px 0' }}>
            ${['Principal', 'Fundo', 'Destaque'].map((t, i) => html`
              <label key=${i} class="bola-cor"><input type="color" value=${c[i]} onInput=${e => { const n = [...c]; n[i] = e.target.value; setC(n); }} /><i style=${{ background: c[i] }}></i><small>${t}</small></label>`)}
          </div>
          <button class="btn btn-primary btn-sm" onClick=${() => { aplicar(c); setAberto(false); }}>Aplicar nesta OS</button>
          <div class="opc-g">Paletas prontas</div>
          ${PALETAS.map(([n, p]) => html`<button key=${n} class="opc-i" onClick=${() => setC(p)}><span>${n}</span><span class="bolinhas">${p.map((x, i) => html`<i key=${i} style=${{ background: x }}></i>`)}</span></button>`)}
          <div class="opc-g">Padrão da empresa</div>
          ${padrao ? html`<button class="opc-i" onClick=${() => { aplicar(padrao); setAberto(false); }}><span>Aplicar o padrão</span><span class="bolinhas">${padrao.map((x, i) => html`<i key=${i} style=${{ background: x }}></i>`)}</span></button>` : html`<div class="dim" style=${{ padding: '0 6px' }}>Nenhum padrão salvo ainda.</div>`}
          <div class="row" style=${{ gap: '6px' }}>
            <button class="btn btn-sm" onClick=${salvarPadrao}>Salvar estas como padrão</button>
            ${temCores(os) && html`<button class="btn btn-ghost btn-sm" onClick=${() => { alterar(o => { o.cores = null; }); setAberto(false); }}>Tirar cores</button>`}
          </div>
        </div>`}
    </span>`;
}

/* ---------- Etapa 2: especificações gerais da OS ---------- */
const O = () => window.OPCOES || {};
const MATERIAIS = [['mdf', 'MDF', 'Chapas & cores'], ['formica', 'Fórmica', 'Laminados HPL'], ['lamina', 'Lâmina', 'Marcas & cores'], ['madeira', 'Madeira', 'Maciça padrão'], ['laca', 'Laca', '5 top marcas']];
const FER_ABAS = [
  { k: 'dobradicas', t: 'Dobradiças', op: 'DOB', dica: 'Retas, curvas, supercurvas, 165° robô ou invisíveis 3D — Blum, Hettich, Häfele, Grass, FGVTN', campos: [['modelo', 'Modelo da dobradiça', 'Ex: Dobradiça reta 110° com amortecedor'], ['marca', 'Marca', 'Ex: Blum Clip Top Blumotion'], ['calco', 'Calço, fixação e acabamento', 'Ex: Calço cruzado 3D, preto ônix'], ['obs', 'Observações / instalação', 'Ex: 3 dobradiças por porta acima de 1,5m']] },
  { k: 'corredicas', t: 'Corrediças de gaveta', op: 'COR', dica: 'Ocultas, toque (Tip-on), telescópicas 45mm ou gavetas metálicas slim', campos: [['modelo', 'Modelo da corrediça', 'Ex: Oculta extração total com amortecedor'], ['marca', 'Marca', 'Ex: Blum Tandem / Hettich Quadro'], ['tamanho', 'Capacidade de carga & aplicação', 'Ex: 60kg para gavetões de panelas'], ['obs', 'Observações / acessórios', 'Ex: barra estabilizadora em gavetões > 80cm']] },
  { k: 'correr', t: 'Portas de correr (armários)', op: 'CORRER', dica: 'Apoiado inferior, suspenso, coplanar ou perfil de alumínio com vidro', campos: [['modelo', 'Mecanismo do sistema', 'Ex: Suspenso coplanar'], ['marca', 'Marca', 'Ex: Rometal RO-65'], ['perfil', 'Trilhos, amortecedores e guias', 'Ex: trilho duplo com freio bilateral'], ['obs', 'Folhas / alinhamento', 'Ex: 2 folhas de 1,10m com perfil gola bronze']] },
  { k: 'passagem', t: 'Portas de passagem', op: 'PASSAGEM', dica: 'Suspensas no teto, roldanas aparentes, embutidas na parede ou pivotantes', campos: [['modelo', 'Mecanismo', 'Ex: Suspenso embutido no gesso'], ['marca', 'Marca', 'Ex: Ducasse DN80'], ['perfil', 'Guias, puxador e acessórios', 'Ex: guia invisível no piso, concha dupla'], ['obs', 'Vão / peso da folha', 'Ex: folha de 55kg, 1,00 x 2,60m']] },
];

function Opcoes({ grupos, onPick, rotulo = 'Opções' }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  useEffect(() => { if (!aberto) return; const f = (e) => { if (e && e.target && e.target.closest && e.target.closest('.opc-pop')) return; if (e && e.type === 'scroll' && btnRef.current) { const r = btnRef.current.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return setAberto(false); setPos(p => p && ({ ...p, top: r.bottom + 4 + p.h < window.innerHeight ? r.bottom + 4 : Math.max(8, r.top - 4 - p.h), left: Math.max(8, Math.min(r.right - p.w, window.innerWidth - p.w - 8)) })); return; } setAberto(false); }; const t = setTimeout(() => { window.addEventListener('scroll', f, true); window.addEventListener('resize', f); }, 50);
    return () => { clearTimeout(t); window.removeEventListener('scroll', f, true); window.removeEventListener('resize', f); }; }, [aberto]);
  if (!grupos || !grupos.length) return null;
  const nq = norm(q);
  const abrir = () => { if (aberto) return setAberto(false); const r = btnRef.current.getBoundingClientRect(); const w = Math.min(420, window.innerWidth * 0.9), h = Math.min(360, window.innerHeight * 0.6);
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)); const baixo = r.bottom + 4 + h < window.innerHeight; setPos({ left, top: baixo ? r.bottom + 4 : Math.max(8, r.top - 4 - h), w, h }); setAberto(true); };
  return html`
    <span class="opc-wrap">
      <button type="button" ref=${btnRef} class="btn btn-ghost btn-sm" onClick=${abrir}>☰ ${rotulo}</button>
      ${aberto && pos && ReactDOM.createPortal(html`<div class="opc-fundo" onClick=${() => setAberto(false)}></div>
        <div class="opc-pop opc-fixo" style=${{ left: pos.left + 'px', top: pos.top + 'px', width: pos.w + 'px', maxHeight: pos.h + 'px' }} onScroll=${e => e.stopPropagation()}>
          <input class="inp inp-sm" placeholder="Filtrar…" value=${q} onInput=${e => setQ(e.target.value)} autoFocus />
          ${grupos.map(gr => {
            const its = gr.itens.filter(i => !nq || norm(i.n + ' ' + i.b + ' ' + i.d).includes(nq));
            return its.length ? html`<div key=${gr.grupo}><div class="opc-g">${gr.grupo}</div>
              ${its.map(i => html`<button type="button" key=${i.n} class="opc-i" onClick=${() => { onPick(i.n); setAberto(false); setQ(''); }}>
                <span><b>${i.n}</b>${i.d && html`<small>${i.d}</small>`}</span>${i.b && html`<span class="chip">${i.b}</span>`}</button>`)}</div>` : null; })}
        </div>`, document.body)}
    </span>`;
}

function CampoOpc({ lbl, value, onChange, grupos, ph, dica, somar }) {
  return html`
    <div class="field">
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}><span class="lbl">${lbl}</span><${Opcoes} grupos=${grupos} onPick=${v => onChange(somar && value ? value + ' + ' + v : v)} /></div>
      <input class="inp" placeholder=${ph || ''} value=${value || ''} onInput=${e => onChange(e.target.value)} />
      ${dica && html`<small class="dim">${dica}</small>`}
    </div>`;
}

function textoAcab(a) {
  if (!a || a.aplica === false) return '';
  const t = a.tipo || 'mdf';
  if (t === 'laca') return ['Laca', a.laca?.marca, a.laca?.brilho, a.desc].filter(Boolean).join(' · ');
  return [a.fabricante, a.desc, a.esp ? a.esp + ' mm' : '', a.acabamento].filter(Boolean).join(' · ');
}
function textoFech(f) { return f?.ativo ? [f.modelo, ({ interna: 'interna', externa: 'externa', ambas: 'interna e externa' })[f.onde], f.marca, f.acab, f.qtd, f.obs].filter(Boolean).join(' · ') : ''; }
function textoTec(t) { return t?.ativo ? [t.tipo, t.ref, t.aplic, t.espuma, (O().TEC_RESP || []).find(r => r[0] === t.resp)?.[1]?.replace(/^\S+ /, ''), t.obs].filter(Boolean).join(' · ') : ''; }
function textoVidro(v) { return v?.ativo ? [v.tipo, v.esp, (v.proc || []).join(', '), v.perfil, v.aplic, v.obs].filter(Boolean).join(' · ') : ''; }

function AcabBox({ lado, a, set, catalogo, sessao }) {
  const fMDF = useMemo(() => ({ tipos: ['MDF'] }), []);
  const [fMarca, setFMarca] = useState(''); const [fTom, setFTom] = useState('');
  const tipo = a.tipo || 'mdf';
  const off = a.aplica === false;
  const op = O();
  const titulo = lado === 'interno' ? ['Acabamento interno', 'Caixaria, prateleiras, divisões e estrutura'] : ['Acabamento externo', 'Frentes, portas, vistas, painéis e tamponamentos'];
  const laminas = (op.LAMINAS || []).filter(l => (!fMarca || l[1] === fMarca) && (!fTom || l[2] === fTom));
  const coresLaca = (op.LACA_CORES || []).filter(c => c[3] === a.laca?.marca);
  const setLaca = (k, v) => set('laca', { ...(a.laca || {}), [k]: v });
  return html`
    <div class=${'acab-box' + (lado === 'externo' ? ' ext' : '') + (off ? ' off' : '')}>
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><b>${titulo[0]}</b> <span class="chip">${lado.toUpperCase()}</span><div class="dim">${titulo[1]}</div></div>
        <label class="row dim" style=${{ gap: '5px' }}><input type="checkbox" checked=${!off} onChange=${e => set('aplica', e.target.checked)} /> Aplicável</label>
      </div>
      ${off ? html`<div class="dica">Este acabamento está marcado como <b>não aplicável</b> nesta OS. <button class="btn btn-ghost btn-sm" onClick=${() => set('aplica', true)}>Habilitar agora →</button></div>` : html`
      <div class="mat-linhas">${MATERIAIS.map(([v, n, d], i) => html`<div key=${v} class=${'mat-l' + (tipo === v ? ' on' : '')} title=${d}>
        <button class=${'mat-chip' + (tipo === v ? ' on' : '')} onClick=${() => set('tipo', v)}>${tipo === v ? '✓ ' : ''}${n}</button></div>`)}</div>

      ${tipo === 'mdf' && html`
        <span class="lbl">Descrição da chapa de MDF (busca no catálogo)</span>
        <${CatalogoInput} value=${a.desc || ''} placeholder="Buscar: branco diamante, freijó, cinza sagrado…" catalogo=${catalogo} filtro=${fMDF} sessao=${sessao}
          onChange=${v => set('desc', v)} onPick=${it => { set('desc', it.nome); set('fabricante', it.fabricante); }} salvarComo=${() => ({ tipo: 'MDF', fabricante: a.fabricante || '' })} className="inp" />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${(window.__ESP?.[lado] || ['6', '15', '18', '25']).map(x => html`<button key=${x} class=${'pill' + (a.esp === x ? ' on' : '')} onClick=${() => set('esp', x)}>${x}mm</button>`)}</div>`}

      ${tipo === 'formica' && html`
        <span class="lbl">Laminado de alta pressão (Fórmica / Pertech)</span>
        <div class="swatches">${(op.FORMICA || []).map(f => html`<button key=${f[1]} class=${'sw' + (a.desc === f[0] + ' ' + f[1] ? ' on' : '')} title=${f[2]} onClick=${() => { set('desc', f[0] + ' ' + f[1]); set('fabricante', f[2]); }}><i style=${{ background: f[3] }}></i><span>${f[0]}<small>${f[2]} · ${f[1]}</small></span></button>`)}</div>
        <input class="inp" placeholder="Ou digite: Fórmica Branco Texturizado L120" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Acabamento:</span>${(op.FORMICA_ACAB || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${(op.FORMICA_ESP || []).map(x => html`<button key=${x} class=${'pill' + (a.esp === x ? ' on' : '')} onClick=${() => set('esp', x)}>${x}</button>`)}</div>`}

      ${tipo === 'lamina' && html`
        <span class="lbl">Lâminas de madeira (naturais & pré-compostas)</span>
        <div class="row" style=${{ gap: '6px' }}>
          <select class="inp inp-sm" style=${{ width: 'auto' }} value=${fMarca} onChange=${e => setFMarca(e.target.value)}><option value="">Todas as marcas</option>${(op.LAMINA_MARCAS || []).map(m => html`<option key=${m}>${m}</option>`)}</select>
          <select class="inp inp-sm" style=${{ width: 'auto' }} value=${fTom} onChange=${e => setFTom(e.target.value)}><option value="">Todas as tonalidades</option>${Object.entries(op.LAMINA_TONS || {}).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}</select>
        </div>
        <div class="swatches">${laminas.map(l => html`<button key=${l[5]} class=${'sw' + (a.desc === l[0] ? ' on' : '')} onClick=${() => { set('desc', l[0]); set('fabricante', l[1]); }}><i style=${{ background: l[4] }}></i><span>${l[0]}<small>${l[1]} · ${l[3]} · ${l[5]}</small></span></button>`)}</div>
        <input class="inp" placeholder="Ou digite a lâmina" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Verniz:</span>${(op.VERNIZES || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>`}

      ${tipo === 'madeira' && html`
        <span class="lbl">Madeiras maciças padrão em marcenaria</span>
        <div class="opcoes4">${(op.MADEIRAS || []).map(m => html`<button key=${m[0]} class=${'opc' + (a.desc === m[0] ? ' on' : '')} onClick=${() => set('desc', m[0])}><b>${m[0]}</b><small>${m[1]} — ${m[2]}</small></button>`)}</div>
        <input class="inp" placeholder="Ou digite a madeira" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Tratamento:</span>${(op.MADEIRA_TRAT || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>`}

      ${tipo === 'laca' && html`
        <span class="lbl">1. Marca da laca (obrigatório para liberar as cores)</span>
        <div class="opcoes5">${(op.LACA_MARCAS || []).map(([m, s]) => html`<button key=${m} class=${'opc' + (a.laca?.marca === m ? ' on' : '')} onClick=${() => setLaca('marca', m)}><b>${m}</b><small>${s}</small></button>`)}</div>
        <span class="lbl">2. Brilho</span>
        <div class="opcoes4">${(op.LACA_BRILHO || []).map(([b, d]) => html`<button key=${b} class=${'opc' + (a.laca?.brilho === b ? ' on' : '')} onClick=${() => setLaca('brilho', b)}><b>${b}</b><small>${d}</small></button>`)}</div>
        <span class="lbl">3. Cor</span>
        ${a.laca?.marca ? html`<div class="swatches">${coresLaca.map(c => html`<button key=${c[1]} class=${'sw' + (a.desc === c[0] + ' (' + c[1] + ')' ? ' on' : '')} onClick=${() => set('desc', c[0] + ' (' + c[1] + ')')}><i style=${{ background: c[2] }}></i><span>${c[0]}<small>${c[1]}</small></span></button>`)}</div>`
          : html`<div class="dim">Escolha a marca acima para ver as cores.</div>`}
        <input class="inp" placeholder="Ou código NCS / RAL / do fabricante" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />`}
      ${textoAcab(a) && html`<div class="detectado">✓ ${textoAcab(a)}</div>`}`}
    </div>`;
}

function ListaItens({ titulo, num, itens, onChange, placeholder, catalogo, filtro, sessao, salvarComo, grupos }) {
  const [novo, setNovo] = useState('');
  const add = (v) => { const t = (v ?? novo).trim(); if (!t) return; onChange([...(itens || []), t]); setNovo(''); };
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title"><span class="num-sec">${num}</span> ${titulo}</div><${Opcoes} grupos=${grupos} onPick=${v => add(v)} rotulo="Catálogo" /></div>
      <div class="row" style=${{ flexWrap: 'nowrap' }}>
        <div style=${{ flex: 1 }}><${CatalogoInput} value=${novo} placeholder=${placeholder} catalogo=${catalogo} filtro=${filtro} sessao=${sessao} salvarComo=${salvarComo} onChange=${setNovo} onPick=${it => add([it.fabricante, it.nome].filter(Boolean).join(' '))} className="inp" /></div>
        <button class="btn btn-primary" onClick=${() => add()}>Adicionar</button>
      </div>
      ${(itens || []).map((t, i) => html`<div key=${i} class="item-lista"><span>${t}</span><button class="x-btn" onClick=${() => onChange(itens.filter((_, j) => j !== i))}>🗑</button></div>`)}
    </div>`;
}

function EspecificacoesOS({ P, setP, catalogo, sessao }) {
  const [aba, setAba] = useState('dobradicas');
  const op = O();
  const fMDF = useMemo(() => ({ tipos: ['MDF'] }), []);
  const fPux = useMemo(() => ({ tipos: ['Puxador'] }), []);
  const acab = (lado) => P.acab?.[lado] || {};
  const setAcab = (lado) => (k, v) => setP(p => { p.acab = p.acab || {}; p.acab[lado] = { ...(p.acab[lado] || {}), [k]: v }; });
  const led = P.led || {};
  const setLed = (k, v) => setP(p => { p.led = { ...(p.led || {}), [k]: v }; });
  const fer = (P.ferragens || {})[aba] || {};
  const abaInfo = FER_ABAS.find(x => x.k === aba);
  // compatibilidade: listas antigas de fechaduras/tecidos
  const fech = P.fech || (P.fechaduras?.length ? { ativo: true, obs: P.fechaduras.join('; ') } : {});
  const setFech = (k, v) => setP(p => { p.fech = { ...(p.fech || fech), [k]: v }; });
  const tec = P.tec || (P.tecidos?.length ? { ativo: true, obs: P.tecidos.join('; ') } : {});
  const setTec = (k, v) => setP(p => { p.tec = { ...(p.tec || tec), [k]: v }; });
  const vid = P.vidros || {};
  const setVid = (k, v) => setP(p => { p.vidros = { ...(p.vidros || {}), [k]: v }; });
  const naoApl = (k) => (P.naoAplica || {})[k] !== false;
  const togApl = (k) => html`<button class="apl-ov" title=${naoApl(k) ? 'Abrir' : 'Fechar'} onClick=${() => setP(p => { const v = !naoApl(k); p.naoAplica = { ...(p.naoAplica || {}), [k]: v }; const m = { led: 'led', fech: 'fech', vidros: 'vidros', tec: 'tec' }[k]; if (m) p[m] = { ...(p[m] || {}), ativo: !v }; })}></button>`;
  const simNao = () => null;
  const simNao0 = (ativo, set, sim, nao) => html`<div class="seg-mini"><button class=${!ativo ? 'on' : ''} onClick=${() => set('ativo', false)}>${nao}</button><button class=${ativo ? 'on' : ''} onClick=${() => set('ativo', true)}>${sim}</button></div>`;

  return html`
    <div class=${'card page-card stack sec-apl' + (naoApl('acab') ? ' nao-aplica' : '')}>${togApl('acab')}
      <div class="sec-title"><span class="num-sec">1</span> Acabamentos & materiais</div>
      <div class="dim" style=${{ marginTop: '-6px' }}>Padrão geral da OS. Cada móvel pode seguir este padrão ou ter o seu próprio (item 11).</div>
      <div class="stack" style=${{ gap: '8px' }}>
        <${AcabBox} lado="interno" a=${acab('interno')} set=${setAcab('interno')} catalogo=${catalogo} sessao=${sessao} />
        <${AcabBox} lado="externo" a=${acab('externo')} set=${setAcab('externo')} catalogo=${catalogo} sessao=${sessao} />
      </div>
              <div class="stack" style=${{ gap: '5px' }}><span class="lbl" style=${{ margin: 0 }}>🧱 Tamponamento</span>
                <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${[['sem', 'Sem'], ['aparente', 'Aparente'], ['nao_aparente', 'Não aparente']].map(([v, t]) => html`<button key=${v} class=${'pill' + ((P.tamponamento?.tipo || 'sem') === v ? ' on' : '')} onClick=${() => setP(p => { p.tamponamento = { ...(p.tamponamento || {}), tipo: v }; })}>${t}</button>`)}
                  ${(P.tamponamento?.tipo || 'sem') !== 'sem' && (window.OPCOES?.TAMP_ESP || ['15', '18', '25', '36']).map(x => html`<button key=${x} class=${'pill' + (P.tamponamento?.espessura === x ? ' on' : '')} onClick=${() => setP(p => { p.tamponamento = { ...(p.tamponamento || {}), espessura: x }; })}>${x}${/mm/.test(x) ? '' : 'mm'}</button>`)}</div></div>
      <div class="row" style=${{ gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}><span class="lbl" style=${{ margin: 0 }}>📚 Prateleiras</span>${(window.__ESP?.prat || ['15', '18', '25']).map(e => html`<button key=${e} class=${'pill' + (String(P.prateleira || '') === e ? ' on' : '')} onClick=${() => setP(p => { p.prateleira = e; })}>${e}mm</button>`)}
        <button class="btn btn-sm btn-ghost" style=${{ alignSelf: 'center' }} title="Configurar espessuras" onClick=${async () => { const cur = window.__ESP || {}; const t = await pedirTexto('⚙ Espessuras (mm, separadas por vírgula)\nCaixa ; Frentes ; Prateleiras', 'Ex: 15,18 ; 18,25 ; 15,18', [(cur.interno || ['6','15','18','25']).join(','), (cur.externo || ['6','15','18','25']).join(','), (cur.prat || ['15','18','25']).join(',')].join(' ; ')); if (!t) return; const [i1, e1, p1] = t.split(';').map(x => (x || '').split(',').map(y => y.replace(/\D/g, '')).filter(Boolean)); const v = { interno: i1?.length ? i1 : cur.interno, externo: e1?.length ? e1 : cur.externo, prat: p1?.length ? p1 : cur.prat }; window.__ESP = v; try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { espessurasCfg: v }); } catch {} setP(p => { p.__t = Date.now(); }); }}>⚙ Espessuras</button></div>
      <div class="field"><span class="lbl">Outras características da especificação</span><input class="inp" placeholder="Ex: fita de borda ABS 1mm colada com PUR nas áreas molhadas" value=${P.outras || ''} onInput=${e => setP(p => { p.outras = e.target.value; })} /></div>
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('portas') ? ' nao-aplica' : '')}>${togApl('portas')}
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">2</span> Portas (modelo, usinagem & estilo)</div>
        ${P.portas?.modelo && html`<span class="chip chip-accent">✓ ${P.portas.modelo}</span>`}
      </div>
      <${CampoOpc} lbl="Modelo / tipo de porta" value=${P.portas?.modelo} grupos=${op.PORTAS} ph="Ex: Ripada 15+15, porta lisa 18mm…" onChange=${v => setP(p => { p.portas = { ...(p.portas || {}), modelo: v }; })} />
      <span class="lbl">Modelos rápidos (1 clique)</span>
      <div class="opcoes4">
        ${(op.PORTAS?.[0]?.itens || []).slice(0, 8).map(i => html`<button key=${i.n} class=${'opc' + (P.portas?.modelo === i.n ? ' on' : '')} onClick=${() => setP(p => { p.portas = { ...(p.portas || {}), modelo: i.n }; })}><b>${i.n}</b><small>${i.b}</small></button>`)}
      </div>
      <textarea class="inp" rows="2" placeholder="Usinagem / detalhes das portas (ex: cava J invertida com perfil preto oculto)" value=${P.portas?.obs || ''} onInput=${e => setP(p => { p.portas = { ...(p.portas || {}), obs: e.target.value }; })}></textarea>
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('lpp') ? ' nao-aplica' : '')}>${togApl('lpp')}
      <div class="sec-title"><span class="num-sec">3</span> Puxadores, perfis & cavas</div>
      <div class="stack">
<${ListaItens} num="•" titulo="Puxadores, perfis, cavas e pegadores" itens=${[...(P.puxadores || []), ...(P.perfis || [])]} onChange=${v => setP(p => { p.puxadores = v; p.perfis = []; })} placeholder="Buscar puxador: gola preto, cava…" catalogo=${catalogo} filtro=${fPux} sessao=${sessao} salvarComo=${() => ({ tipo: 'Puxador' })} grupos=${op.PUXADOR} />
      </div></div>

    <div class=${'card page-card stack sec-apl' + (naoApl('led') ? ' nao-aplica' : '')}>${togApl('led')}
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">4</span> Iluminação LED</div>
        ${simNao(!!led.ativo, setLed, 'Sim, possui LED', 'Sem LED')}
      </div>
      ${led.ativo && html`
        <span class="lbl">Temperatura de cor</span>
        <div class="opcoes4">${(op.LED_TEMP || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + ((led.temp || '').startsWith(k) ? ' on' : '')} onClick=${() => setLed('temp', k + ' (' + t.toLowerCase() + ')')}><b>${k}</b><small>${t} — ${d}</small></button>`)}</div>
        <div class="grid2">
          <${CampoOpc} lbl="Tipo de fita LED" value=${led.fita} grupos=${op.LED_FITA} ph="Ex: Fita COB contínua 2700K" onChange=${v => setLed('fita', v)} />
          <${CampoOpc} lbl="Perfil & difusor" value=${led.perfil} grupos=${op.LED_PERFIL} ph="Ex: Perfil embutir slim leitoso" onChange=${v => setLed('perfil', v)} />
          <${CampoOpc} lbl="Fonte & acionamento" value=${led.fonte} grupos=${op.LED_FONTE} somar ph="Ex: Fonte slim 12V + sensor touch" onChange=${v => setLed('fonte', v)} />
          <${CampoOpc} lbl="Locais de instalação" value=${led.locais} grupos=${op.LED_LOCAL} somar ph="Ex: sob aéreos e nichos" onChange=${v => setLed('locais', v)} />
        </div>`}
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('ferr') ? ' nao-aplica' : '')}>${togApl('ferr')}
      <div class="sec-title"><span class="num-sec">5</span> Ferragens & sistemas de portas de correr</div>
      <div class="dim" style=${{ marginTop: '-6px' }}>Escreva livre em qualquer campo ou use ☰ Opções com marcas e modelos consagrados.</div>
      <div class="abas-linha">${FER_ABAS.map(x => html`<button key=${x.k} class=${aba === x.k ? 'on' : ''} onClick=${() => setAba(x.k)}>${x.t}${Object.values((P.ferragens || {})[x.k] || {}).some(Boolean) ? ' ✓' : ''}</button>`)}</div>
      <div class="dica">✨ <b>${abaInfo.t}:</b> ${abaInfo.dica}.</div>
      <div class="grid2">
        ${abaInfo.campos.map(([k, lbl, ph]) => html`
          <${CampoOpc} key=${aba + k} lbl=${lbl} ph=${ph} value=${fer[k]} grupos=${(op[abaInfo.op] || {})[k]}
            onChange=${v => setP(p => { p.ferragens = p.ferragens || {}; p.ferragens[aba] = { ...(p.ferragens[aba] || {}), [k]: v }; })} />`)}
      </div>
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('fech') ? ' nao-aplica' : '')}>${togApl('fech')}
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">6</span> Fechaduras & travamentos</div>
        ${simNao(!!fech.ativo, setFech, 'Sim, possui trava', 'Sem fechadura')}
      </div>
      ${fech.ativo && html`
        <span class="lbl">Onde se coloca a fechadura</span>
        <div class="opcoes4">${(op.FECH_ONDE || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + (fech.onde === k ? ' on' : '')} onClick=${() => setFech('onde', k)}><b>${t}</b><small>${d}</small></button>`)}</div>
        <span class="lbl">Modelo da fechadura / mecanismo de tranca</span>
        <div class="opcoes4">${(op.FECH_MODELOS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (fech.modelo === n ? ' on' : '')} onClick=${() => setFech('modelo', n)}><b>${b}</b><small>${d}</small></button>`)}</div>
        <input class="inp" placeholder="Ou digite o modelo" value=${fech.modelo || ''} onInput=${e => setFech('modelo', e.target.value)} />
        <div class="grid2">
          <div class="field"><span class="lbl">Marca / fabricante</span><div class="row" style=${{ gap: '5px' }}>${(op.FECH_MARCAS || []).map(m => html`<button key=${m} class=${'pill' + (fech.marca === m ? ' on' : '')} onClick=${() => setFech('marca', m)}>${m}</button>`)}</div>
            <input class="inp inp-sm" placeholder="Outra marca" value=${fech.marca || ''} onInput=${e => setFech('marca', e.target.value)} /></div>
          <div class="field"><span class="lbl">Cor / acabamento</span><div class="row" style=${{ gap: '5px' }}>${(op.FECH_ACAB || []).map(m => html`<button key=${m} class=${'pill' + (fech.acab === m ? ' on' : '')} onClick=${() => setFech('acab', m)}>${m}</button>`)}</div></div>
          <div class="field"><span class="lbl">Quantidade / onde instalar</span><input class="inp" placeholder="Ex: 2 un. portas externas / 1 gaveteiro" value=${fech.qtd || ''} onInput=${e => setFech('qtd', e.target.value)} /></div>
          <div class="field"><span class="lbl">Observações de furação & cilindro</span><input class="inp" placeholder="Ex: segredo igual (chave mestra), cilindro 30mm" value=${fech.obs || ''} onInput=${e => setFech('obs', e.target.value)} /></div>
        </div>`}
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('vidros') ? ' nao-aplica' : '')}>${togApl('vidros')}
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">7</span> Vidros & espelhos</div>
        ${simNao(!!vid.ativo, setVid, 'Sim, possui vidro', 'Sem vidro')}
      </div>
      ${vid.ativo && html`
        <span class="lbl">Tipo de vidro / espelho</span>
        <div class="opcoes4">${(op.VIDROS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (vid.tipo === n ? ' on' : '')} onClick=${() => setVid('tipo', n)}><b>${n}</b><small>${b} — ${d}</small></button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${(op.VIDRO_ESP || []).map(x => html`<button key=${x} class=${'pill' + (vid.esp === x ? ' on' : '')} onClick=${() => setVid('esp', x)}>${x}</button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Processo:</span>${(op.VIDRO_PROC || []).map(x => { const on = (vid.proc || []).includes(x); return html`<button key=${x} class=${'pill' + (on ? ' on' : '')} onClick=${() => setVid('proc', on ? vid.proc.filter(y => y !== x) : [...(vid.proc || []), x])}>${x}</button>`; })}</div>
        <div class="grid2">
          <${CampoOpc} lbl="Perfil / fixação" value=${vid.perfil} grupos=${op.VIDRO_PERFIL} ph="Ex: perfil slim preto fosco" onChange=${v => setVid('perfil', v)} />
          <div class="field"><span class="lbl">Onde aplica</span><input class="inp" placeholder="Ex: portas da cristaleira e prateleiras" value=${vid.aplic || ''} onInput=${e => setVid('aplic', e.target.value)} /></div>
        </div>
        <input class="inp" placeholder="Observações (fornecedor, medidas, furação)" value=${vid.obs || ''} onInput=${e => setVid('obs', e.target.value)} />`}
    </div>

    <div class=${'card page-card stack sec-apl' + (naoApl('tec') ? ' nao-aplica' : '')}>${togApl('tec')}
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">8</span> Tecidos & tapeçaria / estofamento</div>
        ${simNao(!!tec.ativo, setTec, 'Sim, possui estofado', 'Sem estofado')}
      </div>
      ${tec.ativo && html`
        <span class="lbl">Tipo de tecido</span>
        <div class="opcoes4">${(op.TECIDOS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (tec.tipo === n ? ' on' : '')} onClick=${() => setTec('tipo', n)}><b>${n}</b><small>${b} — ${d}</small></button>`)}</div>
        <span class="lbl">Responsabilidade pelo tecido</span>
        <div class="opcoes4">${(op.TEC_RESP || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + (tec.resp === k ? ' on' : '')} onClick=${() => setTec('resp', k)}><b>${t}</b><small>${d}</small></button>`)}</div>
        <div class="grid2">
          <div class="field"><span class="lbl">Referência / cor</span><input class="inp" placeholder="Ex: Linho LN-304 Areia" value=${tec.ref || ''} onInput=${e => setTec('ref', e.target.value)} /></div>
          <div class="field"><span class="lbl">Aplicação</span><select class="inp" value=${tec.aplic || ''} onChange=${e => setTec('aplic', e.target.value)}><option value="">Escolha…</option>${(op.TEC_APLIC || []).map(x => html`<option key=${x}>${x}</option>`)}</select></div>
          <div class="field"><span class="lbl">Espuma</span><select class="inp" value=${tec.espuma || ''} onChange=${e => setTec('espuma', e.target.value)}><option value="">Escolha…</option>${(op.ESPUMAS || []).map(x => html`<option key=${x}>${x}</option>`)}</select></div>
          <div class="field"><span class="lbl">Observações de estofamento</span><input class="inp" placeholder="Ex: gomos verticais de 20cm" value=${tec.obs || ''} onInput=${e => setTec('obs', e.target.value)} /></div>
        </div>`}
    </div>`;
}

/* ---------- Etapa 3: execução ---------- */
const ETAPAS_FAB = [
  ['corte', 'Corte & usinagem', 'Corte reto, furações de cavilha/minifix e rebaixos'],
  ['fita', 'Fita de borda', 'Colagem de fitas de PVC/ABS nos topos das peças'],
  ['cavas', 'Cavas & puxadores', 'Perfis gola, cavas 45° ou usinagem no MDF'],
  ['pintura', 'Pintura & laca', 'Fundo primer, laca fosca, acetinada ou brilho'],
  ['tapecaria', 'Tapeçaria', 'Cabeceiras almofadadas, assentos ou painéis'],
  ['montagem', 'Montagem final', 'Pré-montagem na fábrica e instalação no cliente'],
];
const ST_FAB = { pendente: 'Pendente', andamento: 'Em andamento', pronto: 'Pronto' };

function ExecucaoOS({ os, alterar, sessao, toast }) {
  const [reabrir, setReabrir] = useState(null);
  const ex = os.execucao || {};
  const et = (k) => ex.etapas?.[k] || { onde: os.modoExecucao === 'terceirizada' ? 'terceirizada' : 'interna', status: 'pendente' };
  const setEt = (k, patch) => alterar(o => { o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {}; o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), ...patch }; });
  const concluir = (i) => {
    const k = ETAPAS_FAB[i][0];
    alterar(o => {
      o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {};
      o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), status: 'pronto', concluidaEm: nowIso() };
      const prox = ETAPAS_FAB[i + 1]?.[0];
      if (prox) o.execucao.etapas[prox] = { ...et(prox), ...(o.execucao.etapas[prox] || {}), status: 'andamento' };
      if (etapasPadrao()) {
      if (o.status === 'elaboracao' || o.status === 'projetos') o.status = 'producao';
      if (prox === 'montagem' && (o.status === 'producao' || o.status === 'projetos' || o.status === 'elaboracao')) o.status = 'liberacao';
      if (!prox) o.status = 'concluida'; }
    });
  };
  const setModo = (m) => alterar(o => {
    o.modoExecucao = m;
    if (m !== 'mista') { o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {}; ETAPAS_FAB.forEach(([k]) => { o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), onde: m }; }); }
  });
  const nInt = ETAPAS_FAB.filter(([k]) => et(k).onde === 'interna').length;
  const par = ex.parceiro || {};
  const setPar = (k, v) => alterar(o => { o.execucao = o.execucao || {}; o.execucao.parceiro = { ...(o.execucao.parceiro || {}), [k]: v }; });
  const MODOS = [['interna', 'Execução 100% interna', 'Toda a produção na marcenaria própria: corte, fita, usinagem, acabamento e montagem.', 'Controle total de prazos'], ['terceirizada', 'Execução 100% terceirizada', 'Produção entregue pronta por parceiro externo (central de corte, nesting ou prestador).', 'Escalabilidade alta'], ['mista', 'Execução mista / híbrida', 'Por etapa: ex. corte na central parceira, fita, laca e montagem internas.', 'Flexibilidade ideal']];

  const modo = os.modoExecucao === 'terceirizada' ? 'terc_ext' : (os.modoExecucao || 'interna');
  const MODOS3 = [['interna', '🏭 Produção interna'], ['terc_int', '🤝 Terceirizada interna'], ['terc_ext', '🚚 Terceirizada externa']];
  const escolherModo = (m) => alterar(o => { o.modoExecucao = m; o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {}; ETAPAS_FAB.forEach(([k]) => { o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), onde: m === 'interna' ? 'interna' : 'terceirizada' }; }); });
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div><b>🏭 Esteira de produção</b><div class="dim">Ao concluir uma etapa, a próxima começa sozinha e o status da OS acompanha.</div></div>
        <div class="seg-mini">${MODOS3.map(([v, t]) => html`<button key=${v} class=${modo === v ? 'on' : ''} onClick=${() => escolherModo(v)}>${t}</button>`)}</div>
      </div>
      ${ETAPAS_FAB.every(([k]) => et(k).status === 'pendente') && html`<button class="btn btn-primary btn-anim" style=${{ alignSelf: 'flex-start' }} onClick=${() => setEt(ETAPAS_FAB[0][0], { status: 'andamento' })}>▶ Iniciar produção</button>`}
      <div class="esteira">
        ${ETAPAS_FAB.map(([k, t], i) => { const e = et(k); return html`
          <div key=${k} class=${'est-card ' + e.status}>
            <div class="row" style=${{ justifyContent: 'space-between' }}><small class="mono">${String(i + 1).padStart(2, '0')}</small><small class="est-st">${ST_FAB[e.status]}</small></div>
            <b>${t}</b>
            ${e.status === 'pronto' ? html`<button class="btn btn-sm" onClick=${() => setReabrir(k)}>↺ Reabrir</button>`
              : e.status === 'andamento' ? html`<button class="btn btn-sm btn-primary" onClick=${() => concluir(i)}>✓ Concluir</button>`
              : html`<button class="btn btn-sm" onClick=${() => setEt(k, { status: 'andamento' })}>▶ Iniciar</button>`}
          </div>`; })}
      </div>
      ${modo !== 'interna' && html`<details><summary class="dim" style=${{ cursor: 'pointer' }}>🚚 Dados do parceiro (${modo === 'terc_int' ? 'terceirizada interna' : 'terceirizada externa'})</summary><div class="grid2" style=${{ marginTop: '8px' }}>
        <div class="field"><span class="lbl">Parceiro</span><input class="inp" value=${par.nome || ''} onInput=${e => setPar('nome', e.target.value)} /></div>
        <div class="field"><span class="lbl">Contato / WhatsApp</span><input class="inp" value=${par.contato || ''} onInput=${e => setPar('contato', e.target.value)} /></div>
        <div class="field"><span class="lbl">Pedido / orçamento</span><input class="inp" value=${par.pedido || ''} onInput=${e => setPar('pedido', e.target.value)} /></div>
        <div class="field"><span class="lbl">Custo (R$)</span><input class="inp mono" inputmode="decimal" value=${par.custo || ''} onInput=${e => setPar('custo', e.target.value)} /></div>
      </div></details>`}
      ${reabrir && html`<${SenhaMotivo} titulo=${'Reabrir etapa: ' + (ETAPAS_FAB.find(e => e[0] === reabrir) || [])[1]} texto="Esta etapa já foi concluída. Para reabrir, informe o motivo e a senha." botao="Reabrir etapa"
        onOk=${async (motivo) => { alterar(o => { o.reaberturas = [...(o.reaberturas || []), { oque: 'Etapa ' + (ETAPAS_FAB.find(e => e[0] === reabrir) || [])[1] + ' reaberta', motivo, quem: sessao?.nome || '', quando: nowIso() }]; o.execucao.etapas[reabrir] = { ...(o.execucao.etapas[reabrir] || {}), status: 'andamento' }; }); toast && toast('Etapa reaberta.', 'ok'); }} fechar=${() => setReabrir(null)} />`}
    </div>`;
}

function AmbienteOS({ amb, ai, alterar, catalogo, sessao, padraoGeral }) {
  const [esp, setEsp] = useState(true);
  const [fechado, setFechado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const up = (fn) => alterar(o => fn(o.ambientes[ai]));
  return html`
    <div class="amb">
      <div class="amb-head">
        <input class="inp" style=${{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', background: 'transparent', border: 'none', padding: '4px' }} value=${amb.nome} placeholder="Nome do móvel (ex: Balcão, Guarda-roupa…)" onInput=${e => up(a => { a.nome = e.target.value; })} onBlur=${e => up(a => { a.nome = nomePadrao(e.target.value); })} />
        ${confirmar
          ? html`<button class="btn btn-sm btn-danger" onClick=${() => alterar(o => { o.ambientes.splice(ai, 1); })}>Apagar</button><button class="btn btn-sm" onClick=${() => setConfirmar(false)}>Não</button>`
          : html`<button class="x-btn" title="Apagar ambiente" onClick=${() => setConfirmar(true)}>🗑</button>`}
      </div>
      ${!fechado && html`
        <div class="amb-body">
          ${!(amb.moveis || []).length && html`<div class="movel-card"><div class="movel-top"><input class="inp" placeholder="Nome do móvel (ex: Balcão, Guarda-roupa…)" onBlur=${e => e.target.value.trim() && up(a => { a.moveis = [novoMovel(nomePadrao(e.target.value))]; })} /></div></div>`}
          ${(amb.moveis || []).map((m, mi) => html`<${MovelOS} key=${m.id || mi} m=${m} ambNome=${amb.nome} upMovel=${(fn) => up(a => fn(a.moveis[mi]))} remover=${() => up(a => { a.moveis.splice(mi, 1); })} duplicar=${() => up(a => { const c = clone(a.moveis[mi]); c.id = rand(8); c.nome += ' (cópia)'; a.moveis.splice(mi + 1, 0, c); })} catalogo=${catalogo} sessao=${sessao} />`)}
          <div class="amb-esp">
            ${esp && html`<div class="stack" style=${{ marginTop: '8px' }}>
              <${EspecificacoesOS} P=${amb.padrao || padraoGeral || {}} setP=${fn => up(a => { a.padrao = a.padrao || JSON.parse(JSON.stringify(padraoGeral || {})); fn(a.padrao); })} catalogo=${catalogo} sessao=${sessao} /></div>`}</div>
        </div>`}
    </div>`;
}

function MDFCampos({ label, valor, onChange, catalogo, sessao, rev }) {
  const v = valor || {};
  const filtro = useMemo(() => ({ tipos: ['MDF'], fabricante: v.fabricante }), [v.fabricante]);
  return html`
    <div class="field">
      <span class="lbl">${label}</span>
      <div style=${{ display: 'grid', gridTemplateColumns: 'minmax(90px, 0.8fr) 1.6fr 70px', gap: '6px' }}>
        <input class="inp inp-sm" list="lista-fab-mdf" placeholder="Fabricante" value=${v.fabricante || ''} onInput=${e => onChange({ ...v, fabricante: e.target.value })} />
        <${CatalogoInput} value=${v.cor || ''} placeholder="Cor / padrão" catalogo=${catalogo} filtro=${filtro} sessao=${sessao} review=${rev}
          onChange=${cor => onChange({ ...v, cor })} onPick=${it => onChange({ ...v, cor: it.nome, fabricante: it.fabricante })}
          salvarComo=${() => ({ tipo: 'MDF', fabricante: v.fabricante || '', linha: '' })} />
        <select class="inp inp-sm" value=${v.espessura || ''} onChange=${e => onChange({ ...v, espessura: e.target.value })} title="Espessura (mm)">
          <option value="">mm</option>
          ${ESPESSURAS.map(x => html`<option key=${x} value=${x}>${x} mm</option>`)}
        </select>
      </div>
    </div>`;
}

function MovelOS({ m, ambNome, upMovel, remover, duplicar, catalogo, sessao }) {
  const [confirmar, setConfirmar] = useState(false);
  const rev = new Set((m.revisar || []).map(norm));
  const r = (k) => [...rev].some(x => x.includes(norm(k)));
  const campo = (k) => (e) => upMovel(x => { x[k] = e.target.value; x.revisar = (x.revisar || []).filter(z => !norm(z).includes(norm(k))); });
  const fPux = useMemo(() => ({ tipos: ['Puxador'] }), []);
  const fLed = useMemo(() => ({ tipos: ['Iluminação', 'Vidro'] }), []);
  const fFita = useMemo(() => ({ tipos: ['MDF'] }), []);

  return html`
    <div class="movel-card">
      <div class="movel-top">
        <input class="inp" value=${ambNome && norm(m.nome) === norm(ambNome) ? '' : m.nome} placeholder="Nome do móvel (ex: Balcão, Guarda-roupa…)" onInput=${campo('nome')} onBlur=${e => upMovel(x => { x.nome = nomePadrao(e.target.value); })} />
        <input class="inp inp-sm" style=${{ width: '64px' }} type="number" min="1" value=${m.quantidade} title="Quantidade" onInput=${e => upMovel(x => { x.quantidade = Number(e.target.value) || 1; })} />
        <button class="btn btn-sm btn-ghost" onClick=${duplicar} title="Duplicar">⧉</button>
        ${confirmar
          ? html`<button class="btn btn-sm btn-danger" onClick=${remover}>Apagar</button>`
          : html`<button class="x-btn" onClick=${() => setConfirmar(true)} title="Apagar móvel">🗑</button>`}
      </div>

      <div class="field"><span class="lbl">Observações</span><textarea class="inp inp-sm" rows="2" style=${{ minHeight: '52px' }} value=${m.observacoes} onInput=${campo('observacoes')}></textarea></div>
    </div>`;
}

function FerragemLinha({ f, catalogo, sessao, up, remover }) {
  const filtro = useMemo(() => ({ tipos: ['Ferragem', 'Acessório'], linha: f.tipo, fabricante: f.fabricante }), [f.tipo, f.fabricante]);
  return html`
    <div class="ferr-row">
      <select class="inp inp-sm" value=${f.tipo} onChange=${e => up(x => { x.tipo = e.target.value; })}>
        <option value="">Tipo…</option>
        ${[...new Set([...TIPOS_FERRAGEM, f.tipo].filter(Boolean))].map(t => html`<option key=${t} value=${t}>${t}</option>`)}
      </select>
      <${CatalogoInput} value=${[f.fabricante, f.modelo].filter(Boolean).join(' · ')} placeholder="Buscar: blum tandem, hettich sensys…" catalogo=${catalogo} filtro=${filtro} sessao=${sessao}
        onChange=${v => up(x => { const p = v.split(' · '); if (p.length > 1) { x.fabricante = p[0]; x.modelo = p.slice(1).join(' · '); } else { x.modelo = v; } })}
        onPick=${it => up(x => { x.fabricante = it.fabricante; x.modelo = it.nome; if (!x.tipo) x.tipo = it.linha; })}
        salvarComo=${() => ({ tipo: 'Ferragem', fabricante: f.fabricante || '', linha: f.tipo || '' })} />
      <input class="inp inp-sm mono" placeholder="Qtd" value=${f.quantidade} onInput=${e => up(x => { x.quantidade = e.target.value; })} />
      <button class="x-btn" onClick=${remover} title="Remover">✕</button>
    </div>`;
}

/* ---------- Escrita padronizada de nomes e destaque de palavras-chave ---------- */
const SIGLAS = /^(bwc|wc|pt|led|mdf|tv|os|cnpj|cpf|rt|ii|iii|iv|xl)$/i;
const MINUSC = /^(de|da|do|das|dos|e|em|com|para|p\/|a|o)$/i;
const ACENTOS = { suite: 'suíte', suites: 'suítes', area: 'área', areas: 'áreas', servico: 'serviço', servicos: 'serviços', comodo: 'cômodo', escritorio: 'escritório', dormitorio: 'dormitório', dormitorios: 'dormitórios', armario: 'armário', armarios: 'armários', balcao: 'balcão', balcoes: 'balcões', painel: 'painel', paineis: 'painéis', aereo: 'aéreo', aereos: 'aéreos', gabinete: 'gabinete', espelho: 'espelho', lavabo: 'lavabo', sotao: 'sótão', terraco: 'terraço', salao: 'salão', jardim: 'jardim', varanda: 'varanda', hospede: 'hóspede', hospedes: 'hóspedes', crianca: 'criança', criancas: 'crianças', bebe: 'bebê', cozinha: 'cozinha', copa: 'copa', closet: 'closet', escada: 'escada', porao: 'porão', estudio: 'estúdio', biblioteca: 'biblioteca', recepcao: 'recepção', reuniao: 'reunião', deposito: 'depósito', mesa: 'mesa', cabeceira: 'cabeceira', criado: 'criado', rack: 'rack', homeoffice: 'home office', banheiro: 'banheiro', lavanderia: 'lavanderia', fabricio: 'fabrício', fabio: 'fábio', antonio: 'antônio', marcia: 'márcia', patricia: 'patrícia', lucia: 'lúcia', claudia: 'cláudia', vitoria: 'vitória', julia: 'júlia', cecilia: 'cecília', emilia: 'emília', flavia: 'flávia', sergio: 'sérgio', rogerio: 'rogério', vinicius: 'vinícius', mauricio: 'maurício', otavio: 'otávio', cassio: 'cássio', marcio: 'márcio', jose: 'josé', joao: 'joão', conceicao: 'conceição', simoes: 'simões', goncalves: 'gonçalves', araujo: 'araújo', tome: 'tomé', andre: 'andré', angela: 'ângela', monica: 'mônica', veronica: 'verônica', jessica: 'jéssica', barbara: 'bárbara', helio: 'hélio', inacio: 'inácio', tania: 'tânia', vania: 'vânia', sonia: 'sônia', debora: 'débora', priscila: 'priscila', nubia: 'núbia', lucio: 'lúcio', caio: 'caio', taua: 'tauá', gourmet: 'gourmet', living: 'living', externa: 'externa', externo: 'externo', superior: 'superior', inferior: 'inferior', circulacao: 'circulação', iluminacao: 'iluminação', decoracao: 'decoração', porta: 'porta', portas: 'portas', ilha: 'ilha', teto: 'teto', penteadeira: 'penteadeira', escorregador: 'escorregador', espelheiro: 'espelheiro', apto: 'apto', apartamento: 'apartamento', predio: 'prédio', edificio: 'edifício', condominio: 'condomínio', residencia: 'residência', comercio: 'comércio', clinica: 'clínica', consultorio: 'consultório', loja: 'loja' };
const corrigeAcento = (w) => { const k = w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return ACENTOS[k] && ACENTOS[k].normalize('NFD').replace(/[\u0300-\u036f]/g, '') === k ? ACENTOS[k] : w; };
function nomePadrao(t) {
  return String(t || '').trim().replace(/\s+/g, ' ').replace(/\s*([,;])\s*/g, '$1 ').replace(/\s+-\s*|\s*-\s+/g, ' - ').toLowerCase().split(' ').map(w => w.replace(/^([^\p{L}]*)(\p{L}+)/u, (m, a, b) => a + corrigeAcento(b))).map((w, i) => SIGLAS.test(w) ? w.toUpperCase() : (i > 0 && MINUSC.test(w)) ? w : w.replace(/^(\p{L})/u, c => c.toUpperCase()).replace(/-(\p{L})/gu, (m, c) => '-' + c.toUpperCase())).join(' ');
}
const PALAVRAS_CHAVE = ['vidros?', 'espelhos?', 'serralheria', 'serralheiro', 'pintura', 'laca', 'laqueado', 'pedras?', 'm[aá]rmore', 'granito', 'quartzo', 'tape[cç]aria', 'estofado', 'esquadrias?', 'metal(ica|ico)?', 'alum[ií]nio', 'perfil gola', 'led', 'fechadura', 'terceirizad[oa]'];
const RE_CHAVE = new RegExp('\\b(' + PALAVRAS_CHAVE.join('|') + ')\\b', 'gi');
function destacarChaves(raiz) {
  if (!raiz) return; const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); const nos = [];
  const TIT = 'h1,h2,h3,h4,h5,th,.po-topo,.po2-amb-t,.po-amb-t,.oe-mt,.po2-tile-t,.po-card-t,.sec-title,.po-sec,td>b:first-child';
  while (w.nextNode()) { const n = w.currentNode; const p = n.parentElement; if (!p || p.closest('.kw') || p.closest(TIT)) continue; RE_CHAVE.lastIndex = 0; if (RE_CHAVE.test(n.nodeValue)) nos.push(n); }
  /* cada palavra-chave só aparece destacada 1 vez por móvel (linha) */
  const vistos = new Map(); const raizKey = (r) => { const k = vistos.get(r) || new Set(); vistos.set(r, k); return k; };
  const chave = (m) => norm(m).replace(/s$/, '').replace(/(ad|ari)a?o?$/, '');
  nos.forEach(n => { const escopo = n.parentElement.closest('tr, .oe-movel, .movel-card, .po2-tile, .po-card') || raiz; const ja = raizKey(escopo);
    const f = document.createDocumentFragment(); let last = 0; const t = n.nodeValue;
    t.replace(RE_CHAVE, (m, _g, off) => { const k = chave(m); if (ja.has(k)) return m; ja.add(k); f.append(t.slice(last, off)); const b = document.createElement('b'); b.className = 'kw'; b.textContent = m.toUpperCase(); f.append(b); last = off + m.length; return m; });
    f.append(t.slice(last)); n.replaceWith(f); });
}
function ComChaves({ children, dep }) { const r = useRef(null); useEffect(() => { const id = setTimeout(() => destacarChaves(r.current), 50); return () => clearTimeout(id); }, [dep]); return html`<div ref=${r} key=${dep}>${children}</div>`; }
async function padronizarNomesTudo(sessao, toast) {
  const { getDocs, writeBatch, updateDoc } = F().fsMod; const E = sessao.empresaId; let n = 0;
  const lotes = []; let b = writeBatch(F().db), k = 0; const add = (ref, patch) => { b.update(ref, patch); n++; if (++k >= 400) { lotes.push(b); b = writeBatch(F().db); k = 0; } };
  (await getDocs(col('empresas', E, 'os'))).docs.forEach(d => { const o = d.data(); const patch = {};
    const cn = nomePadrao(o.cliente?.nome); if (o.cliente?.nome && cn !== o.cliente.nome) patch.cliente = { ...o.cliente, nome: cn };
    if (Array.isArray(o.ambientes) && o.ambientes.some(a => a?.nome && nomePadrao(a.nome) !== a.nome)) patch.ambientes = o.ambientes.map(a => ({ ...a, nome: nomePadrao(a.nome) }));
    if (o.ambienteResumo && nomePadrao(o.ambienteResumo) !== o.ambienteResumo) patch.ambienteResumo = nomePadrao(o.ambienteResumo);
    if (o.arquiteto && nomePadrao(o.arquiteto) !== o.arquiteto) patch.arquiteto = nomePadrao(o.arquiteto);
    if (Object.keys(patch).length) add(d.ref, patch); });
  for (const c of ['tarefas', 'pedidos', 'compras', 'lancamentos', 'amostras']) { try { (await getDocs(col('empresas', E, c))).docs.forEach(d => { const x = d.data(); const patch = {};
    if (x.cliente && nomePadrao(x.cliente) !== x.cliente) patch.cliente = nomePadrao(x.cliente);
    if (c === 'amostras' && x.quem && nomePadrao(x.quem) !== x.quem) patch.quem = nomePadrao(x.quem);
    if (Object.keys(patch).length) add(d.ref, patch); }); } catch {} }
  try { (await getDocs(col('empresas', E, 'clientes'))).docs.forEach(d => { const x = d.data(); const patch = {}; ['nome', 'arquiteto'].forEach(f => { if (x[f] && nomePadrao(x[f]) !== x[f]) patch[f] = nomePadrao(x[f]); }); if (Object.keys(patch).length) add(d.ref, patch); }); } catch {}
  try { (await getDocs(col('empresas', E, 'agenda'))).docs.forEach(d => { const g = d.data()?.grades; if (!g) return; let mud = false; const ng = {};
    Object.entries(g).forEach(([k, rows]) => { ng[k] = (rows || []).map(r => { const dias = (r.dias || []).map(t => { if (!t || !/\p{L}/u.test(t)) return t; const nt = String(t).split('\n').map(l => l.replace(/^(\s*(?:OS:)?\d{2}\.\d{3}\s*)?(.*)$/, (m, a, rest) => (a || '') + nomePadrao(rest))).join('\n'); if (nt !== t) mud = true; return nt; }); return { ...r, dias }; }); });
    if (mud) add(d.ref, { grades: ng }); }); } catch {}
  lotes.push(b); for (const l of lotes) await l.commit();
  await updateDoc(docRef('empresas', E), { nomesPadronizados: 2 }).catch(() => {});
  toast && toast('🔤 ' + n + ' registro(s) com nomes padronizados.', 'ok'); return n;
}
function gruposEspec(P) {
  P = P || {}; const F = P.ferragens || {};
  const fl = (k) => Object.values(F[k] || {}).filter(Boolean).join(' · ');
  return [
    ['🎨', 'Acabamentos', '#d97706', [['Interno', textoAcab(P.acab?.interno)], ['Externo', textoAcab(P.acab?.externo)], ['Lâminas', (P.laminas || []).join('; ')], ['Tamponamento', P.tamponamento?.tipo && P.tamponamento.tipo !== 'sem' ? (P.tamponamento.tipo === 'aparente' ? 'Aparente' : 'Não aparente') + (P.tamponamento.espessura ? ' · ' + P.tamponamento.espessura + ' mm' : '') : ''], ['Prateleiras', P.prateleira ? P.prateleira + ' mm' : ''], ['Outras', P.outras]]],
    ['🚪', 'Portas', '#7c3aed', [['Modelo', P.portas?.modelo], ['Usinagem', P.portas?.obs]]],
    ['✋', 'Puxadores & perfis', '#0d9488', [['Itens', [...(P.puxadores || []), ...(P.perfis || [])].join('; ')]]],
    ['💡', 'Iluminação', '#ca8a04', [['LED', P.led?.ativo !== false ? [P.led?.fita, P.led?.temp, P.led?.perfil, P.led?.fonte, P.led?.locais].filter(Boolean).join(' · ') : '']]],
    ['🔩', 'Ferragens', '#2563eb', [['Dobradiças', fl('dobradicas')], ['Corrediças', fl('corredicas')], ['Correr', fl('correr')], ['Passagem', fl('passagem')]]],
    ['🔒', 'Fechaduras', '#dc2626', [['', textoFech(P.fech) || (P.fechaduras || []).join('; ')]]],
    ['🪟', 'Vidros', '#0891b2', [['', textoVidro(P.vidros)]]],
    ['🧵', 'Tecidos', '#db2777', [['', textoTec(P.tec) || (P.tecidos || []).join('; ')]]],
  ].map(([i, t, c, l]) => [i, t, c, l.filter(([, v]) => v)]).filter(([, , , l]) => l.length);
}
/* ---------- Ordem de entrega: check-list por móvel com tudo que compõe ---------- */
function OrdemEntrega({ os, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const ambs = os.ambientes || [];
  const todos = ambs.flatMap((a, ai) => (a.moveis || []).map((m, mi) => ({ a, ai, m, k: ai + '-' + mi })));
  const [sel, setSel] = useState(() => new Set(todos.map(x => x.k)));
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const tog = (k) => setSel(v => { const n = new Set(v); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const itensMovel = (m) => [
    [m.largura || m.altura || m.profundidade ? 'Medidas' : '', [m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ') + ' mm'],
    ['Caixa', mdf(m.mdfCaixa)], ['Frente', mdf(m.mdfFrente)], ['Fita', m.fitaBorda], ['Portas', m.portas], ['Gavetas', m.gavetas],
    ['Puxador', m.puxador], ['Iluminação', m.iluminacao],
    ...(m.ferragens || []).map(f => ['Ferragem', (f.quantidade ? f.quantidade + '× ' : '') + [f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' ')]),
  ].filter(([k, v]) => k && v && String(v).trim());
  const vai = todos.filter(x => sel.has(x.k));
  const porAmb = ambs.map((a, ai) => ({ a, ai, l: vai.filter(x => x.ai === ai) })).filter(g => g.l.length);
  return html`<div class="oe-wrap">
    <div class="oe-sel so-tela">
      <div class="row" style=${{ justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}><b>🚚 Quais móveis vão nesta entrega?</b>
        <span class="row" style=${{ gap: '6px' }}><small>Data:</small><input type="date" class="inp inp-sm" value=${data} onInput=${e => setData(e.target.value)} />
        <button class="btn btn-sm" onClick=${() => setSel(new Set(todos.map(x => x.k)))}>Todos</button><button class="btn btn-sm" onClick=${() => setSel(new Set())}>Nenhum</button></span></div>
      <div class="oe-chips">${todos.map(x => html`<button key=${x.k} class=${'sug-pessoa' + (sel.has(x.k) ? ' on' : '')} onClick=${() => tog(x.k)}>${sel.has(x.k) ? '✓ ' : ''}${nomePadrao(x.m.nome) || 'Móvel'}</button>`)}</div>
    </div>
    <div class="po po2 oe" style=${varsCores(cor)}>
      <div class="po-topo">
        <div class="row" style=${{ gap: '12px', flexWrap: 'nowrap', alignItems: 'center' }}><${LogoImp} empresa=${empresa} /><div>
          <div class="po-emp">${empresa || 'Gestão Pró'} · Ordem de entrega</div>
          <div class="po-tit">${nomePadrao(ambs.map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo) || 'Entrega'}</div>
          <div class="po-sub"><b>${nomePadrao(os.cliente?.nome) || ''}</b>${(os.cliente?.enderecoMontagem || os.cliente?.endereco) ? ' · 📍 ' + (os.cliente.enderecoMontagem || os.cliente.endereco) : ''}</div>
        </div></div>
        <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">🚚 Entrega ${data ? data.split('-').reverse().join('/') : ''} · ${vai.length} móvel(is)</div></div>
      </div>
      ${!vai.length ? html`<div class="vazio dim">Marque acima os móveis desta entrega.</div>` : porAmb.map(({ a, l }) => { const g = gruposEspec(a.padrao || os.padrao); return html`<div key=${a.id || a.nome} class="po2-amb">
        ${l.map(({ m, k }, n) => html`<div key=${k} class="oe-movel">
          <div class="oe-mt"><span class="oe-box"></span><b>${n + 1}. ${nomePadrao(m.nome) || 'Móvel'}</b><em>Qtd ${m.quantidade || 1}</em></div>
          ${m.observacoes && html`<div class="po2-obs-m">${m.observacoes}</div>`}
          <div class="oe-itens">${itensMovel(m).map(([k2, v], i) => html`<div key=${i} class="oe-it"><span class="oe-box p"></span><small>${k2}</small> ${v}</div>`)}</div>
        </div>`)}
        ${g.length > 0 && html`<div class="oe-acess"><div class="oe-acess-t">🧰 Acessórios e acabamentos do conjunto — conferir</div>
          ${g.map(([ic, t, c, li]) => li.map(([k2, v], i) => html`<div key=${t + i} class="oe-it" style=${{ '--k': c }}><span class="oe-box p"></span><small>${ic} ${t}${k2 ? ' · ' + k2 : ''}</small> ${v}</div>`))}</div>`}
      </div>`; })}
      <div class="oe-final">
        <div class="oe-it"><span class="oe-box p"></span> Parafusos, cavilhas e kit de montagem</div>
        <div class="oe-it"><span class="oe-box p"></span> Proteção / embalagem conferida</div>
        <div class="oe-it"><span class="oe-box p"></span> Projeto / folha da OS junto</div>
      </div>
      <div class="po-ass">${['Conferido (expedição)', 'Motorista / montador', 'Cliente — recebi'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
      <div class="po-rod"><span>${empresa || ''} · Ordem de entrega · OS ${numOS(os)}</span><span>Gerado pelo Gestão Pró</span></div>
    </div>
  </div>`;
}
function ImpressaoOS({ os, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const st = (STATUS_OS.find(s => s.v === os.status) || STATUS_OS[0]).t.replace(/^\d\. /, '');
  const tamp = os.tamponamento?.tipo && os.tamponamento.tipo !== 'sem' ? (os.tamponamento.tipo === 'aparente' ? 'Aparente' : 'Não aparente') + (os.tamponamento.espessura ? ' · ' + os.tamponamento.espessura : '') : '';
  const info = [
    ['📞', 'Telefone', os.cliente?.telefone], ['🚚', 'Entrega', os.prazoEntrega], ['🏗', 'Obra', os.cliente?.obra],
    ['📐', 'Arquiteto', os.arquiteto], ['🧑‍🔧', 'Responsável', os.responsavel], ['🧱', 'Tamponamento', tamp],
  ].filter(([, , v]) => v);
  const ambs = os.ambientes || [];
  const totalMov = ambs.reduce((n, a) => n + (a.moveis || []).length, 0);
  const COLS = [['Qtd', m => m.quantidade, 'c'], ['L × A × P', m => [m.largura, m.altura, m.profundidade].some(Boolean) ? [m.largura, m.altura, m.profundidade].map(x => x || '—').join('×') : '', 'c mono'], ['Caixa', m => mdf(m.mdfCaixa)], ['Frente', m => mdf(m.mdfFrente)], ['Fita', m => m.fitaBorda], ['Ferragens', m => (m.ferragens || []).map(f => (f.quantidade ? f.quantidade + '× ' : '') + [f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' ')).join('; ')], ['Puxador / LED', m => [m.puxador, m.iluminacao].filter(Boolean).join(' · ')]];
  return html`
    <div class="po po2" style=${varsCores(cor)}>
      <div class="po-topo">
        <div class="row" style=${{ gap: '12px', flexWrap: 'nowrap', alignItems: 'center' }}><${LogoImp} empresa=${empresa} /><div>
          <div class="po-emp">${empresa || 'Gestão Pró'}</div>
          <div class="po-tit">${nomePadrao(ambs.map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo) || 'Ordem de Serviço'}</div>
          <div class="po-sub"><b>${nomePadrao(os.cliente?.nome) || ''}</b>${(os.cliente?.enderecoMontagem || os.cliente?.endereco) ? ' · 📍 ' + (os.cliente.enderecoMontagem || os.cliente.endereco) : ''}</div>
        </div></div>
        <div class="po-num">
          <div class="po-cod">${numOS(os)}</div>
          <div class="po-dots">${cor.map((c, i) => html`<i key=${i} style=${{ background: c }}></i>`)}</div>
          <div class="po-meta">${st} · ${new Date().toLocaleDateString('pt-BR')}${os.numeroAntigo ? ' · antiga ' + os.numeroAntigo : ''}</div>
        </div>
      </div>
      ${(os.liberacoes || []).length > 0 && (() => { const L = os.liberacoes[os.liberacoes.length - 1]; return html`<div class="po-lib">🔓 <b>Liberado com pendência</b> · ${L.oque} — <i>${L.motivo}</i> (${L.por}, ${fmtData(L.em)})${(L.falta || []).length ? html`<div><small>Pendente na liberação: ${L.falta.join(' · ')}</small></div>` : ''}</div>`; })()}
      ${info.length > 0 && html`<div class="po2-info">${info.map(([i, k, v]) => html`<div key=${k} class="po2-cel"><span>${i}</span><div><small>${k}</small><b>${v}</b></div></div>`)}</div>`}
      ${ambs.map((a, ai) => { const g = gruposEspec(a.padrao || os.padrao); const mv = a.moveis || []; const cols = COLS.filter(([, f]) => mv.some(m => f(m)));
        return html`<div key=${a.id || ai} class="po2-amb">
          <div class="po2-amb-t"><b>${mv.map(m => nomePadrao(m.nome)).filter(n => n && norm(n) !== norm(a.nome)).join(' · ') || 'Conjunto ' + (ai + 1)}</b><em>${mv.length} móvel(is)</em></div>
          ${g.length > 0 && html`<div class="po2-esp">${g.map(([i, t, c, l]) => html`<div key=${t} class="po2-tile" style=${{ '--k': c }}><div class="po2-tile-t">${i} ${t}</div>${l.map(([k, v]) => html`<div key=${k} class="po2-kv">${k && html`<small>${k}</small>`}<span>${v}</span></div>`)}</div>`)}</div>`}
          ${mv.length > 0 && html`<table class="po2-tab"><thead><tr><th>Móvel</th>${cols.map(([t]) => html`<th key=${t}>${t}</th>`)}</tr></thead><tbody>
            ${mv.map(m => html`<tr key=${m.id}><td><b>${nomePadrao(m.nome)}</b>${[m.portas && 'Portas: ' + m.portas, m.gavetas && 'Gavetas: ' + m.gavetas].filter(Boolean).map(x => html`<small> · ${x}</small>`)}${m.observacoes ? html`<div class="po2-obs-m">${m.observacoes}</div>` : ''}</td>${cols.map(([t, f, c]) => html`<td key=${t} class=${c || ''}>${f(m)}</td>`)}</tr>`)}
          </tbody></table>`}
        </div>`; })}
      ${os.observacoesGerais && html`<div class="po-obs"><b>📝 Observações gerais</b><div>${os.observacoesGerais}</div></div>`}
      <div class="po-ass">${['Responsável técnico', 'Produção', 'Cliente'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
      ${(os.alteracoes || []).length > 0 && html`<div class="po-sec"><span>⟳</span> Alterações</div><table><tbody>${os.alteracoes.map(a => html`<tr key=${a.n}><td style=${{ width: '18%' }}>${fmtData(a.quando)}</td><td><b>Nº ${a.n}</b> — ${a.motivo}</td></tr>`)}</tbody></table>`}
      <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)}${os.atualizadoEm ? ' · última modificação ' + fmtData(os.atualizadoEm) : ''}</span><span>Gerado pelo Gestão Pró</span></div>
    </div>`;
}


/* ---------- Compras (visão geral de todas as OSs) ---------- */
const semAcento = (t) => norm(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/* Garante que o fornecedor é quem VENDEU (emitente), nunca a empresa que comprou */
function fornecedorDaNota(res, sessao, cfg) {
  const em = res.emitente || {}, de = res.destinatario || {};
  let f = { fornecedor: em.nome || em.razao || res.fornecedor || '', razao: em.razao || res.razao || '', cnpj: em.cnpj || res.cnpj || '', cidade: em.cidade || res.cidade || '', uf: em.uf || res.uf || '', endereco: em.endereco || res.endereco || '' };
  const proprios = [sessao.empresaNome || '', ...((cfg && cfg.nomesProprios) || [])].filter(Boolean);
  const ehProprio = (n) => n && proprios.some(p => parecido(n, p) >= 0.5 || norm(n).includes(norm(p).split(' ')[0]) && norm(p).split(' ')[0].length > 3);
  if (ehProprio(f.fornecedor) && de.nome && !ehProprio(de.nome)) f = { fornecedor: de.nome, razao: de.nome, cnpj: de.cnpj || '', cidade: '', uf: '', endereco: '' };
  f.suspeito = ehProprio(f.fornecedor);
  return f;
}
/* Conserta valores de nota confusa: qtd × unitário tem que fechar com o total do item */
function arrumarLinhaNF(l) {
  const q = numBR(l.qtd), vu = numBR(l.valorUnit), vt = numBR(l.valorTotal);
  let Q = q, U = vu, T = vt;
  if (Q > 0 && T > 0 && U > 0 && Math.abs(Q * U - T) > Math.max(0.05, T * 0.02)) {
    if (Math.abs(U - T) < 0.01 && Q > 1) U = T / Q;            // pegou o total como unitário
    else if (Math.abs(Q * T - U) < Math.max(0.05, U * 0.02)) { const t = U; U = T; T = t; } // colunas trocadas
    else U = T / Q;                                             // confia no total do item
  } else if (Q > 0 && T > 0 && !U) U = T / Q;
  else if (Q > 0 && U > 0 && !T) T = Q * U;
  else if (!Q && U > 0 && T > 0) Q = Math.round(T / U * 1000) / 1000;
  return { ...l, qtd: Q || l.qtd, valorUnit: Math.round(U * 10000) / 10000, valorTotal: Math.round(T * 100) / 100 };
}
/* Categorias aprendidas pelas notas modelo + cadastro automático de parceiros por CNPJ */
const catsEmpresa = (cfg) => [...new Set([...(cfg?.categoriasCompra || CAT_COMPRA)])];
function categoriaPorRegra(regras, desc) { let best = null, sc = 0; (regras || []).forEach(r => { const p = parecido(desc, r.d); if (p > sc) { sc = p; best = r; } }); return sc >= 0.6 ? best.c : ''; }
const raizCnpj = (c) => String(c || '').replace(/\D/g, '').slice(0, 8);
function mesclarParceiro(lista, nf) {
  const l = [...(lista || [])]; const raiz = raizCnpj(nf.cnpj);
  const primeira = (n) => norm(n).split(' ').filter(w => w.length > 2)[0] || norm(n);
  let k = l.findIndex(p => raiz && p.cnpjRaiz === raiz);
  if (k < 0) k = l.findIndex(p => primeira(p.nome) && primeira(p.nome) === primeira(nf.fornecedor));
  const unidade = { cnpj: nf.cnpj || '', cidade: nf.cidade || '', uf: nf.uf || '', endereco: nf.endereco || '' };
  const cats = [...new Set(nf.linhas.map(x => x.categoria).filter(Boolean))];
  if (k < 0) { l.push({ nome: nf.fornecedor, razao: nf.razao || '', esp: cats.join(', '), cnpjRaiz: raiz, unidades: nf.cnpj ? [unidade] : [], categorias: cats, desde: nowIso() }); return { lista: l, novo: true }; }
  const p = { ...l[k], unidades: [...(l[k].unidades || [])], categorias: [...new Set([...(l[k].categorias || []), ...cats])] };
  if (raiz && !p.cnpjRaiz) p.cnpjRaiz = raiz;
  const novaUni = nf.cnpj && !p.unidades.some(u => u.cnpj.replace(/\D/g, '') === String(nf.cnpj).replace(/\D/g, ''));
  if (novaUni) p.unidades.push(unidade);
  p.esp = p.categorias.join(', ');
  l[k] = p; return { lista: l, novo: false, novaUni };
}
function parecido(a, b) { const A = new Set(semAcento(a).split(' ').filter(w => w.length > 2)), B = new Set(semAcento(b).split(' ').filter(w => w.length > 2)); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); }
function TelaComprasGeral({ sessao, toast }) {
  const [docs, setDocs] = useState(null);
  const [oss, setOss] = useState([]);
  const [notas, setNotas] = useState([]);
  const [filtro, setFiltro] = useState('abertos');
  const [agrupar, setAgrupar] = useState('parceiro');
  const [abrir, setAbrir] = useState(null);
  const [nf, setNf] = useState(null);
  const [lendoNf, setLendoNf] = useState('');
  const [aba, setAba] = useState('itens');
  const inpNf = useRef(null);
  useEffect(() => { const u = [F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'compras'), s => setDocs(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setDocs([])), F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}), F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'notas'), s => setNotas(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})]; return () => u.forEach(f => f()); }, []);
  const itens = (docs || []).flatMap(d => (d.itens || []).map(i => ({ ...i, _st: stCompra(i), osId: d.id, osCod: d.osCod, cliente: d.cliente })));
  const hoje = isoD(new Date());
  const vis = itens.filter(i => filtro === 'todos' || (filtro === 'abertos' ? i._st !== 'recebido' : filtro === 'pre' ? i.etapa === 'pre' && i._st !== 'recebido' : filtro === 'atrasados' ? i._st === 'pedido' && i.previsao && i.previsao < hoje : filtro === 'contrato' ? i.origem === 'contrato' && i._st !== 'recebido' : i._st === filtro));
  const grupos = {}; vis.forEach(i => { const k = agrupar === 'parceiro' ? (i.parceiro || 'Sem fornecedor') : agrupar === 'status' ? infoStC(i._st)[1] : (i.osCod + ' ' + (i.cliente || '')); (grupos[k] = grupos[k] || []).push(i); });
  const salvarItem = async (osId, ni) => { const d = docs.find(x => x.id === osId); if (!d) return; await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'compras', osId), { itens: d.itens.map(x => x.id === ni.id ? ni : x), atualizadoEm: nowIso() }); };
  const [itemAb, setItemAb] = useState(null);
  const [parceiros, setParceiros] = useState([]);
  const [cfgC, setCfgC] = useState({});
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId), d => { setParceiros(d.data()?.parceirosLista || PARC_PADRAO); setCfgC(d.data() || {}); }, () => {}), []);
  const cats = catsEmpresa(cfgC); const regras = cfgC.regrasCategoria || [];
  const [modelo, setModelo] = useState(false);
  const [novaCat, setNovaCat] = useState('');
  const [editP, setEditP] = useState(null);
  const [buscaP, setBuscaP] = useState('');
  const [catP, setCatP] = useState('');
  const salvarParc = async (lista) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: lista }); } catch (e) { toast(e.message, 'erro'); } };
  // ranking dos parceiros: orçamentos comparados + notas
  const rank = {}; const add = (f) => (rank[f] = rank[f] || { nome: f, orcs: 0, vitorias: 0, economia: 0, compras: 0, gasto: 0, atrasos: 0, entregas: 0 });
  itens.forEach(i => { const o = (i.orcs || []).filter(x => numBR(x.valor) > 0); if (o.length >= 2) { const min = Math.min(...o.map(x => numBR(x.valor))), med = o.reduce((n, x) => n + numBR(x.valor), 0) / o.length; o.forEach(x => { const r = add(x.forn); r.orcs++; if (numBR(x.valor) === min) { r.vitorias++; r.economia += med ? (med - min) / med : 0; } }); }
    if (i.parceiro && numBR(i.valor)) { const r = add(i.parceiro); r.compras++; r.gasto += numBR(i.valor); }
    if (i.parceiro && i.previsao && i.recebidoEm) { const r = add(i.parceiro); r.entregas++; if (i.recebidoEm.slice(0, 10) > i.previsao) r.atrasos++; } });
  notas.forEach(n => { if (n.fornecedor) { const r = add(n.fornecedor); r.compras += n.semOS ? 1 : 0; r.gasto += n.semOS ? numBR(n.total) : 0; } });
  { const lin = notas.flatMap(n => (n.linhas || []).map(l => ({ d: l.descricao, f: n.fornecedor, vu: numBR(l.valorUnit) }))).filter(x => x.vu > 0 && x.f); const gs = []; lin.forEach(l => { const nm = (x) => (String(x).match(/\d+/g) || []).join('-'); const g = gs.find(g => nm(g[0].d) === nm(l.d) && parecido(g[0].d, l.d) >= 0.7); if (g) g.push(l); else gs.push([l]); });
    gs.forEach(g => { const fs = {}; g.forEach(x => { fs[x.f] = Math.min(fs[x.f] || Infinity, x.vu); }); const ent = Object.entries(fs); if (ent.length < 2) return; const min = Math.min(...ent.map(e => e[1])); const med = ent.reduce((n, e) => n + e[1], 0) / ent.length; ent.forEach(([f, v]) => { const r = add(f); r.orcs++; if (v === min) { r.vitorias++; r.economia += (med - v) / med; } }); }); }
  const ranking = Object.values(rank).filter(r => r.orcs || r.compras).sort((a, b) => (b.vitorias / (b.orcs || 1)) - (a.vitorias / (a.orcs || 1)) || b.compras - a.compras);
  // nota fiscal
  const lerNf = async (file) => {
    if (!file) return; setLendoNf('Lendo ' + file.name + '…');
    try {
      const r = await extrairArquivo(file); setLendoNf('A IA está lendo a nota…');
      const res = await chamarIA('nota_fiscal', { texto: r.texto, temImagens: (r.imagens || []).length > 0, categorias: cats, exemplos: regras.slice(-120), empresa: sessao.empresaNome || '' }, r.imagens || []);
      res.itens = (res.itens || []).map(arrumarLinhaNF);
      (res.itens || []).forEach(li => { li.categoria = categoriaPorRegra(regras, li.descricao) || (cats.includes(li.categoria) ? li.categoria : 'Outros'); });
      const linhas = (res.itens || []).map(li => { let best = null, sc = 0; itens.filter(i => i._st !== 'recebido').forEach(i => { let p = parecido(li.descricao, i.descricao); if (i.parceiro && norm(res.fornecedor).includes(norm(i.parceiro).split(' ')[0])) p += .2; if (p > sc) { sc = p; best = i; } }); return { ...li, osId: best && sc >= .4 ? best.osId : '', itemId: best && sc >= .4 ? best.id : '' }; });
      if (lerNf.modelo) { lerNf.modelo = false; setModelo({ arquivo: file.name, fornecedor: fornecedorDaNota(res, sessao, cfgC).fornecedor, linhas: (res.itens || []).map(li => ({ descricao: li.descricao, categoria: li.categoria })) }); setLendoNf(''); return; }
      const fz = fornecedorDaNota(res, sessao, cfgC);
      setNf({ arquivo: file.name, ...fz, numero: res.numero || '', data: res.data || hoje, total: numBR(res.total), totalProdutos: numBR(res.totalProdutos), linhas });
    } catch (e) { toast('Não li a nota: ' + e.message, 'erro'); }
    setLendoNf('');
  };
  const confirmarNf = async () => {
    try {
      const porOS = {};
      nf.linhas.forEach(l => { if (l.osId) (porOS[l.osId] = porOS[l.osId] || []).push(l); });
      for (const [osId, ls] of Object.entries(porOS)) {
        const d = docs.find(x => x.id === osId); const o = oss.find(x => x.id === osId);
        let lista = [...(d?.itens || [])];
        ls.forEach(l => {
          const v = numBR(l.valorTotal) || numBR(l.valorUnit) * numBR(l.qtd);
          const k = lista.findIndex(x => x.id === l.itemId);
          if (k >= 0) lista[k] = { ...lista[k], st: 'recebido', recebido: true, comprado: true, recebidoEm: nowIso(), parceiro: nf.fornecedor, valor: numBR(lista[k].valor && lista[k].st === 'recebido' ? lista[k].valor : 0) + v, nf: nf.numero, valorUnit: numBR(l.valorUnit) };
          else lista.push({ id: rand(6), categoria: l.categoria || 'Outros', descricao: l.descricao, qtd: l.qtd, unidade: l.unidade, st: 'recebido', recebido: true, comprado: true, recebidoEm: nowIso(), parceiro: nf.fornecedor, valor: v, valorUnit: numBR(l.valorUnit), nf: nf.numero, etapa: 'pedido' });
        });
        await F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'compras', osId), { osId, osCod: o ? numOS(o) : d?.osCod || '', cliente: o?.cliente?.nome || d?.cliente || '', itens: lista, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }, { merge: true });
        registrar(sessao, osId, '🧾', 'Nota fiscal ' + nf.numero + ' — ' + nf.fornecedor, ls.length + ' itens · ' + brl(ls.reduce((n, l) => n + (numBR(l.valorTotal) || 0), 0)));
      }
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'notas'), { ...nf, criadoEm: nowIso(), por: sessao.nome });
      const mp = nf.fornecedor ? mesclarParceiro(parceiros, nf) : null;
      const novasRegras = [...regras.filter(r => !nf.linhas.some(l => norm(l.descricao) === norm(r.d))), ...nf.linhas.filter(l => l.categoria).map(l => ({ d: l.descricao, c: l.categoria }))].slice(-600);
      await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { ...(mp ? { parceirosLista: mp.lista } : {}), regrasCategoria: novasRegras });
      toast('Nota lançada e itens precificados.' + (mp?.novo ? ' Parceiro novo cadastrado: ' + nf.fornecedor + '.' : mp?.novaUni ? ' Nova unidade de ' + nf.fornecedor + ' (' + (nf.cidade || nf.cnpj) + ') cadastrada.' : ''), 'ok'); setNf(null);
    } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const osAbrir = abrir && oss.find(o => o.id === abrir);
  const cont = (f) => itens.filter(f).length;
  return html`<div class="fade-up stack">
    <div class="page-head"><div><h2>🛒 Compras</h2><div class="dim">Orçamentos, pedidos, entregas e notas de todas as OSs.</div></div>
      <button class="btn btn-verde" disabled=${!!lendoNf} onClick=${() => inpNf.current?.click()}>${lendoNf || '🧾 Lançar nota fiscal'}</button>
      <input ref=${inpNf} type="file" hidden accept=".pdf,.xml,.txt,image/*" onChange=${e => { lerNf(e.target.files[0]); e.target.value = ''; }} /></div>
    <div class="st-cards">
      ${[['orcar', cont(i => i._st === 'orcar')], ['orcando', cont(i => i._st === 'orcando')], ['aprovacao', cont(i => i._st === 'aprovacao')], ['pedido', cont(i => i._st === 'pedido')], ['recebido', cont(i => i._st === 'recebido')]].map(([v, n]) => html`<button key=${v} class=${filtro === v ? 'on' : ''} style=${{ '--c': infoStC(v)[2] }} onClick=${() => setFiltro(filtro === v ? 'abertos' : v)}><b>${n}</b><small>${infoStC(v)[1]}</small></button>`)}
      <button class=${filtro === 'pre' ? 'on' : ''} style=${{ '--c': '#7c3aed' }} onClick=${() => setFiltro(filtro === 'pre' ? 'abertos' : 'pre')}><b>${cont(i => i.etapa === 'pre' && i._st !== 'recebido')}</b><small>⚡ Pré-pedido</small></button>
      <button class=${filtro === 'contrato' ? 'on' : ''} style=${{ '--c': '#0e7490' }} onClick=${() => setFiltro(filtro === 'contrato' ? 'abertos' : 'contrato')}><b>${cont(i => i.origem === 'contrato' && i._st !== 'recebido')}</b><small>📑 Do contrato (fora da lista)</small></button>
      <button class=${filtro === 'atrasados' ? 'on' : ''} style=${{ '--c': '#dc2626' }} onClick=${() => setFiltro(filtro === 'atrasados' ? 'abertos' : 'atrasados')}><b>${cont(i => i._st === 'pedido' && i.previsao && i.previsao < hoje)}</b><small>Entrega atrasada</small></button>
    </div>
    <div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>${[['itens', '📋 Itens'], ['parceiros', '🏆 Melhores parceiros'], ['cadastro', '🏢 Parceiros'], ['precos', '💲 Preços'], ['notas', '🧾 Notas fiscais'], ['categorias', '🗂 Categorias']].map(([k, t]) => html`<button key=${k} class=${aba === k ? 'on' : ''} onClick=${() => setAba(k)}>${t}</button>`)}</div>
    ${aba === 'itens' && html`
      <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}>
        <div class="seg-mini">${[['abertos', 'Em aberto'], ['todos', 'Todos']].map(([k, t]) => html`<button key=${k} class=${filtro === k ? 'on' : ''} onClick=${() => setFiltro(k)}>${t}</button>`)}</div>
        <div class="seg-mini">${[['parceiro', 'Por fornecedor'], ['status', 'Por situação'], ['os', 'Por OS']].map(([k, t]) => html`<button key=${k} class=${agrupar === k ? 'on' : ''} onClick=${() => setAgrupar(k)}>${t}</button>`)}</div>
      </div>
      ${docs === null ? html`<div class="card">Carregando…</div>` : !vis.length ? html`<div class="card vazio dim">${itens.length ? 'Nada nesse filtro.' : 'Nenhum item ainda. Abra uma OS no Quadro geral → 🛒 Compras e use "📐 Levantar do detalhamento" ou importe do Dinabox.'}</div>` :
        Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).map(([k, l]) => html`<div key=${k} class="card page-card stack" style=${{ gap: '5px' }}>
          <div class="row" style=${{ justifyContent: 'space-between' }}><b>${k}</b><span class="dim">${l.length} ${l.length === 1 ? 'item' : 'itens'} · ${brl(l.reduce((n, i) => n + numBR(i.valor), 0))}</span></div>
          ${l.map((i, j) => html`<div key=${j} class="fl-i" style=${{ cursor: 'pointer' }} onClick=${() => setItemAb(i)}>
            <span style=${{ flex: 1 }}>${i.etapa === 'pre' ? '⚡ ' : ''}${i.origem === 'contrato' ? '📑 ' : ''}${i.qtd ? i.qtd + ' ' + (i.unidade || '') + ' ' : ''}<b>${i.descricao}</b><small> · ${agrupar === 'os' ? i.parceiro || 'sem fornecedor' : i.osCod + ' ' + (i.cliente || '').split(/\s[-–]\s/)[0]}${i.previsao && i._st === 'pedido' ? ' · 🚚 ' + dm(i.previsao) : ''}</small></span>
            ${i.valor ? html`<b class="dim">${brl(numBR(i.valor))}</b>` : ''}
            <span class="st-chip" style=${{ background: infoStC(i._st)[2] }}>${infoStC(i._st)[1]}</span>
            <button class="btn btn-sm btn-ghost" onClick=${e => { e.stopPropagation(); setAbrir(i.osId); }}>OS</button></div>`)}
        </div>`)}`}
    ${aba === 'parceiros' && html`<div class="card page-card stack">
      <div class="dim">Calculado pelos orçamentos que você compara em cada item (quem teve o menor preço) e pelas compras e entregas. Quanto mais orçamentos lançar, mais certo fica.</div>
      ${!ranking.length ? html`<div class="vazio dim">Ainda sem dados. Lance pelo menos 2 orçamentos de fornecedores diferentes num item.</div>` : ranking.map((r, k) => html`<div key=${r.nome} class="rank-i">
        <span class="rank-n">${k < 3 && r.vitorias ? ['🥇', '🥈', '🥉'][k] : k + 1}</span>
        <span style=${{ flex: 1 }}><b>${r.nome}</b><small>${r.orcs ? r.vitorias + ' de ' + r.orcs + ' orçamentos com melhor preço' + (r.vitorias ? ' · economia média ' + Math.round(r.economia / r.vitorias * 100) + '%' : '') : 'sem orçamentos comparados'}${r.entregas ? ' · ' + (r.entregas - r.atrasos) + '/' + r.entregas + ' entregas no prazo' : ''}</small></span>
        <span class="dim">${r.compras} compras · ${brl(r.gasto)}</span></div>`)}
    </div>`}
    ${aba === 'precos' && (() => {
      const lin = notas.flatMap(n => (n.linhas || []).map(l => ({ ...l, forn: n.fornecedor, cidade: n.cidade, data: n.data, vu: numBR(l.valorTotal) && numBR(l.qtd) ? numBR(l.valorTotal) / numBR(l.qtd) : numBR(l.valorUnit) }))).filter(l => l.vu > 0);
      const grupos = []; lin.forEach(l => { const nums = (x) => (String(x).match(/\d+/g) || []).join('-'); const g = grupos.find(g => nums(g.desc) === nums(l.descricao) && parecido(g.desc, l.descricao) >= 0.7); if (g) g.l.push(l); else grupos.push({ desc: l.descricao, cat: l.categoria || 'Outros', l: [l] }); });
      const q = norm(buscaP);
      const vis0 = grupos.filter(g => !q || norm(g.desc + ' ' + g.cat + ' ' + g.l.map(x => x.forn).join(' ')).includes(q));
      const catsP = [...new Set(vis0.map(g => g.cat))].sort();
      const vis = vis0.filter(g => !catP || g.cat === catP).sort((a, b) => a.cat.localeCompare(b.cat) || a.desc.localeCompare(b.desc));
      return html`<div class="card page-card stack">
        <div class="dim">Todos os preços das notas lançadas. Quando o mesmo material aparece em fornecedores diferentes, o mais barato ganha 🏆.</div>
        <input class="inp inp-sm" placeholder="🔍 Buscar material ou fornecedor…" value=${buscaP} onInput=${e => setBuscaP(e.target.value)} />
        <div class="tm-chips"><button class=${'pill' + (!catP ? ' on' : '')} onClick=${() => setCatP('')}>Todas (${vis0.length})</button>${catsP.map(c => html`<button key=${c} class=${'pill' + (catP === c ? ' on' : '')} onClick=${() => setCatP(c)}>${ICO_CAT[c] || '📦'} ${c} (${vis0.filter(g => g.cat === c).length})</button>`)}</div>
        ${!vis.length ? html`<div class="vazio dim">Nenhum preço ainda. Lance notas fiscais.</div>` : [...new Set(vis.map(g => g.cat))].map((c, ci) => { const gs = vis.filter(g => g.cat === c);
          return html`<details key=${c} class="preco-sec" open=${!!catP || ci === 0 || !!q}>
            <summary><span>${ICO_CAT[c] || '📦'} <b>${c}</b></span><small>${gs.length} ${gs.length === 1 ? 'material' : 'materiais'}</small></summary>
            <div class="preco-tab">
              ${gs.map((g, k) => { const porF = {}; g.l.forEach(x => { if (!porF[x.forn] || x.data > porF[x.forn].data) porF[x.forn] = x; }); const lst = Object.values(porF).sort((a, b) => a.vu - b.vu); const m = lst[0];
                return html`<div key=${k} class="preco-r">
                  <span class="pr-desc" title=${g.desc}>${g.desc}</span>
                  <span class="pr-forn">${lst.length > 1 ? '🏆 ' : ''}${m.forn}</span>
                  <b class="pr-val">${brl(m.vu)}<small>/${(m.unidade || 'un').toLowerCase()}</small></b>
                  <span class="pr-outros">${lst.slice(1, 3).map(x => html`<i>${x.forn.split(' ')[0]} +${Math.round((x.vu / m.vu - 1) * 100)}%</i>`)}${lst.length > 3 ? html`<i>+${lst.length - 3}</i>` : ''}<small>${m.data ? dm(m.data) : ''}</small></span>
                </div>`; })}
            </div></details>`; })}
      </div>`; })()}
    ${aba === 'cadastro' && html`<div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}><div class="dim">Cadastrados sozinhos a cada nota fiscal. Mesma empresa em unidades diferentes (outro CNPJ da mesma rede) fica junta. Toque para editar.</div>
        <button class="btn btn-sm btn-primary" onClick=${() => setEditP({ i: -1, p: { nome: '', razao: '', cnpjRaiz: '', categorias: [], unidades: [], contato: '' } })}>＋ Novo parceiro</button></div>
      ${!parceiros.length ? html`<div class="vazio dim">Nenhum parceiro ainda.</div>` : parceiros.map((p, i0) => [p, i0]).sort((a, b) => a[0].nome.localeCompare(b[0].nome)).map(([p, i0]) => html`<div key=${p.nome + i0} class="parc-card" style=${{ cursor: 'pointer' }} onClick=${() => setEditP({ i: i0, p: { categorias: [], unidades: [], ...p } })}>
        <div class="row" style=${{ justifyContent: 'space-between' }}><b>🏢 ${p.nome}</b>${p.cnpjRaiz ? html`<small class="dim">rede ${p.cnpjRaiz}</small>` : ''}</div>
        ${(p.categorias || []).length > 0 && html`<div class="tm-chips">${p.categorias.map(c => html`<span key=${c}>${ICO_CAT[c] || '📦'} ${c}</span>`)}</div>`}
        ${(p.unidades || []).map((u, j) => html`<div key=${j} class="dim" style=${{ fontSize: '12px' }}>📍 ${u.cidade ? u.cidade + '/' + u.uf : 'unidade'} · CNPJ ${u.cnpj}${u.endereco ? ' · ' + u.endereco : ''}</div>`)}
      </div>`)}
    </div>`}
    ${aba === 'categorias' && html`<div class="card page-card stack">
      <div class="dim">As categorias de material vêm das <b>notas modelo</b>: envie uma nota, confira a categoria de cada item e salve. O app aprende e, nas próximas notas, separa sozinho.</div>
      <button class="btn btn-grande btn-verde" disabled=${!!lendoNf} onClick=${() => { lerNf.modelo = true; inpNf.current?.click(); }}>${lendoNf || '📥 Enviar nota modelo'}</button>
      <div class="tm-chips">${cats.map(c => html`<span key=${c}>${ICO_CAT[c] || '📦'} ${c} <small class="dim">${regras.filter(r => r.c === c).length}</small> ${!CAT_COMPRA.includes(c) ? html`<button class="x-btn" onClick=${() => F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { categoriasCompra: cats.filter(x => x !== c) })}>✕</button>` : ''}</span>`)}</div>
      <div class="row" style=${{ gap: '5px', flexWrap: 'nowrap' }}><input class="inp inp-sm" placeholder="Nova categoria (ex: Colas e químicos)" value=${novaCat} onInput=${e => setNovaCat(e.target.value)} />
        <button class="btn btn-sm btn-primary" onClick=${async () => { const n = novaCat.trim(); if (!n || cats.includes(n)) return; await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { categoriasCompra: [...cats, n] }); setNovaCat(''); }}>＋ Criar</button></div>
      <div class="dim" style=${{ fontSize: '12px' }}>${regras.length} itens de nota já aprendidos.</div>
      ${(cfgC.modelosNota || []).length > 0 && html`<div class="sec-title" style=${{ fontSize: '14px' }}>Notas modelo enviadas</div>
        ${cfgC.modelosNota.map(m => html`<div key=${m.id} class="fl-i"><span style=${{ flex: 1 }}>🧾 ${m.fornecedor || m.arquivo}<small> · ${m.n} itens · ${fmtData(m.em)}</small></span>
          <button class="btn btn-sm btn-danger" onClick=${async () => { if ((await escolher('Excluir nota modelo', 'Excluir o modelo de ' + (m.fornecedor || m.arquivo) + '? O que foi aprendido com ele é apagado.', [{ v: 's', t: 'Excluir', cls: 'btn-danger' }, { v: 'n', t: 'Cancelar' }])) !== 's') return; await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { modelosNota: cfgC.modelosNota.filter(x => x.id !== m.id), regrasCategoria: regras.filter(r => r.m !== m.id) }); toast('Modelo excluído.', 'ok'); }}>🗑 Excluir</button></div>`)}`}
    </div>`}
    ${editP && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setEditP(null)}><div class="card modal-caixa stack" style=${{ width: 'min(600px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🏢 ${editP.i < 0 ? 'Novo parceiro' : 'Editar parceiro'}</div><button class="x-btn" onClick=${() => setEditP(null)}>✕</button></div>
      <div class="grid2">
        <div class="field"><span class="lbl">Nome</span><input class="inp" value=${editP.p.nome} onInput=${e => setEditP({ ...editP, p: { ...editP.p, nome: e.target.value } })} /></div>
        <div class="field"><span class="lbl">Razão social</span><input class="inp" value=${editP.p.razao || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, razao: e.target.value } })} /></div>
        <div class="field"><span class="lbl">Contato (vendedor / telefone)</span><input class="inp" value=${editP.p.contato || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, contato: e.target.value } })} /></div>
        <div class="field"><span class="lbl">📲 WhatsApp para orçamentos</span><input class="inp" inputmode="tel" placeholder="(47) 99999-9999" value=${editP.p.whats || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, whats: e.target.value } })} /></div>
        <div class="field"><span class="lbl">CNPJ (raiz da rede)</span><input class="inp" value=${editP.p.cnpjRaiz || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, cnpjRaiz: raizCnpj(e.target.value) } })} /></div>
      </div>
      <span class="lbl">O que vende</span>
      <div class="tm-chips">${cats.map(c => { const on = (editP.p.categorias || []).includes(c); return html`<button key=${c} class=${'pill' + (on ? ' on' : '')} onClick=${() => setEditP({ ...editP, p: { ...editP.p, categorias: on ? editP.p.categorias.filter(x => x !== c) : [...(editP.p.categorias || []), c] } })}>${ICO_CAT[c] || '📦'} ${c}</button>`; })}</div>
      <span class="lbl">Unidades / filiais</span>
      ${(editP.p.unidades || []).map((u, j) => html`<div key=${j} class="row" style=${{ gap: '4px', flexWrap: 'nowrap' }}>
        <input class="inp inp-sm" placeholder="Cidade" value=${u.cidade || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, unidades: editP.p.unidades.map((x, k) => k === j ? { ...x, cidade: e.target.value } : x) } })} />
        <input class="inp inp-sm" style=${{ width: '52px' }} placeholder="UF" value=${u.uf || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, unidades: editP.p.unidades.map((x, k) => k === j ? { ...x, uf: e.target.value } : x) } })} />
        <input class="inp inp-sm" placeholder="CNPJ" value=${u.cnpj || ''} onInput=${e => setEditP({ ...editP, p: { ...editP.p, unidades: editP.p.unidades.map((x, k) => k === j ? { ...x, cnpj: e.target.value } : x) } })} />
        <button class="x-btn" onClick=${() => setEditP({ ...editP, p: { ...editP.p, unidades: editP.p.unidades.filter((_, k) => k !== j) } })}>✕</button></div>`)}
      <button class="btn btn-sm" onClick=${() => setEditP({ ...editP, p: { ...editP.p, unidades: [...(editP.p.unidades || []), { cidade: '', uf: '', cnpj: '', endereco: '' }] } })}>＋ Unidade</button>
      <div class="row" style=${{ gap: '6px' }}>
        ${editP.i >= 0 && html`<button class="btn btn-danger" onClick=${async () => { if ((await escolher('Excluir parceiro', 'Excluir ' + editP.p.nome + ' da lista? As compras antigas continuam com o nome.', [{ v: 's', t: 'Excluir', cls: 'btn-danger' }, { v: 'n', t: 'Cancelar' }])) !== 's') return; await salvarParc(parceiros.filter((_, k) => k !== editP.i)); setEditP(null); }}>🗑 Excluir</button>`}
        <button class="btn btn-grande btn-verde" style=${{ flex: 1 }} onClick=${async () => { const p = { ...editP.p, nome: editP.p.nome.trim(), esp: (editP.p.categorias || []).join(', ') }; if (!p.nome) return toast('Coloque o nome.'); await salvarParc(editP.i < 0 ? [...parceiros, p] : parceiros.map((x, k) => k === editP.i ? p : x)); toast('Parceiro salvo.', 'ok'); setEditP(null); }}>💾 Salvar</button>
      </div>
    </div></div>`, document.body)}
    ${modelo && ReactDOM.createPortal(html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(700px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🗂 Nota modelo — ${modelo.fornecedor}</div><button class="x-btn" onClick=${() => setModelo(false)}>✕</button></div>
      <div class="dim">Confira a categoria de cada item. Isso vira o padrão para as próximas notas.</div>
      <div class="nf-linhas">${modelo.linhas.map((l, k) => html`<div key=${k} class="nf-l"><div><b>${l.descricao}</b></div>
        <select class="inp inp-sm" value=${l.categoria} onChange=${e => setModelo({ ...modelo, linhas: modelo.linhas.map((x, j) => j === k ? { ...x, categoria: e.target.value } : x) })}>${cats.map(c => html`<option key=${c}>${c}</option>`)}</select></div>`)}</div>
      <button class="btn btn-grande btn-verde btn-block" onClick=${async () => { const nr = [...regras.filter(r => !modelo.linhas.some(l => norm(l.descricao) === norm(r.d))), ...modelo.linhas.map(l => ({ d: l.descricao, c: l.categoria }))].slice(-600); const mid = rand(6); const nr2 = [...regras.filter(r => !modelo.linhas.some(l => norm(l.descricao) === norm(r.d))), ...modelo.linhas.map(l => ({ d: l.descricao, c: l.categoria, m: mid }))].slice(-600); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { regrasCategoria: nr2, modelosNota: [...(cfgC.modelosNota || []), { id: mid, fornecedor: modelo.fornecedor, arquivo: modelo.arquivo, n: modelo.linhas.length, em: nowIso() }] }); toast(modelo.linhas.length + ' itens aprendidos.', 'ok'); setModelo(false); }}>💾 Salvar como modelo</button>
    </div></div>`, document.body)}
    ${aba === 'notas' && html`<div class="card page-card stack">
      ${!notas.length ? html`<div class="vazio dim">Nenhuma nota lançada. Use 🧾 Lançar nota fiscal.</div>` : notas.sort((a, b) => String(b.data).localeCompare(String(a.data))).map(n => html`<div key=${n.id} class="fl-i"><span style=${{ flex: 1 }}><b>NF ${n.numero || '—'}</b> · ${n.fornecedor}<small> · ${n.data ? n.data.split('-').reverse().join('/') : ''} · ${(n.linhas || []).length} itens</small></span><b>${brl(n.total)}</b><button class="x-btn" title="Corrigir fornecedor" onClick=${async () => { const nome = (await pedirTexto('Fornecedor correto desta nota', n.fornecedor)).trim(); if (!nome) return; const antigo = n.fornecedor; await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'notas', n.id), { fornecedor: nome }); const ainda = notas.some(x => x.id !== n.id && x.fornecedor === antigo); const lista = parceiros.map(p => p.nome === antigo && !ainda ? { ...p, nome } : p); const mp = parceiros.some(p => p.nome === antigo) && !ainda ? { lista } : mesclarParceiro(lista, { ...n, fornecedor: nome, cnpj: '', linhas: n.linhas || [] }); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: mp.lista, nomesProprios: [...new Set([...(cfgC.nomesProprios || []), antigo])] }); toast('Fornecedor corrigido para ' + nome + '.', 'ok'); }}>✏️</button><button class="x-btn" title="Excluir nota" onClick=${async () => { if ((await escolher('Excluir nota', 'Excluir a NF ' + (n.numero || '') + ' de ' + n.fornecedor + '? Os preços dela saem da aba Preços. Itens já lançados nas OSs continuam.', [{ v: 's', t: 'Excluir nota', cls: 'btn-danger' }, { v: 'n', t: 'Cancelar' }])) !== 's') return; await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'notas', n.id)); toast('Nota excluída.', 'ok'); }}>🗑</button></div>`)}
    </div>`}
    ${nf && ReactDOM.createPortal(html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(820px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🧾 Nota fiscal — separar por OS</div><button class="x-btn" onClick=${() => setNf(null)}>✕</button></div>
      <div class="grid2">
        <div class="field"><span class="lbl">Fornecedor</span><input class="inp" value=${nf.fornecedor} onInput=${e => setNf({ ...nf, fornecedor: e.target.value })} /></div>
        <div class="field"><span class="lbl">Nº da nota · data</span><div class="row" style=${{ gap: '4px', flexWrap: 'nowrap' }}><input class="inp" value=${nf.numero} onInput=${e => setNf({ ...nf, numero: e.target.value })} /><input class="inp" type="date" value=${nf.data} onInput=${e => setNf({ ...nf, data: e.target.value })} /></div></div>
      </div>
      ${nf.cnpj && html`<div class="dim">🏢 ${nf.razao || nf.fornecedor} · CNPJ ${nf.cnpj}${nf.cidade ? ' · ' + nf.cidade + '/' + nf.uf : ''} ${(() => { const r = raizCnpj(nf.cnpj); const p = parceiros.find(x => r && x.cnpjRaiz === r); return p ? html`<b style=${{ color: '#15803d' }}>· parceiro já cadastrado${p.unidades?.some(u => u.cnpj.replace(/\D/g, '') === nf.cnpj.replace(/\D/g, '')) ? '' : ' (unidade nova)'}</b>` : html`<b style=${{ color: '#2563eb' }}>· parceiro novo, será cadastrado</b>`; })()}</div>`}
      ${nf.suspeito && html`<div class="error-box">⚠️ "${nf.fornecedor}" parece ser a sua própria empresa (quem comprou). Corrija o nome do fornecedor acima.</div>`}
      <label class="row dim" style=${{ gap: '6px' }}><input type="checkbox" onChange=${async e => { if (e.target.checked && nf.fornecedor) { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { nomesProprios: [...new Set([...(cfgC.nomesProprios || []), nf.fornecedor])] }); toast('Anotado: "' + nf.fornecedor + '" é a sua empresa. Nunca mais vira fornecedor.', 'ok'); setNf({ ...nf, fornecedor: '', suspeito: true }); } }} /> Esse nome é da minha empresa (quem comprou), não do fornecedor</label>
      <div class="dim">A IA já ligou cada item ao material parecido das OSs e separou por categoria. Confira e troque se precisar — o app aprende com as suas correções.</div>
      <div class="nf-linhas">${nf.linhas.map((l, k) => { const doOS = itens.filter(i => i.osId === l.osId); return html`<div key=${k} class="nf-l">
        <div><b>${l.descricao}</b>
          <div class="row nf-val" style=${{ gap: '4px', flexWrap: 'nowrap', alignItems: 'center' }}>
            <input class="inp inp-sm" style=${{ width: '70px' }} inputmode="decimal" value=${l.qtd} onChange=${e => setNf({ ...nf, linhas: nf.linhas.map((x, j) => j === k ? arrumarLinhaNF({ ...x, qtd: e.target.value, valorUnit: 0 }) : x) })} /><small>${l.unidade || ''} ×</small>
            <b style=${{ whiteSpace: 'nowrap' }}>${brl(numBR(l.valorUnit))}</b><small>=</small>
            <input class="inp inp-sm" style=${{ width: '100px' }} inputmode="decimal" value=${numBR(l.valorTotal).toFixed(2).replace('.', ',')} onChange=${e => setNf({ ...nf, linhas: nf.linhas.map((x, j) => j === k ? arrumarLinhaNF({ ...x, valorTotal: e.target.value, valorUnit: 0 }) : x) })} /></div>
          <select class="inp inp-sm" style=${{ marginTop: '3px' }} value=${l.categoria || 'Outros'} onChange=${e => setNf({ ...nf, linhas: nf.linhas.map((x, j) => j === k ? { ...x, categoria: e.target.value } : x) })}>${cats.map(c => html`<option key=${c}>${c}</option>`)}</select></div>
        <select class="inp inp-sm" value=${l.osId} onChange=${e => setNf({ ...nf, linhas: nf.linhas.map((x, j) => j === k ? { ...x, osId: e.target.value, itemId: '' } : x) })}><option value="">— sem OS —</option>${oss.slice().sort((a, b) => numOS(a).localeCompare(numOS(b))).map(o => html`<option key=${o.id} value=${o.id}>${numOS(o)} ${(o.cliente?.nome || '').split(/\s[-–]\s/)[0]} · ${(o.ambientes || []).map(a => a.nome).join(', ')}</option>`)}</select>
        ${l.osId && html`<select class="inp inp-sm" value=${l.itemId} onChange=${e => setNf({ ...nf, linhas: nf.linhas.map((x, j) => j === k ? { ...x, itemId: e.target.value } : x) })}><option value="">➕ novo item</option>${doOS.map(i => html`<option key=${i.id} value=${i.id}>${i.descricao}</option>`)}</select>`}
      </div>`; })}</div>
      <div class="row" style=${{ justifyContent: 'space-between' }}><span>Total da nota: <b>${brl(nf.total)}</b> · soma dos itens: <b style=${{ color: Math.abs(nf.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0) - (nf.totalProdutos || nf.total)) > 1 ? '#b91c1c' : '#15803d' }}>${brl(nf.linhas.reduce((n, l) => n + numBR(l.valorTotal), 0))}</b></span><span class="dim">Alocado: ${brl(nf.linhas.filter(l => l.osId).reduce((n, l) => n + numBR(l.valorTotal), 0))}</span></div>
      <div class="row" style=${{ gap: '6px' }}>
        <button class="btn btn-grande" style=${{ flex: 1 }} onClick=${async () => { try { const mp = mesclarParceiro(parceiros, nf); const nr = [...regras.filter(r => !nf.linhas.some(l => norm(l.descricao) === norm(r.d))), ...nf.linhas.filter(l => l.categoria).map(l => ({ d: l.descricao, c: l.categoria }))].slice(-600); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: mp.lista, regrasCategoria: nr }); await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'notas'), { ...nf, linhas: nf.linhas.map(l => ({ ...l, osId: '', itemId: '' })), semOS: true, criadoEm: nowIso(), por: sessao.nome }); toast((mp.novo ? 'Parceiro cadastrado: ' + nf.fornecedor : mp.novaUni ? 'Nova unidade de ' + nf.fornecedor : nf.fornecedor + ' atualizado') + ' · ' + nf.linhas.length + ' preços guardados.', 'ok'); setNf(null); } catch (e) { toast(e.message, 'erro'); } }}>🏢 Cadastrar parceiro e preços (sem OS)</button>
        <button class="btn btn-grande btn-verde" style=${{ flex: 1 }} onClick=${confirmarNf}>💾 Lançar nota e precificar itens</button>
      </div>
    </div></div>`, document.body)}
    ${itemAb && html`<${ItemCompraModal} item=${itemAb} parceiros=${parceiros} fechar=${() => setItemAb(null)} salvar=${(ni) => { const { _st, osId, osCod, cliente, ...limpo } = ni; salvarItem(itemAb.osId, limpo).catch(e => toast(e.message, 'erro')); }} />`}
    ${osAbrir && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setAbrir(null)}><div class="card modal-caixa stack" style=${{ width: 'min(760px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🛒 ${numOS(osAbrir)} · ${osAbrir.cliente?.nome || ''}</div><button class="x-btn" onClick=${() => setAbrir(null)}>✕</button></div>
      <${ComprasOS} sessao=${sessao} os=${osAbrir} toast=${toast} /></div></div>`, document.body)}
  </div>`;
}


/* ---------- Contas a pagar / receber e custos operacionais ---------- */
const CAT_PAGAR = ['Aluguel', 'Salários', 'Pró-labore', 'Encargos', 'Energia', 'Água', 'Internet / telefone', 'Impostos', 'Contador', 'Combustível', 'Veículos', 'Manutenção', 'Máquinas', 'Material (geral)', 'Terceiros', 'RT arquiteto', 'Comissão', 'Frete', 'Marketing', 'Empréstimo / financiamento', 'Outros'];
const FORMAS_PG = ['Pix', 'Boleto', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Dinheiro', 'Cheque'];
const CAT_RECEBER = ['Cliente — entrada', 'Cliente — parcela', 'Cliente — final', 'Outros recebimentos'];
const addMes = (iso0, n) => { const d = deIsoD(iso0); const dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return isoD(d); };
function TelaContas({ sessao, toast }) {
  const [l, setL] = useState(null);
  const [oss, setOss] = useState([]);
  const [mes, setMes] = useState(() => isoD(new Date()).slice(0, 7));
  const [filtro, setFiltro] = useState('todos');
  const [novo, setNovo] = useState(null);
  useEffect(() => { const a = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'lancamentos'), s => setL(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setL([])); const b = F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}); return () => { a(); b(); }; }, []);
  const hoje = isoD(new Date());
  const doMes = (l || []).filter(x => String(x.venc).slice(0, 7) === mes);
  const vencidos = (l || []).filter(x => !x.pago && x.venc < hoje);
  const soma = (arr) => arr.reduce((n, x) => n + numBR(x.valor), 0);
  const aPagar = doMes.filter(x => x.tipo === 'pagar'), aRec = doMes.filter(x => x.tipo === 'receber');
  const vis = (filtro === 'vencidos' ? vencidos : doMes).filter(x => filtro === 'todos' || filtro === 'vencidos' || x.tipo === filtro).sort((a, b) => String(a.venc).localeCompare(String(b.venc)));
  const porCat = {}; aPagar.forEach(x => { porCat[x.categoria] = (porCat[x.categoria] || 0) + numBR(x.valor); });
  const maxCat = Math.max(1, ...Object.values(porCat));
  const grupos = {}; (l || []).forEach(x => { if (!x.grupo) return; const g = grupos[x.grupo] = grupos[x.grupo] || { id: x.grupo, tipo: x.tipo, descricao: x.descricao, forma: x.forma, rec: x.recorrente, itens: [] }; g.itens.push(x); });
  const resumoG = (g) => { const n = g.itens.length, pg = g.itens.filter(x => x.pago), tot = soma(g.itens), feito = soma(pg); const prox = g.itens.filter(x => !x.pago).sort((a, b) => a.venc.localeCompare(b.venc))[0]; return { n, pagas: pg.length, tot, feito, falta: tot - feito, prox }; };
  const nomeMes = new Date(mes + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const pagar = async (x) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'lancamentos', x.id), { pago: !x.pago, pagoEm: !x.pago ? nowIso() : '', pagoPor: !x.pago ? sessao.nome : '' }); } catch (e) { toast(e.message, 'erro'); } };
  const excluir = async (x) => { const r = await escolher('Excluir lançamento', x.descricao + ' — ' + brl(x.valor) + (x.grupo ? '\nFaz parte de um parcelamento/recorrência.' : ''), [{ v: 'um', t: 'Excluir só este', cls: 'btn-danger' }, ...(x.grupo ? [{ v: 'prox', t: 'Excluir este e os próximos (não pagos)', cls: 'btn-danger' }] : []), { v: 'n', t: 'Cancelar' }]); if (r === 'n' || !r) return;
    const alvo = r === 'prox' ? l.filter(y => y.grupo === x.grupo && !y.pago && y.venc >= x.venc) : [x]; const b = F().fsMod.writeBatch(F().db); alvo.forEach(y => b.delete(docRef('empresas', sessao.empresaId, 'lancamentos', y.id))); await b.commit(); toast(alvo.length + ' excluído(s).', 'ok'); };
  const salvarNovo = async () => {
    const n = novo; const v = numBR(n.valor); if (!n.descricao?.trim() && !n.categoria) return toast('Escreva a descrição.'); if (!v) return toast('Informe o valor.'); if (!n.venc) return toast('Informe o vencimento.');
    const qt = Math.max(1, parseInt(n.parcelas, 10) || 1); const grupo = qt > 1 ? rand(8) : '';
    const valorParc = n.modo === 'total' ? Math.round(v / qt * 100) / 100 : v;
    const extras = { forma: n.forma || '', conta: n.conta || '' };
    const o = n.osId ? oss.find(x => x.id === n.osId) : null;
    const b = F().fsMod.writeBatch(F().db);
    for (let k = 0; k < qt; k++) b.set(F().fsMod.doc(col('empresas', sessao.empresaId, 'lancamentos')), { tipo: n.tipo, categoria: n.categoria, descricao: (n.descricao || n.categoria).trim(), valor: valorParc, venc: addMes(n.venc, k), parcela: qt > 1 ? (k + 1) + '/' + qt : '', recorrente: n.modo === 'recorrente', grupo, ...extras, pago: false, osId: o?.id || '', osCod: o ? numOS(o) : '', cliente: o?.cliente?.nome || n.cliente || '', criadoEm: nowIso(), por: sessao.nome });
    try { await b.commit(); toast(qt > 1 ? qt + ' lançamentos criados.' : 'Lançado.', 'ok'); setNovo(null); } catch (e) { toast(e.message, 'erro'); }
  };
  const osRT = novo?.osId ? oss.find(x => x.id === novo.osId) : null;
  const contratoRT = osRT ? oss.filter(x => norm((x.cliente?.nome || '').split(/\s[-–]\s/)[0]) === norm((osRT.cliente?.nome || '').split(/\s[-–]\s/)[0])).reduce((n, x) => n + numBR(x.financeiro?.valor), 0) : 0;
  return html`<div class="fade-up stack">
    <div class="page-head"><div><h2>📒 Contas & custos operacionais</h2><div class="dim">Tudo que a empresa paga e recebe: custos fixos, parcelamentos, RT do arquiteto, parcelas dos clientes.</div></div>
      <div class="row" style=${{ gap: '6px' }}><button class="btn btn-danger" onClick=${() => setNovo({ tipo: 'pagar', categoria: 'Aluguel', descricao: '', valor: '', venc: hoje, parcelas: 1, modo: 'total' })}>＋ A pagar</button><button class="btn btn-verde" onClick=${() => setNovo({ tipo: 'receber', categoria: 'Cliente — parcela', descricao: '', valor: '', venc: hoje, parcelas: 1, modo: 'total' })}>＋ A receber</button></div></div>
    <div class="row" style=${{ gap: '8px', justifyContent: 'center' }}><button class="btn btn-sm" onClick=${() => setMes(addMes(mes + '-01', -1).slice(0, 7))}>‹</button><b style=${{ textTransform: 'capitalize', fontSize: '18px', minWidth: '180px', textAlign: 'center' }}>${nomeMes}</b><button class="btn btn-sm" onClick=${() => setMes(addMes(mes + '-01', 1).slice(0, 7))}>›</button></div>
    <div class="mt-tiles">
      <div class="mt-t neg"><small>A pagar no mês</small><b style=${{ fontSize: '18px' }}>${brl(soma(aPagar))}</b><em>${brl(soma(aPagar.filter(x => x.pago)))} já pago</em></div>
      <div class="mt-t pos"><small>A receber no mês</small><b style=${{ fontSize: '18px' }}>${brl(soma(aRec))}</b><em>${brl(soma(aRec.filter(x => x.pago)))} já recebido</em></div>
      <div class=${'mt-t ' + (soma(aRec) - soma(aPagar) >= 0 ? 'pos' : 'neg')}><small>Saldo previsto do mês</small><b style=${{ fontSize: '18px' }}>${brl(soma(aRec) - soma(aPagar))}</b></div>
      <div class="mt-t warn"><small>Vencidos (todos os meses)</small><b style=${{ fontSize: '18px' }}>${vencidos.length}</b><em>${brl(soma(vencidos.filter(x => x.tipo === 'pagar')))} a pagar · ${brl(soma(vencidos.filter(x => x.tipo === 'receber')))} a receber</em></div>
    </div>
    ${Object.keys(porCat).length > 0 && html`<details class="card metricas"><summary><b>📊 Custos do mês por categoria</b></summary>${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => html`<div key=${c} class="cat-bar"><span>${c}</span><div><i style=${{ width: v / maxCat * 100 + '%' }}></i></div><b>${brl(v)}</b></div>`)}</details>`}
    ${Object.keys(grupos).length > 0 && html`<details class="card metricas" open><summary><b>📦 Parcelamentos e recorrentes</b> <span class="chip">${Object.keys(grupos).length}</span></summary>
      ${(() => { const rs = Object.values(grupos).map(g => ({ t: g.tipo, r: resumoG(g) })); const tot = (t, k) => rs.filter(x => x.t === t).reduce((n, x) => n + x.r[k], 0); return html`<div class="mt-tiles" style=${{ marginTop: '6px' }}>
        <div class="mt-t pos"><small>Parcelas recebidas</small><b style=${{ fontSize: '18px' }}>${tot('receber', 'pagas')} de ${tot('receber', 'n')}</b><em>${brl(tot('receber', 'feito'))} recebido</em></div>
        <div class="mt-t warn"><small>Faltam receber</small><b style=${{ fontSize: '18px' }}>${tot('receber', 'n') - tot('receber', 'pagas')} parcelas</b><em>${brl(tot('receber', 'falta'))} a receber</em></div>
        <div class="mt-t neg"><small>Parcelas a pagar</small><b style=${{ fontSize: '18px' }}>${tot('pagar', 'n') - tot('pagar', 'pagas')} faltam</b><em>${brl(tot('pagar', 'falta'))} a pagar · ${tot('pagar', 'pagas')} pagas</em></div>
      </div>`; })()}
      ${Object.values(grupos).map(g => ({ g, r: resumoG(g) })).sort((a, b) => (a.r.falta === 0) - (b.r.falta === 0) || String(a.r.prox?.venc).localeCompare(String(b.r.prox?.venc))).map(({ g, r }) => html`<div key=${g.id} class=${'parc-g ' + g.tipo}>
        <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}><b>${g.tipo === 'pagar' ? '💸' : '💰'} ${g.descricao}</b><span><b>${r.pagas}/${r.n}</b> ${g.tipo === 'pagar' ? 'pagas' : 'recebidas'} · <b>faltam ${r.n - r.pagas}</b></span></div>
        <div class="fin-barra"><i style=${{ width: (r.tot ? r.feito / r.tot * 100 : 0) + '%', background: g.tipo === 'pagar' ? '#dc2626' : '#16a34a' }}></i></div>
        <small class="dim">${g.tipo === 'pagar' ? 'Pago' : 'Recebido'}: <b>${brl(r.feito)}</b> de ${brl(r.tot)} · ${g.tipo === 'pagar' ? 'a pagar' : 'a receber'}: <b>${brl(r.falta)}</b>${r.prox ? ' · próxima ' + r.prox.venc.split('-').reverse().slice(0, 2).join('/') + ' (' + brl(r.prox.valor) + ')' : ' · quitado ✓'}${g.forma ? ' · ' + g.forma : ''}</small>
      </div>`)}</details>`}
    <div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>${[['todos', 'Todos do mês'], ['pagar', 'A pagar'], ['receber', 'A receber'], ['vencidos', '⚠ Vencidos']].map(([k, t]) => html`<button key=${k} class=${filtro === k ? 'on' : ''} onClick=${() => setFiltro(k)}>${t}</button>`)}</div>
    <div class="card page-card stack" style=${{ gap: '4px' }}>
      ${l === null ? html`<div class="dim">Carregando…</div>` : !vis.length ? html`<div class="vazio dim">Nada aqui.</div>` : vis.map(x => { const venc = !x.pago && x.venc < hoje; return html`<div key=${x.id} class=${'conta ' + x.tipo + (x.pago ? ' pago' : '') + (venc ? ' venc' : '')}>
        <button class="conta-ck" title=${x.pago ? 'Desmarcar' : x.tipo === 'pagar' ? 'Marcar como pago' : 'Marcar como recebido'} onClick=${() => pagar(x)}>${x.pago ? '✓' : ''}</button>
        <span class="conta-d"><b>${x.venc ? x.venc.split('-').reverse().slice(0, 2).join('/') : ''}</b></span>
        <span style=${{ flex: 1 }}><b>${x.descricao}</b>${x.parcela ? html` <span class="chip">${x.parcela}</span>` : ''}${x.grupo && grupos[x.grupo] ? (() => { const r = resumoG(grupos[x.grupo]); return html` <span class="chip chip-ok">${r.pagas} de ${r.n} ${x.tipo === 'pagar' ? 'pagas' : 'recebidas'} · ${brl(r.feito)}</span> <span class="chip">faltam ${r.n - r.pagas} · ${brl(r.falta)} ${x.tipo === 'pagar' ? 'a pagar' : 'a receber'}</span>`; })() : ''}<small>${[x.forma && '💳 ' + x.forma, x.conta && '🏦 ' + x.conta, x.categoria, x.osCod && 'OS ' + x.osCod, x.cliente, x.pago && (x.tipo === 'pagar' ? 'pago' : 'recebido') + ' por ' + x.pagoPor].filter(Boolean).join(' · ')}</small></span>
        <b class="conta-v">${x.tipo === 'pagar' ? '−' : '+'} ${brl(x.valor)}</b>
        <button class="x-btn" onClick=${() => excluir(x)}>✕</button></div>`; })}
    </div>
    ${novo && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setNovo(null)}><div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${novo.tipo === 'pagar' ? '💸 Conta a pagar' : '💰 Conta a receber'}</div><button class="x-btn" onClick=${() => setNovo(null)}>✕</button></div>
      <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${(novo.tipo === 'pagar' ? CAT_PAGAR : CAT_RECEBER).map(c => html`<button key=${c} class=${'pill' + (novo.categoria === c ? ' on' : '')} onClick=${() => setNovo({ ...novo, categoria: c })}>${c}</button>`)}</div>
      <input class="inp" placeholder="Descrição (ex.: Aluguel galpão, RT Arq. Fulana, Parcela 2 cliente…)" value=${novo.descricao} onInput=${e => setNovo({ ...novo, descricao: e.target.value })} />
      ${(novo.categoria === 'RT arquiteto' || novo.categoria === 'Comissão' || novo.tipo === 'receber') && html`<div class="grid2">
        <div class="field"><span class="lbl">Ligado a qual OS / cliente</span><select class="inp" value=${novo.osId || ''} onChange=${e => setNovo({ ...novo, osId: e.target.value })}><option value="">— nenhum —</option>${oss.slice().sort((a, b) => numOS(a).localeCompare(numOS(b))).map(o => html`<option key=${o.id} value=${o.id}>${numOS(o)} ${(o.cliente?.nome || '').split(/\s[-–]\s/)[0]}</option>`)}</select></div>
        ${(novo.categoria === 'RT arquiteto' || novo.categoria === 'Comissão') && html`<div class="field"><span class="lbl">% sobre o contrato${contratoRT ? ' (' + brl(contratoRT) + ')' : ''}</span><input class="inp" inputmode="decimal" placeholder="Ex.: 10" value=${novo.pct || ''} onInput=${e => { const pct = numBR(e.target.value); setNovo({ ...novo, pct: e.target.value, valor: contratoRT && pct ? String(Math.round(contratoRT * pct) / 100) : novo.valor }); }} /></div>`}
      </div>`}
      <div class="grid2">
        <div class="field"><span class="lbl">Valor (R$)</span><input class="inp" inputmode="decimal" value=${novo.valor} onInput=${e => setNovo({ ...novo, valor: e.target.value })} /></div>
        <div class="field"><span class="lbl">${Number(novo.parcelas) > 1 ? '1º vencimento' : 'Vencimento'}</span><input class="inp" type="date" value=${novo.venc} onInput=${e => setNovo({ ...novo, venc: e.target.value })} /></div>
      </div>
      <span class="lbl">Forma de pagamento</span>
      <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${FORMAS_PG.map(f => html`<button key=${f} class=${'pill' + (novo.forma === f ? ' on' : '')} onClick=${() => setNovo({ ...novo, forma: novo.forma === f ? '' : f })}>${f}</button>`)}</div>
      <input class="inp inp-sm" list="lista-contas" placeholder=${novo.tipo === 'pagar' ? 'Sai de qual conta/banco? (opcional)' : 'Entra em qual conta/banco? (opcional)'} value=${novo.conta || ''} onInput=${e => setNovo({ ...novo, conta: e.target.value })} />
      <datalist id="lista-contas">${[...new Set((l || []).map(x => x.conta).filter(Boolean))].map(c => html`<option key=${c} value=${c} />`)}</datalist>
      <div class="row" style=${{ gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span class="lbl">Parcelas / repetir</span>
        ${[1, 2, 3, 4, 5, 6, 10, 12].map(n => html`<button key=${n} class=${'pill' + (Number(novo.parcelas) === n ? ' on' : '')} onClick=${() => setNovo({ ...novo, parcelas: n })}>${n === 1 ? 'Só uma vez' : n + 'x'}</button>`)}
        <input class="inp inp-sm" style=${{ width: '64px' }} inputmode="numeric" value=${novo.parcelas} onInput=${e => setNovo({ ...novo, parcelas: e.target.value })} />
      </div>
      ${Number(novo.parcelas) > 1 && html`<div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>
        <button class=${novo.modo === 'total' ? 'on' : ''} onClick=${() => setNovo({ ...novo, modo: 'total' })}>Valor total: ${novo.parcelas}x de ${brl(numBR(novo.valor) / (Number(novo.parcelas) || 1))}</button>
        <button class=${novo.modo === 'parcela' ? 'on' : ''} onClick=${() => setNovo({ ...novo, modo: 'parcela' })}>Valor da parcela: ${novo.parcelas}x de ${brl(numBR(novo.valor))} = ${brl(numBR(novo.valor) * (Number(novo.parcelas) || 1))}</button>
        <button class=${novo.modo === 'recorrente' ? 'on' : ''} onClick=${() => setNovo({ ...novo, modo: 'recorrente' })}>Recorrente: ${brl(numBR(novo.valor))} todo mês</button></div>`}
      <button class=${'btn btn-grande btn-block ' + (novo.tipo === 'pagar' ? 'btn-danger' : 'btn-verde')} onClick=${salvarNovo}>💾 Lançar</button>
    </div></div>`, document.body)}
  </div>`;
}
/* ---------- Financeiro (por OS / cliente) ---------- */
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function TelaFinanceiro({ sessao, toast }) {
  const [oss, setOss] = useState(null);
  const [edit, setEdit] = useState(null);
  const [mat, setMat] = useState({});
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setOss([])), []);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'compras'), s => { const m = {}; s.docs.forEach(d => { m[d.id] = (d.data().itens || []).filter(i => ['pedido', 'recebido'].includes(stCompra(i))).reduce((n, i) => n + numBR(i.valor), 0); }); setMat(m); }, () => {}), []);
  const cli = {}; (oss || []).forEach(o => { const k = norm((o.cliente?.nome || '—').split(/\s[-–]\s/)[0]); (cli[k] = cli[k] || { nome: (o.cliente?.nome || '—').split(/\s[-–]\s/)[0], oss: [] }).oss.push(o); });
  const fin = (o) => ({ ...(o.financeiro || {}), material: mat[o.id] || 0 });
  const tot = (l, k) => l.reduce((n, o) => n + (Number(fin(o)[k]) || 0), 0);
  const todas = oss || [];
  const vT = tot(todas, 'valor'), rT = tot(todas, 'recebido'), mT = tot(todas, 'material'), cT = tot(todas, 'custo') + mT;
  const salvar = async () => {
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', edit.id), { financeiro: { valor: Number(edit.valor) || 0, recebido: Number(edit.recebido) || 0, custo: Number(edit.custo) || 0, obs: edit.obs || '', atualizadoEm: nowIso(), por: sessao.nome } }); registrar(sessao, edit.id, '💰', 'Financeiro atualizado', 'Valor ' + brl(edit.valor) + ' · recebido ' + brl(edit.recebido)); setEdit(null); toast('Salvo.', 'ok'); }
    catch (e) { toast(e.message, 'erro'); }
  };
  return html`<div class="fade-up stack">
    <div class="page-head"><div><h2>💰 Financeiro</h2><div class="dim">Valor, recebido e custo por OS. Só o administrador vê esta tela.</div></div></div>
    <div class="mt-tiles">
      <div class="mt-t"><small>Valor dos contratos</small><b style=${{ fontSize: '18px' }}>${brl(vT)}</b></div>
      <div class="mt-t pos"><small>Recebido</small><b style=${{ fontSize: '18px' }}>${brl(rT)}</b></div>
      <div class="mt-t warn"><small>A receber</small><b style=${{ fontSize: '18px' }}>${brl(vT - rT)}</b></div>
      <div class="mt-t neg"><small>Material (compras)</small><b style=${{ fontSize: '18px' }}>${brl(mT)}</b></div>
      <div class="mt-t neg"><small>Custos totais</small><b style=${{ fontSize: '18px' }}>${brl(cT)}</b></div>
      <div class=${'mt-t ' + (vT - cT >= 0 ? 'pos' : 'neg')}><small>Margem</small><b style=${{ fontSize: '18px' }}>${brl(vT - cT)}</b><em>${vT ? Math.round((vT - cT) * 100 / vT) + '%' : '—'}</em></div>
    </div>
    ${oss === null ? html`<div class="card">Carregando…</div>` : Object.values(cli).sort((a, b) => a.nome.localeCompare(b.nome)).map(c => { const v = tot(c.oss, 'valor'), r = tot(c.oss, 'recebido'); return html`<div key=${c.nome} class="card page-card stack" style=${{ gap: '6px', borderLeft: '6px solid ' + corCliente(c.nome) }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><b>${c.nome}</b><span class="dim">${brl(r)} de ${brl(v)} · falta <b style=${{ color: v - r > 0 ? '#b45309' : '#15803d' }}>${brl(v - r)}</b></span></div>
      ${v > 0 && html`<div class="fin-barra"><i style=${{ width: Math.min(100, r * 100 / v) + '%', background: corCliente(c.nome) }}></i></div>`}
      ${c.oss.sort((a, b) => numOS(a).localeCompare(numOS(b))).map(o => html`<div key=${o.id} class="fl-i"><span style=${{ flex: 1 }}><b>${numOS(o)}</b> ${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</span>
        <small>${fin(o).valor ? brl(fin(o).valor) + ' · rec. ' + brl(fin(o).recebido) : 'sem valor'}${fin(o).material ? ' · material ' + brl(fin(o).material) : ''}${fin(o).valor && (fin(o).material || fin(o).custo) ? ' · margem ' + Math.round((fin(o).valor - fin(o).material - (Number(fin(o).custo) || 0)) * 100 / fin(o).valor) + '%' : ''}</small>
        <button class="btn btn-sm" onClick=${() => setEdit({ id: o.id, cod: numOS(o), valor: fin(o).valor || '', recebido: fin(o).recebido || '', custo: fin(o).custo || '', obs: fin(o).obs || '' })}>✏️</button></div>`)}
    </div>`; })}
    ${edit && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setEdit(null)}><div class="card modal-caixa stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">💰 OS ${edit.cod}</div><button class="x-btn" onClick=${() => setEdit(null)}>✕</button></div>
      ${[['valor', 'Valor do contrato (R$)'], ['recebido', 'Já recebido (R$)'], ['custo', 'Outros custos da OS — mão de obra, terceiros (R$). O material vem sozinho das Compras']].map(([k, t]) => html`<div key=${k} class="field"><span class="lbl">${t}</span><input class="inp" inputmode="decimal" value=${edit[k]} onInput=${e => setEdit({ ...edit, [k]: e.target.value.replace(',', '.') })} /></div>`)}
      <textarea class="inp" rows="2" placeholder="Observação (forma de pagamento, parcelas…)" value=${edit.obs} onInput=${e => setEdit({ ...edit, obs: e.target.value })}></textarea>
      <button class="btn btn-grande btn-verde btn-block" onClick=${salvar}>💾 Salvar</button>
    </div></div>`, document.body)}
  </div>`;
}
/* =========================================================
   Importar OSs antigas
   ========================================================= */
function TelaImportar({ sessao, catalogo, toast, abrirOS }) {
  const [fila, setFila] = useState([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  const ocupado = fila.some(f => f.rodando);

  const processar = async (files) => {
    const lista = [...files].map(f => ({ key: rand(6), file: f, nome: f.name, status: 'Na fila', rodando: true }));
    setFila(v => [...lista, ...v]);
    const upd = (key, patch) => setFila(v => v.map(x => x.key === key ? { ...x, ...patch } : x));
    // Um de cada vez, pra não sobrecarregar a IA.
    CTRL.reset();
    for (const item of lista) {
      if (CTRL.cancelado) { upd(item.key, { status: 'Cancelado por você.', erro: true, rodando: false, refazer: true }); continue; }
      try {
        await CTRL.ponto();
        upd(item.key, { status: 'Lendo arquivo…', erro: false });
        const { texto, imagens } = await extrairArquivo(item.file);
        upd(item.key, { status: 'Convertendo para o layout novo…' });
        const res = await chamarIA('importar_os', { texto, temImagens: imagens.length > 0, catalogo: resumoCatalogo(catalogo) }, imagens);
        upd(item.key, { status: 'Conferindo a numeração…' });
        const lista = await numerosUsados(sessao.empresaId);
        const anoAt = String(new Date().getFullYear()).slice(2);
        const cArq = lerCodigo(item.nome), cDoc = lerCodigo(res.numeroAntigo);
        const verArq = { t: '👁 Ver o arquivo enviado', fn: () => window.open(URL.createObjectURL(item.file), '_blank') };
        const digitar = { v: 'digitar', t: '✏️ Digitar outro número' };
        let fixo = cArq || cDoc;
        if (cArq && cDoc && codigoDe(cArq.ano, cArq.numero) !== codigoDe(cDoc.ano, cDoc.numero)) {
          const r = await escolher('Numeração diferente', `O nome do arquivo diz ${codigoDe(cArq.ano, cArq.numero)}, mas dentro da OS está ${codigoDe(cDoc.ano, cDoc.numero)}.\nArquivo: ${item.nome}`,
            [{ v: 'arq', t: 'Usar ' + codigoDe(cArq.ano, cArq.numero) + ' (nome do arquivo)', cls: 'btn-primary' }, { v: 'doc', t: 'Usar ' + codigoDe(cDoc.ano, cDoc.numero) + ' (dentro da OS)' }, digitar, { v: 'pular', t: 'Pular este arquivo' }], [verArq]);
          if (r === 'pular') { upd(item.key, { status: 'Pulado por você.', erro: true, rodando: false }); continue; }
          fixo = r === 'doc' ? cDoc : r === 'digitar' ? lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089')) : cArq;
          if (!fixo) { upd(item.key, { status: 'Número inválido — pulado.', erro: true, rodando: false }); continue; }
        }
        if (!fixo) {
          const prox = codigoDe(anoAt, proximoLivre(lista, anoAt));
          const r = await escolher('OS sem número', `Não achei o número da OS no arquivo nem dentro dele.\nArquivo: ${item.nome}`,
            [{ v: 'prox', t: 'Usar o próximo número livre: ' + prox, cls: 'btn-primary' }, { v: 'digitar', t: '✏️ Digitar o número' }, { v: 'pular', t: 'Pular este arquivo' }], [verArq]);
          if (r === 'pular') { upd(item.key, { status: 'Pulado por você.', erro: true, rodando: false }); continue; }
          if (r === 'digitar') { fixo = lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089')); if (!fixo) { upd(item.key, { status: 'Número inválido — pulado.', erro: true, rodando: false }); continue; } }
        }
        if (fixo) {
          const cod = codigoDe(fixo.ano, fixo.numero);
          let ja = lista.find(o => numOS(o) === cod);
          while (ja) {
            const prox = codigoDe(fixo.ano, proximoLivre(lista, fixo.ano));
            const r = await escolher('Número já existe', `A OS ${cod} já existe no app: ${ja.cliente?.nome || ''} — ${(ja.ambientes || []).map(a => a.nome).join(', ') || ja.ambienteResumo || ''}.\nArquivo enviado: ${item.nome} (${res.cliente?.nome || ''})`,
              [{ v: 'subst', t: 'Substituir a existente pela do arquivo', d: 'A antiga vai para o histórico de exclusões (dá para restaurar)', cls: 'btn-danger' },
               { v: 'prox', t: 'Criar com o próximo número livre: ' + prox },
               digitar, { v: 'pular', t: 'Pular este arquivo (manter a existente)' }],
              [verArq, { t: '👁 Ver a OS ' + cod + ' que já existe', fn: () => window.__abrirOS && window.__abrirOS(ja.id) }]);
            if (r === 'pular') { fixo = 'pular'; break; }
            if (r === 'subst') { await excluirOS(sessao, ja, 'Substituída pela importação do arquivo ' + item.nome); break; }
            if (r === 'prox') { fixo = null; break; }
            const novo = lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089'));
            if (!novo) continue;
            fixo = novo; const c2 = codigoDe(novo.ano, novo.numero); ja = lista.find(o => numOS(o) === c2);
          }
          if (fixo === 'pular') { upd(item.key, { status: 'Pulado — manteve a OS existente.', erro: true, rodando: false }); continue; }
        }
        const { id, numero } = await criarOS(sessao, res, {
          fixo: fixo || undefined,
          origem: 'importada', numeroAntigo: String(res.numeroAntigo || ''), dataAntiga: String(res.dataAntiga || ''), arquivoOrigem: item.nome,
        });
        upd(item.key, { status: `Importada como OS nº ${numOS(numero)}`, ok: true, osId: id, rodando: false });
      } catch (e) {
        upd(item.key, { status: e.message, erro: true, dupId: e.duplicada?.id, rodando: false, refazer: !e.duplicada });
      }
    }
    CTRL.reset();
  };
  const refazer = (f) => { setFila(v => v.filter(x => x.key !== f.key)); processar([f.file]); };

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Importar OSs antigas</h2><div class="dim">A IA lê a OS e monta no layout novo, <b>mantendo o número do arquivo</b> (ex: "26.089 Cliente.pdf"). Se o número já existir ou não bater, aparece um aviso para você escolher.</div></div>
      </div>
      <div class=${'drop-zone card' + (over ? ' over' : '')} style=${{ padding: '40px 16px' }}
        onClick=${() => !ocupado && inputRef.current.click()}
        onDragOver=${e => { e.preventDefault(); setOver(true); }} onDragLeave=${() => setOver(false)}
        onDrop=${e => { e.preventDefault(); setOver(false); if (!ocupado) processar(e.dataTransfer.files); }}>
        <div style=${{ fontSize: '34px' }}>🗂️</div>
        <div style=${{ fontWeight: 700, fontSize: '17px' }}>${ocupado ? 'Importando… aguarde terminar' : 'Arraste as OSs antigas aqui ou clique para escolher'}</div>
        <div class="dim">PDF, Word (.docx), Excel ou foto da folha. Pode mandar várias de uma vez.</div>
        ${ocupado && html`<div class="row" style=${{ gap: '8px', justifyContent: 'center', marginTop: '10px' }} onClick=${e => e.stopPropagation()}>
          <button class="btn btn-sm" onClick=${() => { CTRL.pausar(); setFila(v => [...v]); }}>${CTRL.pausado ? '▶ Continuar' : '⏸ Pausar'}</button>
          <button class="btn btn-sm btn-danger" onClick=${() => CTRL.cancelar()}>✖ Cancelar tudo</button></div>`}
        <input ref=${inputRef} type="file" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { processar(e.target.files); e.target.value = ''; }} />
      </div>
      <div class="list" style=${{ marginTop: '14px' }}>
        ${fila.map(f => html`
          <div key=${f.key} class="list-item" style=${{ cursor: f.osId ? 'pointer' : 'default' }} onClick=${() => f.osId && abrirOS(f.osId)}>
            <span style=${{ fontSize: '20px' }}>${f.ok ? '✅' : f.erro ? '⚠️' : '⏳'}</span>
            <div class="grow"><div class="title">${f.nome}</div><div class=${f.erro ? '' : 'dim'} style=${f.erro ? { color: 'var(--danger)', fontSize: '13px' } : null}>${f.status}</div></div>
            ${f.dupId && html`<button class="btn btn-sm" onClick=${e => { e.stopPropagation(); abrirOS(f.dupId); }}>Abrir a existente</button>`}
            ${f.refazer && !ocupado && html`<button class="btn btn-sm" onClick=${e => { e.stopPropagation(); refazer(f); }}>🔁 Tentar de novo</button>`}
            ${f.osId && html`<span class="chip chip-accent">Abrir</span>`}
          </div>`)}
      </div>
    </div>`;
}

/* =========================================================
   Catálogo
   ========================================================= */
function TelaCatalogo({ sessao, catalogo, toast }) {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('MDF');
  const [fab, setFab] = useState('');
  const [novo, setNovo] = useState({ tipo: 'MDF', fabricante: '', linha: '', nome: '' });
  const tipos = useMemo(() => [...new Set(catalogo.map(c => c.tipo))], [catalogo]);
  const fabs = useMemo(() => [...new Set(catalogo.filter(c => !tipo || c.tipo === tipo).map(c => c.fabricante).filter(Boolean))].sort(), [catalogo, tipo]);
  const lista = useMemo(() => {
    const t = norm(busca).split(' ').filter(Boolean);
    return catalogo.filter(c => (!tipo || c.tipo === tipo) && (!fab || c.fabricante === fab) && t.every(x => c._busca.includes(x)));
  }, [catalogo, busca, tipo, fab]);

  const adicionar = async () => {
    if (!novo.nome.trim()) return toast('Digite o nome do item.', 'erro');
    await salvarNoCatalogo(sessao.empresaId, catalogo, novo, sessao.nome);
    toast('Salvo no catálogo.', 'ok');
    setNovo(v => ({ ...v, nome: '' }));
  };
  const remover = async (it) => {
    await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'catalogo', it.id));
    toast('Removido do catálogo.');
  };

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Catálogo</h2><div class="dim">${catalogo.length} itens · base com as linhas atuais de Duratex, Arauco, Guararapes e Berneck, e ferragens Blum, Hettich, Häfele, Grass e FGV. Confira sempre no mostruário do fabricante.</div></div>
      </div>
      <div class="card stack" style=${{ marginBottom: '14px' }}>
        <div class="section-label">Adicionar item</div>
        <div style=${{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <select id="n-tipo" class="inp" value=${novo.tipo} onChange=${e => setNovo(v => ({ ...v, tipo: e.target.value }))}>
            ${[...new Set(['MDF', 'Ferragem', 'Puxador', 'Acessório', 'Iluminação', 'Vidro', ...tipos])].map(t => html`<option key=${t} value=${t}>${t}</option>`)}
          </select>
          <input id="n-fab" class="inp" placeholder="Fabricante" value=${novo.fabricante} onInput=${e => setNovo(v => ({ ...v, fabricante: e.target.value }))} />
          <input id="n-linha" class="inp" placeholder=${novo.tipo === 'Ferragem' ? 'Tipo (ex: Dobradiça)' : 'Linha / coleção'} value=${novo.linha} onInput=${e => setNovo(v => ({ ...v, linha: e.target.value }))} />
          <input id="n-nome" class="inp" placeholder="Nome / cor / modelo" value=${novo.nome} onInput=${e => setNovo(v => ({ ...v, nome: e.target.value }))} onKeyDown=${e => e.key === 'Enter' && adicionar()} />
          <button class="btn btn-primary" onClick=${adicionar}>Salvar</button>
        </div>
      </div>
      <div class="row" style=${{ marginBottom: '12px' }}>
        <input id="cat-busca" class="inp" style=${{ flex: '2 1 220px' }} placeholder="Buscar (ex: branco, blum tandem, gola preto)…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        <select id="cat-tipo" class="inp" style=${{ flex: '1 1 140px' }} value=${tipo} onChange=${e => { setTipo(e.target.value); setFab(''); }}>
          <option value="">Todos os tipos</option>
          ${tipos.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
        </select>
        <select id="cat-fab" class="inp" style=${{ flex: '1 1 140px' }} value=${fab} onChange=${e => setFab(e.target.value)}>
          <option value="">Todos os fabricantes</option>
          ${fabs.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
        </select>
      </div>
      <div class="table-wrap" style=${{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table class="tbl">
          <thead><tr><th>Nome</th><th>Fabricante</th><th>Linha / tipo</th><th>Categoria</th><th></th></tr></thead>
          <tbody>
            ${lista.slice(0, 400).map(it => html`<tr key=${it.id}>
              <td><b>${it.nome}</b></td><td>${it.fabricante}</td><td>${it.linha}</td>
              <td>${it.tipo}${it.daEmpresa ? html` <span class="chip chip-teal">da empresa</span>` : ''}</td>
              <td>${it.daEmpresa && html`<button class="x-btn" title="Remover" onClick=${() => remover(it)}>✕</button>`}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
      ${lista.length > 400 && html`<div class="dim" style=${{ marginTop: '6px' }}>Mostrando 400 de ${lista.length}. Refine a busca.</div>`}
    </div>`;
}

/* ---------- Manual em mapa mental ---------- */
// [título, como fazer, o que muda, [abas impactadas]]
const MAPA = {
  inicio: [['Resumo do dia', 'Abra o app — ele sempre começa aqui. Toque num item para ir direto à OS ou tela.', 'Nada é alterado; é só leitura.', ['quadro', 'cronograma']], ['Atualizar / Novidades', 'Toque ⟳ Atualizar no topo. Quando tiver versão nova aparece 🔄 e a janela "O que mudou".', 'Recarrega o app com a versão mais nova.', []]],
  quadro: [
    ['Barra de conclusão %', 'Veja no cartão de cada cliente e em cada OS. Toque no cliente para abrir as OS dele.', 'O % sobe sozinho quando: muda a etapa da OS (40%), conclui etapas da fábrica (40%) e parceiros chegam (20%).', ['os', 'cronograma']],
    ['Agora em andamento', 'Abra o bloco ⚡ no topo. Alterne "Por OS" / "Por quem".', 'Só mostra. Alimentado pelo cronograma de hoje, parceiros "mandado fazer", etapas da fábrica e peças terceirizadas.', ['cronograma', 'pedidos']],
    ['Previsão de finalização', 'Toque em 🔮 Previsão. Veja por cliente ou por OS.', 'Calcula a data provável (cronograma + compras + parceiros +2 dias úteis) e compara com o prazo de entrega: 🟢🟡🟠🔴.', ['cronograma', 'compras', 'os']],
    ['Parceiros da OS', 'Toque no chip (Vidros, Serralheria…) → escolha a etapa, quem faz e a previsão. ＋ parceiro adiciona.', 'Muda o status do parceiro, entra na barra % e na Previsão. Fica na linha do tempo da OS.', ['os']],
    ['Diário de obra', 'Toque 📓 Diário no cartão → escolha o tipo → fale/foto → Salvar.', 'Cria pendência/registro; o número de pendências aparece no cartão.', ['os']],
    ['Juntar clientes parecidos', 'No aviso vermelho, toque "Juntar como…".', 'Troca o nome do cliente em todas as OS e tarefas.', ['os', 'cronograma']],
  ],
  clientes: [['Novo cliente', '＋ Novo cliente → preencha nome, telefone, e-mail, CPF/CNPJ, endereço, obra, arquiteto → Salvar.', 'Cria o cadastro e atualiza os dados em todas as OS do cliente.', ['os', 'quadro']], ['Cadastrar pelo contrato', '📑 Cadastrar pelo contrato → envie o arquivo → confira → Salvar.', 'A IA lê os dados do cliente do contrato.', ['os']], ['Editar cliente', 'Toque no cartão → corrija → Salvar.', 'Repassa para todas as OS (nome, telefone, endereço, obra, arquiteto) e sai na folha de impressão.', ['os', 'cronograma']]],
  contratos: [['Enviar contrato', 'Toque para enviar o PDF/Word. A IA lê cliente, ambientes, valores e prazo.', 'Guarda o contrato e os dados do cliente.', ['os', 'financeiro']], ['Gerar OS do contrato', 'Após ler, gere as OS por ambiente. Se o número existir, escolha uma opção no aviso.', 'Cria OS novas com número, prazo e valor.', ['os', 'quadro', 'financeiro']]],
  projetos: [['Novo projeto', 'Cadastre o cliente e anexe contrato, detalhamentos e imagens.', 'Cria o projeto do cliente.', ['contratos']], ['Ata com microfone', 'Na reunião toque 🎤. A IA escreve a ata por ambiente e ignora conversas paralelas.', 'Salva a ata no projeto.', []], ['Gerar OS automática', 'Toque "Gerar OS automática" e revise.', 'Cria a OS preenchida (MDF, fitas, ferragens).', ['os', 'quadro']]],
  amostras: [['Emprestar amostra', '📤 Emprestar → item, quem levou, contato, até quando.', 'Entra em "Fora com alguém"; se passar da data fica vermelho.', ['os']], ['Cliente deixou algo', '📥 Cliente deixou algo → o quê, de quem, até quando devolver.', 'Entra em "Do cliente, com a gente".', ['os']], ['Devolver', 'Marque o quadradinho. Desfazer pede motivo.', 'Vai para Devolvidas e registra na OS.', ['os']]],
  importar: [['Importar OS antiga', 'Arraste vários arquivos (PDF, Word, Excel, foto).', 'Cria OS no layout novo com o número do arquivo.', ['os', 'quadro']], ['Pausar / cancelar', 'Na barra de transferência: ⏸ ▶ ✖. 🔁 Tentar de novo no arquivo com erro.', 'Pausa ou interrompe a fila.', []], ['Número repetido', 'Escolha no aviso: substituir, próximo livre, digitar ou pular.', 'Substituir manda a antiga para o histórico (restaurável).', ['excluir']]],
  os: [
    ['Abrir a OS', 'Toque na OS em qualquer lugar. Abas: Temas, Compras, Notas & financeiro, Diário, Amostras, Folha, Calendário.', 'Só abre para ver.', []],
    ['Editar OS', '✏️ Editar OS. Se já estiver revisada, pede motivo.', 'Altera a OS; fica na linha do tempo.', ['quadro']],
    ['Nome do cliente', '✏️ ao lado do nome → corrija → "todas as OS" ou "só esta".', 'Troca o nome e registra.', ['quadro', 'cronograma']],
    ['Enviar ao cronograma', '📅 Enviar → cronograma → 👷 Internos ou 🤝 Terceirizados → pessoa → início e prazo final → Salvar.', 'Cria a tarefa; o botão vira "Ver no cronograma".', ['cronograma', 'quadro']],
    ['Folha de compras', '🛒 Compras → marque comprar/estoque, fornecedor, prazo e ✓ recebido. Levante do detalhamento/Dinabox/contrato.', 'Atualiza status das compras, a Previsão e o material da OS.', ['compras', 'quadro', 'financeiro']],
    ['Lançar nota fiscal', '🧾 Notas & financeiro → Lançar nota → confira itens → forma de pagamento e vezes → Lançar.', 'Itens viram "recebido", preços atualizam, cria contas a pagar (parcelas).', ['compras', 'contas', 'financeiro']],
    ['Diário de obra', '📓 Diário → tipo → fale/foto → Salvar. ✓ resolve pendência.', 'Registra na OS e conta pendências.', ['quadro']],
  ],
  cronograma: [
    ['Nova tarefa', 'Escolha OS, quem executa, início e prazo final.', 'Bloqueia sobreposição, tarefa repetida e a mesma OS em dois lugares.', ['quadro', 'os']],
    ['Concluir', '✓ Concluir (só no prazo final). Se terminou antes, escolha: adiantar próximas tarefas ou ajudar OS atrasada.', 'Registra o resultado do prazo; os dias que sobraram podem abater atrasos.', ['quadro', 'os']],
    ['Mais dias', '＋ Mais dias → quantos → motivo.', 'Empurra as tarefas seguintes da pessoa e mostra o alerta de cliente em atraso.', ['quadro', 'os']],
    ['Mudar / excluir', 'Abra a tarefa → mude pessoa/data ou exclua → motivo.', 'Atualiza a agenda e a linha do tempo.', ['quadro']],
    ['Categorias e métricas', '✏️ Categorias (admin). Veja o mês colorido e as métricas de dias ganhos/perdidos.', 'Organiza os grupos do cronograma.', []],
  ],
  pedidos: [['Novo pedido', 'Tipo (interno, terceirizado, compra), item, medidas, cor, fita, prazo, foto.', 'Cria o pedido ligado à OS.', ['quadro', 'os']], ['Andamento', 'Avance: solicitado → produção → pronto → entregue.', 'Aparece no "Agora em andamento".', ['quadro']]],
  catalogo: [['Buscar / cadastrar', 'Busque por fabricante/linha/nome ou cadastre novo.', 'Fica disponível nas OS.', ['os']]],
  excluir: [['Excluir OSs', 'Selecione (ou todas) → senha.', 'Vão para o histórico; podem ser restauradas.', ['os', 'quadro']], ['Limpar histórico', '🧹 Limpar histórico permanentemente.', 'Apaga para sempre. Não tem volta.', []]],
  compras: [['Lançar nota', '🧾 Notas → envie a nota. Confira o fornecedor (quem vendeu).', 'Cadastra parceiro, preços e categorias.', ['os', 'contas']], ['Parceiros', 'Edite nome, CNPJ, unidades.', 'Usado nas OS e no cronograma (terceirizados).', ['os', 'cronograma']], ['Preços', 'Veja por categoria; 🏆 = melhor.', 'Só consulta.', []]],
  equipe: [['Novo acesso', 'Nome, login, senha, grupo.', 'A pessoa passa a entrar no app.', ['cronograma']], ['Grupos e permissões', 'Escolha o grupo → marque as telas → 💾 Salvar.', 'Na hora esconde/mostra telas para quem é do grupo.', []], ['Personalizar pessoa', '⚙ Personalizar → marque → Salvar só pra ela.', 'Ela deixa de seguir o grupo.', []]],
  financeiro: [['Resultado por OS', 'Veja contrato − material − custos.', 'Só consulta; muda quando entram notas e contas.', ['os', 'contas']]],
  contas: [['Nova conta', '＋ A pagar / ＋ A receber → valor, vencimento, forma, conta, parcelas.', 'Cria as parcelas; mostra "X de N pagas" e quanto falta.', ['financeiro']], ['Pagar / receber', 'Marque a parcela como paga/recebida.', 'Atualiza os totais.', ['financeiro']]],
  config: [['Etapas e logo', 'Edite etapas da OS/fábrica e envie a logo.', 'Muda as etapas em todo o app e a logo nas impressões.', ['os', 'quadro']]],
};
const NOMES_ABA = { inicio: '⌂ Início', sugestoes: '💡 Sugestões & anotações', quadro: '📊 Quadro geral', clientes: '👤 Clientes', contratos: '📑 Contratos', projetos: '✨ Reuniões & Projetos', amostras: '📦 Amostras', importar: '🗂️ Importar', os: '📋 Ordens de Serviço', cronograma: '📅 Cronograma', pedidos: '🪵 Peças extras', catalogo: '🎨 Catálogo', excluir: '🗑 Excluir OSs', compras: '🛒 Compras', equipe: '👥 Equipe', financeiro: '💰 Resultado por OS', contas: '📒 Contas', config: '⚙ Configurações' };
const MANUAL = Object.fromEntries(Object.keys(MAPA).map(k => [k, [NOMES_ABA[k], '', MAPA[k].map(f => [f[0], f[1]])]]));
function ManualAba({ aba }) {
  const l = MAPA[aba]; if (!l) return null;
  return html`<div class="man-sec"><div class="man-t">${NOMES_ABA[aba]}</div>${l.map(f => html`<div key=${f[0]} class="man-i"><b>${f[0]}</b><span>${f[1]}<br/><small class="dim">➜ ${f[2]}</small></span></div>`)}</div>`;
}
function LembreteAssistente() {
  return html`<div class="man-lembrete"><span>🤖</span><div><b>Ficou com dúvida? Pergunte ao assistente.</b><small>Toque no botão do assistente (canto da tela) e pergunte do seu jeito — ex.: "como lanço uma nota?", "onde vejo o atraso da Silmara?". Ele também abre telas e faz alterações para você.</small></div></div>`;
}
function TelaManual({ abas, irPara }) {
  const [sec, setSec] = useState(null), [aba, setAba] = useState(null), [fn, setFn] = useState(null);
  const vis = (k) => abas.some(a => a.v === k);
  const secs = SECOES.map(([k, t, cor, vs]) => [k, t, cor, vs.filter(v => MAPA[v] && vis(v))]).filter(s => s[3].length);
  const ir = (a, f = null) => { const s = secs.find(x => x[3].includes(a)); if (s) setSec(s[0]); setAba(a); setFn(f); };
  const S = secs.find(s => s[0] === sec), F_ = aba && fn !== null ? MAPA[aba][fn] : null;
  return html`<div class="fade-up stack"><div class="page-head"><div><h2>🧠 Mapa do Gestão Pró</h2><div class="dim">Toque nos balões: seção → tela → função. Veja como fazer, o que muda e onde impacta.</div></div></div>
    <div class="mm">
      <div class="mm-nivel"><button class=${'mm-no mm-raiz' + (!sec ? ' ativo' : '')} onClick=${() => { setSec(null); setAba(null); setFn(null); }}>🏢 Gestão Pró</button></div>
      <div class="mm-nivel">${secs.map(([k, t, cor], i) => html`<button key=${k} class=${'mm-no' + (sec === k ? ' ativo' : '') + (sec && sec !== k ? ' apagado' : '')} style=${{ '--c': cor, animationDelay: i * 60 + 'ms' }} onClick=${() => { setSec(k); setAba(null); setFn(null); }}>${t}</button>`)}</div>
      ${S && html`<div class="mm-nivel" key=${'a' + sec}>${S[3].map((a, i) => html`<button key=${a} class=${'mm-no' + (aba === a ? ' ativo' : '') + (aba && aba !== a ? ' apagado' : '')} style=${{ '--c': S[2], animationDelay: i * 60 + 'ms' }} onClick=${() => { setAba(a); setFn(null); }}>${NOMES_ABA[a]} <small>${MAPA[a].length}</small></button>`)}</div>`}
      ${aba && html`<div class="mm-nivel" key=${'f' + aba}>${MAPA[aba].map((f, i) => html`<button key=${f[0]} class=${'mm-no mm-fn' + (fn === i ? ' ativo' : '') + (fn !== null && fn !== i ? ' apagado' : '')} style=${{ '--c': S ? S[2] : '#64748b', animationDelay: i * 50 + 'ms' }} onClick=${() => { setFn(i); setTimeout(() => document.getElementById('mmf-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); }}>${f[0]}</button>`)}</div>`}
      ${aba ? html`<div class="mm-lista" key=${'l' + aba}>${MAPA[aba].map((f, i) => html`<div key=${f[0]} id=${'mmf-' + i} class=${'mm-card' + (fn === i ? ' foco' : '')} style=${{ '--c': S ? S[2] : '#64748b', animationDelay: i * 70 + 'ms' }}>
        <div class="mm-card-t">${f[0]} <small>· ${NOMES_ABA[aba]}</small></div>
        <div class="mm-bloco"><span>👉 Como fazer</span><p>${f[1]}</p></div>
        <div class="mm-bloco"><span>🔄 O que muda</span><p>${f[2]}</p></div>
        <div class="mm-bloco"><span>🔗 Onde impacta</span><div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}>${f[3].filter(vis).length ? f[3].filter(vis).map(x => html`<button key=${x} class="mm-link" onClick=${() => ir(x)}>${NOMES_ABA[x]} →</button>`) : html`<small class="dim">Só nesta tela.</small>`}</div></div>
      </div>`)}<button class="btn btn-primary" style=${{ alignSelf: 'center' }} onClick=${() => irPara(aba)}>🚀 Ir para ${NOMES_ABA[aba]}</button></div>`
      : S ? html`<div class="mm-lista" key=${'s' + sec}>${S[3].map((a, i) => html`<div key=${a} class="mm-card" style=${{ '--c': S[2], animationDelay: i * 70 + 'ms' }}>
        <div class="mm-card-t" style=${{ cursor: 'pointer' }} onClick=${() => { setAba(a); setFn(null); }}>${NOMES_ABA[a]} <small>· toque para detalhar</small></div>
        <ul class="mm-ul">${MAPA[a].map(f => html`<li key=${f[0]}><b>${f[0]}:</b> ${f[1]}</li>`)}</ul></div>`)}</div>`
      : html`<div class="mm-lista">${secs.map(([k, t, cor, vs], i) => html`<div key=${k} class="mm-card" style=${{ '--c': cor, animationDelay: i * 70 + 'ms' }}>
        <div class="mm-card-t" style=${{ cursor: 'pointer' }} onClick=${() => setSec(k)}>${t}</div>
        <ul class="mm-ul">${vs.map(a => html`<li key=${a}><b>${NOMES_ABA[a]}:</b> ${MAPA[a].map(f => f[0]).join(' · ')}</li>`)}</ul></div>`)}</div>`}
    </div>
  </div>`;
}

/* ---------- Cadastro de clientes (manual ou pelo contrato) → repassa para todas as OS ---------- */
const CAMPOS_CLI = [['nome', 'Nome do cliente'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['documento', 'CPF / CNPJ'], ['endereco', 'Endereço do cliente'], ['enderecoMontagem', 'Endereço de montagem'], ['obra', 'Obra / local'], ['arquiteto', 'Arquiteto / designer'], ['obs', 'Observações']];
async function aplicarClienteNasOS(sessao, c, nomeAntigo) {
  const { getDocs, writeBatch } = F().fsMod; const E = sessao.empresaId;
  const oss = (await getDocs(col('empresas', E, 'os'))).docs.map(d => ({ id: d.id, ...d.data() }));
  const alvo = oss.filter(o => [norm(baseCli(nomeAntigo || c.nome)), norm(c.nome)].includes(norm(baseCli(o.cliente?.nome))));
  const b = writeBatch(F().db);
  alvo.forEach(o => { const nm = String(o.cliente?.nome || ''); const suf = nm.slice(baseCli(nm).length);
    b.update(docRef('empresas', E, 'os', o.id), { cliente: { ...(o.cliente || {}), nome: c.nome + suf, telefone: c.telefone || o.cliente?.telefone || '', endereco: c.endereco || o.cliente?.endereco || '', enderecoMontagem: c.enderecoMontagem || o.cliente?.enderecoMontagem || '', obra: c.obra || o.cliente?.obra || '', email: c.email || o.cliente?.email || '' }, ...(c.arquiteto ? { arquiteto: c.arquiteto } : {}), clienteId: c.id || '', atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); });
  if (alvo.length) await b.commit();
  alvo.forEach(o => registrar(sessao, o.id, '👤', 'Dados do cliente atualizados pelo cadastro', c.nome));
  return alvo.length;
}
function ConcluirMassa({ sessao, oss, fechar }) {
  const [sel, setSel] = useState([]), [q, setQ] = useState(''), [senha, setSenha] = useState(false), [msg, setMsg] = useState('');
  const fim = STATUS_OS[STATUS_OS.length - 1];
  const g = {}; (oss || []).filter(o => !osConcluida(o)).forEach(o => { const k = nomePadrao(baseCli(o.cliente?.nome) || o.cliente?.nome || 'Sem cliente'); (g[k] = g[k] || []).push(o); });
  const nomes = Object.keys(g).filter(n => !q || norm(n).includes(norm(q))).sort();
  const tog = (n) => setSel(v => v.includes(n) ? v.filter(x => x !== n) : [...v, n]);
  const total = sel.reduce((t, n) => t + (g[n] || []).length, 0);
  const executar = async (motivo) => { const lista = sel.flatMap(n => g[n] || []); const { writeBatch } = F().fsMod;
    for (let i = 0; i < lista.length; i += 400) { const b = writeBatch(F().db); lista.slice(i, i + 400).forEach(o => b.update(docRef('empresas', sessao.empresaId, 'os', o.id), { status: fim.v, statusHist: [...(o.statusHist || []), { st: fim.v, em: nowIso(), quem: sessao.nome, motivo }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome })); await b.commit(); }
    lista.forEach(o => registrar(sessao, o.id, '✅', 'Concluída em massa', motivo)); setMsg('✓ ' + lista.length + ' OS concluídas.'); setSel([]); };
  if (senha) return html`<${SenhaMotivo} titulo=${'Concluir ' + total + ' OS de ' + sel.length + ' cliente(s)'} texto=${'Todas as OSs desses clientes vão para "' + fim.t.replace(/^\d+\. /, '') + '" e saem da tela de produção.'} botao="Concluir" onOk=${executar} fechar=${() => setSenha(false)} />`;
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">✅ Concluir clientes em massa</div><button class="x-btn" onClick=${fechar}>✕</button></div>
    ${msg && html`<div class="ok-box">${msg}</div>`}
    <input class="inp" placeholder="🔍 Buscar cliente" value=${q} onInput=${e => setQ(e.target.value)} />
    <div class="os-picker-lista" style=${{ maxHeight: '45vh', overflow: 'auto' }}>${!nomes.length ? html`<div class="vazio dim">Nenhum cliente com OS em aberto.</div>` : nomes.map(n => html`<label key=${n} class="row" style=${{ gap: '8px', padding: '7px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}><input type="checkbox" checked=${sel.includes(n)} onChange=${() => tog(n)} /><b style=${{ flex: 1 }}>${n}</b><small class="dim">${g[n].length} OS em aberto</small></label>`)}</div>
    <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setSel(nomes)}>Marcar todos</button><button class="btn" onClick=${() => setSel([])}>Limpar</button>
      <button class="btn btn-verde" style=${{ flex: 1 }} disabled=${!sel.length} onClick=${() => setSenha(true)}>✅ Concluir ${sel.length} cliente(s) · ${total} OS</button></div>
  </div></div>`, document.body);
}
function TelaClientes({ sessao, toast, catalogo }) {
  const [lista, setLista] = useState(null), [oss, setOss] = useState([]), [ed, setEd] = useState(null), [q, setQ] = useState(''), [lendo, setLendo] = useState('');
  const E = sessao.empresaId; const inp = useRef(null);
  useEffect(() => { const a = F().fsMod.onSnapshot(col('empresas', E, 'clientes'), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = F().fsMod.onSnapshot(col('empresas', E, 'os'), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}); return () => { a(); b(); }; }, []);
  const osDe = (nome) => oss.filter(o => norm(baseCli(o.cliente?.nome)) === norm(nome));
  const semCad = [...new Set(oss.map(o => baseCli(o.cliente?.nome)).filter(Boolean))].filter(n => !(lista || []).some(c => norm(c.nome) === norm(n)));
  const salvar = async () => {
    const c = { ...ed }; if (!c.nome?.trim()) return toast('Digite o nome do cliente.'); c.nome = nomePadrao(c.nome); if (c.arquiteto) c.arquiteto = nomePadrao(c.arquiteto);
    try { const { id, _antigo, ...dados } = c; const ref = id ? docRef('empresas', E, 'clientes', id) : F().fsMod.doc(col('empresas', E, 'clientes'));
      await F().fsMod.setDoc(ref, { ...dados, atualizadoEm: nowIso(), por: sessao.nome }, { merge: true });
      const n = await aplicarClienteNasOS(sessao, { ...c, id: ref.id }, _antigo); toast('Cliente salvo' + (n ? ' e atualizado em ' + n + ' OS.' : '.'), 'ok'); setEd(null); }
    catch (e) { toast(e.message, 'erro'); }
  };
  const doContrato = async (file) => {
    if (!file) return; setLendo('Lendo contrato…');
    try { const { texto, imagens } = await extrairArquivo(file); const r = await chamarIA('contrato_os', { texto, temImagens: imagens.length > 0, os: {}, catalogo: [] }, imagens);
      const cl = r.cliente || {}; const ex = (lista || []).find(c => norm(c.nome) === norm(baseCli(cl.nome)) || cliParecido(c.nome, cl.nome));
      setEd({ ...(ex || {}), nome: ex?.nome || nomePadrao(baseCli(cl.nome)) || '', telefone: cl.telefone || ex?.telefone || '', endereco: cl.endereco || ex?.endereco || '', enderecoMontagem: cl.enderecoMontagem || ex?.enderecoMontagem || '', obra: cl.obra || ex?.obra || '', arquiteto: r.arquiteto || ex?.arquiteto || '', _antigo: ex?.nome || '' });
      toast('Confira os dados lidos do contrato e salve.', 'ok');
    } catch (e) { toast('Não li o contrato: ' + e.message, 'erro'); }
    setLendo('');
  };
  const vis = (lista || []).filter(c => !q || norm(JSON.stringify(c)).includes(norm(q))).sort((a, b) => a.nome.localeCompare(b.nome));
  const [pg, setPg] = useState(null);
  const [massa, setMassa] = useState(false);
  return html`<div class="fade-up stack">
    <div class="page-head"><div><h2>👤 Clientes</h2><div class="dim">Cadastre uma vez — os dados vão para todas as OS do cliente (e saem na folha de impressão).</div></div></div>
    ${pg && html`<${PaginaCliente} sessao=${sessao} c=${pg} oss=${osDe(pg.nome)} toast=${toast} fechar=${() => setPg(null)} editar=${() => { setEd({ ...pg, _antigo: pg.nome }); setPg(null); }} />`}
    ${massa && html`<${ConcluirMassa} sessao=${sessao} oss=${oss} fechar=${() => setMassa(false)} />`}
    <div class="cli-acoes">
      <button class="cli-acao" onClick=${() => setEd({ nome: '' })}><span>✍️</span><b>Cadastrar digitando</b><small>Nome, telefone, endereço, obra…</small></button>
      <button class="cli-acao" onClick=${() => setMassa(true)}><span>✅</span><b>Concluir clientes em massa</b><small>Marque os clientes e conclua todas as OSs deles</small></button>
      <button class="cli-acao" disabled=${!!lendo} onClick=${() => inp.current?.click()}><span>📑</span><b>${lendo || 'Cadastrar pelo contrato'}</b><small>A IA lê o contrato e preenche</small></button>
      <button class="cli-acao" onClick=${() => window.__irPara && window.__irPara('projetos')}><span>✨</span><b>Nova reunião / projeto</b><small>Ata com microfone e OS automática</small></button>
    </div>
    <input ref=${inp} type="file" hidden accept=".pdf,.doc,.docx,image/*" onChange=${e => { doContrato(e.target.files[0]); e.target.value = ''; }} />
    ${semCad.length > 0 && html`<div class="card warn-box"><b>${semCad.length} cliente(s) das OS ainda sem cadastro:</b><div class="row" style=${{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>${semCad.map(n => { const o = osDe(n)[0]; return html`<button key=${n} class="pill" onClick=${() => setEd({ nome: n, telefone: o?.cliente?.telefone || '', endereco: o?.cliente?.endereco || '', obra: o?.cliente?.obra || '', arquiteto: o?.arquiteto || '', _antigo: n })}>＋ ${n}</button>`; })}</div></div>`}
    <input class="inp" placeholder="🔍 Buscar cliente" value=${q} onInput=${e => setQ(e.target.value)} />
    ${lista === null ? html`<div class="dim">Carregando…</div>` : !vis.length ? html`<div class="vazio dim">Nenhum cliente cadastrado.</div>` : html`<div class="cli-grade">${vis.map(c => { const os = osDe(c.nome); return html`<div key=${c.id} class="card cli-card" style=${{ '--cc': corCliente(c.nome) }} onClick=${() => setPg(c)}>
      <b>${c.nome}</b><small>${[c.telefone, c.obra || c.endereco, c.arquiteto ? 'Arq. ' + c.arquiteto : ''].filter(Boolean).join(' · ') || 'sem dados'}</small><span class="chip">${os.length} OS</span></div>`; })}</div>`}
    ${ed && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setEd(null)}><div class="card modal-caixa stack" style=${{ width: 'min(620px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">👤 ${ed.id ? 'Editar cliente' : 'Novo cliente'}</div><button class="x-btn" onClick=${() => setEd(null)}>✕</button></div>
      <div class="grid2">${CAMPOS_CLI.map(([k, t]) => html`<div key=${k} class="field" style=${['obs', 'endereco', 'enderecoMontagem'].includes(k) ? { gridColumn: '1/-1' } : null}><span class="lbl">${t}</span><input class="inp" value=${ed[k] || ''} onInput=${e => setEd({ ...ed, [k]: e.target.value })} onBlur=${e => ['nome', 'arquiteto', 'obra'].includes(k) && setEd(x => ({ ...x, [k]: nomePadrao(e.target.value) }))} /></div>`)}</div>
      <small class="dim">Ao salvar, nome, telefone, endereço, obra e arquiteto são atualizados em ${osDe(ed._antigo || ed.nome).length} OS deste cliente.</small>
      <button class="btn btn-primary btn-block btn-anim" onClick=${salvar}>💾 Salvar e atualizar as OS</button></div></div>`, document.body)}
  </div>`;
}

/* ---------- Grupos e permissões ---------- */
function EditorAcessos({ sessao, usuarios, toast }) {
  const [grupos, setGrupos] = useState(() => PAPEIS.map(g => ({ ...g, abas: [...g.abas] })));
  const [sel, setSel] = useState(grupos[1]?.v || 'admin');
  const [sujo, setSujo] = useState(false);
  const [pessoa, setPessoa] = useState(null);
  const g = grupos.find(x => x.v === sel) || grupos[0];
  const alt = (fn) => { setGrupos(v => v.map(x => x.v === sel ? fn({ ...x, abas: [...x.abas] }) : x)); setSujo(true); };
  const tog = (t) => alt(x => ({ ...x, abas: x.abas.includes(t) ? x.abas.filter(a => a !== t) : [...x.abas, t] }));
  const salvar = async () => {
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { gruposAcesso: grupos.filter(x => x.v !== 'admin').map(({ v, t, abas }) => ({ v, t, abas })) }); setSujo(false); toast('Acessos salvos.', 'ok'); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const novo = async () => { const t = await pedirTexto('Novo grupo', 'Ex: Acabamento, Entregas…'); if (!t) return; const v = norm(t).replace(/[^a-z0-9]+/g, '-') + '-' + rand(3); setGrupos(x => [...x, { v, t: t.trim(), abas: ['inicio'] }]); setSel(v); setSujo(true); };
  const renomear = async () => { const t = await pedirTexto('Nome do grupo', g.t); if (t) alt(x => ({ ...x, t: t.trim() })); };
  const apagar = () => { if (usuarios.some(u => u.papel === g.v)) return toast('Tem gente nesse grupo. Mude as pessoas de grupo antes.', 'erro'); setGrupos(v => v.filter(x => x.v !== g.v)); setSel('admin'); setSujo(true); };
  const mudarGrupo = async (u, papel) => {
    try { await F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'usuarios', u.uid), { papel }, { merge: true }); await F().fsMod.setDoc(docRef('usuarios_index', u.uid), { papel }, { merge: true }); toast(u.nome + ' agora é ' + (PAPEIS.find(p => p.v === papel)?.t || papel) + '.', 'ok'); }
    catch (e) { toast('Não mudou: ' + e.message, 'erro'); }
  };
  const salvarPessoa = async (u, abas) => {
    try { await F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'usuarios', u.uid), { abas: abas === null ? F().fsMod.deleteField() : abas }, { merge: true }); toast(abas === null ? 'Voltou a seguir o grupo.' : 'Acesso de ' + u.nome + ' salvo.', 'ok'); setPessoa(null); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const Grade = ({ lista, onTog, trava }) => html`<div class="acs-grade">${TELAS_ACESSO.map(([sec, telas]) => html`<div key=${sec} class="acs-sec"><div class="acs-tit">${sec}</div>
    ${telas.map(([v, t]) => html`<label key=${v} class=${'acs-chk' + (lista.includes(v) ? ' on' : '')}><input type="checkbox" disabled=${trava} checked=${lista.includes(v)} onChange=${() => onTog(v)} /> ${t}</label>`)}</div>`)}</div>`;
  return html`<div class="card stack" style=${{ marginBottom: '14px' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="section-label">🔐 Grupos e permissões — quem vê o quê</div>
      <button class=${'btn btn-sm ' + (sujo ? 'btn-primary' : '')} disabled=${!sujo} onClick=${salvar}>💾 Salvar acessos</button></div>
    <div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}>
      ${grupos.map(x => html`<button key=${x.v} class=${'grupo-b' + (x.v === sel ? ' on' : '')} onClick=${() => setSel(x.v)}>${x.t} <small>(${usuarios.filter(u => u.papel === x.v).length})</small></button>`)}
      <button class="grupo-b grupo-edit" onClick=${novo}>＋ Novo grupo</button>
    </div>
    ${g.v === 'admin' ? html`<div class="dim">O Administrador vê tudo, sempre.</div>` : html`<div class="row" style=${{ gap: '6px' }}>
      <button class="btn btn-sm" onClick=${() => alt(x => ({ ...x, abas: [...TODAS_TELAS] }))}>Marcar tudo</button>
      <button class="btn btn-sm" onClick=${() => alt(x => ({ ...x, abas: ['inicio'] }))}>Desmarcar tudo</button>
      <button class="btn btn-sm btn-ghost" onClick=${renomear}>✏️ Renomear</button>
      <button class="btn btn-sm btn-ghost" onClick=${apagar}>🗑 Apagar grupo</button></div>`}
    <${Grade} lista=${g.abas} onTog=${tog} trava=${g.v === 'admin'} />
    <div class="section-label" style=${{ marginTop: '6px' }}>Pessoas</div>
    <div class="list">${usuarios.map(u => html`<div key=${u.uid} class="list-item" style=${{ cursor: 'default', flexWrap: 'wrap' }}>
      <div class="grow"><div class="title">${u.nome}</div><div class="dim">${Array.isArray(u.abas) ? '⚙ acesso personalizado' : 'segue o grupo'}</div></div>
      <select class="inp" style=${{ width: 'auto' }} disabled=${u.uid === sessao.uid} value=${u.papel} onChange=${e => mudarGrupo(u, e.target.value)}>${PAPEIS.map(p => html`<option key=${p.v} value=${p.v}>${p.t}</option>`)}</select>
      ${u.papel !== 'admin' && html`<button class="btn btn-sm" onClick=${() => setPessoa({ u, abas: Array.isArray(u.abas) ? [...u.abas] : [...(PAPEIS.find(p => p.v === u.papel)?.abas || [])] })}>⚙ Personalizar</button>`}
      ${pessoa?.u.uid === u.uid && html`<div style=${{ flexBasis: '100%' }} class="stack">
        <${Grade} lista=${pessoa.abas} onTog=${v => setPessoa(x => ({ ...x, abas: x.abas.includes(v) ? x.abas.filter(a => a !== v) : [...x.abas, v] }))} />
        <div class="row" style=${{ gap: '6px' }}><button class="btn btn-sm btn-primary" onClick=${() => salvarPessoa(u, pessoa.abas)}>💾 Salvar só pra ${u.nome.split(' ')[0]}</button>
          ${Array.isArray(u.abas) && html`<button class="btn btn-sm" onClick=${() => salvarPessoa(u, null)}>↩ Voltar a seguir o grupo</button>`}
          <button class="btn btn-sm btn-ghost" onClick=${() => setPessoa(null)}>Fechar</button></div></div>`}
    </div>`)}</div>
  </div>`;
}

/* =========================================================
   Equipe (administrador)
   ========================================================= */
function TelaEquipe({ sessao, toast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [f, setF] = useState({ nome: '', login: '', senha: '', papel: 'projetista' });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [remover, setRemover] = useState(null);

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas', sessao.empresaId, 'usuarios'), s => setUsuarios(s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo !== false)));
  }, [sessao.empresaId]);

  const adicionar = async (e) => {
    e.preventDefault(); setErro('');
    if (!f.nome.trim()) return setErro('Informe o nome.');
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(f.login.trim())) return setErro('Login com pelo menos 3 letras ou números, sem espaços.');
    if (f.senha.length < 6) return setErro('Senha com pelo menos 6 caracteres.');
    setOcupado(true);
    try {
      await cadastrarUsuario(sessao.empresaId, { nome: f.nome.trim(), login: f.login.trim(), senha: f.senha, papel: f.papel });
      toast(`${f.nome} pode entrar com o login "${norm(f.login)}".`, 'ok');
      setF({ nome: '', login: '', senha: '', papel: 'projetista' });
    } catch (e2) { setErro(traduzErroAuth(e2)); }
    setOcupado(false);
  };

  const tirarAcesso = async (u) => {
    const { deleteDoc, updateDoc } = F().fsMod;
    await deleteDoc(docRef('usuarios_index', u.uid));
    await updateDoc(docRef('empresas', sessao.empresaId, 'usuarios', u.uid), { ativo: false, removidoEm: nowIso() });
    setRemover(null);
    toast('Acesso removido.');
  };

  return html`
    <div class="fade-up">
      <div class="page-head"><div><h2>Equipe</h2><div class="dim">Quem pode entrar no sistema desta empresa</div></div></div>
      <div class="card stack" style=${{ marginBottom: '14px' }}>
        <div class="sec-title">🏷️ Logo da empresa</div>
        <div class="dim">Aparece no topo do app e em todas as impressões (OS, folha de compras, pendências, pedidos de alteração).</div>
        <div class="row" style=${{ gap: '10px' }}>
          ${window.__LOGO ? html`<img src=${window.__LOGO} style=${{ height: '56px', maxWidth: '200px', objectFit: 'contain', background: '#f5f5f4', borderRadius: '8px', padding: '4px' }} />` : html`<span class="dim">Nenhuma logo ainda.</span>`}
          <label class="btn btn-primary">⬆ ${window.__LOGO ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/*" hidden onChange=${async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const url = URL.createObjectURL(f); const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; }); const k = Math.min(1, 500 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const png = c.toDataURL('image/png'); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { logo: png.length < 300000 ? png : c.toDataURL('image/jpeg', 0.85) }); toast('Logo salva.', 'ok'); } catch (er) { toast('Não salvou a logo: ' + er.message, 'erro'); } }} /></label>
          ${window.__LOGO && html`<button class="btn btn-ghost" onClick=${async () => { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { logo: '' }); toast('Logo removida.'); }}>Remover</button>`}
        </div>
      </div>
      ${sessao.papel === 'admin' && html`<${EditorAcessos} key=${PAPEIS.map(p => p.v + p.abas.join()).join()} sessao=${sessao} usuarios=${usuarios} toast=${toast} />`}
      <form class="card stack" onSubmit=${adicionar} style=${{ marginBottom: '14px' }}>
        <div class="section-label">Novo acesso</div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <div style=${{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <input id="e-nome" class="inp" placeholder="Nome" value=${f.nome} onInput=${e => setF(v => ({ ...v, nome: e.target.value }))} />
          <input id="e-login" class="inp" placeholder="Login" value=${f.login} onInput=${e => setF(v => ({ ...v, login: e.target.value }))} />
          <input id="e-senha" class="inp" type="text" placeholder="Senha inicial" value=${f.senha} onInput=${e => setF(v => ({ ...v, senha: e.target.value }))} />
          <select id="e-papel" class="inp" value=${f.papel} onChange=${e => setF(v => ({ ...v, papel: e.target.value }))}>
            ${PAPEIS.map(p => html`<option key=${p.v} value=${p.v}>${p.t}</option>`)}
          </select>
          <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Criando…' : 'Criar acesso'}</button>
        </div>
        <div class="dim">Quem esquecer a senha: remova o acesso e crie outro com um login novo.</div>
      </form>
      <div class="list">
        ${usuarios.map(u => html`
          <div key=${u.uid} class="list-item" style=${{ cursor: 'default' }}>
            <div class="grow"><div class="title">${u.nome}</div><div class="dim">login: <span class="mono">${u.login}</span></div></div>
            <span class="chip ${u.papel === 'admin' ? 'chip-accent' : ''}">${(PAPEIS.find(p => p.v === u.papel) || {}).t || u.papel}</span>
            ${u.uid !== sessao.uid && (remover === u.uid
              ? html`<button class="btn btn-sm btn-danger" onClick=${() => tirarAcesso(u)}>Confirmar</button><button class="btn btn-sm" onClick=${() => setRemover(null)}>Não</button>`
              : html`<button class="btn btn-sm btn-ghost" onClick=${() => setRemover(u.uid)}>Remover acesso</button>`)}
          </div>`)}
      </div>
    </div>`;
}

function MinhaConta({ sessao, fechar, toast }) {
  const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [atual, setAtual] = useState('');
  const [erro, setErro] = useState('');
  const trocar = async () => {
    setErro('');
    if (s1.length < 6) return setErro('A nova senha precisa ter pelo menos 6 caracteres.');
    if (s1 !== s2) return setErro('As duas senhas estão diferentes.');
    try {
      const { authMod, auth } = F();
      const cred = authMod.EmailAuthProvider.credential(auth.currentUser.email, atual);
      await authMod.reauthenticateWithCredential(auth.currentUser, cred);
      await authMod.updatePassword(auth.currentUser, s1);
      toast('Senha trocada.', 'ok'); fechar();
    } catch (e) { setErro(traduzErroAuth(e)); }
  };
  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="modal">
        <h3>Minha conta</h3>
        <div class="dim">${sessao.nome} · ${sessao.empresaNome} · ${(PAPEIS.find(p => p.v === sessao.papel) || {}).t}</div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <${Senha} id="mc-atual" value=${atual} onInput=${e => setAtual(e.target.value)} placeholder="Senha atual" />
        <${Senha} id="mc-nova" value=${s1} onInput=${e => setS1(e.target.value)} placeholder="Nova senha" />
        <${Senha} id="mc-nova2" value=${s2} onInput=${e => setS2(e.target.value)} placeholder="Repita a nova senha" />
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          <button class="btn btn-ghost" onClick=${fechar}>Fechar</button>
          <button class="btn btn-primary" onClick=${trocar}>Trocar senha</button>
        </div>
      </div>
    </div>`;
}

/* =========================================================
   Assistente de IA (chat flutuante)
   ========================================================= */
/* ---------- A IA mexendo no sistema (com confirmação) ---------- */
 const NAV_ACOES = ['abrir_aba', 'abrir_os', 'ver_cronograma', 'imprimir_os'];
const SECOES = [
  ['geral', '🏠 Geral', '#2563eb', ['inicio', 'novidades', 'sugestoes', 'quadro', 'amostras', 'importar', 'manual', 'config']],
  ['clientes', '👤 Clientes', '#db2777', ['clientes', 'projetos', 'contratos']],
  ['producao', '🏭 Produção', '#d97706', ['os', 'cronograma', 'pedidos', 'catalogo', 'excluir']],
  ['compras', '🛒 Compras', '#16a34a', ['compras']],
  ['equipe', '👥 Equipe', '#7c3aed', ['equipe']],
  ['financeiro', '💰 Financeiro', '#0e7490', ['financeiro', 'contas']],
];
const secaoDe = (aba) => (SECOES.find(x => x[3].includes(aba)) || SECOES[0]);
/* Comandos de tela resolvidos na hora, sem esperar a IA */
const TELAS_VOZ = [[/sugest|anota[çc]|notas?\b|ideias?/, 'sugestoes'], [/contas|custos/, 'contas'], [/compras?/, 'compras'], [/financeiro|dinheiro|pagamento/, 'financeiro'], [/\b(tela )?inicial|\bin[ií]cio\b|\bhome\b|p[aá]gina principal/, 'inicio'], [/cronograma|agenda/, 'cronograma'], [/quadro/, 'quadro'], [/pe[çc]as? extras?|pedidos/, 'pedidos'], [/ordens?( de servi[çc]o)?|\blista de os|\bas os\b/, 'os'], [/contratos?/, 'contratos'], [/reuni|projetos?/, 'projetos'], [/importar/, 'importar'], [/cat[aá]logo/, 'catalogo'], [/equipe/, 'equipe'], [/excluir/, 'excluir'], [/manual|ajuda|instru/, 'manual'], [/configura/, 'config'], [/amostras?/, 'amostras']];
function comandoTela(q) {
  const t = norm(q);
  if (/^(fecha|fechar|sair da os|fecha a os|volta|voltar)\b/.test(t) && !/para|pra|pro/.test(t)) { window.__fecharFicha && window.__fecharFicha(); return 'fechar'; }
  if (!/\b(vamos|vai|vá|va|abre|abrir|abra|volta|voltar|ir|mostra|mostrar|leva|entra|entrar)\b/.test(t)) return null;
  if (/\b\d{2}[.,]?\d{2,3}\b|\bos \d/.test(t)) return null;
  for (const [re, v] of TELAS_VOZ) if (re.test(t)) { window.__irPara && window.__irPara(v); return v; }
  return null;
}
const TIPO_ACAO = { abrir_aba: '🧭 Abrir tela', abrir_os: '📋 Abrir OS', ver_cronograma: '📅 Ver no cronograma', imprimir_os: '🖨 Imprimir OS', status: '➡️ Mudar etapa', prazo_entrega: '🚚 Prazo de entrega', observacao: '📝 Observação', pendencia: '⚠️ Pendência', cliente: '👤 Dados do cliente', cronograma: '📅 Enviar ao cronograma', concluir_tarefa: '✅ Concluir tarefa', mais_dias: '⏳ Mais dias', mover_tarefa: '↔️ Mover tarefa', excluir_tarefa: '🗑 Excluir do cronograma', unificar_clientes: '👥 Juntar clientes' };
function descAcao(a) {
  const x = { ...a }; delete x.tipo; delete x.os;
  return (a.os ? 'OS ' + a.os + ' · ' : '') + Object.entries(x).map(([k, v]) => k + ': ' + (/^\d{4}-\d\d-\d\d$/.test(String(v)) ? dm(v) : v)).join(' · ');
}
async function executarAcao(sessao, a) {
  const { getDocs, updateDoc, addDoc, writeBatch } = F().fsMod; const E = sessao.empresaId;
  const oss = (await getDocs(col('empresas', E, 'os'))).docs.map(d => ({ id: d.id, ...d.data() }));
  const achar = (q) => { q = String(q || '').trim(); if (!q) return null; const n = norm(q), d = q.replace(/\D/g, '');
    return oss.find(x => numOS(x) === q || x.numeroAntigo === q) || (d && oss.find(x => numOS(x).endsWith('.' + d.slice(-3).padStart(3, '0')))) || oss.find(x => norm(x.cliente?.nome + ' ' + (x.ambientes || []).map(a => a.nome).join(' ') + ' ' + (x.ambienteResumo || '')).includes(n)); };
  const o = a.os ? achar(a.os) : (window.__ultimaOS ? oss.find(x => x.id === window.__ultimaOS) : null);
  if (o) window.__ultimaOS = o.id;
  if (a.pessoa) { try { const ag = await F().fsMod.getDoc(docRef('empresas', E, 'agenda', iso(segundaDe(new Date())))); const nomes = Object.values(ag.data()?.grades || {}).flat().map(r => r.nome).filter(Boolean); const np = norm(a.pessoa); a.pessoa = nomes.find(x => norm(x) === np) || nomes.find(x => norm(x).includes(np) || np.includes(norm(x).split(/[\s+]/)[0])) || a.pessoa; } catch {} }
  if (a.tipo === 'unificar_clientes') { const de = baseCli(a.de), para = baseCli(a.para); if (!de || !para) throw new Error('Faltou o nome.'); const real = [...new Set(oss.map(x => baseCli(x.cliente?.nome)))].find(x => norm(x) === norm(de)); if (!real) throw new Error('Não achei o cliente ' + de + '.'); const n = await unificarCliente(sessao, oss, real, para, '🤖 '); return n + ' OS: ' + real + ' → ' + para; }
  if (a.tipo !== 'abrir_aba' && !o) throw new Error('Não achei a OS ' + (a.os || '') + '.');
  const refO = o && docRef('empresas', E, 'os', o.id);
  const tars = (await getDocs(col('empresas', E, 'tarefas'))).docs.map(d => ({ id: d.id, ...d.data() }));
  const tarDaOS = () => tars.filter(t => t.osId === o.id && t.status !== 'concluida').sort((x, y) => x.inicio.localeCompare(y.inicio))[0];
  const ia = '🤖 ';
  switch (a.tipo) {
    case 'abrir_aba': { if (!window.__irPara) throw new Error('Não consegui navegar.'); window.__irPara(a.aba); return 'Abri ' + a.aba; }
    case 'abrir_os': {
      window.__abrirOS(o.id); window.__modoFicha = a.modo || 'temas';
      if (a.modo === 'editar') setTimeout(() => window.__editarOS && window.__editarOS(o.id), 400);
      return 'Abri a OS ' + numOS(o);
    }
    case 'imprimir_os': { window.__abrirOS(o.id); window.__modoFicha = 'folha'; setTimeout(() => { document.body.classList.add('imp-ficha'); window.print(); document.body.classList.remove('imp-ficha'); }, 1500); return 'Abrindo a impressão da ' + numOS(o); }
    case 'ver_cronograma': { const t = tarDaOS(); if (!t) throw new Error('A OS ' + numOS(o) + ' ainda não está no cronograma.'); const h = isoD(new Date()); const d = t.inicio <= h && t.fim >= h ? h : t.inicio; window.__irCronograma(d, { p: norm(t.pessoa), d }); return 'Mostrando a ' + numOS(o) + ' no cronograma'; }
    case 'status': {
      const st = STATUS_OS.find(x => x.v === a.status || norm(x.t).includes(norm(a.status))); if (!st) throw new Error('Etapa desconhecida: ' + a.status);
      await updateDoc(refO, { status: st.v, statusHist: [...(o.statusHist || []), { st: st.v, em: nowIso(), quem: sessao.nome + ' (IA)' }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
      return 'OS ' + numOS(o) + ' → ' + st.t.replace(/^\d+\. /, '');
    }
    case 'prazo_entrega': await updateDoc(refO, { prazoEntrega: a.data, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); registrar(sessao, o.id, ia + '🚚', 'Prazo de entrega: ' + dm(a.data), 'pela IA'); return 'Prazo de entrega ' + dm(a.data);
    case 'observacao': await updateDoc(refO, { observacoesGerais: ((o.observacoesGerais || '') + '\n' + a.texto).trim(), atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); registrar(sessao, o.id, ia + '📝', 'Observação adicionada', a.texto); return 'Observação adicionada';
    case 'pendencia': await addDoc(col('empresas', E, 'os', o.id, 'diario'), { tipo: 'pendencia', texto: a.texto, fotos: [], quem: sessao.nome, em: nowIso(), resolvida: false }); await updateDoc(refO, { pendAbertas: (o.pendAbertas || 0) + 1 }); registrar(sessao, o.id, ia + '⚠️', 'Pendência no diário', a.texto); return 'Pendência registrada';
    case 'cliente': { if (!['nome', 'telefone', 'obra', 'endereco'].includes(a.campo)) throw new Error('Campo inválido'); await updateDoc(refO, { cliente: { ...(o.cliente || {}), [a.campo]: a.valor }, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); registrar(sessao, o.id, ia + '👤', 'Cliente: ' + a.campo + ' = ' + a.valor); return 'Cliente atualizado'; }
    case 'cronograma': {
      if (!a.pessoa || !a.inicio || !a.fim) throw new Error('Faltam pessoa ou datas.');
      const grade = GRADES.find(g => g[0] === a.categoria) ? a.categoria : (GRADES.find(g => norm(g[1]).includes(norm(a.categoria || ''))) || GRADES[0])[0];
      const abertas = tars.filter(t => t.status !== 'concluida');
      const junto = abertas.find(t => t.osId === o.id && t.inicio <= a.fim && t.fim >= a.inicio); if (junto) throw new Error('A OS já está com ' + junto.pessoa + ' de ' + dm(junto.inicio) + ' a ' + dm(junto.fim) + '.');
      const choque = abertas.find(t => norm(t.pessoa) === norm(a.pessoa) && t.inicio <= a.fim && t.fim >= a.inicio); if (choque) throw new Error(a.pessoa + ' já tem ' + (choque.osCod || choque.texto) + ' nesses dias.');
      await addDoc(col('empresas', E, 'tarefas'), { pessoa: a.pessoa, grade, inicio: a.inicio, fim: a.fim, fimOriginal: a.fim, texto: a.texto || '', osId: o.id, osCod: numOS(o), cliente: o.cliente?.nome || '', ambiente: (o.ambientes || []).map(x => x.nome).join(', '), status: 'andamento', prorrogacoes: [], quem: sessao.nome + ' (IA)', em: nowIso() });
      await escreverNaAgenda(sessao, grade, a.pessoa, a.inicio, a.fim, numOS(o) + ' ' + (o.cliente?.nome || '').split(/\s[-–]\s/)[0]);
      registrar(sessao, o.id, ia + '📅', 'Entrou no cronograma: ' + a.pessoa + ' · prazo ' + dm(a.fim), 'De ' + dm(a.inicio) + ' a ' + dm(a.fim) + ' — pela IA');
      return 'Lançada com ' + a.pessoa + ' de ' + dm(a.inicio) + ' a ' + dm(a.fim);
    }
    case 'concluir_tarefa': { const t = tarDaOS(); if (!t) throw new Error('Essa OS não tem tarefa aberta no cronograma.'); await updateDoc(docRef('empresas', E, 'tarefas', t.id), { status: 'concluida', concluidaEm: nowIso(), concluidaPor: sessao.nome }); const rp = resultadoPrazo(t); registrar(sessao, o.id, ia + (rp.dif > 0 ? '⚠️' : '✅'), 'Concluída (' + t.pessoa + ') — ' + rp.txt, rp.d); return 'Concluída — ' + rp.txt; }
    case 'mais_dias': {
      const t = tarDaOS(); if (!t) throw new Error('Essa OS não tem tarefa aberta.'); if (!a.motivo) throw new Error('Falta o motivo.');
      const n = Math.max(1, parseInt(a.dias, 10) || 1), novoFim = somaUteis(t.fim, n); const b = writeBatch(F().db);
      b.update(docRef('empresas', E, 'tarefas', t.id), { fim: novoFim, prorrogacoes: [...(t.prorrogacoes || []), { dias: n, motivo: a.motivo, quem: sessao.nome, em: nowIso(), fimAntes: t.fim, fimDepois: novoFim }] });
      tars.filter(x => x.id !== t.id && x.pessoa === t.pessoa && x.status !== 'concluida' && x.inicio > t.fim).forEach(x => b.update(docRef('empresas', E, 'tarefas', x.id), { inicio: somaUteis(x.inicio, n), fim: somaUteis(x.fim, n) }));
      await b.commit(); escreverNaAgenda(sessao, t.grade, t.pessoa, somaUteis(t.fim, 1), novoFim, numOS(o) + ' ' + (o.cliente?.nome || '').split(/\s[-–]\s/)[0]).catch(() => {});
      registrar(sessao, o.id, ia + '⏳', 'Prazo prorrogado +' + n + 'd: ' + dm(t.fim) + ' → ' + dm(novoFim), a.motivo); return '+' + n + ' dias, até ' + dm(novoFim);
    }
    case 'mover_tarefa': {
      const t = tarDaOS(); if (!t) throw new Error('Essa OS não tem tarefa aberta.'); if (!a.motivo) throw new Error('Falta o motivo.');
      const pessoa = a.pessoa || t.pessoa, ini = a.inicio || t.inicio, fim = a.fim || t.fim;
      const choque = tars.find(x => x.id !== t.id && x.status !== 'concluida' && norm(x.pessoa) === norm(pessoa) && x.inicio <= fim && x.fim >= ini); if (choque) throw new Error(pessoa + ' já tem ' + (choque.osCod || choque.texto) + ' nesses dias.');
      await updateDoc(docRef('empresas', E, 'tarefas', t.id), { pessoa, inicio: ini, fim, mudancas: [...(t.mudancas || []), { de: { pessoa: t.pessoa, inicio: t.inicio, fim: t.fim }, para: { pessoa, inicio: ini, fim }, motivo: a.motivo, quem: sessao.nome + ' (IA)', em: nowIso() }] });
      await removerDaAgenda(sessao, t.grade, t.pessoa, t.inicio, t.fim, numOS(o)); await escreverNaAgenda(sessao, t.grade, pessoa, ini, fim, numOS(o) + ' ' + (o.cliente?.nome || '').split(/\s[-–]\s/)[0]);
      registrar(sessao, o.id, ia + '↔️', 'Mudou no cronograma: ' + t.pessoa + ' → ' + pessoa + ' (' + dm(ini) + '–' + dm(fim) + ')', a.motivo); return 'Movida para ' + pessoa + ', ' + dm(ini) + ' a ' + dm(fim);
    }
    case 'excluir_tarefa': { const t = tarDaOS(); if (!t) throw new Error('Essa OS não tem tarefa aberta.'); if (!a.motivo) throw new Error('Falta o motivo.'); await F().fsMod.deleteDoc(docRef('empresas', E, 'tarefas', t.id)); await removerDaAgenda(sessao, t.grade, t.pessoa, t.inicio, t.fim, numOS(o)); registrar(sessao, o.id, ia + '🗑', 'Excluída do cronograma: ' + t.pessoa, a.motivo); return 'Excluída do cronograma'; }
    default: throw new Error('Ação desconhecida: ' + a.tipo);
  }
}
async function montarContexto(sessao, osAbertaId) {
  const { getDocs, getDoc, query, orderBy, limit } = F().fsMod;
  const linhas = [];
  linhas.push(`Empresa: ${sessao.empresaNome}. Usuário: ${sessao.nome} (${(PAPEIS.find(p => p.v === sessao.papel) || {}).t || sessao.papel}). Hoje: ${new Date().toLocaleDateString('pt-BR')}.`);
  try {
    const ps = await getDocs(query(col('empresas', sessao.empresaId, 'projetos'), orderBy('criadoEm', 'desc'), limit(60)));
    linhas.push(`\nPROJETOS (${ps.size}):`);
    ps.docs.forEach(d => { const p = d.data(); linhas.push(`- ${p.cliente?.nome || '?'}${p.titulo ? ' — ' + p.titulo : ''}${p.cliente?.obra ? ' (obra ' + p.cliente.obra + ')' : ''}; ${p.qtdDocs || 0} doc.; ata: ${p.temAta ? 'sim' : 'não'}; ${p.osNumero ? 'OS ' + numOS(p.osNumero) : 'sem OS'}; criado ${fmtData(p.criadoEm)}`); });
    const os = await getDocs(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc'), limit(80)));
    linhas.push(`\nORDENS DE SERVIÇO (${os.size}):`);
    os.docs.forEach(d => {
      const o = d.data();
      const st = (STATUS_OS.find(s => s.v === o.status) || STATUS_OS[0]).t;
      const amb = (o.ambientes || []).map(a => `${a.nome} [${(a.moveis || []).map(m => m.nome).join(', ')}]`).join('; ');
      linhas.push(`- OS ${numOS(o)} | ${o.cliente?.nome || '?'} | ${st} | prazo: ${o.prazoEntrega || '—'} | ${amb || 'sem ambientes'}`);
    });
    { const gp = gruposClientesParecidos(os.docs.map(d => d.data())); if (gp.length) linhas.push('\nCLIENTES COM NOME QUASE IGUAL (provável erro de digitação): ' + gp.map(g => g.map(([n, q]) => '"' + n + '" (' + q + ' OS)').join(' x ')).join('; ')); }
    const foco = osAbertaId || window.__ultimaOS; if (foco) { const fo = os.docs.find(d => d.id === foco); if (fo) linhas.push('\nOS EM FOCO (a última aberta/mencionada): ' + numOS(fo.data()) + ' ' + (fo.data().cliente?.nome || '')); }
    linhas.push('\nETAPAS DA OS (valor = nome): ' + STATUS_OS.map(x => x.v + ' = ' + x.t.replace(/^\d+\. /, '')).join('; '));
    linhas.push('CATEGORIAS DO CRONOGRAMA (chave = nome): ' + GRADES.map(g => g[0] + ' = ' + g[1]).join('; '));
    try {
      const ts = await getDocs(col('empresas', sessao.empresaId, 'tarefas'));
      linhas.push(`\nTAREFAS NO CRONOGRAMA (${ts.size}):`);
      ts.docs.forEach(d => { const t = d.data(); linhas.push(`- ${t.osCod || '(sem OS)'} ${t.cliente || ''} | ${t.grade} | ${t.pessoa} | ${t.inicio} a ${t.fim} | ${t.status}`); });
      const ag = await getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(segundaDe(new Date()))));
      if (ag.exists()) linhas.push('PESSOAS/EQUIPES NO CRONOGRAMA: ' + GRADES.map(g => g[0] + ': ' + ((ag.data().grades || {})[g[0]] || []).map(r => r.nome).filter(Boolean).join(', ')).join(' | '));
    } catch {}
    if (osAbertaId) {
      const o = await getDoc(docRef('empresas', sessao.empresaId, 'os', osAbertaId));
      if (o.exists()) {
        const { fingerprint, ...dados } = o.data();
        linhas.push(`\nOS ABERTA NA TELA AGORA (completa):\n${JSON.stringify(dados).slice(0, 20000)}`);
      }
    }
  } catch (e) { linhas.push('(não consegui ler os dados agora)'); }
  return linhas.join('\n').slice(0, 40000);
}

/* Atalho instantâneo (sem IA): telas e OS abertas na hora */
function acaoRapida(q) {
  if (comandoTela(q)) return true;
  const t = norm(q), n = t.split(/\s+/).length;
  const abrir = /\b(abre|abrir|abra|mostra|mostrar|ver|entra|entrar|vai|vamos|imprime|imprimir)\b/.test(t);
  if (!abrir && (n > 4 || /\b(qual|quando|quanto|quem|como|por que|porque|muda|mudar|coloca|adiciona|marca|conclui)\b/.test(t))) return false;
  const o = acharOSFala(window.__listaOS || [], q);
  if (!o) { const tl = acharTelas(q); if (tl.length && tl[0].sc >= 3 && window.__irPara) { window.__irPara(tl[0].aba); return true; } return false; }
  if (!window.__abrirOS) return false;
  window.__ultimaOS = o.id; window.__abrirOS(o.id);
  if (/imprim/.test(t)) { window.__modoFicha = 'folha'; setTimeout(() => { document.body.classList.add('imp-ficha'); window.print(); document.body.classList.remove('imp-ficha'); }, 900); }
  return true;
}
function Assistente({ sessao, osAberta }) {
  const chave = 'osm_chat_' + sessao.uid;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(localStorage.getItem(chave) || '[]'); } catch { return []; } });
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  useEffect(() => { window.dispatchEvent(new CustomEvent('masc-pensa', { detail: !!pensando })); }, [pensando]);
  const [erro, setErro] = useState('');
  const fimRef = useRef(null);
  const [interim, setInterim] = useState('');
  const fala = useFala({ onFinal: t => setTexto(v => (v ? v + ' ' : '') + t), onInterim: setInterim });

  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, pensando, aberto]);

  const enviar = async (pergunta) => {
    const q = (pergunta ?? (texto + ' ' + interim)).trim();
    if (!q || pensando) return;
    fala.parar();
    setErro(''); setTexto(''); setInterim('');
    if (acaoRapida(q)) { setMsgs(h => [...h, { role: 'user', content: q }]); setAberto(false); return; }
    const hist = [...msgs, { role: 'user', content: q }];
    setMsgs(hist);
    setPensando(true);
    try {
      const contexto = await montarContexto(sessao, osAberta);
      const r = await chamarIA('assistente', { contexto, historico: hist });
      const navs = (r?.acoes || []).filter(a => NAV_ACOES.includes(a.tipo));
      const muds = (r?.acoes || []).filter(a => !NAV_ACOES.includes(a.tipo));
      setMsgs(h => [...h, { role: 'assistant', content: String(r?.texto || '').replace(/\*\*/g, '') || (muds.length ? 'Preparei estas mudanças. Confira e aplique:' : ''), acoes: muds.map(a => ({ ...a, _st: 'pendente' })) }]);
      for (const a of navs) { try { await executarAcao(sessao, a); } catch (e) { setErro(e.message); } }
    } catch (e) { setErro(e.message); }
    setPensando(false);
  };

  /* ---- Chamada ativa: fala em tempo real, ela responde falando e executa ---- */
  const [chamada, setChamada] = useState(false);
  const [fase, setFase] = useState('');
  useEffect(() => { if (fase) window.dispatchEvent(new CustomEvent('masc-pensa', { detail: fase === 'pensando' })); }, [fase]);
  const [ouvido, setOuvido] = useState('');
  const bufRef = useRef(''); const timerRef = useRef(null); const faseRef = useRef(''); faseRef.current = fase;
  const pendRef = useRef(null); const msgsRef = useRef(msgs); msgsRef.current = msgs;
  const chamadaRef = useRef(false); chamadaRef.current = chamada;
  const falandoTxt = useRef('');
  const eco = (t) => { const n = norm(t); return !n || (falandoTxt.current && falandoTxt.current.includes(n)); };
  const interromper = () => { try { window.speechSynthesis.cancel(); } catch {} falandoTxt.current = ''; setFase('ouvindo'); };
  const falaCh = useFala({ onFinal: t => { if (faseRef.current === 'falando') { if (eco(t)) return; interromper(); } if (faseRef.current === 'pensando') return; bufRef.current = (bufRef.current + ' ' + t).trim(); setOuvido(bufRef.current); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { const q = bufRef.current; bufRef.current = ''; if (q) processar(q); }, 1300); }, onInterim: t => { if (!t) return; if (faseRef.current === 'falando') { if (t.trim().split(/\s+/).length < 2 || eco(t)) return; interromper(); } setOuvido((bufRef.current + ' ' + t).trim()); } });
  const falar = (txt) => new Promise(res => {
    const sy = window.speechSynthesis; if (!sy || !txt) { if (chamadaRef.current) { setFase('ouvindo'); falaCh.iniciar(); } return res(); }
    setFase('falando'); if (!falaCh.ouvindo) falaCh.iniciar();
    const u = new SpeechSynthesisUtterance(String(txt).replace(/[*#_`>]/g, '').slice(0, 600));
    u.lang = (window.__I18N && window.__I18N.locale()) || 'pt-BR'; const v = sy.getVoices().find(x => x.lang.replace('_', '-').toLowerCase() === u.lang.toLowerCase()) || sy.getVoices().find(x => x.lang.slice(0, 2) === u.lang.slice(0, 2)); if (v) u.voice = v; u.rate = 1.35; falandoTxt.current = norm(txt);
    let feito = false;
    const fim = () => { if (feito) return; feito = true; falandoTxt.current = ''; res(); if (chamadaRef.current) { if (faseRef.current === 'falando') setFase('ouvindo'); } };
    u.onend = fim; u.onerror = fim; try { sy.cancel(); sy.resume(); sy.speak(u); } catch { fim(); }
    setTimeout(fim, Math.min(20000, 1500 + String(txt).length * 60));
  });
  const aplicarPendentes = async () => {
    const p = pendRef.current; pendRef.current = null; if (!p) return;
    const res = [];
    for (let j = 0; j < p.acoes.length; j++) { marcar(p.i, j, { _st: 'rodando' }); try { const { _st, _msg, ...limpa } = p.acoes[j]; const r = await executarAcao(sessao, limpa); marcar(p.i, j, { _st: 'feita', _msg: r }); res.push(r); } catch (e) { marcar(p.i, j, { _st: 'erro', _msg: e.message }); res.push('não deu: ' + e.message); } }
    const erros = res.filter(r => r.startsWith('não deu'));
    if (erros.length) await falar(erros.join('. ')); else if (chamadaRef.current) setFase('ouvindo');
  };
  const processar = async (q) => {
    setOuvido('');
    if (faseRef.current === 'confirmando' && pendRef.current) {
      if (/\b(sim|pode|confirm|aplica|isso|manda|beleza|ok|claro|faz|salva)/i.test(q)) { setFase('pensando'); await aplicarPendentes(); setTimeout(() => chamadaRef.current && setAberto(false), 1200); return; }
      if (/\b(n[aã]o|cancela|esquece|deixa)/i.test(q)) { const p = pendRef.current; pendRef.current = null; p.acoes.forEach((_, j) => marcar(p.i, j, { _st: 'descartada' })); setFase('ouvindo'); setAberto(false); return; }
      const p = pendRef.current; pendRef.current = null; p.acoes.forEach((_, j) => marcar(p.i, j, { _st: 'descartada' }));
    }
    if (acaoRapida(q)) { setMsgs(h => [...h, { role: 'user', content: q }]); setFase('ouvindo'); return; }
    setFase('pensando');
    const hist = [...msgsRef.current, { role: 'user', content: q }];
    setMsgs(hist);
    try {
      const contexto = await montarContexto(sessao, osAberta);
      const r = await chamarIA('assistente', { contexto, historico: hist.map(m => ({ role: m.role, content: m.content })) });
      const navs = (r?.acoes || []).filter(a => NAV_ACOES.includes(a.tipo));
      for (const a of navs) { try { await executarAcao(sessao, a); } catch (e) { await falar(e.message); } }
      const acoes = (r?.acoes || []).filter(a => !NAV_ACOES.includes(a.tipo)).map(a => ({ ...a, _st: 'pendente' }));
      const txt = String(r?.texto || '').replace(/\*\*/g, '');
      const idx = hist.length;
      setMsgs(h => [...h, { role: 'assistant', content: txt || (acoes.length ? 'Preparei estas mudanças.' : ''), acoes }]);
      if (acoes.length) {
        pendRef.current = { i: idx, acoes };
        setAberto(true); await falar('Salvar?'); setFase('confirmando');
      }
      else if (!navs.length) await falar(txt || 'Não entendi, pode repetir?'); else setFase('ouvindo');
    } catch (e) { await falar('Tive um problema: ' + e.message); }
  };
  const ligar = () => { setChamada(true); chamadaRef.current = true; setAberto(false); setFase('ouvindo'); falaCh.iniciar(); };
  const desligar = () => { setChamada(false); chamadaRef.current = false; setFase(''); clearTimeout(timerRef.current); bufRef.current = ''; falaCh.parar(); try { window.speechSynthesis.cancel(); } catch {} };
  useEffect(() => () => desligar(), []);
  const marcar = (i, j, patch) => setMsgs(h => h.map((m, k) => k !== i ? m : { ...m, acoes: m.acoes.map((a, l) => l === j ? { ...a, ...patch } : a) }));
  const aplicar = async (i, j) => {
    const a = msgs[i]?.acoes?.[j]; if (!a) return;
    marcar(i, j, { _st: 'rodando' });
    try { const { _st, _msg, ...limpa } = a; const r = await executarAcao(sessao, limpa); marcar(i, j, { _st: 'feita', _msg: r }); }
    catch (e) { marcar(i, j, { _st: 'erro', _msg: e.message }); }
  };
  const sugestoes = osAberta
    ? ['Confira esta OS e aponte o que está faltando', 'Sugira ferragens para os móveis desta OS', 'Escreva uma mensagem pro cliente confirmando os acabamentos']
    : ['Mande a OS 26.010 para a produção com o EDINHO de segunda a quarta', 'Quais OS estão em produção?', 'Quais projetos ainda não têm OS?', 'Sugira combinações de MDF para uma cozinha clara', 'Como eu faço a ata da reunião?'];

  return html`
    ${chamada && !aberto && html`<button class=${'ch-mini ' + fase} onClick=${() => setAberto(true)} title="Chamada ativa — toque para ver">
      <i></i><span>${fase === 'pensando' ? '⏳' : fase === 'falando' ? '🔊' : '🎙'}</span>${ouvido && html`<em>${ouvido.slice(-40)}</em>`}
      <b onClick=${e => { e.stopPropagation(); desligar(); }} title="Encerrar">✕</b></button>`}
    ${(window.__abrirAssist = () => setAberto(true), aberto) && html`<button class="assist-fab on" onClick=${() => setAberto(false)} aria-label="Fechar assistente">✕</button>`}
    <button style=${{ display: 'none' }} class=${'assist-fab' + (aberto ? ' on' : ' pisca')} onClick=${() => setAberto(v => !v)} aria-label="Assistente de IA">
      ${aberto ? '✕' : html`<span>✦</span><em> Peça qualquer coisa</em>`}
    </button>
    ${aberto && html`
      <div class="assist-panel glass" role="dialog" aria-label="Assistente de IA">
        <div class="assist-head">
          <div><b>Assistente Gestão Pró</b><div class="dim" style=${{ fontSize: '12px' }}>Conhece os projetos e as OS da sua empresa${osAberta ? ' e a OS aberta' : ''}</div></div>
          <div class="row" style=${{ gap: '4px' }}>
            ${falaCh.suportado !== false && html`<button class=${'btn btn-sm ' + (chamada ? 'btn-danger' : 'btn-verde')} onClick=${chamada ? desligar : ligar}>${chamada ? '📵 Encerrar' : '📞 Chamada'}</button>`}
            ${msgs.length > 0 && html`<button class="btn btn-ghost btn-sm" onClick=${() => setMsgs([])}>Limpar</button>`}
          </div>
        </div>
        ${chamada && html`<div class=${'chamada ' + fase}>
          <div class="ch-orb"><span></span><span></span><span></span><b>${fase === 'falando' ? '🔊' : fase === 'pensando' ? '⏳' : fase === 'confirmando' ? '❓' : '🎙'}</b></div>
          <div class="ch-st">${fase === 'falando' ? 'Falando…' : fase === 'pensando' ? 'Pensando…' : fase === 'confirmando' ? 'Diga "sim" para aplicar ou "não"' : 'Ouvindo — pode falar'}</div>
          ${ouvido && html`<div class="ch-ouvido">"${ouvido}"</div>`}
          ${falaCh.erro && html`<div class="error-box">${falaCh.erro}</div>`}
        </div>`}
        <div class="assist-body">
          ${msgs.length === 0 && html`
            <div class="dim" style=${{ marginBottom: '8px' }}>Pergunte qualquer coisa sobre seus projetos, OS, materiais ou o uso do app.</div>
            <div class="stack" style=${{ gap: '6px' }}>
              ${sugestoes.map(s => html`<button key=${s} class="btn btn-sm" style=${{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick=${() => enviar(s)}>${s}</button>`)}
            </div>`}
          ${msgs.map((m, i) => html`<div key=${i} class=${'bolha ' + (m.role === 'user' ? 'eu' : 'ia')}>${m.content}
            ${(m.acoes || []).length > 0 && html`<div class="ia-acoes">${m.acoes.map((a, j) => html`<div key=${j} class=${'ia-acao ' + a._st}>
              <b>${TIPO_ACAO[a.tipo] || a.tipo}</b><small>${descAcao(Object.fromEntries(Object.entries(a).filter(([k]) => !k.startsWith('_'))))}</small>
              ${a._st === 'pendente' ? html`<div class="row" style=${{ gap: '4px' }}><button class="btn btn-sm btn-verde" onClick=${() => aplicar(i, j)}>✓ Aplicar</button><button class="btn btn-sm btn-ghost" onClick=${() => marcar(i, j, { _st: 'descartada' })}>Descartar</button></div>`
                : html`<em>${a._st === 'feita' ? '✅ ' + (a._msg || 'Feito') : a._st === 'rodando' ? '⏳ Aplicando…' : a._st === 'erro' ? '⚠️ ' + a._msg : '✕ Descartada'}</em>`}
            </div>`)}
            ${m.acoes.filter(a => a._st === 'pendente').length > 1 && html`<button class="btn btn-sm btn-verde btn-block" onClick=${async () => { for (let j = 0; j < m.acoes.length; j++) if (m.acoes[j]._st === 'pendente') await aplicar(i, j); }}>✓ Aplicar todas</button>`}</div>`}
          </div>`)}
          ${pensando && html`<div class="bolha ia dim">Pensando…</div>`}
          ${erro && html`<div class="error-box">${erro}</div>`}
          <div ref=${fimRef}></div>
        </div>
        <div class="assist-foot">
          <textarea id="assist-txt" class="inp" rows="2" placeholder=${fala.ouvindo ? 'Ouvindo…' : 'Escreva ou fale sua pergunta…'} value=${texto + (interim ? ' ' + interim : '')}
            onInput=${e => setTexto(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}></textarea>
          <div class="row" style=${{ flexWrap: 'nowrap' }}>
            ${fala.suportado && html`<button class=${'btn btn-sm' + (fala.ouvindo ? ' btn-mic-on pulse' : '')} onClick=${fala.ouvindo ? fala.parar : fala.iniciar} title="Falar">🎤</button>`}
            <button class="btn btn-primary btn-sm" style=${{ flex: 1 }} onClick=${() => enviar()} disabled=${pensando || !(texto.trim() || interim.trim())}>Enviar</button>
          </div>
        </div>
      </div>`}`;
}

/* =========================================================
   App
   ========================================================= */
// Data de prazo em texto (dd/mm/aaaa) -> Date, ou null.
function lerPrazo(t) {
  const m = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(String(t || ''));
  if (!m) return null;
  const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(a, Number(m[2]) - 1, Number(m[1]), 23, 59);
  return isNaN(d) ? null : d;
}
const atrasada = (o) => !osConcluida(o) && (lerPrazo(o.prazoEntrega)?.getTime() || Infinity) < Date.now();
const CATEG_AMB = [
  { t: 'Cozinha', k: ['cozinha', 'gourmet', 'copa', 'lavanderia', 'area de servico'] },
  { t: 'Dormitório', k: ['dormitorio', 'quarto', 'suite', 'closet', 'roupeiro'] },
  { t: 'Banheiro', k: ['banheiro', 'lavabo', 'bwc', 'wc'] },
  { t: 'Sala / Estar', k: ['sala', 'estar', 'jantar', 'home', 'living', 'tv', 'hall'] },
  { t: 'Corporativo', k: ['escritorio', 'recepcao', 'loja', 'consultorio', 'corporativo', 'sala de reuniao'] },
];
const categoriasDaOS = (o) => CATEG_AMB.filter(c => (o.ambientes || []).some(a => c.k.some(k => norm(a.nome).includes(k)))).map(c => c.t);

/* Métricas: dias/horas ganhos ou perdidos no cronograma */
const HORAS_DIA = 8;
function ZerarEsteiras({ sessao, toast, fechar }) {
  const [oss, setOss] = useState([]), [q, setQ] = useState(''), [sel, setSel] = useState([]);
  useEffect(() => { F().fsMod.getDocs(col('empresas', sessao.empresaId, 'os')).then(s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() })))).catch(() => {}); }, []);
  const vis = oss.filter(o => !q || norm(numOS(o) + ' ' + o.cliente?.nome + ' ' + (o.ambientes || []).map(a => a.nome).join(' ')).includes(norm(q))).sort((a, b) => numOS(b).localeCompare(numOS(a)));
  const zerar = async (lista) => {
    if (!lista.length) return toast('Escolha ao menos uma OS.');
    const r = await escolher('Zerar esteiras', 'Volta ' + lista.length + ' OS para o início: apaga TODA a atividade (esteiras, tempos, paradas, liberações, parceiros, compras, peças extras, diário e cronograma). Fica só o conteúdo da OS.', [{ v: 'ok', t: 'Zerar ' + lista.length + ' OS', cls: 'btn-danger' }, { v: 'n', t: 'Cancelar' }]); if (r !== 'ok') return;
    const { writeBatch, deleteField, getDocs, query, where } = F().fsMod; const E = sessao.empresaId;
    const ops = [];
    lista.forEach(o => ops.push(['u', docRef('empresas', E, 'os', o.id), { status: STATUS_OS[0]?.v || 'elaboracao', statusHist: [], inicioEscritorio: deleteField(), execucao: { ...(o.execucao || {}), etapas: {} }, parada: deleteField(), paradas: deleteField(), liberacoes: deleteField(), parceiros: deleteField(), ordensParceiro: deleteField(), reaberturas: deleteField(), revisao: deleteField(), ultimoFinal: deleteField(), atualizadoEm: nowIso(), atualizadoPor: sessao.nome }]));
    try {
      const ids = lista.map(o => o.id);
      for (let i = 0; i < ids.length; i += 10) { const pa = ids.slice(i, i + 10);
        for (const c of ['tarefas', 'pedidos']) (await getDocs(query(col('empresas', E, c), where('osId', 'in', pa)))).docs.forEach(d => ops.push(['d', d.ref])); }
      for (const id of ids) { ops.push(['d', docRef('empresas', E, 'compras', id)]); (await getDocs(col('empresas', E, 'os', id, 'diario'))).docs.forEach(d => ops.push(['d', d.ref])); }
      for (let i = 0; i < ops.length; i += 400) { const b = writeBatch(F().db); ops.slice(i, i + 400).forEach(([t, r, p]) => t === 'u' ? b.update(r, p) : b.delete(r)); await b.commit(); } lista.forEach(o => registrar(sessao, o.id, '🧪', 'Esteiras zeradas (teste)', '')); toast(lista.length + ' OS zerada(s).', 'ok'); fechar(); } catch (e) { toast(e.message, 'erro'); }
  };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}><div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🧪 Testes · zerar esteiras e tempos</div><button class="x-btn" onClick=${fechar}>✕</button></div>
    <input class="inp" placeholder="🔍 Buscar OS" value=${q} onInput=${e => setQ(e.target.value)} />
    <div class="os-picker-lista" style=${{ maxHeight: '45vh' }}>${vis.map(o => html`<label key=${o.id} class="row" style=${{ gap: '8px', padding: '6px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}><input type="checkbox" checked=${sel.includes(o.id)} onChange=${() => setSel(v => v.includes(o.id) ? v.filter(x => x !== o.id) : [...v, o.id])} /><b class="mono">${numOS(o)}</b> ${nomePadrao(o.cliente?.nome)} <small class="dim">${nomePadrao((o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo)}</small></label>`)}</div>
    <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setSel(vis.map(o => o.id))}>Marcar todas</button><button class="btn btn-danger" style=${{ flex: 1 }} onClick=${() => zerar(oss.filter(o => sel.includes(o.id)))}>🧪 Zerar ${sel.length} OS</button></div>
  </div></div>`, document.body);
}
function BotaoMetricas({ sessao }) {
  const [ab, setAb] = useState(false);
  return html`<button class="btn btn-sm btn-anim" onClick=${() => setAb(true)}>⏱ Tempo ganho / perdido</button>
    ${ab && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setAb(false)}><div class="card modal-caixa stack" style=${{ width: 'min(760px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">⏱ Tempo ganho e perdido no cronograma</div><button class="x-btn" onClick=${() => setAb(false)}>✕</button></div>
      <${MetricasPrazo} sessao=${sessao} /></div></div>`, document.body)}`;
}
function MetricasPrazo({ sessao }) {
  const [tar0, setTar] = useState([]);
  const [per, setPer] = useState('mes');
  const PER = [['semana', 'Semanal'], ['mes', 'Mensal'], ['tri', 'Trimestral'], ['sem', 'Semestral'], ['ano', 'Anual']];
  const agora = new Date();
  const iniPer = (() => { const d = new Date(agora); d.setHours(0, 0, 0, 0);
    if (per === 'semana') return isoD(segundaDe(d));
    if (per === 'mes') return isoD(new Date(d.getFullYear(), d.getMonth(), 1));
    if (per === 'tri') return isoD(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
    if (per === 'sem') return isoD(new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1));
    return isoD(new Date(d.getFullYear(), 0, 1)); })();
  const refData = (t) => t.status === 'concluida' && t.concluidaEm ? isoD(new Date(t.concluidaEm)) : (t.fimOriginal || t.fim);
  const tar = tar0.filter(t => refData(t) >= iniPer);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'tarefas'), s => setTar(s.docs.map(d => d.data())), () => {}), []);
  const hoje = isoD(new Date());
  const difDe = (prev, real) => real === prev ? 0 : real > prev ? uteisEntre(prev, real) : -uteisEntre(real, prev);
  const conc = tar.filter(t => t.status === 'concluida' && t.concluidaEm).map(t => ({ ...t, dif: difDe(t.fimOriginal || t.fim, isoD(new Date(t.concluidaEm))) }));
  const abertasAtr = tar.filter(t => t.status !== 'concluida' && (t.fimOriginal || t.fim) < hoje).map(t => ({ ...t, dif: difDe(t.fimOriginal || t.fim, hoje) }));
  const todos = [...conc, ...abertasAtr];
  const ganho = -todos.filter(t => t.dif < 0).reduce((n, t) => n + t.dif, 0);
  const perda = todos.filter(t => t.dif > 0).reduce((n, t) => n + t.dif, 0);
  const saldo = ganho - perda;
  const noPrazo = conc.filter(t => t.dif <= 0).length;
  const prorr = tar.flatMap(t => (t.prorrogacoes || []).filter(p => !p.auto));
  const porPessoa = {}; todos.forEach(t => { const k = t.pessoa || '—'; porPessoa[k] = (porPessoa[k] || 0) - t.dif; });
  const porGrade = {}; todos.forEach(t => { const k = (GRADES.find(g => g[0] === t.grade) || [, t.grade || '—'])[1].replace(/^\S+ /, ''); porGrade[k] = (porGrade[k] || 0) - t.dif; });
  const h = (d) => (d * HORAS_DIA) + 'h';
  const maxAbs = Math.max(1, ...Object.values(porPessoa).map(Math.abs), ...Object.values(porGrade).map(Math.abs));
  const barras = (obj) => Object.entries(obj).sort((a, b) => a[1] - b[1]).map(([k, v]) => html`<div key=${k} class="mt-bar"><span>${k}</span><div><i style=${{ width: Math.abs(v) / maxAbs * 50 + '%', [v < 0 ? 'right' : 'left']: '50%', background: v < 0 ? '#dc2626' : v > 0 ? '#16a34a' : '#a8a29e' }}></i></div><b class=${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}>${v > 0 ? '+' : ''}${v}d</b></div>`);
  return html`<details class="card metricas" open=${tar0.length > 0}>
    <summary><b>⏱ Tempo ganho / perdido no cronograma</b> <span class=${'mt-saldo ' + (saldo < 0 ? 'neg' : saldo > 0 ? 'pos' : '')}>${saldo > 0 ? '+' : ''}${saldo} dias · ${saldo > 0 ? '+' : ''}${h(saldo)}</span></summary>
    <div class="seg-mini" style=${{ marginTop: '8px', flexWrap: 'wrap' }}>${PER.map(([k, t]) => html`<button key=${k} class=${per === k ? 'on' : ''} onClick=${() => setPer(k)}>${t}</button>`)}</div>
    <div class="dim" style=${{ fontSize: '11px' }}>Período: desde ${dm(iniPer)}/${iniPer.slice(0, 4)}</div>
    ${tar.length === 0 ? html`<div class="dim">Ainda não há tarefas no cronograma neste período. As métricas aparecem quando as tarefas forem concluídas.</div>` : html`
    <div class="mt-tiles">
      <div class="mt-t pos"><small>Ganho (antes do prazo)</small><b>${ganho}d</b><em>${h(ganho)}</em></div>
      <div class="mt-t neg"><small>Perdido (atrasos/retrabalho)</small><b>${perda}d</b><em>${h(perda)}</em></div>
      <div class="mt-t"><small>Concluídas no prazo</small><b>${conc.length ? Math.round(noPrazo * 100 / conc.length) : 0}%</b><em>${noPrazo} de ${conc.length}</em></div>
      <div class="mt-t warn"><small>Prorrogações (＋ dias)</small><b>${prorr.length}</b><em>${prorr.reduce((n, p) => n + (p.dias || 0), 0)}d · ${h(prorr.reduce((n, p) => n + (p.dias || 0), 0))}</em></div>
    </div>
    ${Object.keys(porGrade).length > 0 && html`<div class="mt-sec">Por etapa do cronograma</div>${barras(porGrade)}`}
    ${Object.keys(porPessoa).length > 0 && html`<div class="mt-sec">Por pessoa / equipe</div>${barras(porPessoa)}`}
    ${prorr.length > 0 && html`<div class="mt-sec">Motivos dos dias a mais</div><div class="mt-mot">${prorr.slice(-6).reverse().map((p, i) => html`<div key=${i}>+${p.dias}d · ${p.motivo} <small>${p.quem || ''}</small></div>`)}</div>`}
    <div class="dim" style=${{ fontSize: '11px' }}>Dias úteis comparando o prazo original com o dia da conclusão (tarefas abertas e atrasadas contam até hoje). 1 dia = ${HORAS_DIA}h.</div>`}
  </details>`;
}
/* acha a OS pelo que foi falado: número, cliente e/ou ambiente */
function acharOSFala(lista, q) {
  const PARE = new Set(['a', 'o', 'as', 'os', 'da', 'do', 'de', 'das', 'dos', 'e', 'abre', 'abrir', 'abra', 'mostra', 'quero', 'ver', 'buscar', 'busca', 'os', 'ordem', 'servico', 'cliente', 'na', 'no', 'pra', 'para']);
  const t = norm(q); const toks = t.split(/\s+/).filter(w => w && !PARE.has(w)); const dig = t.replace(/\D/g, '');
  let best = null, bs = 0;
  lista.forEach(o => { const cod = numOS(o); let sc = 0;
    if (dig.length >= 2 && (cod.replace(/\D/g, '').endsWith(dig.slice(-3)) || String(o.numeroAntigo || '') === dig)) sc += 5;
    const cli = norm(o.cliente?.nome || ''), amb = norm(((o.ambientes || []).map(a => a.nome).join(' ')) + ' ' + (o.ambienteResumo || ''));
    toks.forEach(w => { if (/^\d+$/.test(w)) return; if (w.length < 3) return; if (cli.split(/\s+/).some(x => x.startsWith(w) || (w.length > 4 && lev(x, w) <= 1))) sc += 2; if (amb.split(/\s+/).some(x => x.startsWith(w) || (w.length > 4 && lev(x, w) <= 1))) sc += 2.5; });
    if (!osConcluida(o)) sc += 0.1;
    if (sc > bs) { bs = sc; best = o; } });
  return bs >= 2 ? best : null;
}
/* Busca universal de telas e funções (instantânea) */
function acharTelas(q) {
  const t = norm(q).replace(/\b(abre|abrir|abra|vai|vamos|ir|pra|para|pro|a|o|as|os|de|da|do|tela|pagina|mostra|ver|entra|entrar)\b/g, ' ').trim(); if (t.length < 3) return [];
  const toks = t.split(/\s+/).filter(w => w.length >= 3); if (!toks.length) return [];
  const res = [];
  const pont = (txt, peso) => { const n = norm(txt); let sc = 0; toks.forEach(w => { if (n.split(/[^a-z0-9]+/).some(x => x.startsWith(w) || (w.length > 4 && x.length > 3 && lev(x.slice(0, w.length), w) <= 1))) sc += peso; }); return sc; };
  Object.keys(NOMES_ABA).forEach(aba => { const nome = NOMES_ABA[aba]; const sec = (SECOES.find(x => x[3].includes(aba)) || [])[1] || '';
    let sc = pont(nome, 3) + pont(sec, 1); for (const [re, v] of TELAS_VOZ) if (v === aba && re.test(t)) sc += 3;
    if (sc) res.push({ aba, t: nome, sc: sc + 0.5 });
    (MAPA[aba] || []).forEach(([f, d]) => { const s2 = pont(f, 2.5) + pont(d, 0.6); if (s2 >= 2) res.push({ aba, t: nome + ' › ' + f, f, sc: s2 }); }); });
  return res.sort((a, b) => b.sc - a.sc).slice(0, 6);
}
/* Barra global de busca/voz: fica fixa em todas as telas */
function BuscaGlobal({ sessao, irPara }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState([]);
  const [vozAuto, setVozAuto] = useState(() => { try { return localStorage.getItem('osm_vozAuto') !== '0'; } catch { return true; } });
  const [aberta, setAberta] = useState(false);
  const [exp, setExp] = useState(false);
  const [erroOk, setErroOk] = useState(() => { try { return localStorage.getItem('osm_vozErroOk') || ''; } catch { return ''; } });
  useEffect(() => { const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => { const l = s.docs.map(d => ({ id: d.id, ...d.data() })); setLista(l); if (!window.__listaOS || !window.__listaOS.length || window.__listaOS.length !== l.length) window.__listaOS = l; }, () => {}); }, [sessao.empresaId]);
  const executar = (t) => { const x = String(t || '').replace(/[.?!]$/, '').trim(); if (!x) return; window.__listaOS = lista; if (acaoRapida(x)) { setQ(''); setAberta(false); } else { setQ(x); setAberta(true); } };
  /* Espera 1 s de silêncio depois da fala para executar */
  const bufFala = useRef(''); const tFala = useRef(null);
  const agendar = () => { clearTimeout(tFala.current); tFala.current = setTimeout(() => { const t = bufFala.current.trim(); bufFala.current = ''; if (t) executar(t); }, 1000); };
  const fala = useFala({ global: true, onInterim: (t) => { if (t && t.trim()) { setQ((bufFala.current + ' ' + t).trim()); setAberta(true); agendar(); } }, onFinal: (t) => { bufFala.current = (bufFala.current + ' ' + t).trim(); setQ(bufFala.current); setAberta(true); agendar(); } });
  const autoRef = useRef(vozAuto); autoRef.current = vozAuto; const ouvRef = useRef(false); ouvRef.current = fala.ouvindo; const pausadaRef = useRef(false);
  useEffect(() => { window.__vozGlobal = { pausar: () => { if (ouvRef.current) { pausadaRef.current = true; fala.parar(); } }, retomar: () => { if (pausadaRef.current && autoRef.current) { pausadaRef.current = false; fala.iniciar(); } } };
    const ligar = () => { if (autoRef.current && !ouvRef.current && !pausadaRef.current) fala.iniciar(); };
    const t = setTimeout(ligar, 600);
    /* O Chrome no PC só libera o microfone depois de um clique/tecla: liga no primeiro toque */
    const g = (e) => { if (e.target && e.target.closest && e.target.closest('.bg-barra')) return; ligar(); };
    window.addEventListener('pointerdown', g, true); window.addEventListener('keydown', g, true);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', g, true); window.removeEventListener('keydown', g, true); }; }, []);
  const tog = () => { const v = !(vozAuto && fala.ouvindo); setVozAuto(v); autoRef.current = v; try { localStorage.setItem('osm_vozAuto', v ? '1' : '0'); } catch {} if (v) fala.iniciar(); else fala.parar(); };
  const nq = norm(q);
  const telas = q ? acharTelas(q) : [];
  const oss = nq.length >= 2 ? lista.filter(o => norm(`${numOS(o)} ${o.numeroAntigo || ''} ${o.cliente?.nome} ${o.cliente?.obra || ''} ${(o.ambientes || []).map(a => a.nome).join(' ')}`).includes(nq)).slice(0, 6) : [];
  const voz1 = !oss.length && q ? acharOSFala(lista, q) : null; const ossV = voz1 ? [voz1] : oss;
  const cliMap = {}; ossV.forEach(o => { const c = nomePadrao(o.cliente?.nome || ''); if (c) cliMap[c] = 1; });
  return html`<div class=${'bg-barra' + (fala.ouvindo ? ' ouv' : '') + (aberta && q ? ' com-res' : '') + (exp || q ? ' exp' : '')}>
    <button class=${'bg-bolha' + (fala.ouvindo ? ' on' : '')} title="Buscar / falar" onClick=${() => { setExp(true); setTimeout(() => document.querySelector('.bg-inp')?.focus(), 60); }}>${fala.ouvindo ? '🎙' : '🔍'}</button>
    ${aberta && q && (telas.length || ossV.length) ? html`<div class="bg-res">
      ${ossV.map(o => html`<button key=${o.id} class="bg-os" onClick=${() => { setQ(''); setAberta(false); window.__abrirOS && window.__abrirOS(o.id); }}><b>${numOS(o)}</b> ${nomePadrao(o.cliente?.nome)} <small>${nomePadrao((o.ambientes || []).map(a => a.nome).join(', '))}</small></button>`)}
      ${Object.keys(cliMap).length > 0 && html`<div class="bg-chips">${Object.keys(cliMap).map(c => html`<button key=${c} class="bt-chip bt-cli" onClick=${() => { setQ(''); setAberta(false); window.__buscaOS = c; (window.__irPara || irPara)('os'); }}>👤 Todas de ${c}</button>`)}</div>`}
      ${telas.length > 0 && html`<div class="bg-chips">${telas.map((x, i) => html`<button key=${i} class="bt-chip" onClick=${() => { setQ(''); setAberta(false); (window.__irPara || irPara)(x.aba); }}>${x.t}</button>`)}</div>`}
    </div>` : null}
    ${fala.erro && fala.erro !== erroOk && html`<div class="bg-erro">🎤 ${fala.erro} <button class="bg-erro-x" title="Fechar aviso" onPointerDown=${e => e.stopPropagation()} onClick=${() => { setErroOk(fala.erro); try { localStorage.setItem('osm_vozErroOk', fala.erro); } catch {} }}>✕</button></div>`}
    <div class="bg-linha">
      <button class=${'bg-mic' + (fala.ouvindo ? ' on' : '')} title=${vozAuto ? 'Voz ligada — toque para desligar' : 'Voz desligada — toque para ligar'} onClick=${tog}>${fala.ouvindo ? '🎙' : '🎤'}</button>
      <input class="bg-inp" placeholder=${fala.ouvindo ? 'Ouvindo… fale o que quer abrir' : 'Buscar OS, cliente, tela…'} value=${q} onFocus=${() => setAberta(true)} onInput=${e => { setQ(e.target.value); setAberta(true); }} onKeyDown=${e => { if (e.key === 'Enter') executar(q); if (e.key === 'Escape') { setQ(''); setAberta(false); setExp(false); } }} onBlur=${() => setTimeout(() => { if (!document.activeElement?.closest?.('.bg-barra')) setExp(false); }, 200)} />
      ${q && html`<button class="bg-x" onClick=${() => { setQ(''); setAberta(false); setExp(false); }}>✕</button>`}
    </div>
  </div>`;
}
/* Etapas com códigos trocados (ex.: "Projeto" gravado como concluída) quebram % e avanços. Corrige com 1 toque. */
const SEMANT = ['elaboracao', 'projetos', 'producao', 'liberacao', 'montagem', 'concluida'];
function etapasTrocadas(et) {
  if (!Array.isArray(et) || et.length < 2) return null;
  const novoV = (x, i) => i === 0 ? 'elaboracao' : i === et.length - 1 ? 'concluida' : /projet/i.test(x.nome) ? 'projetos' : /produ/i.test(x.nome) ? 'producao' : /libera/i.test(x.nome) ? 'liberacao' : /montag/i.test(x.nome) ? 'montagem' : (SEMANT.includes(x.v) ? 'et_' + rand(5) : x.v);
  const usados = new Set(); const map = {}; let troca = false;
  et.forEach((x, i) => { let v = novoV(x, i); if (usados.has(v)) v = 'et_' + rand(5); usados.add(v); map[x.v] = v; if (v !== x.v) troca = true; });
  return troca ? map : null;
}
function AvisoEtapas({ sessao, toast }) {
  const [rodando, setRodando] = useState(false);
  const map = etapasTrocadas(window.__etapasCfg);
  if (!map || sessao.papel !== 'admin') return null;
  const corrigir = async () => { setRodando(true);
    try { const M = F().fsMod; const novo = window.__etapasCfg.map(x => ({ ...x, v: map[x.v] || x.v }));
      const oss = (await M.getDocs(col('empresas', sessao.empresaId, 'os'))).docs;
      for (let i = 0; i < oss.length; i += 400) { const b = M.writeBatch(F().db); oss.slice(i, i + 400).forEach(d => { const o = d.data(); if (map[o.status] && map[o.status] !== o.status) b.update(d.ref, { status: map[o.status], statusHist: (o.statusHist || []).map(h => ({ ...h, st: map[h.st] || h.st })) }); }); await b.commit(); }
      await M.updateDoc(docRef('empresas', sessao.empresaId), { etapasOS: novo }); toast('Etapas corrigidas.', 'ok');
    } catch (e) { toast('Não corrigiu: ' + e.message, 'erro'); }
    setRodando(false); };
  return html`<div class="warn-box row" style=${{ justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}><span>⚠ As etapas da OS estão com códigos internos trocados (por isso aparece 100% ou a OS some ao avançar). Toque em Corrigir — os nomes e a ordem das etapas não mudam.</span><button class="btn btn-primary btn-sm" disabled=${rodando} onClick=${corrigir}>${rodando ? 'Corrigindo…' : '🔧 Corrigir'}</button></div>`;
}
/* Alerta em tela cheia: orçamentos pedidos aos parceiros sem resposta — cobrar */
function AlertaCobranca({ sessao }) {
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const checar = () => {
      const agora = Date.now(); let ad = 0; try { ad = Number(localStorage.getItem('osm_cobrar_adiar') || 0); } catch {}
      if (agora < ad) return;
      const l = [];
      (window.__listaOS || []).filter(o => !osConcluida(o)).forEach(o => parceirosDaOS(o).forEach(p => {
        if (p.st !== 'aguard_orc') return;
        const h = (p.hist || []).slice().reverse().find(x => x.st === p.st); const desde = h?.em ? new Date(h.em).getTime() : 0;
        if (desde && agora - desde < 864e5) return;
        l.push({ o, p, desde });
      }));
      if (!l.length) return;
      setItens(l); setAberto(true);
      try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') { const n = new Notification('Gestão Pró — cobrar parceiros', { body: l.length + ' orçamento(s) pendente(s): ' + l.slice(0, 3).map(x => x.p.t + ' (' + numOS(x.o) + ')').join(', '), requireInteraction: true, tag: 'cobrar' }); n.onclick = () => { window.focus(); n.close(); }; } } catch {}
    };
    try { if ('Notification' in window && Notification.permission === 'default') { const pedir = () => { Notification.requestPermission(); window.removeEventListener('pointerdown', pedir); }; window.addEventListener('pointerdown', pedir); } } catch {}
    const t1 = setTimeout(checar, 60000), t2 = setInterval(checar, 30 * 60000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, []);
  if (!aberto || !itens.length) return null;
  const adiar = (h) => { try { localStorage.setItem('osm_cobrar_adiar', String(Date.now() + h * 36e5)); } catch {} setAberto(false); };
  return ReactDOM.createPortal(html`<div class="cobrar-full"><div class="cobrar-caixa">
    <div class="cobrar-ic">📣</div>
    <h2>Pendências com parceiros</h2>
    <p>Tem ${itens.length} orçamento(s) pedido(s) sem resposta há mais de 1 dia — cobre o parceiro. Sem isso a OS não avança.</p>
    <div class="cobrar-lista">${itens.slice(0, 12).map((x, i) => html`<button key=${i} onClick=${() => { setAberto(false); window.__abrirOS && window.__abrirOS(x.o.id); }}><b>${x.p.ic} ${x.p.t}</b> · ${infoSt(x.p.st)[2]}${x.desde ? ' há ' + durTxt(Date.now() - x.desde) : ''}<small>${numOS(x.o)} · ${nomePadrao(x.o.cliente?.nome)}</small></button>`)}</div>
    <div class="row" style=${{ gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}><button class="btn" onClick=${() => adiar(2)}>Lembrar em 2 h</button><button class="btn" onClick=${() => adiar(24)}>Amanhã</button></div>
  </div></div>`, document.body);
}
/* ---------- Exportar OS: Word (.doc) e Excel (.xlsx) ---------- */
function linhasExportOS(os) {
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const R = [];
  (os.ambientes || []).forEach(a => (a.moveis || []).forEach(m => R.push({ Ambiente: nomePadrao(a.nome), Móvel: nomePadrao(m.nome), Qtd: Number(m.quantidade) || 1, Largura: m.largura || '', Altura: m.altura || '', Profundidade: m.profundidade || '', Caixa: mdf(m.mdfCaixa), Frente: mdf(m.mdfFrente), Fita: m.fitaBorda || '', Portas: m.portas || '', Gavetas: m.gavetas || '', Puxador: m.puxador || '', Iluminação: m.iluminacao || '', Ferragens: (m.ferragens || []).map(f => (f.quantidade ? f.quantidade + '× ' : '') + [f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' ')).join('; '), Observações: m.observacoes || '' })));
  return R;
}
function baixar(nome, blob) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
function exportarOS(os, tipo, empresa) {
  const base = (numOS(os) + ' ' + (nomePadrao(os.cliente?.nome) || '')).trim().replace(/[\\/:*?"<>|]/g, '');
  const R = linhasExportOS(os);
  const esp = (os.ambientes || []).map(a => ({ amb: nomePadrao(a.nome), g: gruposEspec(a.padrao || os.padrao) }));
  if (tipo === 'excel') {
    const wb = XLSX.utils.book_new();
    const cab = [['Ordem de Serviço', numOS(os)], ['Cliente', nomePadrao(os.cliente?.nome) || ''], ['Telefone', os.cliente?.telefone || ''], ['Endereço de montagem', os.cliente?.enderecoMontagem || os.cliente?.endereco || ''], ['Entrega', os.prazoEntrega || ''], ['Observações gerais', os.observacoesGerais || '']];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cab), 'OS');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(R.length ? R : [{ Móvel: '' }]), 'Móveis');
    const E = []; esp.forEach(({ amb, g }) => g.forEach(([, t, , l]) => l.forEach(([k, v]) => E.push({ Ambiente: amb, Categoria: t, Item: k, Especificação: v }))));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(E.length ? E : [{ Categoria: '' }]), 'Especificações');
    XLSX.writeFile(wb, base + '.xlsx'); return;
  }
  const e = (t) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cols = ['Móvel', 'Qtd', 'Largura', 'Altura', 'Profundidade', 'Caixa', 'Frente', 'Puxador', 'Ferragens', 'Observações'];
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(base)}</title><style>body{font-family:Calibri,Arial;font-size:11pt}h1{font-size:18pt;margin:0;color:#1f2937}h2{font-size:13pt;color:#b45309;border-bottom:2px solid #b45309;margin-top:16pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:3pt 5pt;font-size:9.5pt;vertical-align:top}th{background:#1f2937;color:#fff}.k{color:#78716c}</style></head><body>
    <p class="k">${e(empresa || '')} · Ordem de Serviço</p><h1>${e(nomePadrao((os.ambientes || []).map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo) || 'OS')} — ${e(numOS(os))}</h1>
    <p><b>Cliente:</b> ${e(nomePadrao(os.cliente?.nome))} &nbsp; <b>Telefone:</b> ${e(os.cliente?.telefone)}<br><b>Endereço de montagem:</b> ${e(os.cliente?.enderecoMontagem || os.cliente?.endereco)}<br><b>Entrega:</b> ${e(os.prazoEntrega)}</p>
    ${esp.map(({ amb, g }) => `<h2>${e(amb || 'Conjunto')}</h2>${g.length ? `<table><tr><th>Categoria</th><th>Especificação</th></tr>${g.map(([, t, , l]) => l.map(([k, v]) => `<tr><td><b>${e(t)}</b>${k ? ' · ' + e(k) : ''}</td><td>${e(v)}</td></tr>`).join('')).join('')}</table><br>` : ''}
      <table><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${R.filter(r => r.Ambiente === amb).map(r => `<tr>${cols.map(c => `<td>${e(c === 'Móvel' ? r[c] : r[c])}</td>`).join('')}</tr>`).join('')}</table>`).join('')}
    ${os.observacoesGerais ? `<h2>Observações gerais</h2><p>${e(os.observacoesGerais)}</p>` : ''}</body></html>`;
  baixar(base + '.doc', new Blob(['﻿' + doc], { type: 'application/msword' }));
}
/* ---------- Menu lateral (estilo Conta Azul) ---------- */
function MenuLateral({ abas, aba, irPara, logo, empresa, aberto, setAberto }) {
  const [exp, setExp] = useState(() => secaoDe(aba)[0]);
  useEffect(() => { setExp(secaoDe(aba)[0]); }, [aba]);
  useEffect(() => { window.__abrirSecao = (k) => { setExp(k); if (window.innerWidth <= 900) setAberto(true); }; }, []);
  const secs = SECOES.map(([k, t, cor, vs]) => [k, t, cor, vs.map(v => abas.find(a => a.v === v)).filter(Boolean)]).filter(x => x[3].length);
  const ir = (v) => { irPara(v); setAberto(false); };
  return html`${aberto && html`<div class="side-fundo" onClick=${() => setAberto(false)}></div>`}
  <aside class=${'side' + (aberto ? ' aberto' : '')}>
    <div class="side-brand">${logo ? html`<img src=${logo} alt="logo" />` : html`<div class="brand-mark">GP</div>`}<div><b class="notr">Gestão Pró</b><small class="notr">${empresa}</small></div><${IdiomaRapido} /></div>
    <nav class="side-nav">
      ${secs.map(([k, t, cor, subs]) => { const ativo = secaoDe(aba)[0] === k; const ic = t.split(' ')[0], nome = t.replace(/^\S+\s/, '');
        if (subs.length === 1) return html`<button key=${k} data-aba=${subs[0].v} data-sec=${k} class=${'side-it' + (ativo ? ' on' : '')} onClick=${() => ir(subs[0].v)}><span class="side-ic">${ic}</span><span class="side-t">${nome}</span></button>`;
        const ab = exp === k;
        return html`<div key=${k} class=${'side-grp' + (ab ? ' ab' : '')}>
          <button data-sec=${k} class=${'side-it' + (ativo && !ab ? ' on' : '')} onClick=${() => setExp(ab ? '' : k)}><span class="side-ic">${ic}</span><span class="side-t">${nome}</span><span class="side-chev">›</span></button>
          ${ab && html`<div class="side-subs">${subs.map((a, i) => html`<button key=${a.v} data-aba=${a.v} style=${{ animationDelay: i * 35 + 'ms' }} class=${'side-sub' + (aba === a.v ? ' on' : '')} onClick=${() => ir(a.v)}><span>${a.i}</span>${a.t}</button>`)}</div>`}
        </div>`; })}
    </nav>
  </aside>`;
}
const PROFS = { marceneiro: { nome: 'Marceneiro', item: '📏' }, montador: { nome: 'Montador', item: '🔧' }, projetista: { nome: 'Projetista / Arquiteto', item: '📐' }, vendedor: { nome: 'Vendedor', item: '📋' }, gerente: { nome: 'Gerente', item: '💼' }, pintor: { nome: 'Pintor', item: '🖌️' }, engenheiro: { nome: 'Engenheiro', item: '🦺' }, motorista: { nome: 'Motorista / Entregas', item: '🚚' }, serralheiro: { nome: 'Serralheiro', item: '🔥' }, eletricista: { nome: 'Eletricista', item: '💡' } };
/* ---------- Idiomas: PT / EN / ES (tradução automática da tela, troca por configuração, voz ou escrita) ---------- */
const I18N = (() => {
  const LOC = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
  const ler = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
  let lang = ler('osm_lang', 'pt'); if (!LOC[lang]) lang = 'pt';
  const dic = { en: {}, es: {} }; ['en', 'es'].forEach(l => { try { Object.assign(dic[l], JSON.parse(localStorage.getItem('osm_i18n_' + l) || '{}')); } catch {} });
  const pend = new Set(); let tmr = null, ocupado = false, remotoLido = {};
  const PULA = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'NOSCRIPT', 'SVG']);
  let FONTE = ''; try { fetch(document.querySelector('script[src*="app.js"]')?.src || '/app.js').then(r => r.text()).then(t => { FONTE = t; if (lang !== 'pt') { restaurar(); varrer(document.body); } }); } catch {}
  const vale = (t) => { const x = t.trim(); return x.length > 1 && !/^[A-Z0-9]{1,4}$/.test(x) && !!FONTE && FONTE.includes(x) && x.length <= 220 && /[A-Za-zÀ-ú]{2}/.test(x) && !/^[\w.+-]+@[\w.-]+$/.test(x) && !/^https?:/.test(x); };
  const pular = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (PULA.has(e.tagName) || e.isContentEditable || (e.classList && (e.classList.contains('notr') || e.classList.contains('cm-content') || e.classList.contains('nm') || e.classList.contains('avatar')))) return true; } return false; };
  const tradDe = (pt) => { const k = pt.trim(); const t = dic[lang][k]; if (t == null) { pend.add(k); agendar(); return null; } const i = pt.indexOf(k); return pt.slice(0, i) + t + pt.slice(i + k.length); };
  const aplicarNo = (n) => { if (n.nodeType !== 3) return; if (n.__tr != null && n.nodeValue === n.__tr) return; if (!vale(n.nodeValue) || pular(n.parentElement)) return; n.__pt = n.nodeValue; n.__tr = null;
    if (lang === 'pt') return; const t = tradDe(n.__pt); if (t != null) { n.__tr = t; n.nodeValue = t; } };
  const ATR = ['placeholder', 'title', 'aria-label'];
  const aplicarAtr = (el) => { if (!el.getAttribute || pular(el.parentElement || el) && !['INPUT', 'TEXTAREA'].includes(el.tagName)) return; ATR.forEach(a => { const v = el.getAttribute(a); if (!v) return; const keyPt = 'data-pt-' + a, keyTr = 'data-tr-' + a;
    if (el.getAttribute(keyTr) === v) return; if (!vale(v)) return; el.setAttribute(keyPt, v); if (lang === 'pt') return; const t = tradDe(v); if (t != null) { el.setAttribute(keyTr, t); el.setAttribute(a, t); } }); };
  const varrer = (raiz) => { if (!raiz) return; if (raiz.nodeType === 3) return aplicarNo(raiz); if (raiz.nodeType !== 1 || PULA.has(raiz.tagName) && !['INPUT', 'TEXTAREA'].includes(raiz.tagName)) { if (raiz.nodeType === 1) aplicarAtr(raiz); return; }
    aplicarAtr(raiz); const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n.nodeType === 3) aplicarNo(n); else aplicarAtr(n); } };
  const restaurar = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { if (n.__pt != null && n.__tr != null && n.nodeValue === n.__tr) n.nodeValue = n.__pt; n.__tr = null; } else ATR.forEach(a => { const p = n.getAttribute('data-pt-' + a); if (p != null && n.getAttribute(a) === n.getAttribute('data-tr-' + a)) n.setAttribute(a, p); n.removeAttribute('data-tr-' + a); }); } };
  const empresaDoc = () => { const E = window.__empresaIdI18n; const f = window.__fb; return E && f ? f.fsMod.doc(f.db, 'empresas', E, 'i18n', lang) : null; };
  const lerRemoto = async () => { if (lang === 'pt' || remotoLido[lang]) return; const r = empresaDoc(); if (!r) return; remotoLido[lang] = true; try { const s = await window.__fb.fsMod.getDoc(r); const d = s.exists() ? JSON.parse(s.data().d || '{}') : {}; Object.assign(dic[lang], d); varrer(document.body); } catch {} };
  const salvar = async (l, novos) => { try { localStorage.setItem('osm_i18n_' + l, JSON.stringify(dic[l])); } catch {} const E = window.__empresaIdI18n, f = window.__fb; if (!E || !f) return;
    try { const r = f.fsMod.doc(f.db, 'empresas', E, 'i18n', l); const s = await f.fsMod.getDoc(r); const d = s.exists() ? JSON.parse(s.data().d || '{}') : {}; Object.assign(d, novos); Object.assign(dic[l], d); await f.fsMod.setDoc(r, { d: JSON.stringify(d), em: new Date().toISOString() }); } catch {} };
  function agendar() { if (tmr) return; tmr = setTimeout(rodar, 500); }
  async function rodar() { tmr = null; if (ocupado || lang === 'pt' || !pend.size || typeof chamarIA !== 'function' || !window.__fb?.auth?.currentUser) return; ocupado = true; const l = lang;
    const lote = [...pend].filter(k => dic[l][k] == null).slice(0, 120); lote.forEach(k => pend.delete(k));
    try { if (lote.length) { let t = [];
        try { for (let i = 0; i < lote.length; i += 30) { const parte = lote.slice(i, i + 30); const q = parte.map(x => x.replace(/\n/g, ' ')).join('\n'); const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=' + l + '&dt=t&q=' + encodeURIComponent(q)); const j = await r.json(); const out = (j[0] || []).map(x => x[0] || '').join('').split('\n');
            if (out.length !== parte.length) throw new Error('n'); t.push(...out.map((x, k) => { let y = x.trim(); if (/\bOSs?\b/.test(parte[k])) y = y.replace(/\bSOs?\b/g, 'OS'); return y; })); } }
        catch { t = []; const r = await chamarIA('traduzir', { lang: l, textos: lote }); t = (r && (r.resultado || r).t) || []; } const novos = {}; lote.forEach((k, i) => { if (typeof t[i] === 'string' && t[i].trim()) { dic[l][k] = t[i].trim(); novos[k] = dic[l][k]; } }); await salvar(l, novos); if (l === lang) varrer(document.body); } }
    catch (e) { lote.forEach(k => pend.add(k)); ocupado = false; setTimeout(agendar, 15000); return; }
    ocupado = false; if (pend.size) agendar(); }
  let obs = null;
  const ligar = () => { if (obs) return; obs = new MutationObserver(ms => { if (lang === 'pt') { ms.forEach(m => { if (m.type === 'characterData') m.target.__tr = null; }); return; } for (const m of ms) { if (m.type === 'characterData') aplicarNo(m.target); else if (m.type === 'attributes') aplicarAtr(m.target); else m.addedNodes.forEach(varrer); } });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATR }); };
  const NOMES = { pt: 'Português', en: 'English', es: 'Español' };
  const AVISO = { pt: '🌐 Idioma: Português', en: '🌐 Language: English', es: '🌐 Idioma: Español' };
  const setLang = (l, origem) => { if (!LOC[l] || l === lang) return; lang = l; try { localStorage.setItem('osm_lang', l); } catch {} document.documentElement.lang = LOC[l];
    if (l === 'pt') restaurar(); else { lerRemoto(); varrer(document.body); } window.dispatchEvent(new CustomEvent('lang-mudou', { detail: l }));
    if (origem) { const d = document.createElement('div'); d.className = 'lang-aviso notr'; d.textContent = AVISO[l] + (origem === 'voz' ? ' 🎙' : origem === 'texto' ? ' ⌨️' : ''); document.body.appendChild(d); setTimeout(() => d.remove(), 2600); } };
  const PAL = { pt: 'o os as é que onde como abrir mostrar você com do da não está olá oi quero preciso fazer obrigado tela cliente agora isso esse essa minha meu por favor também cadê'.split(' '),
    en: 'the and is are what where how open show you with of to my please this that want need hello hi thanks can could would find go client screen now it i me your'.split(' '),
    es: 'el la los las es qué que dónde donde cómo como abrir mostrar usted con del y está hola quiero necesito hacer gracias pantalla cliente ahora eso esta mi por favor también puedes'.split(' ') };
  const detectar = (txt) => { const w = String(txt || '').toLowerCase().normalize('NFC').match(/[a-zà-úñ]+/g) || []; if (w.length < 2) return null; const sc = {};
    for (const l of ['pt', 'en', 'es']) sc[l] = w.reduce((a, x) => a + (PAL[l].includes(x) ? 1 : 0), 0);
    if (/[ñ¿¡]/.test(txt)) sc.es += 2; if (/[ãõç]/.test(txt)) sc.pt += 2;
    const best = Object.entries(sc).sort((a, b) => b[1] - a[1])[0]; if (best[0] !== lang && best[1] >= 2 && best[1] - sc[lang] >= 2) { setLang(best[0], 'auto'); return best[0]; } return null; };
  const iniciar = (empresaId) => { window.__empresaIdI18n = empresaId; document.documentElement.lang = LOC[lang]; ligar(); if (lang !== 'pt') { lerRemoto(); varrer(document.body); } };
  // escrita: barras de busca/pergunta e campos marcados com data-lang-detect
  let dt = null; document.addEventListener('input', (e) => { const el = e.target; if (!el || !el.matches || !el.matches('.bg-inp, .masc-bal input, .assist-inp, [data-lang-detect]')) return; clearTimeout(dt); dt = setTimeout(() => { if (detectar(el.value)) {} }, 1200); }, true);
  return { get lang() { return lang; }, locale: () => LOC[lang], setLang, detectar: (t) => { const r = detectar(t); return r; }, iniciar, NOMES };
})();
window.__I18N = I18N;
function IdiomaCfg() {
  const [l, setL] = useState(I18N.lang);
  useEffect(() => { const h = (e) => setL(e.detail); window.addEventListener('lang-mudou', h); return () => window.removeEventListener('lang-mudou', h); }, []);
  return html`<div class="card page-card stack notr"><div class="sec-title">🌐 Idioma / Language / Idioma</div>
    <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}>${[['pt', '🇧🇷 Português'], ['en', '🇺🇸 English'], ['es', '🇪🇸 Español']].map(([k, t]) => html`<button key=${k} class=${'btn' + (l === k ? ' btn-primary' : '')} onClick=${() => I18N.setLang(k, 'cfg')}>${t}</button>`)}</div>
    <small class="dim">Também troca sozinho quando você fala ou escreve em outro idioma na busca ou no ajudante. · Also switches automatically when you speak or type in another language. · También cambia solo cuando hablas o escribes en otro idioma.</small></div>`;
}
function IdiomaRapido() {
  const [l, setL] = useState(I18N.lang);
  useEffect(() => { const h = (e) => setL(e.detail); window.addEventListener('lang-mudou', h); return () => window.removeEventListener('lang-mudou', h); }, []);
  return html`<select class="lang-sel notr" title="Idioma" value=${l} onChange=${e => I18N.setLang(e.target.value, 'cfg')}><option value="pt">🇧🇷 PT</option><option value="en">🇺🇸 EN</option><option value="es">🇪🇸 ES</option></select>`;
}
/* ---------- Mascote guia (bonequinho 3D que anda e mostra onde ficam as coisas) ---------- */
function Mascote() {
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - 120, y: window.innerHeight - 170 }));
  const [fala, setFala] = useState(''), [andando, setAndando] = useState(false), [vira, setVira] = useState(false), [menu, setMenu] = useState(false), [q, setQ] = useState('');
  const [oculto, setOculto] = useState(() => { try { return localStorage.getItem('osm_mascote') === '0'; } catch { return false; } });
  const ler = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
  const [cfgV, setCfgV] = useState(0); const [pensa, setPensa] = useState(false);
  useEffect(() => { const h = (e) => setPensa(!!e.detail); window.addEventListener('masc-pensa', h); return () => window.removeEventListener('masc-pensa', h); }, []);
  useEffect(() => { const h = () => setCfgV(v => v + 1); window.addEventListener('masc-cfg', h); return () => window.removeEventListener('masc-cfg', h); }, []);
  const nome = (window.__mascCfg || {}).nome || 'Zé', rosto = (window.__mascCfg || {}).rosto || '', prof = (window.__mascCfg || {}).prof || 'marceneiro';
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const casa = () => { setMenu(false); setFala(''); destacar(null); irPara(window.innerWidth - 120, window.innerHeight - 170); };
  const alvoRef = useRef(null), posRef = useRef(pos); posRef.current = pos;
  const destacar = (el) => { document.querySelectorAll('.masc-alvo').forEach(x => x.classList.remove('masc-alvo')); if (el) { el.classList.add('masc-alvo'); alvoRef.current = el; setTimeout(() => el.classList.remove('masc-alvo'), 4500); } };
  const pegadas = (ms) => { let n = 0; const id = setInterval(() => { const el = document.querySelector('.masc .masc-corpo'); if (!el) return; const r = el.getBoundingClientRect(); const p = document.createElement('div'); p.className = 'pegada'; p.textContent = '👣'; p.style.left = (r.left + r.width / 2 + (n % 2 ? 5 : -9)) + 'px'; p.style.top = (r.bottom - 6 + (n % 2 ? 3 : 0)) + 'px'; document.body.appendChild(p); n++; setTimeout(() => p.remove(), 1800); }, 170); setTimeout(() => clearInterval(id), ms); };
  const irPara = (x, y) => new Promise(res => { pegadas(Math.min(2200, 400 + Math.hypot(x - posRef.current.x, y - posRef.current.y) / 0.65)); const p = posRef.current; const d = Math.hypot(x - p.x, y - p.y); setVira(x < p.x); setAndando(true); setPos({ x, y, t: Math.min(2.2, 0.4 + d / 650) }); setTimeout(() => { setAndando(false); res(); }, Math.min(2200, 400 + d / 0.65)); });
  const mostrar = async (el, texto) => { if (!el) { setFala(texto); return; } el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await new Promise(r => setTimeout(r, 350)); const r = el.getBoundingClientRect();
    let x = r.right + 8, y = r.top + r.height / 2 - 60; if (x > window.innerWidth - 90) x = Math.max(8, r.left - 90); y = Math.max(8, Math.min(window.innerHeight - 150, y));
    setFala(''); await irPara(x, y); destacar(el); setFala(texto); };
  const onde = async (txt) => { const t = acharTelas(txt); if (!t.length) return setFala('Não achei "' + txt + '". Tente outra palavra 🙂');
    const aba = t[0].aba; const sec = secaoDe(aba)[0]; window.__abrirSecao && window.__abrirSecao(sec); await new Promise(r => setTimeout(r, 300));
    const el = document.querySelector('.side [data-aba="' + aba + '"]') || document.querySelector('.side [data-sec="' + sec + '"]');
    await mostrar(el, '👉 ' + t[0].t + ' fica aqui! Toque para abrir.'); };
  const tour = async () => { setMenu(false);
    const passos = [['.side-nav', 'Este é o menu: todas as telas, separadas por seção.'], ['.bg-barra', 'Aqui você busca ou fala: OS, cliente, tela…'], ['.ini-c .btn-primary, .page-head, .card', 'Este é o conteúdo da tela atual.'], ['.ficha-acoes, .rodape-escuro', 'Aqui ficam as ações principais.']];
    for (const [sel, txt] of passos) { const el = document.querySelector(sel); if (!el || !el.getBoundingClientRect().width) continue; await mostrar(el, txt); await new Promise(r => setTimeout(r, 2600)); }
    setFala('Pronto! Me toque quando precisar. 😉'); };
  useEffect(() => { window.__mascote = { mostrar: (sel, t) => mostrar(typeof sel === 'string' ? document.querySelector(sel) : sel, t), onde };
    const h = () => setPos(p => ({ x: Math.min(p.x, window.innerWidth - 90), y: Math.min(p.y, window.innerHeight - 150) })); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { if (!fala) return; const t = setTimeout(() => setFala(''), 7000); return () => clearTimeout(t); }, [fala]);
  if (oculto) return ReactDOM.createPortal(html`<button class="masc-volta" title="Chamar o ajudante" onClick=${() => { setOculto(false); try { localStorage.setItem('osm_mascote', '1'); } catch {} }}>🧑‍🔧</button>`, document.body);
  const longe = Math.hypot(pos.x - (window.innerWidth - 120), pos.y - (window.innerHeight - 170)) > 40;
  return ReactDOM.createPortal(html`<div class=${'masc' + (andando ? ' anda' : '') + (vira ? ' vira' : '') + (pos.x < 260 ? ' bal-dir' : '') + (pos.y < 340 ? ' bal-baixo' : '') + (pensa ? ' pensa' : '') + ' prof-' + prof + (rosto ? ' com-foto' : '')} style=${{ left: pos.x + 'px', top: pos.y + 'px', transitionDuration: (pos.t || 0) + 's' }}>
    ${(fala || menu) && html`<div class="masc-bal">${!menu && fala ? html`<div>${fala}<div style=${{ textAlign: 'right', marginTop: '4px' }}><button class="btn btn-sm btn-ghost" onClick=${casa}>🏠 Voltar para casa</button></div></div>` : ''}${menu ? html`<div class="stack" style=${{ gap: '6px' }}>
        <b>Oi! Sou o ${nome} 👷 Posso ajudar?</b>
        <button class="btn btn-sm btn-primary" onClick=${tour}>🗺 Me mostra esta tela</button>
        <button class="btn btn-sm" onClick=${() => { setMenu(false); window.__abrirAssist && window.__abrirAssist(); }}>💬 Fazer uma pergunta</button>
        <form class="row" style=${{ gap: '4px', flexWrap: 'nowrap' }} onSubmit=${e => { e.preventDefault(); setMenu(false); onde(q); setQ(''); }}><input class="inp inp-sm" placeholder="Onde fica…? (ex: compras)" value=${q} onInput=${e => setQ(e.target.value)} /><button class="btn btn-sm">Ir</button></form>
        <button class="btn btn-sm btn-ghost" onClick=${casa}>🏠 Voltar para casa</button>
</div>` : ''}</div>`}
    ${longe && !andando && html`<button class="masc-casa" title="Voltar ao ponto de partida" onClick=${casa}>🏠</button>`}
    <div class="masc-corpo" onClick=${() => { setMenu(m => !m); setFala(''); }} title=${nome + ', o ajudante'}>
      <div class="masc-pesc"></div>
      ${rosto ? html`<div class="masc-cab foto"><img src=${rosto} /><div class="masc-chapeu"></div></div>` : html`<div class="masc-cab hum"><div class="masc-orelha e"></div><div class="masc-orelha d"></div><div class="masc-cabelo"></div><div class="masc-sobr e"></div><div class="masc-sobr d"></div><div class="masc-olho e"></div><div class="masc-olho d"></div><div class="masc-nariz"></div><div class="masc-boca"></div><div class="masc-oculos"></div><div class="masc-chapeu"></div></div>`}
      <div class="masc-nome">${nome}</div>
      <div class="masc-tronco"><div class="masc-gola"></div><div class="masc-gravata"></div><div class="masc-avental"></div><div class="masc-cinto"></div><div class="masc-braco e"><div class="masc-mao"></div></div><div class="masc-braco d"><div class="masc-mao"></div><span class="masc-item">${(PROFS[prof] || PROFS.marceneiro).item}</span></div></div>
      <div class="masc-perna e"><div class="masc-sapato"></div></div><div class="masc-perna d"><div class="masc-sapato"></div></div>
      <div class="masc-sombra"></div>
    </div>
  </div>`, document.body);
}
function TelaInicio({ sessao, abrirOS, irPara }) {
  const listaRef = useRef(null);
  const [vozAuto, setVozAuto] = useState(false);
  const autoRef = useRef(vozAuto); autoRef.current = vozAuto;
  const falaB = useFala({ onInterim: (t) => { if (t && t.trim()) setBusca(t); }, onFinal: (t) => { const q = String(t).replace(/[.?!]$/, '').trim(); if (!autoRef.current) falaB.parar && falaB.parar();
    if (acaoRapida(q)) { setBusca(''); return; } const o = acharOSFala(listaRef.current || [], q); if (o) { setBusca(''); abrirOS(o.id); } else setBusca(q); } });
  useEffect(() => () => { try { falaB.parar(); } catch {} }, []);
  const togAuto = () => { const v = !vozAuto; setVozAuto(v); try { localStorage.setItem('osm_vozAuto', v ? '1' : '0'); } catch {} if (v) falaB.iniciar(); else falaB.parar(); };
  const [lista, setLista] = useState(null);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('osm_ini_vista') || 'compacto'; } catch { return 'compacto'; } });
  useEffect(() => { try { localStorage.setItem('osm_ini_vista', vista); } catch {} }, [vista]);
  const compacto = vista === 'compacto';
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [amb, setAmb] = useState('');
  listaRef.current = lista; window.__listaOS = lista;
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, [sessao.empresaId]);
  const os = lista || [];
  const st = (v) => os.filter(o => (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === v).length;
  const pct = (n) => os.length ? Math.round(n * 100 / os.length) + '% do fluxo' : '0% do fluxo';
  const nAtr = os.filter(atrasada).length;
  const tiles = [
    { t: 'Total', n: os.length, s: '100% da carteira', cls: '' },
    ...STATUS_OS.map(x => ({ t: x.t, n: st(x.v), s: pct(st(x.v)), cls: ({ elaboracao: '', projetos: 'tile-azul', producao: 'tile-teal', liberacao: 'tile-warn', montagem: 'tile-roxo', concluida: 'tile-ok' })[x.v] || 'tile-cust', f: x.v, cor: x.cor })),
    { t: 'Atrasadas', n: nAtr, s: nAtr ? 'Precisa de atenção' : 'Tudo em dia', cls: nAtr ? 'tile-danger' : '', f: 'atrasadas' },
  ];
  const filtradas = os.filter(o =>
    (!status || (status === 'atrasadas' ? atrasada(o) : (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === status)) &&
    (!amb || categoriasDaOS(o).includes(amb)) &&
    (!busca || norm(`${numOS(o)} ${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')}`).includes(norm(busca))));

  const togg = html`<div class="seg-mini ini-vistas">${[['compacto', '☰ Compacto'], ['cliente', '🎨 Por cliente'], ['kanban', '▥ Kanban'], ['detalhado', '▦ Detalhado']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}</div>`;
  const telasAch = busca ? acharTelas(busca) : [];
  const resTelas = telasAch.length > 0 && html`<div class="busca-telas">${telasAch.map((x, i) => html`<button key=${i} class="bt-chip" onClick=${() => { setBusca(''); irPara(x.aba); }}>${x.t}</button>`)}</div>`;
  const cabecalho = html`
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <b style=${{ fontSize: '17px' }}>Produção <span class="dim" style=${{ fontWeight: 400, fontSize: '13px' }}>${os.length} OSs</span></b>
        <button class="btn btn-primary btn-sm" onClick=${() => irPara('os')}>+ OS</button>
      </div>
      ${togg}
      <div><${BotaoMetricas} sessao=${sessao} /></div>
      <div class="ini-fluxo">
        ${tiles.filter(t => t.f).map(t => html`<button key=${t.t} class=${'ini-f ' + t.cls + (status === t.f ? ' sel' : '')} onClick=${() => setStatus(v => v === t.f ? '' : t.f)}><b>${lista === null ? '…' : t.n}</b><small>${t.t.replace(/^\d\. /, '').replace('Aguard. liberação', 'Liberação')}</small></button>`)}
      </div>
      <div class="row" style=${{ gap: '6px', flexWrap: 'nowrap' }}><input class="inp inp-sm" placeholder="🔍 Buscar OS, cliente, tela, função… ou fale" value=${busca} onInput=${e => setBusca(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && busca.trim()) { if (acaoRapida(busca) ) setBusca(''); } }} />
        <button class=${'btn btn-sm' + (falaB.ouvindo ? ' btn-mic-on pulse' : ' btn-teal')} onClick=${() => falaB.ouvindo ? falaB.parar() : (setBusca(''), falaB.iniciar())}>${falaB.ouvindo ? '■' : '🎤'}</button></div>${resTelas}`;
  if (vista === 'cliente') {
    const grupos = {};
    filtradas.filter(o => busca || status || !osConcluida(o)).forEach(o => { const k = norm(o.cliente?.nome) || '—'; (grupos[k] = grupos[k] || { nome: o.cliente?.nome || 'Sem cliente', oss: [] }).oss.push(o); });
    return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-clis">
        ${Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome)).map(g => { const c = corOS(g.oss[0]); const atr = g.oss.filter(atrasada).length; return html`
          <div key=${g.nome} class="ini-cli" style=${{ '--cc': c }}>
            <div class="ini-cli-top"><b>${nomePadrao(g.nome)}</b><span>${g.oss.length} ${g.oss.length === 1 ? 'OS' : 'OSs'}${atr ? html` · <em>⚠ ${atr}</em>` : ''}</span></div>
            <div class="ini-cli-oss">
              ${g.oss.map(o => { const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0]; return html`
                <button key=${o.id} class=${'ini-cli-os' + (atrasada(o) ? ' atras' : '')} onClick=${() => abrirOS(o.id)}>
                  <span class="mono">${numOS(o)}</span>
                  <span class="nm">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || o.ambienteResumo || '—'}</span>
                  ${o.parada ? html`<span class="chip mini chip-parada" title=${'Parada: ' + o.parada.motivo}>⏸ Parada</span>` : html`<span class=${x.c + ' mini'}>${x.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Liberação')}</span>`}
                  ${o.prazoEntrega && html`<small>🚚 ${o.prazoEntrega.slice(0, 5)}</small>`}
                </button>`; })}
            </div>
          </div>`; })}
      </div>
    </div>`;
  }
  if (vista === 'kanban') return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-kan">
        ${STATUS_OS.map(col => { const itens = filtradas.filter(o => (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === col.v); return html`
          <div key=${col.v} class=${'ini-kcol k-' + col.v}>
            <div class="ini-kh"><b>${col.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</b><span>${itens.length}</span></div>
            <div class="ini-kcards">
              ${itens.map(o => html`<button key=${o.id} class=${'ini-kc' + (atrasada(o) ? ' atras' : '')} style=${{ borderLeftColor: corOS(o) }} onClick=${() => abrirOS(o.id)}>
                <div class="row" style=${{ justifyContent: 'space-between', gap: '4px' }}><span class="mono">${numOS(o)}</span>${o.prazoEntrega && html`<small class=${atrasada(o) ? 'vermelho' : ''}>🚚 ${o.prazoEntrega.slice(0, 5)}</small>`}</div>
                <b>${o.cliente?.nome || '—'}</b>
                <small>${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ')}</small>
              </button>`)}
              ${!itens.length && html`<div class="dim" style=${{ fontSize: '12px', padding: '6px' }}>—</div>`}
            </div>
          </div>`; })}
      </div>
    </div>`;
  if (compacto) return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-lista">
        ${filtradas.length === 0 && lista !== null && html`<div class="vazio dim">Nenhuma OS.</div>`}
        ${filtradas.map(o => { const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0]; const at = atrasada(o); return html`
          <button key=${o.id} class=${'ini-l' + (at ? ' atras' : '')} style=${{ borderLeftColor: corOS(o) }} onClick=${() => abrirOS(o.id)}>
            <span class="ini-n">${numOS(o)}</span>
            <span class="ini-t"><b>${o.cliente?.nome || '—'}</b> <small>${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ')}</small></span>
            ${o.prazoEntrega && html`<span class=${'ini-p' + (at ? ' atras' : '')}>${o.prazoEntrega.slice(0, 5)}</span>`}
            <i class=${'ini-st st-' + x.v} title=${x.t}></i>
          </button>`; })}
      </div>
    </div>`;
  return html`
    <div class="fade-up stack" style=${{ gap: '16px' }}>
      <div class="row" style=${{ justifyContent: 'flex-end' }}>${togg}</div>
      <div class="card page-card row" style=${{ justifyContent: 'space-between' }}>
        <div>
          <div class="row" style=${{ gap: '10px' }}><span class="mini-mark">OS</span><h2 style=${{ fontSize: '24px' }}>Console de Produção</h2></div>
          <div class="dim">${sessao.empresaNome} • Gestão integrada de ordens de serviço e fabricação</div>
        </div>
        <div class="row">
          <button class="btn" onClick=${() => irPara('importar')}>Importar antigas</button>
          <button class="btn btn-primary" onClick=${() => irPara('os')}>+ Nova OS</button>
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <div class="sec-title">〰 Fluxo da produção</div>
          <span class="chip">${os.length} OSs cadastradas</span>
        </div>
        <div class="tiles">
          ${tiles.map(t => html`
            <button key=${t.t} class=${'tile ' + t.cls + (t.f && status === t.f ? ' sel' : '')} onClick=${() => t.f && setStatus(v => v === t.f ? '' : t.f)}>
              <div class="tile-t">${t.t}</div>
              <div class="tile-n mono">${lista === null ? '…' : t.n}</div>
              <div class="tile-s">${t.s}</div>
            </button>`)}
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div class="sec-title">📋 Ordens de serviço em carteira <span class="badge-dark">${filtradas.length}</span></div>
            <div class="dim">Identificação por número, cliente e ambiente</div>
          </div>
          <label class="row dim" style=${{ gap: '6px' }}>Status:
            <select id="ini-status" class="inp inp-sm" style=${{ width: 'auto' }} value=${status} onChange=${e => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              ${STATUS_OS.map(x => html`<option key=${x.v} value=${x.v}>${x.t}</option>`)}
              <option value="atrasadas">Atrasadas</option>
            </select>
          </label>
        </div>
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <input id="ini-busca" class="inp" style=${{ flex: '1 1 260px', maxWidth: '380px' }} placeholder="🔍 Buscar por nº da OS, cliente, ambiente ou obra…" value=${busca} onInput=${e => setBusca(e.target.value)} />
          <div class="row" style=${{ gap: '6px' }}>
            <span class="dim">Ambientes:</span>
            ${['', ...CATEG_AMB.map(c => c.t)].map(c => html`<button key=${c || 'todos'} class=${'pill' + (amb === c ? ' on' : '')} onClick=${() => setAmb(c)}>${c || 'Todos'}</button>`)}
          </div>
        </div>
        ${lista !== null && os.length === 0 ? html`
          <div class="vazio">
            <div style=${{ fontSize: '26px' }}>📋</div>
            <b>Nenhuma ordem de serviço cadastrada ainda</b>
            <div class="dim">Comece importando suas OSs antigas ou criando a primeira OS.</div>
            <div class="row" style=${{ justifyContent: 'center', marginTop: '8px' }}>
              <button class="btn btn-verde" onClick=${() => irPara('importar')}>Importar OSs antigas</button>
              <button class="btn btn-primary" onClick=${() => irPara('os')}>+ Nova OS</button>
            </div>
          </div>` : html`
          <div class="list">
            ${filtradas.length === 0 && lista !== null && html`<div class="vazio dim">Nenhuma OS com esses filtros.</div>`}
            ${filtradas.map(o => {
              const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0];
              return html`
                <div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => abrirOS(o.id)}>
                  <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
                  <div class="grow">
                    <div class="title">${o.cliente?.nome || 'Cliente não informado'}</div>
                    <div class="dim">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || 'Sem ambientes'}${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
                  </div>
                  ${categoriasDaOS(o).map(c => html`<span key=${c} class="chip">${c}</span>`)}
                  ${atrasada(o) && html`<span class="chip chip-danger">Atrasada</span>`}
                  <span class=${x.c}>${x.t}</span>
                </div>`;
            })}
          </div>`}
      </div>
    </div>`;
}

/* ---------- Configurações: etapas do processo (OS) e da produção (oficina) ---------- */
const STATUS_PADRAO = STATUS_OS.map(x => ({ ...x }));
const FAB_PADRAO = ETAPAS_FAB.map(x => [...x]);
const CHIP_CLS = { elaboracao: 'chip', projetos: 'chip chip-azul', producao: 'chip chip-teal', liberacao: 'chip chip-warn', montagem: 'chip chip-roxo', concluida: 'chip chip-ok' };
function aplicarEtapas(cfg) {
  if (Array.isArray(cfg?.gradesCfg) && cfg.gradesCfg.length) GRADES.splice(0, GRADES.length, ...cfg.gradesCfg.map(x => [x.k, x.t, x.rot || 'Pessoa', x.cor || '#78716c']));
  const st = Array.isArray(cfg?.etapasOS) && cfg.etapasOS.length >= 2 ? cfg.etapasOS : STATUS_PADRAO.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] }));
  STATUS_OS.splice(0, STATUS_OS.length, ...st.map((x, i) => ({ v: x.v, t: (i + 1) + '. ' + x.nome, c: CHIP_CLS[x.v] || 'chip', cor: x.cor })));
  st.forEach(x => { if (x.cor) COR_ST[x.v] = x.cor; });
  const fab = Array.isArray(cfg?.etapasFab) && cfg.etapasFab.length ? cfg.etapasFab.map(x => [x.k, x.nome, x.desc || '']) : FAB_PADRAO;
  ETAPAS_FAB.splice(0, ETAPAS_FAB.length, ...fab);
}
function MascoteCfg({ sessao, toast }) {
  const c = window.__mascCfg || {};
  const [nome, setNome] = useState(c.nome || 'Zé'), [rosto, setRosto] = useState(c.rosto || '');
  const [prof, setProf] = useState(c.prof || 'marceneiro');
  const foto = async (f) => { if (!f) return; try { setRosto(await imagemParaJpeg(f, 260)); } catch { toast('Não consegui ler a foto.', 'erro'); } };
  const salvar = async () => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { mascoteNome: nome.trim() || 'Zé', mascoteRosto: rosto, mascoteProf: prof }); toast('Ajudante atualizado em todos os aparelhos.', 'ok'); } catch (e) { toast(e.message, 'erro'); } };
  return html`<div class="card page-card stack"><div class="sec-title">👷 Ajudante (bonequinho)</div>
    <small class="dim">O nome e a foto valem para todos os aparelhos da empresa. A foto vira o rosto em caricatura.</small>
    <div class="row" style=${{ gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div class="masc-prev">${rosto ? html`<img src=${rosto} />` : html`<span>👷</span>`}</div>
      <input class="inp" style=${{ flex: 1, minWidth: '160px' }} placeholder="Nome do ajudante" value=${nome} onInput=${e => setNome(e.target.value)} />
      <label class="btn">📷 ${rosto ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" style=${{ display: 'none' }} onChange=${e => { foto(e.target.files[0]); e.target.value = ''; }} /></label>
      ${rosto && html`<button class="btn btn-ghost" onClick=${() => setRosto('')}>Tirar foto</button>`}
      <button class="btn btn-primary" onClick=${salvar}>Salvar</button></div>
    <span class="lbl">Profissão (define o uniforme)</span>
    <div class="masc-profs">${Object.entries(PROFS).map(([k, p]) => html`<button key=${k} class=${'masc-prof' + (prof === k ? ' on' : '')} onClick=${() => setProf(k)}><div class=${'masc-mini prof-' + k}><i class="mm-ch"></i><i class="mm-cab"></i><i class="mm-tr"></i><i class="mm-ca"></i></div><span>${p.item} ${p.nome}</span></button>`)}</div>
    <small class="dim">Toque em Salvar para aplicar.</small></div>`;
}
function DinaboxCfg({ sessao, toast }) {
  const [rod, setRod] = useState(false);
  return html`<div class="card page-card stack"><div class="sec-title">📦 Dinabox (projetos 3D, materiais e peças)</div>
    <small class="dim">Os dados do Dinabox entram sozinhos nas OS (pelo número no nome do lote): links 3D na aba Montagem, peças na aba 🧩 Peças e materiais direto na lista de compras. Última atualização: <b>${window.__dinaboxEm ? fmtData(window.__dinaboxEm) : 'nunca'}</b>.</small>
    <button class="btn btn-primary" style=${{ alignSelf: 'flex-start' }} disabled=${rod} onClick=${async () => { setRod(true); await sincronizarDinabox(sessao, toast, true); setRod(false); }}>${rod ? 'Buscando…' : '🔄 Buscar agora'}</button></div>`;
}
function SenhaLiberacaoCfg({ sessao, toast }) {
  const [a, setA] = useState(''), [b, setB] = useState('');
  const salvar = async () => { if (a.length < 4) return toast('Mínimo 4 caracteres.'); if (a !== b) return toast('As senhas não conferem.');
    try { const h = await hashTxt(a); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { senhaLiberacao: h }); window.__senhaLib = h; setA(''); setB(''); toast('Senha de liberação salva.', 'ok'); } catch (e) { toast(e.message, 'erro'); } };
  return html`<div class="card page-card stack"><div class="sec-title">🔓 Senha para avançar com pendência</div>
    <small class="dim">Usada pela equipe quando precisar mandar uma OS para produção ou concluir com algo faltando. Gerente e administrador também podem liberar com a própria senha. ${window.__senhaLib ? '✓ Já existe uma senha cadastrada.' : '⚠ Nenhuma senha cadastrada ainda.'}</small>
    <div class="row" style=${{ gap: '8px', flexWrap: 'wrap' }}><input class="inp" type="password" style=${{ flex: 1, minWidth: '140px' }} placeholder="Nova senha" value=${a} onInput=${e => setA(e.target.value)} /><input class="inp" type="password" style=${{ flex: 1, minWidth: '140px' }} placeholder="Repita a senha" value=${b} onInput=${e => setB(e.target.value)} /><button class="btn btn-primary" onClick=${salvar}>Salvar</button></div></div>`;
}
function TelaConfig({ sessao, toast }) {
  const [zerar, setZerar] = useState(false);
  const [os, setOs] = useState(() => STATUS_OS.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] || '#78716c' })));
  const [fab, setFab] = useState(() => ETAPAS_FAB.map(([k, nome, desc]) => ({ k, nome, desc })));
  const [salvando, setSalvando] = useState(false);
  const mover = (arr, set, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a); };
  const salvar = async () => {
    if (os.some(x => !x.nome.trim()) || fab.some(x => !x.nome.trim())) return toast('Todas as etapas precisam de nome.');
    setSalvando(true);
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { etapasOS: os.map(x => ({ ...x, nome: x.nome.trim() })), etapasFab: fab.map(x => ({ ...x, nome: x.nome.trim() })) }); toast('Etapas salvas. Já valem para todo o app.', 'ok'); }
    catch (e) { toast(e.message, 'erro'); }
    setSalvando(false);
  };
  const linha = (x, i, arr, set, campo) => html`<div key=${x.v || x.k} class="cfg-linha" style=${{ '--cc': x.cor || '#78716c' }}>
    <span class="cfg-n">${i + 1}</span>
    ${campo === 'os' && html`<input type="color" class="cfg-cor" value=${x.cor || '#78716c'} onInput=${e => set(arr.map((y, j) => j === i ? { ...y, cor: e.target.value } : y))} />`}
    <input class="inp" value=${x.nome} onInput=${e => set(arr.map((y, j) => j === i ? { ...y, nome: e.target.value } : y))} />
    <button class="btn btn-sm btn-ghost" onClick=${() => mover(arr, set, i, -1)} disabled=${i === 0}>▲</button>
    <button class="btn btn-sm btn-ghost" onClick=${() => mover(arr, set, i, 1)} disabled=${i === arr.length - 1}>▼</button>
    <button class="x-btn" title="Remover" onClick=${() => arr.length > 2 ? set(arr.filter((_, j) => j !== i)) : toast('Precisa de pelo menos 2 etapas.')}>✕</button>
  </div>`;
  return html`<div class="fade-up stack">
    ${sessao.papel === 'admin' && html`<${SenhaLiberacaoCfg} sessao=${sessao} toast=${toast} />`}
    <${IdiomaCfg} />
    ${sessao.papel === 'admin' && html`<${MascoteCfg} sessao=${sessao} toast=${toast} />`}
    ${sessao.papel === 'admin' && html`<${DinaboxCfg} sessao=${sessao} toast=${toast} />`}
    <div><h2>⚙ Configurações</h2><div class="dim">Etapas do processo da sua empresa. Renomeie, reordene, mude a cor, acrescente ou tire etapas.</div></div>
    <div class="card page-card stack">
      <div class="sec-title">📋 Etapas da OS (andamento geral)</div>
      <div class="dim">São as etapas dos botões ◀ ▶ das Ordens de Serviço, do Início, do Kanban e dos cronogramas. A última é a de "concluída".</div>
      ${os.map((x, i) => linha(x, i, os, setOs, 'os'))}
      <button class="btn btn-sm" onClick=${() => setOs([...os.slice(0, -1), { v: 'et_' + rand(5), nome: 'Nova etapa', cor: '#0e7490' }, os[os.length - 1]])}>＋ Etapa</button>
    </div>
    <div class="card page-card stack">
      <div class="sec-title">🏭 Etapas da produção (oficina)</div>
      <div class="dim">Aparecem na esteira de produção da OS, no Quadro geral e no cronograma de produção.</div>
      ${fab.map((x, i) => linha(x, i, fab, setFab, 'fab'))}
      <button class="btn btn-sm" onClick=${() => setFab([...fab, { k: 'fab_' + rand(5), nome: 'Nova etapa', desc: '' }])}>＋ Etapa</button>
    </div>
    <div class="row" style=${{ gap: '6px', justifyContent: 'flex-end' }}>
      <button class="btn" onClick=${() => { setOs(STATUS_PADRAO.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] }))); setFab(FAB_PADRAO.map(([k, nome, desc]) => ({ k, nome, desc }))); }}>Voltar ao padrão</button>
      <button class="btn btn-verde" disabled=${salvando} onClick=${salvar}>${salvando ? 'Salvando…' : '✓ Salvar etapas'}</button>
    </div>
    <details class="card page-card zona-perigo"><summary><b>⚠️ Zona de perigo</b> <span class="dim">— reset do cronograma</span></summary>
      <div class="stack" style=${{ marginTop: '10px' }}>
        <div class="dim">Apaga <b>todas as semanas</b> da agenda e <b>todas as tarefas</b> do cronograma. Use só para limpar testes. Não pode ser desfeito.</div>
        <button class="btn btn-danger" onClick=${() => setZerar(true)}>🧨 Zerar o cronograma inteiro</button>
      </div>
    </details>
    ${zerar && html`<${SenhaMotivo} perigo semMotivo titulo="Zerar o cronograma inteiro" texto="Todas as semanas e todas as tarefas serão apagadas para sempre." botao="Zerar"
      onOk=${async () => { const { getDocs, writeBatch } = F().fsMod; const docs = [...(await getDocs(col('empresas', sessao.empresaId, 'agenda'))).docs, ...(await getDocs(col('empresas', sessao.empresaId, 'tarefas'))).docs];
        for (let i = 0; i < docs.length; i += 400) { const b = writeBatch(F().db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
        toast('Cronograma zerado: ' + docs.length + ' registros apagados.', 'ok'); }} fechar=${() => setZerar(false)} />`}
  </div>`;
}

function Principal({ sessao, toast }) {
  
  const novaVersao = useNovaVersao();
  const [logo, setLogo] = useState(window.__LOGO || '');
  const [, setCfgV] = useState(0);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => { setTimeout(() => garantirCoresClientes(sessao, s.docs.map(d => d.data().cliente?.nome || '')), 1500); }, () => {}), []);
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId), d => { const dd = d.data() || {}; window.__CORES_CLI = dd.coresClientes || {}; const l = dd.logo || ''; window.__LOGO = l; setLogo(l); aplicarEtapas(dd); window.__etapasCfg = dd.etapasOS; window.__senhaLib = dd.senhaLiberacao || ''; window.__dinaboxEm = dd.dinaboxEm || ''; (window.__I18N && !window.__i18nOn && (window.__i18nOn = 1, I18N.iniciar(sessao.empresaId))); window.__mascCfg = { nome: dd.mascoteNome || '', rosto: dd.mascoteRosto || '', prof: dd.mascoteProf || 'marceneiro' }; window.dispatchEvent(new Event('masc-cfg')); window.__parcLista = dd.parceirosLista || (typeof PARC_PADRAO !== 'undefined' ? PARC_PADRAO : []); aplicarGrupos(dd.gruposAcesso); if (dd.espessurasCfg) window.__ESP = dd.espessurasCfg; setCfgV(v => v + 1); }, () => {}), []);
  const [minhasAbas, setMinhasAbas] = useState(undefined);
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId, 'usuarios', sessao.uid), d => setMinhasAbas(d.data()?.abas), () => {}), []);
  sessao = { ...sessao, abasProprias: Array.isArray(minhasAbas) ? minhasAbas : undefined };
  const [aba, setAba] = useState('inicio');
  const [podeInstalar, setPodeInstalar] = useState(!!window.__instalar);
  const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const [iosAj, setIosAj] = useState(false);
  useEffect(() => { const f = () => setPodeInstalar(!!window.__instalar); window.addEventListener('pode-instalar', f); return () => window.removeEventListener('pode-instalar', f); }, []);
  const [osAberta, setOsAberta] = useState(null);
  const [conta, setConta] = useState(false);
  const [statusIA, setStatusIA] = useState(null);
  const catalogo = useCatalogo(sessao.empresaId);
  window.__CATALOGO = catalogo;
  useEffect(() => { if (sessao.papel !== 'admin') return; F().fsMod.getDoc(docRef('empresas', sessao.empresaId)).then(d => { if ((d.data()?.nomesPadronizados || 0) < 2) padronizarNomesTudo(sessao, toast).catch(e => toast('Não padronizou: ' + e.message, 'erro')); }).catch(() => {}); }, []);

  useEffect(() => { try { localStorage.setItem('osm_aba', aba); } catch {} }, [aba]);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => setStatusIA({ ia: false })); }, []);

  const [ficha, setFicha] = useState(null);
  const abrirDireto = (id) => { setFicha(null); setOsAberta(id); setAba('os'); window.scrollTo(0, 0); };
  const abrirOS = (id) => setFicha(id);
  window.__abrirOS = abrirOS;
  window.__irPara = (v) => { setFicha(null); irPara(v); };
  window.__fecharFicha = () => setFicha(null);
  window.__editarOS = (id) => abrirDireto(id);
  const [cronoK, setCronoK] = useState(0);
  window.__irCronograma = (d, foco) => { window.__semanaIr = d || null; window.__focoAgenda = foco || null; setFicha(null); setOsAberta(null); setAba('cronograma'); setCronoK(k => k + 1); window.scrollTo(0, 0); };
  const histNav = useRef([]);
  const irPara = (v, semHist) => { if (!semHist && v !== aba) histNav.current = [...histNav.current, aba].slice(-30); setAba(v); if (v !== 'os') setOsAberta(null); window.scrollTo(0, 0); };
  const voltarPag = () => { if (ficha) return setFicha(null); if (osAberta) return setOsAberta(null); const h = histNav.current; const v = h.pop() || 'inicio'; histNav.current = [...h]; irPara(v, true); };
  const abas = [
    { v: 'inicio', t: 'Início', i: '⌂' },
    { v: 'quadro', t: 'Quadro geral', i: '📊' },
    { v: 'clientes', t: 'Clientes', i: '👤' },
    { v: 'pedidos', t: 'Peças extras', i: '🪵' },
    { v: 'os', t: 'Ordens de Serviço', i: '📋' },
    { v: 'contratos', t: 'Contratos', i: '📑' },
    { v: 'projetos', t: 'Reuniões & Projetos', i: '✨' },
    { v: 'amostras', t: 'Amostras', i: '📦' },
    { v: 'importar', t: 'Importar (IA)', i: '🗂️' },
    { v: 'catalogo', t: 'Catálogo', i: '🎨' },
    { v: 'equipe', t: 'Equipe', i: '👥' },
    { v: 'cronograma', t: 'Cronograma', i: '📅' },
    { v: 'excluir', t: 'Excluir OSs', i: '🗑' },
    { v: 'compras', t: 'Compras', i: '🛒' },
    { v: 'financeiro', t: 'Resultado por OS', i: '💰' }, { v: 'contas', t: 'Contas & custos operacionais', i: '📒' },
    { v: 'config', t: 'Configurações', i: '⚙' },
  ].filter(a => pode(sessao, a.v)).concat([{ v: 'sugestoes', t: 'Sugestões & anotações', i: '💡' }, { v: 'manual', t: 'Mapa / Manual', i: '🧠' }, { v: 'novidades', t: 'Novidades', i: '🆕' }]);
  const [menuAb, setMenuAb] = useState(false);
  useEffect(() => { ouvirDinabox(sessao, toast); }, []);
  const vis = (v) => abas.some(a => a.v === v);
  useEffect(() => { if (!vis(aba) && abas[0]) setAba(abas[0].v); });
  const [devL, setDevL] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const [testeZ, setTesteZ] = useState(false);
  const iniciais = (sessao.nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return html`
    <div class="com-side">
      <${MenuLateral} abas=${abas} aba=${aba} irPara=${irPara} logo=${logo} empresa=${sessao.empresaNome} aberto=${menuAb} setAberto=${setMenuAb} />
      <header class="topo">
        <div class="topo-in">
          <button class="side-burger" title="Menu" onClick=${() => setMenuAb(true)}>☰</button>
          <div class="brand-mini">
            ${logo ? html`<img class="brand-logo" src=${logo} alt="logo" />` : html`<div class="brand-mark">GP</div>`}
            <div>
              <div class="row" style=${{ gap: '6px' }}><b style=${{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Gestão Pró</b><span class="tag txt-desk">GESTÃO</span></div>
              <div class="dim topo-emp" style=${{ fontSize: '12px' }}>🏢 ${sessao.empresaNome}</div>
            </div>
          </div>
          <nav class="secoes">
            ${SECOES.filter(([k, , , vs]) => abas.some(a => vs.includes(a.v))).map(([k, t, cor, vs]) => html`<button key=${k} class=${secaoDe(aba)[0] === k ? 'on' : ''} style=${{ '--sc': cor }} onClick=${() => irPara(vs.find(v => abas.some(a => a.v === v)))}>${t}</button>`)}
            <button class="sec-dev" title="Desenvolvedor" onClick=${() => setDevL(true)}>🛠</button>
            ${sessao.papel === 'admin' && html`<button class="sec-dev" title="Testes: zerar esteiras e tempos" onClick=${() => setTesteZ(true)}>🧪</button>`}
          </nav>
          <div class="row topo-acoes" style=${{ gap: '8px' }}>
            <${BuscaGlobal} sessao=${sessao} irPara=${irPara} />
            <${AlertaCobranca} sessao=${sessao} />
            <${AvisoOrcamentos} sessao=${sessao} toast=${toast} />
            <${Mascote} />
            <button class="user-box" onClick=${() => setConta(true)} title="Minha conta">
              <span class="avatar">${iniciais}</span>
              <span class="txt-desk" style=${{ textAlign: 'left', lineHeight: 1.2 }}><b style=${{ fontSize: '13px' }}>${sessao.nome}</b><br/><span class="ok-txt">● ${(PAPEIS.find(p => p.v === sessao.papel) || {}).t}</span></span>
            </button>
            ${ehIOS && !instalado && html`<button class="btn btn-verde btn-sm btn-instalar" onClick=${() => setIosAj(true)}>📲 Instalar</button>`}
            ${iosAj && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setIosAj(false)}><div class="card modal-caixa stack" style=${{ width: 'min(420px,100%)' }}>
              <div class="sec-title">📲 Instalar no iPhone / iPad</div>
              <div class="ios-passo"><b>1</b> Abra este site no <b>Safari</b> (no Chrome do iPhone não funciona).</div>
              <div class="ios-passo"><b>2</b> Toque no botão <b>Compartilhar</b> <span class="ios-ic">⬆︎</span> na barra de baixo.</div>
              <div class="ios-passo"><b>3</b> Role e toque em <b>“Adicionar à Tela de Início”</b> ➕.</div>
              <div class="ios-passo"><b>4</b> Toque em <b>Adicionar</b>. O Gestão Pró aparece como app na tela do iPhone.</div>
              <button class="btn btn-primary" onClick=${() => setIosAj(false)}>Entendi</button></div></div>`, document.body)}
            ${podeInstalar && html`<button class="btn btn-verde btn-sm btn-instalar" onClick=${async () => { const e = window.__instalar; if (!e) return; e.prompt(); const r = await e.userChoice.catch(() => null); if (r?.outcome === 'accepted') { window.__instalar = null; setPodeInstalar(false); } }}>📲 Instalar app</button>`}
            ${novaVersao ? html`<button class="btn btn-sm btn-nova-versao" title="Tem versão nova do app" onClick=${recarregarApp}>🔄<span> Atualizar</span></button>`
              : html`<button class="btn btn-ghost btn-sm" title="Atualizar o app e os dados" onClick=${recarregarApp}>⟳<span class="txt-desk"> Atualizar</span></button>`}
            <button class="btn btn-ghost btn-sm" title="Compartilhar o app" onClick=${async () => { const url = location.origin + '/'; const txt = 'Gestão Pró — gestão de ordens de serviço, produção, compras e financeiro para marcenarias. Acesse: ' + url; try { if (navigator.share) await navigator.share({ title: 'Gestão Pró', text: txt, url }); else { await navigator.clipboard.writeText(txt); toast('Link copiado: ' + url, 'ok'); } } catch {} }}>🔗<span class="txt-desk"> Compartilhar</span></button>
            <button class="btn btn-ghost btn-sm" title="Sair" onClick=${() => F().authMod.signOut(F().auth)}>⇥<span class="txt-desk"> Sair</span></button>
          </div>
        </div>
      </header>
      ${ajuda && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setAjuda(false)}><div class="card modal-caixa stack" style=${{ width: 'min(620px,100%)' }}>
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">❓ Como funciona</div><button class="x-btn" onClick=${() => setAjuda(false)}>✕</button></div>
        <${ManualAba} aba=${aba} /><button class="btn btn-sm" onClick=${() => { setAjuda(false); irPara('manual'); }}>📖 Ver o manual completo</button></div></div>`, document.body)}
      ${(histNav.current.length > 0 || osAberta || ficha) && html`<button class="btn-voltar-pag" title="Voltar para a página anterior" onClick=${voltarPag}>← Voltar</button>`}
      <button class="btn-novid" title="Ver as atualizações" onClick=${() => irPara('novidades')}>🆕</button>
      ${aba !== 'manual' && MANUAL[aba] && html`<button class="btn-ajuda" title="Como funciona esta tela" onClick=${() => setAjuda(true)}>❓</button>`}
      ${(() => { const [k, t, cor, vs] = secaoDe(aba); const subs = vs.map(v => abas.find(a => a.v === v)).filter(Boolean); return subs.length > 1 ? html`<div class="subabas" style=${{ '--sc': cor }}>${subs.map(a => html`<button key=${a.v} class=${aba === a.v ? 'on' : ''} onClick=${() => irPara(a.v)}><span>${a.i}</span>${a.t}</button>`)}</div>` : null; })()}
      ${novaVersao && html`<button class="faixa-versao" onClick=${recarregarApp}>🔄 <b>Nova atualização disponível.</b> Toque aqui para atualizar.</button>`}
      <div class="shell" style=${{ paddingTop: '20px' }}>
        <${AvisoEtapas} sessao=${sessao} toast=${toast} />
        ${statusIA && !statusIA.ia && html`<div class="warn-box" style=${{ marginBottom: '12px' }}>A IA ainda não está ligada no servidor. Dá pra usar tudo à mão.</div>`}
        ${aba === 'inicio' && html`<${CartaoNovidades} irPara=${irPara} />`}
        ${aba === 'novidades' && html`<${TelaNovidades} />`}
        ${aba === 'sugestoes' && html`<${TelaSugestoes} sessao=${sessao} />`}
        ${aba === 'inicio' && vis('inicio') && html`<${TelaInicio} sessao=${sessao} abrirOS=${abrirOS} irPara=${irPara} />`}
        ${aba === 'projetos' && vis('projetos') && html`<${TelaProjetos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'os' && vis('os') && html`<${TelaOS} sessao=${sessao} catalogo=${catalogo} toast=${toast} osAberta=${osAberta} setOsAberta=${(id) => id ? (osAberta ? setOsAberta(id) : setFicha(id)) : setOsAberta(null)} />`}
        ${ficha && html`<${FichaOS} key=${ficha} sessao=${sessao} osId=${ficha} fechar=${() => setFicha(null)} editar=${abrirDireto} toast=${toast} />`}
        ${aba === 'manual' && html`<${TelaManual} abas=${abas} irPara=${irPara} />`}
        ${aba === 'clientes' && vis('clientes') && html`<${TelaClientes} sessao=${sessao} toast=${toast} catalogo=${catalogo} />`}
        ${aba === 'amostras' && vis('amostras') && html`<${TelaAmostras} sessao=${sessao} toast=${toast} />`}
        ${aba === 'importar' && vis('importar') && html`<${TelaImportar} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'catalogo' && vis('catalogo') && html`<${TelaCatalogo} sessao=${sessao} catalogo=${catalogo} toast=${toast} />`}
        ${aba === 'equipe' && vis('equipe') && html`<${TelaEquipe} sessao=${sessao} toast=${toast} />`}
        ${aba === 'contratos' && vis('contratos') && html`<${TelaContratos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'compras' && vis('compras') && html`<${TelaComprasGeral} sessao=${sessao} toast=${toast} />`}
        ${aba === 'financeiro' && vis('financeiro') && html`<${TelaFinanceiro} sessao=${sessao} toast=${toast} />`}
        ${aba === 'contas' && vis('contas') && html`<${TelaContas} sessao=${sessao} toast=${toast} />`}
        ${aba === 'pedidos' && vis('pedidos') && html`<${TelaPedidos} sessao=${sessao} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'quadro' && vis('quadro') && html`<${QuadroGeral} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} catalogo=${catalogo} />`}
        ${aba === 'cronograma' && vis('cronograma') && html`<${TelaCronograma} key=${cronoK} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} />`}
        ${aba === 'config' && vis('config') && html`<${TelaConfig} key=${STATUS_OS.map(x => x.v + x.t).join()} sessao=${sessao} toast=${toast} />`}
        ${aba === 'excluir' && vis('excluir') && html`<${TelaExcluir} sessao=${sessao} toast=${toast} />`}
      </div>
      ${conta && html`<${MinhaConta} sessao=${sessao} fechar=${() => setConta(false)} toast=${toast} />`}
      <${Assistente} sessao=${sessao} osAberta=${aba === 'os' ? osAberta : null} />
      <${BarraTransferencia} />
      <${Novidades} sessao=${sessao} />
      ${testeZ && html`<${ZerarEsteiras} sessao=${sessao} toast=${toast} fechar=${() => setTesteZ(false)} />`}
      ${devL && html`<${LoginDev} fechar=${() => setDevL(false)} />`}
    </div>`;
}

function App() {
  const [fb, setFb] = useState(null);
  const [sessao, setSessao] = useState(undefined); // undefined = carregando, null = deslogado
  const [semAcesso, setSemAcesso] = useState(false);
  const [toast, toastEl] = useToast();

  useEffect(() => { waitFirebase().then(setFb); }, []);

  useEffect(() => {
    if (!fb?.ready) return;
    const { authMod, auth, fsMod } = fb;
    return authMod.onAuthStateChanged(auth, async (user) => {
      setSemAcesso(false);
      if (!user) { setSessao(null); return; }
      try {
        // Acesso do desenvolvedor: confere se esta conta é a registrada em config/dev.
        { let d = null; for (let i = 0; i < (user.email === EMAIL_DEV || window.__criandoDev ? 6 : 1); i++) { d = await fsMod.getDoc(fsMod.doc(fb.db, 'config', 'dev')).catch(() => null); if (d?.exists() && d.data().uid === user.uid) break; if (i < 5) await new Promise(r => setTimeout(r, 700)); }
          if (d?.exists() && d.data().uid === user.uid) { setSessao({ uid: user.uid, tipo: 'dev', nome: d.data().login || 'Desenvolvedor' }); return; }
          if (user.email === EMAIL_DEV) { setSemAcesso('Esse acesso de desenvolvedor não é válido.'); setSessao(null); return; } }
        // Logo depois do cadastro, o índice pode levar um instante pra existir.
        let idx = null;
        for (let i = 0; i < 6 && !idx; i++) {
          const s = await fsMod.getDoc(fsMod.doc(fb.db, 'usuarios_index', user.uid));
          if (s.exists()) idx = s.data(); else await new Promise(r => setTimeout(r, 700));
        }
        if (!idx) { setSemAcesso(true); setSessao(null); return; }
        let emp = null;
        for (let i = 0; i < 6 && !emp; i++) {
          const e = await fsMod.getDoc(fsMod.doc(fb.db, 'empresas', idx.empresaId)).catch(() => null);
          if (e?.exists()) emp = e.data(); else await new Promise(r => setTimeout(r, 700));
        }
        if (emp?.pausada) { setSemAcesso('O acesso desta empresa está pausado. Fale com o suporte do Gestão Pró.'); setSessao(null); return; }
        setSessao({ uid: user.uid, empresaId: idx.empresaId, papel: idx.papel, nome: idx.nome, empresaNome: emp?.nome || idx.empresaId });
      } catch (e) {
        setSemAcesso(true); setSessao(null);
      }
    });
  }, [fb]);

  let corpo;
  if (!fb || (fb.ready && sessao === undefined)) corpo = html`<div class="boot">Carregando…</div>`;
  else if (!fb.ready) corpo = html`
    <div class="login-page"><div class="glass login-card" style=${{ maxWidth: '460px' }}>
      <${Marca} grande=${true} />
      <div class="warn-box">${fb.error === 'no-config'
        ? 'O banco de dados ainda não foi configurado neste site. Falta colar as chaves do Firebase no arquivo config.js.'
        : 'Não consegui conectar ao banco de dados. Confira a internet e recarregue a página.'}</div>
    </div></div>`;
  else if (!sessao) corpo = html`
    ${semAcesso && html`<div class="error-box" style=${{ maxWidth: '420px', margin: '16px auto 0' }}>${typeof semAcesso === 'string' ? semAcesso : 'Esse acesso foi removido ou não está ligado a nenhuma empresa. Fale com o administrador.'}
      <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => { setSemAcesso(false); F().authMod.signOut(F().auth); }}>Ok</button></div>`}
    <${TelaLogin} />`;
  else if (sessao.tipo === 'dev') corpo = html`<${PainelDev} toast=${toast} />`;
  else corpo = html`<${Principal} sessao=${sessao} toast=${toast} />`;

  return html`<div>${corpo}${toastEl}</div><div id="print-area"></div>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
