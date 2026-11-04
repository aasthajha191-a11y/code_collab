import * as Y from 'yjs'

/**
 * docManager.ts — In-memory Yjs document store.
 *
 * Each room gets one shared Y.Doc. When users connect, they synchronize
 * against this server-side document using the Yjs sync protocol.
 *
 * Why Yjs?
 * Yjs uses CRDTs (Conflict-free Replicated Data Types). This means two
 * users can edit simultaneously and their changes are always merged
 * correctly — no data is ever lost or overwritten by accident.
 */

// Map of roomId → Y.Doc
const docs = new Map<string, Y.Doc>()

/**
 * Get or create the Y.Doc for a room.
 * Called when any user connects to a room.
 * If initialCode is provided and doc is newly created or empty, sets it on yText.
 */
export function getOrCreateDoc(roomId: string, initialCode?: string): Y.Doc {
  if (!docs.has(roomId)) {
    const doc = new Y.Doc()
    if (initialCode) {
      const yText = doc.getText('monaco')
      yText.insert(0, initialCode)
    }
    docs.set(roomId, doc)
    console.log(`[DocManager] Created new Y.Doc for room: ${roomId}`)
  } else if (initialCode) {
    const doc = docs.get(roomId)!
    const yText = doc.getText('monaco')
    if (yText.length === 0) {
      yText.insert(0, initialCode)
    }
  }
  return docs.get(roomId)!
}

/**
 * Get a doc only if it already exists (returns undefined otherwise).
 */
export function getDoc(roomId: string): Y.Doc | undefined {
  return docs.get(roomId)
}

/**
 * Read the current plain text string from the room's Y.Text('monaco').
 */
export function getDocContent(roomId: string): string {
  const doc = docs.get(roomId)
  return doc ? doc.getText('monaco').toString() : ''
}

/**
 * Update the text content of a room doc (e.g. on snapshot restore).
 */
export function setDocContent(roomId: string, newContent: string): void {
  const doc = getOrCreateDoc(roomId)
  const yText = doc.getText('monaco')
  doc.transact(() => {
    yText.delete(0, yText.length)
    yText.insert(0, newContent)
  })
}

/**
 * Apply a Yjs binary update to a room's document.
 * Called when the server receives an update from any client.
 */
export function applyUpdate(roomId: string, update: Uint8Array): void {
  const doc = getOrCreateDoc(roomId)
  Y.applyUpdate(doc, update)
}

/**
 * Get the full state of a document as a binary update.
 * This is sent to newly joining users so they get the current document.
 */
export function getStateAsUpdate(roomId: string): Uint8Array {
  const doc = getOrCreateDoc(roomId)
  return Y.encodeStateAsUpdate(doc)
}

/**
 * Get the state vector of a document.
 * Used in the Yjs sync protocol step 1 to compute missing updates.
 */
export function getStateVector(roomId: string): Uint8Array {
  const doc = getOrCreateDoc(roomId)
  return Y.encodeStateVector(doc)
}

/**
 * Get only the updates a client is missing (based on their state vector).
 * More efficient than sending the full document on every sync.
 */
export function getDiffUpdate(roomId: string, clientStateVector: Uint8Array): Uint8Array {
  const doc = getOrCreateDoc(roomId)
  return Y.encodeStateAsUpdate(doc, clientStateVector)
}

/**
 * Delete a room's document from memory.
 * Called when a room is deleted.
 */
export function deleteDoc(roomId: string): void {
  const doc = docs.get(roomId)
  if (doc) {
    doc.destroy()
    docs.delete(roomId)
    console.log(`[DocManager] Destroyed Y.Doc for room: ${roomId}`)
  }
}

/** Return list of all active room IDs currently held in memory */
export function getActiveRoomIds(): string[] {
  return Array.from(docs.keys())
}

/** How many documents are currently in memory (for monitoring) */
export function getDocCount(): number {
  return docs.size
}
