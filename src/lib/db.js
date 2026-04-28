/**
 * AppKasir Offline Database (IndexedDB via Dexie)
 * Menyimpan semua data POS secara lokal agar bisa beroperasi
 * tanpa koneksi internet selama berbulan-bulan.
 */
import Dexie from 'dexie';

const db = new Dexie('AppKasirOfflineDB');

db.version(1).stores({
    // Info sesi aktif (tenant_id, outlet_id, user_id, cashier_name)
    session: 'id',

    // Data outlet (nama, pajak, alamat, dll)
    outlet: 'id',

    // Kategori menu
    categories: 'id, tenant_id',

    // Item menu beserta variasi (disimpan sebagai JSON field)
    menu_items: 'id, tenant_id, category_id, status',

    // Meja restoran
    tables: 'id, outlet_id, status',

    // Data pelanggan
    customers: 'id, tenant_id',

    // Order (local ID: "LOCAL-xxx", server ID: UUID)
    // synced: 0 = belum disinkron, 1 = sudah
    orders: 'id, outlet_id, status, synced, created_at',

    // Item dalam order
    order_items: 'id, order_id',

    // Pembayaran
    payments: 'id, order_id, synced, created_at',

    // Antrian sinkronisasi — operasi yang perlu dikirim ke server
    // action: 'PROCESS_PAYMENT' | 'HOLD_ORDER' | 'CANCEL_ORDER' | 'UPDATE_STATUS'
    sync_queue: '++id, action, status, created_at',
});

export default db;
