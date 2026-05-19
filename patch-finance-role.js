const fs = require("fs");

const filePath = "pages/users.html";

if (!fs.existsSync(filePath)) {
  console.error("? Could not find pages/users.html. Make sure you are in the CASAVIOLA-CRM root folder.");
  process.exit(1);
}

let s = fs.readFileSync(filePath, "utf8");

function replaceOnce(find, replace, label) {
  if (s.includes(find)) {
    s = s.replace(find, replace);
    console.log("? " + label);
  } else {
    console.log("?? Skipped: " + label + " — pattern not found or already changed.");
  }
}

// 1. Role stats grid: 6 ? 7
replaceOnce(
  ".role-stats { display: grid; grid-template-columns: repeat(6, 1fr);",
  ".role-stats { display: grid; grid-template-columns: repeat(7, 1fr);",
  "Updated role stats grid to 7 columns"
);

// 2. Finance stat accent CSS
replaceOnce(
  `.role-stat.s-cs::after       { background: var(--blue); }
.role-stat.s-ceo::after      { background: var(--coral); }
.role-stat.s-inactive::after { background: var(--muted); }`,
  `.role-stat.s-cs::after       { background: var(--blue); }
.role-stat.s-finance::after  { background: var(--green); }
.role-stat.s-ceo::after      { background: var(--coral); }
.role-stat.s-inactive::after { background: var(--muted); }`,
  "Added Finance stat top accent"
);

// 3. Finance stat value color CSS
replaceOnce(
  `.role-stat.s-cs       .rs-val { color: var(--blue); }
.role-stat.s-ceo      .rs-val { color: var(--coral); }
.role-stat.s-inactive .rs-val { color: var(--muted); }`,
  `.role-stat.s-cs       .rs-val { color: var(--blue); }
.role-stat.s-finance  .rs-val { color: var(--green); }
.role-stat.s-ceo      .rs-val { color: var(--coral); }
.role-stat.s-inactive .rs-val { color: var(--muted); }`,
  "Added Finance stat value color"
);

// 4. Finance chip CSS
replaceOnce(
  `.chip-cs       { background: var(--blue-dim);   color: var(--blue);      border: 1px solid rgba(91,156,246,0.2); }
.chip-ceo      { background: var(--coral-dim);  color: var(--coral);     border: 1px solid rgba(240,107,107,0.2); }`,
  `.chip-cs       { background: var(--blue-dim);   color: var(--blue);      border: 1px solid rgba(91,156,246,0.2); }
.chip-finance  { background: var(--green-dim);  color: var(--green);     border: 1px solid rgba(62,207,142,0.2); }
.chip-ceo      { background: var(--coral-dim);  color: var(--coral);     border: 1px solid rgba(240,107,107,0.2); }`,
  "Added Finance role chip CSS"
);

// 5. Add Finance sidebar link before Messages if not already there
if (!s.includes('href="finance.html"')) {
  s = s.replace(
    `    <a class="nav-item" href="messages.html">`,
    `    <a class="nav-item" href="finance.html"><svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Finance</a>
    <a class="nav-item" href="messages.html">`
  );
  console.log("? Added Finance sidebar link");
} else {
  console.log("?? Skipped: Finance sidebar link already exists.");
}

// 6. Add Finance stat card
replaceOnce(
  `<div class="role-stat s-cs">      <div class="rs-val" id="rs-cs">—</div>      <div class="rs-label">Customer Service</div></div>
    <div class="role-stat s-ceo">     <div class="rs-val" id="rs-ceo">—</div>     <div class="rs-label">CEO / GM</div></div>
    <div class="role-stat s-inactive"><div class="rs-val" id="rs-inactive">—</div><div class="rs-label">Inactive</div></div>`,
  `<div class="role-stat s-cs">      <div class="rs-val" id="rs-cs">—</div>      <div class="rs-label">Customer Service</div></div>
    <div class="role-stat s-finance"><div class="rs-val" id="rs-finance">—</div><div class="rs-label">Finance</div></div>
    <div class="role-stat s-ceo">     <div class="rs-val" id="rs-ceo">—</div>     <div class="rs-label">CEO / GM</div></div>
    <div class="role-stat s-inactive"><div class="rs-val" id="rs-inactive">—</div><div class="rs-label">Inactive</div></div>`,
  "Added Finance role stat card"
);

