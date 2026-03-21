// ============================================
// QR Code Generator for Assets
// ============================================
// Generates QR code images for all assets in database
// Output: server/qr-codes/ folder with PNG files
//
// Install: npm install qrcode
// Run:     node generate-qr.js
// ============================================

const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const Asset = require('./models/Asset');

async function generateQRCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create output folder
    const outputDir = path.join(__dirname, 'qr-codes');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get all assets
    const assets = await Asset.find({ is_active: true });
    console.log(`\n📱 Generating QR codes for ${assets.length} assets...\n`);

    for (const asset of assets) {
      const filename = `${asset.asset_id}.png`;
      const filepath = path.join(outputDir, filename);

      // Generate QR code
      // The QR code contains JUST the asset_id string
      // When scanned, the app sends this to GET /api/assets/qr/:assetId
      await QRCode.toFile(filepath, asset.asset_id, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      console.log(`  ✅ ${asset.asset_id} → ${filename}`);
      console.log(`     Type: ${asset.type} | Location: ${asset.location}`);
    }

    // Also generate a printable HTML page
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Scan2Fix - QR Codes</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2196F3; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .card {
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      page-break-inside: avoid;
    }
    .card img { width: 200px; height: 200px; }
    .asset-id { font-size: 18px; font-weight: bold; margin: 10px 0 5px; }
    .asset-type { color: #2196F3; font-size: 14px; }
    .asset-location { color: #666; font-size: 12px; margin-top: 5px; }
    .instructions {
      text-align: center; margin: 20px 0; padding: 15px;
      background: #e3f2fd; border-radius: 8px;
    }
    @media print {
      .instructions { display: none; }
      .grid { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <h1>🔧 Scan2Fix - QR Codes</h1>
  <div class="instructions">
    <strong>Instructions:</strong> Print this page → Cut out QR codes → Stick on machines
    <br>Each QR code links to its specific machine in the Scan2Fix app.
  </div>
  <div class="grid">`;

    for (const asset of assets) {
      const typeName = asset.type === 'AC' ? '❄️ Air Conditioner' :
                       asset.type === 'WATER_COOLER' ? '💧 Water Cooler' :
                       '🌀 Desert Cooler';

      // Read QR image and convert to base64
      const qrPath = path.join(outputDir, `${asset.asset_id}.png`);
      const qrBase64 = fs.readFileSync(qrPath).toString('base64');

      html += `
    <div class="card">
      <img src="data:image/png;base64,${qrBase64}" alt="${asset.asset_id}">
      <div class="asset-id">${asset.asset_id}</div>
      <div class="asset-type">${typeName}</div>
      <div class="asset-location">📍 ${asset.location}</div>
    </div>`;
    }

    html += `
  </div>
  <div class="instructions" style="margin-top: 30px">
    Generated: ${new Date().toLocaleString()} | Total: ${assets.length} assets
  </div>
</body>
</html>`;

    // Save HTML
    const htmlPath = path.join(outputDir, 'print-all-qr-codes.html');
    fs.writeFileSync(htmlPath, html);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ ALL QR CODES GENERATED!');
    console.log('═══════════════════════════════════════');
    console.log(`\n📁 Output folder: ${outputDir}`);
    console.log(`📄 Print page: ${htmlPath}`);
    console.log('\n📌 Next steps:');
    console.log('  1. Open print-all-qr-codes.html in browser');
    console.log('  2. Print the page (Ctrl+P)');
    console.log('  3. Cut out QR codes');
    console.log('  4. Stick on corresponding machines');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

generateQRCodes();