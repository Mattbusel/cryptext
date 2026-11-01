/**
 * Vercel serverless function: GET /api/page
 * Returns a CRYPTEXT page in the requested format (html, ansi, json, or tti).
 */

import { lookupPage, initializePages } from '../dist/src/registry.js';
import { encodeHtml } from '../dist/src/encode/html.js';
import { encodeAnsi } from '../dist/src/encode/ansi.js';
import { encodeJson } from '../dist/src/encode/json.js';
import { encodeTti } from '../dist/src/encode/tti.js';

export default async function handler(req, res) {
  // Initialize pages on first request
  await initializePages();

  // Parse query parameters
  const n = parseInt(req.query.n, 10);
  const format = req.query.format ?? 'html';

  // Validate page number
  if (!Number.isFinite(n) || n < 0) {
    res.status(400).json({ error: 'Invalid page number' });
    return;
  }

  // Validate format
  if (!['html', 'ansi', 'json', 'tti'].includes(format)) {
    res.status(400).json({ error: 'Invalid format' });
    return;
  }

  // Look up page in registry
  const entry = lookupPage(n);
  if (!entry) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  try {
    // Fetch data from the feed
    const feedResult = await entry.fetch();

    // Build the page
    const page = entry.build(feedResult, new Date());

    // Set standard headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');

    // Encode and respond based on format
    switch (format) {
      case 'html':
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(encodeHtml(page));
        break;

      case 'ansi':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(encodeAnsi(page));
        break;

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.send(encodeJson(page));
        break;

      case 'tti':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(encodeTti(page));
        break;

      default:
        res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
}