// 7. Add Finance to role filter
replaceOnce(
  `<option value="cs">Customer Service</option>
        <option value="ceo">CEO / GM</option>`,
  `<option value="cs">Customer Service</option>
        <option value="finance">Finance</option>
        <option value="ceo">CEO / GM</option>`,
  "Added Finance to role filter"
);

// 8. Add Finance to create staff dropdown
replaceOnce(
  `<option value="cs">Customer Service</option>
        <option value="admin">Admin (Operations Manager)</option>
        <option value="ceo">CEO / GM</option>`,
  `<option value="cs">Customer Service</option>
        <option value="finance">Finance</option>
        <option value="admin">Admin (Operations Manager)</option>
        <option value="ceo">CEO / GM</option>`,
  "Added Finance to create staff role dropdown"
);

// 9. Update ROLE_LABELS
replaceOnce(
  `const ROLE_LABELS = { admin:'Admin', agent:'Agent', listings:'Listings', cs:'Customer Service', ceo:'CEO / GM' };`,
  `const ROLE_LABELS = {
  admin: 'Admin',
  agent: 'Agent',
  listings: 'Listings',
  cs: 'Customer Service',
  finance: 'Finance',
  ceo: 'CEO / GM'
};`,
  "Updated ROLE_LABELS"
);

// 10. Update ROLE_PERMISSIONS
const oldPerms = `const ROLE_PERMISSIONS = {
  admin:    ['Full system access','Create staff accounts','All clients & leads','All properties','Validate closed deals','Message board'],
  agent:    ['Own clients only','Own agent leads only','View all properties','Close agent deals','Message board'],
  listings: ['All properties (manage)','Company leads (manage)','View all clients','Close company deals','Message board'],
  cs:       ['All clients (read/create)','View all leads','View all properties','Upload deal documents','Message board'],
  ceo:      ['Full visibility (read-only)','All clients & leads','All properties','View deal documents','Message board'],
};`;

const newPerms = `const ROLE_PERMISSIONS = {
  admin: [
    'Full system access',
    'Create staff accounts',
    'All clients & leads',
    'All properties',
    'Finance management',
    'Validate closed deals',
    'Message board'
  ],

  agent: [
    'Own clients only',
    'Own agent leads only',
    'View all properties',
    'View payment status',
    'Close agent deals',
    'Message board'
  ],

  listings: [
    'All properties (manage)',
    'Company leads (manage)',
    'View all clients',
    'View payment status',
    'Close company deals',
    'Message board'
  ],

  cs: [
    'All clients (read/create)',
    'View all leads',
    'View all properties',
    'Upload deal documents',
    'Message board'
  ],

  finance: [
    'Access finance page',
    'Set agreed deal amount',
    'Record client payments',
    'Approve payment entries',
    'Generate receipts',
    'View closed deals'
  ],

  ceo: [
    'Full visibility (read-only)',
    'All clients & leads',
    'All properties',
    'View finance records',
    'View deal documents',
    'Message board'
  ],
};`;

replaceOnce(oldPerms, newPerms, "Updated ROLE_PERMISSIONS");

// 11. Update chipClass
replaceOnce(
  `function chipClass(role){ return { admin:'chip-admin', agent:'chip-agent', listings:'chip-listings', cs:'chip-cs', ceo:'chip-ceo' }[role] || 'chip-agent'; }`,
  `function chipClass(role){
  return {
    admin: 'chip-admin',
    agent: 'chip-agent',
    listings: 'chip-listings',
    cs: 'chip-cs',
    finance: 'chip-finance',
    ceo: 'chip-ceo'
  }[role] || 'chip-agent';
}`,
  "Updated chipClass"
);

// 12. Update stats counter
replaceOnce(
  `const c = { admin:0, agent:0, listings:0, cs:0, ceo:0, inactive:0 };`,
  `const c = { admin:0, agent:0, listings:0, cs:0, finance:0, ceo:0, inactive:0 };`,
  "Updated updateStats counter"
);

fs.writeFileSync(filePath, s, "utf8");

console.log("\\n? Done. Finance role has been fused into pages/users.html");
console.log("Next: redeploy with firebase.cmd deploy --only hosting");
