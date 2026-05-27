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
    console.log("?? Skipped: " + label + " — pattern not found or already updated.");
  }
}

// 1. Add invoice rules if not already present
const invoiceRules = `

    // ---------------------------------------------
    // LEAD INVOICES (subcollection)
    // Finance, Admin, CEO can create/manage invoices
    // Other staff can read invoices for deal visibility
    // ---------------------------------------------

    match /leads/{leadId}/invoices/{invoiceId} {
      allow read: if isSignedIn()
                  && (
                    isAdmin()
                    || isCEO()
                    || isFinance()
                    || isCS()
                    || isAgent()
                    || isListings()
                  );

      allow create: if isAdmin() || isCEO() || isFinance();

      allow update: if isAdmin() || isCEO() || isFinance();

      allow delete: if isAdmin();
    }
`;

if (!content.includes("match /leads/{leadId}/invoices/{invoiceId}")) {
  content = content.replace(/\n\s*}\s*}\s*$/, `${invoiceRules}\n  }\n}\n`);
  console.log("? Added invoice rules");
} else {
  console.log("?? Skipped: invoice rules already exist.");
}


// 2. Replace old leads update rule with invoice/pricing-aware rule
const oldRule = `      allow update: if isAdmin()
                    // Agents update their own agent leads (cannot validate)
                    || (isAgent()
                        && resource.data.createdBy == request.auth.uid
                        && resource.data.leadType == 'agent'
                        && request.resource.data.status != 'closed_validated')
                    // Listings update company leads (cannot validate)
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated');`;

const newRule = `      allow update: if isAdmin()

                    // CEO/GM can update final deal price fields,
                    // but cannot directly change deal status here.
                    || (isCEO()
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny(['status']))

                    // Agents update their own agent leads,
                    // but cannot validate or change agreed price.
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

                    // Listings update company leads,
                    // but cannot validate or change final agreed deal price.
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny([
                             'agreedAmount',
                             'agreedPrice',
                             'priceOverride'
                           ]))

                    // Finance can update invoice/payment-related fields only.
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

replaceOnce(oldRule, newRule, "Updated leads update rule for invoice/pricing workflow");

fs.writeFileSync(filePath, content, "utf8");

console.log("\n? firestore.rules updated successfully.");
console.log("Next: firebase.cmd deploy --only firestore:rules");
