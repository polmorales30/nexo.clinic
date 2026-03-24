import fs from 'fs';
import path from 'path';

const walk = (dir: string, filelist: string[] = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (!filepath.includes('node_modules') && !filepath.includes('.next')) {
                walk(filepath, filelist);
            }
        } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
            filelist.push(filepath);
        }
    }
    return filelist;
};

const files = walk(path.join(process.cwd(), 'apps/web'));

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix the missed text-white issue
    content = content.replace(/text-white/g, 'text-slate-900');
    // Subdued text should be slate-500/600, not gray-400
    content = content.replace(/text-gray-400/g, 'text-slate-500');
    content = content.replace(/text-gray-500/g, 'text-slate-600');
    content = content.replace(/text-gray-[6789]00/g, 'text-slate-900');

    // Backgrounds: 
    // The main app bg should be slate-50, cards should be white.
    // Replace gray-50/40, gray-50/50 etc with white
    content = content.replace(/bg-gray-50\/\d+/g, 'bg-white');
    content = content.replace(/bg-gray-100\/\d+/g, 'bg-slate-50');
    content = content.replace(/bg-gray-50/g, 'bg-white');
    content = content.replace(/bg-gray-100/g, 'bg-slate-50');
    content = content.replace(/bg-gray-200/g, 'bg-slate-100');

    // Borders:
    content = content.replace(/border-gray-200/g, 'border-slate-200');
    content = content.replace(/border-gray-[345]00/g, 'border-slate-300');

    // Elevate the red to professional Red-600 for important things, Red-500 for secondary, Rose/Red-50 for backgrounds
    content = content.replace(/bg-red-400\/[12]0/g, 'bg-red-50');
    content = content.replace(/bg-red-500\/[12]0/g, 'bg-red-50');
    content = content.replace(/bg-red-400/g, 'bg-red-600');
    content = content.replace(/bg-red-500/g, 'bg-red-600');
    content = content.replace(/hover:bg-red-300/g, 'hover:bg-red-700');
    content = content.replace(/hover:bg-red-400/g, 'hover:bg-red-700');
    content = content.replace(/hover:bg-red-500/g, 'hover:bg-red-700');
    content = content.replace(/text-red-400/g, 'text-red-600');

    // Blue, Pink, Orange accents (make them softer backgrounds)
    content = content.replace(/bg-([a-z]+)-400\/10/g, 'bg-$1-50');
    content = content.replace(/text-([a-z]+)-400/g, 'text-$1-600');

    // Purge custom glowing shadows
    content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([^)]+\)\]/g, 'shadow-sm');

    fs.writeFileSync(file, content, 'utf8');
}

console.log('Theme styling pass completed!');
