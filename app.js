// ============================================================
// ZENQOR TECHNOLOGIES - app.js (ENTERPRISE FINAL BUILD v6.5)
// ============================================================

import {
    db,
    auth,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
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
    'Superadmin': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'client-portal', 'audit-logs', 'settings', 'profile'],
    'HR': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'profile'],
    'Account': ['dashboard', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'profile'],
    'IT': ['dashboard', 'hr-employees', 'audit-logs', 'settings'],
    'Client': ['dashboard', 'client-portal', 'profile'],
    'Staff': ['dashboard', 'claims', 'client-portal', 'profile']
};

createApp({
    data() {
        return {
            isLoggedIn: false,
            authLoading: true,
            showPassword: false,
            loginForm: { 
                email: '', 
                password: '', 
                rememberMe: false
            },
            loginError: '',
            currentTab: 'dashboard',
            mobileMenuOpen: false,
            desktopSidebarOpen: false,
            chartTimeFilter: 'monthly',
            sortOption: 'latest',
            isDarkMode: true,
            searchQuery: '',
            currentPage: 1,
            itemsPerPage: 5,
            notification: { show: false, message: '' },

            activePrintModule: null,
            unsubscribers: [],
            revenueChartInstance: null,
            statusChartInstance: null,

            changePasswordModal: {
                show: false,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
                error: '',
                loading: false
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

            docHistory: [],
            payslipHistory: [],
            claimsHistory: [],
            employees: [],
            customers: [],
            users: [],
            auditLogs: [],

            editingDocId: null,
            editingPayId: null,
            editingClaimId: null,

            employeeModal: {
                show: false,
                isEdit: false,
                form: {
                    empNo: 'ZEN-', name: '', email: '', ic: '', dept: '', position: '', status: 'Aktif',
                    epfNo: '', socsoNo: '', eisNo: '', taxNo: '', bankAcc: '', isSenior: false,
                    joinDate: '', basicSalary: 0, allowance: 0, deduction: 0
                }
            },

            officialEmailDomain: 'zenq0r.com',

            userModal: {
                show: false,
                isEdit: false,
                form: { name: '', email: '', password: '', role: 'Staff' }
            },

            claimSubCategories: {
                'Perubatan (Medical)': [
                    'Rawatan Klinik / Hospital',
                    'Ubat-ubatan (Preskripsi)',
                    'Pemeriksaan Gigi & Mata'
                ],
                'Perjalanan & Pengangkutan': [
                    'Tuntutan Mileage (Kilometer)',
                    'Tol & Parkir',
                    'Grab / E-Hailing / Teksi',
                    'Penginapan Hotel'
                ],
                'Keraian & Pelanggan': [
                    'Belanja Makan Pelanggan',
                    'Jamuan Jabatan / Syarikat'
                ],
                'Lain-Lain (Miscellaneous)': [
                    'Alat Tulis & Pejabat',
                    'Elaun Komunikasi / Telefon',
                    'Kurier & Pos'
                ]
            },

            docForm: {
                type: 'Invoice',
                docNo: 'INV-2026-01001',
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
                name: '',
                ic: '',
                empNo: '',
                empEmail: '',
                position: '',
                dept: '',
                isSenior: false,
                joinDate: '',
                bankAcc: '',
                epfSocso: '',
                month: new Date().toISOString().slice(0, 7),
                payDate: new Date().toISOString().slice(0, 10),
                basic: 0,
                ot: 0,
                phone: 0,
                transport: 0,
                meal: 0,
                bonus: 0,
                dedEpf: 0,
                dedSocso: 0,
                dedEis: 0,
                dedPcb: 0,
                dedAdvance: 0,
                dedOther: 0
            },

            claimForm: {
                name: '',
                empNo: '',
                empEmail: '',
                dept: '',
                expenseDate: new Date().toISOString().substr(0, 10),
                category: 'Perubatan (Medical)',
                subCategory: 'Rawatan Klinik / Hospital',
                amount: 0,
                receiptNo: '',
                description: '',
                receiptAttachment: '',
                status: 'Pending'
            },

            payCalc: { gross: 0, deduct: 0, net: 0, epfEmpr: 0, socsoEmpr: 0, eisEmpr: 0 }
        };
    },
    computed: {
        canCreateEdit() { return ['Superadmin', 'HR'].includes(this.userProfile.role); },
        canEditDocs() { return ['Superadmin', 'HR', 'Account'].includes(this.userProfile.role); },
        canDelete() { return ['Superadmin', 'HR'].includes(this.userProfile.role); },
        canManageRBAC() { return ['Superadmin', 'HR'].includes(this.userProfile.role); },

        myPayslips() {
            return this.payslipHistory.filter(p => p.raw && (p.raw.empEmail === this.userProfile.email || p.name === this.userProfile.name));
        },
        myLatestNetSalary() {
            if (this.myPayslips.length === 0) return 0;
            const sorted = [...this.myPayslips].sort((a, b) => new Date(b.date) - new Date(a.date));
            return Number(sorted[0].amount) || 0;
        },
        myClaims() {
            return this.claimsHistory.filter(c => c.empEmail === this.userProfile.email || c.name === this.userProfile.name);
        },
        myPendingClaimsCount() {
            return this.myClaims.filter(c => c.status === 'Pending').length;
        },
        myApprovedClaimsAmount() {
            return this.myClaims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        },

        myClientDocs() {
            return this.docHistory.filter(d => d.raw && d.raw.clientEmail === this.userProfile.email);
        },
        myUnpaidInvoicesCount() {
            return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status !== 'Paid').length;
        },
        myUnpaidInvoicesAmount() {
            return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status !== 'Paid').reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        },
        myPaidInvoicesAmount() {
            return this.myClientDocs.filter(d => d.type === 'Invoice' && d.status === 'Paid').reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        },

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

        clientPortalDocs() {
            if (this.userProfile.role === 'Client' || this.userProfile.role === 'Staff') {
                return this.docHistory.filter(d => d.raw && d.raw.clientEmail === this.userProfile.email);
            }
            return this.docHistory;
        },

        filteredRecentActivities() {
            const combined = [
                ...this.docHistory.map(d => ({ ...d, tagClass: d.type === 'Invoice' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', isDoc: true })),
                ...this.payslipHistory.map(p => ({ ...p, tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', isPay: true })),
                ...this.claimsHistory.map(c => ({ ...c, tagClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', isClaim: true, docNo: c.receiptNo, amount: c.amount, date: c.expenseDate }))
            ];

            const typePriority = { 'Payslip': 1, 'Quotation': 2, 'Invoice': 3, 'Claim': 4 };

            let list = combined.sort((a, b) => {
                if (this.sortOption === 'latest') {
                    return new Date(b.date) - new Date(a.date);
                } else if (this.sortOption === 'oldest') {
                    return new Date(a.date) - new Date(b.date);
                } else if (this.sortOption === 'module') {
                    const priorityA = typePriority[a.type] || 99;
                    const priorityB = typePriority[b.type] || 99;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    return new Date(b.date) - new Date(a.date);
                } else if (this.sortOption === 'amount_high') {
                    return (Number(b.amount) || 0) - (Number(a.amount) || 0);
                } else if (this.sortOption === 'amount_low') {
                    return (Number(a.amount) || 0) - (Number(b.amount) || 0);
                }
                return new Date(b.date) - new Date(a.date);
            });

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(c =>
                    (c.docNo && c.docNo.toLowerCase().includes(q)) ||
                    (c.name && c.name.toLowerCase().includes(q)) ||
                    (c.type && c.type.toLowerCase().includes(q)) ||
                    (c.raw && c.raw.clientSSM && c.raw.clientSSM.toLowerCase().includes(q)) ||
                    (c.raw && c.raw.ic && c.raw.ic.toLowerCase().includes(q))
                );
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
        generateRandomPassword(length = 8) {
            const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const lowercase = "abcdefghijklmnopqrstuvwxyz";
            const numbers = "0123456789";
            const symbols = "!@#$%^&*";
            const allChars = uppercase + lowercase + numbers + symbols;
            let pwd = "";
            for (let i = 0; i < length; i++) {
                pwd += allChars.charAt(Math.floor(Math.random() * allChars.length));
            }
            return pwd;
        },

        resetAllForms() {
            this.docForm = {
                type: 'Invoice',
                docNo: '',
                status: 'Unpaid',
                paymentMethod: 'Bank Transfer (EFT)',
                paymentBank: '',
                paymentReceiver: '',
                paymentRefNo: '',
                paymentAttachment: '',
                date: new Date().toISOString().substr(0, 10),
                dueDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().substr(0, 10),
                clientName: '', clientPhone: '', clientSSM: '', clientAddress: '',
                clientCity: '', clientState: '', clientPostcode: '', clientCountry: 'Malaysia',
                clientEmail: '', clientContactPerson: '', clientPosition: '',
                items: [{ desc: '', qty: 1, price: 0 }],
                discount: 0
            };
            this.payForm = {
                name: '', ic: '', empNo: '', empEmail: '',
                position: '', dept: '', isSenior: false,
                joinDate: '', bankAcc: '', epfSocso: '',
                month: new Date().toISOString().slice(0, 7),
                payDate: new Date().toISOString().slice(0, 10),
                basic: 0, ot: 0, phone: 0, transport: 0, meal: 0, bonus: 0,
                dedEpf: 0, dedSocso: 0, dedEis: 0, dedPcb: 0, dedAdvance: 0, dedOther: 0
            };
            this.claimForm = {
                name: '', empNo: '', empEmail: '', dept: '',
                expenseDate: new Date().toISOString().substr(0, 10),
                category: 'Perubatan (Medical)',
                subCategory: 'Rawatan Klinik / Hospital',
                amount: 0, receiptNo: '', description: '',
                receiptAttachment: '', status: 'Pending'
            };
            this.editingDocId = null;
            this.editingPayId = null;
            this.editingClaimId = null;
            this.autoCalculatePayroll();
            this.generateDocNo();
        },

        isOfficialEmail(email) {
            if (!email) return false;
            const domain = '@' + this.officialEmailDomain;
            return email.toLowerCase().trim().endsWith(domain.toLowerCase());
        },
        handleAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                alert("Attachment size exceeds 2MB limit. Please choose a smaller file.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                this.docForm.paymentAttachment = uploadEvent.target.result;
                this.showNotify(`Receipt attachment "${file.name}" ready for upload.`);
            };
            reader.readAsDataURL(file);
        },
        handleClaimAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                alert("Attachment size exceeds 2MB limit. Please choose a smaller file.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                this.claimForm.receiptAttachment = uploadEvent.target.result;
                this.showNotify(`Receipt attachment "${file.name}" ready for upload.`);
            };
            reader.readAsDataURL(file);
        },
        clearAllDocItems() {
            if (confirm("Are you sure you want to clear all product/service items?")) {
                this.docForm.items = [{ desc: '', qty: 1, price: 0 }];
                this.showNotify("All items cleared successfully.");
            }
        },
        resetDocForm() {
            if (confirm("Are you sure you want to clear the entire document form?")) {
                this.resetAllForms();
                this.showNotify("Document form cleared successfully.");
            }
        },
        resetPayForm() {
            if (confirm("Are you sure you want to clear the entire payslip form?")) {
                this.editingPayId = null;
                this.payForm = {
                    name: '', ic: '', empNo: '', empEmail: '',
                    position: '', dept: '', isSenior: false,
                    joinDate: '', bankAcc: '', epfSocso: '',
                    month: new Date().toISOString().slice(0, 7),
                    payDate: new Date().toISOString().slice(0, 10),
                    basic: 0, ot: 0, phone: 0, transport: 0, meal: 0, bonus: 0,
                    dedEpf: 0, dedSocso: 0, dedEis: 0, dedPcb: 0, dedAdvance: 0, dedOther: 0
                };
                this.autoCalculatePayroll();
                this.showNotify("Payslip form cleared successfully.");
            }
        },
        resetClaimForm() {
            this.claimForm = {
                name: '', empNo: '', empEmail: '', dept: '',
                expenseDate: new Date().toISOString().substr(0, 10),
                category: 'Perubatan (Medical)',
                subCategory: 'Rawatan Klinik / Hospital',
                amount: 0, receiptNo: '', description: '',
                receiptAttachment: '', status: 'Pending'
            };
            this.editingClaimId = null;
        },

        maskIC(val) {
            if (!val) return '-';
            if (['Superadmin', 'HR'].includes(this.userProfile.role)) return val;
            const str = String(val).trim();
            if (str.length >= 8) return '******-**-' + str.slice(-4);
            return '********';
        },
        maskBank(val) {
            if (!val) return '-';
            if (['Superadmin', 'HR'].includes(this.userProfile.role)) return val;
            const parts = String(val).split('/');
            if (parts.length > 1) {
                return `${parts[0].trim()} / *******${parts[1].trim().slice(-4)}`;
            }
            return '*******' + String(val).slice(-4);
        },

        hasAccess(moduleName) {
            const allowedModules = RBAC_ROLES[this.userProfile.role] || ['dashboard'];
            return allowedModules.includes(moduleName);
        },
        formatCurrency(val) {
            return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(val || 0);
        },
        showNotify(msg) {
            this.notification = { show: true, message: msg };
            setTimeout(() => { this.notification.show = false; }, 3500);
        },

        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            localStorage.setItem('zenqor_theme', this.isDarkMode ? 'dark' : 'light');
            this.applyThemeClass();
            this.$nextTick(() => { this.renderCharts(); });
            this.showNotify(`Theme switched to: ${this.isDarkMode ? 'Corporate Dark Mode' : 'Light Mode'}`);
        },
        applyThemeClass() {
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },

        toggleSidebar() {
            if (window.innerWidth < 768) {
                this.mobileMenuOpen = !this.mobileMenuOpen;
            } else {
                this.desktopSidebarOpen = !this.desktopSidebarOpen;
            }
        },
        switchTab(tabName) {
            if (!this.hasAccess(tabName)) {
                this.showNotify('Access Denied: Your role does not permit access to this module.');
                return;
            }
            this.currentTab = tabName;
            this.mobileMenuOpen = false;
            if (tabName === 'dashboard') {
                this.$nextTick(() => { this.renderCharts(); });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        setChartFilter(timeframe) {
            this.chartTimeFilter = timeframe;
            this.renderCharts();
            this.showNotify(`Chart view changed to: ${timeframe.toUpperCase()}`);
        },
        logAudit(action, details) {
            const newLog = {
                id: String(Date.now()),
                timestamp: new Date().toLocaleString('en-US'),
                user: this.userProfile.email,
                action: action,
                details: details,
                browser: navigator.userAgent.substring(0, 80)
            };
            setDoc(doc(db, "audit_logs", newLog.id), newLog).catch(e => console.error(e));
        },

        downloadPDFDirect(elementId, filename) {
            const element = document.getElementById(elementId);
            if (!element) { alert("Target element not found for PDF generation."); return; }
            this.showNotify("Direct PDF generation in progress...");
            const opt = {
                margin: 5,
                filename: filename + '.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: elementId === 'print-template-payslip' ? 'landscape' : 'portrait' }
            };
            if (typeof html2pdf !== 'undefined') {
                html2pdf().set(opt).from(element).save().then(() => {
                    this.showNotify("PDF file " + filename + ".pdf downloaded successfully!");
                }).catch(err => { console.error("PDF error:", err); window.print(); });
            } else {
                window.print();
            }
        },

        async handleForgotPassword() {
            if (!this.loginForm.email) {
                alert("Please enter your official sign-in email address first.");
                return;
            }
            try {
                const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                await sendPasswordResetEmail(auth, this.loginForm.email);
                this.showNotify(`Password reset link sent to: ${this.loginForm.email}`);
            } catch (error) {
                console.error("Forgot Password Error:", error);
                alert("Failed to send password reset email. Ensure the email is valid and registered.");
            }
        },

        async handleLogin() {
            this.loginError = '';

            if (!this.isOfficialEmail(this.loginForm.email)) {
                this.loginError = `Email must use the official domain (@${this.officialEmailDomain}).`;
                return;
            }

            try {
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    this.loginForm.email,
                    this.loginForm.password
                );
                const firebaseUser = userCredential.user;

                const userDocRef = doc(db, "users", firebaseUser.email);
                const userSnap = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
                    .then(m => m.getDoc(userDocRef));

                let role = 'Staff';
                let name = firebaseUser.displayName || firebaseUser.email;
                let photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;

                if (userSnap.exists()) {
                    role = userSnap.data().role || 'Staff';
                    name = userSnap.data().name || name;
                    photo = userSnap.data().photo || photo;
                }

                if (firebaseUser.email === 'admin@zenq0r.com') {
                    role = 'Superadmin';
                }

                this.userProfile = {
                    name: name,
                    email: firebaseUser.email,
                    role: role,
                    uid: firebaseUser.uid,
                    photo: photo
                };

                if (this.loginForm.rememberMe) {
                    localStorage.setItem('zenqor_remember_email', this.loginForm.email);
                } else {
                    localStorage.removeItem('zenqor_remember_email');
                }

                this.resetAllForms();
                this.isLoggedIn = true;
                this.desktopSidebarOpen = false;
                this.mobileMenuOpen = false;
                localStorage.setItem('zenqor_theme', this.isDarkMode ? 'dark' : 'light');
                this.logAudit('LOGIN', `User logged in with role ${role}`);
                this.showNotify(`Welcome back (${role}): ${name}`);
                this.currentTab = 'dashboard';
                this.$nextTick(() => { this.renderCharts(); });

            } catch (error) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    this.loginError = 'Invalid email or password credentials!';
                } else if (error.code === 'auth/too-many-requests') {
                    this.loginError = 'Too many failed sign-in attempts. Try again later.';
                } else if (error.code === 'auth/user-disabled') {
                    this.loginError = 'This account has been disabled. Contact Superadmin.';
                } else {
                    this.loginError = 'System error. Please try again later.';
                    console.error("Auth error:", error.code);
                }
            }
        },

        async handleLogout() {
            try {
                this.logAudit('LOGOUT', 'User logged out');
                await signOut(auth);
                this.isLoggedIn = false;
                this.userProfile = { name: '', email: '', role: '', photo: '' };
                this.resetAllForms();
                this.currentTab = 'dashboard';
                this.loginForm = { email: '', password: '', rememberMe: false };
                this.searchQuery = '';
            } catch (error) {
                console.error("Logout error:", error);
            }
        },

        async handleChangePassword() {
            this.changePasswordModal.error = '';
            const { currentPassword, newPassword, confirmPassword } = this.changePasswordModal;

            if (newPassword !== confirmPassword) {
                this.changePasswordModal.error = 'New passwords do not match.';
                return;
            }
            if (newPassword.length < 8) {
                this.changePasswordModal.error = 'New password must be at least 8 characters long.';
                return;
            }

            this.changePasswordModal.loading = true;
            try {
                const user = auth.currentUser;
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                this.changePasswordModal.show = false;
                this.changePasswordModal.currentPassword = '';
                this.changePasswordModal.newPassword = '';
                this.changePasswordModal.confirmPassword = '';
                this.logAudit('UPDATE', 'User changed their password');
                this.showNotify('Password updated successfully!');
            } catch (error) {
                if (error.code === 'auth/wrong-password') {
                    this.changePasswordModal.error = 'Current password is incorrect.';
                } else {
                    this.changePasswordModal.error = 'System error: ' + error.message;
                }
            } finally {
                this.changePasswordModal.loading = false;
            }
        },

        async saveMyProfile() {
            try {
                if (!this.userProfile.email) return;
                const userRef = doc(db, "users", this.userProfile.email);
                await setDoc(userRef, {
                    name: this.userProfile.name,
                    email: this.userProfile.email,
                    role: this.userProfile.role,
                    photo: this.userProfile.photo
                }, { merge: true });
                this.logAudit('UPDATE', `User updated own profile: ${this.userProfile.email}`);
                this.showNotify('Your profile has been updated successfully!');
            } catch (error) {
                console.error("Profile save error:", error);
                this.showNotify('Error updating profile.');
            }
        },

        openUserAccessModal(usr = null) {
            if (usr) {
                this.userModal.isEdit = true;
                this.userModal.form = { 
                    name: usr.name || '', 
                    email: usr.email || '', 
                    password: usr.password || '',
                    role: usr.role || 'Staff' 
                };
            } else {
                this.userModal.isEdit = false;
                this.userModal.form = { 
                    name: '', 
                    email: '', 
                    password: this.generateRandomPassword(8), 
                    role: 'Staff' 
                };
            }
            this.userModal.show = true;
        },

        sendWelcomeEmail(userForm) {
            const originEmail = "admin@zenq0r.com";
            const recipientEmail = userForm.email;
            const subject = encodeURIComponent(`[ZENQOR ENTERPRISE] Official Account & Portal Access Information (${userForm.role})`);
            
            const emailBody = encodeURIComponent(
`Greetings ${userForm.name},

Your user account for the ZENQOR TECHNOLOGIES Enterprise Portal v2.0 has been created and activated.

--------------------------------------------------
PORTAL SIGN-IN CREDENTIALS:
--------------------------------------------------
• Sign-In Email   : ${userForm.email}
• Assigned Role   : ${userForm.role}
• Password        : ${userForm.password}
• Portal Link     : https://hrms-portal.zenq0r.com
--------------------------------------------------

SECURITY ADVISORY / WAJIB UBAH KATA LALUAN:
You MUST log in and change your password immediately under the 'Profile & RBAC' section for account security.

Best regards,

Enterprise System Administrator
ZENQOR TECHNOLOGIES
Sender Reference: ${originEmail}`
            );

            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${subject}&body=${emailBody}`;
            window.open(gmailUrl, '_blank');
            this.showNotify(`Google Gmail compose window opened for ${recipientEmail}.`);
        },

        async savePortalUser() {
            try {
                if (!this.userModal.form.name || !this.userModal.form.email || !this.userModal.form.password) {
                    alert("Please fill out all required fields including Password.");
                    return;
                }
                if (!this.isOfficialEmail(this.userModal.form.email)) {
                    alert(`Email must use the official domain (@${this.officialEmailDomain}).`);
                    return;
                }

                const isNewUser = !this.userModal.isEdit;
                const email = this.userModal.form.email.trim();
                const password = this.userModal.form.password.trim();
                const userRef = doc(db, "users", email);
                const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userModal.form.name)}&background=0B1E36&color=D4AF37`;
                
                try {
                    await deleteDoc(userRef);
                } catch (delErr) {
                    // Abaikan jika dokumen belum wujud
                }

                if (isNewUser) {
                    try {
                        const { initializeApp, deleteApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
                        const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                        
                        const secondaryApp = initializeApp(auth.app.options, "SecondaryAuthApp-" + Date.now());
                        const secondaryAuth = getAuth(secondaryApp);
                        
                        await createUserWithEmailAndPassword(secondaryAuth, email, password);
                        await signOutSecondary(secondaryAuth);
                        await deleteApp(secondaryApp);
                    } catch (authErr) {
                        if (authErr.code === 'auth/email-already-in-use') {
                            console.log("Emel sudah wujud dalam Firebase Authentication. Meneruskan penyimpanan ke Firestore...");
                        } else {
                            alert("Gagal mendaftar ke Firebase Authentication: " + authErr.message);
                            return;
                        }
                    }
                }

                await setDoc(userRef, {
                    email: email,
                    name: this.userModal.form.name,
                    password: password,
                    photo: photoUrl,
                    role: this.userModal.form.role
                });

                this.userModal.show = false;
                this.logAudit(isNewUser ? 'CREATE' : 'UPDATE', `User role/metadata for ${email} by ${this.userProfile.email}`);
                
                if (isNewUser) {
                    this.sendWelcomeEmail(this.userModal.form);
                    this.showNotify('Akaun berjaya dicipta dalam Authentication & Firestore!');
                } else {
                    this.showNotify('User information updated successfully!');
                }
            } catch (error) {
                console.error("User save error:", error);
                alert("An error occurred while saving user information.");
            }
        },

        async deletePortalUser(email) {
            if (confirm(`Are you sure you want to delete portal access for email: ${email}?`)) {
                try {
                    await deleteDoc(doc(db, "users", email));
                    this.logAudit('DELETE', `Deleted user metadata for ${email}`);
                    this.showNotify('User record deleted. Please also disable the account in Firebase Console.');
                } catch (error) {
                    console.error("User delete error:", error);
                }
            }
        },

        backupDatabase() {
            const data = {
                company: this.company,
                employees: this.employees,
                customers: this.customers,
                docHistory: this.docHistory,
                payslipHistory: this.payslipHistory,
                claimsHistory: this.claimsHistory,
                users: this.users.map(u => ({ name: u.name, email: u.email, role: u.role })),
                exportDate: new Date().toISOString()
            };
            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", jsonStr);
            dlAnchorElem.setAttribute("download", `zenqor_backup_${new Date().toISOString().substr(0,10)}.json`);
            dlAnchorElem.click();
            this.logAudit('BACKUP', 'Exported full JSON system backup');
            this.showNotify("Database JSON backup downloaded successfully!");
        },

        async saveSettings() {
            try {
                await setDoc(doc(db, "settings", "company_profile"), { ...this.company });
                this.logAudit('UPDATE', 'Updated company profile settings');
                this.showNotify('Company profile settings updated successfully!');
            } catch (error) {
                console.error("Settings save error:", error);
            }
        },

        selectCustomerForDoc(e) {
            const name = e.target.value;
            const cust = this.customers.find(c => c.clientName === name);
            if (cust) {
                Object.keys(cust).forEach(k => { if (this.docForm.hasOwnProperty(k)) this.docForm[k] = cust[k]; });
                this.showNotify(`Client info for ${cust.clientName} loaded.`);
            }
        },
        async saveCustomerToDatabase() {
            if (!this.docForm.clientName || !this.docForm.clientPhone || !this.docForm.clientAddress) {
                return alert('Please enter Client Name, Phone Number, and Full Address.');
            }
            try {
                const docId = this.docForm.clientName.trim().replace(/\s+/g, '_').toLowerCase();
                const newCust = {
                    clientName: this.docForm.clientName, clientPhone: this.docForm.clientPhone,
                    clientSSM: this.docForm.clientSSM, clientAddress: this.docForm.clientAddress,
                    clientCity: this.docForm.clientCity, clientState: this.docForm.clientState,
                    clientPostcode: this.docForm.clientPostcode, clientCountry: this.docForm.clientCountry,
                    clientEmail: this.docForm.clientEmail, clientContactPerson: this.docForm.clientContactPerson,
                    clientPosition: this.docForm.clientPosition
                };
                await setDoc(doc(db, "customers", docId), newCust);
                this.logAudit('CREATE', `Saved customer ${this.docForm.clientName}`);
                this.showNotify('Client information saved to Firebase successfully!');
            } catch (error) {
                console.error("Client save error:", error);
            }
        },
        selectCustomerFromTable(cust) {
            ['clientName','clientPhone','clientSSM','clientAddress','clientCity','clientState','clientPostcode','clientCountry','clientEmail','clientContactPerson','clientPosition'].forEach(k => {
                this.docForm[k] = cust[k] || (k === 'clientCountry' ? 'Malaysia' : '');
            });
            this.showNotify(`Client ${cust.clientName} loaded.`);
        },
        editCustomer(cust) {
            this.selectCustomerFromTable(cust);
            this.currentTab = 'doc-generator';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        async deleteCustomer(clientName) {
            if (confirm(`Are you sure you want to delete client (${clientName})?`)) {
                try {
                    const docId = clientName.trim().replace(/\s+/g, '_').toLowerCase();
                    await deleteDoc(doc(db, "customers", docId));
                    this.logAudit('DELETE', `Deleted customer ${clientName}`);
                    this.showNotify('Client deleted successfully.');
                } catch (error) {
                    console.error("Client delete error:", error);
                }
            }
        },

        openEmployeeModal(emp = null) {
            if (emp) {
                this.employeeModal.isEdit = true;
                this.employeeModal.form = JSON.parse(JSON.stringify(emp));
            } else {
                this.employeeModal.isEdit = false;
                this.employeeModal.form = {
                    empNo: 'ZEN-HR' + String(Math.floor(1000 + Math.random() * 9000)),
                    name: '', email: '', ic: '', dept: 'Software Engineering', position: 'Developer', status: 'Aktif',
                    epfNo: '', socsoNo: '', eisNo: '', taxNo: '', bankAcc: '', isSenior: false,
                    joinDate: new Date().toISOString().substr(0, 10), basicSalary: 3500, allowance: 300, deduction: 0
                };
            }
            this.employeeModal.show = true;
        },
        async saveEmployee() {
            try {
                if (!this.employeeModal.form.empNo || !this.employeeModal.form.name || !this.employeeModal.form.ic) {
                    alert("Please enter Employee ID, Name, and National ID/Passport.");
                    return;
                }
                const docId = this.employeeModal.form.empNo.trim();
                await setDoc(doc(db, "employees", docId), { ...this.employeeModal.form });
                this.employeeModal.show = false;
                this.logAudit(this.employeeModal.isEdit ? 'UPDATE' : 'CREATE', `Saved employee ${this.employeeModal.form.empNo}`);
                this.showNotify('Employee data saved successfully!');
            } catch (error) {
                console.error("Employee save error:", error);
            }
        },
        async deleteEmployee(empNo) {
            if (confirm(`Are you sure you want to delete employee ID: ${empNo}?`)) {
                try {
                    await deleteDoc(doc(db, "employees", empNo));
                    this.logAudit('DELETE', `Deleted employee ${empNo}`);
                    this.showNotify('Employee deleted successfully.');
                } catch (error) {
                    console.error("Employee delete error:", error);
                }
            }
        },
        selectEmployeeFromTable(emp) {
            this.payForm.empNo = emp.empNo || '';
            this.payForm.name = emp.name || '';
            this.payForm.empEmail = emp.email || '';
            this.payForm.ic = emp.ic || '';
            this.payForm.dept = emp.dept || '';
            this.payForm.position = emp.position || '';
            this.payForm.joinDate = emp.joinDate || '';
            this.payForm.bankAcc = emp.bankAcc || '';
            this.payForm.isSenior = !!emp.isSenior;
            this.payForm.epfSocso = `KWSP: ${emp.epfNo || '-'} | PERKESO: ${emp.socsoNo || '-'}`;
            this.payForm.basic = emp.basicSalary || 0;
            this.autoCalculatePayroll();
            this.showNotify(`Employee ${emp.name} loaded into Payslip.`);
        },
        selectEmployeeForPayslip(e) {
            const emp = this.employees.find(x => x.empNo === e.target.value);
            if (emp) this.selectEmployeeFromTable(emp);
        },

        selectEmployeeForClaim(e) {
            const emp = this.employees.find(x => x.empNo === e.target.value);
            if (emp) {
                this.claimForm.name = emp.name || '';
                this.claimForm.empNo = emp.empNo || '';
                this.claimForm.empEmail = emp.email || '';
                this.claimForm.dept = emp.dept || '';
                this.showNotify(`Applicant info for ${emp.name} loaded.`);
            }
        },
        async saveClaimRecord() {
            if (!this.claimForm.name || !this.claimForm.empNo || !this.claimForm.amount || !this.claimForm.receiptNo) {
                alert("Please enter Name, Employee ID, Amount (RM), and Receipt No.");
                return;
            }
            try {
                const claimId = String(this.editingClaimId || Date.now());
                const payload = {
                    id: claimId,
                    type: 'Claim',
                    date: this.claimForm.expenseDate,
                    expenseDate: this.claimForm.expenseDate,
                    name: this.claimForm.name,
                    empNo: this.claimForm.empNo,
                    empEmail: this.claimForm.empEmail || this.userProfile.email,
                    dept: this.claimForm.dept,
                    category: this.claimForm.category,
                    subCategory: this.claimForm.subCategory,
                    amount: Number(this.claimForm.amount),
                    receiptNo: this.claimForm.receiptNo,
                    description: this.claimForm.description,
                    receiptAttachment: this.claimForm.receiptAttachment,
                    status: this.claimForm.status || 'Pending'
                };
                await setDoc(doc(db, "claims", claimId), payload);
                this.logAudit(this.editingClaimId ? 'UPDATE' : 'CREATE', `Saved claim ${this.claimForm.receiptNo} for ${this.claimForm.name}`);
                this.editingClaimId = null;
                this.showNotify(`Claim (${this.claimForm.receiptNo}) submitted successfully.`);
                this.resetClaimForm();
            } catch (error) {
                console.error("Claim save error:", error);
            }
        },
        async updateClaimStatus(claimId, newStatus) {
            try {
                await updateDoc(doc(db, "claims", claimId), { status: newStatus });
                this.logAudit('UPDATE', `Updated claim ${claimId} status to ${newStatus}`);
                this.showNotify(`Claim status updated to: ${newStatus}`);
            } catch (error) {
                console.error("Claim status update error:", error);
            }
        },
        editClaimRecord(clm) {
            this.editingClaimId = clm.id;
            this.claimForm = JSON.parse(JSON.stringify(clm));
            this.currentTab = 'claims';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        cancelEditClaim() {
            this.editingClaimId = null;
            this.resetClaimForm();
        },
        async deleteClaimRecord(claimId) {
            if (confirm("Are you sure you want to delete this claim record?")) {
                try {
                    await deleteDoc(doc(db, "claims", claimId));
                    this.logAudit('DELETE', `Deleted claim ${claimId}`);
                    this.showNotify("Claim record deleted successfully.");
                } catch (error) {
                    console.error("Claim delete error:", error);
                }
            }
        },

        setPrintOrientation(orientation, margin) {
            const styleEl = document.getElementById('dynamic-print-orientation');
            if (styleEl) {
                styleEl.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: ${margin} !important; } }`;
            }
        },
        async printDocumentModule() {
            if (!this.docForm.clientName) return alert('Please enter client name.');
            const isSaved = await this.saveDocRecord();
            if (!isSaved) return;
            this.activePrintModule = this.docForm.type === 'Quotation' ? 'QUOTATION' : 'INVOICE';
            this.setPrintOrientation('portrait', '15mm');
            setTimeout(() => { window.print(); }, 250);
        },
        async printPayslipModule() {
            if (!this.payForm.name || !this.payForm.empNo) return alert('Please enter Name and Employee ID.');
            this.autoCalculatePayroll();
            this.activePrintModule = 'PAYSLIP';
            this.setPrintOrientation('landscape', '0mm');
            await this.savePayslipRecord();
            setTimeout(() => { window.print(); }, 250);
        },
        async saveDocRecord() {
            try {
                if (['Paid', 'Selesai Dibayar / Paid', 'Partial', 'Bayaran Separa / Partial', 'Selesai Dibayar'].includes(this.docForm.status)) {
                    if (!this.docForm.paymentRefNo || this.docForm.paymentRefNo.trim() === '') {
                        alert("ATTENTION: Payment Reference No. is REQUIRED when status is Paid.");
                        return false;
                    }
                }

                const docId = String(this.editingDocId || Date.now());
                const payload = {
                    id: docId, 
                    type: this.docForm.type, 
                    docNo: this.docForm.docNo,
                    status: this.docForm.status || (this.docForm.type === 'Invoice' ? 'Unpaid' : 'Open'),
                    paymentMethod: this.docForm.paymentMethod || 'Bank Transfer',
                    paymentBank: this.docForm.paymentBank || '',
                    paymentReceiver: this.docForm.paymentReceiver || '',
                    paymentRefNo: this.docForm.paymentRefNo || '',
                    paymentAttachment: this.docForm.paymentAttachment || '',
                    date: this.docForm.date,
                    name: this.docForm.clientName, 
                    amount: this.docGrandTotal,
                    raw: JSON.parse(JSON.stringify(this.docForm))
                };
                await setDoc(doc(db, "docs", docId), payload);
                await this.saveCustomerToDatabase();
                this.logAudit(this.editingDocId ? 'UPDATE' : 'CREATE', `Saved document ${this.docForm.docNo}`);
                this.editingDocId = docId;
                this.showNotify(`${this.docForm.type} (${this.docForm.docNo}) saved successfully.`);
                return true;
            } catch (error) {
                console.error("Document save error:", error);
                return false;
            }
        },
        async savePayslipRecord() {
            try {
                const docId = String(this.editingPayId || Date.now());
                const payload = {
                    id: docId, type: 'Payslip',
                    docNo: `PS-2026-${this.payForm.empNo}`,
                    date: this.payForm.payDate, name: this.payForm.name,
                    amount: this.payCalc.net,
                    raw: JSON.parse(JSON.stringify(this.payForm))
                };
                await setDoc(doc(db, "payslips", docId), payload);
                this.logAudit(this.editingPayId ? 'UPDATE' : 'CREATE', `Saved payslip for ${this.payForm.name}`);
                this.editingPayId = null;
                this.showNotify(`Payslip (${this.payForm.name}) saved successfully.`);
            } catch (error) {
                console.error("Payslip save error:", error);
            }
        },
        addDocItem() { this.docForm.items.push({ desc: '', qty: 1, price: 0 }); },
        removeDocItem(idx) { this.docForm.items.splice(idx, 1); },
        generateDocNo() {
            if (this.editingDocId) return;
            const prefix = this.docForm.type === 'Invoice' ? 'INV' : 'QT';
            const relevantDocs = this.docHistory.filter(d => d.type === this.docForm.type);
            let maxNum = 1000;
            relevantDocs.forEach(d => {
                if (d.docNo) {
                    const parts = d.docNo.split('-');
                    const num = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            this.docForm.docNo = `${prefix}-2026-${String(maxNum + 1).padStart(5, '0')}`;
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
            this.payForm.dedEpf = epfEmp;
            this.payForm.dedSocso = socsoEmp;
            this.payForm.dedEis = eisEmp;
            let deduct = epfEmp + socsoEmp + eisEmp + (Number(this.payForm.dedPcb)||0) + (Number(this.payForm.dedAdvance)||0) + (Number(this.payForm.dedOther)||0);
            let net = gross - deduct;
            this.payCalc = { gross, deduct, net, epfEmpr, socsoEmpr, eisEmpr };
        },
        cancelEditPay() { this.editingPayId = null; },
        viewRecord(item) {
            if (item.isDoc && item.raw) {
                this.editingDocId = item.id;
                this.docForm = JSON.parse(JSON.stringify(item.raw));
                this.activePrintModule = item.type === 'Quotation' ? 'QUOTATION' : 'INVOICE';
                this.setPrintOrientation('portrait', '15mm');
                this.currentTab = 'doc-generator';
            } else if (item.isPay && item.raw) {
                this.editingPayId = item.id;
                this.payForm = JSON.parse(JSON.stringify(item.raw));
                this.autoCalculatePayroll();
                this.activePrintModule = 'PAYSLIP';
                this.setPrintOrientation('landscape', '0mm');
                this.currentTab = 'payslip-generator';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showNotify(`Record (${item.docNo}) loaded for view.`);
        },
        editRecord(item) {
            if (item.isDoc) {
                this.editingDocId = item.id;
                if (item.raw) { 
                    this.docForm = JSON.parse(JSON.stringify(item.raw)); 
                    this.docForm.status = item.raw.status || item.status || (item.type === 'Invoice' ? 'Unpaid' : 'Open'); 
                }
                this.currentTab = 'doc-generator';
            } else if (item.isPay) {
                this.editingPayId = item.id;
                if (item.raw) this.payForm = JSON.parse(JSON.stringify(item.raw));
                this.autoCalculatePayroll();
                this.currentTab = 'payslip-generator';
            } else if (item.isClaim) {
                this.editClaimRecord(item);
            }
        },
        async confirmDeleteRecord(item) {
            if (confirm(`WARNING: Delete record (${item.docNo})?`)) {
                try {
                    if (item.isDoc) await deleteDoc(doc(db, "docs", item.id));
                    else if (item.isPay) await deleteDoc(doc(db, "payslips", item.id));
                    else if (item.isClaim) await deleteDoc(doc(db, "claims", item.id));
                    this.logAudit('DELETE', `Deleted record ${item.docNo}`);
                    this.showNotify('Record deleted successfully.');
                } catch (error) {
                    console.error("Record delete error:", error);
                }
            }
        },

        renderCharts() {
            if (typeof Chart === 'undefined' || this.currentTab !== 'dashboard') return;
            if (['Staff', 'Client'].includes(this.userProfile.role)) return;

            this.$nextTick(() => {
                const revCanvas = document.getElementById('revenueChart');
                const statusCanvas = document.getElementById('statusChart');

                if (!revCanvas || !statusCanvas) return;

                const ctxRev = revCanvas.getContext('2d');
                const ctxStatus = statusCanvas.getContext('2d');

                if (!ctxRev || !ctxStatus) return;

                const revData = this.getFilteredRevenueData();
                const gridColor = this.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
                const textColor = this.isDarkMode ? '#CBD5E1' : '#475569';

                if (this.revenueChartInstance) this.revenueChartInstance.destroy();
                this.revenueChartInstance = new Chart(ctxRev, {
                    type: 'line',
                    data: {
                        labels: revData.labels,
                        datasets: [{
                            label: 'Revenue Paid (RM)',
                            data: revData.data,
                            borderColor: '#1E3A8A',
                            backgroundColor: 'rgba(30, 58, 138, 0.15)',
                            borderWidth: 3, fill: true, tension: 0.35,
                            pointRadius: 4, pointBackgroundColor: '#D4AF37'
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: {
                            x: { grid: { color: gridColor }, ticks: { color: textColor } },
                            y: {
                                beginAtZero: true, min: 0,
                                grid: { color: gridColor },
                                ticks: { color: textColor, callback: function(value) { return 'RM ' + value.toLocaleString(); } }
                            }
                        },
                        plugins: { legend: { labels: { color: textColor } } }
                    }
                });

                if (this.statusChartInstance) this.statusChartInstance.destroy();
                this.statusChartInstance = new Chart(ctxStatus, {
                    type: 'doughnut',
                    data: {
                        labels: ['Paid Invoices', 'Unpaid Invoices', 'Quotations'],
                        datasets: [{ data: [this.paidInvoicesCount, this.unpaidInvoicesCount, this.totalQuotations], backgroundColor: ['#10B981', '#EF4444', '#F59E0B'], borderWidth: 2 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
                });
            });
        },

        getFilteredRevenueData() {
            const filter = this.chartTimeFilter;
            const now = new Date();
            let labels = [];
            let revenueData = [];

            if (filter === 'daily') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().substr(0, 10);
                    const dayLabel = d.toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short' });
                    labels.push(dayLabel);
                    let total = 0;
                    this.docHistory.forEach(doc => {
                        if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date === dateStr) {
                            total += (Number(doc.amount) || 0);
                        }
                    });
                    revenueData.push(total);
                }
            } else if (filter === 'weekly') {
                for (let i = 3; i >= 0; i--) {
                    labels.push(`Week ${4 - i}`);
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() - (i * 7));
                    let total = 0;
                    this.docHistory.forEach(doc => {
                        if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) {
                            const docDate = new Date(doc.date);
                            if (docDate >= weekStart && docDate <= weekEnd) total += (Number(doc.amount) || 0);
                        }
                    });
                    revenueData.push(total);
                }
            } else if (filter === 'monthly') {
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                revenueData = new Array(12).fill(0);
                this.docHistory.forEach(doc => {
                    if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) {
                        const docDate = new Date(doc.date);
                        if (!isNaN(docDate.getTime()) && docDate.getFullYear() === now.getFullYear()) {
                            revenueData[docDate.getMonth()] += (Number(doc.amount) || 0);
                        }
                    }
                });
            } else if (filter === 'yearly') {
                const currentYear = now.getFullYear();
                for (let y = currentYear - 4; y <= currentYear; y++) {
                    labels.push(String(y));
                    let total = 0;
                    this.docHistory.forEach(doc => {
                        if (doc.type === 'Invoice' && doc.status === 'Paid' && doc.date) {
                            const docDate = new Date(doc.date);
                            if (docDate.getFullYear() === y) total += (Number(doc.amount) || 0);
                        }
                    });
                    revenueData.push(total);
                }
            }
            return { labels, data: revenueData };
        },

        initFirebaseRealtime() {
            const unsubSettings = onSnapshot(doc(db, "settings", "company_profile"), (snapshot) => {
                if (snapshot.exists()) this.company = snapshot.data();
            });
            const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
                this.employees = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            });
            const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
                this.customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            });
            const unsubDocs = onSnapshot(collection(db, "docs"), (snapshot) => {
                this.docHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                this.generateDocNo();
                this.$nextTick(() => { this.renderCharts(); });
            });
            const unsubPayslips = onSnapshot(collection(db, "payslips"), (snapshot) => {
                this.payslipHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            });
            const unsubClaims = onSnapshot(collection(db, "claims"), (snapshot) => {
                this.claimsHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            });
            const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
                this.users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            });
            const unsubAudit = onSnapshot(collection(db, "audit_logs"), (snapshot) => {
                this.auditLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.id - a.id);
            });
            this.unsubscribers.push(unsubSettings, unsubEmployees, unsubCustomers, unsubDocs, unsubPayslips, unsubClaims, unsubUsers, unsubAudit);
        }
    },
    mounted() {
        this.applyThemeClass();
        this.autoCalculatePayroll();
        this.generateDocNo();

        const savedEmail = localStorage.getItem('zenqor_remember_email');
        if (savedEmail) {
            this.loginForm.email = savedEmail;
            this.loginForm.rememberMe = true;
        }

        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
                    const userSnap = await getDoc(doc(db, "users", firebaseUser.email));
                    let role = 'Staff';
                    let name = firebaseUser.displayName || firebaseUser.email;
                    let photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;

                    if (userSnap.exists()) {
                        role = userSnap.data().role || 'Staff';
                        name = userSnap.data().name || name;
                        photo = userSnap.data().photo || photo;
                    }
                    if (firebaseUser.email === 'admin@zenq0r.com') {
                        role = 'Superadmin';
                    }
                    this.userProfile = {
                        name, email: firebaseUser.email, role,
                        uid: firebaseUser.uid,
                        photo
                    };
                    this.resetAllForms();
                    this.isLoggedIn = true;
                    this.initFirebaseRealtime();
                    this.$nextTick(() => { this.renderCharts(); });
                } catch (e) {
                    console.error("Error fetching user metadata:", e);
                    this.isLoggedIn = false;
                }
            } else {
                this.isLoggedIn = false;
                this.userProfile = { name: '', email: '', role: '', photo: '' };
                this.unsubscribers.forEach(unsub => unsub && unsub());
                this.unsubscribers = [];
            }
            this.authLoading = false;
        });
    },
    unmounted() {
        this.unsubscribers.forEach(unsub => unsub && unsub());
    }
}).mount('#app');