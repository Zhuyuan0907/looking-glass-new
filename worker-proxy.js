// Cloudflare Worker Proxy for Globalping API
// 這個Worker可以作為Globalping API的代理，提供緩存和請求優化

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 設定 CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // 處理 OPTIONS 請求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 代理 Globalping API 請求
    if (url.pathname.startsWith('/api/globalping/')) {
      const apiPath = url.pathname.replace('/api/globalping/', '');
      const globalpingUrl = `https://api.globalping.io/${apiPath}${url.search}`;
      
      try {
        // 複製請求頭
        const headers = new Headers(request.headers);
        
        // 如果環境變數中有 Token，優先使用
        if (env.GLOBALPING_TOKEN) {
          headers.set('Authorization', `Bearer ${env.GLOBALPING_TOKEN}`);
        }
        
        // 對於 GET 請求，嘗試從緩存獲取
        if (request.method === 'GET' && url.pathname.includes('/measurements/')) {
          const cacheKey = new Request(globalpingUrl, request);
          const cache = caches.default;
          
          // 檢查緩存
          let response = await cache.match(cacheKey);
          
          if (!response) {
            // 緩存未命中，發送請求
            response = await fetch(globalpingUrl, {
              method: request.method,
              headers: headers,
              body: request.method === 'POST' ? await request.text() : undefined
            });
            
            // 如果是成功的測量結果，緩存5秒
            if (response.ok) {
              const responseData = await response.text();
              const newResponse = new Response(responseData, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                  ...Object.fromEntries(response.headers),
                  ...corsHeaders,
                  'Cache-Control': 'public, max-age=5'
                }
              });
              
              // 將響應放入緩存
              ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));
              return newResponse;
            }
          } else {
            // 從緩存返回，添加CORS頭
            const responseData = await response.text();
            return new Response(responseData, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers),
                ...corsHeaders
              }
            });
          }
        } else {
          // POST 請求直接轉發
          const response = await fetch(globalpingUrl, {
            method: request.method,
            headers: headers,
            body: request.method === 'POST' ? await request.text() : undefined
          });
          
          const responseData = await response.text();
          return new Response(responseData, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(response.headers),
              ...corsHeaders
            }
          });
        }
        
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }), 
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // 狀態檢查端點
    if (url.pathname === '/api/status') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          hasToken: !!env.GLOBALPING_TOKEN,
          timestamp: new Date().toISOString()
        }),
        { headers: corsHeaders }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Not found' }), 
      { status: 404, headers: corsHeaders }
    );
  }
};