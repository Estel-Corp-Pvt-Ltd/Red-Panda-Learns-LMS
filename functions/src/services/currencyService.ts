import { ok, fail, Result } from '../utils/response';

interface ExchangeRateResponse {
  base: string;
  date: string;
  time_last_updated: number;
  rates: {
    [currency: string]: number;
  };
}

interface ConversionResult {
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: string;
}

class CurrencyService {
  private readonly API_URL = 'https://api.exchangerate-api.com/v4/latest/inr';
  private cache: ExchangeRateResponse | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getExchangeRates(): Promise<Result<ExchangeRateResponse>> {
    try {
      // Return cached data if still valid
      const now = Date.now();
      if (this.cache && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        return ok(this.cache);
      }

      const response = await fetch(this.API_URL);

      if (!response.ok) {
        return fail('Failed to fetch exchange rates');
      }

      const data: ExchangeRateResponse = await response.json();

      // Update cache
      this.cache = data;
      this.lastFetchTime = now;

      return ok(data);
    } catch (error) {
      return fail('Failed to fetch exchange rates');
    }
  }

  async convertCurrency(
    fromAmount: number,
    fromCurrency: string = 'INR',
    toCurrency: string
  ): Promise<Result<ConversionResult>> {
    try {
      if (fromCurrency !== 'INR') {
        return fail('Only INR base currency is supported');
      }

      const ratesResult = await this.getExchangeRates();
      if (!ratesResult.success) {
        return fail(ratesResult.error?.message || 'Failed to get exchange rates');
      }

      const rates = ratesResult.data!.rates;

      if (!rates[toCurrency]) {
        return fail(`Unsupported currency: ${toCurrency}`);
      }

      const rate = rates[toCurrency];
      const toAmount = fromAmount * rate;

      const result: ConversionResult = {
        fromAmount,
        toAmount: Number(toAmount.toFixed(2)),
        fromCurrency,
        toCurrency,
        rate,
        lastUpdated: new Date(ratesResult.data!.time_last_updated * 1000).toISOString()
      };

      return ok(result);
    } catch (error) {
      return fail('Currency conversion failed');
    }
  }

  async getSupportedCurrencies(): Promise<Result<string[]>> {
    try {
      const ratesResult = await this.getExchangeRates();
      if (!ratesResult.success) {
        return fail(ratesResult.error?.message || 'Failed to get exchange rates');
      }

      const currencies = Object.keys(ratesResult.data!.rates);
      return ok(currencies);
    } catch (error) {
      return fail('Failed to fetch supported currencies');
    }
  }

  async getRate(toCurrency: string): Promise<Result<number>> {
    try {
      const ratesResult = await this.getExchangeRates();
      if (!ratesResult.success) {
        return fail(ratesResult.error?.message || 'Failed to get exchange rates');
      }

      const rates = ratesResult.data!.rates;

      if (!rates[toCurrency]) {
        return fail(`Unsupported currency: ${toCurrency}`);
      }

      return ok(rates[toCurrency]);
    } catch (error) {
      return fail('Failed to fetch exchange rate');
    }
  }
}

export const currencyService = new CurrencyService();
