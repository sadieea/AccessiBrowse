const DB_NAME = 'AccessiBrowseDB';
const STORE_NAME = 'memories';
const DB_VERSION = 1;

/**
 * Gets a reference to the IndexedDB.
 */
async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject("Error opening DB");
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Adds a new memory to the database.
 */
export async function addMemory(item) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const itemWithTimestamp = {
      ...item,
      timestamp: new Date().toISOString()
    };

    const request = store.add(itemWithTimestamp);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error adding memory:", event.target.error);
      reject("Error adding memory");
    };
  });
}

/**
 * Gets all memories from the database.
 */
export async function getAllMemories() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result.reverse());
        };
        request.onerror = (event) => {
            console.error('Error fetching items:', event.target.error);
            reject('Error fetching items');
        };
    });
}