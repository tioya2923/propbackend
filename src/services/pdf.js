const PDFDocument = require('pdfkit');

function generateRecibo(payment, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Seminário Propedêutico São João Evangelista', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Huambo, Angola', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text('RECIBO DE PAGAMENTO', { align: 'center' });
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const data = [
      ['N.º Recibo:', payment.id.substring(0, 8).toUpperCase()],
      ['Data:', new Date(payment.data_pagamento || payment.createdAt).toLocaleDateString('pt-PT')],
      ['Seminarista:', user.nome],
      ['Email:', user.email],
      ['Período:', payment.periodo_referencia || '—'],
      ['Método:', payment.metodo === 'cartao' ? 'Cartão Bancário' : 'Multibanco'],
      ['Referência:', payment.referencia_transacao || '—'],
    ];

    doc.font('Helvetica').fontSize(12);
    data.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 150 });
      doc.font('Helvetica').text(value);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(20).font('Helvetica-Bold')
       .text(`TOTAL PAGO: ${payment.valor} ${payment.moeda}`, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
       .text('Este documento foi gerado automaticamente e tem validade legal.', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateRecibo };
