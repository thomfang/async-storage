import { IStorage, StorageData, DBType } from "./interface";

const STORE_NAME = 'idb:storage';
const KEY_PATH = 'key';

type ResolveCallback = (...args: any[]) => void;
type RejectCallback = (error: any) => void;
type Command = 'get' | 'set' | 'remove' | 'clear' | 'keys';
type CommandInfo = {
  name: Command;
  key: string;
  data: StorageData;
  resolve: ResolveCallback;
  reject: RejectCallback;
};

export class IDBStorage implements IStorage {

  type: DBType = 'indexedDB';

  private db!: IDBDatabase;
  private initialized = false;
  private error: any;
  private commands: CommandInfo[] = [];

  constructor(public dbName: string) { }

  init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName);
      request.onsuccess = () => {
        this.db = request.result;
        this.ready();
        resolve();
      };
      request.onerror = e => {
        this.error = e;
        this.initFail();
        reject(e);
      };
      request.onupgradeneeded = ev => {
        this.db = (ev.target as any).result;
        if (!this.db.objectStoreNames.contains(STORE_NAME)) {
          this.db.createObjectStore(STORE_NAME, { keyPath: KEY_PATH, autoIncrement: true });
        }
      };
    });
  }

  private ready() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    while (this.commands.length) {
      this.execCommand(this.commands.shift() as CommandInfo);
    }
  }

  private initFail() {
    while (this.commands.length) {
      const command = this.commands.shift();
      command?.reject(this.error);
    }
  }

  detectExpiresKeys() {
    return new Promise<void>(resolve => {
      const objectStore = this.getObjectStore();
      const request = objectStore.openCursor();
      const now = Date.now();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const [expires]: StorageData = cursor.value.data || [];
          if (expires && now > expires) {
            const deleteReq = objectStore.delete(cursor.key);
            const next = () => cursor.continue();
            deleteReq.onsuccess = next;
            deleteReq.onerror = next;
          } else {
            cursor.continue();
          }
        } else {
          resolve();
        }
      };
    });
  }

  private getObjectStore() {
    return this.db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  }

  private getRequest(key: string, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.get(key);
    request.onsuccess = () => {
      const [, value]: StorageData = request.result?.data || [];
      resolve(value);
    };
    request.onerror = error => {
      reject(error);
    };
  }

  private setRequest(key: string, data: StorageData, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.put({
      [KEY_PATH]: key,
      data,
    });
    request.onsuccess = () => resolve();
    request.onerror = reject;
  }

  private removeRequest(key: string, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = reject;
  }

  private clearRequest(resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.clear();
    request.onsuccess = () => resolve();
    request.onerror = reject;
  }

  private getAllKeysRequest(resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  }

  private addTask<T>({ name, key, data }: {
    name: Command;
    key?: string;
    data?: StorageData
  }) {
    return new Promise<T>((resolve, reject) => {
      const command = {
        name,
        key: key as string,
        data: data as StorageData,
        resolve,
        reject
      };
      if (!this.initialized) {
        if (this.error) {
          reject(this.error);
        } else {
          this.commands.push(command);
        }
      } else {
        this.execCommand(command);
      }
    });
  }

  private execCommand({ name, key, data, resolve, reject }: CommandInfo) {
    switch (name) {
      case 'set':
        return this.setRequest(key, data, resolve, reject);
      case 'get':
        return this.getRequest(key, resolve, reject);
      case 'remove':
        return this.removeRequest(key, resolve, reject);
      case 'clear':
        return this.clearRequest(resolve, reject);
      case 'keys':
        return this.getAllKeysRequest(resolve, reject);
    }
  }

  get<T>(key: string) {
    return this.addTask<T>({ name: 'get', key });
  }

  set<T>(key: string, value: T, expires: number) {
    return this.addTask<void>({ name: 'set', key, data: [expires, value] });
  }

  remove(key: string) {
    return this.addTask<void>({ name: 'remove', key });
  }

  clear() {
    return this.addTask<void>({ name: 'clear' });
  }

  keys() {
    return this.addTask<string[]>({ name: 'keys' });
  }
}