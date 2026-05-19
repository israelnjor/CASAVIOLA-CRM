const fs = require("fs");

const filePath = "pages/users.html";

if (!fs.existsSync(filePath)) {
  console.error("? pages/users.html not found. Run this from your CASAVIOLA-CRM root folder.");
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

// Add finance to create role dropdown
replaceOnce(
`        <option value="">Select a role...</option>
        <option value="agent">Agent</option>
        <option value="listings">Listings Management</option>
        <option value="cs">Customer Service</option>
        <option value="admin">Admin (Operations Manager)</option>
        <option value="ceo">CEO / GM</option>`,
`        <option value="">Select a role...</option>
        <option value="agent">Agent</option>
        <option value="listings">Listings Management</option>
        <option value="cs">Customer Service</option>
        <option value="finance">Finance</option>
        <option value="admin">Admin (Operations Manager)</option>
        <option value="ceo">CEO / GM</option>`,
"Added Finance to create role dropdown"
);

// Add finance to role filter
replaceOnce(
`        <option value="cs">Customer Service</option>
        <option value="ceo">CEO / GM</option>`,
`        <option value="cs">Customer Service</option>
        <option value="finance">Finance</option>
        <option value="ceo">CEO / GM</option>`,
"Added Finance to role filter"
);

// Add finance to ROLE_LABELS
replaceOnce(
`const ROLE_LABELS = { admin:'Admin', agent:'Agent', listings:'Listings', cs:'Customer Service', ceo:'CEO / GM' };`,
`const ROLE_LABELS = { admin:'Admin', agent:'Agent', listings:'Listings', cs:'Customer Service', finance:'Finance', ceo:'CEO / GM' };`,
"Updated ROLE_LABELS"
);

// Add finance chip class
replaceOnce(
`.chip-ceo      { background: var(--coral-dim);  color: var(--coral);     border: 1px solid rgba(240,107,107,0.2); }`,
`.chip-ceo      { background: var(--coral-dim);  color: var(--coral);     border: 1px solid rgba(240,107,107,0.2); }
.chip-finance  { background: var(--green-dim);  color: var(--green);     border: 1px solid rgba(62,207,142,0.2); }`,
"Added Finance chip CSS"
);

// Add finance to chipClass
replaceOnce(
`function chipClass(role){ return { admin:'chip-admin', agent:'chip-agent', listings:'chip-listings', cs:'chip-cs', ceo:'chip-ceo' }[role] || 'chip-agent'; }`,
`function chipClass(role){ return { admin:'chip-admin', agent:'chip-agent', listings:'chip-listings', cs:'chip-cs', finance:'chip-finance', ceo:'chip-ceo' }[role] || 'chip-agent'; }`,
"Updated chipClass"
);

// Add finance to ROLE_PERMISSIONS
replaceOnce(
`  cs:       ['All clients (read/create)','View all leads','View all properties','Upload deal documents','Message board'],
  ceo:      ['Full visibility (read-only)','All clients & leads','All properties','View deal documents','Message board'],`,
`  cs:       ['All clients (read/create)','View all leads','View all properties','Upload deal documents','Message board'],
  finance:  ['View all closed deals','Manage deal ledger','Generate receipts','Upload receipts as documents','Message board'],
  ceo:      ['Full visibility (read-only)','All clients & leads','All properties','View deal documents','Message board'],`,
"Updated ROLE_PERMISSIONS"
);

// Add finance to stats counter
replaceOnce(
`const c = { admin:0, agent:0, listings:0, cs:0, ceo:0, inactive:0 };`,
`const c = { admin:0, agent:0, listings:0, cs:0, finance:0, ceo:0, inactive:0 };`,
"Updated stats counter"
);

// Add finance stat card if not already present
if (!content.includes('id="rs-finance"')) {
  content = content.replace(
`    <div class="role-stat s-cs">      <div class="rs-val" id="rs-cs">—</div>      <div class="rs-label">Customer Service</div></div>
    <div class="role-stat s-ceo">     <div class="rs-val" id="rs-ceo">—</div>     <div class="rs-label">CEO / GM</div></div>`,
`    <div class="role-stat s-cs">      <div class="rs-val" id="rs-cs">—</div>      <div class="rs-label">Customer Service</div></div>
    <div class="role-stat s-finance"><div class="rs-val" id="rs-finance">—</div><div class="rs-label">Finance</div></div>
    <div class="role-stat s-ceo">     <div class="rs-val" id="rs-ceo">—</div>     <div class="rs-label">CEO / GM</div></div>`
  );
  console.log("? Added Finance stat card");
} else {
  console.log("?? Skipped: Finance stat card already exists.");
}

// Update grid columns if needed
content = content.replace(
  "grid-template-columns: repeat(6, 1fr);",
  "grid-template-columns: repeat(7, 1fr);"
);

// Add finance stat CSS
if (!content.includes(".role-stat.s-finance::after")) {
  content = content.replace(
`.role-stat.s-cs::after       { background: var(--blue); }`,
`.role-stat.s-cs::after       { background: var(--blue); }
.role-stat.s-finance::after  { background: var(--green); }`
  );

  content = content.replace(
`.role-stat.s-cs       .rs-val { color: var(--blue); }`,
`.role-stat.s-cs       .rs-val { color: var(--blue); }
.role-stat.s-finance  .rs-val { color: var(--green); }`
  );

  console.log("? Added Finance stat CSS");
}

fs.writeFileSync(filePath, content, "utf8");

console.log("\n? users.html updated successfully.");
