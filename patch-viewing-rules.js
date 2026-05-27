const fs = require("fs");

const filePath = "firestore.rules";

if (!fs.existsSync(filePath)) {
  console.error("? firestore.rules not found. Run this from your CASAVIOLA-CRM root folder.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const oldRule = `      allow update: if isAdmin()
                    // Admin/CEO can update agreedPrice and priceOverride
                    || (isCEO()
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status']))
                    // Agents update their own agent leads (cannot validate, cannot change agreedPrice)
                    || (isAgent()
                        && resource.data.createdBy == request.auth.uid
                        && resource.data.leadType == 'agent'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['agreedPrice','priceOverride']))
                    // Listings update company leads (cannot validate, cannot change agreedPrice)
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['agreedPrice','priceOverride']))
                    // Finance can update invoiceIssued flag and paymentPlan on lead
                    || (isFinance()
                        && request.resource.data.diff(resource.data).affectedKeys()
                           .hasOnly(['invoiceIssued','invoiceId','paymentPlan','agreedPrice',
                                     'totalPaid','balanceDue','paymentPlanSetBy','paymentPlanSetAt']));`;

const newRule = `      allow update: if isAdmin()
                    // CEO can update everything except status changes
                    || (isCEO()
                        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status']))

                    // Agents update own agent leads:
                    // - Can schedule viewing, update viewing outcome, move to negotiation/lost
                    // - Cannot validate
                    // - Cannot change agreed price
                    // - Cannot jump straight to closed_pending
                    || (isAgent()
                        && resource.data.createdBy == request.auth.uid
                        && resource.data.leadType == 'agent'
                        && request.resource.data.status != 'closed_validated'
                        && request.resource.data.status != 'closed_pending'
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny(['agreedPrice','agreedAmount','priceOverride']))

                    // Listings update company leads:
                    // - Can schedule viewing, update viewing outcome, move to negotiation/lost
                    // - Cannot validate
                    // - Cannot change agreed price
                    || (isListings()
                        && resource.data.leadType == 'company'
                        && request.resource.data.status != 'closed_validated'
                        && !request.resource.data.diff(resource.data)
                           .affectedKeys().hasAny(['agreedPrice','agreedAmount','priceOverride']))

                    // Finance updates invoice and payment fields only
                    || (isFinance()
                        && request.resource.data.diff(resource.data).affectedKeys()
                           .hasOnly([
                             'invoiceIssued',
                             'invoiceId',
                             'paymentPlan',
                             'agreedPrice',
                             'agreedAmount',
                             'totalPaid',
                             'balance',
                             'balanceDue',
                             'paymentStatus',
                             'paymentPlanSetBy',
                             'paymentPlanSetAt',
                             'updatedAt'
                           ]));`;

if (content.includes(oldRule)) {
  content = content.replace(oldRule, newRule);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("? Firestore viewing workflow rules fused successfully.");
} else {
  console.log("?? Exact old rule not found.");
  console.log("Your firestore.rules may already be updated or the spacing/comments differ.");
  console.log("Send the current firestore.rules file if you want me to fuse it manually.");
}

console.log("\nNext command:");
console.log("firebase.cmd deploy --only firestore:rules");
