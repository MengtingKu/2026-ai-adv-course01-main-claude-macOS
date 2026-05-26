# 測試規範

## 測試框架

- **Vitest 2.x**：測試執行器與斷言庫（`expect`）
- **supertest**：向 Express app 發送 HTTP 請求（不需要實際啟動伺服器）
- 測試資料庫：使用同一個 `database.sqlite`（非 mock），測試間共享狀態

## 測試檔案

| 檔案 | 測試範圍 |
|------|---------|
| `tests/setup.js` | 輔助函式（不含測試） |
| `tests/auth.test.js` | 註冊、登入、個人資料 |
| `tests/products.test.js` | 商品列表、詳情 |
| `tests/cart.test.js` | 購物車 CRUD、雙模式認證 |
| `tests/orders.test.js` | 建立訂單、列表、詳情、付款 |
| `tests/adminProducts.test.js` | 後台商品 CRUD |
| `tests/adminOrders.test.js` | 後台訂單列表、詳情 |

## 執行順序

**嚴格按照此順序執行**（`vitest.config.js` 的 `sequence.files` 設定）：

```
auth → products → cart → orders → adminProducts → adminOrders
```

**原因：** tests 共享同一個 SQLite 資料庫，後期測試依賴前期測試建立的資料（如 auth 建立 user，orders 依賴 cart 中已有商品）。`fileParallelism: false` 確保不並行執行。

## 輔助函式（tests/setup.js）

```javascript
const { app, request, getAdminToken, registerUser } = require('./setup');

// 取得 seed 管理員的 JWT token
const adminToken = await getAdminToken();
// → 呼叫 POST /api/auth/login 使用 admin@hexschool.com / 12345678

// 動態註冊測試用帳號，回傳 { token, user }
const { token, user } = await registerUser();
// → 使用唯一 email（time + random）避免衝突

// 自訂帳號屬性
const { token } = await registerUser({ email: 'custom@test.com', name: '自訂名稱' });
```

## 執行測試

```bash
npm test                    # 執行所有測試（正式方式，按 sequence.files 順序）
npx vitest run              # 等同 npm test
npx vitest run tests/auth.test.js  # 執行單一檔案（注意：可能因資料庫狀態不對而失敗）
```

## 撰寫新測試步驟

1. 建立 `tests/<featureName>.test.js`
2. 在 `vitest.config.js` 的 `sequence.files` 陣列中加入新測試路徑（維持依賴順序）
3. 使用 `require('./setup')` 取得 `{ app, request, getAdminToken, registerUser }`
4. 以 `describe` 組織測試群組，`it` 撰寫個別測試案例
5. 每個 API 測試都驗證：HTTP status code、`res.body.data`、`res.body.error`、`res.body.message`

### 測試範本

```javascript
const { app, request, getAdminToken, registerUser } = require('./setup');

describe('Feature API', () => {
  let userToken;
  let adminToken;

  beforeAll(async () => {
    const { token } = await registerUser();
    userToken = token;
    adminToken = await getAdminToken();
  });

  it('should do something successfully', async () => {
    const res = await request(app)
      .post('/api/some-endpoint')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ key: 'value' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject unauthorized requests', async () => {
    const res = await request(app).get('/api/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).not.toBeNull();
  });
});
```

## 常見陷阱

**1. 測試資料庫狀態殘留**
- 測試不自動清理資料庫；若要重置，刪除 `database.sqlite` 並重跑測試
- `registerUser()` 使用 `Date.now() + Math.random()` 生成唯一 email，避免跨測試衝突

**2. 單獨執行特定測試檔可能失敗**
- 例如 `orders.test.js` 需要先有商品與購物車資料；直接執行可能因資料不存在而失敗
- 安全做法：總是執行 `npm test`（完整順序）

**3. bcrypt 在測試環境自動加速**
- `NODE_ENV` 未設為 `test` 時，bcrypt 使用 saltRounds=10，會讓測試很慢
- 執行 `npm test` 時 Vitest 會設 `NODE_ENV=test`，無需手動設定

**4. X-Session-Id 測試**
- 購物車訪客模式需帶 `.set('X-Session-Id', 'some-uuid')` header
- 同一個 session UUID 對應同一個訪客購物車

**5. hookTimeout 設定**
- `vitest.config.js` 設 `hookTimeout: 10000`（10 秒），給 beforeAll 內的 DB 初始化留足夠時間
