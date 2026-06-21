const { channel } = require('bridge');
const { spawn } = require('child_process');
const path = require('path');

let geminiProcess = null;

channel.addListener('control', (msg) => {
  if (msg.command === 'start') {
    if (geminiProcess) {
      geminiProcess.kill();
    }
    
    const cliPath = path.join(__dirname, 'node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js');
    
    geminiProcess = spawn('node', [cliPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1', CI: '1', GEMINI_API_KEY: msg.apiKey || '' }
    });

    geminiProcess.stdout.on('data', (data) => {
      channel.send('output', { type: 'stdout', data: data.toString() });
    });

    geminiProcess.stderr.on('data', (data) => {
      channel.send('output', { type: 'stderr', data: data.toString() });
    });

    geminiProcess.on('exit', (code) => {
      channel.send('output', { type: 'exit', code });
      geminiProcess = null;
    });

    channel.send('output', { type: 'system', data: 'Processo Gemini CLI avviato nativamente.' });
  } else if (msg.command === 'input') {
    if (geminiProcess && geminiProcess.stdin) {
      geminiProcess.stdin.write(msg.data + '\n');
    } else {
      channel.send('output', { type: 'system', data: 'ERRORE: Il processo non è in esecuzione.' });
    }
  } else if (msg.command === 'kill') {
    if (geminiProcess) geminiProcess.kill();
    geminiProcess = null;
    channel.send('output', { type: 'system', data: 'Processo terminato.' });
  }
});

channel.send('output', { type: 'system', data: 'Motore Node.js Inizializzato con successo su Android.' });
