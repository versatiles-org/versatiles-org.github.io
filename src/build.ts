import CMS from './cms/index.ts';

const SRC_PATH = new URL('../docs', import.meta.url).pathname;
const DST_PATH = new URL('../dist', import.meta.url).pathname;

const cms = new CMS(SRC_PATH, DST_PATH);
await cms.build();
