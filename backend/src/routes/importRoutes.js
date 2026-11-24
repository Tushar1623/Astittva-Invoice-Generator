const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { optionalAuth } = require('../middleware/auth');
const {
  uploadReceipts,
  getImports,
  verifyImport,
  getFile,
  deleteImport
} = require('../controllers/importController');

router.post('/upload', optionalAuth, upload.array('files', 20), uploadReceipts);
router.get('/', optionalAuth, getImports);
router.post('/:id/verify', optionalAuth, verifyImport);
router.get('/file/:id', getFile);
router.delete('/:id', optionalAuth, deleteImport);

module.exports = router;
