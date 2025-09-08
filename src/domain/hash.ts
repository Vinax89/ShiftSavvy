// Deliberately invalid at runtime to force explicit imports.
// Import from 'src/domain/hash-client' in client components, and
// 'src/domain/hash-server' in server code or API routes.
export function sha256(): never { throw new Error("Import from 'src/domain/hash-client' or 'src/domain/hash-server' explicitly."); }
export function sha256Hex(): never { throw new Error("Import from 'src/domain/hash-client' or 'src/domain/hash-server' explicitly."); }
