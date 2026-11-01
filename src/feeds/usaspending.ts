/**
 * USAspending feed: recent large federal awards.
 */

import { fetchJsonPost } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface Transaction {
  awardId: string;
  recipient: string;
  amount: number;
  actionDate: string;
  agency: string;
  description: string;
}

export interface SpendingData {
  transactions: Transaction[];
}

function getDateRange() {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const startDate = tenDaysAgo.toISOString().split('T')[0];

  return { startDate, endDate };
}

async function fetchSpendingData(): Promise<FeedResult<SpendingData>> {
  try {
    const { startDate, endDate } = getDateRange();

    const res = await fetchJsonPost<{
      results?: Array<{
        'Award ID'?: string;
        'Recipient Name'?: string;
        'Transaction Amount'?: number;
        'Action Date'?: string;
        'Awarding Agency'?: string;
        'Transaction Description'?: string;
      }>;
    }>('https://api.usaspending.gov/api/v2/search/spending_by_transaction/', {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: [{ start_date: startDate, end_date: endDate }],
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Transaction Amount',
        'Action Date',
        'Awarding Agency',
        'Transaction Description',
      ],
      sort: 'Transaction Amount',
      order: 'desc',
      limit: 10,
    });

    const transactions: Transaction[] = (res.results ?? []).map((r) => ({
      awardId: r['Award ID'] ?? '',
      recipient: r['Recipient Name'] ?? 'Unknown',
      amount: r['Transaction Amount'] ?? 0,
      actionDate: r['Action Date'] ?? '',
      agency: r['Awarding Agency'] ?? 'Unknown',
      description: r['Transaction Description'] ?? '',
    }));

    return {
      ok: true,
      data: { transactions },
      fetchedAt: new Date().toISOString(),
      source: 'api.usaspending.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'api.usaspending.gov',
    };
  }
}

export const fetchSpending = withCache('usaspending', fetchSpendingData);
