import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("CookieCloud Worker", () => {
    it("responds with Hello World on /", async () => {
        const response = await SELF.fetch("http://localhost/");
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("Hello World!");
    });

    describe("POST /update", () => {
        it("returns 400 when body is missing required fields", async () => {
            const response = await SELF.fetch("http://localhost/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            expect(response.status).toBe(400);
        });

        it("stores encrypted data and returns done", async () => {
            const uuid = crypto.randomUUID();
            const response = await SELF.fetch("http://localhost/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uuid, encrypted: "test-encrypted-data" })
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ action: "done" });
        });

        it("rejects payloads over 1MB", async () => {
            const response = await SELF.fetch("http://localhost/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "x".repeat(1_000_001)
            });
            expect(response.status).toBe(413);
        });
    });

    describe("GET /get/:uuid", () => {
        it("returns 404 for non-existent uuid", async () => {
            const response = await SELF.fetch(`http://localhost/get/${crypto.randomUUID()}`);
            expect(response.status).toBe(404);
        });

        it("returns encrypted data after storing it", async () => {
            const uuid = crypto.randomUUID();
            const encrypted = "some-encrypted-payload";

            await SELF.fetch("http://localhost/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uuid, encrypted })
            });

            const response = await SELF.fetch(`http://localhost/get/${uuid}`);
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ encrypted });
        });
    });
});
