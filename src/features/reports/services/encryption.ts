function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBase64(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export async function sha256Base64(data: ArrayBuffer | Uint8Array) {
  return encodeBase64(await crypto.subtle.digest('SHA-256', data instanceof Uint8Array ? toArrayBuffer(data) : data))
}

export async function encryptReportFile(file: File, base64Key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', decodeBase64(base64Key), { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await file.arrayBuffer())
  return {
    file: new File([ciphertext], `${file.name}.enc`, { type: 'application/octet-stream' }),
    iv: encodeBase64(iv),
    cipherHash: await sha256Base64(ciphertext),
  }
}

export async function decryptReportBlob(blob: Blob, base64Key: string, base64Iv: string) {
  const key = await crypto.subtle.importKey('raw', decodeBase64(base64Key), { name: 'AES-GCM' }, false, ['decrypt'])
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(base64Iv) }, key, await blob.arrayBuffer())
}
