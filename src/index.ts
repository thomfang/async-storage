import { LocalStorage } from "./localstorage";
import { IDBStorage } from "./indexeddb";
import { IStorage, StorageEventDetail } from "./interface";
import { EventEmitter } from "events";
import { sizeof } from './sizeof';
import { compress, decompress } from 'lz-string';

const ONE_DAY = 1000 * 60 * 60 * 24
const DEFAULT_SIZE_LIMIT = 1024 * 1024;
const DEFAULT_MAX_EXPIRES_TIME = ONE_DAY * 8; // 8 days
const DEFAULT_DB_NAME = 'idb:storage';

export class Storage extends EventEmitter {

  readonly Event = {
    CHANGE: 'change',
    ERROR: 'error'
  };

  private db!: IStorage;
  private supportedIDB = window.indexedDB !== null && typeof window.indexedDB.open === 'function';
  private detectKeysInterval = 1000 * 10; // 10s
  private timerId!: any;

  public readonly limit!: number;
  public readonly nameOfIndexedDB!: string;
  public readonly maxExpiresTime!: number;

  /**
   * 
   * @param limit default 1024 * 1024
   */
  constructor({
    limit = DEFAULT_SIZE_LIMIT,
    nameOfIndexedDB = DEFAULT_DB_NAME,
    maxExpiresTime = DEFAULT_MAX_EXPIRES_TIME
  }: {
    limit?: number;
    nameOfIndexedDB?: string;
    maxExpiresTime?: number
  } = {}) {
    super();

    this.limit = limit;
    this.nameOfIndexedDB = nameOfIndexedDB;
    this.maxExpiresTime = maxExpiresTime;
    this.init();
  }

  private async init() {
    if (this.supportedIDB) {
      this.db = new IDBStorage(this.nameOfIndexedDB);
    } else {
      this.db = new LocalStorage();
    }
    console.log(`[Storage] use ${this.db.type}`);

    try {
      await this.db.init();
      this.detectExpiresKeys();
    } catch (error) {
      this.emitError({
        method: 'init',
        error
      });
    }
  }

  public async get<T>(key: string): Promise<T | undefined> {
    try {
      const strValue = await this.db.get<string>(key);
      let value: T | undefined;
      if (strValue) {
        const s = decompress(strValue) as string;
        value = JSON.parse(s);
      }
      return value;
    } catch (error) {
      this.emitError({ method: 'get', key, error });
      throw error;
    }
  }

  public async set<T>(key: string, value: T, expires: number) {
    const now = Date.now();
    let error: any;

    if (typeof expires !== 'number' || isNaN(expires)) {
      error = new Error('[Storage] set(): expires must be an integer timestamp.')
    }

    if (now >= expires) {
      error = new Error('[Storage] set(): expires must gt Date.now().');
    } else if (expires - now > this.maxExpiresTime) {
      error = new Error(`[Storage] set(): Max expires time is ${this.maxExpiresTime / ONE_DAY} days.`);
    }

    if (error) {
      this.emitError({
        method: 'set',
        key,
        value,
        expires,
        error
      })
      throw error;
    }

    const rawString = JSON.stringify(value);
    const compressedString = compress(rawString);
    const size = sizeof(compressedString);

    // console.log(`raw-size: ${sizeof(rawString)/1024}Kb  compressed-size: ${size/1024}Kb`)
    // console.log('raw', rawString, 'compressed', compressedString)

    if (size > this.limit) {
      const error = new Error('[Storage] set(): Value size exceeded.');
      this.emitError({
        method: 'set',
        key,
        value,
        size,
        expires,
        error
      });
      throw error;
    }

    const oldValue = await this.get<T>(key)

    try {
      await this.db.set<string>(key, compressedString, expires);
      if (oldValue !== value) {
        this.emitChange({
          method: 'set',
          key,
          value,
          newValue: value,
          oldValue,
          expires
        });
      }
    } catch (error) {
      this.emitError({
        method: 'set',
        key,
        value,
        expires,
        error,
      });
      throw error;
    }
  }

  public async remove(key: string) {
    const oldValue = await this.get<any>(key)
    try {
      await this.db.remove(key);
      this.emitChange({
        method: 'remove',
        key,
        value: undefined,
        newValue: undefined,
        oldValue,
      })
    } catch (error) {
      this.emitError({
        method: 'remove',
        key,
        error,
      });
      throw error;
    }
  }

  public async keys(): Promise<string[]> {
    try {
      const keys = await this.db.keys();
      return keys;
    } catch (error) {
      this.emitError({
        method: 'keys',
        error,
      });
      throw error;
    }
  }

  private async detectExpiresKeys() {
    if (this.timerId != null) {
      return;
    }

    this.timerId = setTimeout(async () => {
      try {
        await this.db.detectExpiresKeys();
      } finally {
        this.timerId = null;
        this.detectExpiresKeys();
      }
    }, this.detectKeysInterval);
  }

  private emitError(event: Partial<StorageEventDetail<any>>) {
    this.emit(this.Event.ERROR, {
      ...event,
      db: this.db.type,
      type: this.Event.ERROR
    });
  }

  private emitChange(event: Partial<StorageEventDetail<any>>) {
    this.emit(this.Event.CHANGE, {
      ...event,
      db: this.db.type,
      type: this.Event.CHANGE,
    });
  }

}