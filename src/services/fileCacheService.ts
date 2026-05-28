/**
 * IndexedDB-backed local file cache.
 *
 * Key:   Media.hash  (hex SHA-256 of file content)
 * Value: Blob + metadata  (name, type, lastAccessed)
 * TTL:   30 days from last access. evictExpiredEntries() should be called once on app start.
 *
 * Limitations (document to users):
 * - Cache is browser- and device-specific.
 * - Clearing browser storage (DevTools → Application → Clear storage) removes it.
 * - A modified file has a different hash and will not match.
 */

const DB_NAME = "alomedia-file-cache"
const STORE_NAME = "files"
const DB_VERSION = 1
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface CacheRecord {
  hash: string
  blob: Blob
  name: string
  type: string
  lastAccessed: number
}

export class FileCacheService {
  private static _instance: FileCacheService
  private dbPromise: Promise<IDBDatabase> | null = null

  static get instance(): FileCacheService {
    if (!FileCacheService._instance) {
      FileCacheService._instance = new FileCacheService()
    }
    return FileCacheService._instance
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME, { keyPath: "hash" })
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => {
          this.dbPromise = null
          reject(request.error)
        }
      })
    }
    return this.dbPromise
  }

  async saveFileToCache(hash: string, file: File): Promise<void> {
    const db = await this.openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const record: CacheRecord = {
        hash,
        blob: new Blob([file], { type: file.type }),
        name: file.name,
        type: file.type,
        lastAccessed: Date.now(),
      }
      const req = tx.objectStore(STORE_NAME).put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getFileFromCache(hash: string): Promise<File | null> {
    const db = await this.openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(hash)
      req.onsuccess = () => {
        const record = req.result as CacheRecord | undefined
        if (!record) {
          resolve(null)
          return
        }
        store.put({ ...record, lastAccessed: Date.now() })
        resolve(new File([record.blob], record.name, { type: record.type }))
      }
      req.onerror = () => reject(req.error)
    })
  }

  async evictExpiredEntries(): Promise<void> {
    const db = await this.openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      const store = tx.objectStore(STORE_NAME)
      const cutoff = Date.now() - TTL_MS
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        if ((cursor.value as CacheRecord).lastAccessed < cutoff) {
          cursor.delete()
        }
        cursor.continue()
      }
      req.onerror = () => {}
    })
  }
}

export const fileCacheService = FileCacheService.instance

export const saveFileToCache = (hash: string, file: File) => fileCacheService.saveFileToCache(hash, file)
export const getFileFromCache = (hash: string) => fileCacheService.getFileFromCache(hash)
export const evictExpiredEntries = () => fileCacheService.evictExpiredEntries()