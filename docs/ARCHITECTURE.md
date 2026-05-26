# 架構文件

## 目錄結構

```
.
├── app.js                     # Express app 組裝（middleware + 路由掛載）
├── server.js                  # HTTP 伺服器入口（檢查 JWT_SECRET、啟動監聽）
├── generate-openapi.js        # 讀取所有路由的 @openapi 註解，輸出 openapi.json
├── swagger-config.js          # swagger-jsdoc 設定（title、版本、bearerAuth 定義）
├── vitest.config.js           # 測試執行順序與全域設定
├── database.sqlite            # SQLite 資料庫檔案（不進 git）
├── src/
│   ├── database.js            # DB 連線、建表、seed 管理員帳號與商品
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT 驗證，成功後設 req.user
│   │   ├── adminMiddleware.js # 角色檢查，要求 req.user.role === 'admin'
│   │   ├── sessionMiddleware.js # 讀取 X-Session-Id header，設 req.sessionId
│   │   └── errorHandler.js   # 全域 Express 錯誤處理器（隱藏 500 詳情）
│   └── routes/
│       ├── authRoutes.js      # POST /api/auth/register|login, GET /api/auth/profile
│       ├── productRoutes.js   # GET /api/products, GET /api/products/:id（公開）
│       ├── cartRoutes.js      # /api/cart CRUD（雙模式 Auth：JWT 或 X-Session-Id）
│       ├── orderRoutes.js     # /api/orders CRUD + PATCH /:id/pay（需 JWT）
│       ├── adminProductRoutes.js # /api/admin/products CRUD（需 JWT + admin）
│       ├── adminOrderRoutes.js   # /api/admin/orders 列表+詳情（需 JWT + admin）
│       └── pageRoutes.js      # SSR 頁面路由，渲染 EJS 模板
├── views/
│   ├── layouts/
│   │   ├── front.ejs          # 前台佈局（header + footer + body slot）
│   │   └── admin.ejs          # 後台佈局（sidebar + body slot）
│   ├── pages/
│   │   ├── index.ejs          # 首頁（商品列表）
│   │   ├── product-detail.ejs # 商品詳情頁
│   │   ├── cart.ejs           # 購物車頁
│   │   ├── checkout.ejs       # 結帳頁
│   │   ├── login.ejs          # 登入/註冊頁
│   │   ├── orders.ejs         # 我的訂單列表
│   │   ├── order-detail.ejs   # 訂單詳情 + 付款結果
│   │   ├── 404.ejs            # 404 頁面
│   │   └── admin/
│   │       ├── products.ejs   # 後台商品管理
│   │       └── orders.ejs     # 後台訂單管理
│   └── partials/
│       ├── head.ejs, header.ejs, footer.ejs
│       ├── admin-header.ejs, admin-sidebar.ejs
│       └── notification.ejs
├── public/
│   ├── css/input.css          # Tailwind 原始樣式
│   ├── css/output.css         # 建置後的樣式（不進 git）
│   ├── stylesheets/style.css  # 自訂全域樣式
│   └── js/
│       ├── api.js             # fetch 封裝（自動帶 JWT/session header）
│       ├── auth.js            # localStorage token 管理工具
│       ├── header-init.js     # 初始化 header 登入狀態
│       ├── notification.js    # toast 通知元件
│       └── pages/             # 各頁面專屬 JS（index, login, cart, checkout,
│                              #   orders, order-detail, product-detail,
│                              #   admin-products, admin-orders）
└── tests/
    ├── setup.js               # 測試輔助：getAdminToken(), registerUser()
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

## 啟動流程

```
server.js
  └─ 檢查 JWT_SECRET（缺少則 process.exit(1)）
  └─ require('./app')
       └─ require('./src/database')
            └─ 建立 SQLite 連線（WAL 模式, foreign_keys ON）
            └─ db.exec(CREATE TABLE IF NOT EXISTS ...)（5 張表）
            └─ seedAdminUser()（若 admin email 不存在則插入）
            └─ seedProducts()（若商品表為空則插入 8 筆）
       └─ app.set('view engine', 'ejs')
       └─ app.use(cors, json, urlencoded, sessionMiddleware)
       └─ 掛載 API 路由
       └─ 掛載 pageRoutes（SSR）
       └─ 404 handler
       └─ errorHandler
  └─ app.listen(PORT)
