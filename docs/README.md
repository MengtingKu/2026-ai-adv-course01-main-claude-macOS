# backend-project

花卉電商平台後端，提供完整的 REST API 與 SSR 前端頁面。支援訪客購物車、JWT 使用者認證、訂單管理與管理員後台。

## 技術棧

| 類別 | 技術 |
|------|------|
| 後端框架 | Express 4.x |
| 資料庫 | better-sqlite3（SQLite，WAL 模式） |
| 模板引擎 | EJS 5.x |
| CSS 框架 | Tailwind CSS 4.x |
| 認證 | jsonwebtoken（HS256，7 天有效期） |
| 密碼雜湊 | bcrypt |
| ID 生成 | uuid v4 |
| 測試框架 | Vitest 2.x + supertest |
| API 文件 | swagger-jsdoc（@openapi 註解） |

## 快速開始

```bash
# 1. 複製環境變數範本
cp .env.example .env

# 2. 設定必要的 JWT_SECRET（否則 server.js 會拒絕啟動）
echo "JWT_SECRET=your-secret-here" >> .env

# 3. 安裝依賴
npm install

# 4. 啟動開發伺服器（不需要另外建資料庫，啟動時自動建表並 seed 資料）
npm run dev:server

# 5. （另開終端）監看 Tailwind CSS
npm run dev:css
```

伺服器預設在 `http://localhost:3001` 啟動。

預設管理員帳號（由 `.env` 控制）：
- Email: `admin@hexschool.com`
- Password: `12345678`

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 CSS 後以正式模式啟動 |
| `npm run dev:server` | 啟動伺服器（不重建 CSS） |
| `npm run dev:css` | 監看 Tailwind CSS 變更 |
| `npm run css:build` | 一次性建置並壓縮 CSS |
| `npm run openapi` | 產生 `openapi.json` 規格文件 |
| `npm test` | 執行所有測試 |

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、啟動流程、API 路由總覽、DB Schema |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、環境變數、新增 API 步驟 |
| [FEATURES.md](./FEATURES.md) | 功能列表、業務邏輯、錯誤碼說明 |
| [TESTING.md](./TESTING.md) | 測試規範、執行順序、輔助函式、撰寫指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日誌 |
