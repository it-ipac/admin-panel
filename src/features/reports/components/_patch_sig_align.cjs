const fs = require('fs');

// ── AppearancePanel: add width + align controls after sig height slider ───────
{
  const file = 'd:/IPAC_PROD/ipac-admin-panel/src/features/reports/components/AppearancePanel.tsx';
  let src = fs.readFileSync(file, 'utf8');

  const OLD = `\t\t\t\t<div className="flex flex-col gap-1 mt-1">
\t\t\t\t\t<div className="flex justify-between items-center">
\t\t\t\t\t\t<label
\t\t\t\t\t\t\thtmlFor="footer-gap-slider"`;

  const NEW = `\t\t\t\t<div className="flex flex-col gap-1 mt-1">
\t\t\t\t\t<div className="flex justify-between items-center">
\t\t\t\t\t\t<label className="text-xs text-gray-500">Signature Image Width</label>
\t\t\t\t\t\t<span className="text-xs font-semibold text-gray-700">{display.signature_width_pct ?? 80}%</span>
\t\t\t\t\t</div>
\t\t\t\t\t<input
\t\t\t\t\t\ttype="range" min="20" max="100" step="5"
\t\t\t\t\t\tvalue={display.signature_width_pct ?? 80}
\t\t\t\t\t\tonChange={(e) => setD("signature_width_pct", parseInt(e.target.value, 10))}
\t\t\t\t\t\tclassName="w-full cursor-pointer accent-blue-600"
\t\t\t\t\t/>
\t\t\t\t</div>
\t\t\t\t<div className="flex flex-col gap-1 mt-1">
\t\t\t\t\t<label className="text-xs text-gray-500">Signature Alignment</label>
\t\t\t\t\t<div className="flex gap-1">
\t\t\t\t\t\t{(["left", "center", "right"] as const).map((a) => (
\t\t\t\t\t\t\t<button
\t\t\t\t\t\t\t\tkey={a}
\t\t\t\t\t\t\t\ttype="button"
\t\t\t\t\t\t\t\tonClick={() => setD("signature_align", a)}
\t\t\t\t\t\t\t\tclassName={\`flex-1 py-0.5 text-xs border rounded capitalize \${(display.signature_align ?? "center") === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}\`}
\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t{a}
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t))}
\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t\t<div className="flex flex-col gap-1 mt-1">
\t\t\t\t\t<div className="flex justify-between items-center">
\t\t\t\t\t\t<label
\t\t\t\t\t\t\thtmlFor="footer-gap-slider"`;

  if (!src.includes(OLD)) { console.error('APPEARANCE: gap slider anchor not found'); process.exit(1); }
  src = src.replace(OLD, NEW);
  fs.writeFileSync(file, src, 'utf8');
  console.log('OK: AppearancePanel');
}

// ── PackingListPage: apply width/align to both <img> renders ─────────────────
{
  const file = 'd:/IPAC_PROD/ipac-admin-panel/src/features/reports/components/PackingListPage.tsx';
  let src = fs.readFileSync(file, 'utf8');

  // Helper to build aligned img style replacement
  // Both render sites use same style pattern — replace each occurrence
  // Box-card img:
  const OLD_BOX_IMG = `<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, maxWidth: "100%", objectFit: "contain", marginBottom: 3 }} />`;
  const NEW_BOX_IMG = `<div style={{ display: "flex", justifyContent: display.signature_align ?? "center" }}>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, width: \`\${display.signature_width_pct ?? 80}%\`, objectFit: "contain", marginBottom: 3 }} />
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>`;

  // Footer img:
  const OLD_FOOT_IMG = `<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, maxWidth: "100%", objectFit: "contain", marginBottom: 4 }} />`;
  const NEW_FOOT_IMG = `<div style={{ display: "flex", justifyContent: display.signature_align ?? "center" }}>
\t\t\t\t\t\t\t\t\t\t\t\t\t<img src={getSignatureUrl(_m.image_path)} alt={_m.label} style={{ height: display.signature_height_px ?? 30, width: \`\${display.signature_width_pct ?? 80}%\`, objectFit: "contain", marginBottom: 4 }} />
\t\t\t\t\t\t\t\t\t\t\t\t</div>`;

  let changed = 0;
  if (src.includes(OLD_BOX_IMG)) { src = src.replace(OLD_BOX_IMG, NEW_BOX_IMG); changed++; console.log('OK: box-img'); }
  else { console.error('NOT FOUND: box-img'); process.exit(1); }
  if (src.includes(OLD_FOOT_IMG)) { src = src.replace(OLD_FOOT_IMG, NEW_FOOT_IMG); changed++; console.log('OK: foot-img'); }
  else { console.error('NOT FOUND: foot-img'); process.exit(1); }

  fs.writeFileSync(file, src, 'utf8');
  console.log('OK: PackingListPage', changed, 'changes');
}
