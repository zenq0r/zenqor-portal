// ============================================================
// ZENQOR TECHNOLOGIES - app.js (ENTERPRISE FINAL BUILD v8.7)
// ============================================================

import {
    db,
    auth,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    writeBatch,
    query,
    where,
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
    'Director': ['dashboard', 'project-activities', 'doc-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'client-portal', 'audit-logs', 'settings', 'profile'],
    'Superadmin': ['dashboard', 'project-activities', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'client-portal', 'audit-logs', 'settings', 'profile'],
    'HR': ['dashboard', 'project-activities', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'hr-employees', 'reports', 'profile'],
    'Account': ['dashboard', 'project-activities', 'doc-generator', 'payslip-generator', 'claims', 'client-directory', 'reports', 'profile'],
    'IT': ['dashboard', 'project-activities', 'audit-logs', 'settings', 'profile'],
    'Client': ['dashboard', 'project-activities', 'client-portal', 'profile'],
    'Staff': ['dashboard', 'project-activities', 'claims', 'profile']
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
            claimPreview: { show: false, claim: null, directorApprovalAttachment: '', directorApprovalAttachmentName: '', directorApprovalOriginalBytes: 0 },
            attachmentPreview: { show: false, url: '', label: '' },
            attachmentUploadState: { payment: false, receipt: false, director: false },
            unsubscribers: [],
            portalDataReady: false,
            portalDataReadyPromise: null,
            revenueChartInstance: null,
            statusChartInstance: null,
            chartRenderTimer: null,
            chartRenderFrameOne: null,
            chartRenderFrameTwo: null,
            chartRenderAttempts: 0,
            presenceHeartbeatTimer: null,
            presenceClockTimer: null,
            lastProjectPresenceSyncAt: 0,
            presenceNow: Date.now(),
            presencePageHideHandler: null,
            presencePageShowHandler: null,
            presenceVisibilityHandler: null,
            legacyClaimMigrationRunning: false,

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
            projects: [],
            projectActivities: [],
            projectActivitiesLoaded: false,
            projectClientUpdates: [],
            projectClientUpdatesLoaded: false,
            activityTypes: ['To-Do', 'Document Request', 'Client Follow-Up', 'Government Submission', 'Review', 'Meeting', 'Payment Follow-Up', 'Other'],
            activityModal: { show: false, isEdit: false, activityId: '', project: null, form: { activityType: 'To-Do', summary: '', dueDate: '', assignedEmpNo: '', assignedName: '', assignedEmail: '', assignedPosition: '', details: '' } },
            clientUpdateTypes: ['Progress Update', 'Document Update', 'Government Update', 'Client Action Required', 'Milestone Completed', 'General Notice'],
            clientUpdateModal: { show: false, isEdit: false, updateId: '', original: null, project: null, form: { updateType: 'Progress Update', updateDate: '', message: '' } },
            clientReplyMessage: '',
            editingReplyId: '',
            editingReplyMessage: '',
            projectViewMode: 'board',
            expandedClientGroups: new Set(),
            projectPreview: { show: false, project: null },
            projectStages: ['Project Planning', 'Pending Documentation', 'In Progress', 'Pending By Government', 'Completed & Done'],
            projectModal: {
                show: false,
                isEdit: false,
                form: { id: '', projectRef: '', title: '', clientDirectoryId: '', clientPortalUid: '', clientName: '', clientEmail: '', ownerEmpNo: '', ownerName: '', ownerEmail: '', ownerPosition: '', ownerDepartment: '', ownerAssignedAt: '', ownerPresenceStatus: 'Offline', ownerPresenceUpdatedAt: '', ownerLastSeen: '', status: 'Project Planning', startDate: '', targetDate: '', description: '' }
            },
            employees: [],
            customers: [],
            users: [],
            auditLogs: [],

            editingDocId: null,
            clientSavedForDocument: false,
            editingPayId: null,
            editingClaimId: null,
            selectedPayEmployeeId: '',
            selectedClaimEmployeeId: '',

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
                'Remuneration and Services': [
                    'Casual Wages / Daily Pay',
                    'Freelance / Professional Fee',
                    'Contractor Payment',
                    'Allowance / Honorarium',
                    'Vendor / Supplier Payment',
                    'Temporary Staff Payment'
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
                documentType: 'Claim', name: '', empNo: '', empEmail: '', position: '', dept: '',
                expenseDate: new Date().toISOString().substr(0, 10),
                category: 'Medical', subCategory: 'Clinic / Hospital Treatment',
                payeeName: '', payeeType: 'Individual', payeeReference: '', paymentPurpose: '',
                amount: 0, receiptNo: '', description: '', receiptAttachment: '', receiptAttachmentName: '', receiptAttachmentOriginalBytes: 0, status: 'Pending HR',
                assignedToUid: '', assignedToName: '', assignedToEmail: '', assignedToRole: 'HR'
            },

            payCalc: { gross: 0, deduct: 0, net: 0, epfEmpr: 0, socsoEmpr: 0, eisEmpr: 0 }
        };
    },
    computed: {
        canManageSensitiveData() { return ['Superadmin', 'Director', 'HR'].includes(this.userProfile.role); },
        canManageEmployees() { return ['Superadmin', 'Director', 'HR'].includes(this.userProfile.role); },
        canManageClients() { return ['Superadmin', 'Director', 'HR', 'Account'].includes(this.userProfile.role); },
        canManageDocuments() { return ['Superadmin', 'HR', 'Account'].includes(this.userProfile.role); },
        canManagePayroll() { return ['Superadmin', 'HR', 'Account'].includes(this.userProfile.role); },
        canDelete() { return ['Superadmin', 'Director'].includes(this.userProfile.role); },
        canManageRBAC() { return ['Superadmin', 'Director'].includes(this.userProfile.role); },
        canManageCompanySettings() { return ['Director', 'Superadmin', 'IT'].includes(this.userProfile.role); },
        canManageProjects() { return ['Director', 'Superadmin'].includes(this.userProfile.role); },
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

        pendingClaimsCount() { return this.claimsHistory.filter(c => c.status && c.status.includes('Pending')).length; },
        totalApprovedClaimsAmount() { return this.claimsHistory.filter(c => c.status === 'Approved').reduce((s, c) => s + (Number(c.amount) || 0), 0); },
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
                ...this.claimsHistory.map(c => ({ ...c, tagClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', isClaim: true, docNo: c.receiptNo, amount: c.amount, date: c.expenseDate, name: c.documentType === 'Payment Voucher' ? (c.payeeName || c.name) : c.name }))
            ];
            const typePriority = { 'Payslip': 1, 'Quotation': 2, 'Invoice': 3, 'Claim': 4, 'Payment Voucher': 5 };
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
        },
        filteredProjects() {
            const queryText = this.searchQuery.trim().toLowerCase();
            const records = [...this.projects].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
            if (!queryText) return records;
            return records.filter(project => [project.projectRef, project.title, project.clientName, project.ownerName, project.status, project.description].some(value => String(value || '').toLowerCase().includes(queryText)));
        },
        projectClientAccessUsers() {
            return this.users.filter(user => user.role === 'Client').sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
        },
        projectStaffOptions() {
            return this.employees.filter(employee => employee.email && employee.empNo).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        },
        myPendingProjectActivities() {
            const email = String(this.userProfile.email || '').trim().toLowerCase();
            return this.projectActivities.filter(activity => activity.status !== 'Done' && String(activity.assignedEmail || '').trim().toLowerCase() === email).sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
        }
    },
    watch: {
        currentTab(nextTab, previousTab) {
            if (previousTab === 'dashboard' && nextTab !== 'dashboard') this.destroyDashboardCharts();
            if (nextTab === 'dashboard' && previousTab !== 'dashboard') this.refreshDashboardCharts();
        }
    },
    methods: {
        toOfficialUppercase(value) {
            return typeof value === 'string' ? value.trim().toLocaleUpperCase('en-MY') : value;
        },
        normalizeOfficialRecord(value, key = '') {
            if (Array.isArray(value)) return value.map(item => this.normalizeOfficialRecord(item, key));
            if (value && typeof value === 'object') {
                return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, this.normalizeOfficialRecord(childValue, childKey)]));
            }
            if (typeof value !== 'string') return value;
            const protectedKey = /(id$|email|password|photo|attachment|status|role|type|category|date|method|url|website)/i.test(key);
            const protectedValue = /^(data:|https?:\/\/)/i.test(value.trim());
            return protectedKey || protectedValue ? value.trim() : this.toOfficialUppercase(value);
        },
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
        getProjectsByStage(stage) {
            return this.filteredProjects.filter(project => project.status === stage);
        },
        getClientGroupsByStage(stage) {
            const groups = [];
            const indexByKey = new Map();
            this.getProjectsByStage(stage).forEach(project => {
                const key = project.clientDirectoryId || `unlinked-${project.clientName || 'unknown'}`;
                if (!indexByKey.has(key)) {
                    indexByKey.set(key, groups.length);
                    groups.push({ key, clientDirectoryId: project.clientDirectoryId || '', clientName: project.clientName || 'Unknown Client', projects: [] });
                }
                groups[indexByKey.get(key)].projects.push(project);
            });
            return groups;
        },
        toggleClientGroup(groupKey) {
            if (this.expandedClientGroups.has(groupKey)) this.expandedClientGroups.delete(groupKey);
            else this.expandedClientGroups.add(groupKey);
        },
        isClientGroupExpanded(groupKey) {
            return this.expandedClientGroups.has(groupKey);
        },
        openProjectDetails(project) {
            this.projectPreview = { show: true, project: JSON.parse(JSON.stringify(project)) };
        },
        closeProjectDetails() {
            this.projectPreview = { show: false, project: null };
            this.clientReplyMessage = '';
            this.editingReplyId = '';
            this.editingReplyMessage = '';
        },
        editProjectFromPreview() {
            const project = this.projectPreview.project ? JSON.parse(JSON.stringify(this.projectPreview.project)) : null;
            this.closeProjectDetails();
            if (project) this.openProjectModal(project);
        },
        projectActivitiesFor(projectId) {
            return this.projectActivities.filter(activity => activity.projectId === projectId).sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
        },
        clientUpdatesFor(projectId) {
            return this.projectClientUpdates.filter(update => update.projectId === projectId).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
        },
        canSendClientUpdate(project) {
            const email = String(this.userProfile.email || '').trim().toLowerCase();
            return this.canManageProjects || (this.userProfile.role !== 'Client' && String(project?.ownerEmail || '').trim().toLowerCase() === email);
        },
        canReplyAsClient(project) {
            return this.userProfile.role === 'Client' && String(project?.clientPortalUid || '') === String(this.userProfile.uid || '');
        },
        canEditClientUpdate(update) {
            return this.canManageProjects || String(update?.senderUid || '') === String(this.userProfile.uid || '');
        },
        canDeleteClientUpdate(update) {
            return this.canManageProjects || (this.userProfile.role === 'Client' && update?.senderRole === 'Client' && String(update?.senderUid || '') === String(this.userProfile.uid || ''));
        },
        openClientUpdateModal(project, update = null) {
            if (update ? !this.canEditClientUpdate(update) : !this.canSendClientUpdate(project)) { this.showNotify('Only the assigned PIC, original sender, Director or Superadmin may manage this Client update.'); return; }
            this.clientUpdateModal = {
                show: true,
                isEdit: Boolean(update),
                updateId: update?.id || '',
                original: update ? JSON.parse(JSON.stringify(update)) : null,
                project: JSON.parse(JSON.stringify(project)),
                form: { updateType: update?.updateType || 'Progress Update', updateDate: update?.updateDate || this.getLocalDateKey(), message: update?.message || '' }
            };
        },
        closeClientUpdateModal() {
            this.clientUpdateModal = { show: false, isEdit: false, updateId: '', original: null, project: null, form: { updateType: 'Progress Update', updateDate: '', message: '' } };
        },
        async saveClientUpdate() {
            const project = this.clientUpdateModal.project;
            const form = this.clientUpdateModal.form;
            const isEdit = this.clientUpdateModal.isEdit;
            const original = this.clientUpdateModal.original;
            if (!project || (isEdit ? !this.canEditClientUpdate(original) : !this.canSendClientUpdate(project))) { this.showNotify('You do not have permission to save this Client update.'); return; }
            if (!form.updateType || !form.updateDate || !form.message?.trim()) { this.showNotify('Complete Update Type, Update Date and Client Message.'); return; }
            if (isEdit) {
                try {
                    await setDoc(doc(db, 'project_client_updates', this.clientUpdateModal.updateId), this.normalizeOfficialRecord({ updateType: form.updateType, updateDate: form.updateDate, message: form.message, updatedAt: new Date().toISOString(), updatedByUid: this.userProfile.uid }), { merge: true });
                    this.logAudit('UPDATE', `Updated Client activity history for ${project.projectRef}`);
                    this.closeClientUpdateModal();
                    this.showNotify('Client activity history updated.');
                } catch (error) {
                    console.error('Client project update edit failed:', error);
                    this.showNotify(this.getFirestoreWriteError(error, 'update the Client activity history'));
                }
                return;
            }
            const currentEmployee = this.employees.find(employee => String(employee.email || '').trim().toLowerCase() === String(this.userProfile.email || '').trim().toLowerCase());
            const updateId = `UPD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const payload = this.normalizeOfficialRecord({
                projectId: project.id,
                projectRef: project.projectRef,
                projectTitle: project.title,
                clientPortalUid: project.clientPortalUid,
                clientEmail: project.clientEmail,
                updateType: form.updateType,
                updateDate: form.updateDate,
                message: form.message,
                senderUid: this.userProfile.uid,
                senderName: this.userProfile.name,
                senderEmail: this.userProfile.email,
                senderPosition: currentEmployee?.position || this.getRoleDisplayName(this.userProfile.role),
                senderRole: this.userProfile.role,
                createdAt: new Date().toISOString()
            });
            try {
                await setDoc(doc(db, 'project_client_updates', updateId), payload);
                this.logAudit('CREATE', `Client update sent for ${payload.projectRef}`);
                this.closeClientUpdateModal();
                this.showNotify('Client update sent and added to Client Activity History.');
            } catch (error) {
                console.error('Client project update failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'send the Client project update'));
            }
        },
        async sendClientReply() {
            const project = this.projectPreview.project;
            if (!project || !this.canReplyAsClient(project)) { this.showNotify('You do not have permission to reply on this project.'); return; }
            const message = this.clientReplyMessage.trim();
            if (!message) { this.showNotify('Write a message before sending.'); return; }
            const updateId = `UPD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const payload = this.normalizeOfficialRecord({
                projectId: project.id,
                projectRef: project.projectRef,
                projectTitle: project.title,
                clientPortalUid: this.userProfile.uid,
                clientEmail: project.clientEmail,
                updateType: 'Client Reply',
                updateDate: this.getLocalDateKey(),
                message,
                senderUid: this.userProfile.uid,
                senderName: this.userProfile.name,
                senderEmail: this.userProfile.email,
                senderPosition: 'Client',
                senderRole: 'Client',
                createdAt: new Date().toISOString()
            });
            try {
                await setDoc(doc(db, 'project_client_updates', updateId), payload);
                this.logAudit('CREATE', `Client reply sent for ${payload.projectRef}`);
                this.clientReplyMessage = '';
                this.showNotify('Your reply has been sent.');
            } catch (error) {
                console.error('Client reply failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'send your reply'));
            }
        },
        startEditReply(update) {
            this.editingReplyId = update.id;
            this.editingReplyMessage = update.message;
        },
        cancelEditReply() {
            this.editingReplyId = '';
            this.editingReplyMessage = '';
        },
        async saveReplyEdit(update) {
            const message = this.editingReplyMessage.trim();
            if (!message) { this.showNotify('Message cannot be empty.'); return; }
            try {
                await setDoc(doc(db, 'project_client_updates', update.id), this.normalizeOfficialRecord({ message, updatedAt: new Date().toISOString(), updatedByUid: this.userProfile.uid }), { merge: true });
                this.logAudit('UPDATE', `Edited client reply for ${update.projectRef}`);
                this.cancelEditReply();
                this.showNotify('Reply updated.');
            } catch (error) {
                console.error('Reply edit failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'update your reply'));
            }
        },
        async deleteClientUpdate(update) {
            if (!this.canDeleteClientUpdate(update)) { this.showNotify('Only Director, Superadmin, or the original sender may delete this Client activity history entry.'); return; }
            if (!confirm(`Delete Client update dated ${update.updateDate || '-'}? This action cannot be undone.`)) return;
            try {
                await deleteDoc(doc(db, 'project_client_updates', update.id));
                this.logAudit('DELETE', `Deleted Client activity history ${update.id}`);
                this.showNotify('Client activity history deleted.');
            } catch (error) {
                console.error('Client activity history deletion failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'delete the Client activity history'));
            }
        },
        projectActivityDueState(activity) {
            if (activity.status === 'Done') return { label: 'Done', className: 'bg-slate-200 text-slate-700', borderClass: 'border-l-slate-400', dotClass: 'bg-slate-400', daysRemaining: null };
            const today = this.getLocalDateKey();
            const dueDate = String(activity.dueDate || '');
            const daysRemaining = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
            if (!Number.isFinite(daysRemaining)) return { label: 'No Due Date', className: 'bg-slate-200 text-slate-700', borderClass: 'border-l-slate-400', dotClass: 'bg-slate-400', daysRemaining: null };
            if (daysRemaining < 0) return { label: `${Math.abs(daysRemaining)} Day${Math.abs(daysRemaining) === 1 ? '' : 's'} Overdue`, className: 'bg-red-100 text-red-800', borderClass: 'border-l-red-500', dotClass: 'bg-red-500', daysRemaining };
            if (daysRemaining === 0) return { label: 'Due Today', className: 'bg-amber-100 text-amber-800', borderClass: 'border-l-amber-400', dotClass: 'bg-amber-400', daysRemaining };
            if (daysRemaining <= 3) return { label: `Due In ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`, className: 'bg-emerald-100 text-emerald-800', borderClass: 'border-l-emerald-500', dotClass: 'bg-emerald-500', daysRemaining };
            return { label: `Scheduled · ${daysRemaining} Days`, className: 'bg-blue-100 text-blue-800', borderClass: 'border-l-blue-500', dotClass: 'bg-blue-500', daysRemaining };
        },
        isProjectOwner(project) {
            if (!project) return false;
            return this.userProfile.role !== 'Client' && String(project.ownerEmail || '').trim().toLowerCase() === String(this.userProfile.email || '').trim().toLowerCase();
        },
        canEditProject(project) {
            return this.canManageProjects || this.isProjectOwner(project);
        },
        canManageProjectActivities(project) {
            return this.canManageProjects || this.isProjectOwner(project);
        },
        canCompleteProjectActivity(activity) {
            return this.canManageProjects || (this.userProfile.role !== 'Client' && String(activity?.assignedEmail || '').trim().toLowerCase() === String(this.userProfile.email || '').trim().toLowerCase());
        },
        canEditProjectActivity(activity) {
            const project = this.projects.find(p => p.id === activity?.projectId);
            return this.canManageProjectActivities(project);
        },
        canDeleteProjectActivity() { return this.canManageProjects; },
        openActivityModal(project, activity = null) {
            if (!this.canManageProjectActivities(project)) { this.showNotify('Only Director, Superadmin, or this project\'s Person In Charge may schedule activities.'); return; }
            this.activityModal = { show: true, isEdit: Boolean(activity), activityId: activity?.id || '', project: JSON.parse(JSON.stringify(project)), form: { activityType: activity?.activityType || 'To-Do', summary: activity?.summary || '', dueDate: activity?.dueDate || this.getLocalDateKey(), assignedEmpNo: activity?.assignedEmpNo || '', assignedName: activity?.assignedName || '', assignedEmail: activity?.assignedEmail || '', assignedPosition: activity?.assignedPosition || '', details: activity?.details || '' } };
        },
        closeActivityModal() {
            this.activityModal = { show: false, isEdit: false, activityId: '', project: null, form: { activityType: 'To-Do', summary: '', dueDate: '', assignedEmpNo: '', assignedName: '', assignedEmail: '', assignedPosition: '', details: '' } };
        },
        selectActivityAssignee(event) {
            const employee = this.projectStaffOptions.find(item => item.empNo === event.target.value);
            this.activityModal.form.assignedEmpNo = employee?.empNo || '';
            this.activityModal.form.assignedName = employee?.name || '';
            this.activityModal.form.assignedEmail = String(employee?.email || '').trim().toLowerCase();
            this.activityModal.form.assignedPosition = employee?.position || '';
        },
        async saveProjectActivity() {
            if (!this.activityModal.project || !this.canManageProjectActivities(this.activityModal.project)) { this.showNotify('You do not have permission to schedule this activity.'); return; }
            const form = this.activityModal.form;
            if (!form.activityType || !form.summary?.trim() || !form.dueDate || !form.assignedEmpNo || !form.assignedEmail) { this.showNotify('Complete Activity Type, Summary, Due Date and Assigned To.'); return; }
            const project = this.activityModal.project;
            if (this.activityModal.isEdit) {
                try {
                    await setDoc(doc(db, 'project_activities', this.activityModal.activityId), this.normalizeOfficialRecord({ activityType: form.activityType, summary: form.summary, dueDate: form.dueDate, assignedEmpNo: form.assignedEmpNo, assignedName: form.assignedName, assignedEmail: form.assignedEmail, assignedPosition: form.assignedPosition, details: form.details, updatedAt: new Date().toISOString(), updatedByUid: this.userProfile.uid, updatedByEmail: this.userProfile.email }), { merge: true });
                    this.logAudit('UPDATE', `Updated project activity for ${project.projectRef}`);
                    this.closeActivityModal();
                    this.showNotify('Project activity updated.');
                } catch (error) {
                    console.error('Project activity update failed:', error);
                    this.showNotify(this.getFirestoreWriteError(error, 'update the project activity'));
                }
                return;
            }
            const activityId = `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const payload = this.normalizeOfficialRecord({
                projectId: project.id,
                projectRef: project.projectRef,
                projectTitle: project.title,
                clientPortalUid: project.clientPortalUid,
                clientEmail: project.clientEmail,
                activityType: form.activityType,
                summary: form.summary,
                dueDate: form.dueDate,
                assignedEmpNo: form.assignedEmpNo,
                assignedName: form.assignedName,
                assignedEmail: form.assignedEmail,
                assignedPosition: form.assignedPosition,
                details: form.details,
                status: 'Scheduled',
                createdAt: new Date().toISOString(),
                createdByUid: this.userProfile.uid,
                createdByEmail: this.userProfile.email
            });
            try {
                await setDoc(doc(db, 'project_activities', activityId), payload);
                this.logAudit('CREATE', `Scheduled ${payload.activityType} for ${payload.projectRef} and assigned to ${payload.assignedName}`);
                this.closeActivityModal();
                this.showNotify('Project activity scheduled. The assigned employee will receive an in-portal alert.');
            } catch (error) {
                console.error('Project activity scheduling failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'schedule the project activity'));
            }
        },
        async markProjectActivityDone(activity) {
            if (!this.canCompleteProjectActivity(activity)) { this.showNotify('Only the assigned employee, Director or Superadmin may complete this activity.'); return; }
            try {
                await updateDoc(doc(db, 'project_activities', activity.id), { status: 'Done', completedAt: new Date().toISOString(), completedByUid: this.userProfile.uid, completedByEmail: this.userProfile.email });
                this.logAudit('UPDATE', `Completed project activity ${activity.summary}`);
                this.showNotify('Project activity marked as done.');
            } catch (error) {
                console.error('Project activity completion failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'complete the project activity'));
            }
        },
        async deleteProjectActivity(activity) {
            if (!this.canDeleteProjectActivity(activity)) { this.showNotify('Only Director and Superadmin may delete project activities.'); return; }
            if (!confirm(`Delete activity "${activity.summary || activity.id}"? This action cannot be undone.`)) return;
            try {
                await deleteDoc(doc(db, 'project_activities', activity.id));
                this.logAudit('DELETE', `Deleted project activity ${activity.id}`);
                this.showNotify('Project activity deleted.');
            } catch (error) {
                console.error('Project activity deletion failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'delete the project activity'));
            }
        },
        selectProjectClientDirectory(event) {
            const customer = this.customers.find(item => item.id === event.target.value);
            if (!customer) return;
            this.projectModal.form.clientDirectoryId = customer.id;
            this.projectModal.form.clientName = customer.clientName || '';
            const directoryEmail = String(customer.clientEmail || '').trim().toLowerCase();
            const matchingAccess = this.projectClientAccessUsers.find(user => String(user.email || '').trim().toLowerCase() === directoryEmail)
                || this.projectClientAccessUsers.find(user => String(user.name || '').trim().toLowerCase() === String(customer.clientName || '').trim().toLowerCase());
            this.projectModal.form.clientPortalUid = matchingAccess?.id || '';
            this.projectModal.form.clientEmail = matchingAccess?.email || '';
        },
        selectProjectClientAccess(event) {
            const user = this.projectClientAccessUsers.find(item => item.id === event.target.value);
            this.projectModal.form.clientPortalUid = user?.id || '';
            this.projectModal.form.clientEmail = user?.email || '';
        },
        selectProjectOwner(event) {
            const employee = this.projectStaffOptions.find(item => item.empNo === event.target.value);
            if (!employee) return;
            const previousOwner = this.projectModal.form.ownerEmpNo;
            this.projectModal.form.ownerEmpNo = employee.empNo;
            this.projectModal.form.ownerName = employee.name || '';
            this.projectModal.form.ownerEmail = String(employee.email || '').trim().toLowerCase();
            this.projectModal.form.ownerPosition = employee.position || '';
            this.projectModal.form.ownerDepartment = employee.dept || '';
            this.projectModal.form.ownerPresenceStatus = this.employeePresenceLabel(employee);
            this.projectModal.form.ownerPresenceUpdatedAt = employee.presenceUpdatedAt || '';
            this.projectModal.form.ownerLastSeen = employee.lastSeen || '';
            if (previousOwner !== employee.empNo || !this.projectModal.form.ownerAssignedAt) this.projectModal.form.ownerAssignedAt = new Date().toISOString();
        },
        isProjectPicOnline(project) {
            const lastUpdate = this.getPresenceTime(project.ownerPresenceUpdatedAt || project.ownerLastSeen);
            return project.ownerPresenceStatus === 'Online' && lastUpdate > 0 && (this.presenceNow - lastUpdate) < 90000;
        },
        projectPicPresenceDetail(project) {
            if (this.isProjectPicOnline(project)) return 'Online now';
            return project.ownerLastSeen ? `Last seen ${this.formatDateTime(project.ownerLastSeen)}` : 'Offline — no recent activity';
        },
        openProjectModal(project = null) {
            if (project ? !this.canEditProject(project) : !this.canManageProjects) { this.showNotify(project ? 'Only Director, Superadmin, or this project\'s Person In Charge may edit this project.' : 'Only Director and Superadmin may create new projects.'); return; }
            const emptyForm = { id: '', projectRef: `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, title: '', clientDirectoryId: '', clientPortalUid: '', clientName: '', clientEmail: '', ownerEmpNo: '', ownerName: '', ownerEmail: '', ownerPosition: '', ownerDepartment: '', ownerAssignedAt: '', ownerPresenceStatus: 'Offline', ownerPresenceUpdatedAt: '', ownerLastSeen: '', status: 'Project Planning', startDate: '', targetDate: '', description: '' };
            this.projectModal = { show: true, isEdit: Boolean(project), form: project ? JSON.parse(JSON.stringify(project)) : emptyForm };
        },
        closeProjectModal() {
            this.projectModal.show = false;
        },
        async saveProject() {
            const source = this.projectModal.form;
            const isEdit = this.projectModal.isEdit;
            const original = isEdit ? this.projects.find(p => p.id === source.id) : null;
            if (isEdit && !original) { this.showNotify('This project no longer exists. It may have been deleted.'); this.closeProjectModal(); return; }
            const isAdminEditor = this.canManageProjects;
            const authorized = isEdit ? (isAdminEditor || this.isProjectOwner(original)) : isAdminEditor;
            if (!authorized) { this.showNotify('You do not have permission to save this project.'); return; }
            if (!source.status || !this.projectStages.includes(source.status)) { this.showNotify('Invalid project stage.'); return; }
            const now = new Date().toISOString();

            if (isEdit && !isAdminEditor) {
                const payload = this.normalizeOfficialRecord({
                    status: source.status,
                    startDate: source.startDate,
                    targetDate: source.targetDate,
                    description: source.description,
                    updatedAt: now,
                    updatedByUid: this.userProfile.uid,
                    updatedByEmail: this.userProfile.email
                });
                try {
                    await setDoc(doc(db, 'projects', source.id), payload, { merge: true });
                    this.logAudit('UPDATE', `Project progress updated for ${original.projectRef}`);
                    this.closeProjectModal();
                    this.showNotify('Project progress updated successfully.');
                } catch (error) {
                    console.error('Project save failed:', error);
                    this.showNotify(this.getFirestoreWriteError(error, 'update the project'));
                }
                return;
            }

            if (!source.projectRef?.trim() || !source.title?.trim()) { this.showNotify('Project reference and title are required.'); return; }
            if (!source.clientDirectoryId || !source.clientPortalUid || !source.clientEmail) { this.showNotify('Select a Client Directory record and its matching Client Portal Access account.'); return; }
            if (!source.ownerEmpNo || !source.ownerEmail) { this.showNotify('Select a Person In Charge from HR Employee Management.'); return; }
            const projectId = source.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const payload = this.normalizeOfficialRecord({
                projectRef: isEdit ? original.projectRef : source.projectRef,
                title: source.title,
                clientDirectoryId: source.clientDirectoryId,
                clientPortalUid: source.clientPortalUid,
                clientName: source.clientName,
                clientEmail: String(source.clientEmail || '').trim().toLowerCase(),
                ownerEmpNo: source.ownerEmpNo,
                ownerName: source.ownerName,
                ownerEmail: String(source.ownerEmail || '').trim().toLowerCase(),
                ownerPosition: source.ownerPosition,
                ownerDepartment: source.ownerDepartment,
                ownerAssignedAt: source.ownerAssignedAt || now,
                ownerPresenceStatus: source.ownerPresenceStatus || 'Offline',
                ownerPresenceUpdatedAt: source.ownerPresenceUpdatedAt || '',
                ownerLastSeen: source.ownerLastSeen || '',
                status: source.status,
                startDate: source.startDate,
                targetDate: source.targetDate,
                description: source.description,
                updatedAt: now,
                updatedByUid: this.userProfile.uid,
                updatedByEmail: this.userProfile.email,
                ...(isEdit ? {} : { createdAt: now, createdByUid: this.userProfile.uid, createdByEmail: this.userProfile.email })
            });
            try {
                await setDoc(doc(db, 'projects', projectId), payload, { merge: isEdit });
                this.logAudit(isEdit ? 'UPDATE' : 'CREATE', `Project activity ${payload.projectRef}`);
                this.closeProjectModal();
                this.showNotify('Project activity saved successfully.');
            } catch (error) {
                console.error('Project save failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'save the project activity'));
            }
        },
        async moveProject(project, direction) {
            if (!this.canEditProject(project)) { this.showNotify('You do not have permission to update this project stage.'); return; }
            const currentIndex = this.projectStages.indexOf(project.status);
            const nextIndex = currentIndex + direction;
            if (currentIndex < 0 || nextIndex < 0 || nextIndex >= this.projectStages.length) return;
            try {
                await updateDoc(doc(db, 'projects', project.id), { status: this.projectStages[nextIndex], updatedAt: new Date().toISOString(), updatedByUid: this.userProfile.uid, updatedByEmail: this.userProfile.email });
                this.logAudit('UPDATE', `Project ${project.projectRef} moved to ${this.projectStages[nextIndex]}`);
                this.showNotify(`Project moved to ${this.projectStages[nextIndex]}.`);
            } catch (error) {
                console.error('Project stage update failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'update the project stage'));
            }
        },
        async deleteProject(project) {
            if (!this.canManageProjects) { this.showNotify('You do not have permission to delete project activities.'); return false; }
            const linkedActivities = this.projectActivitiesFor(project.id);
            const linkedUpdates = this.clientUpdatesFor(project.id);
            const cascadeWarning = (linkedActivities.length || linkedUpdates.length)
                ? ` This will also permanently delete ${linkedActivities.length} activity issue(s) and ${linkedUpdates.length} client update(s) linked to this project.`
                : '';
            if (!confirm(`Delete project ${project.projectRef}?${cascadeWarning} This action cannot be undone.`)) return false;
            try {
                const batch = writeBatch(db);
                linkedActivities.forEach(activity => batch.delete(doc(db, 'project_activities', activity.id)));
                linkedUpdates.forEach(update => batch.delete(doc(db, 'project_client_updates', update.id)));
                batch.delete(doc(db, 'projects', project.id));
                await batch.commit();
                this.logAudit('DELETE', `Project activity ${project.projectRef} (with ${linkedActivities.length} activity issue(s) and ${linkedUpdates.length} client update(s))`);
                this.showNotify('Project and all linked records deleted.');
                return true;
            } catch (error) {
                console.error('Project deletion failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'delete the project activity'));
                return false;
            }
        },
        async deleteProjectFromPreview() {
            const project = this.projectPreview.project;
            if (!project) return;
            if (await this.deleteProject(project)) this.closeProjectDetails();
        },
        async deleteProjectFromModal() {
            const project = this.projectModal.form;
            if (!project?.id) return;
            if (await this.deleteProject(project)) this.closeProjectModal();
        },
        async syncAssignedProjectPresence(employee, isOnline, timestamp) {
            if (!auth.currentUser || !employee?.empNo || !employee?.email) return;
            try {
                const snapshot = await getDocs(query(collection(db, 'projects'), where('ownerEmpNo', '==', employee.empNo), where('ownerEmail', '==', String(employee.email).trim().toLowerCase())));
                if (snapshot.empty) return;
                const batch = writeBatch(db);
                snapshot.docs.forEach(projectDoc => batch.update(projectDoc.ref, {
                    ownerPresenceStatus: isOnline ? 'Online' : 'Offline',
                    ownerPresenceUpdatedAt: timestamp,
                    ownerLastSeen: timestamp
                }));
                await batch.commit();
            } catch (error) {
                console.error('Unable to synchronize assigned project presence:', error);
            }
        },
        getActivityStatus(item) {
            if (item.type === 'Invoice') {
                return item.status === 'Paid'
                    ? { label: 'PAID', detail: 'Payment received', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }
                    : { label: 'UNPAID', detail: 'Payment not received', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
            }
            if (item.isClaim || ['Claim', 'Payment Voucher'].includes(item.documentType || item.type)) {
                const isPaymentVoucher = (item.documentType || item.type) === 'Payment Voucher';
                const statuses = {
                    'Pending HR': { label: 'PENDING HR', detail: 'Awaiting HR approval', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
                    'Pending Account': { label: 'PENDING FINANCE', detail: 'HR approved — Finance action required', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
                    'Pending Director': { label: 'PENDING DIRECTOR', detail: 'Finance approved — Director action required', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
                    'Approved': { label: 'APPROVED', detail: isPaymentVoucher ? 'Payment fully paid' : 'Claim fully approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
                    'Rejected': { label: 'REJECTED', detail: isPaymentVoucher ? 'Payment voucher rejected' : 'Claim rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' }
                };
                return statuses[item.status] || { label: 'PENDING', detail: 'Awaiting action', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
            }
            return { label: 'RECORDED', detail: 'Record created', className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
        },
        normalizeClaimRecord(record) {
            const documentType = record.documentType || (record.type === 'Payment Voucher' || /^PV-/i.test(record.receiptNo || '') ? 'Payment Voucher' : 'Claim');
            if (record.status !== 'Approved') return { ...record, documentType };
            const isPaymentVoucher = documentType === 'Payment Voucher';
            return {
                ...record,
                documentType,
                type: documentType,
                finalDecision: true,
                settlementStatus: isPaymentVoucher ? 'Paid' : 'Approved',
                statusDetail: isPaymentVoucher ? 'Payment fully paid' : 'Claim fully approved',
                assignedToUid: record.approvedByUid || record.assignedToUid || '',
                assignedToName: record.approvedByName || record.assignedToName || 'Director',
                assignedToEmail: record.approvedByEmail || '',
                assignedToRole: 'Director',
                approvalPath: record.approvalPath || (record.approvedByRole === 'Director' ? 'Director Direct Approval' : 'Director Final Approval')
            };
        },
        async synchronizeLegacyApprovedClaims(snapshotDocs) {
            if (this.legacyClaimMigrationRunning || !['Director', 'Superadmin'].includes(this.userProfile.role)) return;
            const migrations = [];
            snapshotDocs.forEach(snapshotDoc => {
                const existing = snapshotDoc.data();
                if (existing.status !== 'Approved') return;
                const normalized = this.normalizeClaimRecord(existing);
                const patch = {};
                ['documentType', 'type', 'finalDecision', 'settlementStatus', 'statusDetail', 'assignedToUid', 'assignedToName', 'assignedToEmail', 'assignedToRole', 'approvalPath'].forEach(field => {
                    if (existing[field] !== normalized[field]) patch[field] = normalized[field];
                });
                if (Object.keys(patch).length) migrations.push({ ref: snapshotDoc.ref, patch });
            });
            if (!migrations.length) return;
            this.legacyClaimMigrationRunning = true;
            try {
                for (let start = 0; start < migrations.length; start += 450) {
                    const batch = writeBatch(db);
                    migrations.slice(start, start + 450).forEach(item => batch.update(item.ref, item.patch));
                    await batch.commit();
                }
                this.showNotify(`${migrations.length} approved legacy record(s) synchronized.`);
            } catch (error) {
                console.error('Legacy approved record synchronization failed:', error);
            } finally {
                this.legacyClaimMigrationRunning = false;
            }
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
            this.selectedPayEmployeeId = '';
            this.selectedClaimEmployeeId = '';
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
                documentType: 'Claim', name: '', empNo: '', empEmail: '', position: '', dept: '', expenseDate: new Date().toISOString().substr(0, 10), category: 'Medical', subCategory: 'Clinic / Hospital Treatment',
                payeeName: '', payeeType: 'Individual', payeeReference: '', paymentPurpose: '',
                amount: 0, receiptNo: '', description: '', receiptAttachment: '', receiptAttachmentName: '', receiptAttachmentOriginalBytes: 0, status: 'Pending HR',
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
        async validateImageFile(file) {
            if (!file) throw new Error('No image file was selected.');
            if (file.size <= 0) throw new Error('The selected image file is empty.');
            if (file.size > 2 * 1024 * 1024) throw new Error('Image size must not exceed 2 MB.');

            const extension = String(file.name || '').split('.').pop().toLowerCase();
            const contentType = extension === 'png' ? 'image/png' : ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg' : '';
            if (!contentType) throw new Error('Only PNG, JPG and JPEG files are allowed.');

            const declaredType = String(file.type || '').toLowerCase();
            const compatibleTypes = contentType === 'image/png' ? ['image/png', 'image/x-png'] : ['image/jpeg', 'image/jpg', 'image/pjpeg'];
            if (declaredType && !compatibleTypes.includes(declaredType)) throw new Error('The file extension does not match its image type.');

            const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
            const isPng = signature.length >= 8 && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47 && signature[4] === 0x0D && signature[5] === 0x0A && signature[6] === 0x1A && signature[7] === 0x0A;
            const isJpeg = signature.length >= 3 && signature[0] === 0xFF && signature[1] === 0xD8 && signature[2] === 0xFF;
            if ((contentType === 'image/png' && !isPng) || (contentType === 'image/jpeg' && !isJpeg)) throw new Error('The selected file is not a valid PNG, JPG or JPEG image.');
            return contentType;
        },
        getUploadErrorMessage(error) {
            return error?.message || 'Unable to process the image. Please select another PNG, JPG or JPEG file.';
        },
        formatFileSize(bytes) {
            const value = Number(bytes) || 0;
            return value < 1024 * 1024 ? `${(value / 1024).toFixed(0)} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`;
        },
        getFirestoreWriteError(error, action = 'save this record') {
            const code = String(error?.code || '').toLowerCase();
            if (code.includes('permission-denied')) return `Permission denied while trying to ${action}. Deploy the latest firestore.rules and sign in again.`;
            if (code.includes('resource-exhausted') || code.includes('invalid-argument')) return `The record is too large to ${action}. Select smaller images.`;
            if (code.includes('unavailable') || code.includes('deadline-exceeded')) return `Firestore is temporarily unavailable. Check the network and try again.`;
            return `Unable to ${action}. ${error?.message || 'Please try again.'}`;
        },
        getSerializedSize(value) {
            return new Blob([JSON.stringify(value)]).size;
        },
        getDataUrlSize(dataUrl) {
            if (!dataUrl || !String(dataUrl).startsWith('data:')) return 0;
            const value = String(dataUrl);
            return Math.ceil((value.length - value.indexOf(',') - 1) * 3 / 4);
        },
        async prepareImageAttachment(file, maxDataUrlBytes = 220 * 1024, maxDimension = 1600) {
            await this.validateImageFile(file);
            const imageUrl = URL.createObjectURL(file);
            try {
                const image = await new Promise((resolve, reject) => {
                    const element = new Image();
                    element.onload = () => resolve(element);
                    element.onerror = () => reject(new Error('The selected image cannot be decoded.'));
                    element.src = imageUrl;
                });
                let width = image.naturalWidth;
                let height = image.naturalHeight;
                if (!width || !height) throw new Error('The selected image has invalid dimensions.');
                const initialScale = Math.min(1, maxDimension / Math.max(width, height));
                width = Math.max(1, Math.round(width * initialScale));
                height = Math.max(1, Math.round(height * initialScale));

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false });
                if (!context) throw new Error('This browser cannot process the selected image.');
                let quality = 0.9;
                let dataUrl = '';
                for (let attempt = 0; attempt < 14; attempt++) {
                    canvas.width = width;
                    canvas.height = height;
                    context.fillStyle = '#FFFFFF';
                    context.fillRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, width, height);
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const encodedBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
                    if (encodedBytes <= maxDataUrlBytes) return dataUrl;
                    if (quality > 0.5) quality -= 0.1;
                    else {
                        const currentMax = Math.max(width, height);
                        const nextMax = Math.max(480, Math.round(currentMax * 0.82));
                        const resizeScale = nextMax / currentMax;
                        width = Math.max(1, Math.round(width * resizeScale));
                        height = Math.max(1, Math.round(height * resizeScale));
                        quality = 0.72;
                    }
                }
                throw new Error('The image could not be reduced to a safe Firestore size. Please use a smaller image.');
            } finally {
                URL.revokeObjectURL(imageUrl);
            }
        },
        async handleAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            this.attachmentUploadState.payment = true;
            try {
                this.docForm.paymentAttachment = await this.prepareImageAttachment(file);
                this.showNotify('Payment attachment is ready to be saved.');
            } catch (error) {
                console.error('Payment attachment upload failed:', error);
                this.docForm.paymentAttachment = '';
                this.showNotify(this.getUploadErrorMessage(error));
                e.target.value = '';
            } finally { this.attachmentUploadState.payment = false; e.target.value = ''; }
        },
        async handleClaimAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            this.attachmentUploadState.receipt = true;
            try {
                this.claimForm.receiptAttachment = await this.prepareImageAttachment(file);
                this.claimForm.receiptAttachmentName = file.name;
                this.claimForm.receiptAttachmentOriginalBytes = file.size;
                this.showNotify('Receipt attachment is ready to be saved.');
            } catch (error) {
                console.error('Receipt attachment upload failed:', error);
                this.claimForm.receiptAttachment = '';
                this.claimForm.receiptAttachmentName = '';
                this.claimForm.receiptAttachmentOriginalBytes = 0;
                this.showNotify(this.getUploadErrorMessage(error));
                e.target.value = '';
            } finally { this.attachmentUploadState.receipt = false; e.target.value = ''; }
        },
        async handleDirectorApprovalAttachmentUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            const receiptOriginalBytes = Number(this.claimPreview.claim?.receiptAttachmentOriginalBytes || 0);
            if (receiptOriginalBytes + file.size > 2 * 1024 * 1024) {
                this.showNotify('The total original attachments for one claim must not exceed 2 MB. Select a smaller Director document.');
                e.target.value = '';
                return;
            }
            this.attachmentUploadState.director = true;
            try {
                this.claimPreview.directorApprovalAttachment = await this.prepareImageAttachment(file);
                this.claimPreview.directorApprovalAttachmentName = file.name;
                this.claimPreview.directorApprovalOriginalBytes = file.size;
                this.showNotify('Director approval document is ready to be saved.');
            } catch (error) {
                console.error('Director attachment upload failed:', error);
                this.claimPreview.directorApprovalAttachment = '';
                this.claimPreview.directorApprovalAttachmentName = '';
                this.claimPreview.directorApprovalOriginalBytes = 0;
                this.showNotify(this.getUploadErrorMessage(error));
                e.target.value = '';
            } finally { this.attachmentUploadState.director = false; e.target.value = ''; }
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
        getLocalDateKey(value = new Date()) {
            const date = value instanceof Date ? value : new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
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
            const employee = this.employees.find(emp => emp.presenceUid === auth.currentUser.uid)
                || this.employees.find(emp => String(emp.email || '').trim().toLowerCase() === email);
            if (!employee) return false;
            const timestamp = new Date().toISOString();
            const presenceChanged = this.isEmployeeOnline(employee) !== Boolean(isOnline);
            const shouldSyncProjectPresence = presenceChanged || (isOnline && Date.now() - this.lastProjectPresenceSyncAt >= 60000);
            try {
                await updateDoc(doc(db, 'employees', employee.id || employee.empNo), {
                    presenceStatus: isOnline ? 'Online' : 'Offline',
                    isOnline: !!isOnline,
                    presenceUid: auth.currentUser.uid,
                    presenceUpdatedAt: timestamp,
                    lastSeen: timestamp
                });
                if (shouldSyncProjectPresence) {
                    await this.syncAssignedProjectPresence(employee, isOnline, timestamp);
                    this.lastProjectPresenceSyncAt = Date.now();
                }
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
            this.lastProjectPresenceSyncAt = 0;
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
            if (this.chartRenderFrameOne) cancelAnimationFrame(this.chartRenderFrameOne);
            if (this.chartRenderFrameTwo) cancelAnimationFrame(this.chartRenderFrameTwo);
            this.chartRenderFrameOne = null;
            this.chartRenderFrameTwo = null;
            this.chartRenderAttempts = attempt;
            this.$nextTick(() => {
                if (!this.isLoggedIn || this.currentTab !== 'dashboard') return;
                this.chartRenderFrameOne = requestAnimationFrame(() => {
                    this.chartRenderFrameOne = null;
                    this.chartRenderFrameTwo = requestAnimationFrame(() => {
                        this.chartRenderFrameTwo = null;
                        if (!this.isLoggedIn || !this.portalDataReady || this.currentTab !== 'dashboard') return;
                        const revenueCanvas = document.getElementById('revenueChart');
                        const statusCanvas = document.getElementById('statusChart');
                        if (typeof Chart === 'undefined' || !revenueCanvas?.isConnected || !statusCanvas?.isConnected) {
                            if (attempt < 150) this.chartRenderTimer = setTimeout(() => this.refreshDashboardCharts(attempt + 1), 200);
                            return;
                        }
                        this.chartRenderAttempts = 0;
                        this.renderCharts();
                    });
                });
            });
        },
        destroyDashboardCharts() {
            if (this.chartRenderTimer) clearTimeout(this.chartRenderTimer);
            if (this.chartRenderFrameOne) cancelAnimationFrame(this.chartRenderFrameOne);
            if (this.chartRenderFrameTwo) cancelAnimationFrame(this.chartRenderFrameTwo);
            this.chartRenderTimer = null;
            this.chartRenderFrameOne = null;
            this.chartRenderFrameTwo = null;
            this.chartRenderAttempts = 0;
            if (this.revenueChartInstance) { try { this.revenueChartInstance.destroy(); } catch (error) { console.warn('Revenue chart cleanup skipped:', error); } }
            if (this.statusChartInstance) { try { this.statusChartInstance.destroy(); } catch (error) { console.warn('Status chart cleanup skipped:', error); } }
            this.revenueChartInstance = null;
            this.statusChartInstance = null;
        },
        requestLogout() {
            this.logoutConfirm = true;
        },
        setChartFilter(timeframe) {
            this.chartTimeFilter = timeframe; this.refreshDashboardCharts();
            this.showNotify(`Chart view changed to: ${timeframe.toUpperCase()}`);
        },
        logAudit(action, details) {
            const newLog = { id: String(Date.now()), timestamp: new Date().toLocaleString('en-US'), user: this.userProfile.email, action: action, details: details, browser: navigator.userAgent.substring(0, 80) };
            setDoc(doc(db, "audit_logs", newLog.id), newLog).catch(e => console.error(e));
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
                const isSeedAdmin = firebaseUser.email === 'admin@zenq0r.com';

                if (!userData && !isSeedAdmin) {
                    await signOut(auth);
                    this.loginError = 'This account is not provisioned or your access has been revoked. Contact your administrator.';
                    this.loginLoading = false;
                    return;
                }

                let role = userData?.role || 'Staff';
                let name = userData?.name || firebaseUser.displayName || firebaseUser.email;
                let photo = userData?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;

                const mustChangePassword = userData?.mustChangePassword === true;
                if (isSeedAdmin) role = 'Superadmin';
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
            this.logoutConfirm = false;
            try { this.logAudit('LOGOUT', 'User logged out'); } catch (error) { console.error('Audit log failed during logout:', error); }
            try { await this.setCurrentEmployeePresence(false); } catch (error) { console.error('Presence update failed during logout:', error); }
            this.stopPresenceTracking();
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Firebase sign-out failed:', error);
                this.showNotify('Sign-out ran into an issue, but your local session has been cleared. Close this tab if you are on a shared device.');
            } finally {
                this.destroyDashboardCharts();
                this.isLoggedIn = false; this.loginLoading = false; this.portalDataReady = false; this.portalDataReadyPromise = null; this.userProfile = { name: '', email: '', role: '', photo: '' };
                this.resetAllForms(); this.currentTab = 'dashboard'; this.loginForm = { email: '', password: '' }; this.searchQuery = '';
            }
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
                this.userProfile.name = this.toOfficialUppercase(this.userProfile.name);
                const userRef = doc(db, "users", this.userProfile.uid);
                await setDoc(userRef, { name: this.userProfile.name, email: this.userProfile.email, photo: this.userProfile.photo }, { merge: true });
                this.logAudit('UPDATE', `User updated own profile: ${this.userProfile.email}`); this.showNotify('Your profile has been updated successfully!');
            } catch (error) { this.showNotify('Error updating profile.'); }
        },
        async handleProfilePhotoUpload(event) {
            const file = event.target.files && event.target.files[0];
            this.profilePhotoUpload.error = '';
            if (!file) return;
            if (!this.userProfile.uid) { this.profilePhotoUpload.error = 'Please sign in again before uploading a photo.'; return; }
            this.profilePhotoUpload.loading = true;
            try {
                const photoUrl = await this.prepareImageAttachment(file, 120 * 1024, 720);
                await setDoc(doc(db, 'users', this.userProfile.uid), { photo: photoUrl }, { merge: true });
                this.userProfile.photo = photoUrl;
                this.logAudit('UPDATE', 'Uploaded profile photo');
                this.showNotify('Profile photo uploaded and saved successfully.');
            } catch (error) {
                console.error('Profile photo upload failed:', error);
                this.profilePhotoUpload.error = this.getUploadErrorMessage(error);
            } finally {
                this.profilePhotoUpload.loading = false;
                event.target.value = '';
            }
        },

        openUserAccessModal(usr = null) {
            if (!this.canManageRBAC) { this.showNotify('Only Superadmin and Director can manage portal access.'); return; }
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
                if (!this.canManageRBAC) { this.showNotify('Only Superadmin and Director can manage portal access.'); return; }
                if (!this.userModal.form.name || !this.userModal.form.email || (this.userModal.isEdit === false && !this.userModal.form.password)) { alert("Please fill out all required fields."); return; }
                if (this.userModal.form.role !== 'Client' && !this.isOfficialEmail(this.userModal.form.email)) {
                    alert(`Only Client Users System Terminal may use Gmail or another external domain. This role must use @${this.officialEmailDomain}.`);
                    return;
                }

                this.userModal.form.name = this.toOfficialUppercase(this.userModal.form.name);
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
            const data = { company: this.company, employees: this.employees, customers: this.customers, docHistory: this.docHistory, payslipHistory: this.payslipHistory, claimsHistory: this.claimsHistory, projects: this.projects, projectActivities: this.projectActivities, projectClientUpdates: this.projectClientUpdates, users: this.users.map(u => ({ name: u.name, email: u.email, role: u.role })), exportDate: new Date().toISOString() };
            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", jsonStr); dlAnchorElem.setAttribute("download", `zenqor_backup_${new Date().toISOString().substr(0,10)}.json`); dlAnchorElem.click();
            this.logAudit('BACKUP', 'Exported JSON backup'); this.showNotify("Database JSON backup downloaded!");
        },

        async saveSettings() {
            if (!this.canManageCompanySettings) { this.showNotify('You do not have permission to update company settings.'); return; }
            try { this.company = this.normalizeOfficialRecord(this.company); this.company.email = String(this.company.email || '').trim().toLowerCase(); await setDoc(doc(db, "settings", "company_profile"), { ...this.company }); this.logAudit('UPDATE', 'Updated settings'); this.showNotify('Settings updated!'); } catch (error) { this.showNotify('Unable to save company settings.'); }
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
                const isNewRecord = !this.customers.some(c => c.id === docId);
                const newCust = this.normalizeOfficialRecord({ clientName: this.docForm.clientName, clientPhone: this.docForm.clientPhone, clientSSM: this.docForm.clientSSM, clientAddress: this.docForm.clientAddress, clientCity: this.docForm.clientCity, clientState: this.docForm.clientState, clientPostcode: this.docForm.clientPostcode, clientCountry: this.docForm.clientCountry, clientEmail: String(this.docForm.clientEmail || '').trim().toLowerCase(), clientContactPerson: this.docForm.clientContactPerson, clientPosition: this.docForm.clientPosition });
                if (isNewRecord) newCust.createdAt = new Date().toISOString();
                Object.assign(this.docForm, newCust);
            await setDoc(doc(db, "customers", docId), newCust, { merge: true }); this.clientSavedForDocument = true; this.logAudit(isNewRecord ? 'CREATE' : 'UPDATE', `Saved customer ${this.docForm.clientName}`); this.showNotify('Client saved. You can now add document items.'); return true;
            } catch (error) { console.error('Client save failed:', error); this.showNotify('Unable to save client information.'); return false; }
        },
        selectCustomerFromTable(cust) {
            ['clientName','clientPhone','clientSSM','clientAddress','clientCity','clientState','clientPostcode','clientCountry','clientEmail','clientContactPerson','clientPosition'].forEach(k => { this.docForm[k] = cust[k] || (k === 'clientCountry' ? 'Malaysia' : ''); });
            this.showNotify(`Client loaded.`);
        },
        openClientView(cust) {
            this.clientView.client = {
                id: cust.id || '', clientName: cust.clientName || '-', clientSSM: cust.clientSSM || '-', clientContactPerson: cust.clientContactPerson || '-',
                clientPosition: cust.clientPosition || '-', clientEmail: cust.clientEmail || '-', clientPhone: cust.clientPhone || '-',
                clientAddress: cust.clientAddress || '-', clientCity: cust.clientCity || '-', clientState: cust.clientState || '-',
                clientPostcode: cust.clientPostcode || '-', clientCountry: cust.clientCountry || '-', clientTier: cust.clientTier || 'Standard'
            };
            this.clientView.show = true;
        },
        openClientQuickViewForProject(project) {
            const customer = this.customers.find(c => c.id === project.clientDirectoryId);
            if (customer) { this.openClientView(customer); return; }
            this.openClientView({ clientName: project.clientName || 'Unknown Client', clientEmail: project.clientEmail || '' });
        },
        clientTierMeta(tier) {
            const map = {
                Priority: { label: 'Priority', badgeClass: 'bg-rose-100 text-rose-700' },
                Premium: { label: 'Premium', badgeClass: 'bg-amber-100 text-amber-700' },
                Standard: { label: 'Standard', badgeClass: 'bg-slate-100 text-slate-600' }
            };
            return map[tier] || map.Standard;
        },
        clientTierForId(clientDirectoryId) {
            const customer = this.customers.find(c => c.id === clientDirectoryId);
            return customer?.clientTier || 'Standard';
        },
        clientProjectCount(clientDirectoryId) {
            if (!clientDirectoryId) return 0;
            return this.projects.filter(p => p.clientDirectoryId === clientDirectoryId).length;
        },
        isNewClient(clientDirectoryId) {
            if (!clientDirectoryId) return false;
            const customer = this.customers.find(c => c.id === clientDirectoryId);
            if (!customer?.createdAt) return false;
            const createdMs = Date.parse(customer.createdAt);
            if (!Number.isFinite(createdMs)) return false;
            const ageMs = Date.now() - createdMs;
            return ageMs >= 0 && ageMs <= 3 * 24 * 60 * 60 * 1000;
        },
        async updateClientTier(cust, tier) {
            if (!this.canManageClients) { this.showNotify('You do not have permission to update client tier.'); return; }
            if (!cust?.id) return;
            try {
                await setDoc(doc(db, 'customers', cust.id), { clientTier: tier, updatedAt: new Date().toISOString(), updatedByUid: this.userProfile.uid }, { merge: true });
                this.logAudit('UPDATE', `Set ${tier} tier for client ${cust.clientName}`);
                this.showNotify(`${cust.clientName} tagged as ${tier} Client.`);
            } catch (error) {
                console.error('Client tier update failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'update the client tier'));
            }
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
                Object.assign(form, this.normalizeOfficialRecord(form));
                form.email = String(form.email || '').trim().toLowerCase();
                const sensitiveFields = ['ic', 'bankAcc', 'epfNo', 'socsoNo', 'eisNo', 'taxNo'];
                if (!form.empNo || !form.name || !form.dept || !form.joinDate || !form.employmentType) return alert("Complete the required Basic Information fields.");
                if (!this.employeeModal.isEdit && !form.ic) return alert("National ID / Passport is required for a new employee.");
                form.email = String(form.email || '').trim().toLowerCase();
                if (sensitiveFields.some(field => /^X{5}/i.test(String(form[field] || '').trim()))) return alert("Enter the complete sensitive number, not a masked value.");
                sensitiveFields.forEach(field => {
                    if (this.employeeModal.isEdit && !String(form[field] || '').trim()) form[field] = this.employeeModal.originalSensitive[field] || '';
                });
                const employeeId = form.empNo.trim();
                const wasEdit = this.employeeModal.isEdit;
                await setDoc(doc(db, "employees", employeeId), { ...form, empNo: employeeId });
                if (wasEdit) await this.syncEmployeeIdentityReferences({ ...form, empNo: employeeId });
                this.employeeModal.show = false; this.logAudit(wasEdit ? 'UPDATE':'CREATE', `Saved employee ${employeeId}`); this.showNotify(wasEdit ? 'Employee and linked records updated.' : 'Employee data saved!');
            } catch (error) { console.error('Employee save failed:', error); this.showNotify('Unable to save employee information.'); }
        },
        async syncEmployeeIdentityReferences(employee) {
            const employeeId = String(employee.empNo || '').trim();
            if (!employeeId) throw new Error('Employee ID is required to synchronize linked records.');

            const [claimsSnapshot, payslipsSnapshot, projectsSnapshot] = await Promise.all([
                getDocs(query(collection(db, 'claims'), where('empNo', '==', employeeId))),
                getDocs(query(collection(db, 'payslips'), where('raw.empNo', '==', employeeId))),
                getDocs(query(collection(db, 'projects'), where('ownerEmpNo', '==', employeeId)))
            ]);
            const writes = [];
            claimsSnapshot.forEach(record => writes.push({
                ref: record.ref,
                data: {
                    name: employee.name || '',
                    position: employee.position || '',
                    dept: employee.dept || '',
                    empEmail: employee.email || ''
                }
            }));
            payslipsSnapshot.forEach(record => writes.push({
                ref: record.ref,
                data: {
                    name: employee.name || '',
                    'raw.name': employee.name || '',
                    'raw.position': employee.position || '',
                    'raw.dept': employee.dept || '',
                    'raw.empEmail': employee.email || ''
                }
            }));
            projectsSnapshot.forEach(record => writes.push({
                ref: record.ref,
                data: {
                    ownerName: employee.name || '',
                    ownerEmail: String(employee.email || '').trim().toLowerCase(),
                    ownerPosition: employee.position || '',
                    ownerDepartment: employee.dept || ''
                }
            }));

            for (let start = 0; start < writes.length; start += 450) {
                const batch = writeBatch(db);
                writes.slice(start, start + 450).forEach(item => batch.update(item.ref, item.data));
                await batch.commit();
            }
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
        employeeActiveProjectAssignments(empNo) {
            return this.projects.filter(project => project.ownerEmpNo === empNo && project.status !== 'Completed & Done');
        },
        employeeActiveActivityAssignments(empNo) {
            return this.projectActivities.filter(activity => activity.assignedEmpNo === empNo && activity.status !== 'Done');
        },
        employeeHasActiveProjectWork(empNo) {
            return this.employeeActiveProjectAssignments(empNo).length > 0 || this.employeeActiveActivityAssignments(empNo).length > 0;
        },
        viewEmployeeProjectAssignments(emp) {
            this.searchQuery = emp.name || emp.empNo;
            this.projectViewMode = 'list';
            this.switchTab('project-activities');
        },
        async deleteEmployee(empNo, requiresConfirmation = true) {
            if (requiresConfirmation) {
                const employee = this.employees.find(emp => emp.empNo === empNo);
                if (employee) this.requestEmployeeAction('delete', employee);
                return;
            }
            if (!this.canDelete) { this.showNotify('Only Superadmin and Director can delete employee records.'); return; }
            const blockingProjects = this.employeeActiveProjectAssignments(empNo);
            const blockingActivities = this.employeeActiveActivityAssignments(empNo);
            if (blockingProjects.length || blockingActivities.length) {
                const parts = [];
                if (blockingProjects.length) parts.push(`Person In Charge on ${blockingProjects.length} active project(s) (${blockingProjects.slice(0, 3).map(p => p.projectRef).join(', ')}${blockingProjects.length > 3 ? '…' : ''})`);
                if (blockingActivities.length) parts.push(`assigned to ${blockingActivities.length} open activity issue(s)`);
                this.showNotify(`Cannot delete: this employee is still ${parts.join(' and ')}. Reassign in Project Activities first.`);
                return;
            }
            try {
                await deleteDoc(doc(db, "employees", empNo));
                this.logAudit('DELETE', `Deleted employee ${empNo}`);
                this.showNotify('Employee deleted.');
            } catch (error) {
                this.showNotify('Unable to delete employee.');
            }
        },
        selectEmployeeFromTable(emp) {
            this.selectedPayEmployeeId = emp.empNo || '';
            this.payForm.empNo = emp.empNo || ''; this.payForm.name = emp.name || ''; this.payForm.empEmail = emp.email || ''; this.payForm.ic = emp.ic || ''; this.payForm.dept = emp.dept || ''; this.payForm.position = emp.position || ''; this.payForm.joinDate = emp.joinDate || ''; this.payForm.bankAcc = emp.bankAcc || ''; this.payForm.isSenior = !!emp.isSenior; this.payForm.epfSocso = `KWSP: ${emp.epfNo || '-'} | PERKESO: ${emp.socsoNo || '-'}`; this.payForm.basic = emp.basicSalary || 0;
            this.autoCalculatePayroll(); this.showNotify(`Employee loaded.`);
        },
        selectEmployeeForPayslip(e) { const emp = this.employees.find(x => x.empNo === e.target.value); if (emp) this.selectEmployeeFromTable(emp); },
        selectEmployeeForClaim(e) { const emp = this.employees.find(x => x.empNo === e.target.value); if (emp) { this.claimForm.name = emp.name||''; this.claimForm.empNo = emp.empNo||''; this.claimForm.empEmail = emp.email||''; this.claimForm.position = emp.position||''; this.claimForm.dept = emp.dept||''; this.showNotify(`Applicant loaded.`); } },
        setClaimDocumentType(type) {
            this.claimForm.documentType = type;
            if (type === 'Payment Voucher' && !this.claimForm.receiptNo) this.claimForm.receiptNo = `PV-${this.currentYear}-${String(Date.now()).slice(-6)}`;
            if (type === 'Claim' && /^PV-\d{4}-\d{6}$/.test(this.claimForm.receiptNo || '')) this.claimForm.receiptNo = '';
        },

        // WORKFLOW: Staff/Client -> HR -> Account -> Director (final approval)
        canApproveClaim(clm) {
            const role = this.userProfile.role;
            if (role === 'Director') return typeof clm.status === 'string' && clm.status.startsWith('Pending');
            const expectedStatus = { HR: 'Pending HR', Account: 'Pending Account', Director: 'Pending Director' }[role];
            return !!expectedStatus && clm.status === expectedStatus && (!clm.assignedToEmail || clm.assignedToEmail === this.userProfile.email);
        },
        canEditClaim(clm) {
            return (clm.createdByUid === this.userProfile.uid || clm.empEmail === this.userProfile.email) && clm.status === 'Pending HR';
        },
        async approveClaim(clm) {
            if (!this.canApproveClaim(clm)) { this.showNotify('You do not have permission to approve this record at its current workflow stage.'); return false; }
            if (this.attachmentUploadState.director) { this.showNotify('Wait for the Director approval document upload to finish.'); return false; }
            const isDirectorDecision = this.userProfile.role === 'Director';
            const nextRole = isDirectorDecision ? null : { 'Pending HR': 'Account', 'Pending Account': 'Director' }[clm.status];
            const roleNames = { HR: 'Human Resource Management', Account: 'Finance Account Management', Director: 'Director' };
            if (isDirectorDecision && !this.claimPreview.directorApprovalAttachment) { alert('Director approval requires a supporting document attachment.'); return; }
            const bypassedReviews = clm.status === 'Pending HR' ? ['HR', 'Account'] : clm.status === 'Pending Account' ? ['Account'] : [];
            const isPaymentVoucher = (clm.documentType || clm.type) === 'Payment Voucher';
            const update = nextRole
                ? { status: `Pending ${nextRole}`, assignedToUid: '', assignedToName: roleNames[nextRole], assignedToEmail: '', assignedToRole: nextRole }
                : { status: 'Approved', finalDecision: true, settlementStatus: isPaymentVoucher ? 'Paid' : 'Approved', statusDetail: isPaymentVoucher ? 'Payment fully paid' : 'Claim fully approved', approvalPath: 'Director Direct Approval', approvalPreviousStatus: clm.status, bypassedReviews, assignedToUid: this.userProfile.uid, assignedToName: this.userProfile.name, assignedToEmail: this.userProfile.email, assignedToRole: 'Director', approvedByUid: this.userProfile.uid, approvedByName: this.userProfile.name, approvedByEmail: this.userProfile.email, approvedByRole: 'Director', approvedAt: new Date().toISOString(), directorApprovalAttachment: this.claimPreview.directorApprovalAttachment, directorApprovalAttachmentName: this.claimPreview.directorApprovalAttachmentName, directorApprovalOriginalBytes: Number(this.claimPreview.directorApprovalOriginalBytes || 0) };
            try {
                if (!nextRole && this.getSerializedSize({ ...clm, ...update }) > 800 * 1024) throw Object.assign(new Error('The combined claim record exceeds the safe Firestore size.'), { code: 'resource-exhausted' });
                await updateDoc(doc(db, "claims", clm.id), update);
                this.logAudit('UPDATE', `${clm.documentType || 'Claim'} ${clm.receiptNo} ${nextRole ? `forwarded to ${roleNames[nextRole]}` : `directly and finally approved by Director${bypassedReviews.length ? ` (bypassed ${bypassedReviews.join(' and ')})` : ''}`}`);
                this.showNotify(nextRole ? `Claim assigned to ${roleNames[nextRole]}.` : 'Director approval completed immediately. No further HR or Finance review is required.');
                return true;
            } catch (error) {
                console.error('Claim approval failed:', error);
                this.showNotify(this.getFirestoreWriteError(error, 'update the claim status'));
                return false;
            }
        },
        async approveClaimFromPreview() {
            const approved = await this.approveClaim(this.claimPreview.claim);
            if (approved) this.claimPreview.show = false;
        },
        async rejectClaim(clm) {
            if (!this.canApproveClaim(clm)) { this.showNotify('You do not have permission to reject this record at its current workflow stage.'); return; }
            if (confirm("REJECT this claim application?")) { try { await updateDoc(doc(db, "claims", clm.id), { status: 'Rejected', rejectedByUid: this.userProfile.uid, rejectedByName: this.userProfile.name, rejectedByRole: this.userProfile.role, rejectedAt: new Date().toISOString() }); this.showNotify("Claim rejected."); } catch (error) { this.showNotify('Unable to reject claim.'); } }
        },
        async saveClaimRecord() {
                if (!['Superadmin', 'Director', 'HR', 'Account', 'Staff'].includes(this.userProfile.role)) { this.showNotify('Your role cannot submit claims or payment vouchers.'); return; }
                if (this.attachmentUploadState.receipt) return alert('Wait for the receipt upload to finish.');
                Object.assign(this.claimForm, this.normalizeOfficialRecord(this.claimForm));
                this.claimForm.empEmail = String(this.claimForm.empEmail || '').trim().toLowerCase();
                if (!this.claimForm.name || !this.claimForm.empNo || !this.claimForm.amount || !this.claimForm.receiptNo || !this.claimForm.description.trim() || !this.claimForm.receiptAttachment) return alert("Complete all required claim fields, including Expense Description and Receipt Attachment.");
                if (this.claimForm.documentType === 'Payment Voucher' && (!this.claimForm.payeeName.trim() || !this.claimForm.paymentPurpose.trim())) return alert('Complete the Payee Name and Payment Purpose for this Payment Voucher.');
            try {
                const initialStatus = 'Pending HR';
                const assignee = { id: '', name: 'Human Resource Management', email: '', role: 'HR' };
                const signedInEmail = String(auth.currentUser?.email || this.userProfile.email || '').trim().toLowerCase();
                const canSubmitForOthers = ['Superadmin', 'Director', 'HR', 'Account'].includes(this.userProfile.role);
                const claimOwnerEmail = canSubmitForOthers ? String(this.claimForm.empEmail || signedInEmail).trim().toLowerCase() : signedInEmail;
                if (!auth.currentUser?.uid || !claimOwnerEmail) throw Object.assign(new Error('Your login identity is incomplete. Sign out and sign in again.'), { code: 'permission-denied' });

                const claimId = String(this.editingClaimId || Date.now());
                const documentType = this.claimForm.documentType === 'Payment Voucher' ? 'Payment Voucher' : 'Claim';
                const payload = { id: claimId, type: documentType, documentType, date: this.claimForm.expenseDate, expenseDate: this.claimForm.expenseDate, name: this.claimForm.name, empNo: this.claimForm.empNo, empEmail: claimOwnerEmail, position: this.claimForm.position || '', dept: this.claimForm.dept, payeeName: this.claimForm.payeeName || '', payeeType: this.claimForm.payeeType || '', payeeReference: this.claimForm.payeeReference || '', paymentPurpose: this.claimForm.paymentPurpose || '', category: this.claimForm.category, subCategory: this.claimForm.subCategory, amount: Number(this.claimForm.amount), receiptNo: this.claimForm.receiptNo, description: this.claimForm.description, receiptAttachment: this.claimForm.receiptAttachment, receiptAttachmentName: this.claimForm.receiptAttachmentName || '', receiptAttachmentOriginalBytes: Number(this.claimForm.receiptAttachmentOriginalBytes || 0), createdByUid: this.editingClaimId ? (this.claimForm.createdByUid || auth.currentUser.uid) : auth.currentUser.uid, createdByEmail: this.editingClaimId ? (this.claimForm.createdByEmail || signedInEmail) : signedInEmail, createdAt: this.editingClaimId ? (this.claimForm.createdAt || new Date().toISOString()) : new Date().toISOString(), status: this.editingClaimId ? (this.claimForm.status || initialStatus) : initialStatus, assignedToUid: assignee.id, assignedToName: assignee.name, assignedToEmail: assignee.email, assignedToRole: assignee.role };
                if (this.getSerializedSize(payload) > 800 * 1024) throw Object.assign(new Error('The claim record exceeds the safe Firestore size.'), { code: 'resource-exhausted' });
                await setDoc(doc(db, "claims", claimId), payload);
                this.editingClaimId = null; this.showNotify(`${documentType} submitted.`); this.resetClaimForm();
            } catch (error) { console.error('Claim save failed:', error); this.showNotify(this.getFirestoreWriteError(error, 'submit the claim')); }
        },
        editClaimRecord(clm) { this.editingClaimId = clm.id; this.selectedClaimEmployeeId = clm.empNo || ''; this.claimForm = JSON.parse(JSON.stringify(clm)); this.currentTab = 'claims'; window.scrollTo({ top:0, behavior:'smooth' }); },
        cancelEditClaim() { this.editingClaimId = null; this.resetClaimForm(); },

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
                const normalizedDocForm = this.normalizeOfficialRecord(this.docForm);
                normalizedDocForm.clientEmail = String(this.docForm.clientEmail || '').trim().toLowerCase();
                Object.assign(this.docForm, normalizedDocForm);
                const docId = String(this.editingDocId || Date.now());
                const payload = { id: docId, type: this.docForm.type, docNo: this.docForm.docNo, status: this.docForm.status || (this.docForm.type === 'Invoice' ? 'Unpaid' : 'Open'), paymentMethod: this.docForm.paymentMethod || 'Bank Transfer', paymentBank: this.docForm.paymentBank || '', paymentReceiver: this.docForm.paymentReceiver || '', paymentRefNo: this.docForm.paymentRefNo || '', paymentAttachment: this.docForm.paymentAttachment || '', date: this.docForm.date, name: this.docForm.clientName, amount: this.docGrandTotal, raw: JSON.parse(JSON.stringify(this.docForm)) };
                if (!this.clientSavedForDocument) { alert('Save Client information before saving this document.'); return false; }
                await setDoc(doc(db, "docs", docId), payload); this.editingDocId = docId; this.showNotify(`Document saved.`); return true;
            } catch (error) { console.error('Document save failed:', error); this.showNotify('Unable to save document. Check the attachment size and try again.'); return false; }
        },
        async savePayslipRecord() {
            try {
                if (!this.canManagePayroll) { this.showNotify('You do not have permission to save payslips.'); return; }
                const normalizedPayForm = this.normalizeOfficialRecord(this.payForm);
                normalizedPayForm.empEmail = String(this.payForm.empEmail || '').trim().toLowerCase();
                Object.assign(this.payForm, normalizedPayForm);
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
            this.claimPreview = { show: true, claim: JSON.parse(JSON.stringify(claim)), directorApprovalAttachment: '', directorApprovalAttachmentName: '', directorApprovalOriginalBytes: 0 };
        },
        editRecord(item) {
            if (item.isDoc) { this.editingDocId = item.id; if (item.raw) { this.docForm = JSON.parse(JSON.stringify(item.raw)); this.docForm.status = item.raw.status || item.status || (item.type === 'Invoice' ? 'Unpaid' : 'Open'); } this.currentTab = 'doc-generator'; }
            else if (item.isPay) { this.editingPayId = item.id; if (item.raw) { this.payForm = JSON.parse(JSON.stringify(item.raw)); this.selectedPayEmployeeId = this.payForm.empNo || ''; } this.autoCalculatePayroll(); this.currentTab = 'payslip-generator'; }
            else if (item.isClaim) this.editClaimRecord(item);
        },
        async confirmDeleteRecord(item) {
            if (!this.canDelete) { this.showNotify('Only Superadmin and Director can delete records.'); return; }
            if (confirm(`WARNING: Delete record?`)) {
                try { if (item.isDoc) await deleteDoc(doc(db, "docs", item.id)); else if (item.isPay) await deleteDoc(doc(db, "payslips", item.id)); else if (item.isClaim) await deleteDoc(doc(db, "claims", item.id)); this.showNotify('Record deleted.'); } catch (error) { console.error('Record deletion failed:', error); this.showNotify('Unable to delete record.'); }
            }
        },

        renderCharts() {
            if (typeof Chart === 'undefined' || !this.portalDataReady || this.currentTab !== 'dashboard' || ['Staff', 'Client'].includes(this.userProfile.role)) return;
            const revCanvas = document.getElementById('revenueChart');
            const statusCanvas = document.getElementById('statusChart');
            if (!revCanvas?.isConnected || !statusCanvas?.isConnected) { this.refreshDashboardCharts(this.chartRenderAttempts + 1); return; }
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
            this.projectActivitiesLoaded = false;
            this.projectClientUpdatesLoaded = false;

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
            const canReadAllUsers = ['Superadmin', 'Director'].includes(role);
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
            const projectsSource = role === 'Client'
                ? query(collection(db, 'projects'), where('clientEmail', '==', this.userProfile.email), where('clientPortalUid', '==', this.userProfile.uid))
                : collection(db, 'projects');
            const projectActivitiesSource = role === 'Client' ? null : collection(db, 'project_activities');
            const projectClientUpdatesSource = role === 'Client'
                ? query(collection(db, 'project_client_updates'), where('clientPortalUid', '==', this.userProfile.uid))
                : collection(db, 'project_client_updates');

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
                    ? subscribeWithReadySignal(claimsSource, (snapshot) => {
                        this.claimsHistory = snapshot.docs.map(d => this.normalizeClaimRecord({ id: d.id, ...d.data() }));
                        this.synchronizeLegacyApprovedClaims(snapshot.docs);
                    }, 'claims')
                    : Promise.resolve(),
                subscribeWithReadySignal(projectsSource, (snapshot) => { this.projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); }, 'project activities'),
                projectActivitiesSource ? subscribeWithReadySignal(projectActivitiesSource, (snapshot) => {
                    const previousIds = new Set(this.projectActivities.map(activity => activity.id));
                    this.projectActivities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    const assignedOpen = this.projectActivities.filter(activity => activity.status !== 'Done' && String(activity.assignedEmail || '').trim().toLowerCase() === String(this.userProfile.email || '').trim().toLowerCase());
                    const today = this.getLocalDateKey();
                    if (!this.projectActivitiesLoaded) {
                        const dueCount = assignedOpen.filter(activity => activity.dueDate <= today).length;
                        if (dueCount) setTimeout(() => this.showNotify(`${dueCount} assigned project activity${dueCount > 1 ? 'ies are' : ' is'} due or overdue.`), 350);
                    } else {
                        const newAssigned = assignedOpen.find(activity => !previousIds.has(activity.id));
                        if (newAssigned) this.showNotify(`New project activity assigned: ${newAssigned.summary}`);
                    }
                    this.projectActivitiesLoaded = true;
                }, 'project activity issues') : Promise.resolve(),
                subscribeWithReadySignal(projectClientUpdatesSource, (snapshot) => {
                    const previousIds = new Set(this.projectClientUpdates.map(update => update.id));
                    this.projectClientUpdates = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    if (this.projectClientUpdatesLoaded && role === 'Client') {
                        const newUpdate = this.projectClientUpdates.find(update => !previousIds.has(update.id));
                        if (newUpdate) this.showNotify(`New project update received: ${newUpdate.projectRef}`);
                    }
                    this.projectClientUpdatesLoaded = true;
                }, 'Client activity history'),
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
                if (this.isLoggedIn && this.userProfile.uid === firebaseUser.uid) { this.authLoading = false; return; }
                try {
                    this.loginLoading = true;
                    const userData = await this.loadOrMigrateUserMetadata(firebaseUser);
                    const isSeedAdmin = firebaseUser.email === 'admin@zenq0r.com';

                    if (!userData && !isSeedAdmin) {
                        this.loginError = 'This account is not provisioned or your access has been revoked. Contact your administrator.';
                        await signOut(auth);
                        return;
                    }

                    let role = userData?.role || 'Staff';
                    let name = userData?.name || firebaseUser.displayName || firebaseUser.email;
                    let photo = userData?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1E36&color=D4AF37`;
                    const mustChangePassword = userData?.mustChangePassword === true;
                    if (isSeedAdmin) role = 'Superadmin';
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
                this.projects = [];
                this.projectActivities = [];
                this.projectClientUpdates = [];
                this.projectActivitiesLoaded = false;
                this.projectClientUpdatesLoaded = false;
                this.employees = [];
                this.customers = [];
                this.docHistory = [];
                this.payslipHistory = [];
                this.claimsHistory = [];
                this.users = [];
                this.auditLogs = [];
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
