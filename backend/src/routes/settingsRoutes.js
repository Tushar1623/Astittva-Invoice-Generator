const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getSettings);
router.put('/', optionalAuth, updateSettings);

module.exports = router;
