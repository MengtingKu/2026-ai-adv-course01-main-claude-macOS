---
paths:
  - "src/database.js"
  - "src/routes/**"
---

# 資料庫規則

## Parameterized Queries（最重要）
所有 SQL 查詢必須使用 `db.prepare(...)` 搭配 `?` 佔位符，嚴禁字串拼接：
```javascript
// 正確
db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// 錯誤（SQL injection 風險）
db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```
動態欄位名稱（如 cartRoutes 的 `owner.field`）雖然用字串插值，但其值來自內部邏輯（`'user_id'` 或 `'session_id'`），不接受使用者輸入，此情況允許例外。

## Transaction 使用
多步驟寫入操作必須使用 `db.transaction()`：
```javascript
const operate = db.transaction(() => {
  db.prepare('INSERT INTO ...').run(...);
  db.prepare('UPDATE ...').run(...);
});
operate();
```

## 欄位命名
資料庫欄位使用 `snake_case`，與 JS 變數的 `camelCase` 區分。

## WAL 模式
資料庫已啟用 WAL 模式（`db.pragma('journal_mode = WAL')`），提升讀寫並發性能，不需要重複設定。

## 外鍵約束
已啟用 `db.pragma('foreign_keys = ON')`，新增表必須遵守外鍵引用，不可插入不存在的 FK 值。

## ID 格式
所有主鍵使用 `uuid v4`（`const { v4: uuidv4 } = require('uuid')`），`TEXT` 型別存儲。

## 庫存操作
扣減庫存時使用 `stock = stock - ?` 而非先讀後寫，利用 SQLite 的寫鎖防止競態條件。

## 避免 SELECT *（效能建議）
查詢使用者資料時指定欄位，排除 `password_hash`（如 `SELECT id, email, name, role, created_at FROM users WHERE id = ?`）。
