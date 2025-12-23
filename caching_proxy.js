const http = require('http');

const servers = [
    { host: 'localhost', port: 3001 },
    { host: 'localhost', port: 3002 },
    { host: 'localhost', port: 3003 }
];

let currentServerIndex = 0;

// ---------------------------------------------------------
// CONCEPT 1: THE CACHE STORAGE (In-Memory Map)
// ---------------------------------------------------------
// We will store data here: { "KEY": { data: "...", headers: {...} } }
const cache = new Map();

// Configuration: Time till cache will live  (e.g., 20 seconds)
const CACHE_TTL = 20 * 1000; 

const lbServer = http.createServer((clientReq, clientRes) => {
    
    // Step 1: Cache Key Generation 
    // Key should be unique. Method + URL best combo hai.
    // Example Key: "GET:/todos/1"
    const cacheKey = `${clientReq.method}:${clientReq.url}`;

    console.log(`\n[REQUEST] ${cacheKey}`);

    // ---------------------------------------------------------
    // CONCEPT 2: CACHE HIT (Data already present )
    // ---------------------------------------------------------
    if (cache.has(cacheKey)) {
        console.log('    [CACHE HIT] Serving from memory...');
        const cachedResponse = cache.get(cacheKey);

        // inform client that this data has come from cache (Custom Header)
        clientRes.writeHead(cachedResponse.statusCode, {
            ...cachedResponse.headers,
            'X-Cache': 'HIT'
        });
        clientRes.end(cachedResponse.body);
        return; // stop here 
    }

    // ---------------------------------------------------------
    // CONCEPT 3: CACHE MISS (Go to backend)
    // ---------------------------------------------------------
    console.log('    [CACHE MISS] Fetching from backend...');

    // Round Robin Logic (Phase 3 )
    const target = servers[currentServerIndex];
    currentServerIndex = (currentServerIndex + 1) % servers.length;

    const options = {
        hostname: target.host,
        port: target.port,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        
        // Setup for collecting data chunks (Stream capture)
        let bodyChunks = [];

        // when backend send data ,send to client and keep a copy 
        proxyRes.on('data', (chunk) => {
            bodyChunks.push(chunk); // Copy saved
            clientRes.write(chunk); // sending to client Live Streaming)
        });

        proxyRes.on('end', () => {
            clientRes.end(); // Client  connection close

            // ---------------------------------------------------------
            // CONCEPT 4: SAVING TO CACHE
            // ---------------------------------------------------------
            // Sirf successful requests (200 OK) ko cache karo
            if (proxyRes.statusCode === 200) {
                const fullBody = Buffer.concat(bodyChunks);
                
                cache.set(cacheKey, {
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    body: fullBody
                });
                console.log('    [SAVED] Response cached for 20 seconds.');

                // Timer 20 second  cache delete (TTL)
                setTimeout(() => {
                    console.log(`    [EXPIRED] Clearing cache for ${cacheKey}`);
                    cache.delete(cacheKey);
                }, CACHE_TTL);
            }
        });
    });

    proxyReq.on('error', (err) => {
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
});

lbServer.listen(8080, () => {
    console.log('Caching Load Balancer running on port 8080');
});