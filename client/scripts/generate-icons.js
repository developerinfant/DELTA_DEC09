const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the public directory exists
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, pngPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`Generated ${pngPath}`);
  } catch (error) {
    console.error(`Error generating ${pngPath}:`, error);
  }
}

// Generate PNG icons
async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Convert SVG icons to PNG
  await convertSvgToPng(
    path.join(iconsDir, 'logo192.svg'),
    path.join(publicDir, 'logo192.png'),
    192
  );
  
  await convertSvgToPng(
    path.join(iconsDir, 'logo512.svg'),
    path.join(publicDir, 'logo512.png'),
    512
  );
  
  await convertSvgToPng(
    path.join(iconsDir, 'maskable_icon.svg'),
    path.join(publicDir, 'maskable_icon.png'),
    192
  );
  
  console.log('PWA icons generated successfully!');
}

generateIcons();