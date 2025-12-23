const http = require('http');

// CONFIGURATION
const servers = [
    { host: 'localhost', port: 3001 },
    { host: 'localhost', port: 3002 },
    { host: 'localhost', port: 3003 }
];

// STATE
let currentServerIndex = 0;

const lbServer = http.createServer((clientReq, clientRes) => {
    
    // ---------------------------------------------------------
    // LOGIC CHANGE 1: Round Robin Selection
    // ---------------------------------------------------------
    // Formula: (Current + 1) % TotalServers
     
    const target = servers[currentServerIndex];
    currentServerIndex = (currentServerIndex + 1) % servers.length;

    console.log(`[BALANCER] Routing traffic to -> ${target.host}:${target.port}`);

    const options = {
        hostname: target.host,
        port: target.port,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers
    };

    // Forward request to the SELECTED target
    const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
    });

    // Error Handling 
    proxyReq.on('error', (err) => {
        console.error(`[ERROR] Server ${target.port} failed!`);
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway: Backend server is down.');
    });

    clientReq.pipe(proxyReq, { end: true });
});

lbServer.listen(8080, () => {
    console.log('Load Balancer running on port 8080');
});