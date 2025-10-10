import { Address, InvoiceData } from "../types/invoice";


export function generateInvoiceHTML(invoiceData: InvoiceData): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatAddress = (address: Address): string[] => {
    const lines: string[] = [];
    if (address.line1) lines.push(address.line1);
    if (address.line2) lines.push(address.line2);
    if (address.city) lines.push(address.city);
    if (address.state) lines.push(address.state);
    if (address.postalCode) lines.push(address.postalCode);
    if (address.country) lines.push(address.country);
    return lines;
  };

  const companyAddressLines = formatAddress(invoiceData.company.address);
  const billToAddressLines = formatAddress(invoiceData.billTo.address);
  const shipToAddressLines = formatAddress(invoiceData.shipTo.address);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice</title>
  <style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  padding: 20px;
  line-height: 1.4;
}

.invoice-container {
  max-width: 768px;
  margin: 0 auto;
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.invoice-wrapper {
  border: 2px solid #333;
  padding: 20px;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 15px;
}

.company-info {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.logo {
  flex-shrink: 0;
}

.company-details h1 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.address p {
  font-size: 11px;
  margin-bottom: 2px;
  color: #555;
}

.invoice-title h2 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  text-align: right;
}

/* Invoice Details */
.invoice-details {
  margin-bottom: 15px;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
}

.info-table td {
  padding: 3px 8px;
  font-size: 12px;
  vertical-align: top;
}

.info-table .label {
  font-weight: bold;
  width: 15%;
}

.info-table .value {
  width: 35%;
}

/* Parties Section */
.parties-section {
  display: flex;
  margin-bottom: 15px;
  border: 1px solid #ccc;
}

.bill-to, .ship-to {
  flex: 1;
  padding: 10px;
}

.bill-to {
  border-right: 1px solid #ccc;
}

.parties-section h3 {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.party-details p {
  font-size: 12px;
  margin-bottom: 2px;
  color: #555;
}

.party-details p strong {
  color: #333;
}

/* Items Table */
.items-section {
  margin-bottom: 15px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ccc;
}

.items-table th,
.items-table td {
  border: 1px solid #ccc;
  padding: 8px 6px;
  text-align: left;
  font-size: 11px;
}

.items-table th {
  background-color: #f8f8f8;
  font-weight: bold;
  text-align: center;
}

.items-table td:first-child {
  text-align: center;
  width: 5%;
}

.items-table td:nth-child(2) {
  width: 35%;
}

.items-table td:nth-child(3) {
  text-align: center;
  width: 10%;
}

.items-table td:nth-child(4),
.items-table td:nth-child(5),
.items-table td:nth-child(6),
.items-table td:nth-child(7),
.items-table td:nth-child(8) {
  text-align: right;
  width: 12.5%;
}

/* Totals Section */
.totals-section {
  display: flex;
  margin-bottom: 20px;
}

.notes-section {
  flex: 1;
  padding-right: 20px;
}

.notes-section h4 {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.notes-section p {
  font-size: 11px;
  margin-bottom: 2px;
  color: #555;
}

.notes-section em {
  font-style: italic;
}

.totals-table {
  flex: 0 0 300px;
}

.totals-table table {
  width: 100%;
  border-collapse: collapse;
}

.totals-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #eee;
}

.total-label {
  text-align: right;
  width: 60%;
}

.total-value {
  text-align: right;
  width: 40%;
}

.total-row td {
  border-top: 1px solid #ccc;
  border-bottom: 2px solid #333;
  font-weight: bold;
}

.balance-row td {
  border-top: 1px solid #ccc;
  font-weight: bold;
}

/* Signature Section */
.signature-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 40px;
  padding-top: 20px;
}

.signature-left p,
.signature-right p {
  font-size: 12px;
  color: #555;
}

.signature-right {
  text-align: right;
}

/* Responsive Design */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }

  .invoice-wrapper {
    padding: 15px;
  }

  .header-section {
    flex-direction: column;
    gap: 15px;
  }

  .company-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .invoice-title {
    text-align: center;
  }

  .parties-section {
    flex-direction: column;
  }

  .bill-to {
    border-right: none;
    border-bottom: 1px solid #ccc;
  }

  .totals-section {
    flex-direction: column;
  }

  .notes-section {
    padding-right: 0;
    margin-bottom: 20px;
  }

  .items-table {
    font-size: 10px;
  }

  .items-table th,
  .items-table td {
    padding: 4px 3px;
  }
}

