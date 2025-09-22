import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** @returns {import('vite').Plugin} */
export default function svgSymbolsPlugin() {
  return {
    name: 'virtual-svg-symbols',
    resolveId(id) {
      return id === 'virtual:svg-symbols' ? id : null;
    },
    load(id) {
      if (id === 'virtual:svg-symbols') {
        const iconDir = resolve('src/components/InteractiveMap/icons');
        const symbols = readdirSync(iconDir)
          .filter((file) => file.endsWith('.svg'))
          .map((file) => readFileSync(resolve(iconDir, file), 'utf-8'))
          .join('\\n');

        return `export default \`<defs>${symbols}</defs>\`;`;
      }
    },
  };
}
