# async-storage
An asynchronous storage based on indexedDB for web browser.

## Usage

### `new(storageName: string)`

```ts
const storage = new AsyncStorage('storageName');

```

### `set<T>(key: string, value: T): Promise<void>`

```ts
async function setData() {
  await storage.set('name', 'Thom');
  await storage.set('user', {
    name: 'Thom',
    age: 18,
     gender: 'male'
  });
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
