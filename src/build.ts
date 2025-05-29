import { resolve } from '@std/path/resolve';
import CMS from './cms/index.ts';

const PATH = new URL('..', import.meta.url).pathname;

const cms = new CMS(resolve(PATH, 'docs'), resolve(PATH, 'dist'));
await cms.build();
