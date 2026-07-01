
export interface LeafLinkPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class LeafLinkClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; authScheme?: string }) {
    const apiKey = opts?.apiKey ?? process.env.LEAFLINK_API_KEY;
    const baseUrl = opts?.baseUrl ?? process.env.LEAFLINK_BASE_URL ?? "https://app.leaflink.com/api/v2";
    const authScheme = opts?.authScheme ?? process.env.LEAFLINK_AUTH_SCHEME ?? "Token";

    if (!apiKey) {
      throw new Error("LEAFLINK_API_KEY is not set. Copy .env.example to .env and fill it in.");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authHeader = `${authScheme} ${apiKey}`;
  }

  /** Fetch a single page from a LeafLink v2 endpoint. Path must start with "/" and LeafLink requires a trailing slash before the query string. */
  async getPage<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<LeafLinkPage<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return this.request<LeafLinkPage<T>>(url.toString());
  }

  /** Iterate every page of a paginated endpoint, following the `next` URL LeafLink returns. */
  async *paginate<T>(path: string, params: Record<string, string | number | undefined> = {}): AsyncGenerator<T[]> {
    let page: LeafLinkPage<T> | null = await this.getPage<T>(path, { page_size: 500, ...params });
    yield page.results;
    while (page?.next) {
      page = await this.request<LeafLinkPage<T>>(page.next);
      yield page.results;
    }
  }

  private async request<T>(url: string, attempt = 1): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.status === 429 && attempt <= 5) {
      const retryAfter = Number(res.headers.get("Retry-After")) || 2 * attempt;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.request<T>(url, attempt + 1);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LeafLink API error ${res.status} for ${url}: ${body.slice(0, 500)}`);
    }

    return res.json() as Promise<T>;
  }
}
