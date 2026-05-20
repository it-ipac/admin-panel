const fs = require('fs');
const file = 'd:/IPAC_PROD/ipac-admin-panel/src/features/reports/components/PackingListPage.tsx';
let src = fs.readFileSync(file, 'utf8');
let changed = 0;

function rep(old, neu, label) {
  if (!src.includes(old)) { console.error('NOT FOUND:', label); process.exit(1); }
  src = src.replace(old, neu);
  changed++;
  console.log('OK:', label);
}

// 1. Add import
rep(
  `import type { ReportInstanceData } from "../types";`,
  `import type { ReportInstanceData } from "../types";\nimport { getSignatureUrl, type SignatureRow } from "../hooks/useSignatures";`,
  'import'
);

// 2. Add signatures to interface
rep(
  `\tcompanyProfile: any;\n}`,
  `\tcompanyProfile: any;\n\tsignatures?: SignatureRow[];\n}`,
  'interface'
);

// 3. Add signatures destructure - find companyProfile line and insert after
rep(
  `\t\t\tcompanyProfile,\n\t\t},\n\t\tref,`,
  `\t\t\tcompanyProfile,\n\t\t\tsignatures = [],\n\t\t},\n\t\tref,`,
  'destruct'
);

// 4. Add marginBottom to box cards container
rep(
  `\t\t\t\t\t\toverflow: "hidden",\n\t\t\t\t\t\tdisplay: "flex",\n\t\t\t\t\t\tflexDirection: "column",\n\t\t\t\t\t\tgap: 8,\n\t\t\t\t\t}}`,
  `\t\t\t\t\t\toverflow: "hidden",\n\t\t\t\t\t\tdisplay: "flex",\n\t\t\t\t\t\tflexDirection: "column",\n\t\t\t\t\t\tgap: 8,\n\t\t\t\t\t\tmarginBottom: display.footer_body_gap_px ?? 0,\n\t\t\t\t\t}}`,
  'body-gap'
);

// 5. Box-card sig line
const OLD_BOX = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tstyle={{\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tborderBottom: \`1px solid #aaa\`,\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\theight: display.signature_height_px ?? 30,\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tmarginBottom: 3,\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t}}\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t/>`;
const NEW_BOX = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t{(() => {
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tconst _m = sig.image_id ? signatures.find((s) => s.id === sig.image_id) : undefined;
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\treturn _m ? (
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, maxWidth: "100%", objectFit: "contain", marginBottom: 3 }} />
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div style={{ borderBottom: "1px solid #aaa", height: display.signature_height_px ?? 30, marginBottom: 3 }} />
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t\t\t\t\t\t\t\t})()}`;
rep(OLD_BOX, NEW_BOX, 'box-sig-line');

// 6. Footer sig line
const OLD_FOOT = `\t\t\t\t\t\t\t\t\t\t\t<div\n\t\t\t\t\t\t\t\t\t\t\t\tstyle={{\n\t\t\t\t\t\t\t\t\t\t\t\t\tborderBottom: \`1px solid #aaa\`,\n\t\t\t\t\t\t\t\t\t\t\t\t\theight: display.signature_height_px ?? 30,\n\t\t\t\t\t\t\t\t\t\t\t\t\tmarginBottom: 4,\n\t\t\t\t\t\t\t\t\t\t\t\t}}\n\t\t\t\t\t\t\t\t\t\t\t/>`;
const NEW_FOOT = `\t\t\t\t\t\t\t\t\t\t\t{(() => {
\t\t\t\t\t\t\t\t\t\t\t\tconst _m = sig.image_id ? signatures.find((s) => s.id === sig.image_id) : undefined;
\t\t\t\t\t\t\t\t\t\t\t\treturn _m ? (
\t\t\t\t\t\t\t\t\t\t\t\t\t<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, maxWidth: "100%", objectFit: "contain", marginBottom: 4 }} />
\t\t\t\t\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t\t\t\t\t<div style={{ borderBottom: "1px solid #aaa", height: display.signature_height_px ?? 30, marginBottom: 4 }} />
\t\t\t\t\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t\t\t\t\t})()}`;
rep(OLD_FOOT, NEW_FOOT, 'footer-sig-line');

fs.writeFileSync(file, src, 'utf8');
console.log('DONE', changed, 'changes');
