const http = require('http');

// Configuration: where we want to send the traffic
const TARGET_HOST = 'jsonplaceholder.typicode.com';
const TARGET_PORT = 80;

// Step 1: Server Create 
const server = http.createServer((clientReq, clientRes) => {
    
    console.log(`[LOG] Request received: ${clientReq.method} ${clientReq.url}`);

    // Step 2: Backend options preparation
    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers, // User headers copying
    };

    // IMPORTANT: Host Header Modify 
    
    options.headers['host'] = TARGET_HOST;

    //(The "Forwarding" part)
    const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

        // PIPING: 
        proxyRes.pipe(clientRes, {
            end: true // client connection close 
        });
    });

    // Error Handling
    proxyReq.on('error', (err) => {
        console.error('[ERROR] Backend connection failed:', err);
        clientRes.writeHead(500, { 'Content-Type': 'text/plain' });
        clientRes.end('Proxy Error: Could not connect to backend.');
    });

    // Step 5:  (PIPING Request Body)
  
    clientReq.pipe(proxyReq, {
        end: true
    });
});

// Server starting at port 8080
server.listen(8080, () => {
    console.log('Reverse Proxy running on  port 8080 par...');
    console.log(`Traffic forwarding to: ${TARGET_HOST}`);
});