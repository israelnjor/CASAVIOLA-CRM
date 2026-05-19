// js/utils.js
import { db, auth } from './firebase-config.js';

import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ─────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────
export const ROLES = [
  { value: 'admin',    label: 'Admin (Operations Manager)' },
  { value: 'agent',    label: 'Agent' },
  { value: 'listings', label: 'Listings Management' },
  { value: 'cs',       label: 'Customer Service' },
  { value: 'finance',  label: 'Finance' },
  { value: 'ceo',      label: 'CEO / GM' },
];

export const ROLE_LABELS = {
  admin:    'Admin',
  agent:    'Agent',
  listings: 'Listings',
  cs:       'Customer Service',
  finance:  'Finance',
  ceo:      'CEO / GM',
};

export const ROLES_WITH_REFERRAL = ['agent'];


// ─────────────────────────────────────────────
// GENERATE REFERRAL CODE
// Format: XX-XXXX  e.g. "IS-A3F9"
// ─────────────────────────────────────────────
export function generateReferralCode(name) {
  const prefix = name.trim().substring(0, 2).toUpperCase();
  const rand   = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}


// ─────────────────────────────────────────────
// CREATE STAFF USER
// ─────────────────────────────────────────────
export async function createStaffUser({ name, email, password, role }, adminEmail, adminPassword) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData = {
      uid,
      name,
      email,
      role,
      isActive:     true,
      referralCode: null,
      createdAt:    serverTimestamp(),
    };

    await setDoc(doc(db, 'users', uid), userData);

    await sendPasswordResetEmail(auth, email);
    await signOut(auth);
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

    return { success: true, uid };

  } catch (error) {
    console.error('createStaffUser error:', error);

    try {
      if (auth.currentUser?.email !== adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }
    } catch (restoreError) {
      console.error('Could not restore admin session:', restoreError);
    }

    return { success: false, error: error.message, code: error.code };
  }
}


