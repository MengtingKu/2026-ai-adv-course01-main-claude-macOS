# ECPay AIO 金流串接

## User Story

身為購物者，我希望在建立訂單後能夠透過綠界（ECPay）AIO 金流以信用卡完成付款，系統能自動確認並更新訂單狀態，無需人工介入。

## Spec

### 付款流程

1. 使用者建立訂單（POST /api/orders），訂單狀態為 `pending`
2. 前端呼叫取得付款表單 API（GET /api/orders/:id/ecpay-checkout），取得 ECPay AIO 表單 URL 與參數
3. 前端以 POST 表單方式跳轉至綠界付款頁面
4. 使用者完成付款後，ECPay Server 呼叫 ReturnURL（POST /api/ecpay/notify）通知付款結果
5. 前端回到訂單詳情頁後，呼叫主動查詢 API（POST /api/orders/:id/ecpay-verify）以 QueryTradeInfo 確認付款狀態並更新訂單

### API 端點

| Method | 路徑 | 認證 | 說明 |
|--------|------|------|------|
| GET | /api/orders/:id/ecpay-checkout | JWT | 取得 AIO 付款表單 URL 與參數（含 CheckMacValue） |
| POST | /api/ecpay/notify | 無 | ECPay ReturnURL 回呼，驗證 CheckMacValue 後更新訂單狀態 |
| POST | /api/orders/:id/ecpay-verify | JWT | 主動呼叫 QueryTradeInfo 查詢付款結果並更新訂單 |

### CheckMacValue 規格

- 演算法：SHA-256
- URL encode 規則：使用 .NET `HttpUtility.UrlEncode` 相容模式（`%20` → `+`、特殊字元小寫、還原 `-_.*!()`）
- 欄位排序：case-insensitive 字典序
- 格式：`HashKey={key}&{sorted_params}&HashIV={iv}` → SHA-256 → 大寫 hex

### 環境變數

| 變數 | 用途 |
|------|------|
| `ECPAY_MERCHANT_ID` | 綠界商店代號 |
| `ECPAY_HASH_KEY` | CheckMacValue 簽章金鑰 |
| `ECPAY_HASH_IV` | CheckMacValue 簽章 IV |
| `ECPAY_ENV` | `staging`（預設）或 `production` |

### 安全考量

- ReturnURL handler（POST /api/ecpay/notify）無論驗證是否通過，均回傳 `1|OK`（否則 ECPay 會重試）
- CheckMacValue 比較使用 `crypto.timingSafeEqual`，防止 timing attack
- 主動查詢（ecpay-verify）在訂單已有最終狀態（paid/failed）時直接回傳，不重複呼叫 ECPay API（冪等設計）

## Tasks

- [x] 建立 `src/services/ecpayService.js`：實作 `generateCheckMacValue`、`verifyCheckMacValue`、`buildCheckoutParams`、`queryTradeInfo`、`getMerchantTradeNo`
- [x] 建立 `src/routes/ecpayRoutes.js`：三支 API 路由含 @openapi 註解
- [x] 在 `app.js` 掛載 ecpayRoutes
- [x] 更新 `docs/DEVELOPMENT.md` 環境變數表（新增 ECPAY_* 欄位）
- [x] 更新 `docs/FEATURES.md` 新增綠界金流段落
- [x] 更新 `docs/CHANGELOG.md` 新增版本記錄
