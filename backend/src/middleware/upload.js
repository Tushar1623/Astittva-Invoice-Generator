const multer = require('multer');

// Memory storage keeps file buffer in RAM for SHA-256 hash calculation,
// text extraction, and direct streaming to MongoDB GridFS
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

function fileFilter(req, file, cb) {
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, JPG, JPEG, and PNG files are allowed.`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB per file
  }
});

module.exports = upload;
