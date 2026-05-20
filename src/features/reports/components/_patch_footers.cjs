const fs = require("node:fs");
let c = fs.readFileSync("PackingListPage.tsx", "utf8");

c = c.replace(
	`									{/* Footer */}
					<div
						style={{
							marginTop: "auto",
							textAlign: "center",
							fontSize: "10px",
							color: "#999",
							borderTop: "1px solid #e0e0e0",
							paddingTop: "10px",
						}}
					>`,
	`									{/* Footer */}
					<div
						style={{
							marginTop: "auto",
							textAlign: "center",
							fontSize: "10px",
							color: "#999",
							borderTop: "1px solid #e0e0e0",
							paddingTop: "6px",
							height: display.footer_height_px ? \`\${display.footer_height_px}px\` : "40px",
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-end",
						}}
					>`,
);

c = c.replace(
	`				{/* ─── Footer ─────────────────────────────── */}
				<div style={{ flexShrink: 0, marginTop: 10 }}>`,
	`				{/* ─── Footer ─────────────────────────────── */}
				<div style={{ flexShrink: 0, marginTop: "auto", height: display.footer_height_px ? \`\${display.footer_height_px}px\` : "40px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>`,
);

fs.writeFileSync("PackingListPage.tsx", c, "utf8");
console.log("Patched footers.");
