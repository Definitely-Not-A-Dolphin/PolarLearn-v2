// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
