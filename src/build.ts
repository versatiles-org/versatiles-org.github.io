import { resolve } from 'node:path';
import CMS from './cms/index.ts';
import { config } from './config.ts';

const PATH = new URL('..', import.meta.url).pathname;

const cms = new CMS(resolve(PATH, config.docsDir), resolve(PATH, config.distDir));
await cms.build();