// ─────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────
export function formatDate(timestamp) {
  if (!timestamp) return '—';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatGHS(amount) {
  return 'GHS ' + Number(amount || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}


// ─────────────────────────────────────────────
// LOG LEAD ACTIVITY
// ─────────────────────────────────────────────
export async function logLeadActivity(leadId, note, byName) {
  const user = auth.currentUser;

  if (!user) throw new Error('No authenticated user found.');

  await updateDoc(doc(db, 'leads', leadId), {
    activityLog: arrayUnion({
      note,
      by:        user.uid,
      byName:    byName || '',
      timestamp: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  });
}


// ─────────────────────────────────────────────
// FINANCE / PAYMENT LEDGER HELPERS
// ─────────────────────────────────────────────

export const PAYMENT_MODES = [
  'Cash',
  'Mobile Money',
  'Bank Transfer',
  'Cheque',
  'Other'
];

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PART_PAYMENT: 'part_payment',
  FULLY_PAID: 'fully_paid',
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  part_payment: 'Part Payment',
  fully_paid: 'Fully Paid',
};


// Generate receipt number
// Example: CVR-2026-0001
export function generateReceiptNumber(sequenceNumber = 1) {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(4, '0');
  return `CVR-${year}-${padded}`;
}


// Calculate payment summary from payment entries
export function calculatePaymentSummary(payments = [], agreedAmount = 0) {
  const totalPaid = payments.reduce((sum, payment) => {
    return sum + Number(payment.amountPaid || payment.amount || 0);
  }, 0);

  const balance = Math.max(Number(agreedAmount || 0) - totalPaid, 0);

  let paymentStatus = PAYMENT_STATUS.UNPAID;

  if (totalPaid > 0 && balance > 0) {
    paymentStatus = PAYMENT_STATUS.PART_PAYMENT;
  }

  if (Number(agreedAmount || 0) > 0 && balance <= 0) {
    paymentStatus = PAYMENT_STATUS.FULLY_PAID;
  }

  return {
    agreedAmount: Number(agreedAmount || 0),
    totalPaid,
    balance,
    paymentStatus,
  };
}


// Set or update agreed amount on a deal/lead
export async function setDealAgreedAmount(leadId, agreedAmount) {
  if (!leadId) throw new Error('Lead ID is required.');

  const amount = Number(agreedAmount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Please enter a valid agreed amount.');
  }

  const payments = await getDealPayments(leadId);
  const summary = calculatePaymentSummary(payments, amount);

  await updateDoc(doc(db, 'leads', leadId), {
    agreedAmount: summary.agreedAmount,
    totalPaid: summary.totalPaid,
    balance: summary.balance,
    paymentStatus: summary.paymentStatus,
    updatedAt: serverTimestamp(),
  });

  return summary;
}


// Get all payments for a deal
export async function getDealPayments(leadId) {
  if (!leadId) throw new Error('Lead ID is required.');

  const paymentsRef = collection(db, 'leads', leadId, 'payments');
  const q = query(paymentsRef, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);

  return snap.docs.map(paymentDoc => ({
    id: paymentDoc.id,
    ...paymentDoc.data()
  }));
}


// Add a payment to a deal
export async function addDealPayment({
  leadId,
  amountPaid,
  paymentMode,
  paymentDate,
  paymentTime,
  transactionRef,
  notes,
  recordedBy,
  recordedByName,
}) {
  if (!leadId) throw new Error('Lead ID is required.');

  const amount = Number(amountPaid);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Please enter a valid payment amount.');
  }

  if (!paymentMode) {
    throw new Error('Please select a payment mode.');
  }

  const leadSnap = await getDoc(doc(db, 'leads', leadId));

  if (!leadSnap.exists()) {
    throw new Error('Deal not found.');
  }

  const leadData = leadSnap.data();
  const agreedAmount = Number(leadData.agreedAmount || 0);

  const existingPayments = await getDealPayments(leadId);
  const receiptNumber = generateReceiptNumber(existingPayments.length + 1);

  const paymentData = {
    amountPaid: amount,
    paymentMode,
    paymentDate: paymentDate || '',
    paymentTime: paymentTime || '',
    transactionRef: transactionRef || '',
    notes: notes || '',
    recordedBy: recordedBy || auth.currentUser?.uid || '',
    recordedByName: recordedByName || '',
    approvedBy: null,
    approvedByName: null,
    approvalStatus: 'pending',
    receiptNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const paymentRef = await addDoc(
    collection(db, 'leads', leadId, 'payments'),
    paymentData
  );

  const updatedPayments = [
    ...existingPayments,
    {
      id: paymentRef.id,
      ...paymentData,
      createdAt: new Date()
    }
  ];

  const summary = calculatePaymentSummary(updatedPayments, agreedAmount);

  await updateDoc(doc(db, 'leads', leadId), {
    totalPaid: summary.totalPaid,
    balance: summary.balance,
    paymentStatus: summary.paymentStatus,
    updatedAt: serverTimestamp(),
  });

  await logLeadActivity(
    leadId,
    `Payment recorded: ${formatGHS(amount)} via ${paymentMode}. Receipt No: ${receiptNumber}`,
    recordedByName || ''
  );

  return {
    success: true,
    paymentId: paymentRef.id,
    receiptNumber,
    summary,
  };
}


// Approve a payment entry
export async function approveDealPayment({
  leadId,
  paymentId,
  approvedBy,
  approvedByName,
}) {
  if (!leadId || !paymentId) {
    throw new Error('Lead ID and payment ID are required.');
  }

  await updateDoc(doc(db, 'leads', leadId, 'payments', paymentId), {
    approvalStatus: 'approved',
    approvedBy: approvedBy || auth.currentUser?.uid || '',
    approvedByName: approvedByName || '',
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logLeadActivity(
    leadId,
    `Payment approved by ${approvedByName || 'Finance/Admin'}.`,
    approvedByName || ''
  );

  return { success: true };
}


// Build receipt data from one payment entry
export async function buildReceiptData(leadId, paymentId) {
  if (!leadId || !paymentId) {
    throw new Error('Lead ID and payment ID are required.');
  }

  const [leadSnap, paymentSnap] = await Promise.all([
    getDoc(doc(db, 'leads', leadId)),
    getDoc(doc(db, 'leads', leadId, 'payments', paymentId)),
  ]);

  if (!leadSnap.exists()) throw new Error('Deal not found.');
  if (!paymentSnap.exists()) throw new Error('Payment not found.');

  const lead = { id: leadSnap.id, ...leadSnap.data() };
  const payment = { id: paymentSnap.id, ...paymentSnap.data() };

  return {
    receiptNumber: payment.receiptNumber || '',
    clientName: lead.clientName || '',
    clientPhone: lead.clientPhone || '',
    propertyTitle: lead.propTitle || lead.propertyTitle || '',
    propertyLocation: lead.propLocation || '',
    agentName: lead.agentName || '',
    amountPaid: payment.amountPaid || 0,
    paymentMode: payment.paymentMode || '',
    paymentDate: payment.paymentDate || '',
    paymentTime: payment.paymentTime || '',
    transactionRef: payment.transactionRef || '',
    notes: payment.notes || '',
    totalPaid: lead.totalPaid || 0,
    agreedAmount: lead.agreedAmount || 0,
    balance: lead.balance || 0,
    paymentStatus: lead.paymentStatus || PAYMENT_STATUS.UNPAID,
    recordedByName: payment.recordedByName || '',
    approvedByName: payment.approvedByName || '',
    approvalStatus: payment.approvalStatus || 'pending',
  };
}


// Create receipt document under a deal
export async function createReceiptDocument({
  leadId,
  paymentId,
  receiptNumber,
  fileUrl = null,
  generatedBy,
  generatedByName,
}) {
  if (!leadId || !paymentId) {
    throw new Error('Lead ID and payment ID are required.');
  }

  const receiptData = {
    paymentId,
    receiptNumber,
    fileUrl,
    status: fileUrl ? 'final' : 'draft',
    generatedBy: generatedBy || auth.currentUser?.uid || '',
    generatedByName: generatedByName || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const receiptRef = await addDoc(
    collection(db, 'leads', leadId, 'receipts'),
    receiptData
  );

  return {
    success: true,
    receiptId: receiptRef.id,
    receiptData
  };
}


// Refresh lead payment summary after changes
export async function refreshDealPaymentSummary(leadId) {
  if (!leadId) throw new Error('Lead ID is required.');

  const leadSnap = await getDoc(doc(db, 'leads', leadId));

  if (!leadSnap.exists()) {
    throw new Error('Deal not found.');
  }

  const lead = leadSnap.data();
  const payments = await getDealPayments(leadId);

  const summary = calculatePaymentSummary(payments, Number(lead.agreedAmount || 0));

  await updateDoc(doc(db, 'leads', leadId), {
    totalPaid: summary.totalPaid,
    balance: summary.balance,
    paymentStatus: summary.paymentStatus,
    updatedAt: serverTimestamp(),
  });

  return summary;
}


// ─────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────
export const Permissions = {
  canManageUsers:      (role) => ['admin'].includes(role),
  canManageProperties: (role) => ['admin','listings'].includes(role),
  canCreateLeads:      (role) => ['admin','agent','listings'].includes(role),
  canViewAllLeads:     (role) => ['admin','ceo','cs','finance'].includes(role),
  canManageClients:    (role) => ['admin','agent','cs'].includes(role),
  canViewAllClients:   (role) => ['admin','ceo','listings','cs','finance'].includes(role),
  canUploadDocuments:  (role) => ['cs'].includes(role),
  canValidateDeals:    (role) => ['admin'].includes(role),
  canDeleteMessages:   (role) => ['admin'].includes(role),
  canPinMessages:      (role) => ['admin','ceo'].includes(role),
  isAdminOrCEO:        (role) => ['admin','ceo'].includes(role),

  // Finance permissions
  canAccessFinance:    (role) => ['admin','ceo','finance'].includes(role),
  canSetAgreedAmount:  (role) => ['admin','finance'].includes(role),
  canRecordPayments:   (role) => ['admin','finance'].includes(role),
  canApprovePayments:  (role) => ['admin','finance'].includes(role),
  canGenerateReceipts: (role) => ['admin','finance'].includes(role),
  canViewPayments:     (role) => ['admin','ceo','finance','agent','listings'].includes(role),
};