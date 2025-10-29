/**
 * Convert amount to words with currency support
 * @param {number} amount - The amount to convert
 * @param {string} currency - Currency code: 'INR', 'USD', 'EUR', 'GBP' (default: 'INR')
 * @returns {string} - The amount in words
 */
export function amountToWords(amount, currency = 'INR') {
  // Validate input
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Invalid amount';
  }

  if (amount < 0) {
    return 'Negative amounts are not supported';
  }

  if (amount === 0) {
    return getZeroText(currency);
  }

  // Currency configuration
  const currencyConfig = {
    INR: {
      major: { singular: 'Rupee', plural: 'Rupees' },
      minor: { singular: 'Paise', plural: 'Paise' },
      numbering: 'indian'
    },
    USD: {
      major: { singular: 'Dollar', plural: 'Dollars' },
      minor: { singular: 'Cent', plural: 'Cents' },
      numbering: 'international'
    },
    EUR: {
      major: { singular: 'Euro', plural: 'Euros' },
      minor: { singular: 'Cent', plural: 'Cents' },
      numbering: 'international'
    },
    GBP: {
      major: { singular: 'Pound', plural: 'Pounds' },
      minor: { singular: 'Penny', plural: 'Pence' },
      numbering: 'international'
    }
  };

  const config = currencyConfig[currency.toUpperCase()] || currencyConfig.INR;

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let words = convertNumberToWords(integerPart, config.numbering);

  // Add major currency unit
  if (integerPart > 0) {
    const majorUnit = integerPart === 1 ? config.major.singular : config.major.plural;
    words += ' ' + majorUnit;
  }

  // Add minor currency unit if exists
  if (decimalPart > 0) {
    if (integerPart > 0) {
      words += ' and ';
    }
    words += convertNumberToWords(decimalPart, config.numbering);

    if (config.minor) {
      const minorUnit = decimalPart === 1 ? config.minor.singular : config.minor.plural;
      words += ' ' + minorUnit;
    }
  }

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Convert number to words based on numbering system
 */
function convertNumberToWords(num, numberingSystem) {
  if (num === 0) return '';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (numberingSystem === 'indian') {
    return convertIndianNumber(num);
  } else {
    return convertInternationalNumber(num);
  }

  function convertIndianNumber(n) {
    if (n === 0) return '';

    const places = [
      { value: 10000000, name: 'Crore' },
      { value: 100000, name: 'Lakh' },
      { value: 1000, name: 'Thousand' },
      { value: 100, name: 'Hundred' }
    ];

    let words = '';
    let remaining = n;

    for (const place of places) {
      if (remaining >= place.value) {
        const count = Math.floor(remaining / place.value);
        if (count > 0) {
          if (words !== '') words += ' ';
          words += convertIndianNumber(count) + ' ' + place.name;
          remaining %= place.value;
        }
      }
    }

    if (remaining > 0) {
      if (words !== '') words += ' ';

      if (remaining < 10) {
        words += units[remaining];
      } else if (remaining < 20) {
        words += teens[remaining - 10];
      } else {
        const tensDigit = Math.floor(remaining / 10);
        const unitDigit = remaining % 10;
        words += tens[tensDigit];
        if (unitDigit > 0) {
          words += ' ' + units[unitDigit];
        }
      }
    }

    return words;
  }

  function convertInternationalNumber(n) {
    if (n === 0) return '';

    const places = [
      { value: 1000000000, name: 'Billion' },
      { value: 1000000, name: 'Million' },
      { value: 1000, name: 'Thousand' },
      { value: 100, name: 'Hundred' }
    ];

    let words = '';
    let remaining = n;

    for (const place of places) {
      if (remaining >= place.value) {
        const count = Math.floor(remaining / place.value);
        if (count > 0) {
          if (words !== '') words += ' ';
          words += convertInternationalNumber(count) + ' ' + place.name;
          remaining %= place.value;
        }
      }
    }

    if (remaining > 0) {
      if (words !== '') words += ' ';

      if (remaining < 10) {
        words += units[remaining];
      } else if (remaining < 20) {
        words += teens[remaining - 10];
      } else {
        const tensDigit = Math.floor(remaining / 10);
        const unitDigit = remaining % 10;
        words += tens[tensDigit];
        if (unitDigit > 0) {
          words += ' ' + units[unitDigit];
        }
      }
    }

    return words;
  }
}

/**
 * Get zero amount text for different currencies
 */
function getZeroText(currency) {
  const zeroTexts = {
    INR: 'Zero Rupees',
    USD: 'Zero Dollars',
    EUR: 'Zero Euros',
    GBP: 'Zero Pounds'
  };

  return zeroTexts[currency.toUpperCase()] || 'Zero Rupees';
}
