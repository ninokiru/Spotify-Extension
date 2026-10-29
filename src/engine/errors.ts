export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "EngineError";
  }
}

export function toErrorCode(error: unknown): { code: string; detail: string } {
  if (error instanceof EngineError) {
    return { code: error.code, detail: error.message };
  }

  if (error instanceof Error) {
    const detail = error.message;
    if (/EACCES|EPERM|access is denied/i.test(detail)) {
      return { code: "op.error.permission", detail };
    }
    return { code: "op.error.generic", detail };
  }

  return { code: "op.error.generic", detail: String(error) };
}
