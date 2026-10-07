// ============================================
// EVOLUTION API CONFIGURATION
// ============================================

const EVOLUTION_API_CONFIG = {
    baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY,
    instance: {
        qrcode: {
            timeout: 60000, // 60 segundos para fazer scan do QR
        },
        settings: {
            reject_call: true,
            msg_call: 'Chamadas não são suportadas',
            groupsIgnore: false,
            alwaysOnline: false,
            readReceipts: true,
            syncFullHistory: false,
        }
    }
};

module.exports = EVOLUTION_API_CONFIG;
