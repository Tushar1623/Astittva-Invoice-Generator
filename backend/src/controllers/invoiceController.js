const { getInvoicesCollection, getClientsCollection, getClient, ObjectId } = require('../config/db');
const { 
  formatInvoiceNumber, 
  parseInvoiceNumber, 
  allocateNextInvoiceNumber, 
  peekNextNumber, 
  isInvoiceNumberUsed,
  registerImportedSerial
} = require('../services/counterService');
const { calculateFinancials } = require('../services/calculationService');
const { logAuditAction } = require('../services/auditService');

/**
 * List invoices with filtering, searching, and pagination.
 */
async function getInvoices(req, res) {
  try {
    const { 
      status = 'active', 
      search = '', 
      month, 
      year, 
      clientName 
    } = req.query;

    const invoices = getInvoicesCollection();
    const query = {};

    if (status === 'trash') {
      query.status = 'trash';
    } else {
      query.status = { $ne: 'trash' };
    }

    if (month) {
      query.month = parseInt(month, 10);
    }

    if (year) {
      query.year = parseInt(year, 10);
    }

    if (clientName) {
      query.clientName = { $regex: clientName.trim(), $options: 'i' };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { clientName: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { projectName: { $regex: q, $options: 'i' } },
        { customerGstin: { $regex: q, $options: 'i' } }
      ];
    }

    const list = await invoices
      .find(query)
      .sort({ year: -1, month: -1, serialNumber: -1, createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: list.length,
      invoices: list
    });
  } catch (err) {
    console.error('[InvoiceController] getInvoices error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get a single invoice by ID or invoiceNumber.
 */
async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;
    const invoices = getInvoicesCollection();

    let query;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { id: id }, { invoiceNumber: id }] };
    } catch {
      query = { $or: [{ id: id }, { invoiceNumber: id }] };
    }

    const invoice = await invoices.findOne(query);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    res.json({ success: true, invoice });
  } catch (err) {
    console.error('[InvoiceController] getInvoiceById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Peek next invoice number for a given client and date without consuming the sequence.
 */
async function getNextNumber(req, res) {
  try {
    const { clientName = '', date } = req.query;
    const invDate = date ? new Date(date) : new Date();
    const year = invDate.getFullYear();
    const month = invDate.getMonth() + 1;

    const peek = await peekNextNumber(clientName, year, month);
    res.json({ success: true, ...peek });
  } catch (err) {
    console.error('[InvoiceController] getNextNumber error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Create and issue a new invoice.
 * Atomically allocates invoice number upon issuance if not explicitly given.
 */
async function createInvoice(req, res) {
  try {
    const data = req.body;
    const invDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
    const year = invDate.getFullYear();
    const month = invDate.getMonth() + 1;

    let invoiceNumber = data.invoiceNumber;
    let serialNumber = data.serialNumber;

    // Allocate atomic sequential number if issuing new invoice
    if (!invoiceNumber || data.allocateNewNumber) {
      const allocated = await allocateNextInvoiceNumber(data.clientName, year, month);
      invoiceNumber = allocated.invoiceNumber;
      serialNumber = allocated.serialNumber;
    } else {
      // Validate uniqueness
      const isUsed = await isInvoiceNumberUsed(invoiceNumber);
      if (isUsed) {
        return res.status(400).json({ 
          success: false, 
          error: `Invoice number "${invoiceNumber}" is already in use by another invoice.` 
        });
      }
      // If manual number provided, ensure counter reflects it monotonically
      const parsed = parseInvoiceNumber(invoiceNumber);
      if (parsed) {
        serialNumber = parsed.serial;
        await registerImportedSerial(parsed.serial, parsed.month, parsed.year);
      }
    }

    // Calculate financials accurately
    const financials = calculateFinancials({
      quantity: data.quantity || 1,
      pricePerUnit: data.pricePerUnit || 0,
      cgstRate: data.cgstRate !== undefined ? data.cgstRate : 9,
      sgstRate: data.sgstRate !== undefined ? data.sgstRate : 9,
      igstRate: data.igstRate || 0
    });

    const newInvoice = {
      invoiceNumber,
      serialNumber: serialNumber || 1,
      month,
      year,
      invoiceDate: data.invoiceDate || new Date().toISOString().slice(0, 10),
      placeOfSupply: data.placeOfSupply || '19 – West Bengal',
      customerName: data.customerName || 'NK Realtors Private Limited',
      customerGstin: (data.customerGstin || '').toUpperCase(),
      customerState: data.customerState || '19 – West Bengal',
      billingAddress: data.billingAddress || '',
      clientName: data.clientName || '',
      projectName: data.projectName || '',
      flatNumber: data.flatNumber || '',
      cvAmount: Number(data.cvAmount) || 0,
      brokeragePercentage: Number(data.brokeragePercentage) || 0,
      itemDescription: data.itemDescription || '',
      hsnSac: data.hsnSac || '1164',
      quantity: financials.quantity,
      pricePerUnit: financials.pricePerUnit,
      financials,
      companySnapshot: data.companySnapshot || null,
      status: 'active',
      isImported: Boolean(data.isImported),
      importFileId: data.importFileId || null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const invoices = getInvoicesCollection();
    const result = await invoices.insertOne(newInvoice);
    newInvoice._id = result.insertedId;

    // Cache client name in clients collection
    if (newInvoice.clientName) {
      const clients = getClientsCollection();
      await clients.updateOne(
        { name: newInvoice.clientName.trim() },
        { $set: { name: newInvoice.clientName.trim(), lastSeenAt: new Date() } },
        { upsert: true }
      );
    }

    await logAuditAction({
      action: 'INVOICE_CREATE',
      entityId: result.insertedId,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { invoiceNumber, finalTotal: financials.finalTotal }
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} issued successfully.`,
      invoice: newInvoice
    });
  } catch (err) {
    console.error('[InvoiceController] createInvoice error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Update an existing invoice.
 */
async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const invoices = getInvoicesCollection();

    let query;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { id: id }] };
    } catch {
      query = { id: id };
    }

    const existing = await invoices.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    // Check for invoice number uniqueness if modified
    if (data.invoiceNumber && data.invoiceNumber !== existing.invoiceNumber) {
      const isUsed = await isInvoiceNumberUsed(data.invoiceNumber, existing._id);
      if (isUsed) {
        return res.status(400).json({ 
          success: false, 
          error: `Invoice number "${data.invoiceNumber}" is already in use by another invoice.` 
        });
      }
    }

    const financials = calculateFinancials({
      quantity: data.quantity !== undefined ? data.quantity : existing.quantity,
      pricePerUnit: data.pricePerUnit !== undefined ? data.pricePerUnit : existing.pricePerUnit,
      cgstRate: data.cgstRate !== undefined ? data.cgstRate : existing.financials?.cgstRate,
      sgstRate: data.sgstRate !== undefined ? data.sgstRate : existing.financials?.sgstRate,
      igstRate: data.igstRate !== undefined ? data.igstRate : (existing.financials?.igstRate || 0)
    });

    const updateFields = {
      ...(data.invoiceNumber && { invoiceNumber: data.invoiceNumber }),
      ...(data.invoiceDate && { invoiceDate: data.invoiceDate }),
      ...(data.placeOfSupply && { placeOfSupply: data.placeOfSupply }),
      ...(data.customerName && { customerName: data.customerName }),
      ...(data.customerGstin !== undefined && { customerGstin: data.customerGstin.toUpperCase() }),
      ...(data.customerState && { customerState: data.customerState }),
      ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress }),
      ...(data.clientName && { clientName: data.clientName }),
      ...(data.projectName !== undefined && { projectName: data.projectName }),
      ...(data.flatNumber !== undefined && { flatNumber: data.flatNumber }),
      ...(data.cvAmount !== undefined && { cvAmount: Number(data.cvAmount) }),
      ...(data.brokeragePercentage !== undefined && { brokeragePercentage: Number(data.brokeragePercentage) }),
      ...(data.itemDescription !== undefined && { itemDescription: data.itemDescription }),
      ...(data.hsnSac && { hsnSac: data.hsnSac }),
      quantity: financials.quantity,
      pricePerUnit: financials.pricePerUnit,
      financials,
      updatedAt: new Date()
    };

    await invoices.updateOne({ _id: existing._id }, { $set: updateFields });

    await logAuditAction({
      action: 'INVOICE_UPDATE',
      entityId: existing._id,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { invoiceNumber: updateFields.invoiceNumber || existing.invoiceNumber }
    });

    const updated = await invoices.findOne({ _id: existing._id });
    res.json({ success: true, message: 'Invoice updated successfully.', invoice: updated });
  } catch (err) {
    console.error('[InvoiceController] updateInvoice error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Move invoice to Trash.
 */
async function trashInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoices = getInvoicesCollection();

    let query;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { id: id }] };
    } catch {
      query = { id: id };
    }

    const existing = await invoices.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    await invoices.updateOne(
      { _id: existing._id },
      { $set: { status: 'trash', deletedAt: new Date() } }
    );

    await logAuditAction({
      action: 'INVOICE_TRASH',
      entityId: existing._id,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { invoiceNumber: existing.invoiceNumber }
    });

    res.json({ 
      success: true, 
      message: `Invoice ${existing.invoiceNumber} moved to Trash.` 
    });
  } catch (err) {
    console.error('[InvoiceController] trashInvoice error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Restore an invoice from Trash to active status.
 */
async function restoreInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoices = getInvoicesCollection();

    let query;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { id: id }] };
    } catch {
      query = { id: id };
    }

    const existing = await invoices.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    await invoices.updateOne(
      { _id: existing._id },
      { $set: { status: 'active', deletedAt: null } }
    );

    await logAuditAction({
      action: 'INVOICE_RESTORE',
      entityId: existing._id,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { invoiceNumber: existing.invoiceNumber }
    });

    res.json({ 
      success: true, 
      message: `Invoice ${existing.invoiceNumber} restored to active records.` 
    });
  } catch (err) {
    console.error('[InvoiceController] restoreInvoice error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Permanently delete an invoice.
 * Requirement:
 * "Maintain at least two retained invoice records. Enforce the restriction on the backend using transactional protection."
 * "Permanently delete with administrator permission."
 */
async function permanentDeleteInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoices = getInvoicesCollection();

    let query;
    try {
      query = { $or: [{ _id: new ObjectId(id) }, { id: id }] };
    } catch {
      query = { id: id };
    }

    const existing = await invoices.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    // Count all active / total retained invoices
    const totalCount = await invoices.countDocuments({ status: { $ne: 'trash' } });
    const allCount = await invoices.countDocuments();

    // Enforcement: If removing this record brings total below 2, block deletion!
    if (totalCount <= 2 || allCount <= 2) {
      return res.status(403).json({
        success: false,
        error: `Deletion protection active: The system requires a minimum of 2 retained invoice records in the database. Current record count: ${allCount}. Permanent deletion blocked.`
      });
    }

    await invoices.deleteOne({ _id: existing._id });

    await logAuditAction({
      action: 'INVOICE_PERMANENT_DELETE',
      entityId: existing._id,
      userId: req.user?.email || 'admin',
      userName: req.user?.name || 'Admin',
      details: { invoiceNumber: existing.invoiceNumber }
    });

    res.json({ 
      success: true, 
      message: `Invoice ${existing.invoiceNumber} has been permanently deleted.` 
    });
  } catch (err) {
    console.error('[InvoiceController] permanentDeleteInvoice error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  getNextNumber,
  createInvoice,
  updateInvoice,
  trashInvoice,
  restoreInvoice,
  permanentDeleteInvoice
};
