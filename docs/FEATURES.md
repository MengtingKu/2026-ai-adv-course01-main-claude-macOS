# 功能列表

## 功能完成狀態

| 功能 | 狀態 |
|------|------|
| 使用者認證（註冊/登入/個人資料） | 完成 |
| 商品瀏覽（列表/詳情） | 完成 |
| 購物車（訪客 + 登入雙模式） | 完成 |
| 訂單建立（Transaction） | 完成 |
| 模擬付款 | 完成 |
| 綠界 AIO 金流（信用卡付款 + QueryTradeInfo 驗證） | 完成 |
| 管理員商品 CRUD | 完成 |
| 管理員訂單查看 | 完成 |
| SSR 前端頁面 | 完成 |

---

## 使用者認證

### 端點

| Method | 路徑 | 認證 |
|--------|------|------|
| POST | /api/auth/register | 無 |
| POST | /api/auth/login | 無 |
| GET | /api/auth/profile | JWT |

### 業務邏輯

**註冊（POST /api/auth/register）**
- 必填：`email`（唯一、格式驗證）、`password`（≥ 6 字元）、`name`
- 密碼以 `bcrypt` 雜湊後存入 `password_hash`
- 成功後立即回傳 JWT token（無需另外登入）
- 新帳號 role 固定為 `'user'`，只有 seed 腳本可建立 `admin`

**登入（POST /api/auth/login）**
- 必填：`email`、`password`
- 刻意不區分「帳號不存在」與「密碼錯誤」（均回 401），防止帳號枚舉攻擊
- JWT payload：`{ userId, email, role }`，有效期 7 天

**個人資料（GET /api/auth/profile）**
- 從 JWT 取得 userId，再查 DB 確認使用者存在
- 回傳：`id, email, name, role, created_at`（不含 password_hash）

### 錯誤碼

| 情境 | HTTP | error |
|------|------|-------|
| 必填欄位缺失或格式錯誤 | 400 | VALIDATION_ERROR |
| Email 已被註冊 | 409 | CONFLICT |
| 帳號或密碼錯誤 | 401 | UNAUTHORIZED |
| Token 無效或過期 | 401 | UNAUTHORIZED |

---

## 商品瀏覽

### 端點

| Method | 路徑 | 認證 |
|--------|------|------|
| GET | /api/products | 無 |
| GET | /api/products/:id | 無 |

### 業務邏輯

**商品列表（GET /api/products）**
- 查詢參數：`page`（預設 1）、`limit`（預設 10，最大 100）
- 回傳：`{ products: [...], pagination: { total, page, limit, totalPages } }`
- 依 `created_at DESC` 排序

**商品詳情（GET /api/products/:id）**
- 商品不存在回傳 404

---

## 購物車

### 端點

| Method | 路徑 | 認證 |
|--------|------|------|
| GET | /api/cart | JWT 或 X-Session-Id |
| POST | /api/cart | JWT 或 X-Session-Id |
| PATCH | /api/cart/:itemId | JWT 或 X-Session-Id |
| DELETE | /api/cart/:itemId | JWT 或 X-Session-Id |

### 雙模式認證（dualAuth）

購物車支援訪客與登入使用者，兩者購物車資料分開儲存（cart_items 表以 `user_id` 或 `session_id` 區分）：
- 登入狀態：帶 `Authorization: Bearer <token>`，以 `user_id` 識別
- 訪客狀態：帶 `X-Session-Id: <uuid>`，以 `session_id` 識別
- 若 Authorization header 存在但 token 無效 → **立即 401**，不 fallback 到 session

### 業務邏輯

**加入購物車（POST /api/cart）**
- 必填：`productId`、`quantity`（正整數，預設 1）
- 若商品已在購物車 → **累加數量**（`existingQty + newQty`），不重複插入
- 累加後的總數量超過庫存 → 400 STOCK_INSUFFICIENT
- 新商品超過庫存 → 400 STOCK_INSUFFICIENT

**修改數量（PATCH /api/cart/:itemId）**
- 必填：`quantity`（正整數）
- 直接設定新數量（非累加）
- 超過庫存 → 400 STOCK_INSUFFICIENT
- 項目不屬於當前用戶/session → 404

