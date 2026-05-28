/**
 * Deep-clones a value using JSON serialization.
 *
 * Suitable for plain data objects (project snapshots, clips, etc.).
 * Not suitable for values containing Functions, Dates, Maps, Sets, or undefined.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
