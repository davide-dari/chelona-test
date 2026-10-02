const fs = require('fs');

const filePath = '/Users/davidedari/Documents/Progetti/app/chelona/src/services/chelonaEngine.ts';
let code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('autoAction:')) {
    // If it's a definition or interface, skip
    if (lines[i].includes('autoAction?:')) continue;

    // Check if the current return block has a text indicating an open action
    let isExplicitOpen = false;
    let inReturnBlock = false;
    
    // Look backwards up to 15 lines to find the start of the return or text
    for (let j = i; j >= Math.max(0, i - 15); j--) {
      const lineStr = lines[j].trim();
      
      if (lineStr.includes('text:')) {
        if (
          lines[j].includes('Ti apro') ||
          lines[j].includes('Ti porto') ||
          lines[j].includes('Ti mostro') ||
          lines[j].includes('Ti apro lo strumento') ||
          lines[j].includes('Ti apro la schermata') ||
          lines[j].includes('salvo subito') ||
          lines[j].includes('Vado ')
        ) {
          isExplicitOpen = true;
        }
        // Even if we find a text, maybe the condition has "apri"?
      }
      
      if (lineStr.startsWith('if (') && (lineStr.includes("includes('apri')") || lineStr.includes("includes('vai')"))) {
        isExplicitOpen = true;
      }
      
      // Also Volantini
      if (lineStr.includes('wantsDirectOpen')) {
        isExplicitOpen = true;
      }
      if (lines[j].includes('Rimanda direttamente a tutti i volantini tramite autoAction!')) {
        isExplicitOpen = true; // This is a special comment
      }

      if (lineStr === 'return {') {
        // we found the start of the block, we can stop going back if we want, but let's keep going to check 'if'
      }
    }

    if (!isExplicitOpen) {
      lines[i] = lines[i].replace('autoAction:', '// autoAction:');
      console.log(`COMMENTED: ${lines[i].trim()} (Line ${i + 1})`);
    } else {
      console.log(`KEPT: ${lines[i].trim()} (Line ${i + 1})`);
    }
  }
}

// Special case for formatted.autoAction
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('autoAction: formatted.autoAction')) {
    lines[i] = lines[i].replace('autoAction:', '// autoAction:');
    console.log(`COMMENTED formatted.autoAction: (Line ${i + 1})`);
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
