import { posix } from "path";

export function normalizePath(id: string): string {
  return posix.normalize(id.replace(/\\/g, "/"));
}
