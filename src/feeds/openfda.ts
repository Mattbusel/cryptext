/**
 * openFDA recalls feed: recent food and drug recalls.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface RecallItem {
  recallNumber: string;
  product: string;
  firm: string;
  classification: string;
  reportDate: string;
}

export interface RecallData {
  food: RecallItem[];
  drug: RecallItem[];
}

async function fetchRecallData(): Promise<FeedResult<RecallData>> {
  try {
    // Fetch food recalls
    const foodRes = await fetchJson<{
      results?: Array<{
        recall_number?: string;
        product_description?: string;
        recalling_firm?: string;
        classification?: string;
        report_date?: string;
      }>;
    }>(
      'https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=10'
    );

    // Fetch drug recalls
    const drugRes = await fetchJson<{
      results?: Array<{
        recall_number?: string;
        product_description?: string;
        recalling_firm?: string;
        classification?: string;
        report_date?: string;
      }>;
    }>(
      'https://api.fda.gov/drug/enforcement.json?sort=report_date:desc&limit=10'
    );

    const food: RecallItem[] = (foodRes.results ?? []).map((r) => ({
      recallNumber: r.recall_number ?? '',
      product: r.product_description ?? 'Unknown',
      firm: r.recalling_firm ?? 'Unknown',
      classification: r.classification ?? 'Unknown',
      reportDate: r.report_date ?? '',
    }));

    const drug: RecallItem[] = (drugRes.results ?? []).map((r) => ({
      recallNumber: r.recall_number ?? '',
      product: r.product_description ?? 'Unknown',
      firm: r.recalling_firm ?? 'Unknown',
      classification: r.classification ?? 'Unknown',
      reportDate: r.report_date ?? '',
    }));

    return {
      ok: true,
      data: { food, drug },
      fetchedAt: new Date().toISOString(),
      source: 'api.fda.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'api.fda.gov',
    };
  }
}

export const fetchRecalls = withCache('openfda', fetchRecallData);
