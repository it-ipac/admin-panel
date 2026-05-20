const fs = require('fs');
const file = 'd:/IPAC_PROD/ipac-admin-panel/src/features/reports/components/AppearancePanel.tsx';
let src = fs.readFileSync(file, 'utf8');

// Find the return statement opening and wrap it
// Current: return (\n\t\t<div ...
// Need:    return (\n\t\t<>\n\t\t<div ...
// And at the end: </div>\n\t\t{modal}\n\t); → </div>\n\t\t{modal}\n\t\t</>\n\t);

// Find the opening of return to add fragment
const OLD_RETURN = `\treturn (\n\t\t<div className="flex flex-col gap-1 text-sm">`;
const NEW_RETURN = `\treturn (\n\t\t<>\n\t\t<div className="flex flex-col gap-1 text-sm">`;
if (!src.includes(OLD_RETURN)) { console.error('RETURN not found'); process.exit(1); }
src = src.replace(OLD_RETURN, NEW_RETURN);

// Add closing fragment before the final );
const OLD_END = `\t\t{pickerOpenIndex !== null && (\n\t\t\t<SignaturePickerModal\n\t\t\t\tselectedId={display.signature_fields[pickerOpenIndex]?.image_id}\n\t\t\t\tonSelect={(sig) => {\n\t\t\t\t\tconst updated = [...display.signature_fields];\n\t\t\t\t\tupdated[pickerOpenIndex] = { ...updated[pickerOpenIndex], image_id: sig?.id ?? null };\n\t\t\t\t\tsetD("signature_fields", updated);\n\t\t\t\t\tsetPickerOpenIndex(null);\n\t\t\t\t}}\n\t\t\t\tonClose={() => setPickerOpenIndex(null)}\n\t\t\t/>\n\t\t)}\n\t);\n};\n`;
const NEW_END = `\t\t{pickerOpenIndex !== null && (\n\t\t\t<SignaturePickerModal\n\t\t\t\tselectedId={display.signature_fields[pickerOpenIndex]?.image_id}\n\t\t\t\tonSelect={(sig) => {\n\t\t\t\t\tconst updated = [...display.signature_fields];\n\t\t\t\t\tupdated[pickerOpenIndex] = { ...updated[pickerOpenIndex], image_id: sig?.id ?? null };\n\t\t\t\t\tsetD("signature_fields", updated);\n\t\t\t\t\tsetPickerOpenIndex(null);\n\t\t\t\t}}\n\t\t\t\tonClose={() => setPickerOpenIndex(null)}\n\t\t\t/>\n\t\t)}\n\t\t</>\n\t);\n};\n`;
if (!src.includes(OLD_END)) { console.error('END not found'); process.exit(1); }
src = src.replace(OLD_END, NEW_END);

fs.writeFileSync(file, src, 'utf8');
console.log('OK — fragment added');
