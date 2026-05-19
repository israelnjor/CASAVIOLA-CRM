const fs = require("fs");

const filePath = "firestore.rules";

if (!fs.existsSync(filePath)) {
  console.error("? firestore.rules not found. Run this from your CASAVIOLA-CRM root folder.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

function replaceOnce(oldText, newText, label) {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    console.log("? " + label);
  } else {
    console.log("?? Skipped: " + label + " — pattern not found or already changed.");
  }
}

// 1. Add finance role helper
replaceOnce(
`    function isCS()       { return isSignedIn() && userRole() == 'cs'; }`,
`    function isCS()       { return isSignedIn() && userRole() == 'cs'; }
    function isFinance()  { return isSignedIn() && userRole() == 'finance'; }`,
"Added isFinance() helper"
);

// 2. Let finance read leads
// Existing line likely says: allow read: if isSignedIn();
console.log("?? Leads already use allow read: if isSignedIn(); so Finance can already read leads if signed in.");

// 3. Add finance subcollection rules before final closing braces
const ledgerRules = `

    // ---------------------------------------------
    // LEAD PAYMENTS / LEDGER (subcollection under leads)
    // Finance manages payment entries per deal
    // ---------------------------------------------

    match /leads/{leadId}/payments/{paymentId} {
      // Finance, Admin, CEO can read payment records
      allow read: if isSignedIn()
                  && (isAdmin() || isCEO() || isFinance());

      // Finance and Admin can create payment entries
      allow create: if (isFinance() || isAdmin())
                    && request.resource.data.recordedBy == request.auth.uid;

      // Finance and Admin can update payment entries / approvals
      allow update: if isFinance() || isAdmin();

      // Only Admin can delete payment entries
      allow delete: if isAdmin();
    }


    // ---------------------------------------------
    // LEAD LEDGER (legacy/support path)
    // Keep this only because finance.html may still use /ledger
    // ---------------------------------------------

    match /leads/{leadId}/ledger/{entryId} {
      // Finance, Admin, CEO can read
      allow read: if isSignedIn()
                  && (isAdmin() || isCEO() || isFinance());

      // Finance and Admin can create entries
      allow create: if (isFinance() || isAdmin())
                    && request.resource.data.createdBy == request.auth.uid;

      // Finance and Admin can update entries
      allow update: if isFinance() || isAdmin();

      // Only Admin can delete ledger entries
      allow delete: if isAdmin();
    }


    // ---------------------------------------------
    // LEAD RECEIPTS (subcollection under leads)
    // Finance generates and uploads receipts per deal
    // ---------------------------------------------

    match /leads/{leadId}/receipts/{receiptId} {
      // Finance, Admin, CEO, and CS can read receipts
      allow read: if isSignedIn()
                  && (isAdmin() || isCEO() || isFinance() || isCS());

      // Finance and Admin can create receipts
      allow create: if (isFinance() || isAdmin())
                    && request.resource.data.generatedBy == request.auth.uid;

      // Finance and Admin can update draft/final receipt records
      allow update: if isFinance() || isAdmin();

      // Only Admin can delete receipts
      allow delete: if isAdmin();
    }
`;

if (!content.includes("match /leads/{leadId}/payments/{paymentId}")) {
  content = content.replace(/\n\s*}\s*}\s*$/, `${ledgerRules}\n  }\n}\n`);
  console.log("? Added finance payment/ledger/receipt rules");
} else {
  console.log("?? Skipped: finance payment rules already exist.");
}

fs.writeFileSync(filePath, content, "utf8");

console.log("\\n? firestore.rules updated successfully.");
console.log("Next: run firebase.cmd deploy --only firestore:rules");
