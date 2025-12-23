# High-Performance Reverse Proxy and Load Balancer

A custom-built, zero-dependency Reverse Proxy and Load Balancer implementation using the native Node.js `http` module. This project demonstrates core networking concepts including Layer 7 traffic routing, round-robin load balancing, active health checks, in-memory caching, and rate limiting security.

## Project Overview

The goal of this project was to engineer a high-throughput network intermediary without relying on heavy frameworks like Express.js or Nginx. It operates at the Application Layer (OSI Layer 7), managing HTTP traffic between clients and a cluster of backend servers. It is designed to ensure high availability, reduced latency via caching, and protection against abuse via rate limiting.

## Key Features

- **Reverse Proxying:** Hides backend server identities by acting as the primary entry point for client requests. Handles Host header modification and `X-Forwarded-For` implementation.
- **Load Balancing (Round Robin):** Distributes incoming traffic evenly across multiple backend server instances to ensure optimal resource utilization.
- **Active Health Checks:** Continuously monitors backend server status. Automatically removes unresponsive servers from the rotation and reintegrates them upon recovery.
- **In-Memory Caching:** Implements a short-term caching mechanism (TTL-based) to serve repeated requests instantly, reducing load on backend infrastructure.
- **Rate Limiting:** Protects the system from DDoS attacks and abuse by limiting the number of requests per IP address within a specific time window.
- **Security Headers:** Injects standard security headers (`X-Frame-Options`, `X-Content-Type-Options`) to mitigate common web vulnerabilities.

## Technical Architecture

The system is built on an event-driven, non-blocking I/O model.

1.  **Client Request:** The user sends an HTTP request to the Proxy.
2.  **Security Layer:** The system checks the client IP against the Rate Limiter. If the limit is exceeded, a 429 status is returned.
3.  **Cache Layer:** The system checks the in-memory store for a valid cached response. If found (Cache Hit), it is returned immediately.
4.  **Load Balancer Logic:** If no cache exists (Cache Miss), the system selects an available backend server using the Round Robin algorithm, filtering out any unhealthy servers.
5.  **Forwarding & Piping:** The request is streamed to the backend. The response is intercepted, cached (if successful), and streamed back to the client using Node.js pipes to minimize memory footprint.

## Engineering Decisions

### Why Native Node.js?

Instead of using frameworks like Express.js, this project utilizes the raw `http` module. This decision was made to:

- **Minimize Overhead:** Remove the processing cost of routing middleware and request wrapping found in Express.
- **Control Streams:** Gain low-level control over `req.pipe()` and `res.pipe()` for efficient data handling without buffering large payloads in memory.
- **Deep Learning:** Understand the intricacies of the HTTP protocol, socket management, and header manipulation.

### Concurrency Model

The application leverages the Node.js event loop to handle thousands of concurrent connections on a single thread, making it highly I/O efficient compared to multi-threaded blocking architectures.

## Getting Started

### Prerequisites

- Node.js (Version 14.0 or higher recommended)
- NPM (comes with Node.js)

### Installation

1.  Clone the repository
2.  No external dependencies are required (`npm install` is not needed as we use standard libraries).

### Running the Application

This project requires two terminal instances to simulate a distributed environment.

**Step 1: Start the Backend Cluster**
This script spins up 3 dummy HTTP servers on ports 3001, 3002, and 3003.

````bash
node backends.js

**Step 2: Start the Proxy Server This runs the main load balancer on port 8080.
```bash
node secure_proxy.js



### Testing the System
Open your browser or API client (like Postman) and navigate to http://localhost:8080.

Load Balancing: Refresh the page multiple times. You will see the response cycle through ports 3001, 3002, and 3003.

Caching: Notice that after the first load, subsequent refreshes (within 20 seconds) are instant and do not change the backend port, indicating a Cache Hit.

Rate Limiting: Rapidly refresh the page (more than 5 times in 10 seconds) to trigger the "Too Many Requests" blocking mechanism.

Health Check: Stop the backends.js script or kill a specific port process. The proxy logs will show the server being removed from the rotation without crashing the application.
````
