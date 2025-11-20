import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { CurrencyRate } from '@/types/transaction';
import { Currency } from '@/types/general';
import { COLLECTION, CURRENCY } from '@/constants';
import { toDateSafe } from '@/utils/date-time';
import { FALLBACK_CURRENCY_RATE } from "@/constants";

class CurrencyService {
  // TODO: Use this, maybe
  private readonly API_KEY = import.meta.env.VITE_CURRENCY_API_KEY;
  private readonly API_URL = `https://api.exchangerate-api.com/v4/latest`;
  private readonly CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

  /**
 * Retrieves the exchange rate between two currencies with caching, validation,
 * and multiple fallback layers to ensure resilience.
 *
 * Workflow:
 * 1. **Direct equality check** – If `from` and `to` are the same currency,
 *    the method immediately returns `1` (identity rate).
 *
 * 2. **Check cached rate** – Attempts to retrieve a previously cached rate
 *    from Firebase using {@link getCachedRate}. If a cached rate exists and
 *    {@link isCacheValid} confirms it is still valid (e.g., not expired), the
 *    cached value is returned.
 *
 * 3. **Fetch fresh rate** – If no valid cached rate exists, the method fetches
 *    a fresh rate from the external API via {@link fetchFreshRate}.
 *    - The newly fetched rate is then cached using {@link cacheRate} to avoid
 *      redundant API calls in the near future.
 *    - The fresh rate is returned to the caller.
 *
 * 4. **Error handling and fallback logic** – If an error occurs at any step:
 *    - The method first attempts to return the cached rate, even if it is expired,
 *      as a "best available" fallback.
 *    - If no cached rate exists, it falls back to a predefined static rate via
 *      {@link getFallbackRate}, which provides ultimate resilience in case both
 *      the API and cache are unavailable.
 *
 * Notes:
 * - This method prioritizes performance (via caching) and fault tolerance
 *   (via fallbacks) to ensure the application always has *some* exchange rate
 *   available.
 * - TODO: Implement a more sophisticated fallback mechanism (e.g., retry logic,
 *   alternative APIs, or interpolation from recent historical data).
 *
 * @param from - The base currency (e.g., "USD").
 * @param to - The target currency (e.g., "INR").
 * @returns A promise that resolves to the numeric exchange rate.
 */

  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;

