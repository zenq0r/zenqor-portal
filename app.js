// ============================================================
// ZENQOR TECHNOLOGIES - app.js (ENTERPRISE FINAL BUILD v7.1)
// ============================================================

import {
    db,
    auth,
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "./firebase-config.js";

const { createApp } = Vue;

const STATUTORY_RATES = {
    regular: {
        epf: { employeePct: 0.11, employerPctBelow5k: 0.13, employerPctAbove5k: 0.12, threshold: 5000 },
        socso: { wageCap: 6000, employeePct: 0.005, employerPct: 0.0175 },
        eis: { wageCap: 6000, employeePct: 0.002, employerPct: 0.002 }
    },
    senior: {
        epf: { employeePct: 0.0, employerPctBelow5k: 0.04, employerPctAbove5k: 0.04, threshold: 5000 },
        socso: { wageCap: 6000, employeePct: 0.0, employerPct: 0.0125 },
        eis: { wageCap: 6000, employeePct: 0.0, employerPct: 0.0 }
    }
};

const RBAC_ROLES = {
    'Director': ['dashboard', 'claims', 'client-directory', 'hr-employees', 'reports', 'client-portal', 'audit-logs', 'settings', 'profile'],
    'Superadmin': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'client-portal', 'audit-logs', 'settings', 'profile'],
    'HR': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'profile'],
    'Account': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'reports', 'profile'],
    'IT': ['dashboard', 'audit-logs', 'settings', 'profile'],
    'Client': ['dashboard', 'client-portal', 'profile'],
    'Staff': ['dashboard', 'claims', 'client-portal', 'profile']
};

