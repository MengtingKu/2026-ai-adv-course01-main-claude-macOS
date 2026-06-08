---
name: e2e-checkout
description: 以 Playwright MCP 對花卉電商前台執行「端到端結帳」瀏覽器測試（瀏覽商品 → 加入購物車 → 結帳填收件資訊 → 建立訂單 → 驗證訂單）。當使用者要求驗證購物/結帳流程、做前台 e2e 測試、或改動商品/購物車/訂單/結帳頁後想確認整條流程仍可走通時使用。
---

# E2E 結帳流程測試（Playwright MCP）

對本專案（Express + EJS SSR + Vue 3 CDN）前台**真實操作瀏覽器**，驗證一位顧客
從瀏覽商品到完成下單的完整旅程。這是「跑起來像使用者一樣用」的測試，
不是後端 supertest API 測試（那部分見 [docs/TESTING.md](../../../docs/TESTING.md)）。

## 前置條件（每次必檢）

| 項目 | 指令 / 說明 |
|------|------------|
| 啟動伺服器 | `npm run dev:server`（不重建 CSS）或 `npm start`，預設 `http://localhost:3001` |
| 改過樣式才需重建 CSS | `npm run css:build`（Tailwind v4：`input.css` → `output.css`） |
| Seed 測試帳號 | `admin@hexschool.com` / `12345678`（`src/database.js` seedAdminUser，可被 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 覆寫） |
| 資料需有商品 | seed 後 `/api/products` 應有商品；若無，先確認資料庫已 seed |

> 先用 `browser_navigate` 開 `http://localhost:3001/` 確認站台有起來；
> 連不上就先把伺服器啟動好，不要對著沒起來的站台測。

> **Playwright MCP 操作備註**（實測踩過）：`browser_type` / `browser_click` /
> `browser_fill_form` 的目標元素用 `target` 帶入 snapshot 的 `ref`（如 `e38`），
> 不是 `ref` 參數；`browser_fill_form` 每個欄位還需各自的 `target`。先
> `browser_snapshot` 取得 ref 再操作最穩。

## 認證前提（關鍵）

- `/api/cart` 為**雙模式認證**：訪客以自動產生的 `X-Session-Id`（`localStorage.flower_session_id`）即可操作購物車。
- `/api/orders`（建立訂單）掛 `authMiddleware`，**必須登入（JWT）**。因此結帳前一定要先登入，
  否則 `apiFetch` 收到 401 會把使用者導去 `/login`。
- 前端 token 存於 `localStorage.flower_token`（見 `public/js/auth.js`、`api.js`）。

## Happy Path：完整結帳流程

### 1. 登入取得 JWT
```
browser_navigate → http://localhost:3001/login
browser_fill_form / browser_type → email=admin@hexschool.com, password=12345678
browser_click → 登入
```
驗證已登入：
```js
() => !!localStorage.getItem('flower_token')   // 應為 true
```
（亦可改用註冊新顧客：`POST /api/auth/register` 後再登入，模擬真實買家。）

### 2. 瀏覽商品並進入詳情
```
browser_navigate → http://localhost:3001/
```
首頁商品卡**不是純 `<a href="/products/:id">`**（Vue `@click` 導頁），用 DOM 選不到連結。
最穩的做法是先取一個有效 product id 再直接導頁：
```js
async () => (await (await fetch('/api/products?page=1&limit=1')).json()).data.products[0].id
```
```
browser_navigate → http://localhost:3001/products/<id>
```

### 3. 加入購物車
在 `/products/:id` 用「−／＋」調整數量後點 **「加入購物袋」**（注意按鈕字樣是
「加入購物袋」不是「加入購物車」；`addToCart()` → `POST /api/cart`，
body `{ productId, quantity }`）。驗證購物車內容：
```js
() => fetch('/api/cart', { headers: { 'X-Session-Id': localStorage.flower_session_id,
        'Authorization': 'Bearer ' + localStorage.flower_token }})
      .then(r => r.json())
      .then(d => ({ count: d.data.items.length, total: d.data.total }))  // count 應 > 0
```
> 購物車 API 回傳 `data.items[]`（含 `product_name`、`quantity`、`product_price`）與 `data.total`。

