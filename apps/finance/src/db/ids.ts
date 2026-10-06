type IdGenerator = () => string;

function uuidFromRandom(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const defaultGenerator: IdGenerator = () =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : uuidFromRandom();

let generator: IdGenerator = defaultGenerator;

/** The app registers expo-crypto's randomUUID here at startup. */
export function setIdGenerator(next: IdGenerator): void {
  generator = next;
}

export function newId(): string {
  return generator();
}
