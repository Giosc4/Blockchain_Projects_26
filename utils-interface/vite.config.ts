import { defineConfig } from 'vite';

// Configurazione di Vite (Framework Agnostic Tooling) per il progetto
export default defineConfig({
  root: 'src', // Imposta 'src' come directory radice per i file sorgente
  envDir: '..', // Cerca il file .env nella directory genitore del progetto
  build: {
    outDir: '../dist', // Cartella di output per la build di produzione
    emptyOutDir: true // Pulisce la cartella di output prima di costruire
  },
  server: {
    port: 5173, // Porta del server di sviluppo locale
    open: true // Apre automaticamente il browser all'avvio
  }
});
