import CryptoJS from "crypto-js";
import { describe, expect, it } from "vitest";
import { decrypt } from "../src/util/decrypt";

describe("decrypt", () => {
    const uuid = "test-uuid";
    const password = "test-password";
    const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);

    it("decrypts data encrypted with the same uuid and password", () => {
        const original = JSON.stringify({ cookie_data: {}, update_time: "2024-01-01" });
        const encrypted = CryptoJS.AES.encrypt(original, key).toString();

        const result = decrypt(uuid, encrypted, password);
        expect(result).toBe(original);
    });

    it("returns empty string with wrong password", () => {
        const original = "test data";
        const encrypted = CryptoJS.AES.encrypt(original, key).toString();

        const result = decrypt(uuid, encrypted, "wrong-password");
        expect(result).toBe("");
    });
});
