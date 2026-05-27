const fs = require("fs");

const filePath = "pages/bookings.html";

if (!fs.existsSync(filePath)) {
  console.error("? pages/bookings.html not found.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

// Rename DUMMY_UNITS to THE_VINE_UNITS everywhere
content = content.replaceAll("DUMMY_UNITS", "THE_VINE_UNITS");

// Replace loadUnits with direct real apartment list
content = content.replace(
  /async function loadUnits\(\)\s*\{\s*units\s*=\s*THE_VINE_UNITS;\s*\}/,
`async function loadUnits() {
  units = [
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
}`
);

// Remove standalone THE_VINE_UNITS array if it exists, since units are now inside loadUnits()
content = content.replace(
  /const THE_VINE_UNITS\s*=\s*\[[\s\S]*?\];\s*const STATUS_LABELS=/,
  "const STATUS_LABELS="
);

fs.writeFileSync(filePath, content, "utf8");

console.log("? bookings.html updated.");
console.log("? Apartment units now live directly inside loadUnits().");
console.log("? No DUMMY_UNITS naming remains.");
