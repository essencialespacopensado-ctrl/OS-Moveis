/* Gestão Pró — opções de especificação (modelos, marcas e acabamentos de mercado) */
(function () {
  const g = (grupo, itens) => ({ grupo, itens: itens.map(([n, b, d]) => ({ n, b: b || '', d: d || '' })) });

  const PUXADOR = [
    g('Modelos e perfis de puxador', [
      ['Cava usinada 45° na cabeça da porta', 'Usinado', 'Cava chanfrada direto no MDF, sem ferragem aparente'],
      ['Perfil gola em alumínio de encaixe', 'Alumínio', 'Perfil linear contínuo na caixaria ou topo da porta'],
      ['Puxador cava tipo J usinada', 'Usinado', 'Usinagem anatômica arredondada no topo da porta/gaveta'],
      ['Puxador alça linear de sobrepor', 'Alça', 'Haste metálica 160 / 224 / 320 / 600mm'],
      ['Puxador ponto / botão cilíndrico', 'Ponto', 'Discreto para gavetas superiores e portas de giro'],
      ['Puxador concha de embutir', 'Embutir', 'Face nivelada, ideal para portas de correr'],
      ['Perfil cava barra oculta (tipo faceta)', 'Perfil slim', 'Perfil slim no topo ou lateral da porta'],
      ['Sem puxador (fecho toque / Tip-on / push-open)', 'Sem puxador', 'Abre pressionando a porta ou gaveta'],
      ['Puxador alça de couro natural', 'Design', 'Couro legítimo com rebite em latão escovado'],
      ['Puxador tubular duplo para porta de passagem (600 a 1200mm)', 'Passagem', 'Face interna e externa, pivotantes e de correr'],
    ]),
    g('Acabamentos e cores', [
      ['Preto fosco / black matte', 'Preto'], ['Dourado / gold escovado', 'Dourado'], ['Inox escovado (aço 304)', 'Inox'],
      ['Cromado polido alto brilho', 'Cromado'], ['Champagne / bronze escovado', 'Bronze'], ['Rosé gold acetinado', 'Rosé'],
      ['Grafite / titânio escovado', 'Grafite'], ['Madeira maciça natural usinada', 'Madeira'],
    ]),
    g('Marcas', [
      ['Zen Design', 'Premium'], ['Torralba', 'Design'], ['Italy Line', 'Luxo'], ['Alternativa Componentes', 'Perfis'],
      ['Rometal', 'Sistemas'], ['Häfele', 'Global'], ['Soprano', 'Tradicional'],
    ]),
  ];

  const LED_FITA = [g('Fitas LED', [
    ['Fita LED COB 2700K (branco quente contínuo)', 'Mais pedido', '480 leds/m sem pontilhado, 12V/24V'],
    ['Fita LED COB 3000K (branco neutro quente)', 'Contínuo', 'Cozinhas, cristaleiras e nichos'],
    ['Fita LED COB 4000K (branco neutro trabalho)', 'Trabalho', 'Bancadas de preparo e escritórios'],
    ['Fita LED SMD 2835 120 leds/m 12V', 'Econômico', 'Indireta suave para rodapés e sancas'],
    ['Fita LED SMD 2835 240 leds/m alta densidade', 'Intenso', 'Perfis de sobrepor e áreas de trabalho'],
    ['Fita LED RGB+W inteligente', 'Smart', 'Cenas de cores e dimerização por app'],
    ['Fita LED 24V alta potência (longas metragens)', '24V', 'Evita queda de tensão acima de 5m'],
  ])];
  const LED_PERFIL = [g('Perfis de alumínio', [
    ['Perfil de embutir slim 15x6mm difusor leitoso', 'Embutir'], ['Perfil de sobrepor reto 17x7mm anodizado', 'Sobrepor'],
    ['Perfil de canto 45° (luz direcionada)', 'Canto 45°'], ['Perfil de embutir sem abas (totalmente oculto)', 'Oculto'],
    ['Tubo cabideiro com LED integrado', 'Closet'], ['Canaleta usinada na madeira com difusor de silicone', 'Silicone'],
  ])];
  const LED_FONTE = [
    g('Fontes e drivers', [
      ['Fonte chaveada slim 12V 5A (60W) bivolt', 'Slim 5A'], ['Fonte chaveada slim 12V 10A (120W) bivolt', 'Slim 10A'],
      ['Fonte chaveada 24V 5A (120W)', '24V'], ['Driver dimerizável 12V Triac / 0-10V', 'Dimerizável'], ['Fonte blindada IP67', 'Blindada'],
    ]),
    g('Acionamento e sensores', [
      ['Sensor touch embutido na madeira com dimmer', 'Touch'], ['Sensor de proximidade (abre porta = liga)', 'Porta'],
      ['Micro-interruptor de fundo de armário', 'Manual'], ['Receptor Wi-Fi / Zigbee (Alexa / Tuya)', 'Automação'],
    ]),
  ];
  const LED_LOCAL = [g('Locais de instalação', [
    ['Sob a base do aéreo iluminando a bancada', 'Cozinha'], ['Fundo da cristaleira e prateleiras de vidro', 'Decorativo'],
    ['Interno de gavetas com sensor de abertura', 'Gavetas'], ['Rasgo no rodapé recuado (rodapé flutuante)', 'Piso'],
    ['Cabideiros e nichos de sapatos no closet', 'Closet'], ['Retroiluminação atrás do painel de TV', 'Painel'],
    ['Superior da cabeceira para leitura indireta', 'Quarto'],
  ])];
  const LED_TEMP = [['2700K', 'Branco quente', 'Aconchegante e nobre'], ['3000K', 'Quente suave', 'Padrão marcenaria fina'], ['4000K', 'Branco neutro', 'Luz natural limpa'], ['6000K', 'Branco frio', 'Área técnica']];

  const DOB = {
    modelo: [g('Modelos de dobradiça', [
      ['Dobradiça reta 110° com amortecedor soft-close', 'Mais usada', 'Portas sobrepostas totais'],
      ['Dobradiça curva 110° com amortecedor', 'Semi-sobreposta', 'Duas portas no mesmo montante'],
      ['Dobradiça supercurva 110° com amortecedor', 'Embutida', 'Portas embutidas no vão'],
      ['Dobradiça 165° robô / canto com amortecedor', 'Grande abertura', 'Abertura panorâmica'],
      ['Dobradiça para canto cego 90° / angulada 45°', 'Canto cego', 'Módulos de canto em L'],
      ['Dobradiça invisível / oculta 3D em zamac', 'Invisível 3D', 'Oculta na madeira, regulagem 3 eixos'],
      ['Dobradiça sem mola para Tip-on (push-open)', 'Toque', 'Abre com fecho toque'],
      ['Dobradiça em inox 304 com amortecedor', 'Inox / litoral', 'Áreas molhadas e litoral'],
    ])],
    marca: [g('Marcas de dobradiça', [
      ['Blum Clip Top Blumotion', 'Padrão ouro'], ['Hettich Sensys (Silent System)', 'Alemanha'], ['Häfele Metalla / Tiomos', 'Premium'],
      ['FGVTN MS Slide / Slow Motion', 'Nacional'], ['Grass Tiomos', 'Áustria'], ['Samet Master soft-close', 'Internacional'], ['DTC soft-close', 'Tecnologia'], ['Renna / Soprano', 'Econômico'],
    ])],
    calco: [g('Calços e acabamentos', [
      ['Calço cruzado com regulagem excêntrica 3D', 'Calço 3D'], ['Calço reto linear minimalista', 'Calço slim'],
      ['Acabamento ônix preto / titânio escuro', 'Preto ônix'], ['Acabamento tradicional aço niquelado', 'Niquelado'],
    ])],
  };
  const COR = {
    modelo: [g('Modelos de corrediça', [
      ['Corrediça oculta extração total com amortecedor', 'Mais pedida', 'Oculta sob a gaveta, abre 100%'],
      ['Corrediça oculta Tip-on (abre no toque)', 'Toque', 'Dispensa puxador'],
      ['Corrediça oculta híbrida: toque para abrir + amortecida', 'Top', 'Tip-on Blumotion / Push to Open Silent'],
      ['Corrediça telescópica 45mm com amortecedor', 'Telescópica', 'Lateral reforçada'],
      ['Sistema de gaveta metálica slim (Legrabox / AvanTech)', 'Design slim', 'Laterais de aço 12mm'],
      ['Corrediça telescópica pesada (60 a 100kg)', 'Carga pesada', 'Gavetões, despensas e arquivos'],
      ['Corrediça oculta extração parcial com amortecedor', 'Econômica', 'Menor custo'],
    ])],
    marca: [g('Marcas de corrediça', [
      ['Blum Movento / Tandem / Legrabox / Merivobox', 'Padrão ouro'], ['Hettich Quadro 4D / Actro 5D / AvanTech YOU', 'Alemanha'],
      ['Häfele Matrix Box / Slido', 'Premium'], ['Grass Dynapro / Nova Pro', 'Áustria'], ['FGVTN Ten / Slow Motion / TT', 'Nacional'], ['Samet Flowbox / Smart Slide', 'Internacional'], ['Renna / Soprano', 'Econômico'],
    ])],
    tamanho: [g('Capacidade de carga', [
      ['Até 25kg (gavetas pequenas, criados)', '25kg'], ['35 a 40kg (cozinhas, gavetas médias)', '35kg'],
      ['60kg reforçada (gavetões de panelas)', '60kg'], ['80 a 100kg (despensas técnicas)', '80kg+'],
    ])],
  };
  const CORRER = {
    modelo: [g('Sistemas para armários', [
      ['Sistema apoiado inferior com amortecedor', 'Mais usado'], ['Sistema suspenso sobreposto amortecido', 'Suspenso'],
      ['Sistema suspenso coplanar (portas no mesmo plano)', 'Alto luxo'], ['Sistema para perfil de alumínio e vidro Reflecta', 'Vidro'],
      ['Sistema embutido na caixaria com trilho oculto', 'Minimalista'], ['Sistema articulado / dobrável (camarão)', 'Articulado'],
    ])],
    marca: [g('Marcas', [
      ['Rometal (RO-65 / Dominó / Versatile / Coplanar)', 'Líder Brasil'], ['Hettich (InLine XL / TopLine / SlideLine)', 'Alemanha'],
      ['Häfele (Slido Classic / Slido Design)', 'Premium'], ['Ducasse Industrial', 'Industrial'], ['Alumifix / Alternativa', 'Perfis'],
    ])],
    perfil: [g('Trilhos e amortecedores', [
      ['Trilho superior duplo anodizado com freio bilateral', ''], ['Trilho de embutir', ''], ['Trilho de sobrepor', ''], ['Amortecimento duplo (abre e fecha)', ''],
    ])],
  };
  const PASSAGEM = {
    modelo: [g('Portas de passagem', [
      ['Suspenso embutido no teto/gesso com amortecimento bilateral', 'Mais pedido'], ['Roldanas aparentes em inox escovado (loft)', 'Inox'],
      ['Roldanas aparentes preto fosco (celeiro / industrial)', 'Rústico'], ['Porta embutida na parede (tipo Eclisse)', 'Embutida'],
      ['Porta pivotante com pino inox e amortecedor de piso', 'Pivotante'], ['Sistema camarão (bi-fold) com trilho embutido', 'Camarão'],
      ['Sistema telescópico em cascata (2 a 4 folhas)', 'Cascata'],
    ])],
    marca: [g('Marcas', [
      ['Rometal (Suspensa Suprema / Divisórias)', 'Nacional'], ['Ducasse (DN80 / PL80 / ProSlide)', 'Alta resistência'],
      ['Häfele (Slido Classic 80-P / 120-P)', 'Alemanha'], ['Stanley Hardware', 'Tradição'], ['Soprano', 'Comercial'],
    ])],
    perfil: [g('Guias e acessórios', [
      ['Guia inferior invisível com pino no piso', 'Invisível'], ['Fechadura bico de papagaio com roseta oval inox', 'Tranca'],
      ['Puxador concha embutido duplo', 'Concha'], ['Amortecedor hidráulico duplo', 'Soft-close'],
    ])],
  };

  const PORTAS = [g('Modelos de porta', [
    ['Porta lisa / reta 18mm com fita de borda 1mm', 'Mais usada'], ['Porta ripada 15+15mm', 'Ripada'], ['Porta ripada 15+6mm', 'Friso fino'],
    ['Porta inglesa shaker (moldura usinada)', 'Clássico'], ['Moldura inglesa meia-esquadria 45°', 'Moldura 45°'],
    ['Porta com cava usinada 45° na cabeça', 'Cava 45°'], ['Porta com perfil alumínio slim e vidro Reflecta', 'Vidro'],
    ['Porta almofadada provençal com laca', 'Provençal'], ['Porta com moldura e palhinha indiana', 'Palhinha'],
  ])];

  const TAMP = [
    g('Tipos de tamponamento', [
      ['Aparente com meia-esquadria 45°', '45°'], ['Aparente reto com fita de borda 2mm', 'Sobreposto'],
      ['Embutido nivelado com as portas', 'Nivelado'], ['Sem tamponamento (caixaria direta)', 'Direto'],
    ]),
  ];
  const TAMP_ESP = ['Simples 15', 'Simples 18', 'Chapa 25', 'Duplo 15+15', 'Duplo 18+18 (padrão nobre)', 'Engrosso 49', 'Triplo 18+18+18'];

  const FECH_MODELOS = [
    ['Fechadura para porta de giro com chave/roseta', 'Porta de giro', 'Lingueta e cilindro para portas de armário'],
    ['Fechadura bico de papagaio (porta de correr)', 'Bico de papagaio', 'Gancho articulado para portas de correr'],
    ['Fechadura digital / biométrica / senha', 'Digital', 'Biometria, senha touch ou cartão RFID'],
    ['Fechadura magnética / fecho toque (push-open)', 'Magnética', 'Abertura por clique, sem puxador'],
    ['Fechadura cilíndrica para gaveta (chave Yale)', 'Gaveta', 'Tranca frontal em aço/latão'],
    ['Tranca central conjugada (gaveteiro)', 'Tranca central', 'Bloqueia todas as gavetas com 1 chave'],
    ['Fechadura de segurança / chave tetra', 'Segurança', 'Joias, cofre interno'],
    ['Trava magnética oculta / invisível (Tot Lock)', 'Oculta', 'Abre com cartão magnético, sem furo aparente'],
    ['Fechadura cremona para porta alta', 'Cremona', 'Trava em cima e embaixo'],
    ['Fechadura de gaveta com chave escamoteável', 'Escamoteável', 'Chave rebatível'],
  ];
  const FECH_ONDE = [
    ['interna', 'Interna', 'Compartimentos ocultos & gavetas'], ['externa', 'Externa', 'Portas & frentes visíveis'],
    ['ambas', 'Interna e externa', 'Ambos os locais'], ['nao', 'Não se aplica', 'Sem fechadura'],
  ];
  const FECH_ACAB = ['Preto fosco', 'Cromado polido', 'Inox escovado', 'Dourado escovado', 'Ouro velho', 'Grafite / titânio', 'Branco'];
  const FECH_MARCAS = ['Soprano', 'Pado', 'Häfele', 'Papaiz', 'Yale', 'FGVTN', 'Stam', 'Rometal', 'Tot Lock'];

  const TECIDOS = [
    ['Linho puro / linho misto', 'Naturais', 'Trama natural nobre, toque fresco'],
    ['Couro legítimo / natural', 'Nobre', 'Alta durabilidade e elegância'],
    ['Couro sintético / PU / corino', 'Sintético', 'Fácil limpeza, resistente a líquidos'],
    ['Veludo / suede', 'Aveludado', 'Toque macio, absorção acústica'],
    ['Bouclé', 'Textura', 'Visual contemporâneo de alto padrão'],
    ['Lona / sarja reforçada', 'Pesado', 'Bancos de alto tráfego'],
    ['Jacquard decorativo', 'Padronagem', 'Desenhos na trama'],
  ];
  const TEC_RESP = [
    ['marcenaria', '🪵 Marcenaria', 'Compra o tecido e executa o estofamento'],
    ['cliente', '👤 Cliente fornece', 'Cliente entrega a metragem na fábrica'],
    ['tapecaria', '🛋️ Tapeçaria parceira', 'Enviado para tapeceiro parceiro'],
    ['arquiteto', '📐 Arquiteto / decoração', 'Fornecido pela arquitetura'],
  ];
  const TEC_APLIC = ['Cabeceira estofada (painel inteiro)', 'Cabeceira em módulos gomados', 'Painel decorativo com tecido', 'Almofada de assento (banco / baú)', 'Fundo de nicho / cristaleira', 'Portas almofadadas', 'Laterais de roupeiro'];
  const ESPUMAS = ['D28 firme (cabeceiras e painéis)', 'D33 alta resiliência (assentos)', 'D26 soft (toque macio)', 'Laminada dupla D33 + D26', 'Sem espuma (tensionado)'];

  const VIDROS = [
    ['Reflecta bronze', 'Reflecta', 'Espelhado leve, muito usado em portas e cristaleiras'],
    ['Reflecta fumê', 'Reflecta', 'Tom grafite espelhado'],
    ['Reflecta prata / incolor', 'Reflecta', 'Reflexo neutro'],
    ['Incolor comum', 'Comum', 'Transparente'],
    ['Extra clear / extra incolor', 'Premium', 'Sem tom esverdeado'],
    ['Fumê', 'Colorido', 'Cinza transparente'],
    ['Bronze', 'Colorido', 'Tom quente transparente'],
    ['Canelado / frisado', 'Textura', 'Ranhuras verticais, translúcido'],
    ['Jateado / acidato', 'Fosco', 'Translúcido fosco, privacidade'],
    ['Pintado / Lacobel (laca no verso)', 'Opaco', 'Cor sólida brilhante'],
    ['Espelho prata', 'Espelho', 'Espelho comum'],
    ['Espelho bronze', 'Espelho', 'Espelho tom quente'],
    ['Espelho fumê', 'Espelho', 'Espelho tom grafite'],
    ['Vidro aramado', 'Técnico', 'Com tela metálica interna'],
  ];
  const VIDRO_ESP = ['3mm', '4mm', '5mm', '6mm', '8mm', '10mm'];
  const VIDRO_PROC = ['Temperado', 'Laminado', 'Lapidado', 'Bisotê', 'Película de segurança', 'Furação para dobradiça'];
  const VIDRO_PERFIL = [g('Perfis / fixação', [
    ['Perfil alumínio slim preto fosco', ''], ['Perfil alumínio slim champagne', ''], ['Perfil alumínio slim bronze', ''],
    ['Perfil alumínio natural fosco', ''], ['Dobradiça para vidro (caneco)', ''], ['Prateleira de vidro com suporte oculto', ''], ['Moldura de MDF com vidro encaixado', ''],
  ])];

  const LACA_MARCAS = [
    ['Sayerlack', 'Sayersystem / NCS / RAL'], ['Renner', 'Color System / RAL'], ['Farben', 'Tintométrico Farben'],
    ['Montana', 'Montana tintométrico (Goffi)'], ['Sherwin-Williams', 'ColorSnap / RAL'],
  ];
  const LACA_BRILHO = [['Acetinado (20-30 UB)', 'Toque aveludado, o mais usado'], ['Fosco / soft touch (5-10 UB)', 'Zero reflexo'], ['Microtexturado', 'Resistente a riscos'], ['Alto brilho / polido (>90 UB)', 'Efeito espelho']];
  const LACA_CORES = [
    ['Branco Neve', 'RAL 9003 / J101', '#F9FAFB', 'Sayerlack'], ['Off-White Clássico', 'J154', '#F3EFE6', 'Sayerlack'], ['Fendi Contemporâneo', 'J159', '#9E9485', 'Sayerlack'],
    ['Cinza Sagrado', 'J162', '#B8B5AE', 'Sayerlack'], ['Areia / Greige', 'J148', '#D2C8BC', 'Sayerlack'], ['Grafite Escuro', 'J170', '#3E4144', 'Sayerlack'],
    ['Preto Absoluto', 'RAL 9005 / J100', '#18181B', 'Sayerlack'], ['Verde Oliva / Musgo', 'K120', '#4B5340', 'Sayerlack'], ['Azul Petróleo Deep', 'H140', '#1C3144', 'Sayerlack'],
    ['Terracota Quente', 'M110', '#A85A44', 'Sayerlack'], ['Nude / Rosé Suave', 'J145', '#D6BEB2', 'Sayerlack'], ['Amarelo Mostarda Ocre', 'D115', '#C59B27', 'Sayerlack'],
    ['Bianco Caldo Puro', 'RS-01', '#FAF9F6', 'Renner'], ['Crema Chiaro', 'RS-08', '#F0ECE1', 'Renner'], ['Tortora Elegante', 'RS-16', '#A09383', 'Renner'],
    ['Grigio Fumo', 'RS-24', '#6E7275', 'Renner'], ['Nero Carbonio', 'RS-90', '#1A1A1D', 'Renner'], ['Verde Sálvia Toscano', 'RS-48', '#879783', 'Renner'],
    ['Salvia Chiaro', 'RS-42', '#A2B09F', 'Renner'], ['Blu Notte Profondo', 'RS-72', '#1E2D42', 'Renner'], ['Terracota Argila', 'RS-55', '#A85A44', 'Renner'], ['Mostarda Ocre', 'RS-33', '#BFA054', 'Renner'],
    ['Branco Neve Absoluto', 'FB-01', '#FCFBF9', 'Farben'], ['Off-White Soft', 'FB-12', '#EDE8DF', 'Farben'], ['Bege Cashmere', 'FB-18', '#CBC2B6', 'Farben'],
    ['Cinza Urbano', 'FB-25', '#8C8E91', 'Farben'], ['Grafite Chumbo', 'FB-80', '#373A3C', 'Farben'], ['Preto Fosco Profundo', 'FB-99', '#151517', 'Farben'],
    ['Verde Floresta', 'FB-64', '#2D3E33', 'Farben'], ['Azul Cobalto', 'FB-70', '#203A58', 'Farben'], ['Terracota Queimada', 'FB-50', '#944D3B', 'Farben'],
    ['Branco Puro Goffi', 'GF-01', '#FFFFFF', 'Montana'], ['Nude Aveludado', 'GF-15', '#D9C8BE', 'Montana'], ['Argila Suave', 'GF-19', '#BFAF9E', 'Montana'],
    ['Cinza Platina', 'GF-22', '#A5A8AC', 'Montana'], ['Grafite Intenso', 'GF-82', '#3B3E43', 'Montana'], ['Preto Acetinado', 'GF-95', '#141414', 'Montana'],
    ['Azul Petróleo Noturno', 'GF-68', '#1E3245', 'Montana'], ['Marsala Vinho', 'GF-52', '#632B30', 'Montana'], ['Verde Musgo Inglês', 'GF-45', '#3D4C3A', 'Montana'],
    ['Alabaster', 'SW 7008', '#EDEAE0', 'Sherwin-Williams'], ['Pure White', 'SW 7005', '#F2F2EC', 'Sherwin-Williams'], ['Agreeable Gray', 'SW 7029', '#D1CBC1', 'Sherwin-Williams'],
    ['Repose Gray', 'SW 7015', '#CCC7BF', 'Sherwin-Williams'], ['Urbane Bronze', 'SW 7048', '#54504A', 'Sherwin-Williams'], ['Iron Ore', 'SW 7069', '#434341', 'Sherwin-Williams'],
    ['Tricorn Black', 'SW 6258', '#2B2B2A', 'Sherwin-Williams'], ['Naval', 'SW 6244', '#1F2937', 'Sherwin-Williams'], ['Evergreen Fog', 'SW 9130', '#93978B', 'Sherwin-Williams'], ['Cavern Clay', 'SW 7701', '#AD6D57', 'Sherwin-Williams'],
  ];

  const LAMINA_MARCAS = ['Alpi', 'Tabu', 'Nordisk', 'Bravo Wood', 'Lamiecco', 'Mad Compensados'];
  const LAMINA_TONS = { clara: 'Claras / palha', media: 'Médias / douradas', castanha: 'Castanhas', escura: 'Escuras / ebanizadas', avermelhada: 'Avermelhadas' };
  const LAMINAS = [
    ['Freijó Natural Catedral', 'Nordisk', 'media', 'Catedral', '#C29B63', 'NOR-FRE-01'],
    ['Freijó Linheiro Quartersawn', 'Bravo Wood', 'media', 'Linear', '#B88F55', 'BV-FRE-LIN'],
    ['Freijó Pré-Composto', 'Alpi', 'media', 'Linear', '#BF9866', 'ALP-10.42'],
    ['Carvalho Americano Rift (White Oak)', 'Bravo Wood', 'clara', 'Linear', '#D5BE97', 'BV-OAK-01'],
    ['Carvalho Americano Catedral', 'Nordisk', 'clara', 'Catedral', '#CDAF83', 'NOR-OAK-CAT'],
    ['Carvalho Milano', 'Alpi', 'clara', 'Linear', '#D9C6A5', 'ALP-12.85'],
    ['Nogueira Canaletto Natural', 'Bravo Wood', 'castanha', 'Catedral', '#5E4331', 'BV-WAL-01'],
    ['Nogueira Dark Tingida', 'Tabu', 'escura', 'Linear', '#423023', 'TAB-WAL-54'],
    ['Nogueira Flamed', 'Alpi', 'castanha', 'Catedral', '#6B4E38', 'ALP-14.18'],
    ['Louro Faia Mosqueado', 'Nordisk', 'media', 'Mosqueado', '#AC8054', 'NOR-LF-01'],
    ['Pau-Ferro Imperial', 'Nordisk', 'castanha', 'Catedral', '#4A3324', 'NOR-PF-02'],
    ['Cedro Rosa Natural', 'Mad Compensados', 'avermelhada', 'Catedral', '#A8684C', 'MC-CED-01'],
    ['Cumaru Dourado', 'Nordisk', 'media', 'Linear', '#9C7144', 'NOR-CUM-01'],
    ['Ébano Macassar Pré-Composto', 'Alpi', 'escura', 'Linear', '#2B231E', 'ALP-18.02'],
    ['Black Oak Ebanizado', 'Tabu', 'escura', 'Linear', '#1E1D1D', 'TAB-BLK-09'],
    ['Freixo (Ash) Americano Claro', 'Bravo Wood', 'clara', 'Catedral', '#E0CEAF', 'BV-ASH-01'],
    ['Imbuia Parda Selecionada', 'Mad Compensados', 'castanha', 'Catedral', '#634F38', 'MC-IMB-01'],
    ['Freijó Âmbar', 'Lamiecco', 'media', 'Linear', '#B58B50', 'LAM-FRE-AMB'],
  ];
  const VERNIZES = ['Verniz PU fosco (toque natural)', 'Verniz PU acetinado', 'Selador natural', 'Óleo / cera natural', 'Tingido / ebanizado'];

  const FORMICA = [
    ['Branco Texturizado', 'L120 TX', 'Formica', '#F7F7F7'], ['Branco Gelo', 'L101 TX', 'Formica', '#EFEFEF'], ['Preto Real Texturizado', 'L108 TX', 'Formica', '#1C1C1E'],
    ['Cinza Claro', 'L106 TX', 'Formica', '#D1D5DB'], ['Grafite Nobre', 'L110 TX', 'Formica', '#374151'], ['Azul Petróleo', 'L115 TX', 'Formica', '#1E3A5F'],
    ['Carvalho Hannover', 'M977', 'Formica', '#B8976C'], ['Nogal Sevilla', 'M965', 'Formica', '#6B4C33'], ['Aço Escovado', 'M502', 'Formica', '#9CA3AF'],
    ['Branco Postforming 1,3mm', 'PF-BR-13', 'Formica', '#FFFFFF'], ['Freijó Puro', 'PP-4522', 'Pertech', '#B38B57'], ['Champagne Metalizado', 'PT-MET-88', 'Pertech', '#C9B599'],
    ['Fendi Contemporâneo', 'PT-UNI-32', 'Pertech', '#9A8E7F'],
  ];
  const FORMICA_ACAB = ['Texturizado (TX)', 'Fosco / soft (FC)', 'Brilhante (BR)', 'Postforming', 'Madeirado', 'Metalizado'];
  const FORMICA_ESP = ['0,8mm (standard)', '1,3mm (postforming)', '3mm (compacto TS)'];

  const MADEIRAS = [
    ['Freijó maciço', 'Média densidade', 'Ótima usinagem, ripados e puxadores'], ['Cumaru', 'Muito alta densidade', 'Tampos e áreas de contato'],
    ['Cedro rosa', 'Média/baixa', 'Leve e durável'], ['Tauari', 'Média', 'Tom claro, bom custo-benefício'],
    ['Teca (teak)', 'Resistente à umidade', 'Tampos e ilhas'], ['Carvalho maciço', 'Alta dureza', 'Padrão internacional de luxo'],
    ['Peroba rosa / demolição', 'Alta densidade', 'Textura rústica'], ['Garapeira', 'Alta densidade', 'Tom dourado mel'],
  ];
  const MADEIRA_TRAT = ['Natural selado', 'Óleo mineral / cera', 'Verniz PU fosco', 'Verniz PU marítimo', 'Tingido / ebanizado', 'Escovado / texturizado'];

  window.OPCOES = {
    PUXADOR, LED_FITA, LED_PERFIL, LED_FONTE, LED_LOCAL, LED_TEMP, DOB, COR, CORRER, PASSAGEM, PORTAS, TAMP, TAMP_ESP,
    FECH_MODELOS, FECH_ONDE, FECH_ACAB, FECH_MARCAS, TECIDOS, TEC_RESP, TEC_APLIC, ESPUMAS,
    VIDROS, VIDRO_ESP, VIDRO_PROC, VIDRO_PERFIL, LACA_MARCAS, LACA_BRILHO, LACA_CORES,
    LAMINA_MARCAS, LAMINA_TONS, LAMINAS, VERNIZES, FORMICA, FORMICA_ACAB, FORMICA_ESP, MADEIRAS, MADEIRA_TRAT,
  };
})();
