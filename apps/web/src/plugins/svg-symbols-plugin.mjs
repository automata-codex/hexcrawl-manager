import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
        const frameworkIconDir = resolve('src/components/InteractiveMap/icons');
        const dataPath = process.env.ACHM_DATA_PATH || '../../data';
        const dataIconDir = resolve(dataPath, 'map-assets');

        const loadSymbols = (dir) => {
          if (!existsSync(dir)) return [];
          return readdirSync(dir)
            .filter((file) => file.endsWith('.svg'))
            .map((file) => ({
              name: file,
              content: readFileSync(resolve(dir, file), 'utf-8'),
            }));
        };

        // Load from both directories
        // Data icons with same filename override framework icons
        const frameworkIcons = loadSymbols(frameworkIconDir);
        const dataIcons = loadSymbols(dataIconDir);

        const iconMap = new Map();
        for (const icon of frameworkIcons) {
          iconMap.set(icon.name, icon.content);
        }
        for (const icon of dataIcons) {
          iconMap.set(icon.name, icon.content);
        }

        const symbols = Array.from(iconMap.values()).join('\n');
        return `export default \`<defs>${symbols}</defs>\`;`;
      }
    },
  };
}
