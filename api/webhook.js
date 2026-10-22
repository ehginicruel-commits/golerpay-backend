const crypto = require('crypto');

module.exports = async (req, res) => {
    // Hanya menerima request bertipe POST dari Saweria
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const payload = req.body;

        // -------------------------------------------------------------
        // 1. DATA API VIP RESELLER (Sudah terpasang sesuai gambar)
        // -------------------------------------------------------------
        const VIP_API_ID = 'P8RXu9fS';
        const VIP_API_KEY = 'RpImUrYrA8v5GbmNJtatr9u';

        // -------------------------------------------------------------
        // 2. PARSING DATA PEMBAYARAN DARI SAWERIA
        // -------------------------------------------------------------
        // Saweria biasa mengirimkan data donasi/pembayaran dalam bentuk JSON
        const amount = payload.amount || 0;
        const targetNumber = payload.msg || payload.message || ''; // Mengambil nomor HP/ID dari pesan pembeli
        const serviceCode = payload.donator_name || ''; // Kode produk / layanan dari nama pembeli

        // Validasi data pembayaran
        if (!targetNumber || amount <= 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Webhook received, but missing target or invalid amount' 
            });
        }

        // -------------------------------------------------------------
        // 3. GENERATE SIGNATURE UNTUK API VIP RESELLER
        // Formula VIP Reseller: md5(api_id + api_key)
        // -------------------------------------------------------------
        const sign = crypto.createHash('md5').update(VIP_API_ID + VIP_API_KEY).digest('hex');

        // -------------------------------------------------------------
        // 4. EMBED PERINTAH ORDER KE VIP RESELLER
        // -------------------------------------------------------------
        const params = new URLSearchParams();
        params.append('key', VIP_API_KEY);
        params.append('sign', sign);
        params.append('type', 'order');
        params.append('service', serviceCode); // ID / Kode Layanan dari VIP Reseller
        params.append('data_no', targetNumber);  // Nomor Tujuan / ID Game Pembeli

        // Tembak API VIP Reseller
        const vipResponse = await fetch('https://vip-reseller.co.id/api/prepaid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const vipData = await vipResponse.json();

        // Respon balik ke Saweria bahwa laporan sukses diterima & diproses
        return res.status(200).json({
            success: true,
            message: 'Order processed to VIP Reseller',
            vip_response: vipData
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
