const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { cloudinary, CLOUDINARY_CONFIGURADO } = require('../config/cloudinary');

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];

let storage;

if (CLOUDINARY_CONFIGURADO) {
  // Ficheiros guardados no Cloudinary sobrevivem a qualquer deploy — ao
  // contrário do disco local do Render (nível gratuito), que é efémero e
  // é limpo a cada novo deploy, apagando qualquer imagem/documento
  // carregado entretanto.
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: 'seminario-sje',
      resource_type: 'auto', // 'auto' aceita imagens e documentos (pdf/doc)
      public_id: crypto.randomBytes(12).toString('hex'),
    }),
  });
} else {
  // Modo local — usado apenas quando o Cloudinary não está configurado
  // (ex.: ambiente de desenvolvimento sem credenciais). Em produção, isto
  // significa que os ficheiros desaparecem no próximo deploy.
  const UPLOAD_PATH = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_PATH),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(12).toString('hex');
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  if (ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro não permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
});

// Devolve o URL público a guardar na base de dados, independentemente do
// backend de armazenamento usado — Cloudinary devolve logo o URL https
// completo em req.file.path; o disco local só guarda o nome do ficheiro.
function getFileUrl(file) {
  return file.path && /^https?:\/\//.test(file.path) ? file.path : `/uploads/${file.filename}`;
}

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
module.exports.CLOUDINARY_CONFIGURADO = CLOUDINARY_CONFIGURADO;
