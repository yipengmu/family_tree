/**
 * Local development API server.
 *
 * Every /api request is handled by the same api/*.js module that Vercel
 * invokes in production. Keeping Express as a transport-only shell prevents
 * authentication, tenant authorization, family data, and OCR behavior from
 * drifting between environments.
 */

if (process.env.NODE_ENV !== 'production') {
  // Node.js 22 may reject the certificate used by some local Neon setups.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const createModernApiBridge = require('./modernApiBridge');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 3003;
const modernApiBridge = createModernApiBridge();

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'https://www.tatababa.top',
      'https://tatababa.top',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  }),
);

// Match the largest shared Vercel API body limit. Individual Vercel handlers
// still declare their own production limits in api/*.js.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.options('{*path}', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
  );
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// This is the only application API implementation in local development.
app.use(modernApiBridge);

// Keep the historical local health URL as a small operational alias while
// executing the shared /api/health handler.
app.get('/health', (req, res, next) => {
  req.originalUrl = '/api/health';
  req.url = '/api/health';
  return modernApiBridge(req, res, next);
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

const server = http.createServer(app);
server.headersTimeout = 60000;
server.requestTimeout = 120000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 本地 API 服务运行在端口 ${PORT}`);
    console.log(`📋 API 入口与 Vercel 共用 api/*.js handler`);
    console.log(`\n监听地址: http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${PORT} 已被占用，请更改端口或关闭占用该端口的程序`);
    } else {
      console.error('服务器启动错误:', error);
    }
  });
}

module.exports = app;
