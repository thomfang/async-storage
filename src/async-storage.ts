const storeName = 'storage';
const indexName = 'key';

type ResolveCallback = (...args: any[]) => void;
type RejectCallback = (error: any) => void;
type IDBStorageCommand = 'get' | 'set' | 'remove' | 'clear';
type IDBStorageCommandOptions = {
  name: IDBStorageCommand;
  key: string;
  value: any;
  resolve: ResolveCallback;
  reject: RejectCallback;
};

export class AsyncStorage {

  private db!: IDBDatabase;
  private initialized = false;
  private commands: IDBStorageCommandOptions[] = [];

  error: any;

  constructor(private storageName: string) {
    this.init();
  }

  private init() {
    const request = indexedDB.open(this.storageName);
    request.onsuccess = () => {
      this.db = request.result;
      this.ready();
    };
    request.onerror = e => {
      this.error = e.target;
    };
    request.onupgradeneeded = ev => {
      this.db = (ev.target as any).result;
      if (!this.db.objectStoreNames.contains(storeName)) {
        this.db.createObjectStore(storeName, { keyPath: indexName, autoIncrement: true });
      }
    };
  }

  private ready() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    while (this.commands.length) {
      this.execCommand(this.commands.shift() as IDBStorageCommandOptions);
    }
  }

  private getObjectStore() {
    return this.db.transaction(storeName, 'readwrite').objectStore(storeName);
  }

  private getImpl(key: string, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.get(key);
    request.onsuccess = () => {
      resolve(request.result?.value);
    };
    request.onerror = error => {
      reject(error);
    };
  }

  private setImpl<T>(key: string, value: T, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.put({
      [indexName]: key,
      value,
    });
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = reject;
  }

  private removeImpl(key: string, resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.delete(key);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = reject;
  }

  private clearImpl(resolve: ResolveCallback, reject: RejectCallback) {
    const objectStore = this.getObjectStore();
    const request = objectStore.clear();
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = reject;
  }

  private addTask<T>({ name, key, value }: Partial<IDBStorageCommandOptions>) {
    return new Promise<T>((resolve, reject) => {
      const _command = {
        name: name as IDBStorageCommand,
        key: key as string,
        value: value,
        resolve,
        reject
      };
      if (!this.initialized) {
        if (this.error) {
          reject(this.error);
        } else {
          this.commands.push(_command);
        }
      } else {
        this.execCommand(_command);
      }
    });
  }

  private execCommand({ name, key, value, resolve, reject }: IDBStorageCommandOptions) {
    const _key = key as string;
    switch (name) {
      case 'set':
        return this.setImpl(_key, value, resolve, reject);
      case 'get':
        return this.getImpl(_key, resolve, reject);
      case 'remove':
        return this.removeImpl(_key, resolve, reject);
      case 'clear':
        return this.clearImpl(resolve, reject);
    }
  }

  get<T>(key: string) {
    return this.addTask<T>({ name: 'get', key });
  }

  set<T>(key: string, value: T) {
    return this.addTask<void>({ name: 'set', key, value });
  }

  remove(key: string) {
    return this.addTask<void>({ name: 'remove', key });
  }

  clear() {
    return this.addTask<void>({ name: 'clear' });
  }
}
