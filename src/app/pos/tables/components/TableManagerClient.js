"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Layout,
    Plus,
    Save,
    Trash2,
    Maximize,
    Grid3X3,
    Users,
    Move,
    X,
    Check,
    Loader2
} from "lucide-react";
import { saveTable, updateTablePositions, deleteTable } from "../actions";

export default function TableManagerClient({ initialTables }) {
    const router = useRouter();
    const [tables, setTables] = useState(initialTables);
    const [viewMode, setViewMode] = useState("Visual"); // "Visual" or "List"
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasUnsavedPositions, setHasUnsavedPositions] = useState(false);

    const containerRef = useRef(null);

    // Filter by Area
    const areas = ["Utama", "Lantai 2", "VVIP", "Outdoor"];
    const [activeArea, setActiveArea] = useState("Utama");

    // Sync state when initialTables changes (from server refresh)
    useEffect(() => {
        setTables(initialTables);
    }, [initialTables]);

    const handleOpenModal = (table = null) => {
        setEditingTable(table ? { ...table } : {
            table_number: "",
            area_name: activeArea,
            capacity: 2,
            status: "Kosong",
            pos_x: 100,
            pos_y: 100
        });
        setIsTableModalOpen(true);
    };

    const onSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await saveTable(editingTable);
        if (res.success) {
            setIsTableModalOpen(false);
            router.refresh(); // Sync data
            setIsLoading(false);
        } else {
            alert(res.message);
            setIsLoading(false);
        }
    };

    const onDelete = async (id) => {
        if (!confirm("Hapus meja ini?")) return;
        setIsLoading(true);
        const res = await deleteTable(id);
        if (res.success) {
            router.refresh();
            setIsLoading(false);
        } else {
            alert("Gagal menghapus meja.");
            setIsLoading(false);
        }
    };

    const handleDragStart = (e, id) => {
        const table = tables.find(t => t.id === id);
        if (!table) return;

        const rect = containerRef.current.getBoundingClientRect();

        const onMouseMove = (moveEvent) => {
            const x = moveEvent.clientX - rect.left - 40; // 40 is half width of table
            const y = moveEvent.clientY - rect.top - 40;

            setTables(prev => prev.map(t =>
                t.id === id ? { ...t, pos_x: Math.max(0, x), pos_y: Math.max(0, y) } : t
            ));
            setHasUnsavedPositions(true);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const savePositions = async () => {
        setIsLoading(true);
        const positions = tables.map(t => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y }));
        const res = await updateTablePositions(positions);
        if (res.success) {
            setHasUnsavedPositions(false);
            setIsLoading(false);
            router.refresh();
        } else {
            alert("Gagal simpan posisi.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <header className="bg-white px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm relative z-10">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-2">
                        <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
                            <Layout className="w-6 h-6 text-accent-500" />
                        </div>
                        Manajemen Meja
                    </h1>
                    <div className="flex gap-4 mt-2">
                        <button
                            onClick={() => setViewMode("Visual")}
                            className={`text-xs font-black uppercase tracking-widest pb-1 transition-all ${viewMode === 'Visual' ? 'text-primary-900 border-b-2 border-primary-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Visual Plan
                        </button>
                        <button
                            onClick={() => setViewMode("List")}
                            className={`text-xs font-black uppercase tracking-widest pb-1 transition-all ${viewMode === 'List' ? 'text-primary-900 border-b-2 border-primary-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Daftar Tabel
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === "Visual" && hasUnsavedPositions && (
                        <button
                            onClick={savePositions}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Simpan Posisi
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary-900 text-accent-400 hover:bg-primary-800 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Tambah Meja
                    </button>
                </div>
            </header>

            {/* Area Filter */}
            <div className="bg-white px-8 py-3 border-b flex items-center gap-4 overflow-x-auto shrink-0 no-scrollbar">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Area:</span>
                <div className="flex gap-2">
                    {areas.map(area => (
                        <button
                            key={area}
                            onClick={() => setActiveArea(area)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeArea === area ? 'bg-primary-900 text-accent-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {area}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 relative overflow-hidden p-8">
                {viewMode === "Visual" ? (
                    <div
                        ref={containerRef}
                        className="w-full h-full bg-white rounded-[40px] border-4 border-dashed border-slate-200 relative overflow-auto shadow-inner"
                        style={{ minHeight: '600px', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    >
                        {tables.filter(t => t.area_name === activeArea).map(table => (
                            <div
                                key={table.id}
                                onMouseDown={(e) => handleDragStart(e, table.id)}
                                style={{ left: `${table.pos_x}px`, top: `${table.pos_y}px` }}
                                className={`absolute w-24 h-24 rounded-2xl flex flex-col items-center justify-center cursor-move select-none shadow-xl border-2 transition-all active:scale-95 group hover:z-20 ${table.status === 'Kosong' ? 'bg-white border-primary-50 text-primary-900 hover:border-accent-400' :
                                        table.status === 'Terisi' ? 'bg-primary-900 border-primary-800 text-white' :
                                            'bg-orange-500 border-orange-600 text-white'
                                    }`}
                            >
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-xs font-black text-primary-900 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-50"
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(table); }}>
                                    <Maximize className="w-4 h-4 text-primary-600" />
                                </div>
                                <span className="text-2xl font-black">#{table.table_number}</span>
                                <div className="flex items-center gap-1 mt-1">
                                    <Users className="w-3 h-3 opacity-60" />
                                    <span className="text-[10px] font-bold">{table.capacity} Org</span>
                                </div>
                                {table.status === 'Terisi' && <div className="w-2 h-2 rounded-full bg-green-400 absolute bottom-3 right-3 animate-pulse" />}
                            </div>
                        ))}

                        {tables.filter(t => t.area_name === activeArea).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Grid3X3 className="w-12 h-12 opacity-20" />
                                </div>
                                <p className="font-bold text-slate-400">Belum ada meja di area {activeArea}</p>
                                <p className="text-xs text-slate-400 mt-1">Klik 'Tambah Meja' untuk memulai tata letak</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Meja</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Area</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kapasitas</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {tables.map(table => (
                                        <tr key={table.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center font-black text-primary-900 border border-primary-100">
                                                        {table.table_number}
                                                    </div>
                                                    <span className="font-bold text-primary-900">Meja {table.table_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-tight">{table.area_name}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-gray-600 font-bold">
                                                    <Users className="w-4 h-4 opacity-40" /> {table.capacity} Orang
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${table.status === 'Kosong' ? 'bg-green-100 text-green-700' :
                                                        table.status === 'Terisi' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {table.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenModal(table)} className="p-2 hover:bg-primary-50 rounded-xl text-primary-600 transition-colors">
                                                        <Maximize className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => onDelete(table.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL EDIT/TAMBAH MEJA */}
            {isTableModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-200 relative">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-primary-900 leading-tight">
                                    {editingTable?.id ? 'Edit Meja' : 'Meja Baru'}
                                </h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Informasi Detail Meja</p>
                            </div>
                            <button onClick={() => setIsTableModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={onSave} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nomor Meja *</label>
                                <input required type="text" value={editingTable.table_number} onChange={e => setEditingTable({ ...editingTable, table_number: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus:border-accent-400 focus:bg-white outline-none font-bold text-xl transition-all" placeholder="01" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Kapasitas</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input required type="number" value={editingTable.capacity} onChange={e => setEditingTable({ ...editingTable, capacity: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 pl-12 border-2 border-transparent focus:border-accent-400 focus:bg-white outline-none font-bold transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Area</label>
                                    <select value={editingTable.area_name} onChange={e => setEditingTable({ ...editingTable, area_name: e.target.value })} className="w-full bg-gray-50 rounded-2xl p-4 border-2 border-transparent focus:border-accent-400 focus:bg-white outline-none font-bold appearance-none transition-all">
                                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status Meja</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Kosong', 'Tidak Aktif'].map(s => (
                                        <button key={s} type="button" onClick={() => setEditingTable({ ...editingTable, status: s })}
                                            className={`py-3 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${editingTable.status === s ? 'border-primary-900 bg-primary-900 text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" disabled={isLoading} className="flex-1 bg-primary-900 text-accent-400 py-4 rounded-2xl font-black shadow-xl shadow-primary-200 flex items-center justify-center gap-2 hover:bg-primary-800 transition-all active:scale-95 disabled:opacity-50">
                                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" /> Simpan Meja</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
