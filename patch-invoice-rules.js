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

// ---------------------------------------------
// 1. Add LEAD INVOICES rules
// ---------------------------------------------

const invoiceRules = `

    // ---------------------------------------------
    // LEAD INVOICES (subcollection)
    // Invoice records generated for a deal
    // ---------------------------------------------

    match /leads/{leadId}/invoices/{invoiceId} {
      // Staff involved in the deal process can read invoices
      allow read: if isSignedIn()
                  && (
                    isAdmin()
                    || isCEO()
                    || isFinance()
                    || isCS()
                    || isAgent()
                    || isListings()
                  );

      // Finance, Admin, and CEO can create invoices
      allow create: if isFinance() || isAdmin() || isCEO();

      // Finance, Admin, and CEO can update invoice records
      allow update: if isFinance() || isAdmin() || isCEO();

      // Only Admin can delete invoices
      allow delete: if isAdmin();
    }
`;

if (!content.includes("match /leads/{leadId}/invoices/{invoiceId}")) {
  content = content.replace(/\n\s*}\s*}\s*$/, `${invoiceRules}\n  }\n}\n`);
  console.log("? Added invoice rules");
} else {
  console.log("?? Skipped: invoice rules already exist.");
}


// ---------------------------------------------
// 2. Update LEADS update rule
// IMPORTANT:
// This version uses agreedAmount, because your utils.js uses agreedAmount.
// If Claude's file uses agreedPrice, choose one naming style and keep it consistent.
// ---------------------------------------------

const oldLeadsUpdateRule = `      allow update: if isAdmin()
                    // Agents update their own agent leads (cannot validate)
                    || (isAgent()
                        && resource.data.createdBy == request.auth.uid
                        && resource.data.leadType == 'agent'
                        && request.resource.data.status != 'closed_validated')
                    // Listings update company leads (cannot validate)
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated');`;

const newLeadsUpdateRule = `      allow update: if isAdmin()
                    // CEO/GM can approve or adjust final deal price, but not directly change status here
                    || (isCEO()
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny(['status']))

                    // Agents update their own agent leads, but cannot validate or change final agreed price
                    || (isAgent()
                        && resource.data.createdBy == request.auth.uid
                        && resource.data.leadType == 'agent'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny([
                             'agreedAmount',
                             'agreedPrice',
                             'priceOverride',
                             'propertyDefaultPrice'
                           ]))

                    // Listings update company leads, but cannot validate or change final agreed deal price
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny([
                             'agreedAmount',
                             'agreedPrice',
                             'priceOverride'
                           ]))

                    // Finance can update invoice/payment-related fields only
                    || (isFinance()
                        && request.resource.data.diff(resource.data)
                           .affectedKeys().hasOnly([
                             'invoiceIssued',
                             'invoiceId',
                             'paymentPlan',
                             'agreedAmount',
                             'agreedPrice',
                             'totalPaid',
                             'balance',
                             'balanceDue',
                             'paymentStatus',
                             'paymentPlanSetBy',
                             'paymentPlanSetAt',
                             'updatedAt'
                           ]));`;

replaceOnce(oldLeadsUpdateRule, newLeadsUpdateRule, "Updated leads update rule for invoices/pricing");

fs.writeFileSync(filePath, content, "utf8");

console.log("\\n? firestore.rules updated successfully.");
console.log("Next: run firebase.cmd deploy --only firestore:rules");
