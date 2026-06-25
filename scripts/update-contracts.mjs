import { mkdir, writeFile } from 'node:fs/promises';

const contracts = [
  [
    'contracts/openapi.json',
    'https://raw.githubusercontent.com/didair/lokal/main/contracts/openapi.json',
  ],
  [
    'contracts/lokal-manifest.schema.json',
    'https://raw.githubusercontent.com/didair/lokal/main/contracts/lokal-manifest.schema.json',
  ],
];

await mkdir('contracts', { recursive: true });

for (const [filePath, url] of contracts) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  await writeFile(filePath, `${text.trim()}\n`);
  console.log(`Updated ${filePath}`);
}
