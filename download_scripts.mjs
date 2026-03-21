import fs from 'fs';
import path from 'path';

const scripts = [
  { url: "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js", file: "teachablemachine-image.min.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", file: "hands.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js", file: "drawing_utils.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", file: "camera_utils.js" },
  { url: "https://docs.opencv.org/4.x/opencv.js", file: "opencv.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_packed_assets_loader.js", file: "hands_solution_packed_assets_loader.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_simd_wasm_bin.js", file: "hands_solution_simd_wasm_bin.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.binarypb", file: "hands.binarypb" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_packed_assets.data", file: "hands_solution_packed_assets.data" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_simd_wasm_bin.wasm", file: "hands_solution_simd_wasm_bin.wasm" }
];

const dir = path.join(process.cwd(), 'public', 'js');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  for (const { url, file } of scripts) {
    const dest = path.join(dir, file);
    console.log(`Downloading ${url} to ${dest}...`);
    
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buffer));
      console.log(`✅ Saved ${file} (${buffer.byteLength} bytes)`);
    } catch (err) {
      console.error(`❌ Failed to fetch ${url}:`, err.message);
    }
  }

  // Copy Blockly media
  const blocklyMediaDir = path.join(process.cwd(), 'node_modules', 'blockly', 'media');
  const targetMediaDir = path.join(process.cwd(), 'public', 'media');
  if (!fs.existsSync(targetMediaDir)) fs.mkdirSync(targetMediaDir, { recursive: true });
  
  if (fs.existsSync(blocklyMediaDir)) {
    const files = fs.readdirSync(blocklyMediaDir);
    for (const f of files) {
      if (fs.statSync(path.join(blocklyMediaDir, f)).isFile()) {
        fs.copyFileSync(path.join(blocklyMediaDir, f), path.join(targetMediaDir, f));
      }
    }
    console.log("✅ Copied Blockly media to public/media/");
  } else {
    console.log("⚠️ Could not find blockly/media inside node_modules.");
  }
}

download().then(() => console.log('Done')).catch(console.error);
