"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Package, Plus, Trash2, Edit, X, Check, Loader2,
    AlertTriangle, ArrowUpDown, BookOpen, TrendingDown, TrendingUp
} from "lucide-react";
import { saveIngredient, deleteIngredient, adjustStock, saveRecipe, deleteRecipe } from "../actions";

const UNITS = ['gram', 'kg', 'ml', 'liter', 'pcs', 'buah', 'lembar', 'botol', 'dus', 'porsi'];

// ─── Modal Tambah/Edit Bahan Baku ─────────────────────────────────────────────
function IngredientModal({ ingredient, onClose, onSaved }) {
    const [form, setForm] = useState(ingredient || { name: '', unit: 'gram', current_stock: 0, min_stock: 0, cost_per_unit: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr('Nama bahan wajib diisi.'); return; }
        setIsLoading(true);
        const res = await saveIngredient(form);
        setIsLoading(false);
        if (res.success) onSaved();
        else setErr(res.message);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="font-black text-primary-900">{form.id ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {err && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl">{err}</p>}

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Bahan *</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" placeholder="Contoh: Tepung Terigu" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Satuan</label>
                            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none appearance-none">
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Harga/Satuan (Rp)</label>
                            <input type="number" min="0" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Stok Awal</label>
                            <input type="number" min="0" step="0.01" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Stok Minimum ⚠️</label>
                            <input type="number" min="0" step="0.01" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary-900 text-accent-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-800 disabled:opacity-50">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal Sesuaikan Stok ─────────────────────────────────────────────────────
function AdjustStockModal({ ingredient, onClose, onSaved }) {
    const [adjustment, setAdjustment] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!adjustment || isNaN(Number(adjustment))) return;
        setIsLoading(true);
        await adjustStock(ingredient.id, Number(adjustment), notes);
        setIsLoading(false);
        onSaved();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="font-black text-primary-900">Sesuaikan Stok</h2>
                        <p className="text-xs text-gray-400">{ingredient.name} — Stok: {ingredient.current_stock} {ingredient.unit}</p>
                    </div>
                    <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Penyesuaian (+ masuk / - keluar)</label>
                        <input type="number" value={adjustment} onChange={e => setAdjustment(e.target.value)} step="0.01"
                            placeholder="Contoh: +50 atau -10"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black outline-none focus:ring-2 focus:ring-primary-500 text-center" />
                        {adjustment && (
                            <p className="text-center text-sm font-bold mt-2">
                                Stok baru: <span className="text-primary-700">{Math.max(0, Number(ingredient.current_stock) + Number(adjustment)).toFixed(2)} {ingredient.unit}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Catatan</label>
                        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Penerimaan barang, penyesuaian, dll."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600">Batal</button>
                        <button onClick={handleSave} disabled={isLoading || !adjustment}
                            className="flex-1 py-3 bg-primary-900 text-accent-400 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Tambah Resep ───────────────────────────────────────────────────────
function RecipeModal({ recipe, menuItems, ingredients, onClose, onSaved }) {
    const [form, setForm] = useState(recipe || { menu_item_id: menuItems[0]?.id || '', ingredient_id: ingredients[0]?.id || '', quantity_used: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.menu_item_id || !form.ingredient_id || !form.quantity_used) { setErr('Semua field wajib diisi.'); return; }
        setIsLoading(true);
        const res = await saveRecipe(form);
        setIsLoading(false);
        if (res.success) onSaved();
        else setErr(res.message);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="font-black text-primary-900">Tambah Resep Menu</h2>
                    <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {err && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl">{err}</p>}

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Menu Item</label>
                        <select value={form.menu_item_id} onChange={e => setForm({ ...form, menu_item_id: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none appearance-none">
                            {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bahan Baku</label>
                        <select value={form.ingredient_id} onChange={e => setForm({ ...form, ingredient_id: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none appearance-none">
                            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                            Jumlah Digunakan ({ingredients.find(i => i.id === form.ingredient_id)?.unit || '-'} per porsi)
                        </label>
                        <input type="number" min="0" step="0.001" value={form.quantity_used} onChange={e => setForm({ ...form, quantity_used: e.target.value })}
                            placeholder="Contoh: 150"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600">Batal</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary-900 text-accent-400 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Simpan Resep
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InventoryClient({ initialIngredients, initialRecipes, menuItems }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('bahan');
    const [ingredients, setIngredients] = useState(initialIngredients);
    const [recipes, setRecipes] = useState(initialRecipes);
    const [ingredientModal, setIngredientModal] = useState(null); // null | {} | existing
    const [adjustModal, setAdjustModal] = useState(null);
    const [recipeModal, setRecipeModal] = useState(null);

    const lowStockItems = ingredients.filter(i => Number(i.current_stock) <= Number(i.min_stock) && Number(i.min_stock) > 0);

    const handleRefresh = () => router.refresh();

    const handleDeleteIngredient = async (id) => {
        if (!confirm('Hapus bahan baku ini? Resep yang terkait juga akan terpengaruh.')) return;
        const res = await deleteIngredient(id);
        if (res.success) handleRefresh();
        else alert(res.message);
    };

    const handleDeleteRecipe = async (id) => {
        if (!confirm('Hapus resep ini?')) return;
        const res = await deleteRecipe(id);
        if (res.success) handleRefresh();
        else alert(res.message);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="bg-white px-8 py-6 border-b shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary-900 flex items-center gap-2">
                        <Package className="w-7 h-7 text-accent-500" />
                        Manajemen Inventaris
                    </h1>
                    <div className="flex gap-4 mt-2">
                        {[['bahan', 'Bahan Baku'], ['resep', 'Resep Menu']].map(([key, label]) => (
                            <button key={key} onClick={() => setActiveTab(key)}
                                className={`text-sm font-bold transition-colors ${activeTab === key ? 'text-primary-900 border-b-2 border-primary-900 pb-1' : 'text-gray-400 hover:text-gray-600'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => activeTab === 'bahan' ? setIngredientModal({}) : setRecipeModal({})}
                    className="bg-primary-900 text-accent-400 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-800 transition-all active:scale-95 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    {activeTab === 'bahan' ? 'Tambah Bahan' : 'Tambah Resep'}
                </button>
            </header>

            {/* Low Stock Alert Banner */}
            {lowStockItems.length > 0 && (
                <div className="px-8 py-3 bg-red-50 border-b border-red-100 flex items-center gap-3 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-bold text-red-700">
                        ⚠️ Stok kritis: {lowStockItems.map(i => `${i.name} (${i.current_stock} ${i.unit})`).join(', ')}
                    </p>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-8">
                {/* ─── Tab Bahan Baku ─── */}
                {activeTab === 'bahan' && (
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Bahan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Satuan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Stok Saat Ini</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Stok Min.</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Harga/Satuan</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ingredients.map(ing => {
                                    const isLow = Number(ing.min_stock) > 0 && Number(ing.current_stock) <= Number(ing.min_stock);
                                    const stockPct = Number(ing.min_stock) > 0 ? Math.min(100, (Number(ing.current_stock) / Number(ing.min_stock)) * 100) : 100;
                                    return (
                                        <tr key={ing.id} className={`hover:bg-gray-50 transition-colors group ${isLow ? 'bg-red-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {isLow && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                                    <span className="font-bold text-primary-900">{ing.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-500">{ing.unit}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-black text-lg ${isLow ? 'text-red-600' : 'text-primary-900'}`}>
                                                    {Number(ing.current_stock).toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-400">{Number(ing.min_stock).toLocaleString('id-ID')}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-600">
                                                {ing.cost_per_unit ? `Rp ${Number(ing.cost_per_unit).toLocaleString('id-ID')}` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${isLow ? 'bg-red-500' : stockPct < 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                                            style={{ width: `${stockPct}%` }} />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                                                        {isLow ? 'KRITIS' : 'OK'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setAdjustModal(ing)}
                                                        className="p-2 hover:bg-blue-50 rounded-xl text-blue-500 transition-colors" title="Sesuaikan stok">
                                                        <ArrowUpDown className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setIngredientModal({ ...ing })}
                                                        className="p-2 hover:bg-primary-50 rounded-xl text-primary-600 transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteIngredient(ing.id)}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {ingredients.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-20 text-gray-400">Belum ada bahan baku. Klik &quot;Tambah Bahan&quot;.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─── Tab Resep ─── */}
                {activeTab === 'resep' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm text-blue-700 font-medium">
                            <strong>Cara kerja resep:</strong> Setiap kali menu terjual dan order lunas, stok bahan baku otomatis dikurangi sesuai resep yang didaftarkan di sini.
                        </div>
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Menu Item</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Bahan Baku</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Jumlah / Porsi</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Stok Tersedia</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recipes.map(rec => (
                                        <tr key={rec.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-primary-900">{rec.menu_items?.name || '-'}</td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{rec.ingredients?.name || '-'}</td>
                                            <td className="px-6 py-4 text-right font-black text-primary-700">
                                                {Number(rec.quantity_used).toLocaleString('id-ID')} {rec.ingredients?.unit}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-black ${Number(rec.ingredients?.current_stock) <= Number(rec.ingredients?.min_stock) ? 'text-red-600' : 'text-green-600'}`}>
                                                    {Number(rec.ingredients?.current_stock || 0).toLocaleString('id-ID')} {rec.ingredients?.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDeleteRecipe(rec.id)}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {recipes.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-20 text-gray-400">Belum ada resep. Tambahkan resep untuk auto-deduct stok saat terjual.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {ingredientModal && (
                <IngredientModal
                    ingredient={ingredientModal.id ? ingredientModal : null}
                    onClose={() => setIngredientModal(null)}
                    onSaved={() => { setIngredientModal(null); handleRefresh(); }}
                />
            )}
            {adjustModal && (
                <AdjustStockModal
                    ingredient={adjustModal}
                    onClose={() => setAdjustModal(null)}
                    onSaved={() => { setAdjustModal(null); handleRefresh(); }}
                />
            )}
            {recipeModal && (
                <RecipeModal
                    recipe={recipeModal.id ? recipeModal : null}
                    menuItems={menuItems}
                    ingredients={ingredients}
                    onClose={() => setRecipeModal(null)}
                    onSaved={() => { setRecipeModal(null); handleRefresh(); }}
                />
            )}
        </div>
    );
}
