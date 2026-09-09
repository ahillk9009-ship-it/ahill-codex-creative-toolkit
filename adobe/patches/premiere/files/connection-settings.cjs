"use strict";
// UXP returns Uint8Array from SecureStorage. ASCII JSON escapes avoid depending
// on TextEncoder/TextDecoder in Adobe runtimes that omit them.
exports.createConnectionSettings = function (secureStorage) {
  const key = "premiere-mcp-connection-v1";
  return {
    async load() {
      try {
        const bytes = await secureStorage.getItem(key);
        if (!bytes || bytes.length > 8192) return null;
        let text = "";
        for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
        const value = JSON.parse(text);
        return typeof value.url === "string" && typeof value.token === "string" ? value : null;
      } catch (_) { return null; }
    },
    async save(value) {
      if (!value || typeof value.url !== "string" || typeof value.token !== "string" || !value.token)
        throw new Error("Connection settings are incomplete");
      const text = JSON.stringify({ url: value.url, token: value.token }).replace(/[\u007f-\uffff]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
      if (text.length > 8192) throw new Error("Connection settings are too long");
      await secureStorage.setItem(key, text);
    }
  };
};