```

## API 路由總覽

| Method | 路徑 | 檔案 | 認證 | 說明 |
|--------|------|------|------|------|
| POST | /api/auth/register | authRoutes.js | 無 | 註冊新帳號 |
| POST | /api/auth/login | authRoutes.js | 無 | 登入 |
| GET | /api/auth/profile | authRoutes.js | JWT | 取得個人資料 |
| GET | /api/products | productRoutes.js | 無 | 商品列表（分頁） |
| GET | /api/products/:id | productRoutes.js | 無 | 商品詳情 |
| GET | /api/cart | cartRoutes.js | JWT 或 Session | 查看購物車 |
| POST | /api/cart | cartRoutes.js | JWT 或 Session | 加入購物車 |
| PATCH | /api/cart/:itemId | cartRoutes.js | JWT 或 Session | 修改數量 |
| DELETE | /api/cart/:itemId | cartRoutes.js | JWT 或 Session | 移除項目 |
| POST | /api/orders | orderRoutes.js | JWT | 從購物車建立訂單 |
| GET | /api/orders | orderRoutes.js | JWT | 我的訂單列表 |
| GET | /api/orders/:id | orderRoutes.js | JWT | 訂單詳情 |
| PATCH | /api/orders/:id/pay | orderRoutes.js | JWT | 模擬付款（success/fail） |
| GET | /api/admin/products | adminProductRoutes.js | JWT+Admin | 後台商品列表 |
| POST | /api/admin/products | adminProductRoutes.js | JWT+Admin | 新增商品 |
| PUT | /api/admin/products/:id | adminProductRoutes.js | JWT+Admin | 編輯商品 |
| DELETE | /api/admin/products/:id | adminProductRoutes.js | JWT+Admin | 刪除商品 |
| GET | /api/admin/orders | adminOrderRoutes.js | JWT+Admin | 後台訂單列表 |
| GET | /api/admin/orders/:id | adminOrderRoutes.js | JWT+Admin | 後台訂單詳情 |

## 統一回應格式

所有 API 端點（含錯誤）一律回傳：

```json
{
  "data": { ... } | null,
  "error": "ERROR_CODE" | null,
  "message": "人類可讀訊息"
}
```

錯誤碼清單：`VALIDATION_ERROR`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`STOCK_INSUFFICIENT`、`CART_EMPTY`、`INVALID_STATUS`、`INTERNAL_ERROR`

## 認證與授權機制

### JWT 認證（authMiddleware）
- 讀取 `Authorization: Bearer <token>` header
- 以 `HS256` 演算法驗證，secret 從 `JWT_SECRET` 環境變數取得
- **每次請求都查詢 DB** 確認使用者仍存在（`SELECT id FROM users WHERE id = ?`）
- 成功後設 `req.user = { userId, email, role }`
- JWT 有效期：**7 天**（`expiresIn: '7d'`）

### Admin 授權（adminMiddleware）
- 依賴 authMiddleware 先執行（已設 `req.user`）
- 檢查 `req.user.role === 'admin'`，否則回傳 403

### Session 認證（sessionMiddleware + cartRoutes dualAuth）
- `sessionMiddleware` 讀取 `X-Session-Id` header → 設 `req.sessionId`
- Cart 路由的 `dualAuth` 邏輯：
  1. 若有 `Authorization` header → 走 JWT 流程（若 token 無效立即 401，不 fallback）
  2. 若無 `Authorization` 但有 `X-Session-Id` → 以 session 模式允許訪客操作
  3. 兩者都沒有 → 401

## 資料庫 Schema

### users
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（uuid v4） |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| role | TEXT | CHECK IN ('user', 'admin')，DEFAULT 'user' |
| created_at | TEXT | DEFAULT datetime('now') |

### products
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（uuid v4） |
| name | TEXT | NOT NULL |
| description | TEXT | 可 NULL |
| price | INTEGER | CHECK > 0 |
| stock | INTEGER | CHECK >= 0，DEFAULT 0 |
| image_url | TEXT | 可 NULL |
| created_at | TEXT | DEFAULT datetime('now') |
| updated_at | TEXT | DEFAULT datetime('now') |

### cart_items
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（uuid v4） |
| session_id | TEXT | 可 NULL（訪客模式） |
| user_id | TEXT | 可 NULL，FK → users.id |
| product_id | TEXT | NOT NULL，FK → products.id |
| quantity | INTEGER | CHECK > 0，DEFAULT 1 |

`session_id` 與 `user_id` 擇一填入，不同時有值。

### orders
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（uuid v4） |
| order_no | TEXT | UNIQUE（格式：ORD-YYYYMMDD-XXXXX） |
| user_id | TEXT | NOT NULL，FK → users.id |
| recipient_name | TEXT | NOT NULL |
| recipient_email | TEXT | NOT NULL |
| recipient_address | TEXT | NOT NULL |
| total_amount | INTEGER | NOT NULL |
| status | TEXT | CHECK IN ('pending', 'paid', 'failed')，DEFAULT 'pending' |
| created_at | TEXT | DEFAULT datetime('now') |

### order_items
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（uuid v4） |
| order_id | TEXT | NOT NULL，FK → orders.id |
| product_id | TEXT | NOT NULL，FK → products.id |
| product_name | TEXT | NOT NULL（快照，避免商品名稱變更影響歷史） |
| product_price | INTEGER | NOT NULL（快照） |
| quantity | INTEGER | NOT NULL |

`product_name` 與 `product_price` 在下單時快照，即使之後商品資料變更也不影響訂單記錄。
