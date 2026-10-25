export type QueuedReport = {
  requestId: string;
  areaSlug: string;
  status: "no_power" | "flickering" | "restored";
  notes: string;
  latitude: number | null;
  longitude: number | null;
  photo: Blob | null;
  queuedAt: string;
};

const databaseName = "gridsight-offline";
const storeName = "reports";

function openQueue() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "requestId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

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
