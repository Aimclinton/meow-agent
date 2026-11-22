// Copy the OCR engine + Thai/English language data into public/ so the app
// serves them itself (no third-party CDN needed at runtime).
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'tesseract');
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

mkdirSync(join(out, 'core'), { recursive: true });
mkdirSync(join(out, 'lang'), { recursive: true });

cpSync(join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  cpSync(join(pkgDir('tesseract.js-core'), f), join(out, 'core', f));
}
for (const lang of ['eng', 'tha']) {
  const src = join(pkgDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`);
  if (!existsSync(src)) throw new Error(`Missing language data: ${src}`);
  cpSync(src, join(out, 'lang', `${lang}.traineddata.gz`));
}
console.log('tesseract assets copied to public/tesseract');
