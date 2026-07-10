const fs = require('fs');
const html = fs.readFileSync('spain.html', 'utf8');
const urls = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
console.log([...new Set(urls)].filter(u => u.includes('embed') || u.includes('player')));
