const fs = require('fs');
const file = 'd:/IPAC_PROD/ipac-admin-panel/src/features/reports/components/LivePreviewPanel.tsx';
let src = fs.readFileSync(file, 'utf8');

function rep(old, neu, label) {
  if (!src.includes(old)) { console.error('NOT FOUND:', label); process.exit(1); }
  src = src.replace(old, neu);
  console.log('OK:', label);
}

// 1. Add useSignatures import (after PackingListPage import)
rep(
  `import { PackingListPage } from "./PackingListPage";`,
  `import { PackingListPage } from "./PackingListPage";\nimport { useSignatures } from "../hooks/useSignatures";`,
  'import'
);

// 2. Add hook call after companyProfile
rep(
  `\tconst { data: companyProfile } = useCompanyProfileQuery();`,
  `\tconst { data: companyProfile } = useCompanyProfileQuery();\n\tconst { query: sigsQuery } = useSignatures();\n\tconst signatures = sigsQuery.data ?? [];`,
  'hook-call'
);

// 3. Add signatures prop to print/hidden render (companyProfile={companyProfile}\n\t\t\t\t\t\t\t\t\t\t/>)
rep(
  `\t\t\t\t\t\t\t\t\t\t\tcompanyProfile={companyProfile}\n\t\t\t\t\t\t\t\t\t\t/>`,
  `\t\t\t\t\t\t\t\t\t\t\tcompanyProfile={companyProfile}\n\t\t\t\t\t\t\t\t\t\t\tsignatures={signatures}\n\t\t\t\t\t\t\t\t\t\t/>`,
  'hidden-render-sig'
);

// 4. Add signatures prop to visible render
rep(
  `\t\t\t\t\t\t\tcompanyProfile={companyProfile}\n\t\t\t\t\t\t/>`,
  `\t\t\t\t\t\t\tcompanyProfile={companyProfile}\n\t\t\t\t\t\t\tsignatures={signatures}\n\t\t\t\t\t\t/>`,
  'visible-render-sig'
);

fs.writeFileSync(file, src, 'utf8');
console.log('DONE');
