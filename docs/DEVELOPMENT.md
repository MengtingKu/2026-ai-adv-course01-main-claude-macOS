# 開發規範

## 模組系統

使用 **CommonJS**（`require` / `module.exports`）。vitest.config.js 是唯一使用 ESM（`import`）的檔案，因 Vitest 設定需要 ESM 格式。

## 命名規則

| 類型 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | camelCase + Routes 後綴 | `authRoutes.js`, `adminProductRoutes.js` |
| Middleware 檔案 | camelCase + Middleware 後綴 | `authMiddleware.js`, `sessionMiddleware.js` |
| 測試檔案 | camelCase + .test.js 後綴 | `adminProducts.test.js` |
| 資料庫欄位 | snake_case | `password_hash`, `created_at`, `user_id` |
| API 請求 body | camelCase | `productId`, `recipientName`, `recipientEmail` |
| API 回應 body | snake_case（與 DB 欄位一致） | `product_name`, `total_amount` |
| UUID | uuid v4（所有 id 欄位） | `uuidv4()` from `uuid` |

## 新增 API 端點步驟

1. 在對應 `src/routes/` 檔案（或新建路由檔）中加入路由函式
2. 在路由函式上方加入 `@openapi` JSDoc 註解（見下方格式）
3. 若是新路由檔，在 `app.js` 以 `app.use('/api/...', require('./src/routes/newRoutes'))` 掛載
4. 若需要認證，在 router 層級或個別路由掛載 `authMiddleware` / `adminMiddleware`
5. 執行 `npm run openapi` 確認 OpenAPI 規格正確產生

## @openapi JSDoc 格式

```javascript
/**
 * @openapi
 * /api/your-path:
 *   post:
 *     summary: 端點說明
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1]
 *             properties:
 *               field1:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 */
router.post('/your-path', authMiddleware, (req, res) => {
  // ...
});
```

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立 `newMiddleware.js`，匯出函式 `function newMiddleware(req, res, next) { ... }`
2. 在需要的路由檔頂端 `require` 並掛載：`router.use(newMiddleware)` 或個別 `router.get('/', newMiddleware, handler)`

## 新增資料表步驟

1. 在 `src/database.js` 的 `db.exec(...)` 區塊加入 `CREATE TABLE IF NOT EXISTS ...`
2. 若需要 seed 資料，新增 `function seedXxx()` 並在 `initializeDatabase()` 末尾呼叫
3. 刪除 `database.sqlite` 讓資料庫重新初始化（開發環境）

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽名金鑰 | **必要**（缺少則拒絕啟動） | 無 |
| `PORT` | HTTP 監聽埠 | 否 | `3001` |
| `BASE_URL` | 伺服器基礎 URL | 否 | `http://localhost:3001` |
| `FRONTEND_URL` | CORS 允許的前端來源 | 否 | `http://localhost:3001` |
| `ADMIN_EMAIL` | 初始管理員帳號 | 否 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 初始管理員密碼 | 否 | `12345678` |
| `NODE_ENV` | 執行環境（影響 bcrypt saltRounds） | 否 | 未設定 |
| `ECPAY_MERCHANT_ID` | 綠界商店代號（備用） | 否 | `3002607` |
| `ECPAY_HASH_KEY` | 綠界 Hash Key（備用） | 否 | 見 .env.example |
| `ECPAY_HASH_IV` | 綠界 Hash IV（備用） | 否 | 見 .env.example |
| `ECPAY_ENV` | 綠界環境（staging/production） | 否 | `staging` |

`NODE_ENV=test` 時，`bcrypt` saltRounds 自動降為 1 以加速測試，無需手動設定。

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 `docs/FEATURES.md` 的完成狀態
5. 在 `docs/CHANGELOG.md` 新增版本記錄
