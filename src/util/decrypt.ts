import CryptoJS from 'crypto-js';
import { CryptoType } from '../types';

export function decrypt(uuid: string, encrypted: string, password: string, cryptoType: CryptoType = 'legacy') {
    const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);

    try {
        if (cryptoType === 'aes-128-cbc-fixed') {
            const fixedIv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
            return CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(key), {
                iv: fixedIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            }).toString(CryptoJS.enc.Utf8);
        }

        return CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    } catch {
        return '';
    }
}
