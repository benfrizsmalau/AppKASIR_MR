"use client";

import { useState } from "react";
import { Search, History, Calendar, FileText, ChevronRight, Ban, CheckCircle } from "lucide-react";

export default function HistoryClient({ initialRecords }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredRecords = initialRecords?.filter(rec =>
        rec.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col p-8 font-sans">
            <div className="max-w-6xl w-full mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            <History className="w-8 h-8 text-primary-600" />
                            Riwayat Transaksi
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Pantau seluruh order yang terjadi hari ini.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari No. Order..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm w-64 transition-all"
                            />
                        </div>
                        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all active:scale-95">
                            <Calendar className="w-5 h-5" /> Hari Ini
                        </button>
                    </div>
                </div>

                {/* Cards Table Layout */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Table Headers */}
                    <div className="bg-gray-50 grid grid-cols-7 px-6 py-4 border-b border-gray-100 text-sm font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-2">ID & Pelanggan</div>
                        <div>Tipe</div>
                        <div>Pembayaran</div>
                        <div>Kasir</div>
                        <div>Status</div>
                        <div className="text-right">Total</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-50">
                        {!filteredRecords || filteredRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <FileText className="w-16 h-16 opacity-30 mb-4" />
                                <p className="text-lg font-medium">Belum ada transaksi hari ini.</p>
                            </div>
                        ) : (
                            filteredRecords.map((rec) => (
                                <div key={rec.id} className="grid grid-cols-7 items-center px-6 py-5 hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                    <div className="col-span-2 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${rec.status === 'Selesai' ? 'bg-green-100 text-green-600' : rec.status === 'Batal' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'}`}>
                                            {rec.status === 'Selesai' ? <CheckCircle className="w-6 h-6" /> : rec.status === 'Batal' ? <Ban className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">{rec.order_number}</p>
                                            <p className="text-xs font-bold text-primary-600 mt-1">{rec.customer_name || 'Walk-In'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {new Date(rec.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-100 text-gray-700 uppercase">
                                            {rec.order_type}
                                        </span>
                                    </div>

                                    <div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${rec.is_credit ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {rec.payments?.[0]?.payment_method || (rec.is_credit ? 'HUTANG' : 'TUNAI')}
                                        </span>
                                    </div>

                                    <div className="text-sm font-bold text-gray-600 truncate">
                                        {rec.staff_users?.full_name || '-'}
                                    </div>

                                    <div>
                                        {rec.status === 'Selesai' ? (
                                            rec.is_credit ? (
                                                (rec.payments?.length > 0 && rec.payments.every(p => p.status === 'Lunas'))
                                                    ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Lunas</span>
                                                    : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">Menunggu</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Lunas</span>
                                            )
                                        ) : rec.status === 'Berjalan' ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Di-Hold</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Batal</span>
                                        )}
                                    </div>

                                    <div className="text-right flex items-center justify-end gap-3">
                                        <span className="font-black text-primary-950">Rp {Number(rec.grand_total).toLocaleString('id-ID')}</span>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