**查看購物車（GET /api/cart）**
- Join products 表取得最新商品資訊（名稱、價格、庫存、圖片）
- 計算 `total = sum(price * quantity)`

---

## 訂單管理

### 端點

| Method | 路徑 | 認證 |
|--------|------|------|
| POST | /api/orders | JWT |
| GET | /api/orders | JWT |
| GET | /api/orders/:id | JWT |
| PATCH | /api/orders/:id/pay | JWT |

### 業務邏輯

**建立訂單（POST /api/orders）**
- 必填：`recipientName`、`recipientEmail`（格式驗證）、`recipientAddress`
- 購物車為空 → 400 CART_EMPTY
- 任何商品庫存不足 → 400 STOCK_INSUFFICIENT（列出商品名稱）
- **SQLite Transaction 原子性**（任一步驟失敗全部回滾）：
  1. INSERT INTO orders
  2. 對每個 cart_item：INSERT INTO order_items + UPDATE products SET stock = stock - qty
  3. DELETE FROM cart_items WHERE user_id = ?（只清登入用戶購物車）
- order_no 格式：`ORD-YYYYMMDD-XXXXX`（含隨機 uuid 前 5 字元大寫）
- 商品名稱與價格在 order_items 快照，日後修改商品不影響訂單記錄

**訂單列表（GET /api/orders）**
- 只返回當前登入用戶的訂單（WHERE user_id = ?）
- 依 `created_at DESC` 排序

**模擬付款（PATCH /api/orders/:id/pay）**
- 必填：`action`（`"success"` 或 `"fail"`）
- 只有 `status === 'pending'` 的訂單可以付款，否則 400 INVALID_STATUS
- `success` → status 更新為 `'paid'`
- `fail` → status 更新為 `'failed'`
- 付款後無法再次付款（status 不再是 pending）

### 錯誤碼

| 情境 | HTTP | error |
|------|------|-------|
| 購物車為空 | 400 | CART_EMPTY |
| 庫存不足 | 400 | STOCK_INSUFFICIENT |
| 訂單不存在或不屬於當前用戶 | 404 | NOT_FOUND |
| 訂單已付款或失敗，不能再次付款 | 400 | INVALID_STATUS |

---

## 綠界 AIO 金流

### 端點

| Method | 路徑 | 認證 |
|--------|------|------|
| GET | /api/orders/:id/ecpay-checkout | JWT |
| POST | /api/ecpay/notify | 無（ECPay Server 回呼） |
| POST | /api/orders/:id/ecpay-verify | JWT |

### 付款流程

```
前端 → GET /api/orders/:id/ecpay-checkout → 取得 ecpayUrl + params
    → 以 HTML form POST 跳轉至 ecpayUrl（綠界付款頁）
    → 使用者付款完成
ECPay Server → POST /api/ecpay/notify（ReturnURL，server-to-server）
    → 驗證 CheckMacValue → 更新訂單 status = 'paid'
前端（ClientBackURL 回導後） → POST /api/orders/:id/ecpay-verify
    → 呼叫 QueryTradeInfo 主動確認 → 更新並回傳最新訂單
```

### GET /api/orders/:id/ecpay-checkout

- 訂單不屬於當前用戶 → 404 NOT_FOUND
- 訂單 status 不是 `pending` → 400 INVALID_STATUS
- 成功回傳 `{ ecpayUrl, params }`，params 已包含 CheckMacValue
- 商品名稱格式：`花名 x數量#花名 x數量`（最多 400 字元）

### POST /api/ecpay/notify（ReturnURL）

- 無論驗證是否通過，**一律回傳純文字 `1|OK`**（避免 ECPay 重試）
- CheckMacValue 驗證失敗 → 靜默忽略，仍回 `1|OK`
- `RtnCode === '1'` 且 MerchantTradeNo 比對成功 → 將對應訂單更新為 `paid`
- MerchantTradeNo 由 order_no 移除非英數字元後截取前 20 字元得出

### POST /api/orders/:id/ecpay-verify

