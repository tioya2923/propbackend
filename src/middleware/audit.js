const { AuditLog } = require('../models');

function audit(acao, recurso) {
  return async (req, res, next) => {
    const original = res.json.bind(res);
    res.json = function (body) {
      AuditLog.create({
        user_id: req.user?.id || null,
        acao,
        recurso,
        recurso_id: req.params?.id || null,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        detalhes: { method: req.method, path: req.path },
        sucesso: res.statusCode < 400,
      }).catch(() => {});
      return original(body);
    };
    next();
  };
}

module.exports = audit;
