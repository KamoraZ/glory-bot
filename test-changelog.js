const http = require('http');

const data = JSON.stringify({
    guildId: "1558051845274865775",
    version: "1.2.0",
    title: "Cập nhật tính năng Modpack & OptiFine",
    description: "• Tối ưu hóa hiệu năng khởi chạy game.\n• Thêm tính năng tự động cập nhật modpack.\n• Sửa lỗi crash khi load resource pack nặng.",
    downloadUrl: "https://example.com/download/mc-launcher",
    author: "Glory Launcher Team"
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/webhook/changelog',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response: ${body}`);
    });
});

req.on('error', (error) => {
    console.error('Lỗi kết nối tới webhook:', error);
});

req.write(data);
req.end();
