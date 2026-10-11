import globals from 'globals';
import tseslint from 'typescript-eslint';

// Confine del motore (ADR 0002, spec "Motore"): funzioni pure, senza interfaccia.
const dentroMotore = [
  {
    group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'lucide-react'],
    message: 'Il motore è fatto di funzioni pure: niente React.',
  },
  {
    group: ['**/components', '**/components/**', '**/App', '**/App.*', '**/main', '**/main.*'],
    message: 'Il motore non importa componenti né l\'applicazione.',
  },
  {
    group: ['**/utils/math', '**/utils/math.*'],
    message: 'Il vecchio utils/math non si riusa nel motore (ADR 0001): importi in centesimi interi, una sola arrotonda.',
  },
  {
    group: ['**/tabelle', '**/tabelle/**'],
    message: 'Il motore riceve Tabelle per iniezione: non importa mai i dati (spec "Tabelle CCNL versionate").',
  },
];

// Da fuori si importa solo l'indice del motore.
const versoMotore = [
  {
    group: ['**/motore/**', '!**/motore/index', '!**/motore/index.*'],
    message: 'Dal motore si importa solo l\'indice pubblico (src/motore).',
  },
];

// I dati delle tabelle importano dal motore solo l'indice pubblico (tipi e arrotonda): da `versoMotore`.

// Per ora la configurazione fa rispettare solo il confine del motore: il codice esistente non passa
// ancora le regole generali (no-explicit-any, no-unused-vars...), da aggiungere con un ticket a parte.
export default tseslint.config(
  {ignores: ['dist', 'node_modules', '.scratch']},
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module', globals: globals.browser},
    rules: {
      'no-restricted-imports': ['error', {patterns: versoMotore}],
    },
  },
  {
    files: ['src/motore/**'],
    rules: {'no-restricted-imports': ['error', {patterns: dentroMotore}]},
  },
);
