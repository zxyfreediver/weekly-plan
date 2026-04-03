const DB_NAME = "weekly-plan-cache";
const STORE_NAME = "tasks";
const DB_VERSION = 1;
const WRITE_DEBOUNCE_MS = 120;

type CachedTaskRow = {
  key: string;
  data: CachedTask[];
};

type PendingWrite = {
  data: CachedTask[];
  timer: ReturnType<typeof setTimeout>;
  promise: Promise<void>;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: unknown) => void;
};

let dbPromise: Promise<IDBDatabase> | null = null;
const pendingWrites = new Map<string, PendingWrite>();

function getKey(subCategoryId: string, weekStart: string): string {
  return `${subCategoryId}_${weekStart}`;
}

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
    });
  }

  return dbPromise;
}

async function writeTasks(key: string, data: CachedTask[]): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, data });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

function queueTasksWrite(key: string, data: CachedTask[]): Promise<void> {
  const pending = pendingWrites.get(key);

  if (pending) {
    pending.data = data;
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      void flushQueuedWrite(key);
    }, WRITE_DEBOUNCE_MS);
    return pending.promise;
  }

  let resolvePromise: (value: void | PromiseLike<void>) => void = () => {};
  let rejectPromise: (reason?: unknown) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  pendingWrites.set(key, {
    data,
    timer: setTimeout(() => {
      void flushQueuedWrite(key);
    }, WRITE_DEBOUNCE_MS),
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  });

  return promise;
}

async function flushQueuedWrite(key: string): Promise<void> {
  const pending = pendingWrites.get(key);

  if (!pending) {
    return;
  }

  pendingWrites.delete(key);

  try {
    await writeTasks(key, pending.data);
    pending.resolve();
  } catch (err) {
    pending.reject(err);
  }
}

export type CachedTask = {
  id: string;
  content: string;
  description: string;
  isCompleted: boolean;
  weekStart: string;
  completedAt: string | null;
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
    const key = getKey(subCategoryId, weekStart);
    const pending = pendingWrites.get(key);

    if (pending) {
      return pending.data;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const row = req.result as CachedTaskRow | undefined;
        resolve(row?.data ?? null);
      };
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
  await queueTasksWrite(getKey(subCategoryId, weekStart), data);
}

export async function clearTasks(): Promise<void> {
  try {
    const entries = Array.from(pendingWrites.entries());
    pendingWrites.clear();

    for (const [key, pending] of entries) {
      clearTimeout(pending.timer);
      try {
        await writeTasks(key, pending.data);
        pending.resolve();
      } catch {
        pending.reject(new Error("Failed to flush task before clear"));
      }
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch {
    // ignore
  }
}
