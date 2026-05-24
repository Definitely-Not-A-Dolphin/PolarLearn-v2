import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenAPIDocument } from '@trpc/openapi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routerPath = path.resolve(__dirname, '..', 'app', 'server', 'main.ts');
const outputPath = path.resolve(__dirname, '..', 'openapi.json');

const title = 'PolarLearn tRPC API';
const version = 'v2.0-PRE-2';

async function main() {
  const doc = await generateOpenAPIDocument(routerPath, {
    exportName: 'AppRouter',
    title,
    version,
  });

  const normalizedPrefix = '/api/rpc'.replace(/\/$/, '');
  doc.paths = Object.fromEntries(
    Object.entries(doc.paths ?? {}).map(([pathName, pathItem]) => [
      pathName.startsWith(normalizedPrefix) ? pathName : `${normalizedPrefix}${pathName}`,
      pathItem,
    ]),
  );
  delete doc.servers;

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`);

  console.log(`Wrote OpenAPI spec to ${outputPath}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
