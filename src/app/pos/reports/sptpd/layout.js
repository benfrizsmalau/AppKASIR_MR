// Layout khusus halaman SPTPD — tanpa POS sidebar agar bisa dicetak bersih
export default function SPTPDLayout({ children }) {
    return (
        <html lang="id">
            <body className="bg-gray-100">
                {children}
            </body>
        </html>
    );
}
