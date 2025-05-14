const http = require('http');
const httpProxy = require('http-proxy');
const https = require('https');

const proxy = httpProxy.createProxyServer({ changeOrigin: true });

// Danh sách server
const servers = [
    { url: 'https://demo-deloy-game.vercel.app/', activeRequests: 0, healthy: true },
    { url: 'https://gskserver2.netlify.app/', activeRequests: 0, healthy: true },
    { url: 'https://phamquang14.github.io/DemoGSKServer2/', activeRequests: 0, healthy: true },
    { url: 'https://quangfpt2025.github.io/GSKServer4/', activeRequests: 0, healthy: true },
    { url: 'https://gskserver5.web.app/', activeRequests: 0, healthy: true },
];

// Hàm lấy server ngẫu nhiên trong số các server khỏe mạnh
function getRandomHealthyServer() {
    const healthyServers = servers.filter(s => s.healthy);
    if (healthyServers.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * healthyServers.length);
    return healthyServers[randomIndex];
}

// Kiểm tra server còn sống hay không
function healthCheck() {
    servers.forEach(server => {
        https.get(server.url, res => {
            server.healthy = res.statusCode >= 200 && res.statusCode < 400;
            console.log(`${server.url} is ${server.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        }).on('error', () => {
            server.healthy = false;
            console.log(`${server.url} is ❌ Unhealthy (no response)`);
        });
    });
}

// Thực hiện health check định kỳ
setInterval(healthCheck, 10000); // 10 giây

// Server chính (load balancer)
const server = http.createServer((req, res) => {
    const targetServer = getRandomHealthyServer();

    if (!targetServer) {
        res.writeHead(503);
        return res.end('No healthy servers available');
    }

    console.log(`Routing request to: ${targetServer.url}`); // Log server being used
    targetServer.activeRequests++;
    proxy.web(req, res, { target: targetServer.url }, (err) => {
        targetServer.activeRequests--; // Giảm activeRequests khi có lỗi
        console.error('Proxy error:', err);
        res.writeHead(502);
        res.end('Bad gateway');
    });

    res.on('finish', () => {
        targetServer.activeRequests--;
    });
});

// Sử dụng biến môi trường PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Load balancer running on port ${PORT}`);
    healthCheck(); // Chạy kiểm tra sức khỏe ngay lập tức
});
