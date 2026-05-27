const fs = require("fs");

const filePath = "pages/vine-finance.html";

if (!fs.existsSync(filePath)) {
  console.error("? pages/vine-finance.html not found.");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

// 1. Force CSS override before </style>
const css = `
/* ===== REAL VINE FINANCE FIX ===== */

.main {
  margin-left: var(--sidebar-w) !important;
  width: calc(100vw - var(--sidebar-w)) !important;
  max-width: none !important;
  padding: 28px 28px 60px !important;
}

.page-shell {
  width: 100% !important;
  max-width: 1180px !important;
  margin: 0 !important;
}

.topbar {
  margin-bottom: 22px !important;
}

.page-sub {
  color: var(--text2) !important;
}

.stats-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 12px !important;
}

.stat-card {
  min-height: 96px !important;
  padding: 16px 18px !important;
}

.stat-val {
  font-size: 30px !important;
}

.toolbar {
  display: grid !important;
  grid-template-columns: minmax(280px, 1fr) 170px 200px 90px !important;
  gap: 10px !important;
  align-items: center !important;
  margin-bottom: 14px !important;
}

.results-count {
  margin-left: 0 !important;
  text-align: right !important;
}

.data-table {
  table-layout: fixed !important;
  width: 100% !important;
}

.data-table th,
.data-table td {
  padding: 14px 16px !important;
}

.data-table th {
  color: var(--text2) !important;
  font-size: 10px !important;
  letter-spacing: 1.6px !important;
}

.data-table th:nth-child(1),
.data-table td:nth-child(1) {
  width: 22% !important;
}

.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  width: 20% !important;
}

.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 18% !important;
}

.data-table th:nth-child(4),
.data-table td:nth-child(4) {
  width: 13% !important;
}

.data-table th:nth-child(5),
.data-table td:nth-child(5) {
  width: 12% !important;
}

.data-table th:nth-child(6),
.data-table td:nth-child(6) {
  width: 10% !important;
}

.data-table th:nth-child(7),
.data-table td:nth-child(7) {
  width: 105px !important;
}

@media (max-width: 760px) {
  .main {
    margin-left: 0 !important;
    width: 100% !important;
    padding: 24px 16px 60px !important;
  }

  .toolbar,
  .stats-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

if (!content.includes("REAL VINE FINANCE FIX")) {
  content = content.replace("</style>", css + "\n</style>");
}

// 2. Add page-shell wrapper using regex, not exact text
if (!content.includes('class="page-shell"')) {
  content = content.replace(
    /<main\s+class=["']main["']\s*>/,
    '<main class="main">\n    <div class="page-shell">'
  );

  content = content.replace(
    /<\/main>/,
    '    </div>\n  </main>'
  );
}

// 3. Improve subtitle
content = content.replace(
  /Invoices, ledger, receipts and balances for The Vine apartment bookings only/g,
  "A dedicated finance desk for The Vine booking invoices, receipts, payments and balances."
);

// 4. Improve visible table headers
content = content.replace(/<th>Invoice<\/th>/g, "<th>Invoice No.</th>");
content = content.replace(/<th>Guest \/ Unit<\/th>/g, "<th>Guest</th>");
content = content.replace(/<th>Dates<\/th>/g, "<th>Apartment / Stay</th>");
content = content.replace(/<th>Total<\/th>/g, "<th>Amount</th>");
content = content.replace(/<th>Status<\/th>/g, "<th>Invoice Status</th>");
content = content.replace(/<th>Issued<\/th>/g, "<th>Date Issued</th>");

content = content.replace(/<th>Description<\/th>/g, "<th>Apartment / Description</th>");
content = content.replace(/<th>Receipt<\/th>/g, "<th>Receipt No.</th>");
content = content.replace(/<th>Stay Dates<\/th>/g, "<th>Apartment / Stay</th>");
content = content.replace(/<th>Payment<\/th>/g, "<th>Payment Status</th>");

fs.writeFileSync(filePath, content, "utf8");

console.log("? Real vine-finance fix applied.");

const updated = fs.readFileSync(filePath, "utf8");

console.log("Contains page-shell:", updated.includes("page-shell"));
console.log("Contains REAL VINE FINANCE FIX:", updated.includes("REAL VINE FINANCE FIX"));
