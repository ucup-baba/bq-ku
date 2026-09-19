const { createWorker } = require('tesseract.js');

async function runOcr(imagePath) {
  try {
    const worker = await createWorker('ind+eng');
    const ret = await worker.recognize(imagePath);
    await worker.terminate();
    console.log(JSON.stringify({ success: true, text: ret.data.text || '' }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message }));
  }
}

if (process.argv[2]) {
  runOcr(process.argv[2]);
}
