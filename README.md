# ASTITTVA MARKETING – Invoice Generator (Version 1.0)

A lightweight, production-grade Tax Invoice Web Application built for **ASTITTVA MARKETING Pvt Ltd** in accordance with the Product Requirements Document (PRD v1.0).

---

## 🌟 Highlights & Features

- **Exact Reference Layout**: Replicates the company's authentic A4 tax invoice layout with the copper-gold ASTITTVA logo, dual-tone table headers (`#5c6873`), tax summary breakdown, and AU Small Finance Bank details.
- **Integrated Live GST Calculator**:
  - Automatically recalculates whenever Taxable Amount, Quantity, or GST % changes.
  - Formula:
    - `Taxable Amount = Quantity × Price per Unit` (or derived from `CV × Brokerage % / 100`)
    - `CGST = Taxable Amount × CGST Rate / 100` (default 9%)
    - `SGST = Taxable Amount × SGST Rate / 100` (default 9%)
    - `Subtotal = Taxable Amount + CGST + SGST`
    - `Final Total = Round(Subtotal)`
    - `Round-off = Final Total − Subtotal`
  - Indian English Currency in Words (e.g. `Sixty-three thousand three hundred ninety-four rupees only.`).
- **Sequential Numbering (`XXX/MM/YY`)**:
  - Automatically generates the next serial number (e.g. `008/11/26`).
  - Resets and tracks sequences per month/year.
  - Prevents duplicate invoice numbers with real-time validation.
- **Client-Side LocalStorage Persistence**:
  - Saves all invoice records and company settings locally.
  - Edit previously issued invoices with instant recalculations.
  - Duplicate invoice workflow.
  - One-click JSON Backup Export & Restore.
- **Print & High-Fidelity A4 PDF Generation**:
  - Pixel-perfect client-side PDF export using `html2pdf.js` and standard browser print formatting.

---

## 📁 Project Structure

```
astittva-invoice/
│
├── public/
│   ├── logo.png             # ASTITTVA copper-gold logo
│   └── favicon.ico
│
├── src/
│   ├── components/
│   │   ├── Header.jsx       # Top navigation & branding
│   │   ├── Dashboard.jsx    # Module 1: KPI metrics, search & recent invoices
│   │   ├── InvoiceForm.jsx  # Module 2: Complete editable invoice inputs
│   │   ├── InvoicePreview.jsx # Module 4: Original A4 tax invoice preview
│   │   ├── Calculator.jsx   # Module 3: Real-time live GST math box
│   │   ├── InvoiceHistory.jsx # Module 5: Search, edit, duplicate, JSON backup
│   │   └── SettingsModal.jsx # Module 6: Company & bank details editor
│   │
│   ├── utils/
│   │   ├── calculations.js  # GST, taxable, subtotal & round-off logic
│   │   ├── numberToWords.js # Indian numbering currency in words
│   │   ├── invoiceNumber.js # Sequential XXX/MM/YY generator & validator
│   │   └── pdfGenerator.js  # Client-side A4 PDF download & print
│   │
│   ├── data/
│   │   └── companyDetails.js # Default ASTITTVA & AU Bank defaults
│   │
│   ├── App.jsx              # Main application shell & state orchestration
│   ├── main.jsx             # React 18 entry point
│   └── style.css            # Clean, modern styles & print media rules
│
├── package.json
└── README.md
```

---

## 🚀 Quick Start (Local Run)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Build for Production
```bash
npm run build
```
Creates a standalone production build in `dist/`.

### Backend Signing Secrets

The backend requires `INVOICE_SIGNING_SECRET` and `AUDIT_SIGNING_SECRET`, each at least 32 bytes, in `backend/.env` or its deployment environment. Generate two independent values with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep these secrets private and do not commit them.

---

## 🏢 Preconfigured Company & Bank Information

- **Company Name:** ASTITTVA MARKETING Pvt Ltd
- **Address:** PS IXL Building, 5th Floor, Room 511, Biswa Bangla Sarani, Atghara, New Town, Kolkata, West Bengal – 700136.
- **RERA:** WBRERA/R-001354
- **Phone:** 92303 74718
- **Email:** businessdevelopment@astittva.in
- **GSTIN:** 19ABFCA7189M1ZV
- **State:** 19 – West Bengal
- **Bank Name:** AU Small Finance Bank
- **Account Number:** 2602262416089178
- **IFSC:** AUBL0002624
- **Account Holder:** ASTITTVA MARKETING Pvt Ltd
*(All information is fully editable through the Settings modal in the application).*
