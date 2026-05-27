const fs = require("fs");

const filePath = "pages/leads.html";

if (!fs.existsSync(filePath)) {
  console.error("? pages/leads.html not found. Run this from your CASAVIOLA-CRM root folder.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

function replaceOnce(oldText, newText, label) {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    console.log("? " + label);
  } else {
    console.log("?? Skipped: " + label + " — exact text not found.");
  }
}

// 1. Add finance validation helper functions after the status group constants
const marker = `const LOST_STATUSES    = ['not_interested','lost'];`;

const helperCode = `const LOST_STATUSES    = ['not_interested','lost'];

// -- Finance / validation checks --
// These checks read the REAL subcollections instead of trusting only lead.invoiceIssued.
async function getDealValidationStatus(leadId) {
  const [invoiceSnap, receiptSnap, docSnap, ledgerSnap] = await Promise.all([
    getDocs(collection(db, 'leads', leadId, 'invoices')),
    getDocs(collection(db, 'leads', leadId, 'receipts')),
    getDocs(collection(db, 'leads', leadId, 'documents')),
    getDocs(collection(db, 'leads', leadId, 'ledger')),
  ]);

  const hasInvoice = !invoiceSnap.empty;
  const invoiceId  = hasInvoice ? invoiceSnap.docs[0].id : null;

  const receipts = receiptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const docs     = docSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const ledger   = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const hasReceipt = receipts.length > 0;
  const hasFinalReceipt = receipts.some(r => r.status === 'final' || !!r.fileUrl);
  const hasDocuments = docs.length > 0;
  const hasPayment = ledger.some(e => e.type === 'income' && Number(e.amount || 0) > 0);

  return {
    hasInvoice,
    invoiceId,
    hasReceipt,
    hasFinalReceipt,
    hasDocuments,
    hasPayment,
    invoiceCount: invoiceSnap.size,
    receiptCount: receiptSnap.size,
    documentCount: docSnap.size,
    paymentCount: ledger.filter(e => e.type === 'income').length,
  };
}

function missingValidationItems(checks) {
  const missing = [];

  if (!checks.hasInvoice) missing.push('Invoice');
  if (!checks.hasPayment) missing.push('Payment record / ledger entry');
  if (!checks.hasReceipt) missing.push('Receipt');
  if (!checks.hasDocuments) missing.push('Uploaded deal documents');

  return missing;
}

function validationChecklistHtml(checks) {
  const item = (ok, label, extra = '') => \`
    <div class="detail-cell">
      <div class="detail-label">\${label}</div>
      <div class="detail-value" style="color:\${ok ? 'var(--green)' : 'var(--coral)'}">
        \${ok ? '? Complete' : '? Missing'} \${extra ? '<span style="color:var(--muted);font-size:11px">· ' + extra + '</span>' : ''}
      </div>
    </div>\`;

  return \`
    <div class="detail-section">
      <div class="detail-section-title">Validation Checklist</div>
      <div class="detail-grid">
        \${item(checks.hasInvoice, 'Invoice', checks.invoiceCount ? checks.invoiceCount + ' found' : '')}
        \${item(checks.hasPayment, 'Payment', checks.paymentCount ? checks.paymentCount + ' recorded' : '')}
        \${item(checks.hasReceipt, 'Receipt', checks.receiptCount ? checks.receiptCount + ' generated' : '')}
        \${item(checks.hasDocuments, 'Documents', checks.documentCount ? checks.documentCount + ' uploaded' : '')}
      </div>
    </div>\`;
}

async function enrichLeadsWithFinanceStatus() {
  for (const lead of allLeads) {
    try {
      const checks = await getDealValidationStatus(lead.id);

      lead.invoiceIssued = checks.hasInvoice;
      lead.invoiceId = checks.invoiceId || lead.invoiceId || null;

      lead.hasReceipt = checks.hasReceipt;
      lead.hasPayment = checks.hasPayment;
      lead.hasDocuments = checks.hasDocuments;
      lead.validationChecks = checks;
    } catch (e) {
      console.warn('Could not load finance status for lead:', lead.id, e);
    }
  }
}`;

if (content.includes("async function getDealValidationStatus")) {
  console.log("?? Skipped: validation helper functions already exist.");
} else {
  replaceOnce(marker, helperCode, "Added finance validation helper functions");
}


// 2. Make loadLeads check invoice/receipt/document subcollections before rendering
replaceOnce(
`    updateStats();
    renderTable();`,
`    await enrichLeadsWithFinanceStatus();

    updateStats();
    renderTable();`,
"Updated loadLeads to enrich invoice/receipt/document status"
);


// 3. Add validation checklist display inside closed_pending section
replaceOnce(
`    if (l.status === 'closed_pending') {
      html += \`<div class="alert-box alert-amber">? Deal closed. CS must upload documents. Finance must complete receipts. Admin to validate.</div>\`;
      if (isAdmin) {
        html += \`<button class="btn btn-green" style="width:100%;justify-content:center;margin-top:8px" onclick="validateDeal()">? Validate Deal</button>\`;
      }
    }`,
`    if (l.status === 'closed_pending') {
      html += \`<div class="alert-box alert-amber">? Deal closed. CS must upload documents. Finance must complete receipts. Admin to validate.</div>\`;

      if (l.validationChecks) {
        html += validationChecklistHtml(l.validationChecks);
      } else {
        html += \`<div class="alert-box alert-amber">Validation checklist will load after refreshing this lead.</div>\`;
      }

      if (isAdmin) {
        html += \`<button class="btn btn-green" style="width:100%;justify-content:center;margin-top:8px" onclick="validateDeal()">? Validate Deal</button>\`;
      }
    }`,
"Added validation checklist to closed_pending section"
);


// 4. Replace closeDeal so it checks the REAL invoice subcollection first
replaceOnce(
`window.closeDeal = async () => {
  if (!selectedLead) return;
  if (!selectedLead.invoiceIssued) { alert('Invoice must be issued by Finance before closing.'); return; }
  if (!confirm('Close this deal? It will move to Closed Pending and await documents and validation.')) return;
  await updateDoc(doc(db,'leads',selectedLead.id), { status: 'closed_pending', updatedAt: serverTimestamp() });
  await logActivity('Deal closed — moved to Closed Pending');
  // Notify admin
  await notifyAdmins(\`\${currentName} closed a deal — \${selectedLead.clientName} · \${selectedLead.propTitle}\`);
  selectedLead.status = 'closed_pending';
  syncLead(selectedLead.id, { status: 'closed_pending' });
  refreshDetail();
};`,
`window.closeDeal = async () => {
  if (!selectedLead) return;

  const checks = await getDealValidationStatus(selectedLead.id);

  if (!checks.hasInvoice) {
    alert('Invoice must be issued by Finance before closing this deal.');
    return;
  }

  if (!confirm('Close this deal? It will move to Closed Pending and await documents and validation.')) return;

  await updateDoc(doc(db,'leads',selectedLead.id), {
    status: 'closed_pending',
    invoiceIssued: true,
    invoiceId: checks.invoiceId || selectedLead.invoiceId || null,
    updatedAt: serverTimestamp()
  });

  await logActivity('Deal closed — moved to Closed Pending');

  await notifyAdmins(\`\${currentName} closed a deal — \${selectedLead.clientName} · \${selectedLead.propTitle}\`);

  selectedLead.status = 'closed_pending';
  selectedLead.invoiceIssued = true;
  selectedLead.invoiceId = checks.invoiceId || selectedLead.invoiceId || null;
  selectedLead.validationChecks = checks;

  syncLead(selectedLead.id, {
    status: 'closed_pending',
    invoiceIssued: true,
    invoiceId: selectedLead.invoiceId,
    validationChecks: checks
  });

  refreshDetail();
};`,
"Replaced closeDeal with real invoice check"
);


// 5. Replace validateDeal so it blocks validation unless requirements are complete
replaceOnce(
`window.validateDeal = async () => {
  if (!selectedLead) return;
  if (!confirm('Validate this deal? This is permanent and cannot be undone.')) return;
  await updateDoc(doc(db,'leads',selectedLead.id), { status: 'closed_validated', validatedBy: currentUser.uid, validatedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await logActivity('Deal validated by admin ?');
  selectedLead.status = 'closed_validated';
  syncLead(selectedLead.id, { status: 'closed_validated' });
  refreshDetail();
};`,
`window.validateDeal = async () => {
  if (!selectedLead) return;

  const checks = await getDealValidationStatus(selectedLead.id);
  const missing = missingValidationItems(checks);

  selectedLead.validationChecks = checks;
  syncLead(selectedLead.id, { validationChecks: checks });

  if (missing.length > 0) {
    alert(
      'This deal cannot be validated yet.\\n\\nMissing:\\n- ' +
      missing.join('\\n- ')
    );
    refreshDetail();
    return;
  }

  if (!confirm('Validate this deal? This is permanent and cannot be undone.')) return;

  await updateDoc(doc(db,'leads',selectedLead.id), {
    status: 'closed_validated',
    invoiceIssued: true,
    invoiceId: checks.invoiceId || selectedLead.invoiceId || null,
    validationChecklist: checks,
    validatedBy: currentUser.uid,
    validatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await logActivity('Deal validated by admin ?');

  selectedLead.status = 'closed_validated';
  selectedLead.invoiceIssued = true;
  selectedLead.invoiceId = checks.invoiceId || selectedLead.invoiceId || null;
  selectedLead.validationChecks = checks;

  syncLead(selectedLead.id, {
    status: 'closed_validated',
    invoiceIssued: true,
    invoiceId: selectedLead.invoiceId,
    validationChecks: checks
  });

  refreshDetail();
};`,
"Replaced validateDeal with validation gate"
);

fs.writeFileSync(filePath, content, "utf8");

console.log("\\n? pages/leads.html patched successfully.");
console.log("Next: firebase.cmd deploy --only hosting");
