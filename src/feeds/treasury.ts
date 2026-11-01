/**
 * US Treasury Fiscal Data feed: national debt and interest rates.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface DebtRecord {
  recordDate: string;
  debtHeldPublic: number;
  intragovHold: number;
  totalDebt: number;
}

export interface InterestRate {
  recordDate: string;
  securityType: string;
  securityDesc: string;
  avgRate: number;
}

export interface FiscalData {
  debtHistory: DebtRecord[];
  interestRates: InterestRate[];
}

async function fetchFiscalData(): Promise<FeedResult<FiscalData>> {
  try {
    // Fetch debt to the penny over 30 days
    const debtRes = await fetchJson<{
      data?: Array<{
        record_date: string;
        debt_held_public_amt?: string;
        intragov_hold_amt?: string;
        tot_pub_debt_out_amt?: string;
      }>;
    }>(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=30'
    );

    const debtHistory: DebtRecord[] = (debtRes.data ?? []).map((record) => ({
      recordDate: record.record_date ?? '',
      debtHeldPublic: parseFloat(record.debt_held_public_amt ?? '0'),
      intragovHold: parseFloat(record.intragov_hold_amt ?? '0'),
      totalDebt: parseFloat(record.tot_pub_debt_out_amt ?? '0'),
    }));

    // Fetch average interest rates (latest records by security type)
    const ratesRes = await fetchJson<{
      data?: Array<{
        record_date: string;
        security_type_desc?: string;
        security_desc?: string;
        avg_interest_rate_amt?: string;
      }>;
    }>(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=20'
    );

    const ratesByType = new Map<
      string,
      {
        record_date: string;
        security_type_desc?: string;
        security_desc?: string;
        avg_interest_rate_amt?: string;
      }
    >();
    for (const record of ratesRes.data ?? []) {
      const key = record.security_type_desc ?? 'Unknown';
      if (!ratesByType.has(key)) {
        ratesByType.set(key, record);
      }
    }

    const interestRates: InterestRate[] = Array.from(ratesByType.values()).map(
      (record) => ({
        recordDate: record.record_date ?? '',
        securityType: record.security_type_desc ?? '',
        securityDesc: record.security_desc ?? '',
        avgRate: parseFloat(record.avg_interest_rate_amt ?? '0'),
      })
    );

    return {
      ok: true,
      data: {
        debtHistory,
        interestRates,
      },
      fetchedAt: new Date().toISOString(),
      source: 'api.fiscaldata.treasury.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'api.fiscaldata.treasury.gov',
    };
  }
}

export const fetchFiscal = withCache('treasury', fetchFiscalData);
