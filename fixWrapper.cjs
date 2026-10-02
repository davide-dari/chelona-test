const fs = require('fs');
const filePath = '/Users/davidedari/Documents/Progetti/app/chelona/src/services/chelonaEngine.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Uncomment all `// autoAction:`
code = code.replace(/\/\/\s*\/\/\s*autoAction:/g, 'autoAction:');
code = code.replace(/\/\/\s*autoAction:/g, 'autoAction:');

// 2. Wrap queryChelonaAi
// Find export async function queryChelonaAi(
const target = `export async function queryChelonaAi(
  query: string,
  activeSection?: string,
  isVoiceSession?: boolean
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module; autoAction?: AiAction; engineUsed?: 'chelona-engine' }> {`;

const replacement = `export async function queryChelonaAi(
  query: string,
  activeSection?: string,
  isVoiceSession?: boolean
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module; autoAction?: AiAction; engineUsed?: 'chelona-engine' }> {
  const result = await _queryChelonaAiInner(query, activeSection, isVoiceSession);
  
  const lower = query.toLowerCase();
  const isExplicitNavigation = 
    lower.includes('apri') || 
    lower.includes('vai') || 
    lower.includes('mostra') || 
    lower.includes('vedi') ||
    lower.includes('chiudi') ||
    lower.trim() === 'ricette' ||
    lower.trim() === 'ricettario' ||
    lower.trim() === 'fitness' ||
    lower.trim() === 'spesa' ||
    lower.trim() === 'documenti' ||
    lower.trim() === 'profilo' ||
    lower.trim() === 'auto' ||
    lower.trim() === 'parcheggio' ||
    lower.trim() === 'volantini' ||
    lower.trim() === 'impostazioni' ||
    lower.trim() === 'offerte';

  if (!isExplicitNavigation && result.autoAction) {
    delete result.autoAction;
  }

  return result;
}

async function _queryChelonaAiInner(
  query: string,
  activeSection?: string,
  isVoiceSession?: boolean
): Promise<{ text: string; actions?: AiAction[]; learnedFact?: string; createdModule?: Module; autoAction?: AiAction; engineUsed?: 'chelona-engine' }> {`;

if (code.includes(target) && !code.includes('_queryChelonaAiInner')) {
  code = code.replace(target, replacement);
  // add a closing brace at the very end of the file
  code += '\n}\n';
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully wrapped queryChelonaAi');
} else {
  console.log('Failed to wrap, maybe already wrapped?');
  fs.writeFileSync(filePath, code, 'utf8'); // just save the uncommenting
}
