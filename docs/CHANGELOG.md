# CHANGELOG

## [Unreleased]

## [1.1.0] - 2026-05-27

### Added
- 綠界 ECPay AIO 金流串接：信用卡付款表單（GET /api/orders/:id/ecpay-checkout）、ReturnURL 回呼驗證（POST /api/ecpay/notify）、QueryTradeInfo 主動確認付款狀態（POST /api/orders/:id/ecpay-verify）
- CheckMacValue SHA-256 簽章（含 .NET URL encode 相容、timing-safe 比較）

### Docs
- 補充 docs/FEATURES.md 綠界 AIO 金流完整段落（流程、業務邏輯、錯誤碼）
- 新增 docs/plans/archive/2026-05-27-ecpay-aio-checkout.md 計畫歸檔
- .claude/skills/init-project-docs 改為子目錄結構（init-project-docs/SKILL.md）

## [1.0.0] - 2026-05-26

### Added
- 使用者認證：註冊、登入、個人資料（JWT HS256，7 天有效期）
- 商品瀏覽：列表（分頁）與詳情（公開無需認證）
- 購物車：支援訪客（X-Session-Id）與登入使用者（JWT）雙模式，加入時自動累加數量
- 訂單管理：從購物車建立訂單（SQLite transaction 原子操作），列表、詳情、模擬付款
- 管理員商品 CRUD：新增、編輯（部分更新）、刪除（保護 pending 訂單中的商品）
- 管理員訂單查看：全站訂單列表（可依 status 篩選）與詳情
- SSR 前台頁面（EJS + Tailwind CSS 4.x）
- API 文件（swagger-jsdoc @openapi 註解，`npm run openapi` 產生規格）
- 完整測試套件（Vitest + supertest，按依賴順序執行）