createApp({
    data() {
        return {
            isLoggedIn: false,
            authLoading: true,
            loginLoading: false,
            logoutConfirm: false,
            browserBackHandler: null,
            showPassword: false,
            loginForm: { 
                email: '', 
                password: ''
            },
            loginError: '',
            currentTab: 'dashboard',
            mobileMenuOpen: false,
            desktopSidebarOpen: false,
            chartTimeFilter: 'monthly',
            sortOption: 'latest',
            searchQuery: '',
            currentPage: 1,
            itemsPerPage: 5,
            
            // PAGINATION & SORTING UNTUK CLAIMS
            claimsSortOption: 'latest',
            claimsCurrentPage: 1,
            claimsItemsPerPage: 10,

            notification: { show: false, message: '' },

            activePrintModule: null,
            claimPrint: null,
            recordPreview: { show: false, html: '' },
            claimPreview: { show: false, claim: null, directorApprovalAttachment: '', directorApprovalAttachmentName: '' },
            attachmentPreview: { show: false, url: '', label: '' },
            attachmentUploadState: { payment: false, receipt: false, director: false },
            unsubscribers: [],
            portalDataReady: false,
            portalDataReadyPromise: null,
            revenueChartInstance: null,
            statusChartInstance: null,
            chartRenderTimer: null,
            chartRenderAttempts: 0,
            presenceHeartbeatTimer: null,
            presenceClockTimer: null,
            presenceNow: Date.now(),
            presencePageHideHandler: null,
            presencePageShowHandler: null,
            presenceVisibilityHandler: null,

            changePasswordModal: {
                show: false,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
                error: '',
                loading: false,
                required: false
            },

            company: {
                name: "ZENQOR TECHNOLOGIES",
                ssm: "202603157897 (JM1045730-D)",
                address: "SURIA RESIDENCE (BLOK A), JALAN RESIDENCE SEK 3\nBANDAR MAHKOTA CHERAS, 43200 CHERAS, SELANGOR",
                phone: "+60 11-6501 2569",
                email: "admin@zenq0r.com",
                website: "www.zenq0r.com",
                bankName: "MAYBANK ISLAMIC BERHAD",
                bankAccount: "5629 8205 7309"
            },
            userProfile: {
                name: '',
                email: '',
                role: '',
                photo: ''
            },
            profilePhotoUpload: { loading: false, error: '' },

            docHistory: [],
            payslipHistory: [],
            claimsHistory: [],
            employees: [],
            customers: [],
            users: [],
            auditLogs: [],

            editingDocId: null,
            clientSavedForDocument: false,
            editingPayId: null,
            editingClaimId: null,

            employeeModal: {
                show: false,
                isEdit: false,
                originalSensitive: {},
                form: {
                    empNo: 'ZEN-', name: '', email: '', ic: '', dept: '', position: '', status: 'Aktif',
                    epfNo: '', socsoNo: '', eisNo: '', taxNo: '', bankAcc: '', isSenior: false,
                    joinDate: '', basicSalary: 0, allowance: 0, deduction: 0
                }
            },
            employeeView: { show: false, employee: {} },
            employeeActionConfirm: { show: false, action: '', employee: null },
            clientView: { show: false, client: {} },
            clientActionConfirm: { show: false, action: '', client: null },

            officialEmailDomain: 'zenq0r.com',

            userModal: {
                show: false,
                isEdit: false,
                form: { uid: '', name: '', email: '', password: '', role: 'Staff' }
            },

            claimSubCategories: {
                'Medical': [
                    'Clinic / Hospital Treatment',
                    'Prescription Medication',
                    'Dental and Eye Care',
                    'Physiotherapy / Specialist Treatment',
                    'Vaccination',
                    'Medical Equipment'
                ],
                'Travel and Transportation': [
                    'Mileage Claim',
                    'Tolls and Parking',
                    'Ride-Hailing / Taxi',
                    'Hotel Accommodation',
                    'Flight / Train / Bus Ticket',
                    'Vehicle Rental',
                    'Fuel',
                    'Visa / Travel Insurance'
                ],
                'Entertainment and Client Relations': [
                    'Client Meal',
                    'Department / Company Event',
                    'Client Gift / Souvenir',
                    'Corporate / Networking Event'
                ],
                'Training and Development': [
                    'Course / Seminar / Workshop',
                    'Professional Certification Fee',
                    'Books / Reference Materials',
                    'Learning Platform Subscription'
                ],
                'Operations and Projects': [
                    'Project Equipment / Supplies',
                    'Software / SaaS Subscription',
                    'Emergency Operations Purchase',
                    'Equipment Maintenance'
                ],
                'Communications and Utilities': [
                    'Mobile Phone',
                    'Internet / Data',
                    'Video Meeting / Communications',
                    'Printing / Photocopying'
                ],
                'Miscellaneous': [
                    'Stationery and Office Supplies',
                    'Communication Allowance',
                    'Courier and Postage',
                    'Other Parking / Toll',
                    'Other (Specify in Description)'
                ]
            },

            docForm: {
                type: 'Invoice',
                docNo: `INV-${new Date().getFullYear()}-01001`,
                status: 'Unpaid',
                paymentMethod: 'Bank Transfer (EFT)',
                paymentBank: '',
                paymentReceiver: '',
                paymentRefNo: '',
                paymentAttachment: '',
                date: new Date().toISOString().substr(0, 10),
                dueDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().substr(0, 10),
                clientName: '',
                clientPhone: '',
                clientSSM: '',
                clientAddress: '',
                clientCity: '',
                clientState: '',
                clientPostcode: '',
                clientCountry: 'Malaysia',
                clientEmail: '',
                clientContactPerson: '',
                clientPosition: '',
                items: [{ desc: '', qty: 1, price: 0 }],
                discount: 0
            },

            payForm: {
                name: '', ic: '', empNo: '', empEmail: '', position: '', dept: '',
                isSenior: false, joinDate: '', bankAcc: '', epfSocso: '',
                month: new Date().toISOString().slice(0, 7),
                payDate: new Date().toISOString().slice(0, 10),
                basic: 0, ot: 0, phone: 0, transport: 0, meal: 0, bonus: 0,
                dedEpf: 0, dedSocso: 0, dedEis: 0, dedPcb: 0, dedAdvance: 0, dedOther: 0
            },

            claimForm: {
                name: '', empNo: '', empEmail: '', dept: '',
                expenseDate: new Date().toISOString().substr(0, 10),
                category: 'Medical', subCategory: 'Clinic / Hospital Treatment',
                amount: 0, receiptNo: '', description: '', receiptAttachment: '', receiptAttachmentName: '', status: 'Pending HR',
                assignedToUid: '', assignedToName: '', assignedToEmail: '', assignedToRole: 'HR'
            },

            payCalc: { gross: 0, deduct: 0, net: 0, epfEmpr: 0, socsoEmpr: 0, eisEmpr: 0 }
        };
    },
    computed: {
        canCreateEdit() { return ['Superadmin', 'Director', 'HR'].includes(this.userProfile.role); },
        canManageSensitiveData() { return ['Superadmin', 'Director', 'HR'].includes(this.userProfile.role); },
        canManageEmployees() { return ['Superadmin', 'Director', 'HR'].includes(this.userProfile.role); },
        canManageClients() { return ['Superadmin', 'Director', 'HR', 'Account'].includes(this.userProfile.role); },
        canManageDocuments() { return ['Superadmin', 'HR', 'Account'].includes(this.userProfile.role); },
        canManagePayroll() { return ['Superadmin', 'HR', 'Account'].includes(this.userProfile.role); },
        canEditDocs() { return this.canManageDocuments; },
        canDelete() { return ['Superadmin', 'Director'].includes(this.userProfile.role); },
        canManageRBAC() { return ['Superadmin', 'Director'].includes(this.userProfile.role); },
        canManageCompanySettings() { return ['Director', 'Superadmin', 'IT'].includes(this.userProfile.role); },
        canBackupDatabase() { return ['Director', 'Superadmin'].includes(this.userProfile.role); },
        currentYear() { return new Date().getFullYear(); },
        payslipYtdMultiplier() {
            const month = Number(String(this.payForm.month || '').split('-')[1]);
            return month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
        },
        employeeViewLiveRecord() {
            return this.employees.find(emp => emp.empNo === this.employeeView.employee.empNo) || this.employeeView.employee;
        },

        myPayslips() { return this.payslipHistory.filter(p => p.raw && (p.raw.empEmail === this.userProfile.email || p.name === this.userProfile.name)); },
        myLatestNetSalary() {
            if (this.myPayslips.length === 0) return 0;
            const sorted = [...this.myPayslips].sort((a, b) => new Date(b.date) - new Date(a.date));
            return Number(sorted[0].amount) || 0;
        },
        myClaims() { return this.claimsHistory.filter(c => c.empEmail === this.userProfile.email || c.name === this.userProfile.name); },
        myPendingClaimsCount() { return this.myClaims.filter(c => c.status && c.status.includes('Pending')).length; },
        myApprovedClaimsAmount() { return this.myClaims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + (Number(c.amount) || 0), 0); },

        myClientDocs() { return this.docHistory.filter(d => d.raw && d.raw.clientEmail === this.userProfile.email); },
        myUnpaidInvoicesCount() { return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status !== 'Paid').length; },
        myUnpaidInvoicesAmount() { return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status !== 'Paid').reduce((sum, d) => sum + (Number(d.amount) || 0), 0); },
        myPaidInvoicesAmount() { return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status === 'Paid').reduce((sum, d) => sum + (Number(d.amount) || 0), 0); },

        docSubtotal() { return this.docForm.items.reduce((s, i) => s + (i.qty * i.price), 0); },
        docSST() { return this.docSubtotal * 0.08; },
        docGrandTotal() { return this.docSubtotal - this.docForm.discount + this.docSST; },

        totalQuotations() { return this.docHistory.filter(d => d.type === 'Quotation').length; },
        totalQuotationValue() { return this.docHistory.filter(d => d.type === 'Quotation').reduce((s, d) => s + (Number(d.amount) || 0), 0); },
        totalInvoices() { return this.docHistory.filter(d => d.type === 'Invoice').length; },
        paidInvoicesCount() { return this.docHistory.filter(d => d.type === 'Invoice' && d.status === 'Paid').length; },
        unpaidInvoicesCount() { return this.docHistory.filter(d => d.type === 'Invoice' && d.status !== 'Paid').length; },

        totalRevenuePaid() { return this.docHistory.filter(d => d.type === 'Invoice' && d.status === 'Paid').reduce((s, d) => s + (Number(d.amount) || 0), 0); },
        totalRevenuePending() { return this.docHistory.filter(d => d.type === 'Invoice' && d.status !== 'Paid').reduce((s, d) => s + (Number(d.amount) || 0), 0); },

        activeEmployeesCount() { return this.employees.filter(e => e.status === 'Aktif').length; },
        totalPayrollNet() { return this.payslipHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0); },

        approvedClaimsCount() { return this.claimsHistory.filter(c => c.status === 'Approved').length; },
        pendingClaimsCount() { return this.claimsHistory.filter(c => c.status && c.status.includes('Pending')).length; },
        totalApprovedClaimsAmount() { return this.claimsHistory.filter(c => c.status === 'Approved').reduce((s, c) => s + (Number(c.amount) || 0), 0); },
        totalPendingClaimsAmount() { return this.claimsHistory.filter(c => c.status && c.status.includes('Pending')).reduce((s, c) => s + (Number(c.amount) || 0), 0); },
        financePendingClaims() { return this.claimsHistory.filter(c => c.status === 'Pending Account'); },

        clientPortalDocs() {
            if (this.userProfile.role === 'Client' || this.userProfile.role === 'Staff') {
                return this.docHistory.filter(d => d.raw && d.raw.clientEmail === this.userProfile.email);
            }
            return this.docHistory;
        },

        // PAGINATION & SORTING UNTUK CLAIMS MODULE
        filteredSortedClaims() {
            let list = [...this.claimsHistory];
            
            list.sort((a, b) => {
                if (this.claimsSortOption === 'latest') return new Date(b.expenseDate) - new Date(a.expenseDate);
                if (this.claimsSortOption === 'oldest') return new Date(a.expenseDate) - new Date(b.expenseDate);
                if (this.claimsSortOption === 'category') return (a.category || '').localeCompare(b.category || '');
                if (this.claimsSortOption === 'amount_high') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
                if (this.claimsSortOption === 'amount_low') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
                return new Date(b.expenseDate) - new Date(a.expenseDate);
            });

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(c => 
                    (c.receiptNo && c.receiptNo.toLowerCase().includes(q)) ||
                    (c.name && c.name.toLowerCase().includes(q)) ||
                    (c.empNo && c.empNo.toLowerCase().includes(q)) ||
                    (c.category && c.category.toLowerCase().includes(q))
                );
            }
            return list;
        },
        claimsTotalPages() { return Math.ceil(this.filteredSortedClaims.length / this.claimsItemsPerPage) || 1; },
        paginatedClaims() {
            const start = (this.claimsCurrentPage - 1) * this.claimsItemsPerPage;
            return this.filteredSortedClaims.slice(start, start + this.claimsItemsPerPage);
        },

        filteredRecentActivities() {
            const combined = [
                ...this.docHistory.map(d => ({ ...d, tagClass: d.type === 'Invoice' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', isDoc: true })),
                ...this.payslipHistory.map(p => ({ ...p, tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', isPay: true })),
                ...this.claimsHistory.map(c => ({ ...c, tagClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', isClaim: true, docNo: c.receiptNo, amount: c.amount, date: c.expenseDate }))
            ];
            const typePriority = { 'Payslip': 1, 'Quotation': 2, 'Invoice': 3, 'Claim': 4 };
            let list = combined.sort((a, b) => {
                if (this.sortOption === 'latest') return new Date(b.date) - new Date(a.date);
                if (this.sortOption === 'oldest') return new Date(a.date) - new Date(b.date);
                if (this.sortOption === 'module') {
                    const priorityA = typePriority[a.type] || 99;
                    const priorityB = typePriority[b.type] || 99;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    return new Date(b.date) - new Date(a.date);
                }
                if (this.sortOption === 'amount_high') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
                if (this.sortOption === 'amount_low') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
                return new Date(b.date) - new Date(a.date);
            });
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(c => (c.docNo && c.docNo.toLowerCase().includes(q)) || (c.name && c.name.toLowerCase().includes(q)) || (c.type && c.type.toLowerCase().includes(q)) || (c.raw && c.raw.clientSSM && c.raw.clientSSM.toLowerCase().includes(q)) || (c.raw && c.raw.ic && c.raw.ic.toLowerCase().includes(q)));
            }
            return list;
        },
        totalPages() { return Math.ceil(this.filteredRecentActivities.length / this.itemsPerPage) || 1; },
        paginatedActivities() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            return this.filteredRecentActivities.slice(start, start + this.itemsPerPage);
        }
    },
    methods: {
        getRoleDisplayName(code) {
            const roles = {
                'Director': 'Director',
                'Superadmin': 'Super Admin',
                'HR': 'Human Resource Management',
                'Account': 'Finance Account Management',
                'IT': 'Intelligence Team Management',
                'Staff': 'Operation Team Management',
                'Client': 'Client Users System Terminal'
            };
            return roles[code] || code;
        },
        getActivityStatus(item) {
            if (item.type === 'Invoice') {
                return item.status === 'Paid'
                    ? { label: 'PAID', detail: 'Payment received', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }
                    : { label: 'UNPAID', detail: 'Payment not received', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
            }
            if (item.type === 'Claim') {
                const statuses = {
                    'Pending HR': { label: 'PENDING HR', detail: 'Awaiting HR approval', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
                    'Pending Account': { label: 'PENDING FINANCE', detail: 'HR approved — Finance action required', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
                    'Pending Director': { label: 'PENDING DIRECTOR', detail: 'Finance approved — Director action required', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
                    'Approved': { label: 'APPROVED', detail: 'Claim fully approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
                    'Rejected': { label: 'REJECTED', detail: 'Claim rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' }
                };
                return statuses[item.status] || { label: 'PENDING', detail: 'Awaiting action', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
            }
            return { label: 'RECORDED', detail: 'Record created', className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
        },
        exportCSV(type) {
            let filename = '';
            let rows = [];
            const todayStr = new Date().toISOString().slice(0, 10);
            
            if (type === 'payroll') {
                filename = `Laporan_Payroll_ZENQOR_${todayStr}.csv`;
                rows = [['Payslip No', 'Tarikh Bayaran', 'Nama Pekerja', 'Gaji Bersih (MYR)'], ...this.payslipHistory.map(p => [p.docNo || '', p.date || '', p.name || '', Number(p.amount || 0).toFixed(2)])];
            } else if (type === 'employees') {
                filename = `Direktori_Pekerja_ZENQOR_${todayStr}.csv`;
                rows = [['ID Pekerja', 'Nama Lengkap', 'Jawatan', 'Jabatan', 'Status', 'Gaji Asas (MYR)'], ...this.employees.map(e => [e.empNo || '', e.name || '', e.position || '', e.dept || '', e.status || 'Aktif', Number(e.basicSalary || 0).toFixed(2)])];
            } else if (type === 'docs') {
                filename = `Laporan_Invois_SebutHarga_ZENQOR_${todayStr}.csv`;
                rows = [['No Dokumen', 'Jenis', 'Tarikh Issue', 'Nama Pelanggan', 'Status', 'Jumlah (MYR)'], ...this.docHistory.map(d => [d.docNo || '', d.type || '', d.date || '', d.name || '', d.status || '', Number(d.amount || 0).toFixed(2)])];
            }

            if (rows.length === 0) { alert("Tiada rekod data untuk dieksport."); return; }

            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.logAudit('EXPORT', `Mengeksport fail CSV bagi modul: ${type.toUpperCase()}`);
            this.showNotify(`Laporan CSV (${type}) berjaya dimuat turun.`);
        },
        generateRandomPassword(length = 8) {
            const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            let pwd = "";
            for (let i = 0; i < length; i++) pwd += allChars.charAt(Math.floor(Math.random() * allChars.length));
            return pwd;
        },

        resetAllForms() {
            this.docForm = {
                type: 'Invoice', docNo: '', status: 'Unpaid', paymentMethod: 'Bank Transfer (EFT)', paymentBank: '', paymentReceiver: '', paymentRefNo: '', paymentAttachment: '',
                date: new Date().toISOString().substr(0, 10), dueDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().substr(0, 10),
                clientName: '', clientPhone: '', clientSSM: '', clientAddress: '', clientCity: '', clientState: '', clientPostcode: '', clientCountry: 'Malaysia', clientEmail: '', clientContactPerson: '', clientPosition: '',
                items: [{ desc: '', qty: 1, price: 0 }], discount: 0
            };
            this.payForm = {
                name: '', ic: '', empNo: '', empEmail: '', position: '', dept: '', isSenior: false, joinDate: '', bankAcc: '', epfSocso: '',
                month: new Date().toISOString().slice(0, 7), payDate: new Date().toISOString().slice(0, 10),
                basic: 0, ot: 0, phone: 0, transport: 0, meal: 0, bonus: 0, dedEpf: 0, dedSocso: 0, dedEis: 0, dedPcb: 0, dedAdvance: 0, dedOther: 0
            };
            this.claimForm = {
                name: '', empNo: '', empEmail: '', dept: '', expenseDate: new Date().toISOString().substr(0, 10), category: 'Medical', subCategory: 'Clinic / Hospital Treatment',
                amount: 0, receiptNo: '', description: '', receiptAttachment: '', receiptAttachmentName: '', status: 'Pending HR',
                assignedToUid: '', assignedToName: '', assignedToEmail: '', assignedToRole: 'HR'
            };
            this.clientSavedForDocument = false;
            this.editingDocId = null; this.editingPayId = null; this.editingClaimId = null;
            this.autoCalculatePayroll();
            this.generateDocNo();
        },

        isOfficialEmail(email) {
            if (!email) return false;
            return email.toLowerCase().trim().endsWith('@' + this.officialEmailDomain.toLowerCase());
        },
        async uploadImageAttachment(file, category) {
            if (!auth.currentUser) throw new Error('Authentication is required before uploading an attachment.');
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const attachmentRef = ref(storage, `portal_attachments/${category}/${auth.currentUser.uid}/${Date.now()}_${cleanName}`);
            await uploadBytes(attachmentRef, file, { contentType: file.type });
            return getDownloadURL(attachmentRef);
        },
        async handleAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            const allowedTypes = ['image/png', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) { alert('Only PNG, JPEG/JPG files are allowed.'); e.target.value = ''; return; }
            if (file.size > 2 * 1024 * 1024) { alert("Attachment size exceeds 2MB limit."); e.target.value = ''; return; }
            this.attachmentUploadState.payment = true;
            try {
                this.docForm.paymentAttachment = await this.uploadImageAttachment(file, 'payments');
                this.showNotify('Payment attachment uploaded securely.');
            } catch (error) {
                console.error('Payment attachment upload failed:', error);
                this.docForm.paymentAttachment = '';
                this.showNotify('Unable to upload payment attachment.');
                e.target.value = '';
            } finally { this.attachmentUploadState.payment = false; }
        },
        async handleClaimAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            const allowedTypes = ['image/png', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) { alert("Only PNG, JPEG/JPG files are allowed."); e.target.value = ''; return; }
            if (file.size > 2 * 1024 * 1024) { alert("Attachment size exceeds 2MB limit."); e.target.value = ''; return; }
            this.attachmentUploadState.receipt = true;
            try {
                this.claimForm.receiptAttachment = await this.uploadImageAttachment(file, 'claim_receipts');
                this.claimForm.receiptAttachmentName = file.name;
                this.showNotify('Receipt attachment uploaded securely.');
            } catch (error) {
                console.error('Receipt attachment upload failed:', error);
                this.claimForm.receiptAttachment = '';
                this.claimForm.receiptAttachmentName = '';
                this.showNotify('Unable to upload receipt attachment.');
                e.target.value = '';
            } finally { this.attachmentUploadState.receipt = false; }
        },
        async handleDirectorApprovalAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            const allowedTypes = ['image/png', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) { alert('Only PNG, JPEG/JPG files are allowed.'); e.target.value = ''; return; }
            if (file.size > 2 * 1024 * 1024) { alert('Attachment size exceeds 2MB limit.'); e.target.value = ''; return; }
            this.attachmentUploadState.director = true;
            try {
                this.claimPreview.directorApprovalAttachment = await this.uploadImageAttachment(file, 'director_approvals');
                this.claimPreview.directorApprovalAttachmentName = file.name;
                this.showNotify('Director approval document uploaded securely.');
            } catch (error) {
                console.error('Director attachment upload failed:', error);
                this.claimPreview.directorApprovalAttachment = '';
                this.claimPreview.directorApprovalAttachmentName = '';
                this.showNotify('Unable to upload Director approval document.');
                e.target.value = '';
            } finally { this.attachmentUploadState.director = false; }
        },
        clearAllDocItems() {
            if (confirm("Are you sure you want to clear all product/service items?")) { this.docForm.items = [{ desc: '', qty: 1, price: 0 }]; this.showNotify("All items cleared."); }
        },
        resetDocForm() {
            if (confirm("Are you sure you want to clear the entire document form?")) { this.resetAllForms(); this.showNotify("Form cleared."); }
        },
        resetPayForm() {
            if (confirm("Are you sure you want to clear the entire payslip form?")) { this.editingPayId = null; this.resetAllForms(); }
        },
        resetClaimForm() {
            this.editingClaimId = null; this.resetAllForms();
        },

        maskSensitive(val) {
            if (!val) return '-';
            const digits = String(val).replace(/\D/g, '');
            const lastFour = (digits || String(val).trim()).slice(-4);
            return `XXXXX${lastFour}`;
        },
        maskIC(val) { return this.maskSensitive(val); },
        maskBank(val) { return this.maskSensitive(val); },
        maskEpfSocso(val) {
            if (!val) return '-';
            return String(val).replace(/(KWSP|EPF|PERKESO|SOCSO)\s*:\s*([^|]+)/gi, (match, label, number) => `${label}: ${this.maskSensitive(number)}`);
        },

        hasAccess(moduleName) {
            const allowedModules = RBAC_ROLES[this.userProfile.role] || ['dashboard'];
            return allowedModules.includes(moduleName);
        },
        formatCurrency(val) {
            return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(val || 0);
        },
        formatDateTime(val) {
            return val ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(val)) : '-';
        },
        getPresenceTime(value) {
            if (!value) return 0;
            if (typeof value.toDate === 'function') return value.toDate().getTime();
            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : 0;
        },
        isEmployeeOnline(emp) {
            const lastUpdate = this.getPresenceTime(emp.presenceUpdatedAt || emp.lastSeen);
            return emp.presenceStatus === 'Online' && lastUpdate > 0 && (this.presenceNow - lastUpdate) < 90000;
        },
        employeePresenceLabel(emp) {
            return this.isEmployeeOnline(emp) ? 'Online' : 'Offline';
        },
        employeeLastSeen(emp) {
            if (this.isEmployeeOnline(emp)) return 'Active now';
            return emp.lastSeen ? `Last seen ${this.formatDateTime(emp.lastSeen)}` : 'No login activity';
        },
        async setCurrentEmployeePresence(isOnline) {
            if (!auth.currentUser || !this.userProfile.email || !this.employees.length) return false;
            const email = this.userProfile.email.trim().toLowerCase();
            const employee = this.employees.find(emp => String(emp.email || '').trim().toLowerCase() === email);
            if (!employee) return false;
            const timestamp = new Date().toISOString();
            try {
                await updateDoc(doc(db, 'employees', employee.id || employee.empNo), {
                    presenceStatus: isOnline ? 'Online' : 'Offline',
                    isOnline: !!isOnline,
                    presenceUid: auth.currentUser.uid,
                    presenceUpdatedAt: timestamp,
                    lastSeen: timestamp
                });
                return true;
            } catch (error) {
                console.error('Unable to update employee presence:', error);
                return false;
            }
        },
        async startPresenceTracking() {
            this.stopPresenceTracking();
            this.presenceNow = Date.now();
            await this.setCurrentEmployeePresence(true);
            this.presenceHeartbeatTimer = setInterval(() => {
                this.presenceNow = Date.now();
                this.setCurrentEmployeePresence(true);
            }, 30000);
            this.presenceClockTimer = setInterval(() => { this.presenceNow = Date.now(); }, 15000);
            this.presencePageHideHandler = () => { this.setCurrentEmployeePresence(false); };
            this.presencePageShowHandler = () => { if (this.isLoggedIn) this.setCurrentEmployeePresence(true); };
            this.presenceVisibilityHandler = () => { if (!document.hidden && this.isLoggedIn) this.setCurrentEmployeePresence(true); };
            window.addEventListener('pagehide', this.presencePageHideHandler);
            window.addEventListener('pageshow', this.presencePageShowHandler);
            document.addEventListener('visibilitychange', this.presenceVisibilityHandler);
        },
        stopPresenceTracking() {
            if (this.presenceHeartbeatTimer) clearInterval(this.presenceHeartbeatTimer);
            if (this.presenceClockTimer) clearInterval(this.presenceClockTimer);
            this.presenceHeartbeatTimer = null;
            this.presenceClockTimer = null;
            if (this.presencePageHideHandler) window.removeEventListener('pagehide', this.presencePageHideHandler);
            if (this.presencePageShowHandler) window.removeEventListener('pageshow', this.presencePageShowHandler);
            if (this.presenceVisibilityHandler) document.removeEventListener('visibilitychange', this.presenceVisibilityHandler);
            this.presencePageHideHandler = null;
            this.presencePageShowHandler = null;
            this.presenceVisibilityHandler = null;
        },
        showNotify(msg) {
            this.notification = { show: true, message: msg };
            setTimeout(() => { this.notification.show = false; }, 3500);
        },

        isSupportedImageAttachment(attachment) {
            return typeof attachment === 'string' && (
                /^data:image\/(png|jpeg);base64,/i.test(attachment) ||
                /^https:\/\/firebasestorage\.googleapis\.com\//i.test(attachment)
            );
        },
        openAttachment(attachment, label = 'Attachment') {
            const isSupportedImage = this.isSupportedImageAttachment(attachment);
            if (!isSupportedImage) {
                this.showNotify(`${label} is unavailable. Only PNG and JPEG/JPG attachments are supported.`);
                return;
            }

            this.attachmentPreview = { show: true, url: attachment, label };
        },

        toggleSidebar() {
            if (window.innerWidth < 768) this.mobileMenuOpen = !this.mobileMenuOpen;
            else this.desktopSidebarOpen = !this.desktopSidebarOpen;
        },
        switchTab(tabName) {
            if (!this.hasAccess(tabName)) { this.showNotify('Access Denied: Your role does not permit access to this module.'); return; }
            if (tabName === 'dashboard') { this.returnToDashboard(); return; }
            if (this.currentTab !== tabName) window.history.pushState({ zenqorPortal: true }, '', window.location.href);
            this.currentTab = tabName; this.mobileMenuOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        returnToDashboard() {
            this.currentTab = 'dashboard';
            this.mobileMenuOpen = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.refreshDashboardCharts();
        },
        refreshDashboardCharts(attempt = 0) {
            if (!this.isLoggedIn || !this.portalDataReady || this.currentTab !== 'dashboard' || ['Staff', 'Client'].includes(this.userProfile.role)) return;
            if (this.chartRenderTimer) { clearTimeout(this.chartRenderTimer); this.chartRenderTimer = null; }
            this.chartRenderAttempts = attempt;
            this.$nextTick(() => {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    const revenueCanvas = document.getElementById('revenueChart');
                    const statusCanvas = document.getElementById('statusChart');
                    if (typeof Chart === 'undefined' || !revenueCanvas || !statusCanvas) {
                        if (attempt < 150) this.chartRenderTimer = setTimeout(() => this.refreshDashboardCharts(attempt + 1), 200);
                        return;
                    }
                    this.chartRenderAttempts = 0;
                    this.renderCharts();
                }));
            });
        },
        destroyDashboardCharts() {
            if (this.chartRenderTimer) clearTimeout(this.chartRenderTimer);
            this.chartRenderTimer = null;
            this.chartRenderAttempts = 0;
            if (this.revenueChartInstance) this.revenueChartInstance.destroy();
            if (this.statusChartInstance) this.statusChartInstance.destroy();
            this.revenueChartInstance = null;
            this.statusChartInstance = null;
        },
        requestLogout() {
            this.logoutConfirm = true;
        },
        setChartFilter(timeframe) {
            this.chartTimeFilter = timeframe; this.renderCharts();
            this.showNotify(`Chart view changed to: ${timeframe.toUpperCase()}`);
        },
        logAudit(action, details) {
            const newLog = { id: String(Date.now()), timestamp: new Date().toLocaleString('en-US'), user: this.userProfile.email, action: action, details: details, browser: navigator.userAgent.substring(0, 80) };
            setDoc(doc(db, "audit_logs", newLog.id), newLog).catch(e => console.error(e));
        },
        downloadPDFDirect(elementId, filename) {
            const element = document.getElementById(elementId);
            if (!element) { alert("Target element not found for PDF generation."); return; }
            this.showNotify("Direct PDF generation in progress...");
            const opt = { margin: 5, filename: filename + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: elementId === 'print-template-payslip' ? 'landscape' : 'portrait' } };
            if (typeof html2pdf !== 'undefined') html2pdf().set(opt).from(element).save().then(() => this.showNotify("PDF file downloaded successfully!")).catch(err => window.print());
            else window.print();
        },

        async handleForgotPassword() {
            if (!this.loginForm.email) { alert("Please enter your official sign-in email address first."); return; }
            try {
                const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                await sendPasswordResetEmail(auth, this.loginForm.email);
                this.showNotify(`Password reset link sent to: ${this.loginForm.email}`);
            } catch (error) { alert("Failed to send password reset email. Ensure the email is valid."); }
        },

        async handleLogin() {
            this.loginError = '';
            this.loginLoading = true;
            try {
                const userCredential = await signInWithEmailAndPassword(auth, this.loginForm.email, this.loginForm.password);
                const firebaseUser = userCredential.user;
                const userData = await this.loadOrMigrateUserMetadata(firebaseUser);

                let role = 'Staff';
                let name = firebaseUser.displayName || firebaseUser.email;
                let photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;

                const mustChangePassword = userData?.mustChangePassword === true;
                if (userData) { role = userData.role || 'Staff'; name = userData.name || name; photo = userData.photo || photo; }
                if (firebaseUser.email === 'admin@zenq0r.com') role = 'Superadmin';
                if (role !== 'Client' && !this.isOfficialEmail(firebaseUser.email)) {
                    await signOut(auth);
                    this.loginError = `Only Client Users System Terminal may use an external email. Other roles must use @${this.officialEmailDomain}.`;
                    this.loginLoading = false;
                    return;
                }

                this.userProfile = { name: name, email: firebaseUser.email, role: role, uid: firebaseUser.uid, photo: photo, mustChangePassword };

                this.resetAllForms(); this.isLoggedIn = true; this.desktopSidebarOpen = false; this.mobileMenuOpen = false;
                this.logAudit('LOGIN', `User logged in with role ${this.getRoleDisplayName(role)}`);
                this.showNotify(`Welcome back (${this.getRoleDisplayName(role)}): ${name}`);
                this.currentTab = mustChangePassword ? 'profile' : 'dashboard';
                if (mustChangePassword) { this.changePasswordModal.required = true; this.changePasswordModal.show = true; }
                await this.initFirebaseRealtime();
                await this.startPresenceTracking();
                this.loginLoading = false;
                this.refreshDashboardCharts();
            } catch (error) {
                this.loginError = 'Invalid email or password credentials / System Error.';
                this.loginLoading = false;
            }
        },

        async handleLogout() {
            try {
                this.logoutConfirm = false;
                this.logAudit('LOGOUT', 'User logged out');
                await this.setCurrentEmployeePresence(false);
                this.stopPresenceTracking();
                await signOut(auth);
                this.destroyDashboardCharts();
                this.isLoggedIn = false; this.loginLoading = false; this.portalDataReady = false; this.portalDataReadyPromise = null; this.userProfile = { name: '', email: '', role: '', photo: '' };
                this.resetAllForms(); this.currentTab = 'dashboard'; this.loginForm = { email: '', password: '' }; this.searchQuery = '';
            } catch (error) { console.error("Logout error:", error); }
        },

        async handleChangePassword() {
            this.changePasswordModal.error = '';
            const { currentPassword, newPassword, confirmPassword } = this.changePasswordModal;
            if (newPassword !== confirmPassword) { this.changePasswordModal.error = 'New passwords do not match.'; return; }
            if (newPassword.length < 8) { this.changePasswordModal.error = 'New password must be at least 8 characters long.'; return; }
            this.changePasswordModal.loading = true;
            try {
                const user = auth.currentUser;
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                await setDoc(doc(db, "users", user.uid), { mustChangePassword: false }, { merge: true });
                this.userProfile.mustChangePassword = false;
                this.changePasswordModal.show = false; this.changePasswordModal.required = false; this.changePasswordModal.currentPassword = ''; this.changePasswordModal.newPassword = ''; this.changePasswordModal.confirmPassword = '';
                this.logAudit('UPDATE', 'User changed their password'); this.showNotify('Password updated successfully!');
            } catch (error) { this.changePasswordModal.error = 'Current password is incorrect or System error.'; } finally { this.changePasswordModal.loading = false; }
        },

        async saveMyProfile() {
            try {
                if (!this.userProfile.email) return;
                const userRef = doc(db, "users", this.userProfile.uid);
                await setDoc(userRef, { name: this.userProfile.name, email: this.userProfile.email, role: this.userProfile.role, photo: this.userProfile.photo }, { merge: true });
                this.logAudit('UPDATE', `User updated own profile: ${this.userProfile.email}`); this.showNotify('Your profile has been updated successfully!');
            } catch (error) { this.showNotify('Error updating profile.'); }
        },
        async handleProfilePhotoUpload(event) {
            const file = event.target.files && event.target.files[0];
            this.profilePhotoUpload.error = '';
            if (!file) return;
            if (!['image/png', 'image/jpeg'].includes(file.type)) { this.profilePhotoUpload.error = 'Only PNG, JPEG or JPG files are allowed.'; event.target.value = ''; return; }
            if (file.size > 2 * 1024 * 1024) { this.profilePhotoUpload.error = 'Image size must not exceed 2 MB.'; event.target.value = ''; return; }
            if (!this.userProfile.uid) { this.profilePhotoUpload.error = 'Please sign in again before uploading a photo.'; return; }
            this.profilePhotoUpload.loading = true;
            try {
                const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const photoRef = ref(storage, `profile_photos/${this.userProfile.uid}/${Date.now()}_${cleanName}`);
                await uploadBytes(photoRef, file, { contentType: file.type });
                const photoUrl = await getDownloadURL(photoRef);
                await setDoc(doc(db, 'users', this.userProfile.uid), { photo: photoUrl }, { merge: true });
                this.userProfile.photo = photoUrl;
                this.logAudit('UPDATE', 'Uploaded profile photo');
                this.showNotify('Profile photo uploaded and saved successfully.');
            } catch (error) {
                console.error('Profile photo upload failed:', error);
                this.profilePhotoUpload.error = 'Unable to upload image. Please try again.';
            } finally {
                this.profilePhotoUpload.loading = false;
                event.target.value = '';
            }
        },

        openUserAccessModal(usr = null) {
            if (usr) { this.userModal.isEdit = true; this.userModal.form = { uid: usr.uid || usr.id || '', name: usr.name || '', email: usr.email || '', password: '', role: usr.role || 'Staff' }; }
            else { this.userModal.isEdit = false; this.userModal.form = { uid: '', name: '', email: '', password: this.generateRandomPassword(8), role: 'Staff' }; }
            this.userModal.show = true;
        },

        isLikelyFirebaseUid(value) {
            return typeof value === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(value);
        },
        async loadOrMigrateUserMetadata(firebaseUser) {
            if (!firebaseUser?.uid || !firebaseUser?.email) return null;
            const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnapshot = await getDoc(userRef);
            if (userSnapshot.exists()) return userSnapshot.data();

            const normalizedEmail = firebaseUser.email.trim().toLowerCase();
            const pendingRef = doc(db, 'pending_access', normalizedEmail);
            const pendingSnapshot = await getDoc(pendingRef);
            if (!pendingSnapshot.exists()) return null;

            const pendingData = pendingSnapshot.data();
            const migratedData = {
                email: normalizedEmail,
                name: pendingData.name || firebaseUser.displayName || normalizedEmail,
                photo: pendingData.photo || '',
                role: pendingData.role || 'Client',
                mustChangePassword: pendingData.mustChangePassword === true,
                migratedAt: new Date().toISOString()
            };
            await setDoc(userRef, migratedData);
            await deleteDoc(pendingRef);
            return migratedData;
        },

        sendWelcomeEmail(userForm) {
            const originEmail = "admin@zenq0r.com";
            const subject = encodeURIComponent(`[ZENQOR ENTERPRISE] Official Account & Portal Access Information (${this.getRoleDisplayName(userForm.role)})`);
                const emailBody = encodeURIComponent(`Greetings ${userForm.name},\n\nYour user account for the ZENQOR TECHNOLOGIES Enterprise Portal v2.0 has been created.\n\nSign-In Email: ${userForm.email}\nTemporary Password: ${userForm.password}\nAssigned Role: ${this.getRoleDisplayName(userForm.role)}\nPortal Link: https://hrms-portal.zenq0r.com\n\nYou will be required to change this temporary password immediately after your first sign-in.\n\nBest regards,\nSystem Administrator`);
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(userForm.email)}&su=${subject}&body=${emailBody}`, '_blank');
            this.showNotify(`Google Gmail compose window opened.`);
        },

        async savePortalUser() {
            try {
                if (!this.userModal.form.name || !this.userModal.form.email || (this.userModal.isEdit === false && !this.userModal.form.password)) { alert("Please fill out all required fields."); return; }
                if (this.userModal.form.role !== 'Client' && !this.isOfficialEmail(this.userModal.form.email)) {
                    alert(`Only Client Users System Terminal may use Gmail or another external domain. This role must use @${this.officialEmailDomain}.`);
                    return;
                }

                const isNewUser = !this.userModal.isEdit;
                const email = this.userModal.form.email.trim().toLowerCase(); const password = this.userModal.form.password.trim();
                this.userModal.form.email = email;
                const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userModal.form.name)}&background=0B1E36&color=D4AF37`;
                const existingRecord = this.users.find(user => (user.email || '').toLowerCase() === email);
                const possibleUid = this.userModal.form.uid || existingRecord?.uid || existingRecord?.id || '';
                let userId = this.isLikelyFirebaseUid(possibleUid) ? possibleUid : '';
                let existingAuthenticationAccount = false;

                if (isNewUser) {
                    const { initializeApp, deleteApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
                    const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                    const secondaryApp = initializeApp(auth.app.options, "SecondaryAuthApp-" + Date.now());
                    const secondaryAuth = getAuth(secondaryApp);
                    try {
                        const createdUser = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                        userId = createdUser.user.uid;
                    } catch (authErr) {
                        if (authErr.code === 'auth/email-already-in-use') existingAuthenticationAccount = true;
                        else { alert("Gagal mendaftar ke Firebase: " + authErr.message); return; }
                    } finally {
                        await signOutSecondary(secondaryAuth).catch(() => {});
                        await deleteApp(secondaryApp).catch(() => {});
                    }
                }

                if (!userId) {
                    await setDoc(doc(db, 'pending_access', email), {
                        email,
                        name: this.userModal.form.name,
                        photo: photoUrl,
                        role: this.userModal.form.role,
                        mustChangePassword: false,
                        createdByUid: this.userProfile.uid,
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                    this.userModal.show = false;
                    this.logAudit('CREATE', `Pending UID migration created for ${email}`);
                    this.showNotify(existingAuthenticationAccount ? 'Existing Firebase account found. Access will activate automatically at the next login.' : 'Portal access is pending UID activation.');
                    return;
                }
                await setDoc(doc(db, "users", userId), { email: email, name: this.userModal.form.name, photo: photoUrl, role: this.userModal.form.role, ...(isNewUser ? { mustChangePassword: true } : {}) }, { merge: true });
                if (userId === this.userProfile.uid) {
                    this.userProfile.role = this.userModal.form.role;
                    this.userProfile.name = this.userModal.form.name;
                    this.userProfile.photo = photoUrl;
                }
                this.userModal.show = false;
                this.logAudit(isNewUser ? 'CREATE' : 'UPDATE', `User role/metadata for ${email}`);
                if (isNewUser) { this.sendWelcomeEmail(this.userModal.form); this.showNotify('Akaun berjaya dicipta!'); }
                else this.showNotify('User updated successfully!');
            } catch (error) {
                console.error('Portal access save failed:', error);
                alert("Unable to save portal access. Please ensure the latest Firestore Rules have been published.");
            }
        },

        async deletePortalUser(uid, email) {
            if (confirm(`Are you sure you want to delete portal access for: ${email}?`)) {
                try { await deleteDoc(doc(db, "users", uid)); this.logAudit('DELETE', `Deleted user metadata for ${email}`); this.showNotify('User record deleted.'); } catch (error) { console.error('Portal user deletion failed:', error); this.showNotify('Unable to delete portal access.'); }
            }
        },

        backupDatabase() {
            if (!this.canBackupDatabase) { this.showNotify('Only Superadmin and Director can export a database backup.'); return; }
            const data = { company: this.company, employees: this.employees, customers: this.customers, docHistory: this.docHistory, payslipHistory: this.payslipHistory, claimsHistory: this.claimsHistory, users: this.users.map(u => ({ name: u.name, email: u.email, role: u.role })), exportDate: new Date().toISOString() };
            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", jsonStr); dlAnchorElem.setAttribute("download", `zenqor_backup_${new Date().toISOString().substr(0,10)}.json`); dlAnchorElem.click();
            this.logAudit('BACKUP', 'Exported JSON backup'); this.showNotify("Database JSON backup downloaded!");
        },

        async saveSettings() {
            if (!this.canManageCompanySettings) { this.showNotify('You do not have permission to update company settings.'); return; }
            try { await setDoc(doc(db, "settings", "company_profile"), { ...this.company }); this.logAudit('UPDATE', 'Updated settings'); this.showNotify('Settings updated!'); } catch (error) { this.showNotify('Unable to save company settings.'); }
        },

        selectCustomerForDoc(e) {
            const cust = this.customers.find(c => c.clientName === e.target.value);
            if (cust) {
                Object.keys(cust).forEach(k => { if (this.docForm.hasOwnProperty(k)) this.docForm[k] = cust[k]; });
                this.clientSavedForDocument = true;
                this.showNotify(`Saved client loaded. You can now add document items.`);
            } else {
                this.clientSavedForDocument = false;
            }
        },
        async saveCustomerToDatabase() {
            if (!this.canManageClients) { this.showNotify('You do not have permission to save client records.'); return false; }
            if (!this.docForm.clientName || !this.docForm.clientPhone || !this.docForm.clientAddress) return alert('Enter Client Name, Phone, and Address.');
            try {
                const docId = this.docForm.clientName.trim().replace(/\s+/g, '_').toLowerCase();
                const newCust = { clientName: this.docForm.clientName, clientPhone: this.docForm.clientPhone, clientSSM: this.docForm.clientSSM, clientAddress: this.docForm.clientAddress, clientCity: this.docForm.clientCity, clientState: this.docForm.clientState, clientPostcode: this.docForm.clientPostcode, clientCountry: this.docForm.clientCountry, clientEmail: this.docForm.clientEmail, clientContactPerson: this.docForm.clientContactPerson, clientPosition: this.docForm.clientPosition };
            await setDoc(doc(db, "customers", docId), newCust); this.clientSavedForDocument = true; this.logAudit('CREATE', `Saved customer ${this.docForm.clientName}`); this.showNotify('Client saved. You can now add document items.'); return true;
            } catch (error) { console.error('Client save failed:', error); this.showNotify('Unable to save client information.'); return false; }
        },
        selectCustomerFromTable(cust) {
            ['clientName','clientPhone','clientSSM','clientAddress','clientCity','clientState','clientPostcode','clientCountry','clientEmail','clientContactPerson','clientPosition'].forEach(k => { this.docForm[k] = cust[k] || (k === 'clientCountry' ? 'Malaysia' : ''); });
            this.showNotify(`Client loaded.`);
        },
        openClientView(cust) {
            this.clientView.client = {
                clientName: cust.clientName || '-', clientSSM: cust.clientSSM || '-', clientContactPerson: cust.clientContactPerson || '-',
                clientPosition: cust.clientPosition || '-', clientEmail: cust.clientEmail || '-', clientPhone: cust.clientPhone || '-',
                clientAddress: cust.clientAddress || '-', clientCity: cust.clientCity || '-', clientState: cust.clientState || '-',
                clientPostcode: cust.clientPostcode || '-', clientCountry: cust.clientCountry || '-'
            };
            this.clientView.show = true;
        },
        requestClientAction(action, cust) {
            this.clientActionConfirm = { show: true, action, client: cust };
        },
        async confirmClientAction() {
            const { action, client } = this.clientActionConfirm;
            this.clientActionConfirm = { show: false, action: '', client: null };
            if (!client) return;
            if (action === 'edit') this.editCustomer(client);
            if (action === 'delete') await this.deleteCustomer(client.clientName, false);
        },
        editCustomer(cust) {
            if (!this.canManageClients) { this.showNotify('You do not have permission to update client records.'); return; }
            this.selectCustomerFromTable(cust); this.currentTab = 'doc-generator'; window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        async deleteCustomer(clientName, requiresConfirmation = true) {
            if (requiresConfirmation) {
                const client = this.customers.find(cust => cust.clientName === clientName);
                if (client) this.requestClientAction('delete', client);
                return;
            }
            if (!this.canDelete) { this.showNotify('Only Superadmin and Director can delete client records.'); return; }
            try { await deleteDoc(doc(db, "customers", clientName.trim().replace(/\s+/g, '_').toLowerCase())); this.showNotify('Client deleted.'); } catch (error) { this.showNotify('Unable to delete client.'); }
        },

        openEmployeeModal(emp = null) {
            if (!this.canManageEmployees) { this.showNotify('You do not have permission to update employee records.'); return; }
            const sensitiveFields = ['ic', 'bankAcc', 'epfNo', 'socsoNo', 'eisNo', 'taxNo'];
            if (emp) {
                this.employeeModal.isEdit = true;
                this.employeeModal.form = JSON.parse(JSON.stringify(emp));
                this.employeeModal.originalSensitive = Object.fromEntries(sensitiveFields.map(field => [field, emp[field] || '']));
                sensitiveFields.forEach(field => { this.employeeModal.form[field] = ''; });
            } else {
                this.employeeModal.isEdit = false;
                this.employeeModal.originalSensitive = {};
                this.employeeModal.form = { empNo: 'ZEN-HR' + String(Math.floor(1000+Math.random()*9000)), name: '', email: '', ic: '', dept: '', position: '', employmentType: 'Probation', status: 'Aktif', epfNo: '', socsoNo: '', eisNo: '', taxNo: '', bankAcc: '', isSenior: false, joinDate: new Date().toISOString().substr(0,10), basicSalary: 0, allowance: 0, deduction: 0 };
            }
            this.employeeModal.show = true;
        },
        async saveEmployee() {
            try {
                if (!this.canManageSensitiveData) { this.showNotify('Only HR, Superadmin and Director can update sensitive employee information.'); return; }
                const form = this.employeeModal.form;
                const sensitiveFields = ['ic', 'bankAcc', 'epfNo', 'socsoNo', 'eisNo', 'taxNo'];
                if (!form.empNo || !form.name || !form.dept || !form.joinDate || !form.employmentType) return alert("Complete the required Basic Information fields.");
                if (!this.employeeModal.isEdit && !form.ic) return alert("National ID / Passport is required for a new employee.");
                if (sensitiveFields.some(field => /^X{5}/i.test(String(form[field] || '').trim()))) return alert("Enter the complete sensitive number, not a masked value.");
                sensitiveFields.forEach(field => {
                    if (this.employeeModal.isEdit && !String(form[field] || '').trim()) form[field] = this.employeeModal.originalSensitive[field] || '';
                });
                await setDoc(doc(db, "employees", this.employeeModal.form.empNo.trim()), { ...this.employeeModal.form });
                this.employeeModal.show = false; this.logAudit(this.employeeModal.isEdit ? 'UPDATE':'CREATE', `Saved employee ${this.employeeModal.form.empNo}`); this.showNotify('Employee data saved!');
            } catch (error) { console.error('Employee save failed:', error); this.showNotify('Unable to save employee information.'); }
        },
        openEmployeeView(emp) {
            this.employeeView.employee = {
                empNo: emp.empNo || '-', name: emp.name || '-', email: emp.email || '-', position: emp.position || '-', dept: emp.dept || '-',
                employmentType: emp.employmentType || '-', status: emp.status || '-', joinDate: emp.joinDate || '-', isSenior: !!emp.isSenior,
                presenceStatus: this.employeePresenceLabel(emp), presenceDetail: this.employeeLastSeen(emp),
                ic: this.maskSensitive(emp.ic), bankAcc: this.maskSensitive(emp.bankAcc), epfNo: this.maskSensitive(emp.epfNo),
                socsoNo: this.maskSensitive(emp.socsoNo), eisNo: this.maskSensitive(emp.eisNo), taxNo: this.maskSensitive(emp.taxNo),
                basicSalary: this.formatCurrency(emp.basicSalary), allowance: this.formatCurrency(emp.allowance), deduction: this.formatCurrency(emp.deduction)
            };
            this.employeeView.show = true;
        },
        requestEmployeeAction(action, emp) {
            this.employeeActionConfirm = { show: true, action, employee: emp };
        },
        async confirmEmployeeAction() {
            const { action, employee } = this.employeeActionConfirm;
            this.employeeActionConfirm = { show: false, action: '', employee: null };
            if (!employee) return;
            if (action === 'edit') this.openEmployeeModal(employee);
            if (action === 'delete') await this.deleteEmployee(employee.empNo, false);
        },
        async deleteEmployee(empNo, requiresConfirmation = true) {
            if (requiresConfirmation) {
                const employee = this.employees.find(emp => emp.empNo === empNo);
                if (employee) this.requestEmployeeAction('delete', employee);
                return;
            }
            if (!this.canDelete) { this.showNotify('Only Superadmin and Director can delete employee records.'); return; }
            try { await deleteDoc(doc(db, "employees", empNo)); this.showNotify('Employee deleted.'); } catch (error) { this.showNotify('Unable to delete employee.'); }
        },
        selectEmployeeFromTable(emp) {
            this.payForm.empNo = emp.empNo || ''; this.payForm.name = emp.name || ''; this.payForm.empEmail = emp.email || ''; this.payForm.ic = emp.ic || ''; this.payForm.dept = emp.dept || ''; this.payForm.position = emp.position || ''; this.payForm.joinDate = emp.joinDate || ''; this.payForm.bankAcc = emp.bankAcc || ''; this.payForm.isSenior = !!emp.isSenior; this.payForm.epfSocso = `KWSP: ${emp.epfNo || '-'} | PERKESO: ${emp.socsoNo || '-'}`; this.payForm.basic = emp.basicSalary || 0;
            this.autoCalculatePayroll(); this.showNotify(`Employee loaded.`);
        },
        selectEmployeeForPayslip(e) { const emp = this.employees.find(x => x.empNo === e.target.value); if (emp) this.selectEmployeeFromTable(emp); },
        selectEmployeeForClaim(e) { const emp = this.employees.find(x => x.empNo === e.target.value); if (emp) { this.claimForm.name = emp.name||''; this.claimForm.empNo = emp.empNo||''; this.claimForm.empEmail = emp.email||''; this.claimForm.dept = emp.dept||''; this.showNotify(`Applicant loaded.`); } },

        // WORKFLOW: Staff/Client -> HR -> Account -> Director (final approval)
        canApproveClaim(clm) {
            const role = this.userProfile.role;
            if (role === 'Director') return typeof clm.status === 'string' && clm.status.startsWith('Pending');
            const expectedStatus = { HR: 'Pending HR', Account: 'Pending Account', Director: 'Pending Director' }[role];
            return !!expectedStatus && clm.status === expectedStatus && (!clm.assignedToEmail || clm.assignedToEmail === this.userProfile.email);
        },
        canEditClaim(clm) {
            return clm.empEmail === this.userProfile.email && clm.status === 'Pending HR';
        },
        async approveClaim(clm) {
            if (this.attachmentUploadState.director) { this.showNotify('Wait for the Director approval document upload to finish.'); return false; }
            const nextRole = this.userProfile.role === 'Director' ? null : { 'Pending HR': 'Account', 'Pending Account': 'Director' }[clm.status];
            const roleNames = { HR: 'Human Resource Management', Account: 'Finance Account Management', Director: 'Director' };
            if (this.userProfile.role === 'Director' && !this.claimPreview.directorApprovalAttachment) { alert('Director approval requires a supporting document attachment.'); return; }
            const update = nextRole
                ? { status: `Pending ${nextRole}`, assignedToUid: '', assignedToName: roleNames[nextRole], assignedToEmail: '', assignedToRole: nextRole }
                : { status: 'Approved', approvedByUid: this.userProfile.uid, approvedByName: this.userProfile.name, approvedByRole: this.userProfile.role, approvedAt: new Date().toISOString(), directorApprovalAttachment: this.claimPreview.directorApprovalAttachment, directorApprovalAttachmentName: this.claimPreview.directorApprovalAttachmentName };
            try {
                await updateDoc(doc(db, "claims", clm.id), update);
                this.logAudit('UPDATE', `Claim ${clm.receiptNo} approved by ${this.userProfile.role}`);
                this.showNotify(nextRole ? `Claim assigned to ${roleNames[nextRole]}.` : 'Claim finally approved by Director.');
                return true;
            } catch (error) {
                this.showNotify('Unable to update claim status.');
                return false;
            }
        },
        async approveClaimFromPreview() {
            const approved = await this.approveClaim(this.claimPreview.claim);
            if (approved) this.claimPreview.show = false;
        },
        async rejectClaim(clm) {
            if (confirm("REJECT this claim application?")) { try { await updateDoc(doc(db, "claims", clm.id), { status: 'Rejected', rejectedByUid: this.userProfile.uid, rejectedByName: this.userProfile.name, rejectedByRole: this.userProfile.role, rejectedAt: new Date().toISOString() }); this.showNotify("Claim rejected."); } catch (error) { this.showNotify('Unable to reject claim.'); } }
        },
        async saveClaimRecord() {
                if (this.attachmentUploadState.receipt) return alert('Wait for the receipt upload to finish.');
                if (!this.claimForm.name || !this.claimForm.empNo || !this.claimForm.amount || !this.claimForm.receiptNo || !this.claimForm.description.trim() || !this.claimForm.receiptAttachment) return alert("Complete all required claim fields, including Expense Description and Receipt Attachment.");
            try {
                const applicantUser = this.users.find(u => u.email === (this.claimForm.empEmail || this.userProfile.email));
                const applicantRole = applicantUser ? applicantUser.role : 'Staff';
                const initialStatus = 'Pending HR';
                const assignee = { id: '', name: 'Human Resource Management', email: '', role: 'HR' };

                const claimId = String(this.editingClaimId || Date.now());
                const payload = { id: claimId, type: 'Claim', date: this.claimForm.expenseDate, expenseDate: this.claimForm.expenseDate, name: this.claimForm.name, empNo: this.claimForm.empNo, empEmail: this.claimForm.empEmail || this.userProfile.email, dept: this.claimForm.dept, category: this.claimForm.category, subCategory: this.claimForm.subCategory, amount: Number(this.claimForm.amount), receiptNo: this.claimForm.receiptNo, description: this.claimForm.description, receiptAttachment: this.claimForm.receiptAttachment, receiptAttachmentName: this.claimForm.receiptAttachmentName || '', status: this.editingClaimId ? (this.claimForm.status || initialStatus) : initialStatus, assignedToUid: assignee.id, assignedToName: assignee.name, assignedToEmail: assignee.email, assignedToRole: assignee.role };
                await setDoc(doc(db, "claims", claimId), payload);
                this.editingClaimId = null; this.showNotify(`Claim submitted.`); this.resetClaimForm();
            } catch (error) { console.error('Claim save failed:', error); this.showNotify('Unable to submit claim. Check the attachment size and try again.'); }
        },
        editClaimRecord(clm) { this.editingClaimId = clm.id; this.claimForm = JSON.parse(JSON.stringify(clm)); this.currentTab = 'claims'; window.scrollTo({ top:0, behavior:'smooth' }); },
        cancelEditClaim() { this.editingClaimId = null; this.resetClaimForm(); },
        async deleteClaimRecord(claimId) { if (confirm("Delete this claim record?")) { try { await deleteDoc(doc(db, "claims", claimId)); this.showNotify("Claim deleted."); } catch (error) { console.error('Claim deletion failed:', error); this.showNotify('Unable to delete claim.'); } } },

        setPrintOrientation(orientation, margin) { const styleEl = document.getElementById('dynamic-print-orientation'); if (styleEl) styleEl.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: ${margin} !important; } }`; },
        async printDocumentModule() { if (!this.clientSavedForDocument) return alert('Save Client information before previewing or printing this document.'); this.activePrintModule = this.docForm.type === 'Quotation' ? 'QUOTATION' : 'INVOICE'; this.setPrintOrientation('portrait', '15mm'); setTimeout(() => { window.print(); }, 250); },
        async printApprovedClaim(claim) {
            if (!claim || claim.status !== 'Approved') { alert('Only approved claims can be printed.'); return; }
            this.claimPrint = JSON.parse(JSON.stringify(claim));
            this.activePrintModule = 'CLAIM';
            this.setPrintOrientation('portrait', '15mm');
            await this.$nextTick();
            window.print();
        },
        async printPayslipModule() { if (!this.payForm.name || !this.payForm.empNo) return alert('Enter Name and Emp ID.'); this.autoCalculatePayroll(); this.activePrintModule = 'PAYSLIP'; this.setPrintOrientation('landscape', '0mm'); setTimeout(() => { window.print(); }, 250); },
        
        async saveDocRecord() {
            try {
                if (this.attachmentUploadState.payment) { this.showNotify('Wait for the payment attachment upload to finish.'); return false; }
                if (!this.canManageDocuments) { this.showNotify('You do not have permission to save documents.'); return false; }
                if (['Paid', 'Partial'].includes(this.docForm.status) && (!this.docForm.paymentRefNo || this.docForm.paymentRefNo.trim() === '')) { alert("Payment Reference No. is REQUIRED."); return false; }
                const docId = String(this.editingDocId || Date.now());
                const payload = { id: docId, type: this.docForm.type, docNo: this.docForm.docNo, status: this.docForm.status || (this.docForm.type === 'Invoice' ? 'Unpaid' : 'Open'), paymentMethod: this.docForm.paymentMethod || 'Bank Transfer', paymentBank: this.docForm.paymentBank || '', paymentReceiver: this.docForm.paymentReceiver || '', paymentRefNo: this.docForm.paymentRefNo || '', paymentAttachment: this.docForm.paymentAttachment || '', date: this.docForm.date, name: this.docForm.clientName, amount: this.docGrandTotal, raw: JSON.parse(JSON.stringify(this.docForm)) };
                if (!this.clientSavedForDocument) { alert('Save Client information before saving this document.'); return false; }
                await setDoc(doc(db, "docs", docId), payload); this.editingDocId = docId; this.showNotify(`Document saved.`); return true;
            } catch (error) { console.error('Document save failed:', error); this.showNotify('Unable to save document. Check the attachment size and try again.'); return false; }
        },
        async savePayslipRecord() {
            try {
                if (!this.canManagePayroll) { this.showNotify('You do not have permission to save payslips.'); return; }
                const docId = String(this.editingPayId || Date.now());
                const payload = { id: docId, type: 'Payslip', docNo: `PS-${this.currentYear}-${this.payForm.empNo}`, date: this.payForm.payDate, name: this.payForm.name, amount: this.payCalc.net, raw: JSON.parse(JSON.stringify(this.payForm)) };
                await setDoc(doc(db, "payslips", docId), payload); this.editingPayId = null; this.showNotify(`Payslip saved.`);
            } catch (error) { console.error('Payslip save failed:', error); this.showNotify('Unable to save payslip.'); }
        },
        addDocItem() { this.docForm.items.push({ desc: '', qty: 1, price: 0 }); },
        removeDocItem(idx) { this.docForm.items.splice(idx, 1); },
        generateDocNo() {
            if (this.editingDocId) return;
            const prefix = this.docForm.type === 'Invoice' ? 'INV' : 'QT';
            const relevantDocs = this.docHistory.filter(d => d.type === this.docForm.type && String(d.docNo || '').includes(`-${this.currentYear}-`));
            let maxNum = 1000;
            relevantDocs.forEach(d => { if (d.docNo) { const num = parseInt(d.docNo.split('-').pop(), 10); if (!isNaN(num) && num > maxNum) maxNum = num; } });
            this.docForm.docNo = `${prefix}-${this.currentYear}-${String(maxNum + 1).padStart(5, '0')}`;
        },
        cancelEditDoc() { this.editingDocId = null; this.generateDocNo(); },

        autoCalculatePayroll() {
            const rates = this.payForm.isSenior ? STATUTORY_RATES.senior : STATUTORY_RATES.regular;
            let epfWages = (Number(this.payForm.basic)||0) + (Number(this.payForm.phone)||0) + (Number(this.payForm.transport)||0) + (Number(this.payForm.meal)||0) + (Number(this.payForm.bonus)||0);
            let socsoWages = epfWages + (Number(this.payForm.ot)||0);
            let gross = socsoWages;
            let epfEmp = Math.round(epfWages * rates.epf.employeePct);
            let epfEmpr = Math.round(epfWages * (epfWages <= rates.epf.threshold ? rates.epf.employerPctBelow5k : rates.epf.employerPctAbove5k));
            let capSocso = Math.min(socsoWages, rates.socso.wageCap);
            let socsoEmp = Math.round(capSocso * rates.socso.employeePct * 100) / 100;
            let socsoEmpr = Math.round(capSocso * rates.socso.employerPct * 100) / 100;
            let capEis = Math.min(socsoWages, rates.eis.wageCap);
            let eisEmp = Math.round(capEis * rates.eis.employeePct * 100) / 100;
            let eisEmpr = Math.round(capEis * rates.eis.employerPct * 100) / 100;
            this.payForm.dedEpf = epfEmp; this.payForm.dedSocso = socsoEmp; this.payForm.dedEis = eisEmp;
            let deduct = epfEmp + socsoEmp + eisEmp + (Number(this.payForm.dedPcb)||0) + (Number(this.payForm.dedAdvance)||0) + (Number(this.payForm.dedOther)||0);
            let net = gross - deduct;
            this.payCalc = { gross, deduct, net, epfEmpr, socsoEmpr, eisEmpr };
        },
        cancelEditPay() { this.editingPayId = null; },
        async viewRecord(item) {
            const previewItem = JSON.parse(JSON.stringify(item));
            if (!previewItem.isDoc && !previewItem.isPay) previewItem.isPay = previewItem.type === 'Payslip';
            if (!previewItem.isDoc && !previewItem.isPay) previewItem.isDoc = true;
            if (!previewItem.raw) { this.showNotify('Record preview is unavailable.'); return; }
            const originalDoc = JSON.parse(JSON.stringify(this.docForm));
            const originalPay = JSON.parse(JSON.stringify(this.payForm));
            const originalModule = this.activePrintModule;
            if (previewItem.isDoc) {
                this.docForm = JSON.parse(JSON.stringify(previewItem.raw));
                this.activePrintModule = previewItem.type === 'Quotation' ? 'QUOTATION' : 'INVOICE';
            } else {
                this.payForm = JSON.parse(JSON.stringify(previewItem.raw));
                this.autoCalculatePayroll();
                this.activePrintModule = 'PAYSLIP';
            }
            await this.$nextTick();
            const templateId = previewItem.isDoc ? (previewItem.type === 'Quotation' ? 'print-template-quotation' : 'print-template-invoice') : 'print-template-payslip';
            const template = document.getElementById(templateId);
            const html = template ? template.outerHTML.replace(/\bprint-only\b/g, '') : '';
            this.docForm = originalDoc;
            this.payForm = originalPay;
            this.activePrintModule = originalModule;
            this.autoCalculatePayroll();
            this.recordPreview = { show: true, html };
        },
        viewClaimRecord(claim) {
            this.claimPreview = { show: true, claim: JSON.parse(JSON.stringify(claim)), directorApprovalAttachment: '', directorApprovalAttachmentName: '' };
        },
        editRecord(item) {
            if (item.isDoc) { this.editingDocId = item.id; if (item.raw) { this.docForm = JSON.parse(JSON.stringify(item.raw)); this.docForm.status = item.raw.status || item.status || (item.type === 'Invoice' ? 'Unpaid' : 'Open'); } this.currentTab = 'doc-generator'; }
            else if (item.isPay) { this.editingPayId = item.id; if (item.raw) this.payForm = JSON.parse(JSON.stringify(item.raw)); this.autoCalculatePayroll(); this.currentTab = 'payslip-generator'; }
            else if (item.isClaim) this.editClaimRecord(item);
        },
        async confirmDeleteRecord(item) {
            if (confirm(`WARNING: Delete record?`)) {
                try { if (item.isDoc) await deleteDoc(doc(db, "docs", item.id)); else if (item.isPay) await deleteDoc(doc(db, "payslips", item.id)); else if (item.isClaim) await deleteDoc(doc(db, "claims", item.id)); this.showNotify('Record deleted.'); } catch (error) { console.error('Record deletion failed:', error); this.showNotify('Unable to delete record.'); }
            }
        },

        renderCharts() {
            if (typeof Chart === 'undefined' || !this.portalDataReady || this.currentTab !== 'dashboard' || ['Staff', 'Client'].includes(this.userProfile.role)) return;
            const revCanvas = document.getElementById('revenueChart');
            const statusCanvas = document.getElementById('statusChart');
            if (!revCanvas || !statusCanvas) { this.refreshDashboardCharts(this.chartRenderAttempts + 1); return; }
            const ctxRev = revCanvas.getContext('2d');
            const ctxStatus = statusCanvas.getContext('2d');
            if (!ctxRev || !ctxStatus) return;

            try {
                const gridColor = 'rgba(0,0,0,0.06)';
                const textColor = '#475569';
                const oldRevenueChart = Chart.getChart ? Chart.getChart(revCanvas) : this.revenueChartInstance;
                const oldStatusChart = Chart.getChart ? Chart.getChart(statusCanvas) : this.statusChartInstance;
                if (oldRevenueChart) oldRevenueChart.destroy();
                if (oldStatusChart) oldStatusChart.destroy();

                const revData = this.getFilteredRevenueData();
                const revenueChart = new Chart(ctxRev, {
                    type: 'line', data: { labels: revData.labels, datasets: [{ label: 'Revenue Paid (RM)', data: revData.data, borderColor: '#0F766E', backgroundColor: 'rgba(15, 118, 110, 0.15)', borderWidth: 3, fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#E76F51' }] },
                    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 350 }, scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { beginAtZero: true, min: 0, grid: { color: gridColor }, ticks: { color: textColor, callback: function(value) { return 'RM ' + value.toLocaleString(); } } } }, plugins: { legend: { labels: { color: textColor } } } }
                });

                const statusValues = [this.paidInvoicesCount, this.unpaidInvoicesCount, this.totalQuotations];
                const hasStatusData = statusValues.some(value => value > 0);
                const statusChart = new Chart(ctxStatus, {
                    type: 'doughnut', data: { labels: hasStatusData ? ['Paid Invoices', 'Unpaid Invoices', 'Quotations'] : ['No document data yet'], datasets: [{ data: hasStatusData ? statusValues : [1], backgroundColor: hasStatusData ? ['#0F766E', '#E76F51', '#F4A261'] : ['#CBD5E1'], borderWidth: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 350 }, plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
                });
                this.revenueChartInstance = Vue.markRaw ? Vue.markRaw(revenueChart) : revenueChart;
                this.statusChartInstance = Vue.markRaw ? Vue.markRaw(statusChart) : statusChart;
                requestAnimationFrame(() => { revenueChart.resize(); statusChart.resize(); });
            } catch (error) {
                console.error('Dashboard chart rendering failed:', error);
                if (this.chartRenderAttempts < 150) this.chartRenderTimer = setTimeout(() => this.refreshDashboardCharts(this.chartRenderAttempts + 1), 200);
            }
        },

        getFilteredRevenueData() {
            const filter = this.chartTimeFilter; const now = new Date(); let labels = []; let revenueData = [];
            if (filter === 'daily') {
                for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dateStr = d.toISOString().substr(0, 10); labels.push(d.toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short' })); let total = 0; this.docHistory.forEach(doc => { if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date === dateStr) total += (Number(doc.amount) || 0); }); revenueData.push(total); }
            } else if (filter === 'weekly') {
                for (let i = 3; i >= 0; i--) { labels.push(`Week ${4 - i}`); const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - (i * 7 + 7)); const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() - (i * 7)); let total = 0; this.docHistory.forEach(doc => { if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) { const docDate = new Date(doc.date); if (docDate >= weekStart && docDate <= weekEnd) total += (Number(doc.amount) || 0); } }); revenueData.push(total); }
            } else if (filter === 'monthly') {
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; revenueData = new Array(12).fill(0);
                this.docHistory.forEach(doc => { if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) { const docDate = new Date(doc.date); if (!isNaN(docDate.getTime()) && docDate.getFullYear() === now.getFullYear()) revenueData[docDate.getMonth()] += (Number(doc.amount) || 0); } });
            } else if (filter === 'yearly') {
                const currentYear = now.getFullYear(); for (let y = currentYear - 4; y <= currentYear; y++) { labels.push(String(y)); let total = 0; this.docHistory.forEach(doc => { if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) { const docDate = new Date(doc.date); if (docDate.getFullYear() === y) total += (Number(doc.amount) || 0); } }); revenueData.push(total); }
            }
            return { labels, data: revenueData };
        },

        initFirebaseRealtime() {
            if (this.portalDataReadyPromise) return this.portalDataReadyPromise;

            const subscribeWithReadySignal = (source, onData, label) => new Promise((resolve) => {
                let hasInitialData = false;
                const unsubscribe = onSnapshot(source, (snapshot) => {
                    onData(snapshot);
                    if (!hasInitialData) { hasInitialData = true; resolve(); }
                }, (error) => {
                    console.error(`Unable to load ${label}:`, error);
                    if (!hasInitialData) { hasInitialData = true; resolve(); }
                });
                this.unsubscribers.push(unsubscribe);
            });

            const role = this.userProfile.role;
            const canReadAllDocuments = ['Superadmin', 'Director', 'HR', 'Account', 'IT'].includes(role);
            const canReadAllPayslips = ['Superadmin', 'Director', 'HR', 'Account'].includes(role);
            const canReadAllClaims = ['Superadmin', 'Director', 'HR', 'Account'].includes(role);
            const canReadAllEmployees = ['Superadmin', 'Director', 'HR', 'Account'].includes(role);
            const canReadAllUsers = ['Superadmin', 'Director', 'HR'].includes(role);
            const canReadAuditLogs = ['Superadmin', 'Director', 'IT'].includes(role);
            const documentsSource = canReadAllDocuments
                ? collection(db, 'docs')
                : role === 'Client'
                    ? query(collection(db, 'docs'), where('raw.clientEmail', '==', this.userProfile.email))
                    : null;
            const payslipsSource = canReadAllPayslips
                ? collection(db, 'payslips')
                : role === 'Staff'
                    ? query(collection(db, 'payslips'), where('raw.empEmail', '==', this.userProfile.email))
                    : null;
            const claimsSource = canReadAllClaims
                ? collection(db, 'claims')
                : role === 'Staff'
                    ? query(collection(db, 'claims'), where('empEmail', '==', this.userProfile.email))
                    : null;
            const employeesSource = canReadAllEmployees
                ? collection(db, 'employees')
                : ['Staff', 'IT'].includes(role)
                    ? query(collection(db, 'employees'), where('email', '==', this.userProfile.email))
                    : null;

            const userSubscription = canReadAllUsers
                ? subscribeWithReadySignal(collection(db, 'users'), (snapshot) => {
                    this.users = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
                    const currentUser = this.users.find(user => user.id === this.userProfile.uid);
                    if (currentUser) {
                        this.userProfile.role = currentUser.role || this.userProfile.role;
                        this.userProfile.name = currentUser.name || this.userProfile.name;
                        this.userProfile.photo = currentUser.photo || this.userProfile.photo;
                    }
                }, 'portal users')
                : subscribeWithReadySignal(doc(db, 'users', this.userProfile.uid), (snapshot) => {
                    if (!snapshot.exists()) return;
                    const currentUser = { ...snapshot.data(), id: snapshot.id };
                    this.users = [currentUser];
                    this.userProfile.role = currentUser.role || this.userProfile.role;
                    this.userProfile.name = currentUser.name || this.userProfile.name;
                    this.userProfile.photo = currentUser.photo || this.userProfile.photo;
                }, 'current portal user');

            const initialLoads = [
                this.canManageCompanySettings
                    ? subscribeWithReadySignal(doc(db, "settings", "company_profile"), (snapshot) => { if (snapshot.exists()) this.company = snapshot.data(); }, 'company settings')
                    : Promise.resolve(),
                employeesSource
                    ? subscribeWithReadySignal(employeesSource, (snapshot) => { this.employees = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); }, 'employees')
                    : Promise.resolve(),
                (this.hasAccess('client-directory') || this.hasAccess('doc-generator'))
                    ? subscribeWithReadySignal(collection(db, "customers"), (snapshot) => { this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); }, 'clients')
                    : Promise.resolve(),
                documentsSource
                    ? subscribeWithReadySignal(documentsSource, (snapshot) => { this.docHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); this.generateDocNo(); this.refreshDashboardCharts(); }, 'documents')
                    : Promise.resolve(),
                payslipsSource
                    ? subscribeWithReadySignal(payslipsSource, (snapshot) => { this.payslipHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); }, 'payslips')
                    : Promise.resolve(),
                claimsSource
                    ? subscribeWithReadySignal(claimsSource, (snapshot) => { this.claimsHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); }, 'claims')
                    : Promise.resolve(),
                userSubscription,
                canReadAuditLogs
                    ? subscribeWithReadySignal(collection(db, "audit_logs"), (snapshot) => { this.auditLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.id - a.id); }, 'audit logs')
                    : Promise.resolve()
            ];

            this.portalDataReadyPromise = Promise.all(initialLoads).then(() => {
                this.portalDataReady = true;
                this.refreshDashboardCharts();
                return true;
            });
            return this.portalDataReadyPromise;
        }
    },
    mounted() {
        document.documentElement.classList.remove('dark');
        this.autoCalculatePayroll();
        this.generateDocNo();
        window.history.replaceState({ zenqorPortal: true }, '', window.location.href);
        this.browserBackHandler = () => {
            if (this.isLoggedIn && this.currentTab !== 'dashboard') this.returnToDashboard();
        };
        window.addEventListener('popstate', this.browserBackHandler);

        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    this.loginLoading = true;
                    const userData = await this.loadOrMigrateUserMetadata(firebaseUser);
                    let role = 'Staff';
                    let name = firebaseUser.displayName || firebaseUser.email;
                    let photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;

                    const mustChangePassword = userData?.mustChangePassword === true;
                    if (userData) {
                        role = userData.role || 'Staff';
                        name = userData.name || name;
                        photo = userData.photo || photo;
                    }
                    if (firebaseUser.email === 'admin@zenq0r.com') {
                        role = 'Superadmin';
                    }
                    if (role !== 'Client' && !this.isOfficialEmail(firebaseUser.email)) {
                        this.loginError = `Only Client Users System Terminal may use an external email. Other roles must use @${this.officialEmailDomain}.`;
                        await signOut(auth);
                        return;
                    }
                    this.userProfile = { name, email: firebaseUser.email, role, uid: firebaseUser.uid, photo, mustChangePassword };
                    this.resetAllForms();
                    this.isLoggedIn = true;
                    if (mustChangePassword) { this.currentTab = 'profile'; this.changePasswordModal.required = true; this.changePasswordModal.show = true; }
                    await this.initFirebaseRealtime();
                    await this.startPresenceTracking();
                    this.loginLoading = false;
                    this.refreshDashboardCharts();
                } catch (e) {
                    console.error("Error fetching user metadata:", e);
                    this.isLoggedIn = false;
                    this.loginLoading = false;
                }
            } else {
                this.stopPresenceTracking();
                this.isLoggedIn = false;
                this.loginLoading = false;
                this.destroyDashboardCharts();
                this.portalDataReady = false;
                this.portalDataReadyPromise = null;
                this.userProfile = { name: '', email: '', role: '', photo: '' };
                this.unsubscribers.forEach(unsub => unsub && unsub());
                this.unsubscribers = [];
            }
            this.authLoading = false;
        });
    },
    unmounted() {
        if (this.isLoggedIn) this.setCurrentEmployeePresence(false);
        this.stopPresenceTracking();
        this.unsubscribers.forEach(unsub => unsub && unsub());
        if (this.browserBackHandler) window.removeEventListener('popstate', this.browserBackHandler);
    }
}).mount('#app');
