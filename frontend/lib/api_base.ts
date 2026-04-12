const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Return configured API base as-is.
 * In this project backend may bind only to localhost (not 127.0.0.1),
 * so automatic host rewriting can create hard network failures.
 */
export function getApiBase(): string {
  return RAW_API_BASE
}

