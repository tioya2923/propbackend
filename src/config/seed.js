require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Propina, News, Event, Horario, Comunicado, ForumPost, PageContent, TeamMember } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  console.log('Seeding database...');

  // ── Administrador ──────────────────────────────────────────────────────────
  const admin = await User.create({
    nome: 'Pe. Director',
    email: 'admin@sje.ao',
    password_hash: 'Admin@1234',
    permissoes: 'admin',
    ativo: true,
  });

  // ── Staff ──────────────────────────────────────────────────────────────────
  const staff1 = await User.create({
    nome: 'Pe. João Paulo Mendes',
    email: 'staff1@sje.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    cargo: 'professor',
    ativo: true,
  });

  const staff2 = await User.create({
    nome: 'Pe. Manuel Costa Silva',
    email: 'staff2@sje.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    cargo: 'professor',
    ativo: true,
  });

  // ── Seminaristas (anos 1–2, propedêutico) ─────────────────────────────────
  const nomes = [
    'Tomás Agostinho Lemos',
    'Bernardo Kalunga Nzaji',
    'Ezequiel Mário Domingos',
    'Rafael Sebastião Pinto',
    'Lourenço Afonso Cunha',
    'André Luciano Baptista',
    'Celestino Muanda Kongo',
    'Domingos Ferreira Neto',
  ];
  const seminaristas = [];
  for (let i = 0; i < nomes.length; i++) {
    const s = await User.create({
      nome: nomes[i],
      email: `sem${i + 1}@sje.ao`,
      password_hash: 'Seminarista@1234',
      permissoes: 'seminarista',
      ano_formacao: (i % 2) + 1,
      data_entrada: new Date(2024, 8, 1),
      ativo: true,
    });
    await Propina.create({
      user_id: s.id,
      montante_mensal: 45000,
      moeda: 'AOA',
      data_vencimento: new Date(2026, 4, 15),
      saldo_devedor: i % 3 === 0 ? 45000 : 0,
      bolsa: i === 2,
      desconto_percentagem: i === 2 ? 50 : 0,
    });
    seminaristas.push(s);
  }
  console.log('Utilizadores criados');

  // ── Notícias ────────────────────────────────────────────────────────────────
  await News.create({
    titulo: 'Início do ano propedêutico 2025/2026',
    categoria: 'academico', destaque: true,
    resumo: 'O Seminário Propedêutico São João Evangelista acolhe novos candidatos ao sacerdócio.',
    conteudo: '<p>Com grande alegria, o Seminário Propedêutico São João Evangelista abre as suas portas a um novo ano de formação. Os candidatos iniciam aqui a sua jornada rumo ao sacerdócio.</p>',
    autor_id: admin.id, publicado: true, data_publicacao: new Date(),
    slug: 'inicio-ano-propedeutico-2025-2026',
  });
  await News.create({
    titulo: 'Visita pastoral do Sr. Arcebispo',
    categoria: 'comunidade', destaque: true,
    resumo: 'O Sr. Arcebispo presidiu à Eucaristia e encontrou-se com a comunidade seminarística.',
    conteudo: '<p>O Sr. Arcebispo visitou a comunidade do Seminário Propedêutico São João Evangelista e presidiu à celebração eucarística, encorajando os candidatos na sua vocação.</p>',
    autor_id: admin.id, publicado: true, data_publicacao: new Date(),
    slug: 'visita-pastoral-arcebispo',
  });
  console.log('Notícias criadas');

  // ── Eventos ─────────────────────────────────────────────────────────────────
  await Event.create({ titulo: 'Festa de São João Evangelista', descricao: 'Celebração solene do Padroeiro com toda a comunidade', data_inicio: new Date(2026, 11, 27), tipo: 'liturgico', publico: true, criado_por: admin.id });
  await Event.create({ titulo: 'Exames do 1.º Semestre', descricao: 'Período de avaliações académicas', data_inicio: new Date(2026, 0, 15), data_fim: new Date(2026, 0, 28), tipo: 'academico', publico: false, criado_por: admin.id });
  await Event.create({ titulo: 'Retiro Espiritual Anual', descricao: 'Retiro de espiritualidade para toda a comunidade', data_inicio: new Date(2026, 2, 10), data_fim: new Date(2026, 2, 13), tipo: 'formacao', publico: false, criado_por: staff1.id });
  await Event.create({ titulo: 'Dia de Portas Abertas', descricao: 'Visita ao Seminário para jovens interessados na vida sacerdotal', data_inicio: new Date(2026, 4, 3), tipo: 'comunitario', publico: true, criado_por: admin.id });
  console.log('Eventos criados');

  // ── Horários (anos 1–2) ──────────────────────────────────────────────────
  const disciplinas = [
    'Introdução à Teologia', 'Latim', 'Grego',
    'História da Igreja', 'Filosofia Introdutória', 'Literatura e Comunicação',
    'Canto Gregoriano', 'Espiritualidade', 'Bíblia — Iniciação',
  ];
  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  for (let ano = 1; ano <= 2; ano++) {
    for (let i = 0; i < 5; i++) {
      await Horario.create({
        ano_formacao: ano,
        dia_semana: dias[i],
        hora_inicio: `0${8 + (i % 3)}:00`,
        hora_fim: `0${9 + (i % 3)}:30`,
        disciplina: disciplinas[(ano - 1) * 4 + (i % disciplinas.length)],
        professor: 'Pe. ' + ['João Mendes', 'Manuel Silva', 'António Ferreira', 'Pedro Alves', 'Carlos Neto'][i],
        sala: `Sala ${ano === 1 ? 'A' : 'B'}${i + 1}`,
      });
    }
  }
  console.log('Horários criados');

  // ── Comunicados ─────────────────────────────────────────────────────────────
  await Comunicado.create({
    titulo: 'Normas do ano propedêutico 2025/2026',
    conteudo: '<p>Caros seminaristas, informamos que o ano propedêutico terá início no dia 8 de Setembro. Consultem o regulamento actualizado no portal.</p>',
    autor_id: admin.id, destinatarios: 'todos',
  });
  await Comunicado.create({
    titulo: 'Festa de São João Evangelista — toda a comunidade',
    conteudo: '<p>A Festa do nosso Padroeiro São João Evangelista será celebrada a 27 de Dezembro com Missa solene presidida pelo Sr. Arcebispo.</p>',
    autor_id: admin.id, destinatarios: 'todos',
  });

  // ── Fórum ───────────────────────────────────────────────────────────────────
  await ForumPost.create({
    titulo: 'Recursos de Latim para o 1.º Ano',
    conteudo: 'Partilho alguns recursos úteis para o estudo do Latim neste primeiro ano.',
    autor_id: seminaristas[0].id, categoria: 'academico', fixado: false,
  });
  await ForumPost.create({
    titulo: 'Aviso: Horário de Confissões',
    conteudo: 'O Pe. Director informa que o horário de confissões é às 16h00, de segunda a sexta.',
    autor_id: staff1.id, categoria: 'geral', fixado: true,
  });
  await ForumPost.create({
    titulo: 'Dúvidas sobre Introdução à Teologia',
    conteudo: 'Alguém pode partilhar os apontamentos da última aula?',
    autor_id: seminaristas[2].id, categoria: 'academico', fixado: false,
  });
  console.log('Comunicados + Fórum criados');

  // ── Equipa Formadora ──────────────────────────────────────────────────────
  await TeamMember.create({ nome: 'Pe. Director', cargo: 'Director', area: 'Direcção', ordem: 1 });
  await TeamMember.create({ nome: 'Pe. João Paulo Mendes', cargo: 'Vice-Director e Prefeito de Disciplina', area: 'Direcção', ordem: 2 });
  await TeamMember.create({ nome: 'Pe. Manuel Costa Silva', cargo: 'Director Espiritual', area: 'Espiritual', ordem: 3 });
  console.log('Equipa criada');

  // ── Conteúdo das páginas ──────────────────────────────────────────────────
  const conteudos = [
    { pagina: 'contactos', chave: 'morada',   valor: 'Av. do Seminário, s/n\nHuambo, Angola', tipo: 'text' },
    { pagina: 'contactos', chave: 'telefone', valor: '+244 222 000 001', tipo: 'text' },
    { pagina: 'contactos', chave: 'email',    valor: 'info@sje.ao', tipo: 'text' },
    { pagina: 'contactos', chave: 'horario',  valor: 'Seg–Sex: 08:00–16:00\nSáb: 08:00–12:00', tipo: 'text' },

    { pagina: 'ajudar', chave: 'hero_subtitulo',          valor: 'A sua generosidade transforma vidas e forma futuros sacerdotes ao serviço de Angola.', tipo: 'text' },
    { pagina: 'ajudar', chave: 'apadrinhamento_descricao', valor: 'Ao apadrinhar um seminarista, contribui mensalmente para cobrir os custos da sua formação propedêutica.', tipo: 'text' },
    { pagina: 'ajudar', chave: 'apadrinhamento_beneficios', valor: JSON.stringify(['Recebe cartas e actualizações do seminarista que apoia', 'Convite para a celebração de envio ao fim do propedêutico', 'Oração especial do seminarista por si', 'Contribuição a partir de 45.000 Kz/mês']), tipo: 'json' },
    { pagina: 'ajudar', chave: 'email_apadrinhamento', valor: 'info@sje.ao', tipo: 'text' },
    { pagina: 'ajudar', chave: 'email_oracao',          valor: 'oracao@sje.ao', tipo: 'text' },
    { pagina: 'ajudar', chave: 'oracao_texto',           valor: 'Envie o seu pedido de oração e os nossos seminaristas orarão por si durante a Missa e a oração comunitária.', tipo: 'text' },

    { pagina: 'seminario', chave: 'reitor_nome',      valor: 'Pe. Director', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_cargo',     valor: 'Director do Seminário Propedêutico', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_citacao',   valor: '"O ano propedêutico é o tempo do discernimento e da decisão. Aqui o jovem aprende a escutar a voz de Deus e a responder com toda a sua vida."', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_descricao', valor: 'O Seminário Propedêutico São João Evangelista é a porta de entrada na vida seminarística. Durante um ou dois anos, os candidatos ao sacerdócio recebem uma formação humana, espiritual, intelectual e pastoral que os prepara para os estudos filosóficos e teológicos.', tipo: 'text' },
    { pagina: 'seminario', chave: 'disciplinas',      valor: JSON.stringify(['Introdução à Teologia', 'Latim', 'Grego', 'História da Igreja', 'Filosofia Introdutória', 'Literatura e Comunicação', 'Canto Gregoriano', 'Espiritualidade', 'Bíblia — Iniciação']), tipo: 'json' },
    { pagina: 'seminario', chave: 'stats',            valor: JSON.stringify([{ valor: '8', desc: 'Seminaristas' }, { valor: '2', desc: 'Anos de formação' }, { valor: '3', desc: 'Formadores' }]), tipo: 'json' },
    { pagina: 'seminario', chave: 'historia',         valor: JSON.stringify([
      { ano: '2010', titulo: 'Fundação', desc: 'O Seminário Propedêutico São João Evangelista é fundado pela Arquidiocese do Huambo para acolher os primeiros candidatos ao sacerdócio.' },
      { ano: '2015', titulo: 'Crescimento', desc: 'Abertura de novas instalações e consolidação do programa de formação propedêutica.' },
      { ano: '2020', titulo: 'Renovação', desc: 'Lançamento do portal digital de gestão académica e pastoral.' },
      { ano: 'Hoje', titulo: 'Missão Viva', desc: 'Com jovens de toda a Arquidiocese, o Seminário continua a discernir e acompanhar futuras vocações sacerdotais.' },
    ]), tipo: 'json' },
    { pagina: 'seminario', chave: 'infraestruturas', valor: JSON.stringify([
      { emoji: '📚', nome: 'Biblioteca',   desc: 'Acervo de formação' },
      { emoji: '⛪', nome: 'Capela',       desc: 'Celebrações diárias' },
      { emoji: '🍽️', nome: 'Refeitório',  desc: 'Refeições comuns' },
      { emoji: '⚽', nome: 'Desporto',     desc: 'Campo e ginásio' },
      { emoji: '🏥', nome: 'Enfermaria',   desc: 'Cuidados básicos' },
      { emoji: '💻', nome: 'Laboratório',  desc: 'Informática' },
      { emoji: '🌿', nome: 'Jardins',      desc: 'Espaços de oração' },
      { emoji: '🏫', nome: 'Salas de Aula', desc: 'Equipadas' },
    ]), tipo: 'json' },

    { pagina: 'vocacao', chave: 'hero_subtitulo', valor: 'Se sentes um chamamento interior para servir a Deus como sacerdote, o Seminário Propedêutico está aqui para acompanhar o teu discernimento.', tipo: 'text' },
    { pagina: 'vocacao', chave: 'testemunhos', valor: JSON.stringify([
      { nome: 'Pe. Carlos Neto', ano: 'Ordenado em 2020', texto: '"O propedêutico foi o tempo mais transformador da minha vida. Aprendi a rezar, a silenciar e a ouvir Deus."' },
      { nome: 'Pe. Manuel Silva', ano: 'Ordenado em 2022', texto: '"Entrei cheio de dúvidas e saí com uma certeza: este é o meu caminho. O acompanhamento espiritual foi fundamental."' },
      { nome: 'Pe. João Paulo Dias', ano: 'Ordenado em 2023', texto: '"São João Evangelista foi para mim uma escola de humanidade e de fé. Recomendo a qualquer jovem que sinta o chamamento."' },
    ]), tipo: 'json' },
    { pagina: 'vocacao', chave: 'faqs', valor: JSON.stringify([
      { q: 'O que é o ano propedêutico?', a: 'É um período de preparação e discernimento que antecede os estudos filosóficos e teológicos no seminário maior. Dura um ou dois anos conforme a maturidade do candidato.' },
      { q: 'Que requisitos são necessários?', a: 'Ser do sexo masculino, católico praticante, ter concluído o ensino secundário, boa saúde física e psicológica, e carta de recomendação do pároco.' },
      { q: 'O que se aprende no propedêutico?', a: 'Introdução à Teologia, Latim, Grego, História da Igreja, Filosofia Introdutória, Espiritualidade e formação humana e pastoral.' },
      { q: 'Posso visitar o Seminário?', a: 'Sim! Organizamos dias abertos e fins-de-semana vocacionais. Entre em contacto para agendar uma visita.' },
      { q: 'Como me candidatar?', a: 'A candidatura é feita junto da sua diocese ou paróquia, ou directamente no Seminário, entre Junho e Agosto de cada ano.' },
    ]), tipo: 'json' },

    { pagina: 'comunidade', chave: 'vida_comunitaria', valor: JSON.stringify([
      { titulo: 'Oração Comum',       desc: 'A Liturgia das Horas e a Santa Missa estruturam cada dia, tornando a oração o centro da vida comunitária.' },
      { titulo: 'Estudo e Formação',  desc: 'Aulas, leitura espiritual e grupos de partilha formam o seminarista intelectual e humanamente.' },
      { titulo: 'Convívio Fraterno',  desc: 'Refeições partilhadas, desporto e actividades culturais constroem uma fraternidade genuína.' },
      { titulo: 'Serviço Pastoral',   desc: 'Ao fim-de-semana, os seminaristas participam na pastoral das paróquias da Arquidiocese do Huambo.' },
    ]), tipo: 'json' },
    { pagina: 'comunidade', chave: 'associacoes', valor: JSON.stringify(['Amigos do Seminário', 'Famílias Vocacionais', 'Benefactores da Diocese']), tipo: 'json' },
  ];
  for (const c of conteudos) await PageContent.create(c);
  console.log('Conteúdos criados');

  console.log('\n✓ Base de dados inicializada com sucesso!\n');
  console.log('  Admin        : admin@sje.ao        / Admin@1234');
  console.log('  Staff 1      : staff1@sje.ao        / Staff@1234');
  console.log('  Staff 2      : staff2@sje.ao        / Staff@1234');
  console.log('  Seminaristas : sem1@sje.ao … sem8@sje.ao / Seminarista@1234\n');

  await sequelize.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
