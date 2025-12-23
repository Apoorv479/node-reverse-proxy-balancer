const http = require('http');

// CONFIGURATION
const servers = [
    { host: 'localhost', port: 3001 },
    { host: 'localhost', port: 3002 },
    { host: 'localhost', port: 3003 }
];

let currentServerIndex = 0;
const cache = new Map();
const CACHE_TTL = 20 * 1000; // 20 Seconds

// ---------------------------------------------------------
// CONCEPT 1: RATE LIMITING CONFIGURATION
// ---------------------------------------------------------
// Rule: 5 seocnds in 10 seconds 
const RATE_LIMIT_WINDOW = 10000; // 10 Seconds
const MAX_REQUESTS_PER_WINDOW = 5;

// users record saving : { "IP_ADDRESS": { count: 1, startTime: 12345678 } }
const rateLimits = new Map();


const lbServer = http.createServer((clientReq, clientRes) => {

    // ---------------------------------------------------------
    // SECURITY STEP 1: Identify the User (IP Address)
    // -----------------------------------------------------------
    const clientIP = clientReq.socket.remoteAddress;
    
    // ---------------------------------------------------------
    // SECURITY STEP 2: The Bouncer Logic (Rate Limiting)
    // ---------------------------------------------------------
    // Check if user is first time visitor 
    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, { count: 1, startTime: Date.now() });
    } else {
        const userData = rateLimits.get(clientIP);
        const currentTime = Date.now();

        // Check: if 10 sec window is old 
        if (currentTime - userData.startTime > RATE_LIMIT_WINDOW) {
            // Window reset 
            userData.count = 1;
            userData.startTime = currentTime;
        } else {
            // increase count 
            userData.count++;
            
            // Check if limit is crossed?
            if (userData.count > MAX_REQUESTS_PER_WINDOW) {
                console.log(`[BLOCKED] IP ${clientIP} exceeded rate limit!`);
                
                clientRes.writeHead(429, { 'Content-Type': 'text/plain' });
                clientRes.end('Too Many Requests! Please wait a moment.');
                return; // stop here only 
            }
        }
    }

    // Agar user is good then start backend and cache logic
    
    const cacheKey = `${clientReq.method}:${clientReq.url}`;
    console.log(`\n[REQUEST] ${cacheKey} from IP: ${clientIP} (Count: ${rateLimits.get(clientIP).count})`);

    // --- CACHE CHECK ---
    if (cache.has(cacheKey)) {
        console.log('   [CACHE HIT] Serving from memory');
        const cachedResponse = cache.get(cacheKey);
        // Security Header adding is important 
        addSecurityHeaders(clientRes); 
        clientRes.writeHead(cachedResponse.statusCode, {
            ...cachedResponse.headers,
            'X-Cache': 'HIT'
        });
        clientRes.end(cachedResponse.body);
        return;
    }

    // --- BACKEND FETCH ---
    console.log('   [CACHE MISS] Fetching from backend...');
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
        let bodyChunks = [];
        
        // Response received and  Security Headers adding 
        addSecurityHeaders(clientRes);
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

        proxyRes.on('data', (chunk) => {
            bodyChunks.push(chunk);
            clientRes.write(chunk);
        });

        proxyRes.on('end', () => {
            clientRes.end();
            
            // Cache Save Logic
            if (proxyRes.statusCode === 200) {
                const fullBody = Buffer.concat(bodyChunks);
                cache.set(cacheKey, {
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    body: fullBody
                });
                setTimeout(() => { cache.delete(cacheKey); }, CACHE_TTL);
            }
        });
    });

    proxyReq.on('error', () => {
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
});

// ---------------------------------------------------------
// CONCEPT 3: SECURITY HEADERS (Identity Hiding)
// ---------------------------------------------------------
function addSecurityHeaders(res) {
    
    res.setHeader('X-Powered-By', 'SecureProxy v1.0'); 
    res.setHeader('X-Content-Type-Options', 'nosniff'); 
    res.setHeader('X-Frame-Options', 'DENY'); //(Clickjacking prevention)
}

lbServer.listen(8080, () => {
    console.log('Secure Proxy (Rate Limiting + Caching) running on port 8080');
});