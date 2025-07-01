# API 優化方案

本專案提供多種方式來提高 Globalping API 的使用限制。

## 方案一：使用 Globalping Token（最簡單）

1. 註冊 Globalping 帳號：https://globalping.io
2. 在 Dashboard 的 Tokens 頁面生成 API Token
3. 在 `config.js` 中設置 `GLOBALPING_TOKEN`

優點：
- 實施簡單
- 限制從 250/小時 提升到 500/小時
- 官方支援

缺點：
- 仍然有限制
- Token 需要保密

## 方案二：使用 Cloudflare Worker 代理（推薦）

使用 Cloudflare Worker 作為代理服務器，可以實現：
- 請求緩存（減少重複請求）
- 多用戶共享配額
- 集中管理 Token

### 部署步驟：

1. 登入 Cloudflare Dashboard
2. 創建新的 Worker
3. 使用 `worker-proxy.js` 的代碼
4. 設置環境變數 `GLOBALPING_TOKEN`（可選）
5. 部署 Worker

### 配置前端：

在 `config.js` 中添加：
```javascript
WORKER_PROXY_URL: 'https://your-proxy.workers.dev',
```

## 方案三：實施客戶端緩存

在前端實施智能緩存策略：
- 緩存節點狀態（5分鐘）
- 緩存測試結果（對相同目標）
- 批量檢查節點狀態

## 方案四：架設自己的探測節點

Globalping 允許用戶架設自己的探測節點來獲取額外積分：
- 每個節點每天獲得 150 積分
- 積分可用於超出限制的測試

### 架設步驟：

1. 準備一台 VPS 或家用電腦
2. 安裝 Docker
3. 運行 Globalping 探測節點：
```bash
docker run -d --name globalping-probe \
  --restart always \
  -e GLOBALPING_TOKEN=your-token \
  ghcr.io/jsdelivr/globalping-probe
```

## 方案五：實施請求優化

1. **批量節點檢查**：一次檢查多個節點
2. **智能重試**：只對失敗的請求重試
3. **優先級隊列**：優先處理用戶發起的測試

## 推薦組合

對於高流量網站，推薦組合使用：
1. Globalping Token（基礎 500/小時）
2. Cloudflare Worker 代理（緩存優化）
3. 架設 1-2 個探測節點（額外積分）

這樣可以有效支援每小時 1000+ 次測試。