import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { config } from 'dotenv';

config({ path: '../../.env' });

// Photos written by tests land in a scratch directory, never beside the developer's own.
process.env.IMAGE_DIR ??= mkdtempSync(join(tmpdir(), '.panna-images-'));
