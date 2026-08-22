import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** A single file found by {@link walkFiles}. */
export interface WalkedFile {
	/** Absolute path to the file. */
	path: string;
	/** The file's own name, without any directory part. */
	name: string;
}

/**
 * Recursively yields every file below `dir`.
 *
 * Stands in for `walkSync` from Deno's `@std/fs`, whose entries carry a ready-made
 * `path` and an `isFile` flag. Node's `readdirSync` instead returns `Dirent`s that
 * split the location across `parentPath` and `name`, and it omits `dir` itself, so
 * this rejoins them into the shape the call sites already expect.
 *
 * Directories and symlinks are skipped — no caller ever wanted them.
 *
 * Iteration is lazy, so a missing `dir` throws on the first step rather than at the
 * call. Callers that treat "no such directory" as "nothing to do" catch it themselves.
 *
 * @param dir - Directory to walk
 */
export function* walkFiles(dir: string): Generator<WalkedFile> {
	for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue;
		yield { path: join(entry.parentPath, entry.name), name: entry.name };
	}
}
