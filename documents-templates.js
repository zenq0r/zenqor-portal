// ============================================================
// ZENQOR TECHNOLOGIES - documents-templates.js
// ------------------------------------------------------------
// Field-definition configs + PDF rendering ("PDF kit") for the
// Signed Documents module (Authorization Letter, Client Information
// Form, NDA, Service Agreement). Kept out of app.js because it's a
// large, mostly-declarative data set with no reason to bloat the
// already very large app.js file. Loaded via ES import from app.js.
//
// `owner` on each field describes who may edit it and when:
//   zenqor_prefilled  - fixed Zenqor company info, always read-only
//   zenqor_editable   - Zenqor staff fills while status is draft/awaiting_client
//   client_fills      - the client fills while status is awaiting_client
//   zenqor_fills_after- Zenqor staff fills while status is awaiting_zenqor (after client signs)
// ============================================================

const ZENQOR_INFO = {
    name: 'ZENQOR TECHNOLOGIES',
    regNo: '202603157897 (JM1045730-D)',
    address: 'SURIA RESIDENCE BLOCK A, JALAN RESIDENCE SEK 3, BANDAR MAHKOTA CHERAS 43200 CHERAS SELANGOR',
    contactPerson: 'Muhammad Annas',
    phone: '+60 11-6501 2569',
    email: 'admin@zenq0r.com'
};

