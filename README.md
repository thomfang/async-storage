# async-storage
An asynchronous storage based on indexedDB for web browser.

## Usage

### `new(options?: StorageOptions)`

```ts
interface StorageOptions{
  limit?: number;
  nameOfIndexedDB?: string;
  maxExpiresTime?: number;
}

const storage = new AsyncStorage({
  limit: 1024 * 1024, // 1Mb
  maxExpiresTime: 1000 * 60 * 60 * 24 * 8, // 1day
});

```

### `set<T>(key: string, value: T, expires: number): Promise<void>`

```ts
async function setData() {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  await storage.set('name', 'Thom', ONE_DAY );
  await storage.set('user', {
    name: 'Thom',
    age: 18,
     gender: 'male'
  }, ONE_DAY);
}
```

### `get<T>(key: string): Promise<T>`

```ts
async function getData() {
  console.log(
    await storage.get('name'),
    await storage.get('user')
   );
}
```

### `remove(key: string): Promise<void>`

```ts
async function removeData() {
  await storage.remove('user');
}
```

### `clear(): Promise<void>`
  
```ts
async function clearData() {
  await storage.clear();
}
```

### `keys(): Promise<string[]>`

```ts
async function getAllKeys() {
  const keys = await storage.keys()
  console.log(keys, keys.length)
}
```