### 4. 檢視購物車
```
browser_navigate → http://localhost:3001/cart
```
確認品項、數量、小計正確，再前往結帳。

### 5. 結帳填表並送出
```
browser_navigate → http://localhost:3001/checkout
```
- 注意：`checkout` 的 `onMounted` 會抓 `/api/cart`，**購物車為空會被導回 `/cart`** —— 確保步驟 3 已加入商品。
- 填 3 個必填欄位（`public/js/pages/checkout.js` 的 `form`）：
  - `recipientName` 收件人姓名
  - `recipientEmail` Email（需通過 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`）
  - `recipientAddress` 收件地址
- 點 **「確認送出訂單」** → `submitOrder()` → `POST /api/orders` → 成功後
  `window.location.href = '/orders/' + id`。

### 6. 驗證訂單已建立
轉址到 `/orders/:id` 後：
```
browser_take_screenshot     // 人眼確認訂單編號、品項、金額、狀態
```
```js
() => location.pathname     // 應為 /orders/<id>，代表下單成功並轉址
```
重點檢查：訂單狀態為 `pending`（待付款）、品項與金額與購物車一致、購物車已清空、庫存已扣。

## 必測的錯誤情境（至少各一）

| 情境 | 預期 |
|------|------|
| 未登入直接結帳送出 | `POST /api/orders` 回 401 → `apiFetch` 導向 `/login` |
| 空購物車進 `/checkout` | `onMounted` 導回 `/cart` |
| Email 格式錯誤 | `validate()` 設 `errors.recipientEmail`，欄位顯示紅框、不送出 |
| 數量超過庫存 | 加入購物車或建立訂單時被攔截（後端扣庫存於 SQLite transaction，原子性） |

## 量測手法（用 evaluate 抓真實狀態，勿臆測）

```js
() => document.activeElement?.outerHTML.slice(0, 90)              // 焦點落點
() => document.getElementById('app')?.hasAttribute('v-cloak')    // Vue 是否掛載完成（應 false）
() => ({ token: !!localStorage.flower_token, sid: localStorage.flower_session_id })
() => location.pathname                                           // 驗證轉址
```

API 回應一律為統一格式 `{ data, error, message }`：成功時 `error === null`、`data` 有內容。

## 前台 SSR + Vue 常見陷阱（換皮／改版時特別容易踩）

1. **FOUC 模板閃現**：重整時 `v-if` 控制的 modal 會在 Vue 掛載前原樣閃現。
   修法：`[v-cloak]{display:none!important}`（寫在 `input.css` 並 `npm run css:build`）+ `<div id="app" v-cloak>`。
2. **Modal 焦點殘留**：對話框開啟後焦點仍在觸發按鈕，按 Enter/Space 或重整還原焦點會重複觸發。
   修法：開啟時 `blur()` 當前元素再把焦點移入對話框（`[data-autofocus]`）。
3. **白底 modal 繼承全域淺色字** → 文字看不清：在 modal 內以 inline 深色 `style="color:#111827"` 覆寫。
4. **inline `rgba` 漏 alpha**：prettier 重排後 `rgba(r,g,b,a)` 可能被誤刪成 `rgba(r,g,b)`（無效）→ 顏色跑掉。
5. **改 `input.css` 後忘記 `npm run css:build`**：畫面看不到新樣式的第一嫌疑。

## 清理

`.playwright-mcp/`（截圖、快照、log）為一次性產物，已列入 `.gitignore`，測完不需保留、不進版控。

## 對應關鍵路徑

| 用途 | 路徑 |
|------|------|
| 頁面路由 | `src/routes/pageRoutes.js`（`/`、`/products/:id`、`/cart`、`/checkout`、`/orders/:id`、`/login`） |
| 結帳頁與邏輯 | `views/pages/checkout.ejs`、`public/js/pages/checkout.js` |
| 購物車 API | `src/routes/cartRoutes.js`（`dualAuth` 雙模式） |
| 訂單 API | `src/routes/orderRoutes.js`（`authMiddleware`，需登入） |
| 前端認證/Session | `public/js/auth.js`、`public/js/api.js` |
| Seed 帳號 | `src/database.js`（`seedAdminUser`） |
