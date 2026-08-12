/**
 * Deterministic Project Reference Generator
 * Scans src/ directory and generates docs/PROJECT_REFERENCE.md
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_FILE = path.join(ROOT_DIR, 'docs', 'PROJECT_REFERENCE.md');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (/\.(ts|tsx|css|html|js|jsx)$/.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, filePath);
  const lines = content.split('\n');
  const totalLines = lines.length;

  const exports = [];
  const interfacesAndTypes = [];
  const cssVariables = [];
  const testIds = [];

  // Regex patterns
  const exportPattern = /^export\s+(const|function|class|enum|let|var)\s+([A-Za-z0-9_]+)/;
  const interfacePattern = /^export\s+(interface|type)\s+([A-Za-z0-9_]+)/;
  const cssVarPattern = /(--[A-Za-z0-9_-]+)\s*:/g;
  const testIdPattern = /data-testid=["']([^"']+)["']/g;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Interfaces & Types
    const itMatch = trimmed.match(interfacePattern);
    if (itMatch) {
      interfacesAndTypes.push({ name: itMatch[2], kind: itMatch[1], line: lineNum });
    }

    // Functions/Consts/Classes
    const expMatch = trimmed.match(exportPattern);
    if (expMatch) {
      exports.push({ name: expMatch[2], kind: expMatch[1], line: lineNum, signature: trimmed });
    }

    // CSS variables
    let cssMatch;
    while ((cssMatch = cssVarPattern.exec(line)) !== null) {
      if (!cssVariables.includes(cssMatch[1])) {
        cssVariables.push(cssMatch[1]);
      }
    }

    // testid
    let tidMatch;
    while ((tidMatch = testIdPattern.exec(line)) !== null) {
      if (!testIds.includes(tidMatch[1])) {
        testIds.push(tidMatch[1]);
      }
    }
  });

  return {
    relativePath,
    totalLines,
    exports,
    interfacesAndTypes,
    cssVariables,
    testIds
  };
}

function generateMarkdown() {
  console.log('Scanning source directory:', SRC_DIR);
  const allFiles = getAllFiles(SRC_DIR);
  const parsedFiles = allFiles.map(parseFile);

  let md = `# Forms Offline — Project Technical Reference Index\n\n`;
  md += `> **Auto-Generated File**: Do not edit manually. Updated automatically via \`npm run build:reference\`.\n`;
  md += `> Last generated: ${new Date().toISOString()}\n\n`;

  md += `## 1. Project Directory & File Map\n\n`;
  md += `| Relative File Path | Total Lines | Exports Count | Types/Interfaces |\n`;
  md += `| :--- | :---: | :---: | :---: |\n`;
  parsedFiles.forEach(f => {
    md += `| \`${f.relativePath}\` | ${f.totalLines} | ${f.exports.length} | ${f.interfacesAndTypes.length} |\n`;
  });
  md += `\n`;

  md += `## 2. Exported Interfaces & Type Registry\n\n`;
  parsedFiles.forEach(f => {
    if (f.interfacesAndTypes.length > 0) {
      md += `### \`${f.relativePath}\`\n`;
      f.interfacesAndTypes.forEach(it => {
        md += `- **${it.kind}** \`${it.name}\` (Line ${it.line})\n`;
      });
      md += `\n`;
    }
  });

  md += `## 3. Exported APIs, Components & Utilities\n\n`;
  parsedFiles.forEach(f => {
    if (f.exports.length > 0) {
      md += `### \`${f.relativePath}\`\n`;
      f.exports.forEach(e => {
        md += `- **${e.kind}** \`${e.name}\` (Line ${e.line}) — \`${e.signature.slice(0, 80)}${e.signature.length > 80 ? '...' : ''}\`\n`;
      });
      md += `\n`;
    }
  });

  const allCssVars = [...new Set(parsedFiles.flatMap(f => f.cssVariables))];
  if (allCssVars.length > 0) {
    md += `## 4. CSS Custom Properties / Styling Tokens\n\n`;
    allCssVars.forEach(v => {
      md += `- \`${v}\`\n`;
    });
    md += `\n`;
  }

  const allTestIds = [...new Set(parsedFiles.flatMap(f => f.testIds))];
  if (allTestIds.length > 0) {
    md += `## 5. UI Element Selector Index (\`data-testid\`)\n\n`;
    allTestIds.forEach(tid => {
      md += `- \`data-testid="${tid}"\`\n`;
    });
    md += `\n`;
  }

  // Ensure docs directory exists
  const docsDir = path.join(ROOT_DIR, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
  console.log(`Successfully generated reference file at: ${OUTPUT_FILE}`);
}

generateMarkdown();
