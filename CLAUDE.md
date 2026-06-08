# CLAUDE.md

## 專案概述
backend-project — Express 4.x + better-sqlite3（SQLite）+ EJS 花卉電商平台，提供 REST API 與 SSR 前端，支援 JWT 認證、訪客 Session 購物車與管理員後台。

## 常用指令
```bash
npm start          # 建置 CSS 後啟動伺服器（正式模式）
npm run dev:server # 直接啟動伺服器（不重建 CSS）
npm run dev:css    # 監看 Tailwind CSS 變更（watch mode）
npm run css:build  # 一次性建置並壓縮 CSS
npm run openapi    # 產生 OpenAPI 規格文件（swagger-config.js）
npm test           # 執行所有測試（Vitest + supertest）
```

## 關鍵規則
- 所有 API 回應必須使用統一格式：`{ data, error, message }`
- 購物車 API 使用雙模式認證：JWT `Bearer Token` 或 `X-Session-Id` header（訪客模式）
- 訂單建立使用 SQLite transaction（建立訂單 + 扣庫存 + 清購物車，必須原子性）
- 測試必須按固定順序執行（auth → products → cart → orders → adminProducts → adminOrders）
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`
- 管理員路由必須同時掛載 `authMiddleware` + `adminMiddleware`

## 詳細文件
- [docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、環境變數
- [docs/FEATURES.md](./docs/FEATURES.md) — 功能列表與業務邏輯說明
- [docs/TESTING.md](./docs/TESTING.md) — 測試規範與指南（後端 API 測試）
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌

## 必要遵守項目
- 不可直接編輯 `.env`、`database.sqlite`、`package-lock.json` 等敏感/鎖定檔案
- SQL 查詢必須使用 `db.prepare(...).run(...)` parameterized 模式，嚴禁字串拼接
- 新增路由後需在路由函式上方加入 `@openapi` JSDoc 註解（格式見 docs/DEVELOPMENT.md）
- `bcrypt` saltRounds：正式環境 10，測試環境 1（由 `process.env.NODE_ENV === 'test'` 控制，勿覆寫）
- 刪除商品前須檢查是否有 `pending` 狀態的訂單（adminProductRoutes.js 已實作）
