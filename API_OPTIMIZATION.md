# API 限制問題解決方案

## 📋 問題說明

Globalping API 的限制是在服務器端基於 IP 地址追蹤的，無法通過客戶端操作重置。當達到限制時，需要採用以下實際有效的解決方案。

## 🚀 立即可用的解決方案

### 方案一：切換 IP 地址（最快速）

**原理**：Globalping 基於 IP 地址計算限制，切換 IP 可立即獲得新配額

**實施方法**：
1. **使用 VPN 服務**
   - 連接到不同國家/地區的服務器
   - 推薦：ProtonVPN、NordVPN、ExpressVPN
   - 免費選項：Cloudflare WARP、ProtonVPN 免費版

2. **使用手機熱點**
   - 開啟手機的 4G/5G 熱點
   - 電腦連接手機網路進行測試
   - 通常能獲得不同的 IP 地址

3. **重啟路由器**（僅適用於動態 IP）
   - 斷開路由器電源 5-10 分鐘
   - 重新連線可能獲得新的 IP 地址
   - 效果取決於 ISP 的 IP 分配策略

⚠️ **注意事項**：
- 頻繁切換 IP 可能觸發反濫用機制
- 某些 VPN IP 可能已被其他用戶耗盡配額

### 方案二：部署 Cloudflare Worker 代理

**原理**：使用 Worker 的 IP 地址代替本地 IP，並實現緩存優化

**優勢**：
- 使用 Cloudflare 的 IP 而非用戶 IP
- 多用戶共享 Worker 配額
- 自動緩存相同請求
- 零成本（免費額度）

**部署步驟**：
1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 前往 Workers & Pages → Create Application → Create Worker
3. 複製 `worker-proxy.js` 的代碼
4. 設置環境變數（可選）：
   ```
   GLOBALPING_TOKEN=your-api-token
   ```
5. 部署後獲得 Worker URL

**前端配置**：
```javascript
// 在 config.js 中添加
WORKER_PROXY_URL: 'https://your-worker.your-subdomain.workers.dev',
```

### 方案三：啟用智能緩存

**原理**：減少不必要的 API 請求，延長可用時間

**實施策略**：
1. **節點狀態緩存**（5分鐘）
   - 避免重複檢查相同節點
   - 減少 90% 的狀態檢查請求

2. **批量節點檢查**
   - 一次請求檢查多個節點
   - 大幅降低總請求數

3. **測試結果緩存**
   - 相同目標的測試結果暫存
   - 避免重複測試

**啟用方法**：
點擊 API 計數器旁的 ❓ 按鈕 → 方案三 → 啟用緩存選項

### 方案四：使用官方 API Token

**獲取步驟**：
1. 前往 [Globalping Dashboard](https://globalping.io)
2. 註冊免費帳號
3. 在 Tokens 頁面生成 API Token
4. 在 `config.js` 中設置：
   ```javascript
   GLOBALPING_TOKEN: 'your-api-token',
   ```

**效果**：
- 限制從 250/小時 提升到 500/小時
- 更穩定的配額管理

## 🏆 推薦組合策略

### 日常使用
```
官方 Token (500/小時) + 智能緩存 = 穩定使用
```

### 高頻使用
```
Worker 代理 + 官方 Token + VPN 備用 = 幾乎無限制
```

### 開發測試
```
本地緩存 + 批量檢查 = 開發友好
```

## 🔧 技術實現

### Worker 代理核心代碼
```javascript
// 請求轉發
const globalpingUrl = `https://api.globalping.io/${apiPath}`;
const response = await fetch(globalpingUrl, {
    headers: {
        'Authorization': `Bearer ${env.GLOBALPING_TOKEN}`
    }
});

// 緩存策略
if (response.ok && request.method === 'GET') {
    cache.put(cacheKey, response.clone());
}
```

### 本地緩存實現
```javascript
// 節點狀態緩存
const cacheKey = `node_status_${nodeId}`;
const cached = localStorage.getItem(cacheKey);
if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
}
```

## 📊 效果對比

| 方案 | 立即生效 | 技術難度 | 效果持續性 | 推薦指數 |
|------|----------|----------|------------|----------|
| VPN/代理 | ✅ | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Worker代理 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 智能緩存 | ✅ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 官方Token | ✅ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 💡 專業提示

1. **組合使用**：不要依賴單一方案，組合使用效果最佳
2. **監控使用**：注意 API 計數器，提前切換策略
3. **緩存優先**：能用緩存就不發新請求
4. **錯峰使用**：避開使用高峰期（如UTC工作時間）

## ⚡ 緊急方案

當所有方案都無效時：
1. 使用手機 4G 網路
2. 請朋友代為測試
3. 等待下一個小時重置
4. 使用其他 Looking Glass 服務