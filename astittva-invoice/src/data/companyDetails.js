// Default preconfigured company and bank details for ASTITTVA MARKETING Pvt Ltd
export const defaultCompanyDetails = {
  companyName: "ASTITTVA MARKETING Pvt Ltd",
  address: "PS IXL Building, 5th Floor, Room 511, Biswa Bangla Sarani, Atghara, New Town, Kolkata, West Bengal – 700136.",
  rera: "WBRERA/R-001354",
  phone: "92303 74718",
  email: "businessdevelopment@astittva.in",
  gstin: "19ABFCA7189M1ZV",
  state: "19 – West Bengal",
  logoUrl: "/logo.png",
  
  // Bank Details
  bankName: "AU Small Finance Bank",
  accountNumber: "2602262416089178",
  ifsc: "AUBL0002624",
  accountHolder: "ASTITTVA MARKETING Pvt Ltd",

  // GST Defaults
  defaultHsn: "1164",
  defaultCgstRate: 9,
  defaultSgstRate: 9,
  authorizedSignatory: "ASTITTVA MARKETING Pvt Ltd"
};

export const getStoredCompanyDetails = () => {
  try {
    const saved = localStorage.getItem("astittva_company_settings");
    if (saved) {
      return { ...defaultCompanyDetails, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Error reading company settings from localStorage", e);
  }
  return defaultCompanyDetails;
};

export const saveCompanyDetails = (details) => {
  try {
    localStorage.setItem("astittva_company_settings", JSON.stringify(details));
  } catch (e) {
    console.error("Error saving company settings to localStorage", e);
  }
};