    try {
      // Try to get cached rate from Firebase
      const cachedRate = await this.getCachedRate(from, to);
      if (cachedRate && this.isCacheValid(cachedRate)) {
        return cachedRate.rate;
      }

      // Fetch fresh rate from API
      const freshRate = await this.fetchFreshRate(from, to);
      return freshRate;

      // TODO: Have a better fallback mechanism, if required
    } catch (error) {
      console.error('Error getting exchange rate:', error);

      // Fallback to cached rate even if expired
      const cachedRate = await this.getCachedRate(from, to);
      if (cachedRate) {
        return cachedRate.rate;
      }

      // Ultimate fallback rates
      return this.getFallbackRate(from, to);
    }
  }

  /**
 * Retrieves a cached exchange rate for a given currency pair from Firestore.
 *
 * This function implements a two-step lookup strategy:
 *
 * 1. **Today's Rate Check**:
 *    - Attempts to fetch a document with ID pattern `${from}_${to}_${YYYY-MM-DD}`.
 *    - Ensures the rate returned is the snapshot specifically created for today.
 *
 * 2. **Fallback to Latest Available**:
 *    - If today's rate is not found, queries the `Currency Rates` collection
 *      for the latest (most recent `date`) entry matching the given base and
 *      target currencies.
 *    - This ensures that if today's snapshot hasn’t been created yet, the
 *      system can still return the most recent valid rate for that pair.
 *
 * 3. **Normalization**:
 *    - Converts `createdAt` fields back into JavaScript `Date` objects if they
 *      are stored as Firestore Timestamps.
 *
 * 4. **Error Handling**:
 *    - Logs errors to the console and returns `null` if any Firestore
 *      operations fail.
 *
 * @param from - The base currency code (e.g., "USD").
 * @param to - The target currency code (e.g., "INR").
 * @returns A `CurrencyRate` object if a rate is found, otherwise `null`.
 *
 * @example
 * ```ts
 * const rate = await getCachedRate("USD", "INR");
 * if (rate) {
 *   console.log(`Cached rate: 1 USD = ${rate.rate} INR (as of ${rate.date})`);
 * }
 * ```
 */

  private async getCachedRate(from: Currency, to: Currency): Promise<CurrencyRate | null> {
    // 🔒 Step 1: Validate input
    if (!from || !to) {
      console.warn("CurrencyService - Cannot fetch cached rate. 'from' or 'to' is undefined", { from, to });
      return null;
    }

    try {
      const rateId = `${from}_${to}`;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 🔍 Step 2: Check if today's rate exists
      const todayRef = doc(db, COLLECTION.CURRENCY_RATES, `${rateId}_${today}`);
      const todaySnap = await getDoc(todayRef);

      if (todaySnap.exists()) {
        const data = todaySnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
        } as CurrencyRate;
      }

      // 🔁 Step 3: Fallback to last known rate
      const ratesRef = collection(db, COLLECTION.CURRENCY_RATES);

      const q = query(
        ratesRef,
        where("baseCurrency", "==", from),
        where("targetCurrency", "==", to),
        orderBy("date", "desc"),
        limit(1)
      );

      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const latest = querySnap.docs[0].data();
        return {
          ...latest,
          createdAt: latest.createdAt?.toDate?.() ?? latest.createdAt,
        } as CurrencyRate;
      }

      // ❗ No cached rate found
      return null;
    } catch (error) {
      console.log("CurrencyService - Error getting cached rate:", error);
      return null;
    }
  }

  /**
 * Fetches a fresh exchange rate for a given currency pair directly from the external API.
 *
 * This function bypasses any caching logic and always makes a network request
 * to retrieve the latest available rates from the configured provider.
 *
 * Steps:
 * 1. Sends a `fetch` request to `${API_URL}/${from}`, where `from` is the base currency.
 * 2. Validates the HTTP response. If the response is not OK (non-2xx status),
 *    an error is thrown.
 * 3. Parses the JSON payload, which contains a `rates` object mapping target
 *    currency codes to their numeric exchange values.
 * 4. Extracts the exchange rate for the specified `to` currency.
 * 5. Throws an error if the requested target currency does not exist in the response.
 *
 * @param from - The base currency code (e.g., "USD").
 * @param to - The target currency code (e.g., "INR").
 * @returns A numeric exchange rate (`from → to`).
 * @throws Error if:
 *   - The API request fails,
 *   - The response is invalid, or
 *   - The target currency is missing in the API’s `rates` object.
 *
 * @example
 * ```ts
 * const freshRate = await fetchFreshRate("USD", "INR");
 * console.log(`1 USD = ${freshRate} INR`);
 * ```
 */

  private async fetchFreshRate(from: Currency, to: Currency): Promise<number> {
    const response = await fetch(`${this.API_URL}/${from}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    return rate;
  }

  /**
 * Determines whether a cached exchange rate is still valid based on its age.
 *
 * This function compares the `createdAt` timestamp of a cached
 * {@link CurrencyRate} entry against the configured cache duration
 * (`CACHE_DURATION`). If the time elapsed since the rate was stored is less
 * than the allowed duration, the cached rate is considered valid; otherwise,
 * it is treated as expired.
 *
 * @param cachedRate - A previously stored currency rate snapshot, including
 *                     its `createdAt` timestamp.
 * @returns `true` if the cached rate is still within the validity window,
 *          `false` if the cache has expired.
 *
 * @remarks
 * - Uses `Date.now()` for current time comparison.
 * - Interprets `cachedRate.createdAt` as either a `Date` or a
 *   date-like string (safely converted to a `Date`).
 * - Helps reduce unnecessary API calls by preferring fresh-enough
 *   cached data over fetching new rates.
 *
 * @example
 * ```ts
 * const cached = {
 *   id: "USD_INR_2025-09-04",
 *   baseCurrency: "USD",
 *   targetCurrency: "INR",
 *   rate: 83.42,
 *   date: "2025-09-04",
 *   source: "exchangerate-api",
 *   createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
 * };
 *
 * isCacheValid(cached); // true, since it's within the 4h cache window
 * ```
 */
  private isCacheValid(cachedRate: CurrencyRate): boolean {
    const now = Date.now();
    const cachedTime = toDateSafe(cachedRate.createdAt);

    // Safeguard against invalid or null
    if (!cachedTime || isNaN(cachedTime.getTime())) return false;

    return (now - cachedTime.getTime()) < this.CACHE_DURATION;
  }

  /**
 * Provides a static fallback exchange rate for a given currency pair.
 *
 * This method is used as the **ultimate fallback mechanism** when neither a
 * valid cached rate nor a fresh rate from the external API can be retrieved.
 * It looks up the requested currency pair in a predefined map of static rates
 * (`fallbackRates`). If no match is found, it defaults to `1`, effectively
 * assuming parity between the currencies.
 *
 * @param from - The base currency code (e.g., `"USD"`).
 * @param to - The target currency code (e.g., `"INR"`).
 * @returns The fallback exchange rate as a `number`. Returns `1` if no static
 *          fallback rate is defined for the requested pair.
 *
 * @remarks
 * - The static fallback rates should be **reviewed and updated periodically**
 *   to remain reasonably accurate.
 * - This is not intended for long-term use in production logic—only as a
 *   safety net to keep conversions functioning in case of API or cache
 *   failures.
 * - Returning `1` for undefined pairs ensures that the application does not
 *   break, but it may lead to inaccurate conversions.
 *
 * @example
 * ```ts
 * getFallbackRate("USD", "INR"); // → 83.50
 * getFallbackRate("INR", "USD"); // → 0.012
 * getFallbackRate("USD", "EUR"); // → 1 (no static fallback defined)
 * ```
 */
  private getFallbackRate(from: Currency, to: Currency): number {
    return FALLBACK_CURRENCY_RATE[`${from}_${to}`] || 1;
  }


  /**
 * Converts a monetary amount from one currency to another using the most
 * up-to-date exchange rate available.
 *
 * This method first retrieves the applicable exchange rate by delegating
 * to {@link getExchangeRate}, which may use a cached rate, fetch a fresh
 * rate from the external API, or fall back to a static predefined value.
 * It then multiplies the input amount by the exchange rate to calculate the
 * converted value. The result is rounded to two decimal places to represent
 * a typical financial transaction format.
 *
 * @param amount - The numeric amount to be converted, expressed in the base currency.
 * @param from - The currency code of the original amount (e.g., `"USD"`).
 * @param to - The currency code to which the amount should be converted (e.g., `"INR"`).
 *
 * @returns A Promise resolving to an object containing:
 * - `convertedAmount`: The converted value, rounded to two decimal places.
 * - `exchangeRate`: The applied exchange rate for this conversion.
 * - `originalAmount`: The original unmodified input amount.
 * - `originalCurrency`: The base currency in which the original amount was provided.
 *
 * @remarks
 * - This method does not persist the result in the database; it is meant
 *   for on-the-fly conversions.
 * - Rounding is applied with `Math.round` to ensure consistent decimal
 *   precision across currencies.
 * - The reliability of the result depends on the freshness of the exchange
 *   rate retrieved.
 *
 * @example
 * ```ts
 * const result = await convertAmount(100, "USD", "INR");
 * // result = {
 * //   convertedAmount: 8350.00,
 * //   exchangeRate: 83.5,
 * //   originalAmount: 100,
 * //   originalCurrency: "USD"
 * // }
 * ```
 */

  async convertAmount(amount: number, from: Currency, to: Currency): Promise<{
    convertedAmount: number;
    exchangeRate: number;
    originalAmount: number;
    originalCurrency: Currency;
  }> {
    const exchangeRate = await this.getExchangeRate(from, to);
    const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;

    return {
      convertedAmount,
      exchangeRate,
      originalAmount: amount,
      originalCurrency: from,
    };
  }

  /**
 * Formats a numeric amount into a localized currency string.
 *
 * This method uses the built-in `Intl.NumberFormat` API to format the
 * provided `amount` according to the conventions of the given `currency`.
 * It ensures proper placement of the currency symbol, correct grouping
 * separators, and appropriate decimal precision.
 *
 * Currently, only **INR (Indian Rupee)** and **USD (US Dollar)** are supported.
 *
 * @param amount - The numeric amount to format.
 * @param currency - The currency code of the amount (currently `"INR"` or `"USD"`).
 *
 * @returns A string representation of the formatted currency value.
 *
 * @remarks
 * - The locale is hardcoded to `en-IN` for INR and `en-US` for USD, which
 *   ensures culturally appropriate formatting (e.g., `₹1,00,000.00` for INR
 *   vs `$100,000.00` for USD).
 * - If additional currencies are needed, extend the `formatters` map with
 *   more `Intl.NumberFormat` instances.
 *
 * @example
 * ```ts
 * formatCurrency(1234.56, "INR"); // → "₹1,234.56"
 * formatCurrency(1234.56, "USD"); // → "$1,234.56"
 * ```
 */
  formatCurrency(amount: number, currency: Currency): string {
    const formatters: Record<Currency, Intl.NumberFormat> = {
      INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY.INR }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY.USD }),
      EUR: new Intl.NumberFormat('en-IE', { style: 'currency', currency: CURRENCY.EUR }), // Ireland locale
      GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: CURRENCY.GBP })
    };

    return formatters[currency].format(amount);
  }

}

export const currencyService = new CurrencyService();
