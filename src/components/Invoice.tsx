import { useRef, useEffect } from 'react';
import { Address, InvoiceData } from "../types/invoice";
import { Button } from './ui/button';
import { amountToWords } from '@/utils/currency';

interface InvoiceComponentProps {
  invoiceData: InvoiceData;
}

export function InvoiceComponent({ invoiceData }: InvoiceComponentProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currency: currency,
    }).format(amount);
  };

  const formatAddress = (address: Address | null): string[] => {
    const lines: string[] = [];
    if (!address) return lines;
    if (address.line1) lines.push(address.line1 || "");
    if (address.city) lines.push(address.city);
    if (address.state) lines.push(address.state);
    if (address.postalCode) lines.push(address.postalCode);
    if (address.country) lines.push(address.country);
    return lines;
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle Ctrl+P keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const billToAddressLines = formatAddress(invoiceData.billTo?.address);
  const shipToAddressLines = formatAddress(invoiceData.shipTo?.address);

  // Determine GST type based on supplier state and place of supply
  const supplierState = "Maharashtra"; // Fixed as per your company details
  const placeOfSupply = invoiceData.billTo?.address?.state;
  const isSameState = supplierState === placeOfSupply;

  // Calculate GST amounts
  const calculateGSTBreakdown = () => {
    if (isSameState) {
      // SGST and CGST - each half of total tax
      const sgstCgstAmount = invoiceData.totalTax / 2;
      return {
        type: 'SGST_CGST' as const,
        sgstAmount: sgstCgstAmount,
        cgstAmount: sgstCgstAmount,
        igstAmount: 0
      };
    } else {
      // IGST
      return {
        type: 'IGST' as const,
        sgstAmount: 0,
        cgstAmount: 0,
        igstAmount: invoiceData.totalTax
      };
    }
  };

  const gstBreakdown = calculateGSTBreakdown();

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:bg-white print:p-0 max-w-4xl mx-auto">
      {/* Print Button */}
      <div className="no-print mb-6 flex justify-end print:hidden">
        <Button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow hover:shadow-md transition-all duration-200"
        >
          🖨️ Print Invoice (Ctrl+P)
        </Button>
      </div>

      {/* Invoice Content */}
      <div ref={invoiceRef}>
        <div className="mx-auto print:max-w-none border border-gray-300">
          <div className="bg-white p-6 print:p-0">
            {/* Header Section */}
            <table className="w-full border border-gray-300 pb-4">
              <tbody>
                <tr className="align-top">
                  <td className="align-top w-auto">
                    <div className="flex items-start space-x-4 print:flex print:items-start print:space-x-4">
                      <div className="logo print:block">
                        <img
                          src="/logo.png"
                          alt="Company Logo"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                      <div className="company-details print:block">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-2 print:text-lg print:font-bold print:mb-2">
                          VIZUARA TECHNOLOGIES PRIVATE LIMITED
                        </h1>
                        <div className="address text-xs md:text-sm text-gray-600 space-y-0.5 print:text-xs print:space-y-0.5">
                          <p className="print:mb-0">759/107/3 FLAT NO 201</p>
                          <p className="print:mb-0">SARASWATI 2ND FLOOR Prabhat Road</p>
                          <p className="print:mb-0">Pune Maharashtra 411004</p>
                          <p className="print:mb-0">India</p>
                          <p className="font-semibold print:font-semibold">GSTIN 27AAJCV1928J1ZY</p>
                          <p>7994206324</p>
                          <p>sreedath@vizuara.com</p>
                          <p>www.vizuara.ai</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="align-top text-right w-48 print:w-48">
                    <div className="invoice-title print:block">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900 print:text-xl print:font-bold">
                        TAX INVOICE
                      </h2>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Invoice Details Section */}
            <div className="">
              <table className="w-full text-sm print:text-sm">
                <tr>
                  <td className='border p-2'>
                    <table>
                      <tr>
                        <td>#</td>
                        <td>: {invoiceData.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td>Invoice Date</td>
                        <td>: {invoiceData.invoiceDate}</td>
                      </tr>
                      <tr>
                        <td>Terms</td>
                        <td>: {invoiceData.terms}</td>
                      </tr>
                      <tr>
                        <td>Due Date</td>
                        <td>: {invoiceData.dueDate}</td>
                      </tr>
                    </table>
                  </td>
                  <td className='border p-2'>
                    <table>
                      <tr>
                        <td>Place Of Supply</td>
                        <td>: {invoiceData.billTo?.address?.state}</td>
                      </tr>
                      {/* <tr>
                        <td>GST Type</td>
                        <td>: {isSameState ? 'SGST + CGST' : 'IGST'}</td>
                      </tr> */}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td className='border bg-gray-200 p-2'>Bill To</td>
                  <td className='border bg-gray-200 p-2'>Ship To</td>
                </tr>
                <tr className=''>
                  <td className='border p-2'>
                    <p>{invoiceData.billTo?.name}</p>
                    {billToAddressLines.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </td>
                  <td className='border p-2'>
                    <p>{invoiceData.shipTo?.name}</p>
                    {shipToAddressLines.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </td>
                </tr>
              </table>
            </div>

            {/* Items Table */}
            <div className="items-section mb-4 print:mb-4">
              <table className="items-table w-full border border-gray-300 text-xs print:border print:text-xs">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th rowSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">#</th>
                    <th rowSpan={2} className="border border-gray-300 p-1 text-left font-semibold print:border print:p-1 print:font-semibold">Item & Description</th>
                    <th rowSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">HSN/SAC</th>
                    <th rowSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">Qty</th>
                    <th rowSpan={2} className="border border-gray-300 p-1 text-right font-semibold print:border print:p-1 print:font-semibold">Rate</th>

                    {/* Dynamic GST Header based on state */}
                    {isSameState ? (
                      <>
                        <th colSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">
                          SGST
                        </th>
                        <th colSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">
                          CGST
                        </th>
                      </>
                    ) : (
                      <th colSpan={2} className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">
                        IGST
                      </th>
                    )}

                    <th rowSpan={2} className="border border-gray-300 p-1 text-right font-semibold print:border print:p-1 print:font-semibold">Amount</th>
                  </tr>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    {/* Dynamic GST Sub-headers */}
                    {isSameState ? (
                      <>
                        <th className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">%</th>
                        <th className="border border-gray-300 p-1 text-right font-semibold print:border print:p-1 print:font-semibold">Amt</th>
                        <th className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">%</th>
                        <th className="border border-gray-300 p-1 text-right font-semibold print:border print:p-1 print:font-semibold">Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-gray-300 p-1 text-center font-semibold print:border print:p-1 print:font-semibold">%</th>
                        <th className="border border-gray-300 p-1 text-right font-semibold print:border print:p-1 print:font-semibold">Amt</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {invoiceData.items.map((item, index) => {
                    const itemGstPercentage = item.gstPercentage;
                    const itemGstAmount = item.gstAmount;

                    // Calculate SGST and CGST amounts (each half of total GST for same state)
                    const itemSgstCgstAmount = itemGstAmount / 2;
                    const itemSgstCgstPercentage = itemGstPercentage / 2;

                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 p-1 text-center print:border print:p-1">{index + 1}</td>
                        <td className="border border-gray-300 p-1 print:border print:p-1">{item.description}</td>
                        <td className="border border-gray-300 p-1 text-center print:border print:p-1">{item.hsnSac}</td>
                        <td className="border border-gray-300 p-1 text-center print:border print:p-1">{item.quantity.toFixed(2)}</td>
                        <td className="border border-gray-300 p-1 text-right print:border print:p-1">{formatCurrency(item.rate, invoiceData.currency)}</td>

                        {/* Dynamic GST columns */}
                        {isSameState ? (
                          <>
                            {/* SGST Columns */}
                            <td className="border border-gray-300 p-1 text-center print:border print:p-1">{itemSgstCgstPercentage.toFixed(2)}%</td>
                            <td className="border border-gray-300 p-1 text-right print:border print:p-1">{formatCurrency(itemSgstCgstAmount, invoiceData.currency)}</td>
                            {/* CGST Columns */}
                            <td className="border border-gray-300 p-1 text-center print:border print:p-1">{itemSgstCgstPercentage.toFixed(2)}%</td>
                            <td className="border border-gray-300 p-1 text-right print:border print:p-1">{formatCurrency(itemSgstCgstAmount, invoiceData.currency)}</td>
                          </>
                        ) : (
                          <>
                            {/* IGST Columns */}
                            <td className="border border-gray-300 p-1 text-center print:border print:p-1">{itemGstPercentage}%</td>
                            <td className="border border-gray-300 p-1 text-right print:border print:p-1">{formatCurrency(itemGstAmount, invoiceData.currency)}</td>
                          </>
                        )}

                        <td className="border border-gray-300 p-1 text-right print:border print:p-1">{formatCurrency(item.amount, invoiceData.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="totals-section flex flex-col md:flex-row mb-4 print:flex print:flex-row print:mb-4">
              <div className="notes-section flex-1 mb-4 md:mb-0 md:pr-4 print:flex-1 print:pr-4">
                <h4 className="font-semibold text-gray-900 mb-1 text-sm print:font-semibold print:mb-1 print:text-sm">Total In Words</h4>
                <p className="text-xs text-gray-700 italic mb-2 print:text-xs print:italic print:mb-2">
                  <em>{amountToWords(invoiceData.total, invoiceData.currency)}</em>
                </p>
                {invoiceData.note && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm print:font-semibold print:mb-1 print:text-sm">Notes</h4>
                    <div className="text-xs text-gray-700 space-y-0.5 print:text-xs print:space-y-0.5">
                      <pre>{invoiceData.note}</pre>
                    </div>
                  </>
                )}
              </div>

              <div className="totals-table print:block">
                <table className="w-full text-sm print:text-sm">
                  <tbody>
                    <tr>
                      <td className="total-label text-right font-semibold text-gray-700 py-1 pr-2 print:font-semibold print:py-1 print:pr-2">Sub Total</td>
                      <td className="total-value text-right text-gray-900 py-1 pl-2 print:py-1 print:pl-2">{formatCurrency(invoiceData.subtotal, invoiceData.currency)}</td>
                    </tr>

                    {/* Dynamic GST rows based on state */}
                    {isSameState ? (
                      <>
                        <tr>
                          <td className="total-label text-right font-semibold text-gray-700 py-1 pr-2 print:font-semibold print:py-1 print:pr-2">SGST</td>
                          <td className="total-value text-right text-gray-900 py-1 pl-2 print:py-1 print:pl-2">{formatCurrency(gstBreakdown.sgstAmount, invoiceData.currency)}</td>
                        </tr>
                        <tr>
                          <td className="total-label text-right font-semibold text-gray-700 py-1 pr-2 print:font-semibold print:py-1 print:pr-2">CGST</td>
                          <td className="total-value text-right text-gray-900 py-1 pl-2 print:py-1 print:pl-2">{formatCurrency(gstBreakdown.cgstAmount, invoiceData.currency)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="total-label text-right font-semibold text-gray-700 py-1 pr-2 print:font-semibold print:py-1 print:pr-2">IGST</td>
                        <td className="total-value text-right text-gray-900 py-1 pl-2 print:py-1 print:pl-2">{formatCurrency(gstBreakdown.igstAmount, invoiceData.currency)}</td>
                      </tr>
                    )}

                    <tr className="total-row border-t border-gray-400 print:border-t">
                      <td className="total-label text-right font-bold text-gray-900 py-1 pr-2 print:font-bold print:py-1 print:pr-2"><strong>Total</strong></td>
                      <td className="total-value text-right font-bold text-gray-900 py-1 pl-2 print:font-bold print:py-1 print:pl-2"><strong>{formatCurrency(invoiceData.total, invoiceData.currency)}</strong></td>
                    </tr>
                    <tr>
                      <td className="total-label text-right font-semibold text-gray-700 py-1 pr-2 print:font-semibold print:py-1 print:pr-2">Payment Made</td>
                      <td className="total-value text-right text-gray-900 py-1 pl-2 print:py-1 print:pl-2">(-) {formatCurrency(invoiceData.paymentMade, invoiceData.currency)}</td>
                    </tr>
                    <tr className="balance-row border-t border-gray-400 print:border-t">
                      <td className="total-label text-right font-bold text-gray-900 py-1 pr-2 print:font-bold print:py-1 print:pr-2"><strong>Balance Due</strong></td>
                      <td className="total-value text-right font-bold text-gray-900 py-1 pl-2 print:font-bold print:py-1 print:pl-2"><strong>{formatCurrency(invoiceData.balanceDue, invoiceData.currency)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Section */}
            {/* <div className="signature-section flex justify-between items-end border-t border-gray-300 pt-4 mt-24 print:flex print:justify-between print:border-t print:pt-4 print:mt-24 ">
              <div className="signature-left print:block">
                <p className="text-sm text-gray-700 print:text-sm">Dr. Rajat Dandekar</p>
              </div>
              <div className="signature-right print:block">
                <p className="text-sm text-gray-700 print:text-sm">Authorized Signature</p>
              </div>
            </div> */}

            {/* Policy Links Section */}
            <div className="policy-links border-t border-gray-300 pt-4 mt-36 text-center print:border-t print:pt-4 print:mt-36">
              <p className="text-xs text-gray-600 mb-1 print:text-xs print:mb-1">
                <a href="https://vizuara.ai/terms" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 print:text-black">Payment Terms and Conditions</a> |
                <a href="https://vizuara.ai/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 print:text-black"> Privacy Policy</a> |
                <a href="https://vizuara.ai/refund-policy" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 print:text-black"> Refund Policy</a>
              </p>
              <p className="text-xs text-gray-600 print:text-xs">
                For more information, visit: <a href="https://vizuara.ai" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 print:text-black">https://vizuara.ai</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          a {
            color: black !important;
            text-decoration: underline;
          }
        }
      `}</style>
    </div>
  );
}
