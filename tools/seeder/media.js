// Shared media helpers: download an image URL, upload to /v1/upload.

const path = require('path');

const USER_AGENT = 'HeimursagaSeeder/0.1 (+https://heimursaga.com)';

async function downloadImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Download ${url} failed: HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Download ${url}: unexpected content-type ${contentType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const decoded = decodeURIComponent(new URL(url).pathname);
  const filename = path.basename(decoded) || 'image.jpg';
  return { buffer: buf, contentType, filename };
}

async function uploadToS3(api, image) {
  const form = new FormData();
  const blob = new Blob([image.buffer], { type: image.contentType });
  form.append('file', blob, image.filename);

  await api._ensureFreshToken();
  const url = `${api.baseUrl}/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${api.token}` },
    body: form,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  if (!res.ok) {
    throw new Error(`Upload failed HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!json?.uploadId) {
    throw new Error(`Upload response missing 'uploadId' field: ${text.slice(0, 300)}`);
  }
  return { uploadId: json.uploadId, url: json.original };
}

module.exports = { downloadImage, uploadToS3 };
