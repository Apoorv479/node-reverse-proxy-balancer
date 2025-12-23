const http = require('http');

// We will run three servers three different ports 
const ports = [3001, 3002, 3003];

ports.forEach(port => {
    http.createServer((req, res) => {
        // Every server will tell its name so that we can find where request has gone 
        const message = `Hello from Backend Server running on Port ${port}\n`;
        console.log(`Backend ${port} handled request`);
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(message);
    }).listen(port, () => {
        console.log(`Backend Server started at http://localhost:${port}`);
    });
});