@media (max-width: 480px) {
  .items-table {
    font-size: 9px;
  }

  .company-details h1 {
    font-size: 14px;
  }

  .invoice-title h2 {
    font-size: 20px;
  }
}

  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-wrapper">
      <!-- Header Section -->
      <div class="header-section">
        <div class="company-info">
          <div class="logo">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="192" height="192">
            <path d="M0 0 C0.80284424 0.00644531 1.60568848 0.01289062 2.43286133 0.01953125 C8.51706817 0.20836217 12.72432267 1.05649369 17.125 5.5 C17.76824219 6.12777344 18.41148438 6.75554688 19.07421875 7.40234375 C24.73987624 13.38978301 26.33398901 18.59589024 26.5390625 26.8671875 C26.55842865 27.54677521 26.5777948 28.22636292 26.5977478 28.92654419 C26.65705099 31.07590579 26.70372891 33.22532241 26.75 35.375 C26.78822532 36.8411679 26.82727964 38.30731443 26.8671875 39.7734375 C26.96271044 43.34876164 27.04692126 46.92424748 27.125 50.5 C27.61790527 50.18772461 28.11081055 49.87544922 28.61865234 49.55371094 C55.36469044 32.68841457 55.36469044 32.68841457 66.76953125 35.046875 C70.76504507 36.19346462 74.44100303 37.56948442 78.125 39.5 C78.125 40.16 78.125 40.82 78.125 41.5 C79.115 41.83 80.105 42.16 81.125 42.5 C86.94505225 48.61742718 87.93687248 55.30285261 87.7644043 63.37646484 C87.28590331 71.56862127 84.46065326 75.50726262 78.58984375 80.84765625 C74.01866375 84.80467222 69.03538427 87.54285066 63.6875 90.3125 C61.89453051 91.25155347 60.1040193 92.19532074 58.31640625 93.14453125 C57.53467041 93.55034424 56.75293457 93.95615723 55.94750977 94.37426758 C53.96759792 95.3765146 53.96759792 95.3765146 53.125 97.5 C53.970625 97.726875 54.81625 97.95375 55.6875 98.1875 C58.95546544 99.43526862 61.30460783 100.98570039 64.07421875 103.0859375 C66.49175219 104.75288437 69.01134999 106.03778372 71.625 107.375 C78.89345752 111.26881653 83.96384764 115.76663017 87.125 123.5 C88.25405721 132.35741007 88.44135331 140.97480323 83.0390625 148.4765625 C77.66732531 154.15525611 72.25099596 157.17915891 64.44140625 157.66796875 C63.53261719 157.67441406 62.62382812 157.68085938 61.6875 157.6875 C60.78128906 157.70167969 59.87507812 157.71585938 58.94140625 157.73046875 C52.6007019 157.2116039 47.57648273 154.24520571 42.1875 151.125 C41.51009766 150.73828125 40.83269531 150.3515625 40.13476562 149.953125 C38.12874585 148.80682798 36.12681425 147.65362132 34.125 146.5 C31.79254772 145.16511962 29.45871081 143.8326797 27.125 142.5 C27.1156543 143.39195068 27.10630859 144.28390137 27.09667969 145.20288086 C27.05233282 148.55259097 26.99057497 151.90108409 26.91748047 155.25024414 C26.88947537 156.69218472 26.86816032 158.13427298 26.85400391 159.57641602 C26.75544021 169.05495861 26.24921217 176.94455438 20.4140625 184.8046875 C19.86492187 185.32289063 19.31578125 185.84109375 18.75 186.375 C18.20601563 186.90867188 17.66203125 187.44234375 17.1015625 187.9921875 C11.61120159 192.18048654 6.95409651 193.05496302 0.25 193 C-0.55211914 192.99427979 -1.35423828 192.98855957 -2.18066406 192.98266602 C-8.25272438 192.7984198 -12.46934517 191.91686515 -16.875 187.5 C-17.43316406 186.99210938 -17.99132812 186.48421875 -18.56640625 185.9609375 C-26.57812624 177.81408006 -26.36848655 166.6399749 -26.5625 155.875 C-26.59666016 154.58464844 -26.63082031 153.29429687 -26.66601562 151.96484375 C-26.74780832 148.80998283 -26.81718232 145.6553759 -26.875 142.5 C-27.68582031 143.00789062 -28.49664062 143.51578125 -29.33203125 144.0390625 C-54.60427764 159.74963243 -54.60427764 159.74963243 -70.625 156.8125 C-77.79247107 153.91794437 -81.48460944 150.40635115 -84.875 143.5 C-85.41060547 142.62794922 -85.41060547 142.62794922 -85.95703125 141.73828125 C-88.28172125 136.06999457 -87.68149886 127.93709244 -86.29296875 122.01953125 C-80.75552579 109.35168228 -65.35465267 103.48564154 -53.875 97.5 C-53.875 96.84 -53.875 96.18 -53.875 95.5 C-56.27648276 93.84291912 -56.27648276 93.84291912 -59.3125 92.1875 C-60.41078125 91.56101562 -61.5090625 90.93453125 -62.640625 90.2890625 C-64.53497864 89.24121955 -66.43779916 88.20798157 -68.359375 87.2109375 C-76.23645104 83.10480212 -83.54444007 78.00464079 -86.875 69.5 C-87.23931815 66.64193824 -87.44610894 64.10178966 -87.4375 61.25 C-87.4372583 60.50363281 -87.4370166 59.75726563 -87.43676758 58.98828125 C-87.23575361 52.4768394 -85.45278434 47.31168573 -80.875 42.5 C-79.39 42.005 -79.39 42.005 -77.875 41.5 C-77.875 40.84 -77.875 40.18 -77.875 39.5 C-68.67351819 34.8231239 -61.88943816 33.56139986 -51.89746094 36.41040039 C-46.59960839 38.32028052 -41.95395382 41.22491625 -37.1875 44.1875 C-36.18783203 44.79400391 -35.18816406 45.40050781 -34.15820312 46.02539062 C-31.72294367 47.50518943 -29.29577444 48.99666608 -26.875 50.5 C-26.86041748 49.70416504 -26.84583496 48.90833008 -26.83081055 48.08837891 C-26.75569504 44.43346534 -26.65924492 40.77940249 -26.5625 37.125 C-26.53994141 35.87332031 -26.51738281 34.62164062 -26.49414062 33.33203125 C-26.19850236 23.06532075 -25.35571218 14.49651167 -18.27734375 6.6796875 C-16.875 5.5 -16.875 5.5 -14.875 5.5 C-14.875 4.84 -14.875 4.18 -14.875 3.5 C-9.79475617 0.44860754 -5.76703951 -0.04787415 0 0 Z " fill="#FE00FE" transform="translate(95.875,-0.5)"/>
            <path d="M0 0 C0.85851563 0.46212891 1.71703125 0.92425781 2.6015625 1.40039062 C9.62865326 5.49231963 12.31939062 10.22615798 15.75 17.4375 C16.80686323 19.35269695 17.87998079 21.25900967 18.96875 23.15625 C19.77892578 24.58517578 19.77892578 24.58517578 20.60546875 26.04296875 C21.14816406 26.99816406 21.69085938 27.95335937 22.25 28.9375 C23.34460028 30.86410049 24.43835322 32.79118265 25.53125 34.71875 C26.00626953 35.55470703 26.48128906 36.39066406 26.97070312 37.25195312 C29.6006042 41.96037096 32.17331131 46.69980217 34.75 51.4375 C27.44051442 51.64195303 20.13177741 51.78110585 12.82006836 51.87695312 C10.33801726 51.91694719 7.85615176 51.97136241 5.37475586 52.04101562 C-20.20157537 52.74046888 -20.20157537 52.74046888 -31.25 43.4375 C-32.81079745 42.56268561 -34.39095685 41.72004011 -36 40.9375 C-43.06562549 37.06574581 -49.26399045 32.06232561 -52.25 24.4375 C-52.61431815 21.57943824 -52.82110894 19.03928966 -52.8125 16.1875 C-52.8122583 15.44113281 -52.8120166 14.69476563 -52.81176758 13.92578125 C-52.61075361 7.4143394 -50.82778434 2.24918573 -46.25 -2.5625 C-45.26 -2.8925 -44.27 -3.2225 -43.25 -3.5625 C-43.25 -4.2225 -43.25 -4.8825 -43.25 -5.5625 C-26.65785255 -13.33442092 -15.3798219 -8.92452968 0 0 Z " fill="#FAAF3B" transform="translate(61.25,44.5625)"/>
            <path d="M0 0 C1.40897804 0.00333092 1.40897804 0.00333092 2.84642029 0.00672913 C3.90744461 0.00680466 4.96846893 0.00688019 6.06164551 0.00695801 C7.79286903 0.01469994 7.79286903 0.01469994 9.55906677 0.02259827 C10.73404221 0.02401321 11.90901764 0.02542816 13.11959839 0.02688599 C16.88981116 0.0325046 20.65996556 0.04506026 24.43016052 0.05775452 C26.97898779 0.06276712 29.52781599 0.06733044 32.0766449 0.07142639 C38.34033685 0.08248007 44.60399452 0.0992363 50.86766052 0.12025452 C47.11364777 7.78700189 43.17553092 15.22436002 38.75120544 22.52064514 C36.59517539 26.10465394 34.55559488 29.67356629 32.75047302 33.44837952 C27.86605466 43.45350303 22.69110948 48.33913407 12.6938324 53.21498108 C9.97498866 54.56277153 7.37185443 56.10669154 4.74266052 57.62025452 C-2.95304761 61.93560487 -11.32297684 62.001971 -19.88233948 60.43275452 C-27.04981055 57.53819889 -30.74194891 54.02660567 -34.13233948 47.12025452 C-34.48940979 46.53888733 -34.8464801 45.95752014 -35.21437073 45.35853577 C-37.53906073 39.69024908 -36.93883833 31.55734696 -35.55030823 25.63978577 C-30.24032623 13.49229271 -15.95638345 7.86684355 -4.9389801 2.11659241 C-1.22641795 0.06916455 -1.22641795 0.06916455 0 0 Z " fill="#29AAE2" transform="translate(45.13233947753906,95.87974548339844)"/>
            <path d="M0 0 C0 0.66 0 1.32 0 2 C0.99 2.33 1.98 2.66 3 3 C8.82005225 9.11742718 9.81187248 15.80285261 9.6394043 23.87646484 C9.1609519 32.06778948 6.33795387 36.0066624 0.46484375 41.34375 C-4.11133404 45.30404485 -9.09444975 48.08053398 -14.4375 50.875 C-16.22850617 51.82952632 -18.01890562 52.78519221 -19.80859375 53.7421875 C-20.59032959 54.1532373 -21.37206543 54.56428711 -22.17749023 54.98779297 C-23.96036722 55.86875341 -23.96036722 55.86875341 -25 57 C-26.62674778 57.09340434 -28.25754051 57.11745171 -29.88696289 57.11352539 C-30.92796646 57.11344986 -31.96897003 57.11337433 -33.04151917 57.11329651 C-34.1737944 57.10813522 -35.30606964 57.10297394 -36.47265625 57.09765625 C-37.62543564 57.0962413 -38.77821503 57.09482635 -39.96592712 57.09336853 C-43.66481064 57.08775005 -47.36363464 57.07519442 -51.0625 57.0625 C-53.56315017 57.05748738 -56.06380129 57.05292406 -58.56445312 57.04882812 C-64.70965588 57.03777462 -70.85482369 57.02101852 -77 57 C-75.57287623 53.35425804 -73.97390355 49.9880652 -72.05859375 46.5703125 C-71.47940186 45.53430908 -70.90020996 44.49830566 -70.3034668 43.4309082 C-67.7851226 38.96919177 -65.26191831 34.51031416 -62.72851562 30.05712891 C-61.25990332 27.45967646 -59.81885017 24.85021886 -58.390625 22.23046875 C-54.32769668 14.91141612 -50.59956225 9.91531501 -43 6 C-41.35185913 4.9619882 -39.70608194 3.92021539 -38.0625 2.875 C-24.80912507 -4.99032064 -13.96825035 -7.09970172 0 0 Z " fill="#29AAE2" transform="translate(174,39)"/>
            <path d="M0 0 C7.18549023 -0.17876284 14.37039894 -0.30060347 21.55761719 -0.38452148 C23.99793933 -0.41953536 26.43811664 -0.46716294 28.87792969 -0.52807617 C54.19585316 -1.14394553 54.19585316 -1.14394553 64 7 C65.25265836 7.76691815 66.51927037 8.5120092 67.8046875 9.22265625 C75.84191824 14.0388594 82.28672251 18.06721414 86 27 C87.12905721 35.85741007 87.31635331 44.47480323 81.9140625 51.9765625 C76.54232531 57.65525611 71.12599596 60.67915891 63.31640625 61.16796875 C62.40761719 61.17441406 61.49882812 61.18085938 60.5625 61.1875 C59.65628906 61.20167969 58.75007813 61.21585938 57.81640625 61.23046875 C51.54840697 60.71755341 46.53158464 57.81401017 41.1875 54.75 C40.52685547 54.38003906 39.86621094 54.01007813 39.18554688 53.62890625 C37.10508863 52.44870438 35.05314378 51.22702257 33 50 C32.23751953 49.57291748 31.47503906 49.14583496 30.68945312 48.70581055 C24.40741692 44.94513134 21.45304733 40.74451757 18.125 34.3125 C17.1117685 32.44472002 16.09741882 30.57754625 15.08203125 28.7109375 C14.3233374 27.29312988 14.3233374 27.29312988 13.54931641 25.84667969 C10.63789632 20.49730083 7.50003685 15.2773669 4.38916016 10.04223633 C3.95780762 9.30513428 3.52645508 8.56803223 3.08203125 7.80859375 C2.70280518 7.16720459 2.3235791 6.52581543 1.93286133 5.86499023 C0.96143881 3.9229079 0.49409557 2.1068746 0 0 Z " fill="#FBAF3B" transform="translate(97,96)"/>
            </svg>
          </div>
          <div class="company-details">
            <h1>${invoiceData.company.name}</h1>
            <div class="address">
              ${companyAddressLines.map(line => `<p>${line}</p>`).join('')}
              <p>GSTIN ${invoiceData.company.gstin}</p>
              <p>${invoiceData.company.phone}</p>
              <p>${invoiceData.company.email}</p>
              <p>${invoiceData.company.website}</p>
            </div>
          </div>
        </div>
        <div class="invoice-title">
          <h2>TAX INVOICE</h2>
        </div>
      </div>

      <!-- Invoice Details Section -->
      <div class="invoice-details">
        <div class="invoice-info">
          <table class="info-table">
            <tr>
              <td class="label">#</td>
              <td class="value">: ${invoiceData.invoiceNumber}</td>
              <td class="label">Place Of Supply</td>
              <td class="value">: ${invoiceData.placeOfSupply}</td>
            </tr>
            <tr>
              <td class="label">Invoice Date</td>
              <td class="value">: ${invoiceData.invoiceDate}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td class="label">Terms</td>
              <td class="value">: ${invoiceData.terms}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td class="label">Due Date</td>
              <td class="value">: ${invoiceData.dueDate}</td>
              <td></td>
              <td></td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Bill To and Ship To Section -->
      <div class="parties-section">
        <div class="bill-to">
          <h3>Bill To</h3>
          <div class="party-details">
            <p><strong>${invoiceData.billTo.name}</strong></p>
            ${billToAddressLines.map(line => `<p>${line}</p>`).join('')}
          </div>
        </div>
        <div class="ship-to">
          <h3>Ship To</h3>
          <div class="party-details">
            <p><strong>${invoiceData.shipTo.name}</strong></p>
            ${shipToAddressLines.map(line => `<p>${line}</p>`).join('')}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item & Description</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>IGST %</th>
              <th>Amt</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description}</td>
              <td>${item.hsnSac}</td>
              <td>${item.quantity.toFixed(2)}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td>${item.igstPercentage}%</td>
              <td>${formatCurrency(item.igstAmount)}</td>
              <td>${formatCurrency(item.amount)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals Section -->
      <div class="totals-section">
        <div class="notes-section">
          <h4>Total In Words</h4>
          <p><em>${invoiceData.totalInWords}</em></p>
          
          <h4>Notes</h4>
          <p>${invoiceData.bankDetails.bankName}</p>
          <p>Branch: ${invoiceData.bankDetails.branch}</p>
          <p>Account No: ${invoiceData.bankDetails.accountNumber}</p>
          <p>RTGS/NEFT IFSC: ${invoiceData.bankDetails.ifscCode}</p>
        </div>
        
        <div class="totals-table">
          <table>
            <tr>
              <td class="total-label">Sub Total</td>
              <td class="total-value">${formatCurrency(invoiceData.subtotal)}</td>
            </tr>
            <tr>
              <td class="total-label">IGST18 (18%)</td>
              <td class="total-value">${formatCurrency(invoiceData.totalTax)}</td>
            </tr>
            <tr class="total-row">
              <td class="total-label"><strong>Total</strong></td>
              <td class="total-value"><strong>₹${formatCurrency(invoiceData.total)}</strong></td>
            </tr>
            <tr>
              <td class="total-label">Payment Made</td>
              <td class="total-value">(-) ${formatCurrency(invoiceData.paymentMade)}</td>
            </tr>
            <tr class="balance-row">
              <td class="total-label"><strong>Balance Due</strong></td>
              <td class="total-value"><strong>₹${formatCurrency(invoiceData.balanceDue)}</strong></td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-left">
          <p>Dr. Rajat Dandekar</p>
        </div>
        <div class="signature-right">
          <p>Authorized Signature</p>
        </div>
      </div>
      <!-- Policy Links Section -->
      <div class="policy-links">
          <p>
              <a href="https://vizuara.ai/terms" target="_blank">Payment Terms and Conditions</a> | 
              <a href="https://vizuara.ai/privacy" target="_blank">Privacy Policy</a> | 
              <a href="https://vizuara.ai/refund-policy" target="_blank">Refund Policy</a>
          </p>
          <p>For more information, visit: <a href="https://vizuara.ai" target="_blank">https://vizuara.ai</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
