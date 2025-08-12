// Simple script to generate placeholder icons
const fs = require('fs');
const path = require('path');

// SVG template for the icon
const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#FF6B35"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">K</text>
</svg>`;

// Generate SVG icons
const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

sizes.forEach(size => {
  const svg = svgTemplate(size);
  fs.writeFileSync(path.join(publicDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg`);
});

// Also create apple-touch-icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), svgTemplate(180));
console.log('Generated apple-touch-icon.svg');

console.log('Icon generation complete!');