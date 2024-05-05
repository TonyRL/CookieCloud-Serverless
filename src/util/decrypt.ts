import CryptoJS from 'crypto-js';

export function decrypt(uuid: string, encrypted: string, password: string) {
    const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    return decrypted;
}
