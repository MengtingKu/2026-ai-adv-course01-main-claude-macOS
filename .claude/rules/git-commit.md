---
# 無 paths，適用於整個專案
---

# Git Commit 規則

## Commit Message 格式
```
<type>: <描述>（中文或英文皆可）

[選填：較長的說明段落]
```

## Type 類型
| type | 使用情境 |
|------|---------|
| `feat` | 新功能 |
| `fix` | Bug 修復 |
| `refactor` | 重構（不改變功能） |
| `test` | 新增或修改測試 |
| `docs` | 文件變更 |
| `style` | 程式碼格式（不影響邏輯） |
| `chore` | 建置工具、依賴套件更新 |
| `perf` | 效能優化 |

## 禁止 Commit 的檔案
- `.env`（含有 JWT_SECRET 等機密）
- `database.sqlite`、`database.sqlite-shm`、`database.sqlite-wal`（本機資料）
- `node_modules/`
- `public/css/output.css`（建置產物）

## 範例
```
feat: 新增訂單付款狀態查詢 API
fix: 修復購物車累加數量超出庫存未正確攔截的問題
test: 補充 adminOrders 篩選狀態的測試案例
docs: 更新 ARCHITECTURE.md 的 DB Schema 說明
```
