#!/usr/bin/env node
const fs = require('fs');
const svgPath = process.argv[2];
if (!svgPath) {
  console.error("Usage: node tools/sigil-validate.js path/to/file.svg");
  process.exit(2);
}
const svg = fs.readFileSync(svgPath, 'utf8');
if (svg.includes('bad-ratio')) {
  console.log(JSON.stringify({compliance_score: 0.6, violations: ['ratio_mismatch']}));
  process.exit(1);
}
console.log(JSON.stringify({compliance_score: 1.0, violations: []}));
process.exit(0);
