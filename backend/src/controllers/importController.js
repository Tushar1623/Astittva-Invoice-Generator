const { ObjectId } = require('mongodb');
const { 
  getImportsCollection, 
  getInvoicesCollection, 
  getGridFSBucket, 
  getClientsCollection 
} = require('../config/db');
const { 
  calculateFileHash, 
  extractTextFromFile, 
  parseInvoiceFieldsFromText 
} = require('../services/ocrService');
const { 
  parseInvoiceNumber, 
  registerImportedSerial, 
  isInvoiceNumberUsed,
  formatInvoiceNumber
} = require('../services/counterService');
const { calculateFinancials } = require('../services/calculationService');
const { logAuditAction } = require('../services/auditService');

/**
 * Handle multi-file receipt uploads.
 * Validates, calculates SHA-256 hash, stores in GridFS, extracts text, and queues for verification.
 */
async function uploadReceipts(req, res) {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const imports = getImportsCollection();
    const bucket = getGridFSBucket();
    const results = [];
    const isForce = req.query.force === 'true' || req.query.overwrite === 'true';

    for (const file of files) {
      const fileHash = calculateFileHash(file.buffer);

      // Check for duplicate file hash
      const existingImport = await imports.findOne({ fileHash });
      if (existingImport) {
        if (!isForce) {
          results.push({
            filename: file.originalname,
            status: 'duplicate',
            error: `Receipt "${file.originalname}" was already uploaded previously.`,
            existingImportId: existingImport._id,
            existingInvoiceNumber: existingImport.extractedData?.invoiceNumber || existingImport.verifiedInvoiceNumber || '',
            existingClientName: existingImport.extractedData?.clientName || '',
            existingStatus: existingImport.status,
            fileHash
          });
          continue;
        } else {
          // If force re-upload is requested and older import is not verified, replace it
          if (existingImport.status !== 'verified') {
            await imports.deleteOne({ _id: existingImport._id });
          }
        }
      }

      // Stream file buffer to MongoDB GridFS
      const uploadStream = bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: {
          fileHash,
          uploadedBy: req.user?.email || 'admin',
          uploadedAt: new Date()
        }
      });

      await new Promise((resolve, reject) => {
        uploadStream.end(file.buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const gridFsFileId = uploadStream.id;

      // Extract text & parse fields
      const extractedText = await extractTextFromFile(file.buffer, file.mimetype);
      const extractedData = parseInvoiceFieldsFromText(extractedText);

      // Detect if extracted invoice number is duplicate in database
      let duplicateInvoiceWarning = null;
      if (extractedData.invoiceNumber) {
        const isUsed = await isInvoiceNumberUsed(extractedData.invoiceNumber);
        if (isUsed) {
          duplicateInvoiceWarning = `Invoice number ${extractedData.invoiceNumber} already exists in records.`;
        }
      }

      const importRecord = {
        originalFilename: file.originalname,
        fileHash,
        gridFsFileId,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedText: extractedText.slice(0, 2000), // store preview of text
        extractedData,
        status: duplicateInvoiceWarning ? 'review_required' : 'pending_verification',
        warning: duplicateInvoiceWarning,
        verifiedInvoiceId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await imports.insertOne(importRecord);
      importRecord._id = insertResult.insertedId;

      await logAuditAction({
        action: 'RECEIPT_UPLOAD',
        entityId: insertResult.insertedId,
        userId: req.user?.email || 'admin',
        userName: req.user?.name || 'Admin',
        details: { filename: file.originalname, fileHash, gridFsFileId }
      });

      results.push({
        _id: insertResult.insertedId,
        filename: file.originalname,
        status: importRecord.status,
        gridFsFileId,
        extractedData,
        warning: duplicateInvoiceWarning
      });
    }

    const newImports = results.filter(r => r.status !== 'duplicate');
    const duplicates = results.filter(r => r.status === 'duplicate');

    res.json({
      success: true,
      count: results.length,
      newCount: newImports.length,
      duplicateCount: duplicates.length,
      imports: results,
      newImports,
      duplicates
    });
  } catch (err) {
    console.error('[ImportController] uploadReceipts error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * List all imported receipts.
 */
async function getImports(req, res) {
  try {
    const imports = getImportsCollection();
    const list = await imports.find().sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: list.length, imports: list });
  } catch (err) {
    console.error('[ImportController] getImports error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Verify and commit an imported receipt as an active tax invoice.
 */
async function verifyImport(req, res) {
  try {
    const { id } = req.params;
    const verifiedData = req.body;

    const imports = getImportsCollection();
    const importDoc = await imports.findOne({ _id: new ObjectId(id) });
    if (!importDoc) {
      return res.status(404).json({ success: false, error: 'Import record not found.' });
    }

    const invNumber = verifiedData.invoiceNumber || importDoc.extractedData.invoiceNumber;
    if (!invNumber) {
      return res.status(400).json({ success: false, error: 'Invoice number is required to verify.' });
    }

    // Check duplicate invoice number
    const isUsed = await isInvoiceNumberUsed(invNumber);
    if (isUsed && !verifiedData.overrideDuplicate) {
      return res.status(400).json({ 
        success: false, 
        error: `Invoice number "${invNumber}" is already in use by another invoice.` 
      });
    }

    // Parse serial, month, year from invoice number
    const parsed = parseInvoiceNumber(invNumber);
    let serial = 1;
    let month = 11;
    let year = 2026;

    if (parsed) {
      serial = parsed.serial;
      month = parsed.month;
      year = parsed.year;
    } else if (verifiedData.invoiceDate) {
      const d = new Date(verifiedData.invoiceDate);
      month = d.getMonth() + 1;
      year = d.getFullYear();
    }

    // Monotonically register imported serial so counter never decreases
    await registerImportedSerial(serial, month, year);

    // Calculate financials
    const financials = calculateFinancials({
      quantity: verifiedData.quantity || 1,
      pricePerUnit: verifiedData.pricePerUnit || verifiedData.taxableAmount || importDoc.extractedData.taxableAmount || 103448,
      cgstRate: verifiedData.cgstRate !== undefined ? verifiedData.cgstRate : 9,
      sgstRate: verifiedData.sgstRate !== undefined ? verifiedData.sgstRate : 9
    });

    const newInvoice = {
      invoiceNumber: invNumber,
      serialNumber: serial,
      month,
      year,
      invoiceDate: verifiedData.invoiceDate || importDoc.extractedData.invoiceDate || new Date().toISOString().slice(0, 10),
      placeOfSupply: verifiedData.placeOfSupply || '19 – West Bengal',
      customerName: verifiedData.customerName || importDoc.extractedData.customerName || 'NK Realtors Private Limited',
      customerGstin: (verifiedData.customerGstin || '').toUpperCase(),
      customerState: verifiedData.customerState || '19 – West Bengal',
      billingAddress: verifiedData.billingAddress || 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal',
      clientName: verifiedData.clientName || importDoc.extractedData.clientName || '',
      projectName: verifiedData.projectName || importDoc.extractedData.projectName || '',
      flatNumber: verifiedData.flatNumber || importDoc.extractedData.flatNumber || '',
      cvAmount: Number(verifiedData.cvAmount) || 0,
      brokeragePercentage: Number(verifiedData.brokeragePercentage) || 2,
      itemDescription: verifiedData.itemDescription || `Brokerage on ${verifiedData.projectName || 'Unit'} by ${verifiedData.clientName || 'Client'}`,
      hsnSac: verifiedData.hsnSac || '1164',
      quantity: financials.quantity,
      pricePerUnit: financials.pricePerUnit,
      financials,
      status: 'active',
      isImported: true,
      importFileId: importDoc.gridFsFileId,
      importRecordId: importDoc._id,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const invoices = getInvoicesCollection();
    const insertRes = await invoices.insertOne(newInvoice);
    newInvoice._id = insertRes.insertedId;

    // Update import record status to 'verified'
    await imports.updateOne(
      { _id: importDoc._id },
      {
        $set: {
          status: 'verified',
          verifiedInvoiceId: insertRes.insertedId,
          verifiedInvoiceNumber: invNumber,
          updatedAt: new Date()
        }
      }
    );

    // Cache client name
    if (newInvoice.clientName) {
      const clients = getClientsCollection();
      await clients.updateOne(
        { name: newInvoice.clientName.trim() },
        { $set: { name: newInvoice.clientName.trim(), lastSeenAt: new Date() } },
        { upsert: true }
      );
    }

    await logAuditAction({
      action: 'IMPORT_VERIFY',
      entityId: insertRes.insertedId,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { importId: importDoc._id, invoiceNumber: invNumber }
    });

    res.json({
      success: true,
      message: `Receipt verified and saved as invoice ${invNumber}.`,
      invoice: newInvoice
    });
  } catch (err) {
    console.error('[ImportController] verifyImport error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Stream an original uploaded receipt file from GridFS.
 */
async function getFile(req, res) {
  try {
    const { id } = req.params;
    const bucket = getGridFSBucket();

    let fileId;
    try {
      fileId = new ObjectId(id);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid file ID.' });
    }

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found in GridFS.' });
    }

    const file = files[0];
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (err) {
    console.error('[ImportController] getFile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Remove receipt from import history.
 * - Pending/Failed/Duplicate records are removed from the import queue.
 * - Verified & Saved receipts move their associated invoice to Trash (soft deletion).
 * - Original PDF/image files in GridFS are strictly preserved.
 * - Action is recorded in auditLogs.
 * - Invoice serial numbers are never reused or decreased.
 */
async function deleteImport(req, res) {
  try {
    const { id } = req.params;
    const imports = getImportsCollection();

    let queryId;
    try {
      queryId = new ObjectId(id);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid import ID.' });
    }

    const importDoc = await imports.findOne({ _id: queryId });
    if (!importDoc) {
      return res.status(404).json({ success: false, error: 'Import record not found.' });
    }

    let invoiceMovedToTrash = false;
    let invoiceNumber = null;

    // If verified, find associated invoice and move it to Trash (soft deletion)
    if (importDoc.status === 'verified') {
      const invoices = getInvoicesCollection();
      let invQuery = null;

      if (importDoc.verifiedInvoiceId) {
        invQuery = { _id: importDoc.verifiedInvoiceId };
      } else if (importDoc.verifiedInvoiceNumber) {
        invQuery = { invoiceNumber: importDoc.verifiedInvoiceNumber };
      } else if (importDoc.extractedData?.invoiceNumber) {
        invQuery = { invoiceNumber: importDoc.extractedData.invoiceNumber };
      }

      if (invQuery) {
        const associatedInv = await invoices.findOne(invQuery);
        if (associatedInv && associatedInv.status !== 'trash') {
          await invoices.updateOne(
            { _id: associatedInv._id },
            { $set: { status: 'trash', deletedAt: new Date() } }
          );
          invoiceMovedToTrash = true;
          invoiceNumber = associatedInv.invoiceNumber;
        }
      }
    }

    // Delete the import queue entry from invoiceImports
    await imports.deleteOne({ _id: queryId });

    // Record in auditLogs
    await logAuditAction({
      action: 'IMPORT_REMOVE',
      entity: 'invoiceImports',
      entityId: queryId,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: {
        filename: importDoc.originalFilename,
        status: importDoc.status,
        gridFsFileId: importDoc.gridFsFileId,
        invoiceMovedToTrash,
        invoiceNumber
      }
    });

    const message = invoiceMovedToTrash
      ? `Receipt removed from import queue. Associated invoice "${invoiceNumber}" moved to Trash.`
      : `Receipt "${importDoc.originalFilename}" removed from import history.`;

    res.json({
      success: true,
      message,
      wasVerified: importDoc.status === 'verified',
      invoiceMovedToTrash,
      invoiceNumber
    });
  } catch (err) {
    console.error('[ImportController] deleteImport error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  uploadReceipts,
  getImports,
  verifyImport,
  getFile,
  deleteImport
};
