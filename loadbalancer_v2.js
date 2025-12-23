const http = require('http');

// CONFIGURATION: Servers list with isup flag
// every server alive in starting
const servers = [
    { host: 'localhost', port: 3001, isUp: true },
    { host: 'localhost', port: 3002, isUp: true },
    { host: 'localhost', port: 3003, isUp: true }
];

// STATE: Round Robin index
let currentServerIndex = 0;

// ---------------------------------------------------------
// CONCEPT 1: HEALTH CHECK 
// ---------------------------------------------------------
function checkServerHealth() {
    console.log('[HEALTH CHECK] Checking servers...');
    
    servers.forEach(server => {
        // Har server par ek halki request bhejo
        const req = http.get({
            host: server.host,
            port: server.port,
            path: '/', // Root path checking
            timeout: 2000 // if no response till 2 seconds then assume dead
        }, (res) => {
            if (res.statusCode === 200) {
                if (!server.isUp) console.log(`[INFO] Server ${server.port} is BACK online!`);
                server.isUp = true;
            }
        });

        // if  connection fail 
        req.on('error', () => {
            if (server.isUp) console.log(`[ALERT] Server ${server.port} is DOWN! Removing from rotation.`);
            server.isUp = false;
        });

        req.on('timeout', () => {
            req.destroy(); // Request cancel 
            if (server.isUp) console.log(`[ALERT] Server ${server.port} TIMED OUT!`);
            server.isUp = false;
        });
    });
}

// (10 seconds)  check 
setInterval(checkServerHealth, 10000);


// ---------------------------------------------------------
// MAIN SERVER LOGIC
// ---------------------------------------------------------
const lbServer = http.createServer((clientReq, clientRes) => {

    // CONCEPT 2: ACTIVE SERVER FILTERING
    
    const activeServers = servers.filter(server => server.isUp);

    // if all server dead
    if (activeServers.length === 0) {
        clientRes.writeHead(500);
        clientRes.end('Critical Error: All backend servers are down!');
        return;
    }

    // CONCEPT 3: DYNAMIC ROUND ROBIN
    
    const target = activeServers[currentServerIndex % activeServers.length];
    currentServerIndex++; 
   

    console.log(`[BALANCER] Request -> Server ${target.port}`);

    const options = {
        hostname: target.host,
        port: target.port,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
    });

    // Error handling for request-time failures
    proxyReq.on('error', () => {
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq, { end: true });
});

lbServer.listen(8080, () => {
    console.log('Smart Load Balancer running on port 8080');
    // Start  checking
    checkServerHealth();
});