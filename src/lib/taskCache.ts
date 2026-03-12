const DB_NAME = "weekly-plan-cache";
const STORE_NAME = "tasks";
const DB_VERSION = 1;

function getKey(subCategoryId: string, weekStart: string): string {
  return `${subCategoryId}_${weekStart}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

export type CachedTask = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  weekStart: string;
  subTasks: {
    id: string;
    taskId: string;
    content: string;
    description: string;
    assignee: string;
    isCompleted: boolean;
    isPriority: boolean;
    sortOrder: number;
    dueDate: string | null;
    progress: {
      id: string;
      subTaskId: string;
      content: string;
      assignee: string;
      isPriority: boolean;
      isCompleted: boolean;
      dueDate: string | null;
      sortOrder: number;
    }[];
  }[];
};

export async function getTasks(
  subCategoryId: string,
  weekStart: string,
): Promise<CachedTask[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(getKey(subCategoryId, weekStart));
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const row = req.result as { key: string; data: CachedTask[] } | undefined;
        resolve(row?.data ?? null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function setTasks(
  subCategoryId: string,
  weekStart: string,
  data: CachedTask[],
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ key: getKey(subCategoryId, weekStart), data });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}

export async function clearTasks(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}
