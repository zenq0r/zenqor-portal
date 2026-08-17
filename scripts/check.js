const { execFileSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

function findJavaScript(dir) {
    return readdirSync(dir).flatMap(name => {
        if (name === 'node_modules' || name === '.git') return [];
        const path = join(dir, name);
        return statSync(path).isDirectory() ? findJavaScript(path) : (path.endsWith('.js') ? [path] : []);
    });
}

for (const file of findJavaScript(process.cwd())) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
