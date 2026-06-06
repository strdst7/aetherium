#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];

  // Rule: no unapproved colors
  const forbiddenColors = ["#ff0000", "#00ff00", "#0000ff"];
  forbiddenColors.forEach((c) => {
    if (content.includes(c)) {
      violations.push({
        rule: "RULE_COLOR_PALETTE",
        message: `Forbidden color ${c} detected`,
        file: filePath
      });
    }
  });

  // Rule: no rotation transforms
  if (content.includes("transform=\"rotate")) {
    violations.push({
      rule: "RULE_GEO_INTEGRITY",
      message: "Rotation transform detected",
      file: filePath
    });
  }

  return violations;
}

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    if (dir.endsWith(".svg")) {
      return validateFile(dir);
    }
    return results;
  }

  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file);
    const innerStat = fs.statSync(full);
    if (innerStat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith(".svg")) {
      results = results.concat(validateFile(full));
    }
  });
  return results;
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: sigil-validate.js <target_directory_or_file>");
  process.exit(1);
}

const violations = walk(target);

if (violations.length > 0) {
  console.log(JSON.stringify({ compliance_score: 0.0, violations }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ compliance_score: 1.0, violations: [] }, null, 2));
process.exit(0);
