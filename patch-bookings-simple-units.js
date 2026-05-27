const fs = require("fs");

const filePath = "pages/bookings.html";

if (!fs.existsSync(filePath)) {
  console.error("? pages/bookings.html not found.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

// 1. Hide/remove Initialize button from the UI
content = content.replace(
  /<button class="btn btn-ghost" id="seed-btn" onclick="seedUnits\(\)" style="display:none">Initialize The Vine Units<\/button>/g,
  ""
);

// 2. Replace UNIT_SEED with a cleaner fixed units array
content = content.replace(
  /const UNIT_SEED=\[[\s\S]*?\];const STATUS_LABELS=/,
`const DUMMY_UNITS = [
  { id: "vine-1a", unitName: "Vine 1A", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },
  { id: "vine-1b", unitName: "Vine 1B", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },
  { id: "vine-1c", unitName: "Vine 1C", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },
  { id: "vine-1d", unitName: "Vine 1D", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },
  { id: "vine-1e", unitName: "Vine 1E", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },
  { id: "vine-1f", unitName: "Vine 1F", unitType: "one_bedroom", displayType: "One-Bedroom Apartment", baseRate: 0 },

  { id: "vine-2a", unitName: "Vine 2A", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 },
  { id: "vine-2b", unitName: "Vine 2B", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 },
  { id: "vine-2c", unitName: "Vine 2C", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 },
  { id: "vine-2d", unitName: "Vine 2D", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 },
  { id: "vine-2e", unitName: "Vine 2E", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 },
  { id: "vine-2f", unitName: "Vine 2F", unitType: "two_bedroom", displayType: "Two-Bedroom Apartment", baseRate: 0 }
];

const STATUS_LABELS=`
);

// 3. Remove the seedUnits function completely
content = content.replace(
  /window\.seedUnits=async\(\)=>\{[\s\S]*?alert\('The Vine units initialized\.'\)\};/,
  ""
);

// 4. Remove all seed button display logic
content = content.replace(
  /document\.getElementById\('seed-btn'\)\.style\.display=\['admin','listings'\]\.includes\(currentRole\)\?'':'none';/g,
  ""
);

// 5. Replace loadUnits() so it no longer reads booking_units from Firestore
content = content.replace(
  /async function loadUnits\(\)\{[\s\S]*?\}\s*async function loadBookings\(\)/,
`async function loadUnits() {
  units = DUMMY_UNITS;
}

async function loadBookings()`
);

// 6. Replace updateUnitSelect() with a safe clean version
content = content.replace(
  /function updateUnitSelect\(\)\{[\s\S]*?\}\s*window\.calculateTotals=/,
`function updateUnitSelect() {
  const sel = document.getElementById("b-unit");

  if (!sel) return;

  sel.innerHTML = units.map(unit => {
    return \`<option value="\${unit.id}">\${unit.unitName} — \${unit.displayType}</option>\`;
  }).join("");
}

window.calculateTotals=`
);

fs.writeFileSync(filePath, content, "utf8");

console.log("? bookings.html cleaned.");
console.log("? Removed Initialize button.");
console.log("? Using fixed 12 dummy The Vine units inside the page.");
console.log("Next: firebase.cmd deploy --only hosting");
