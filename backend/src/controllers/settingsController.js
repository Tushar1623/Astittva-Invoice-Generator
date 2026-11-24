const { getCompanySettingsCollection } = require('../config/db');
const { logAuditAction } = require('../services/auditService');

const defaultSettings = {
  companyName: 'ASTITTVA MARKETING Pvt Ltd',
  address: 'PS IXL Building, 5th Floor, Room 511, Biswa Bangla Sarani, Atghara, New Town, Kolkata, West Bengal 700136',
  rera: 'WBRERA/R-001354',
  phone: '92303 74718',
  email: 'businessdevelopment@astittva.in',
  gstin: '19ABFCA7189M1ZV',
  state: '19 – West Bengal',
  bankName: 'AU Small Finance Bank',
  accountNumber: '2602262416089178',
  ifsc: 'AUBL0002624',
  accountHolder: 'ASTITTVA MARKETING Pvt Ltd',
  defaultHsn: '1164',
  defaultCgstRate: 9,
  defaultSgstRate: 9
};

async function getSettings(req, res) {
  try {
    const col = getCompanySettingsCollection();
    let doc = await col.findOne({ _id: 'global_settings' });
    if (!doc) {
      doc = { _id: 'global_settings', ...defaultSettings, createdAt: new Date() };
      await col.insertOne(doc);
    }
    res.json({ success: true, settings: doc });
  } catch (err) {
    console.error('[SettingsController] getSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateSettings(req, res) {
  try {
    const col = getCompanySettingsCollection();
    const data = req.body;

    delete data._id;
    data.updatedAt = new Date();

    await col.updateOne(
      { _id: 'global_settings' },
      { $set: data },
      { upsert: true }
    );

    await logAuditAction({
      action: 'SETTINGS_UPDATE',
      entityId: 'global_settings',
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: data
    });

    const updated = await col.findOne({ _id: 'global_settings' });
    res.json({ success: true, message: 'Settings saved successfully.', settings: updated });
  } catch (err) {
    console.error('[SettingsController] updateSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  defaultSettings
};
