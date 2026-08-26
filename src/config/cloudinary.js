const cloudinary = require('cloudinary').v2;

// Só configurado quando as três variáveis existirem — permite continuar a
// correr em desenvolvimento sem conta Cloudinary (ver middleware/upload.js).
const CLOUDINARY_CONFIGURADO = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_CONFIGURADO) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

module.exports = { cloudinary, CLOUDINARY_CONFIGURADO };
