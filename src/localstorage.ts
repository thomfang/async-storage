import { IStorage, StorageData, DBType } from "./interface";

export class LocalStorage implements IStorage {

  type: DBType = 'localStorage';

  init() {
    this.detectExpiresKeys();
    return Promise.resolve();
  }

  get<T>(key: string) {
    return new Promise<T>((resolve, reject) => {
      const data = localStorage.getItem(key);
      if (!data) {
        resolve(undefined);
      } else {
        try {
          const [, value]: StorageData = JSON.parse(data) || [];
          resolve(value);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  set<T>(key: string, value: T, expires: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const data: StorageData = [expires, value];
        const str = JSON.stringify(data);
        localStorage.setItem(key, str);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      localStorage.removeItem(key);
      resolve();
    });
  }

  keys() {
    return new Promise<string[]>(resolve => {
      const keys: string[] = [];
      for (let i = 0, l = localStorage.length; i < l; i++) {
        const k = localStorage.key(i);
        if (typeof k === 'string') {
          keys.push(k);
        }
      }
      resolve(keys);
    });
  }

  clear() {
    return new Promise<void>(resolve => {
      localStorage.clear();
      resolve();
    });
  }

  detectExpiresKeys() {
    const now = Date.now()
    for (let i = 0, l = localStorage.length; i < l; i++) {
      try {
        const key = localStorage.key(i) as string;
        const item = localStorage.getItem(key) as string;
        const [expires]: StorageData = JSON.parse(item) || [];
        if (typeof expires === 'number' && now >= expires) {
          localStorage.removeItem(key);
          i -= 1;
        }
      } catch (e) { }
    }
    return Promise.resolve();
  }
}