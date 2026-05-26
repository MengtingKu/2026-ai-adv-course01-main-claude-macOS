---
paths:
  - "src/routes/**"
  - "app.js"
---

# API 設計規則

## 統一回應格式
所有 API 端點（含錯誤）必須回傳：
```json
{ "data": <物件或 null>, "error": "<ERROR_CODE 或 null>", "message": "<人類可讀訊息>" }
```
成功時 `error` 為 `null`，失敗時 `data` 為 `null`。

## 路由命名
- 資源路由：`/api/<resource>`（複數名詞）
- 子資源：`/api/<resource>/:id/<action>`
- 管理員路由統一前綴：`/api/admin/<resource>`

## 認證掛載
- 需要 JWT 的路由：掛載 `authMiddleware`
- 需要管理員權限：同時掛載 `authMiddleware` + `adminMiddleware`（不可只掛其中一個）
- 購物車雙模式認證使用路由內的 `dualAuth` 函式，不套用全域 `authMiddleware`

## HTTP 狀態碼
| 情境 | 狀態碼 |
|------|--------|
| 成功（一般） | 200 |
| 建立資源成功 | 201 |
| 參數驗證失敗 | 400 |
| 未認證 | 401 |
| 權限不足 | 403 |
| 資源不存在 | 404 |
| 資源衝突（如重複 email） | 409 |
| 伺服器錯誤 | 500（由 errorHandler 統一處理） |

## @openapi JSDoc
每個路由函式上方必須有 `@openapi` JSDoc 註解，包含 summary、tags、security（若需認證）、requestBody（若需）、responses（至少 200 與錯誤情境）。

## 分頁參數
分頁端點統一使用 `page`（預設 1）和 `limit`（預設 10，最大 100）查詢參數，回應包含 `pagination: { total, page, limit, totalPages }`。
