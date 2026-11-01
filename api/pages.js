/**
 * Vercel serverless function: GET /api/pages
 * Returns the list of all available pages.
 */

import { allPages, initializePages } from '../dist/src/registry.js';

export default async function handler(req, res) {
  // Initialize pages on first request
  await initializePages();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.json(allPages());
}
