import fs from 'node:fs';
import path from 'node:path';

type AtomicWriteOpts = {
  /** If true (default), reuse the existing file's mode when replacing it. */
  preserveMode?: boolean;
  /** Explicit mode to use when creating the temp file (ignored if preserveMode resolves to a mode). */
  mode?: number; // e.g. 0o644
};

/**
 * Write a file atomically: write to a temp file, then rename.
 * Ensures that the file is either fully written or not present.
 */
export function atomicWrite(filePath: string, content: string, opts: AtomicWriteOpts = {}) {
  const { preserveMode = true } = opts;
  const dir = path.dirname(filePath);

  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });

  // Try to preserve the existing file's mode (fallback to provided or 0o666)
  let mode = opts.mode ?? 0o666;
  if (preserveMode && fs.existsSync(filePath)) {
    try {
      const st = fs.statSync(filePath);
      mode = st.mode & 0o777;
    } catch {
      // ignore; fall back to provided/default mode
    }
  }

  // Hidden, unique tmp name in same dir to keep rename atomic
  const tmpPath = path.join(
    dir,
    `.${Math.random().toString(36).slice(2)}.tmp`
  );

  let fd: number | null = null;
  try {
    // Create temp file with desired mode
    fd = fs.openSync(tmpPath, 'w', mode);

    // Write contents
    fs.writeFileSync(fd, content, 'utf8');

    // Flush file data & metadata
    fs.fsyncSync(fd);

    // Close before rename on some platforms
    fs.closeSync(fd);
    fd = null;

    // Atomically replace the target
    fs.renameSync(tmpPath, filePath);

    // Fsync the directory entry so the rename is durable
    let dfd: number | null = null;
    try {
      dfd = fs.openSync(dir, 'r');
      fs.fsyncSync(dfd);
    } catch {
      // Some filesystems/platforms may not support fsync on dirs—best-effort.
    } finally {
      if (dfd !== null) {
        try { fs.closeSync(dfd); } catch { /* no op */}
      }
    }
  } catch (err) {
    // Cleanup on failure
    try {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch { /* no op */}
      }
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // swallow cleanup errors
    }
    throw err;
  }
}
