/* =========================================================
   Configuração do Firebase — Pacto Ipiranga
   Firebase Console → Configurações do projeto → Seus apps → App da Web
   Cole abaixo o objeto firebaseConfig gerado pelo console.

   Enquanto o apiKey começar com "COLE_", o site funciona normalmente
   (gera PDF/Word), mas NÃO salva as respostas no Firestore.
   ========================================================= */

export const firebaseConfig = {
  apiKey: "AIzaSyCyctIVY9QFfZwBMCqvKlNqL6ydlBHCPsM",
  authDomain: "crivopactoipiranga.firebaseapp.com",
  projectId: "crivopactoipiranga",
  storageBucket: "crivopactoipiranga.firebasestorage.app",
  messagingSenderId: "598010811027",
  appId: "1:598010811027:web:eddcea35e691b4e3d37366",
  measurementId: "G-6RBV9PXJX2"
};

/* Nome da coleção onde cada pacto é gravado. */
export const COLECAO = 'pactos';
