export type DBType = 'localStorage' | 'indexedDB';

export interface IStorage {
  type: DBType;
  init(): Promise<void>;
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T, expires: number): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  detectExpiresKeys(): Promise<void>;
}

export type StorageEventDetail<T> = {
  db: DBType;
  type: string;
  method: string;
  key?: string;
  value?: T;
  newValue?: T;
  oldValue?: T;
  size?: number;
  error?: any;
  expires?: number;
}

export type StorageData = [
  /** expires 过期时间戳 */
  number,
  /** value 值 */
  any
]