// ---------------------------------------------------------------
// 1. AUTHORIZATION LETTER (Surat Wakil Kuasa)
// ---------------------------------------------------------------
const authorizationLetterFields = [
    { id: 'refKami', label: { en: 'Our Reference', ms: 'Rujukan Kami' }, type: 'text', owner: 'zenqor_editable', section: 'Letter Details', required: false, defaultValue: '' },
    { id: 'tarikhSurat', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'zenqor_editable', section: 'Letter Details', required: true, defaultValue: '' },
    { id: 'refTuan', label: { en: 'Your Reference', ms: 'Rujukan Tuan' }, type: 'text', owner: 'client_fills', section: 'Letter Details', required: false, defaultValue: '' },
    { id: 'lampiran', label: { en: 'Enclosure', ms: 'Lampiran' }, type: 'text', owner: 'client_fills', section: 'Letter Details', required: false, defaultValue: '' },

    { id: 'appointerName', label: { en: 'Appointer Name ("I, ____")', ms: 'Nama Yang Melantik (Saya, ____)' }, type: 'text', owner: 'client_fills', section: 'Appointer', required: true, defaultValue: '' },
    { id: 'appointerPosition', label: { en: 'Position ("as ____")', ms: 'Selaku (Jawatan)' }, type: 'text', owner: 'client_fills', section: 'Appointer', required: true, defaultValue: '' },
    { id: 'appointerCompany', label: { en: 'On Behalf Of (Company)', ms: 'Bagi (Nama Syarikat)' }, type: 'text', owner: 'client_fills', section: 'Appointer', required: true, defaultValue: '' },
    { id: 'appointerRegNo', label: { en: 'Company Registration No.', ms: 'No. Pendaftaran Syarikat' }, type: 'text', owner: 'client_fills', section: 'Appointer', required: true, defaultValue: '' },

    { id: 'clientCompanyName', label: { en: 'Client Company Name', ms: 'Nama Syarikat Pelanggan' }, type: 'text', owner: 'client_fills', section: '1. Appointing Party Details', required: true, defaultValue: '' },
    { id: 'clientRegNo', label: { en: 'Company Registration No.', ms: 'No. Pendaftaran Syarikat' }, type: 'text', owner: 'client_fills', section: '1. Appointing Party Details', required: true, defaultValue: '' },
    { id: 'clientRegisteredAddress', label: { en: 'Registered Address / Premises', ms: 'Alamat Berdaftar / Premis' }, type: 'textarea', owner: 'client_fills', section: '1. Appointing Party Details', required: true, defaultValue: '' },
    { id: 'clientSignatoryNameTitle', label: { en: 'Signatory Name & Position', ms: 'Nama & Jawatan Penandatangan' }, type: 'text', owner: 'client_fills', section: '1. Appointing Party Details', required: true, defaultValue: '' },

    { id: 'matterType', label: { en: 'Type of Application / Matter', ms: 'Jenis Permohonan / Urusan' }, type: 'text', owner: 'zenqor_editable', section: '3. Matter Details', required: true, defaultValue: '' },
    { id: 'matterAgency', label: { en: 'Related Authority / Agency', ms: 'Pihak / Agensi Berkaitan' }, type: 'text', owner: 'zenqor_editable', section: '3. Matter Details', required: true, defaultValue: '' },
    { id: 'matterLocation', label: { en: 'Location / Premises / Project', ms: 'Lokasi / Premis / Projek' }, type: 'textarea', owner: 'zenqor_editable', section: '3. Matter Details', required: false, defaultValue: '' },

    { id: 'validityStart', label: { en: 'Valid From', ms: 'Berkuat Kuasa Mulai' }, type: 'date', owner: 'zenqor_editable', section: '6. Validity Period', required: true, defaultValue: '' },
    { id: 'validityEnd', label: { en: 'Valid Until', ms: 'Hingga' }, type: 'date', owner: 'zenqor_editable', section: '6. Validity Period', required: true, defaultValue: '' },

    { id: 'clientSigName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' },
    { id: 'clientSigPosition', label: { en: 'Position', ms: 'Jawatan' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' },
    { id: 'clientCompanyStampNote', label: { en: 'Company Stamp Note', ms: 'Catatan Cop Syarikat' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: false, defaultValue: '' },

    { id: 'zenqorSigName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'zenqor_prefilled', section: 'Zenqor Signature Block', required: true, defaultValue: 'MUHAMMAD ANNAS BIN MUHAMMAD NAZMI' },
    { id: 'zenqorSigPosition', label: { en: 'Position', ms: 'Jawatan' }, type: 'text', owner: 'zenqor_prefilled', section: 'Zenqor Signature Block', required: true, defaultValue: 'PENGARAH' }
];

// ---------------------------------------------------------------
// 2. CLIENT INFORMATION FORM (Borang Maklumat Pelanggan)
// ---------------------------------------------------------------
const clientInfoFormFields = [
    { id: 'clientType', label: { en: 'Client Type', ms: 'Jenis Pelanggan' }, type: 'checkboxGroup', owner: 'client_fills', section: 'A. Client / Company Information', required: true, defaultValue: [], options: ['Individual / Individu', 'Enterprise / Milikan Tunggal', 'Partnership / Perkongsian', 'Sdn. Bhd.', 'Other / Lain-lain'] },
    { id: 'legalName', label: { en: 'Legal / Registered Name', ms: 'Nama Berdaftar' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: true, defaultValue: '' },
    { id: 'tradingName', label: { en: 'Trading / Business Name', ms: 'Nama Perniagaan' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: '' },
    { id: 'brnNricPassport', label: { en: 'BRN / NRIC / Passport No.', ms: 'No. BRN / KP / Pasport' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: true, defaultValue: '' },
    { id: 'tin', label: { en: 'Tax Identification No. (TIN)', ms: 'No. Pengenalan Cukai' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: '' },
    { id: 'sstNo', label: { en: 'SST Registration No. (if applicable)', ms: 'No. SST (jika berkenaan)' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: '' },
    { id: 'industry', label: { en: 'Industry / Nature of Business', ms: 'Industri / Jenis Perniagaan' }, type: 'text', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: '' },
    { id: 'registeredAddress', label: { en: 'Registered Address', ms: 'Alamat Berdaftar' }, type: 'textarea', owner: 'client_fills', section: 'A. Client / Company Information', required: true, defaultValue: '' },
    { id: 'correspondenceSameAsRegistered', label: { en: 'Correspondence address same as registered', ms: 'Alamat surat-menyurat sama seperti berdaftar' }, type: 'checkbox', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: false },
    { id: 'correspondenceAddress', label: { en: 'Correspondence Address', ms: 'Alamat Surat-Menyurat' }, type: 'textarea', owner: 'client_fills', section: 'A. Client / Company Information', required: false, defaultValue: '' },

    { id: 'contactPersonName', label: { en: 'Contact Person', ms: 'Nama Pegawai Dihubungi' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: true, defaultValue: '' },
    { id: 'designation', label: { en: 'Designation / Position', ms: 'Jawatan' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: false, defaultValue: '' },
    { id: 'department', label: { en: 'Department', ms: 'Jabatan' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: false, defaultValue: '' },
    { id: 'mobileNo', label: { en: 'Mobile No.', ms: 'No. Telefon Bimbit' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: true, defaultValue: '' },
    { id: 'officeNo', label: { en: 'Office No.', ms: 'No. Pejabat' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: false, defaultValue: '' },
    { id: 'contactEmail', label: { en: 'Email Address', ms: 'Alamat E-mel' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: true, defaultValue: '' },
    { id: 'website', label: { en: 'Website', ms: 'Laman Web' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: false, defaultValue: '' },
    { id: 'preferredContactMethod', label: { en: 'Preferred Contact Method', ms: 'Kaedah Hubungan Pilihan' }, type: 'text', owner: 'client_fills', section: 'B. Primary Contact Information', required: false, defaultValue: '' },

    { id: 'billingName', label: { en: 'Billing / Buyer Name', ms: 'Nama Bil / Pembeli' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'billingEmail', label: { en: 'Billing Email', ms: 'E-mel Bil' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'buyerTin', label: { en: 'Buyer TIN', ms: 'TIN Pembeli' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'buyerBrn', label: { en: 'Buyer BRN / NRIC / Passport No.', ms: 'BRN / KP / Pasport Pembeli' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'buyerSst', label: { en: 'Buyer SST Registration No. (if applicable)', ms: 'No. SST Pembeli (jika berkenaan)' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'buyerContactNo', label: { en: 'Buyer Contact No.', ms: 'No. Hubungan Pembeli' }, type: 'text', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'buyerAddress', label: { en: 'Buyer / Billing Address', ms: 'Alamat Pembeli / Bil' }, type: 'textarea', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: '' },
    { id: 'preferredInvoiceMethod', label: { en: 'Preferred Invoice Method', ms: 'Kaedah Invois Pilihan' }, type: 'checkboxGroup', owner: 'client_fills', section: 'C. Billing & e-Invoice Information', required: false, defaultValue: [], options: ['Email', 'e-Invoice / MyInvois', 'Client Portal', 'Other / Lain-lain'] },

    { id: 'serviceRequired', label: { en: 'Service Required', ms: 'Perkhidmatan Diperlukan' }, type: 'checkboxGroup', owner: 'client_fills', section: 'D. Service / Project Information', required: true, defaultValue: [], options: ['IT Services', 'Software / System', 'Website', 'Technical Support', 'Consultation', 'Maintenance', 'Other'] },
    { id: 'projectName', label: { en: 'Project / Service Name', ms: 'Nama Projek / Perkhidmatan' }, type: 'text', owner: 'client_fills', section: 'D. Service / Project Information', required: false, defaultValue: '' },
    { id: 'estimatedBudget', label: { en: 'Estimated Budget', ms: 'Anggaran Bajet' }, type: 'text', owner: 'client_fills', section: 'D. Service / Project Information', required: false, defaultValue: '' },
    { id: 'expectedStartDate', label: { en: 'Expected Start Date', ms: 'Tarikh Mula Dijangka' }, type: 'date', owner: 'client_fills', section: 'D. Service / Project Information', required: false, defaultValue: '' },
    { id: 'expectedCompletionDate', label: { en: 'Expected Completion Date', ms: 'Tarikh Siap Dijangka' }, type: 'date', owner: 'client_fills', section: 'D. Service / Project Information', required: false, defaultValue: '' },
    { id: 'briefRequirements', label: { en: 'Brief Requirements / Scope', ms: 'Ringkasan Keperluan / Skop' }, type: 'textarea', owner: 'client_fills', section: 'D. Service / Project Information', required: false, defaultValue: '' },

    { id: 'authRepName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'client_fills', section: 'E. Authorised Representative', required: false, defaultValue: '' },
    { id: 'authRepDesignation', label: { en: 'Designation', ms: 'Jawatan' }, type: 'text', owner: 'client_fills', section: 'E. Authorised Representative', required: false, defaultValue: '' },
    { id: 'authRepContactNo', label: { en: 'Contact No.', ms: 'No. Hubungan' }, type: 'text', owner: 'client_fills', section: 'E. Authorised Representative', required: false, defaultValue: '' },
    { id: 'authRepEmail', label: { en: 'Email', ms: 'E-mel' }, type: 'text', owner: 'client_fills', section: 'E. Authorised Representative', required: false, defaultValue: '' },
    { id: 'authorisedToApprove', label: { en: 'Authorised To Approve', ms: 'Diberi Kuasa Meluluskan' }, type: 'checkboxGroup', owner: 'client_fills', section: 'E. Authorised Representative', required: false, defaultValue: [], options: ['Quotation', 'Purchase / Order', 'Project Changes', 'Invoice / Payment', 'All of the above'] },

    { id: 'documentsAttached', label: { en: 'Documents Attached', ms: 'Dokumen Dilampirkan' }, type: 'checkboxGroup', owner: 'client_fills', section: 'F. Supporting Documents & Additional Information', required: false, defaultValue: [], options: ['SSM / Registration', 'SST Certificate', 'Purchase Order', 'Company Profile', 'Other'] },
    { id: 'referralSource', label: { en: 'How did you hear about us?', ms: 'Bagaimana mengetahui kami?' }, type: 'text', owner: 'client_fills', section: 'F. Supporting Documents & Additional Information', required: false, defaultValue: '' },
    { id: 'clientReference', label: { en: 'Client Reference / Referral', ms: 'Rujukan / Referral' }, type: 'text', owner: 'client_fills', section: 'F. Supporting Documents & Additional Information', required: false, defaultValue: '' },
    { id: 'additionalNotes', label: { en: 'Additional Notes', ms: 'Catatan Tambahan' }, type: 'textarea', owner: 'client_fills', section: 'F. Supporting Documents & Additional Information', required: false, defaultValue: '' },

    { id: 'pdpaConsent', label: { en: 'I/We acknowledge and consent to the PDPA notice above', ms: 'Saya/Kami mengakui dan bersetuju dengan notis PDPA di atas' }, type: 'checkbox', owner: 'client_fills', section: 'G. Personal Data Protection Notice & Consent', required: true, defaultValue: false },
    { id: 'privacyContact', label: { en: 'Privacy Contact', ms: 'Hubungan Privasi' }, type: 'text', owner: 'client_fills', section: 'G. Personal Data Protection Notice & Consent', required: false, defaultValue: '' },

    { id: 'declarationName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'client_fills', section: 'H. Client Declaration & Authorisation', required: true, defaultValue: '' },
    { id: 'declarationDesignation', label: { en: 'Designation', ms: 'Jawatan' }, type: 'text', owner: 'client_fills', section: 'H. Client Declaration & Authorisation', required: false, defaultValue: '' },
    { id: 'declarationDate', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'client_fills', section: 'H. Client Declaration & Authorisation', required: true, defaultValue: '' },
    { id: 'companyStampNote', label: { en: 'Company Stamp (if applicable)', ms: 'Cop Syarikat (jika berkenaan)' }, type: 'text', owner: 'client_fills', section: 'H. Client Declaration & Authorisation', required: false, defaultValue: '' },
    { id: 'officialEmailContact', label: { en: 'Official Email / Contact', ms: 'E-mel / Hubungan Rasmi' }, type: 'text', owner: 'client_fills', section: 'H. Client Declaration & Authorisation', required: false, defaultValue: '' },

    { id: 'clientId', label: { en: 'Client ID', ms: 'ID Pelanggan' }, type: 'text', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'accountRefNo', label: { en: 'Account / Reference No.', ms: 'No. Akaun / Rujukan' }, type: 'text', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'clientStatus', label: { en: 'Client Status', ms: 'Status Pelanggan' }, type: 'checkboxGroup', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: [], options: ['New / Baru', 'Active / Aktif', 'Existing / Sedia Ada', 'Inactive / Tidak Aktif'] },
    { id: 'handledBy', label: { en: 'Handled By', ms: 'Dikendalikan Oleh' }, type: 'text', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'dateReceived', label: { en: 'Date Received', ms: 'Tarikh Diterima' }, type: 'date', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'verifiedBy', label: { en: 'Verified By', ms: 'Disahkan Oleh' }, type: 'text', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'verificationDate', label: { en: 'Verification Date', ms: 'Tarikh Pengesahan' }, type: 'date', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' },
    { id: 'officeRemarks', label: { en: 'Remarks', ms: 'Catatan' }, type: 'textarea', owner: 'zenqor_fills_after', section: 'I. For Office Use Only', required: false, defaultValue: '' }
];

// ---------------------------------------------------------------
// 3. NDA LETTER (Perjanjian Kerahsiaan)
// ---------------------------------------------------------------
const ndaFields = [
    { id: 'effectiveDate', label: { en: 'Effective Date', ms: 'Tarikh Kuat Kuasa' }, type: 'date', owner: 'zenqor_editable', section: 'Agreement Details', required: true, defaultValue: '' },

    { id: 'receivingCompanyName', label: { en: 'Company Name (Receiving Party)', ms: 'Nama Syarikat (Pihak Penerima)' }, type: 'text', owner: 'client_fills', section: 'Receiving Party (Client)', required: true, defaultValue: '' },
    { id: 'receivingRegNo', label: { en: 'Registration No.', ms: 'No. Pendaftaran' }, type: 'text', owner: 'client_fills', section: 'Receiving Party (Client)', required: true, defaultValue: '' },
    { id: 'receivingAddress', label: { en: 'Address', ms: 'Alamat' }, type: 'textarea', owner: 'client_fills', section: 'Receiving Party (Client)', required: true, defaultValue: '' },

    { id: 'confidentialitySurvivalPeriod', label: { en: 'Confidentiality Survival Period (Clause 10)', ms: 'Tempoh Kelangsungan Kerahsiaan (Fasal 10)' }, type: 'text', owner: 'zenqor_editable', section: 'Term', required: true, defaultValue: 'tiga (3) tahun' },

    { id: 'zenqorRepName', label: { en: 'Zenqor Representative Name', ms: 'Nama Wakil Zenqor' }, type: 'text', owner: 'zenqor_editable', section: 'Zenqor Signature Block', required: true, defaultValue: 'MUHAMMAD ANNAS BIN MUHAMMAD NAZMI' },
    { id: 'zenqorRepPosition', label: { en: 'Zenqor Representative Position', ms: 'Jawatan Wakil Zenqor' }, type: 'text', owner: 'zenqor_editable', section: 'Zenqor Signature Block', required: true, defaultValue: 'PENGARAH' },
    { id: 'zenqorSignDate', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'zenqor_fills_after', section: 'Zenqor Signature Block', required: true, defaultValue: '' },

    { id: 'clientRepName', label: { en: 'Client Representative Name', ms: 'Nama Wakil Pihak Penerima' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' },
    { id: 'clientRepPosition', label: { en: 'Client Representative Position', ms: 'Jawatan Wakil Pihak Penerima' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' },
    { id: 'clientSignDate', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' }
];

// ---------------------------------------------------------------
// 4. SERVICE AGREEMENT (Perjanjian Perkhidmatan)
// ---------------------------------------------------------------
const serviceAgreementFields = [
    { id: 'agreementRefSuffix', label: { en: 'Agreement Reference (ZNQ-SA-___)', ms: 'Rujukan Perjanjian (ZNQ-SA-___)' }, type: 'text', owner: 'zenqor_editable', section: 'Agreement Details', required: true, defaultValue: '' },
    { id: 'documentDate', label: { en: 'Document Date', ms: 'Tarikh Dokumen' }, type: 'date', owner: 'zenqor_editable', section: 'Agreement Details', required: true, defaultValue: '' },
    { id: 'agreementDate', label: { en: 'Agreement Date', ms: 'Tarikh Perjanjian' }, type: 'date', owner: 'zenqor_editable', section: 'Agreement Details', required: true, defaultValue: '' },

    { id: 'clientCompanyName', label: { en: 'Company / Business Name', ms: 'Nama Syarikat / Perniagaan' }, type: 'text', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },
    { id: 'clientRegNo', label: { en: 'Registration No. (SSM)', ms: 'No. Pendaftaran (SSM)' }, type: 'text', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },
    { id: 'clientBusinessAddress', label: { en: 'Business Address', ms: 'Alamat Perniagaan' }, type: 'textarea', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },
    { id: 'clientContactPerson', label: { en: 'Contact Person', ms: 'Pegawai untuk Dihubungi' }, type: 'text', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },
    { id: 'clientPhone', label: { en: 'Telephone / WhatsApp', ms: 'Telefon / WhatsApp' }, type: 'text', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },
    { id: 'clientEmail', label: { en: 'Official Email', ms: 'E-mel Rasmi' }, type: 'text', owner: 'client_fills', section: 'Client (Second Party)', required: true, defaultValue: '' },

    { id: 'totalFee', label: { en: 'Total Fee (RM)', ms: 'Jumlah Fi (RM)' }, type: 'text', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: true, defaultValue: '' },
    { id: 'phase1_workStage', label: { en: 'Phase 1 — Work Stage', ms: 'Fasa 1 — Peringkat Kerja' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 0, col: 0 } },
    { id: 'phase1_amount', label: { en: 'Phase 1 — Amount (RM)', ms: 'Fasa 1 — Amaun (RM)' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 0, col: 1 } },
    { id: 'phase1_milestone', label: { en: 'Phase 1 — Payment Milestone', ms: 'Fasa 1 — Milestone Pembayaran' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 0, col: 2 } },
    { id: 'phase2_workStage', label: { en: 'Phase 2 — Work Stage', ms: 'Fasa 2 — Peringkat Kerja' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 1, col: 0 } },
    { id: 'phase2_amount', label: { en: 'Phase 2 — Amount (RM)', ms: 'Fasa 2 — Amaun (RM)' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 1, col: 1 } },
    { id: 'phase2_milestone', label: { en: 'Phase 2 — Payment Milestone', ms: 'Fasa 2 — Milestone Pembayaran' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 1, col: 2 } },
    { id: 'phase3_workStage', label: { en: 'Phase 3 — Work Stage', ms: 'Fasa 3 — Peringkat Kerja' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 2, col: 0 } },
    { id: 'phase3_amount', label: { en: 'Phase 3 — Amount (RM)', ms: 'Fasa 3 — Amaun (RM)' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 2, col: 1 } },
    { id: 'phase3_milestone', label: { en: 'Phase 3 — Payment Milestone', ms: 'Fasa 3 — Milestone Pembayaran' }, type: 'tableRow', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '', pdf: { table: 'fees', row: 2, col: 2 } },
    { id: 'totalAmount', label: { en: 'TOTAL (RM)', ms: 'JUMLAH (RM)' }, type: 'text', owner: 'zenqor_editable', section: 'Fees & Payment Terms', required: false, defaultValue: '' },

    { id: 'zenqorSignatoryName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'zenqor_prefilled', section: 'Zenqor Signature Block', required: true, defaultValue: 'Muhammad Annas Bin Muhammad Nazmi' },
    { id: 'zenqorSignatoryTitle', label: { en: 'Title', ms: 'Jawatan' }, type: 'text', owner: 'zenqor_prefilled', section: 'Zenqor Signature Block', required: true, defaultValue: 'Director' },
    { id: 'zenqorSignDate', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'zenqor_fills_after', section: 'Zenqor Signature Block', required: true, defaultValue: '' },

    { id: 'clientSignatoryName', label: { en: 'Name', ms: 'Nama' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' },
    { id: 'clientSignatoryTitleStamp', label: { en: 'Title / Official Stamp', ms: 'Jawatan / Cap Rasmi' }, type: 'text', owner: 'client_fills', section: 'Client Signature Block', required: false, defaultValue: '' },
    { id: 'clientSignDate', label: { en: 'Date', ms: 'Tarikh' }, type: 'date', owner: 'client_fills', section: 'Client Signature Block', required: true, defaultValue: '' }
];

export const DOCUMENT_TEMPLATES = {
    authorization_letter: {
        id: 'authorization_letter',
        label: { en: 'Authorization Letter', ms: 'Surat Wakil Kuasa' },
        icon: 'fa-file-signature',
        fieldConfig: authorizationLetterFields
    },
    client_info_form: {
        id: 'client_info_form',
        label: { en: 'Client Information Form', ms: 'Borang Maklumat Pelanggan' },
        icon: 'fa-address-card',
        fieldConfig: clientInfoFormFields
    },
    nda: {
        id: 'nda',
        label: { en: 'Non-Disclosure Agreement', ms: 'Perjanjian Kerahsiaan' },
        icon: 'fa-user-secret',
        fieldConfig: ndaFields
    },
    service_agreement: {
        id: 'service_agreement',
        label: { en: 'Service Agreement', ms: 'Perjanjian Perkhidmatan' },
        icon: 'fa-file-contract',
        fieldConfig: serviceAgreementFields
    }
};

export function defaultFieldValues(templateId) {
    const tpl = DOCUMENT_TEMPLATES[templateId];
    if (!tpl) return {};
    const values = {};
    tpl.fieldConfig.forEach(f => { values[f.id] = f.defaultValue !== undefined ? (Array.isArray(f.defaultValue) ? [...f.defaultValue] : f.defaultValue) : ''; });
    return values;
}

export function requiredFieldsMissing(templateId, fields, owners) {
    const tpl = DOCUMENT_TEMPLATES[templateId];
    if (!tpl) return [];
    return tpl.fieldConfig.filter(f => f.required && owners.includes(f.owner)).filter(f => {
        const v = fields ? fields[f.id] : undefined;
        if (f.type === 'checkbox') return v !== true;
        if (f.type === 'checkboxGroup') return !Array.isArray(v) || v.length === 0;
        return v === undefined || v === null || String(v).trim() === '';
    }).map(f => f.label.en);
}

function formatCustomerAddress(customer) {
    if (!customer) return '';
    const line1 = customer.clientAddress1 || customer.clientAddress || '';
    const parts = [line1, customer.clientAddress2, customer.clientAddress3, [customer.clientPostcode, customer.clientCity].filter(Boolean).join(' '), customer.clientState, customer.clientCountry && customer.clientCountry !== 'Malaysia' ? customer.clientCountry : ''];
    return parts.map(p => String(p || '').trim()).filter(Boolean).join(', ');
}

// Maps each template's client-side fields to the matching Client Directory
// (customers/{id}) record so staff picking a client from the dropdown gets
// those fields pre-populated instead of blank — the client only needs to
// review/correct them (still editable, owner stays 'client_fills') rather
// than re-type company info the office already has on file.
export function prefillFromCustomer(templateId, customer) {
    if (!customer) return {};
    const name = customer.clientName || '';
    const regNo = customer.clientSSM || '';
    const address = formatCustomerAddress(customer);
    const contactPerson = customer.clientContactPerson || '';
    const position = customer.clientPosition || '';
    const phone = customer.clientPhone || '';
    const email = customer.clientEmail || '';
    const signatoryNameTitle = contactPerson ? [contactPerson, position].filter(Boolean).join(' — ') : '';

    const byTemplate = {
        authorization_letter: {
            appointerName: contactPerson,
            appointerPosition: position,
            appointerCompany: name,
            appointerRegNo: regNo,
            clientCompanyName: name,
            clientRegNo: regNo,
            clientRegisteredAddress: address,
            clientSignatoryNameTitle: signatoryNameTitle,
            clientSigName: contactPerson,
            clientSigPosition: position
        },
        client_info_form: {
            legalName: name,
            registeredAddress: address,
            brnNricPassport: regNo,
            contactPersonName: contactPerson,
            designation: position,
            mobileNo: phone,
            contactEmail: email,
            billingName: name,
            billingEmail: email,
            buyerAddress: address,
            authRepName: contactPerson,
            authRepDesignation: position,
            authRepContactNo: phone,
            authRepEmail: email,
            declarationName: contactPerson,
            declarationDesignation: position,
            officialEmailContact: email
        },
        nda: {
            receivingCompanyName: name,
            receivingRegNo: regNo,
            receivingAddress: address,
            clientRepName: contactPerson,
            clientRepPosition: position
        },
        service_agreement: {
            clientCompanyName: name,
            clientRegNo: regNo,
            clientBusinessAddress: address,
            clientContactPerson: contactPerson,
            clientPhone: phone,
            clientEmail: email,
            clientSignatoryName: contactPerson,
            clientSignatoryTitleStamp: position
        }
    };
    const overrides = byTemplate[templateId] || {};
    // Never overwrite with an empty string — leave the field's own defaultValue
    // (e.g. '') so the client still sees it as blank/required if the Client
    // Directory record itself doesn't have that piece of information on file.
    return Object.fromEntries(Object.entries(overrides).filter(([, v]) => String(v || '').trim() !== ''));
}

// ---------------------------------------------------------------
// PDF KIT — built on the global `PDFLib` (loaded via CDN in index.html)
// ---------------------------------------------------------------
const PAGE_WIDTH = 595.28;  // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(font, text, size, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    return lines;
}

function checkboxGroupText(field, value) {
    const selected = Array.isArray(value) ? value : [];
    return (field.options || []).map(opt => `${selected.includes(opt) ? '[X]' : '[ ]'} ${opt}`).join('   ');
}

function formatFieldValue(field, value) {
    if (field.type === 'checkbox') return value ? 'Yes / Ya' : 'No / Tidak';
    if (field.type === 'checkboxGroup') return checkboxGroupText(field, value);
    return value === undefined || value === null || value === '' ? '—' : String(value);
}

export async function buildPdfForDocument(templateId, fields, signatures, meta) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const tpl = DOCUMENT_TEMPLATES[templateId];
    if (!tpl) throw new Error('Unknown document template.');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    function ensureSpace(needed) {
        if (y - needed < MARGIN + 30) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
            drawFooter();
        }
    }
    function drawFooter() {
        page.drawText('ZENQOR TECHNOLOGIES — Confidential Document', { x: MARGIN, y: 24, size: 7, font, color: rgb(0.55, 0.55, 0.55) });
    }
    function drawHeader() {
        page.drawText(ZENQOR_INFO.name, { x: MARGIN, y, size: 16, font: bold, color: rgb(0.02, 0.16, 0.29) });
        y -= 16;
        page.drawText(`Reg No: ${ZENQOR_INFO.regNo}`, { x: MARGIN, y, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
        y -= 11;
        wrapText(font, ZENQOR_INFO.address, 8, CONTENT_WIDTH).forEach(line => {
            page.drawText(line, { x: MARGIN, y, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
            y -= 10;
        });
        y -= 6;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1.2, color: rgb(0.02, 0.16, 0.29) });
        y -= 22;
        page.drawText(tpl.label.en, { x: MARGIN, y, size: 14, font: bold, color: rgb(0.05, 0.05, 0.05) });
        y -= 15;
        page.drawText(tpl.label.ms, { x: MARGIN, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
        y -= 10;
        if (meta && meta.referenceNo) {
            page.drawText(`Reference: ${meta.referenceNo}`, { x: MARGIN, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
            y -= 12;
        }
        y -= 8;
    }
    function drawSectionTitle(title) {
        ensureSpace(24);
        y -= 4;
        page.drawText(title, { x: MARGIN, y, size: 10.5, font: bold, color: rgb(0.02, 0.16, 0.29) });
        y -= 6;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        y -= 14;
    }
    function drawLabelValueRow(field, value) {
        const labelText = `${field.label.en} / ${field.label.ms}`;
        const valueText = formatFieldValue(field, value);
        const labelLines = wrapText(bold, labelText, 8, CONTENT_WIDTH);
        const valueLines = wrapText(font, valueText, 9.5, CONTENT_WIDTH);
        ensureSpace(labelLines.length * 10 + valueLines.length * 12 + 8);
        labelLines.forEach(line => { page.drawText(line, { x: MARGIN, y, size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) }); y -= 10; });
        valueLines.forEach(line => { page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: rgb(0.05, 0.05, 0.05) }); y -= 12; });
        y -= 4;
    }

    drawHeader();

    let currentSection = null;
    const feeTableFields = tpl.fieldConfig.filter(f => f.pdf && f.pdf.table === 'fees');
    const skipIds = new Set(feeTableFields.map(f => f.id));

    tpl.fieldConfig.forEach(field => {
        if (skipIds.has(field.id)) return;
        if (field.section !== currentSection) {
            currentSection = field.section;
            drawSectionTitle(currentSection);
        }
        drawLabelValueRow(field, fields ? fields[field.id] : undefined);
    });

    if (feeTableFields.length) {
        drawSectionTitle('Payment Phases / Fasa Pembayaran');
        const rows = 3;
        const colWidths = [CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.4];
        const headers = ['Work Stage / Peringkat Kerja', 'Amount (RM) / Amaun', 'Payment Milestone / Milestone'];
        ensureSpace(20);
        let x = MARGIN;
        headers.forEach((h, i) => {
            wrapText(bold, h, 7.5, colWidths[i] - 6).forEach((line, li) => page.drawText(line, { x: x + 3, y: y - li * 9, size: 7.5, font: bold, color: rgb(0.02, 0.16, 0.29) }));
            x += colWidths[i];
        });
        y -= 22;
        for (let r = 0; r < rows; r++) {
            const stageField = tpl.fieldConfig.find(f => f.pdf && f.pdf.table === 'fees' && f.pdf.row === r && f.pdf.col === 0);
            const amountField = tpl.fieldConfig.find(f => f.pdf && f.pdf.table === 'fees' && f.pdf.row === r && f.pdf.col === 1);
            const milestoneField = tpl.fieldConfig.find(f => f.pdf && f.pdf.table === 'fees' && f.pdf.row === r && f.pdf.col === 2);
            const cellTexts = [
                formatFieldValue(stageField, fields ? fields[stageField.id] : ''),
                formatFieldValue(amountField, fields ? fields[amountField.id] : ''),
                formatFieldValue(milestoneField, fields ? fields[milestoneField.id] : '')
            ];
            const wrapped = cellTexts.map((t, i) => wrapText(font, t, 8, colWidths[i] - 6));
            const rowHeight = Math.max(...wrapped.map(w => w.length)) * 10 + 6;
            ensureSpace(rowHeight);
            x = MARGIN;
            wrapped.forEach((lines, i) => {
                lines.forEach((line, li) => page.drawText(line, { x: x + 3, y: y - li * 10, size: 8, font, color: rgb(0.05, 0.05, 0.05) }));
                x += colWidths[i];
            });
            y -= rowHeight;
        }
        y -= 8;
    }

    // Signature blocks
    ensureSpace(150);
    drawSectionTitle('Signatures / Tandatangan');
    const boxWidth = CONTENT_WIDTH / 2 - 10;
    const boxHeight = 90;
    ensureSpace(boxHeight + 40);
    const topY = y;

    async function drawSignatureBox(x, label, sig) {
        page.drawRectangle({ x, y: topY - boxHeight, width: boxWidth, height: boxHeight, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawText(label, { x: x + 6, y: topY - 14, size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
        if (sig && sig.dataUrl) {
            try {
                const pngBytes = Uint8Array.from(atob(sig.dataUrl.split(',')[1]), c => c.charCodeAt(0));
                const png = await pdfDoc.embedPng(pngBytes);
                const scale = Math.min((boxWidth - 12) / png.width, 46 / png.height);
                page.drawImage(png, { x: x + 6, y: topY - boxHeight + 30, width: png.width * scale, height: png.height * scale });
            } catch (e) { /* ignore malformed signature image */ }
        }
        const signerLine = sig && sig.signedByName ? `${sig.signedByName}${sig.signedAt ? ' — ' + new Date(sig.signedAt).toLocaleDateString('en-GB') : ''}` : 'Not yet signed';
        page.drawText(signerLine, { x: x + 6, y: topY - boxHeight + 12, size: 7.5, font, color: rgb(0.35, 0.35, 0.35) });
    }

    await drawSignatureBox(MARGIN, 'Client / Pelanggan', signatures ? signatures.client : null);
    await drawSignatureBox(MARGIN + boxWidth + 20, 'Zenqor Technologies', signatures ? signatures.zenqor : null);
    y = topY - boxHeight - 16;

    drawFooter();
    return pdfDoc.save();
}
