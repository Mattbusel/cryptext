/**
 * Federal Register feed: regulatory documents.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface FedRegDocument {
  title: string;
  type: string;
  agencies: string[];
  documentNumber: string;
  publicationDate: string;
}

export interface FedRegData {
  documents: FedRegDocument[];
  mostRecentDate: string;
}

async function fetchFedRegData(): Promise<FeedResult<FedRegData>> {
  try {
    // Query newest documents without date filter
    const res = await fetchJson<{
      results?: Array<{
        title?: string;
        type?: string;
        agencies?: Array<{ name?: string }>;
        document_number?: string;
        publication_date?: string;
      }>;
    }>(
      'https://www.federalregister.gov/api/v1/documents.json?' +
        'per_page=20&order=newest&' +
        'fields[]=title&fields[]=type&fields[]=agencies&' +
        'fields[]=publication_date&fields[]=document_number'
    );

    const documents: FedRegDocument[] = (res.results ?? []).map((r) => ({
      title: r.title ?? 'Untitled',
      type: r.type ?? 'Unknown',
      agencies: r.agencies?.map((a) => a.name ?? 'Unknown') ?? [],
      documentNumber: r.document_number ?? '',
      publicationDate: r.publication_date ?? '',
    }));

    // Get most recent publication date
    let mostRecentDate = '';
    if (documents.length > 0 && documents[0].publicationDate) {
      mostRecentDate = documents[0].publicationDate;
    }

    return {
      ok: true,
      data: {
        documents,
        mostRecentDate,
      },
      fetchedAt: new Date().toISOString(),
      source: 'federalregister.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'federalregister.gov',
    };
  }
}

export const fetchFedReg = withCache('fedregister', fetchFedRegData);
