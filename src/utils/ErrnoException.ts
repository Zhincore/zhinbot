export interface ErrnoException extends Error {
  errno?: number | undefined;
  code?: string | undefined;
  path?: string | undefined;
  syscall?: string | undefined;
}

export function isErrno(err: unknown): err is ErrnoException {
  return err instanceof Error && "code" in err;
}
