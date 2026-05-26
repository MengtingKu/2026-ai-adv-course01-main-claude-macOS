---
paths:
  - "tests/**"
  - "vitest.config.js"
---

# 測試規則

## 測試框架
使用 Vitest 2.x + supertest，CommonJS 格式（`require`）。

## 執行順序
`vitest.config.js` 的 `sequence.files` 定義了測試執行順序，**新增測試檔案必須加入此陣列**，並放在正確的依賴位置：
```
auth → products → cart → orders → adminProducts → adminOrders
```

## 不允許並行執行
`fileParallelism: false` 是必要設定，測試共享同一個 SQLite 資料庫，並行執行會導致資料競態。不可更改此設定。

## 使用輔助函式
從 `./setup` 取得所有測試工具：
- `request(app)` — supertest 請求
- `getAdminToken()` — 取得 seed admin 的 JWT
- `registerUser(overrides?)` — 動態建立測試帳號，回傳 `{ token, user }`

## 回應格式驗證
每個 API 測試都必須同時驗證：
```javascript
expect(res.status).toBe(200);
expect(res.body).toHaveProperty('data');
expect(res.body).toHaveProperty('error', null);  // 成功時
expect(res.body).toHaveProperty('message');
```

## 錯誤情境測試
每個功能除了成功路徑，還需測試至少一個錯誤情境（如未認證、資料不存在、驗證失敗）。

## 不使用 Mock
不 mock 資料庫或 Express app，所有測試對真實 SQLite 資料庫操作（見 docs/TESTING.md 的陷阱說明）。
