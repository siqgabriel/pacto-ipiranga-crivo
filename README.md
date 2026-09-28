# Pacto Ipiranga — Meu pacto da semana

Landing page da Crivo Hub para os colaboradores da Ipiranga preencherem o **Cartão PACTO**
(Prioridade, Ação, Compromisso, Tempo e Olhar), assinarem e baixarem o pacto em **PDF** ou **Word**.
Cada pacto firmado é gravado no **Firestore**.

HTML, CSS e JavaScript puros — sem framework e sem etapa de build.

## Estrutura

```
index.html                 página
css/styles.css             identidade visual (paleta Ipiranga, layout da palestra Crivo)
js/app.js                  formulário, assinatura, rascunho local, Firebase e downloads
js/documents.js            geração do PDF (jsPDF) e do Word (docx) no formato do cartão
js/firebase-config.js      ← cole aqui a configuração do seu projeto Firebase
firestore.rules            regras de segurança (o site só cria; ninguém lê pelo navegador)
assets/img/                logos e fotos
assets/vendor/             jsPDF 2.5.2 e docx 9.5.1 (locais, sem depender de CDN)
```

## 1. Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com) (recomendado: um projeto só para o Pacto Ipiranga).
2. **Build → Firestore Database → Criar banco de dados** (modo produção, região `southamerica-east1`).
3. **Configurações do projeto → Seus apps → Web (`</>`)** → registre o app e copie o objeto `firebaseConfig`.
4. Cole em `js/firebase-config.js`.
5. **Firestore → Regras**: substitua pelo conteúdo de `firestore.rules` e publique.

Os pactos ficam na coleção `pactos`. Para consultar ou exportar, use o Firebase Console.

> Enquanto `apiKey` começar com `COLE_`, o site funciona e gera os arquivos, mas não grava nada.

## 2. Testar localmente

Os módulos ES não abrem via `file://`. Rode um servidor na pasta:

```bash
npx serve .
# ou
python3 -m http.server 8080
```

## 3. GitHub + Vercel

```bash
git init
git add .
git commit -m "Pacto Ipiranga"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/pacto-ipiranga.git
git push -u origin main
```

Na Vercel: **Add New → Project → Import** o repositório. Framework Preset: **Other**.
Sem build command, output directory na raiz. Deploy.

Depois do deploy, adicione o domínio da Vercel em
**Firebase → Authentication → Settings → Authorized domains** (só necessário se um dia usar Auth)
e, se quiser restringir a chave, em **Google Cloud → APIs e serviços → Credenciais** limite a API key ao domínio do site.

## Dados gravados por pacto

`consultor`, `semanaDe`, `clientePosto`, `prioridade`, `acao`, `compromisso`, `tempoAgenda`, `tempo`,
`olhar`, `comprometido`, `assinatura` (PNG em base64), `dataAssinatura`, `formato`, `origem`, `versao`, `criadoEm`.
