const sequelize = require('../config/database');
const User = require('./User');
const Propina = require('./Propina');
const Payment = require('./Payment');
const News = require('./News');
const Event = require('./Event');
const Comunicado = require('./Comunicado');
const Material = require('./Material');
const Horario = require('./Horario');
const AuditLog = require('./AuditLog');
const ForumPost = require('./ForumPost');
const PageContent = require('./PageContent');
const TeamMember = require('./TeamMember');
const Nota = require('./Nota');
const Trabalho = require('./Trabalho');
const EntregaTrabalho = require('./EntregaTrabalho');

// Associations
User.hasOne(Propina, { foreignKey: 'user_id', as: 'propina' });
Propina.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Propina.hasMany(Payment, { foreignKey: 'propina_id', as: 'payments' });
Payment.belongsTo(Propina, { foreignKey: 'propina_id', as: 'propina' });

User.hasMany(News, { foreignKey: 'autor_id', as: 'noticias' });
News.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

User.hasMany(ForumPost, { foreignKey: 'autor_id', as: 'posts' });
ForumPost.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

ForumPost.hasMany(ForumPost, { foreignKey: 'parent_id', as: 'respostas' });
ForumPost.belongsTo(ForumPost, { foreignKey: 'parent_id', as: 'parent' });

User.hasMany(Comunicado, { foreignKey: 'autor_id', as: 'comunicados' });
Comunicado.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

User.hasMany(Material, { foreignKey: 'enviado_por', as: 'materiais' });
Material.belongsTo(User, { foreignKey: 'enviado_por', as: 'autor' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Professor associations
User.hasMany(Nota,          { foreignKey: 'professor_id',   as: 'notas_dadas' });
User.hasMany(Nota,          { foreignKey: 'seminarista_id', as: 'notas_recebidas' });
Nota.belongsTo(User,        { foreignKey: 'professor_id',   as: 'professor' });
Nota.belongsTo(User,        { foreignKey: 'seminarista_id', as: 'seminarista' });

User.hasMany(Trabalho,      { foreignKey: 'professor_id',   as: 'trabalhos' });
Trabalho.belongsTo(User,    { foreignKey: 'professor_id',   as: 'professor' });

Trabalho.hasMany(EntregaTrabalho, { foreignKey: 'trabalho_id',    as: 'entregas' });
EntregaTrabalho.belongsTo(Trabalho, { foreignKey: 'trabalho_id',  as: 'trabalho' });
User.hasMany(EntregaTrabalho,     { foreignKey: 'seminarista_id', as: 'entregas' });
EntregaTrabalho.belongsTo(User,   { foreignKey: 'seminarista_id', as: 'seminarista' });

User.hasMany(Horario,       { foreignKey: 'professor_id',   as: 'horarios_lecionados' });
Horario.belongsTo(User,     { foreignKey: 'professor_id',   as: 'professor_user' });

module.exports = {
  sequelize,
  User, Propina, Payment, News, Event, Comunicado, Material,
  Horario, AuditLog, ForumPost, PageContent, TeamMember,
  Nota, Trabalho, EntregaTrabalho,
};
