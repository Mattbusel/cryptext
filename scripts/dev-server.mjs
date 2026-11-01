#!/usr/bin/env node
/**
 * Local development server for testing API endpoints.
 * Usage: node scripts/dev-server.mjs
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3666;
const publicDir = path.resolve(__dirname, '..', 'public');
const distDir = path.resolve(__dirname, '..', 'dist');

// Import the API handlers dynamically with file:// URL
const apiDir = path.resolve(__dirname, '..', 'api');
const pageHandlerUrl = pathToFileURL(path.join(apiDir, 'page.js'));
const pagesHandlerUrl = pathToFileURL(path.join(apiDir, 'pages.js'));

const pageHandler = await import(pageHandlerUrl.href);
const pagesHandler = await import(pagesHandlerUrl.href);

function serveStatic(filePath, res) {
  try {
    const fullPath = path.resolve(publicDir, filePath.replace(/^\//, ''));
    // Security: ensure the path is within publicDir
    if (!fullPath.startsWith(publicDir)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      serveStatic(path.join(filePath, 'index.html'), res);
      return;
    }

    const ext = path.extname(fullPath);
    const contentType =
      ext === '.html' ? 'text/html' :
      ext === '.css' ? 'text/css' :
      ext === '.js' ? 'application/javascript' :
      'application/octet-stream';

    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Server error: ${error.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  // Add helper methods to res object
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(obj) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(obj));
  };
  res.send = function(text) {
    this.end(text);
  };

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // API routes
  if (pathname === '/api/page') {
    req.query = query;
    return pageHandler.default(req, res);
  }

  if (pathname === '/api/pages') {
    req.query = query;
    return pagesHandler.default(req, res);
  }

  // Static files
  if (pathname === '/' || /^\/p\/\d{3}$/.test(pathname)) {
    return serveStatic('/index.html', res);
  }

  return serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`CRYPTEXT development server running on http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/page?n=100&format=json`);
  console.log(`  Web: http://localhost:${PORT}/`);
  console.log(`  Press Ctrl+C to stop`);
});
