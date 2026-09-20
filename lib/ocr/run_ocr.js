const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');

async function runOcr(imagePath, kategori = '') {
  const tempFiles = [];
  try {
    const worker = await createWorker('ind+eng');
    const ret = await worker.recognize(imagePath);
    let combinedText = ret.data.text || '';

    // Sectional recognition for Kartu Keluarga to enhance table rows & header accuracy
    const isKk = kategori === 'KARTU_KELUARGA' || /kk/i.test(path.basename(imagePath));
    if (isKk) {
      try {
        const sharp = require('sharp');
        const meta = await sharp(imagePath).metadata();
        if (meta.width && meta.height && meta.width > meta.height) {
          const W = meta.width;
          const H = meta.height;
          const dir = path.dirname(imagePath);

          // Top Header (top 28%)
          const headerPath = path.join(dir, `_temp_sec_h_${Date.now()}.png`);
          await sharp(imagePath).extract({ left: 0, top: 0, width: W, height: Math.floor(H * 0.28) }).toFile(headerPath);
          tempFiles.push(headerPath);

          // Table 1: Identitas Anggota Keluarga (24% to 52%)
          const table1Path = path.join(dir, `_temp_sec_t1_${Date.now()}.png`);
          await sharp(imagePath).extract({ left: 0, top: Math.floor(H * 0.24), width: W, height: Math.floor(H * 0.28) }).toFile(table1Path);
          tempFiles.push(table1Path);

          // Table 2: Status Hubungan & Orang Tua (48% to 75%)
          const table2Path = path.join(dir, `_temp_sec_t2_${Date.now()}.png`);
          await sharp(imagePath).extract({ left: 0, top: Math.floor(H * 0.48), width: W, height: Math.floor(H * 0.27) }).toFile(table2Path);
          tempFiles.push(table2Path);

          const rH = await worker.recognize(headerPath);
          const rT1 = await worker.recognize(table1Path);
          const rT2 = await worker.recognize(table2Path);

          combinedText += '\n\n--- SECTION_HEADER ---\n' + (rH.data.text || '');
          combinedText += '\n\n--- SECTION_TABLE1 ---\n' + (rT1.data.text || '');
          combinedText += '\n\n--- SECTION_TABLE2 ---\n' + (rT2.data.text || '');
        }
      } catch (secErr) {
        // Sectional recognition error ignored
      }
    }

    await worker.terminate();
    console.log(JSON.stringify({ success: true, text: combinedText }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message }));
  } finally {
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {}
    }
  }
}

if (process.argv[2]) {
  runOcr(process.argv[2], process.argv[3] || '');
}
