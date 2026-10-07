// ============================================
// TEST SERVER - Minimal implementation without npm dependencies
// ============================================

const http = require('http');
const url = require('url');
const { Client } = require('pg');

// Load environment variables manually
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const env = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...rest] = trimmed.split('=');
            if (key) {
                env[key.trim()] = rest.join('=').trim();
            }
        }
    });
}

process.env = { ...process.env, ...env };

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'whatsapp_saas_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Database connection pool
const dbPool = [];
let dbConnectionString = `postgresql://${DB_USER}${DB_PASSWORD ? ':' + DB_PASSWORD : ''}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

async function getDbClient() {
    const client = new Client({
        connectionString: dbConnectionString
    });
    await client.connect();
    return client;
}

// Routes handler
async function handleRequest(req, res, pathname, query) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // Health check
        if (pathname === '/api/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                message: 'Servidor WhatsApp SaaS está funcionando! 🚀',
                timestamp: new Date().toISOString()
            }));
            return;
        }

        // Evolution API routes
        if (pathname === '/api/evolution/qrcode' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { user_id, instance_name } = data;

                    if (!user_id || !instance_name) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            message: 'Erro: user_id e instance_name são obrigatórios',
                            error: 'MISSING_FIELDS'
                        }));
                        return;
                    }

                    const client = await getDbClient();

                    // Simulate QR code
                    const qrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6ZAAAAFUlEQVR42mNk+M9QzwAEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

                    try {
                        await client.query(
                            `INSERT INTO instances (user_id, instance_name, qr_code, status, type)
                             VALUES ($1, $2, $3, $4, $5)
                             ON CONFLICT (user_id) DO UPDATE
                             SET qr_code = $3, status = $4`,
                            [user_id, instance_name, qrBase64, 'connecting', 'qrcode']
                        );
                    } catch (err) {
                        console.error('DB Error:', err);
                    } finally {
                        await client.end();
                    }

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        message: 'QR Code gerado com sucesso',
                        data: {
                            qr_code: qrBase64,
                            instance_id: `qr_${Date.now()}`,
                            expires_in: 60,
                            status: 'pending'
                        }
                    }));
                } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        message: 'Erro ao gerar QR Code',
                        error: err.message
                    }));
                }
            });
            return;
        }

        // Disparos routes
        if (pathname === '/api/disparos/criar' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { user_id, instance_id, message, metodo, numbers, scheduled_at } = data;

                    if (!user_id || !instance_id || !message || !metodo || !numbers || numbers.length === 0) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            message: 'Erro: Campos obrigatórios faltando',
                            required: ['user_id', 'instance_id', 'message', 'metodo', 'numbers'],
                            error: 'MISSING_FIELDS'
                        }));
                        return;
                    }

                    if (!['oficial', 'qrcode'].includes(metodo)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            message: 'Erro: metodo deve ser "oficial" ou "qrcode"',
                            error: 'INVALID_METHOD'
                        }));
                        return;
                    }

                    const client = await getDbClient();

                    try {
                        const result = await client.query(
                            `INSERT INTO broadcast_campaigns
                             (user_id, instance_id, message, method, scheduled_at, total_numbers, status)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)
                             RETURNING *`,
                            [
                                user_id,
                                instance_id,
                                message,
                                metodo,
                                scheduled_at || new Date(),
                                numbers.length,
                                scheduled_at ? 'scheduled' : 'pending'
                            ]
                        );

                        const campaign = result.rows[0];

                        for (const number of numbers) {
                            await client.query(
                                `INSERT INTO broadcast_recipients
                                 (campaign_id, phone_number, status)
                                 VALUES ($1, $2, $3)`,
                                [campaign.id, number, 'pending']
                            );
                        }

                        res.writeHead(201);
                        res.end(JSON.stringify({
                            message: 'Campanha criada com sucesso',
                            data: {
                                campaign_id: campaign.id,
                                total_numbers: numbers.length,
                                method: metodo,
                                status: campaign.status,
                                scheduled_at: campaign.scheduled_at
                            }
                        }));
                    } finally {
                        await client.end();
                    }
                } catch (err) {
                    console.error('Error:', err);
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        message: 'Erro ao criar campanha',
                        error: err.message
                    }));
                }
            });
            return;
        }

        // Disparos status
        if (pathname.startsWith('/api/disparos/status/')) {
            const campaignId = pathname.split('/').pop();
            const client = await getDbClient();

            try {
                const result = await client.query(
                    `SELECT * FROM broadcast_campaigns WHERE id = $1`,
                    [campaignId]
                );

                if (result.rows.length === 0) {
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        message: 'Campanha não encontrada',
                        error: 'CAMPAIGN_NOT_FOUND'
                    }));
                    return;
                }

                const campaign = result.rows[0];

                const statsResult = await client.query(
                    `SELECT
                        status,
                        COUNT(*) as count
                     FROM broadcast_recipients
                     WHERE campaign_id = $1
                     GROUP BY status`,
                    [campaignId]
                );

                const stats = statsResult.rows.reduce((acc, row) => {
                    acc[row.status] = parseInt(row.count);
                    return acc;
                }, {});

                res.writeHead(200);
                res.end(JSON.stringify({
                    message: 'Status da campanha',
                    data: {
                        campaign_id: campaignId,
                        status: campaign.status,
                        method: campaign.method,
                        total: campaign.total_numbers,
                        sent: campaign.sent_count || 0,
                        failed: campaign.failed_count || 0,
                        pending: stats.pending || 0,
                        created_at: campaign.created_at,
                        scheduled_at: campaign.scheduled_at
                    }
                }));
            } finally {
                await client.end();
            }
            return;
        }

        // 404
        res.writeHead(404);
        res.end(JSON.stringify({
            error: 'Rota não encontrada',
            path: pathname,
            method: req.method
        }));
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: error.message || 'Erro interno do servidor',
            status: 500
        }));
    }
}

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    handleRequest(req, res, pathname, query);
});

server.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  WhatsApp SaaS Backend (TEST)          ║`);
    console.log(`║  🚀 Servidor rodando em:              ║`);
    console.log(`║  http://localhost:${PORT}                    ║`);
    console.log(`║  Banco: ${DB_NAME}          ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado.');
        process.exit(0);
    });
});
