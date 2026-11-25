/**
 * Represents a client-side queued outage report stored offline in IndexedDB.
 */
export type QueuedReport = {
  requestId: string;
  areaSlug: string;
  status: "no_power" | "flickering" | "restored";
  notes: string;
  latitude: number | null;
  longitude: number | null;
  photo: Blob | null;
  queuedAt: string;
  attempts?: number;
  nextRetryAt?: number;
  lastError?: string;
}

const databaseName = "gridsight-offline";
const storeName = "reports";

/**
 * Opens or initializes the client IndexedDB database for offline report persistence.
 *
 * @returns {Promise<IDBDatabase>} Open IndexedDB connection.
 */
function openQueue() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "requestId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores or updates an outage report in the IndexedDB offline queue.
 *
 * @param report - Queued report payload including binary photo Blob and retry metadata.
 * @returns {Promise<void>} Resolves when write transaction completes.
 */
export async function queueReport(report: QueuedReport) {
  const database = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(report);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

/**
 * Retrieves all pending offline reports from IndexedDB.
 *
 * @returns {Promise<QueuedReport[]>} Array of reports waiting to be synchronized.
 */
export async function getQueuedReports() {
  const database = await openQueue();
  const result = await new Promise<QueuedReport[]>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as QueuedReport[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

/**
 * Deletes a queued report from IndexedDB after successful network sync or permanent rejection.
 *
 * @param requestId - Unique client request UUID of the queued report.
 * @returns {Promise<void>} Resolves when delete transaction completes.
 */
export async function removeQueuedReport(requestId: string) {
  const database = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(requestId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
