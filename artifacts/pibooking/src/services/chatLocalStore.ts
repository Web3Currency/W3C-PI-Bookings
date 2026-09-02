const DB_NAME = 'w3c-pi-bookings-chat';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';

export type LocalSyncStatus = 'pending' | 'sent' | 'failed';

export type LocalConversation = {
  id: string;
  booking_id: string | null;
  other_pi_uid: string;
  other_name: string;
  other_username?: string | null;
  other_photo_url?: string | null;
  other_role?: 'client' | 'provider' | null;
  last_message?: string | null;
  last_message_type?: 'user' | 'system' | null;
  last_message_at?: string | null;
  unread_count: number;
  updated_at: string;
  booking_status?: string | null;
  project_deadline?: string | null;
  cached_at: string;
};

export type LocalMessage = {
  id: string;
  conversation_id: string;
  booking_id: string;
  sender_pi_uid: string;
  message_type: 'user' | 'system';
  content: string;
  created_at: string;
  sync_status?: LocalSyncStatus;
};

const canUseIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
        store.createIndex('updated_at', 'updated_at', { unique: false });
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('conversation_id', 'conversation_id', { unique: false });
        store.createIndex('conversation_created_at', ['conversation_id', 'created_at'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local chat cache.'));
  });
}

async function transaction<T>(storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let request: IDBRequest<T> | void;
    try { request = work(store); } catch (error) { db.close(); reject(error); return; }
    tx.oncomplete = () => { const value = request?.result; db.close(); resolve(value); };
    tx.onerror = () => { const error = tx.error || new Error('Local chat cache transaction failed.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Local chat cache transaction aborted.'); db.close(); reject(error); };
  });
}

async function getAll<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const source: IDBObjectStore | IDBIndex = indexName ? tx.objectStore(storeName).index(indexName) : tx.objectStore(storeName);
    const request = source.getAll(query);
    request.onsuccess = () => resolve((request.result || []) as T[]);
    request.onerror = () => reject(request.error || new Error('Unable to read local chat cache.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Unable to read local chat cache.')); };
  });
}

export const chatLocalStore = {
  async getConversations(): Promise<LocalConversation[]> {
    const rows = await getAll<LocalConversation>(CONVERSATIONS_STORE);
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async putConversations(conversations: Omit<LocalConversation, 'cached_at'>[]): Promise<void> {
    const db = await openDb();
    if (!db || !conversations.length) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite');
      const store = tx.objectStore(CONVERSATIONS_STORE);
      const cachedAt = new Date().toISOString();
      conversations.forEach(conversation => store.put({ ...conversation, cached_at: cachedAt }));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { const error = tx.error || new Error('Unable to cache conversations.'); db.close(); reject(error); };
    });
  },
  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    const rows = await getAll<LocalMessage>(MESSAGES_STORE, 'conversation_id', conversationId);
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  },
  async putMessages(messages: LocalMessage[]): Promise<void> {
    const db = await openDb();
    if (!db || !messages.length) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = tx.objectStore(MESSAGES_STORE);
      messages.forEach(message => store.put(message));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { const error = tx.error || new Error('Unable to cache messages.'); db.close(); reject(error); };
    });
  },
  async putMessage(message: LocalMessage): Promise<void> {
    await transaction(MESSAGES_STORE, 'readwrite', store => store.put(message));
  },
  async deleteMessage(id: string): Promise<void> {
    await transaction(MESSAGES_STORE, 'readwrite', store => store.delete(id));
  },
  async clearConversationMessages(conversationId: string): Promise<void> {
    const rows = await getAll<LocalMessage>(MESSAGES_STORE, 'conversation_id', conversationId);
    const db = await openDb();
    if (!db || !rows.length) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = tx.objectStore(MESSAGES_STORE);
      rows.forEach(row => store.delete(row.id));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { const error = tx.error || new Error('Unable to clear local chat cache.'); db.close(); reject(error); };
    });
  }
};