- 訂單已有最終狀態（`paid` / `failed`）→ **冪等回傳**，不呼叫 ECPay API
- 呼叫 QueryTradeInfo API，回應 CheckMacValue 驗證失敗 → 500 ECPAY_QUERY_ERROR
- `TradeStatus === '1'` → 更新為 `paid`，否則更新為 `failed`
- 15 秒逾時（AbortSignal.timeout(15000)）

### CheckMacValue 規格

- 演算法：SHA-256（`EncryptType: '1'`）
- 欄位排序：case-insensitive 字典序，排除 `CheckMacValue` 自身
- URL encode：`.NET HttpUtility.UrlEncode` 相容模式（`%20` → `+`、結果轉小寫、還原 `-_.*!()`）
- 格式：`HashKey={key}&{sorted_params}&HashIV={iv}` → SHA-256 → 大寫 hex
- 驗證使用 `crypto.timingSafeEqual` 防止 timing attack

### 環境變數

| 變數 | 必要 | 說明 |
|------|------|------|
| `ECPAY_MERCHANT_ID` | 是 | 綠界商店代號 |
| `ECPAY_HASH_KEY` | 是 | CheckMacValue 簽章金鑰 |
| `ECPAY_HASH_IV` | 是 | CheckMacValue 簽章 IV |
| `ECPAY_ENV` | 否 | `staging`（預設）或 `production` |

### 錯誤碼

| 情境 | HTTP | error |
|------|------|-------|
| 訂單不存在或不屬於當前用戶 | 404 | NOT_FOUND |
| 訂單狀態不是 pending | 400 | INVALID_STATUS |
| QueryTradeInfo 呼叫失敗 | 500 | ECPAY_QUERY_ERROR |

---

## 管理員商品管理

### 端點（皆需 JWT + admin role）

| Method | 路徑 |
|--------|------|
| GET | /api/admin/products |
| POST | /api/admin/products |
| PUT | /api/admin/products/:id |
| DELETE | /api/admin/products/:id |

### 業務邏輯

**新增商品（POST）**
- 必填：`name`（非空字串）、`price`（正整數）、`stock`（非負整數）
- 選填：`description`、`image_url`

**編輯商品（PUT）**
- 部分更新：未提供的欄位保留原值
- `price` 若提供必須為正整數，`stock` 若提供必須為非負整數
- `name` 若提供不可為空字串

**刪除商品（DELETE）**
- 若商品存在於任何 `status = 'pending'` 的訂單 → 409 CONFLICT（保護資料完整性）
- 允許刪除已完成（paid/failed）訂單中的商品

---

## 管理員訂單管理

### 端點（皆需 JWT + admin role）

| Method | 路徑 |
|--------|------|
| GET | /api/admin/orders |
| GET | /api/admin/orders/:id |

### 業務邏輯

**訂單列表（GET /api/admin/orders）**
- 查詢參數：`page`（預設 1）、`limit`（預設 10）、`status`（`pending`/`paid`/`failed`，選填）
- `status` 參數不在允許值內時忽略（不報錯，查全部）
- 包含所有使用者的訂單（管理員可見全部）

**訂單詳情（GET /api/admin/orders/:id）**
- 回傳完整訂單資訊 + `items` 陣列 + `user: { name, email }`
- 若使用者已被刪除，`user` 為 null

---

## SSR 前台頁面

| 路徑 | 頁面 | 特殊 locals |
|------|------|-------------|
| / | index.ejs | - |
| /products/:id | product-detail.ejs | `productId`（從路由參數注入） |
| /cart | cart.ejs | - |
| /checkout | checkout.ejs | - |
| /login | login.ejs | - |
| /orders | orders.ejs | - |
| /orders/:id | order-detail.ejs | `orderId`、`paymentResult`（?payment=） |
| /admin/products | admin/products.ejs | `currentPath` |
| /admin/orders | admin/orders.ejs | `currentPath` |

EJS 使用兩層渲染：先渲染 `pages/xxx.ejs` 取得 `body` 字串，再渲染 `layouts/front.ejs` 或 `layouts/admin.ejs` 將 `body` 嵌入。前台認證完全由前端 JS 控制（JWT 存 localStorage），後台同樣。
