import fs from 'fs';
import https from 'https';
import path from 'path';

const scripts = [
  { url: "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js", file: "teachablemachine-image.min.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", file: "hands.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js", file: "drawing_utils.js" },
  { url: "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", file: "camera_utils.js" },
  { url: "https://docs.opencv.org/4.x/opencv.js", file: "opencv.js" },
  { url: "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js", file: "face-api.min.js" }
];

const dir = path.join(process.cwd(), 'public', 'js');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  for (const { url, file } of scripts) {
    const dest = path.join(dir, file);
    console.log(`Downloading ${url} to ${dest}`);
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(dest);
      https.get(url, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          https.get(response.headers.location, res2 => {
            res2.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(); });
          }).on('error', reject);
        } else {
          response.pipe(fileStream);
          fileStream.on('finish', () => { fileStream.close(); resolve(); });
        }
      }).on('error', reject);
    });
  }
}

download().then(() => console.log('Done')).catch(console.error);
