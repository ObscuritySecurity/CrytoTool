import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = path.join(__dirname, 'assets', 'CrytoTool.png');
const androidRes = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const iosAssets = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

const androidIcons = [
  { name: 'mipmap-mdpi', size: 48, density: 'mdpi' },
  { name: 'mipmap-hdpi', size: 72, density: 'hdpi' },
  { name: 'mipmap-xhdpi', size: 96, density: 'xhdpi' },
  { name: 'mipmap-xxhdpi', size: 144, density: 'xxhdpi' },
  { name: 'mipmap-xxxhdpi', size: 192, density: 'xxxhdpi' }
];

const iosIcons = [
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-76.png', size: 76 },
  { name: 'icon-76@2x.png', size: 152 },
  { name: 'icon-83.5@2x.png', size: 167 },
  { name: 'icon-1024.png', size: 1024 }
];

async function generateIcons() {
  console.log('Generating icons from CrytoTool.png...');
  
  if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    return;
  }

  // Android icons
  for (const icon of androidIcons) {
    const dir = path.join(androidRes, icon.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(sourceImage)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`Created Android ${icon.density} icon (${icon.size}x${icon.size})`);
  }

  // iOS icons
  if (!fs.existsSync(iosAssets)) {
    fs.mkdirSync(iosAssets, { recursive: true });
  }
  
  for (const icon of iosIcons) {
    await sharp(sourceImage)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(iosAssets, icon.name));
    console.log(`Created iOS icon ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Create Contents.json for iOS
  const contentsJson = {
    images: iosIcons.map(icon => ({
      size: `${icon.size / (icon.name.includes('@') ? parseInt(icon.name.match(/@(\d+)x/)?.[1] || '1') : 1)}x${icon.size / (icon.name.includes('@') ? parseInt(icon.name.match(/@(\d+)x/)?.[1] || '1') : 1)}`,
      idiom: 'universal',
      filename: icon.name,
      scale: icon.name.includes('@') ? icon.name.match(/@(\d+)x/)?.[1] + 'x' : '1x'
    }))
  };
  
  fs.writeFileSync(
    path.join(iosAssets, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
