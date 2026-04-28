"use client";

import React from 'react';

/**
 * ReceiptPrintout Component
 * Handles the visual template for printing receipts and KOTs.
 * Uses CSS @media print to show only this component during window.print().
 */
export default function ReceiptPrintout({ data }) {
    if (!data) return null;

    const {
        type = 'Receipt', // 'Receipt' or 'KOT'
        outlet,
        orderNumber,
        receiptNumber,
        items,
        subtotal = 0,
        taxAmount = 0,
        grandTotal = 0,
        paymentMethod,
        cashTendered = 0,
        changeAmount = 0,
        customer,
        cashier,
        notes,
        tableNumber
    } = data;

    const isKOT = type === 'KOT';

    return (
        <div id="receipt-printout" className="receipt-container">
            <style dangerouslySetInnerHTML={{
                __html: `
                #receipt-printout { display: none; }
                @media print {
                    @page { margin: 0; size: auto; }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 100% !important;
                        overflow: visible !important;
                    }
                    body * { visibility: hidden !important; }
                    #receipt-printout, #receipt-printout * { visibility: visible !important; }
                    #receipt-printout {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 4mm;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 10pt;
                        z-index: 99999;
                    }
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-b-dashed { border-bottom: 2px dashed #000; margin: 4px 0; }
                .flex-row { display: flex; justify-content: space-between; }
                .receipt-title { font-size: 14pt; margin-bottom: 4px; }
            ` }} />

            {/* Header */}
            <div className="text-center">
                {isKOT ? (
                    <h2 className="receipt-title font-bold">KITCHEN ORDER (KOT)</h2>
                ) : (
                    <>
                        <h2 className="receipt-title font-bold">{outlet?.name || 'OUTLET NAME'}</h2>
                        <div style={{ fontSize: '9pt', lineHeight: '1.2' }}>
                            <p>{outlet?.address || '-'}</p>
                            {outlet?.village && outlet?.district && (
                                <p>{outlet.village}, {outlet.district}</p>
                            )}
                            {outlet?.regency && outlet?.province && (
                                <p>{outlet.regency}, {outlet.province}</p>
                            )}
                            {outlet?.postalCode && <p>KODE POS: {outlet.postalCode}</p>}
                            <p>T: {outlet?.phone || '-'}</p>
                            {outlet?.npwpd && <p>NPWPD: {outlet.npwpd}</p>}
                        </div>
                    </>
                )}
            </div>

            <div className="border-b-dashed" />

            {/* Transaction Info */}
            <div className="flex-row">
                <span>Waktu:</span>
                <span>{new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            {!isKOT && (
                <div className="flex-row">
                    <span>No. Struk:</span>
                    <span>{receiptNumber || '-'}</span>
                </div>
            )}
            <div className="flex-row">
                <span>No. Pesanan:</span>
                <span>{orderNumber || '-'}</span>
            </div>
            <div className="flex-row">
                <span>Kasir:</span>
                <span>{cashier || 'System'}</span>
            </div>
            {customer && (
                <div className="flex-row">
                    <span>Pelanggan:</span>
                    <span>{customer}</span>
                </div>
            )}
            {tableNumber && (
                <div className="flex-row font-bold">
                    <span>MEJA:</span>
                    <span>{tableNumber}</span>
                </div>
            )}

            <div className="border-b-dashed" />

            {/* Items Table Header */}
            <div className="flex-row font-bold">
                <span style={{ width: '60%' }}>Item</span>
                <span style={{ width: '10%' }}>Qty</span>
                {!isKOT && <span style={{ width: '30%' }} className="text-right">Total</span>}
            </div>

            <div className="border-b-dashed" />

            {/* Items List */}
            {items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                    <div className="flex-row">
                        <span style={{ width: '60%' }}>{item.name}</span>
                        <span style={{ width: '10%' }}>{item.qty}</span>
                        {!isKOT && (
                            <span style={{ width: '30%' }} className="text-right">
                                {(item.price * item.qty).toLocaleString('id-ID')}
                            </span>
                        )}
                    </div>
                    {item.notes && (
                        <div style={{ fontSize: '9pt', fontStyle: 'italic', marginLeft: '4px' }}>
                            * {item.notes}
                        </div>
                    )}
                </div>
            ))}

            <div className="border-b-dashed" />

            {/* Summary */}
            {!isKOT && (
                <div className="space-y-1">
                    <div className="flex-row">
                        <span>Subtotal:</span>
                        <span>{subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex-row">
                            <span>Pajak (PBJT 10%):</span>
                            <span>{taxAmount.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex-row font-bold" style={{ fontSize: '12pt' }}>
                        <span>GRAND TOTAL:</span>
                        <span>{grandTotal.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="border-b-dashed" style={{ margin: '8px 0' }} />

                    <div className="flex-row">
                        <span>Metode Bayar:</span>
                        <span>{paymentMethod}</span>
                    </div>
                    {paymentMethod === 'Tunai' && (
                        <>
                            <div className="flex-row">
                                <span>Bayar:</span>
                                <span>{cashTendered.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex-row">
                                <span>Kembali:</span>
                                <span>{changeAmount.toLocaleString('id-ID')}</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {isKOT && notes && (
                <div style={{ marginTop: '10px' }}>
                    <div className="font-bold">CATATAN PESANAN:</div>
                    <div style={{ border: '1px solid #000', padding: '4px' }}>{notes}</div>
                </div>
            )}

            <div className="border-b-dashed" style={{ marginTop: '10px' }} />

            {/* Footer */}
            <div className="text-center" style={{ marginTop: '10px' }}>
                {isKOT ? (
                    <p className="font-bold">--- SEGERA DIPROSES ---</p>
                ) : (
                    <>
                        <p>Terima Kasih Atas Kunjungan Anda</p>
                        <p>Powered by AppKasir POS</p>
                    </>
                )}
            </div>
        </div>
    );
}
