const { Op } = require('sequelize');
const { Propina } = require('../models');
const logger = require('../utils/logger');

// Trabalha sempre com strings "YYYY-MM-DD" (comparam-se correctamente por
// ordem alfabética) em vez de instantes de Date — evita qualquer ambiguidade
// entre o fuso horário do servidor e o fuso em que a data foi gravada, que
// podia adiantar ou atrasar um lançamento em um dia perto da meia-noite.
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Avança uma data (string "YYYY-MM-DD") um mês — se o mês seguinte não tiver
// esse dia (ex.: 31 de Janeiro), cai no último dia desse mês em vez de
// "transbordar" para o mês a seguir.
function proximoMesISO(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() !== dia) d.setUTCDate(0);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Soma ao saldo devedor uma mensalidade por cada vencimento já ultrapassado
// e avança a data de vencimento para o próximo mês — tudo em memória, sem
// gravar. Devolve true se alterou algo. Limitado a 24 iterações (2 anos)
// para nunca ficar preso caso uma propina fique meses/anos sem ser vista.
function calcularMensalidadesEmAtraso(propina) {
  if (!propina.data_vencimento) return false;

  const hoje = hojeISO();
  // Sequelize devolve DATEONLY como string "YYYY-MM-DD"; normaliza na
  // mesma, mesmo que por algum motivo venha como Date.
  let vencimento = typeof propina.data_vencimento === 'string'
    ? propina.data_vencimento
    : propina.data_vencimento.toISOString().slice(0, 10);
  let alterado = false;

  for (let i = 0; vencimento <= hoje && i < 24; i++) {
    const desconto = propina.bolsa ? propina.desconto_percentagem : 0;
    const montanteEfectivo = parseFloat(propina.montante_mensal) * (1 - desconto / 100);
    propina.saldo_devedor = parseFloat(propina.saldo_devedor) + montanteEfectivo;
    vencimento = proximoMesISO(vencimento);
    alterado = true;
  }

  if (alterado) propina.data_vencimento = vencimento;
  return alterado;
}

// Percorre todas as propinas com data de vencimento definida e lança as
// mensalidades em atraso. Chamado ao arrancar o servidor (apanha o que
// ficou por lançar enquanto esteve inactivo) e uma vez por dia via cron.
async function aplicarMensalidadesEmAtraso() {
  const propinas = await Propina.findAll({ where: { data_vencimento: { [Op.ne]: null } } });
  let total = 0;
  for (const propina of propinas) {
    if (calcularMensalidadesEmAtraso(propina)) {
      await propina.save();
      total++;
    }
  }
  if (total > 0) logger.info('Mensalidades lançadas automaticamente', { seminaristas: total });
  return total;
}

module.exports = { aplicarMensalidadesEmAtraso, calcularMensalidadesEmAtraso };
