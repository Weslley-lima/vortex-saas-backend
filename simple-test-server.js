// ============================================
// SIMPLE TEST SERVER - Testing endpoints without npm dependencies
// Uses direct TCP connection to PostgreSQL
// ============================================

const http = require('http');
const url = require('url');
const { spawn } = require('child_process');

// Load environment variables
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const env = { ...process.env };

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

const PORT = env.PORT || 3000;
const DB_HOST = env.DB_HOST || 'localhost';
const DB_PORT = env.DB_PORT || 5432;
const DB_NAME = env.DB_NAME || 'whatsapp_saas_db';
const DB_USER = env.DB_USER || 'postgres';
const DB_PASSWORD = env.DB_PASSWORD || '';

// Simple database query helper using psql command
async function queryDB(sql, params = []) {
    return new Promise((resolve, reject) => {
        let query = sql;
        params.forEach((param, idx) => {
            const val = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : param;
            query = query.replace(`$${idx + 1}`, val);
        });

        const psqlCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "${query.replace(/"/g, '\\"')}"`;

        const proc = spawn('bash', ['-c', psqlCmd], {
            env: { ...process.env, PGPASSWORD: DB_PASSWORD }
        });

        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => {
            output += data.toString();
        });

        proc.stderr.on('data', (data) => {
            error += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(error || 'Database query failed'));
            }
        });
    });
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

        // Evolution status
        if (pathname.startsWith('/api/evolution/status/')) {
            const instanceId = pathname.split('/').pop();

            res.writeHead(200);
            res.end(JSON.stringify({
                message: 'Status da instância',
                data: {
                    instance_id: instanceId,
                    name: 'Test Instance',
                    status: 'connected',
                    type: 'qrcode'
                }
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

                    const qrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6ZAAAAFUlEQVR42mNk+M9QzwAEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

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

        // Disparos criar
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

                    res.writeHead(201);
                    res.end(JSON.stringify({
                        message: 'Campanha criada com sucesso (mock)',
                        data: {
                            campaign_id: Math.floor(Math.random() * 1000),
                            total_numbers: numbers.length,
                            method: metodo,
                            status: scheduled_at ? 'scheduled' : 'pending',
                            scheduled_at: scheduled_at || new Date()
                        }
                    }));
                } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        message: 'Erro ao criar campanha',
                        error: err.message
                    }));
                }
            });
            return;
        }

        // Disparos enviar
        if (pathname === '/api/disparos/enviar' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { campaign_id, metodo } = data;

                    if (!campaign_id) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            message: 'Erro: campaign_id é obrigatório',
                            error: 'MISSING_FIELDS'
                        }));
                        return;
                    }

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        message: 'Disparos iniciados',
                        data: {
                            campaign_id: campaign_id,
                            total: 10,
                            sent: 9,
                            failed: 1,
                            status: 'processing'
                        }
                    }));
                } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        message: 'Erro ao enviar disparos',
                        error: err.message
                    }));
                }
            });
            return;
        }

        // Evolution send message
        if (pathname === '/api/evolution/send' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { instance_id, phone_number, message } = data;

                    if (!instance_id || !phone_number || !message) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            message: 'Erro: instance_id, phone_number e message são obrigatórios',
                            error: 'MISSING_FIELDS'
                        }));
                        return;
                    }

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        message: 'Mensagem enviada com sucesso',
                        data: {
                            message_id: `msg_${Date.now()}`,
                            status: 'sent',
                            sent_at: new Date()
                        }
                    }));
                } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        message: 'Erro ao enviar mensagem',
                        error: err.message
                    }));
                }
            });
            return;
        }

        // Disparos status
        if (pathname.startsWith('/api/disparos/status/')) {
            const campaignId = pathname.split('/').pop();

            res.writeHead(200);
            res.end(JSON.stringify({
                message: 'Status da campanha',
                data: {
                    campaign_id: campaignId,
                    status: 'processing',
                    method: 'oficial',
                    total: 10,
                    sent: 7,
                    failed: 1,
                    pending: 2,
                    created_at: new Date(),
                    scheduled_at: null
                }
            }));
            return;
        }

        // 404
        res.writeHead(404);
        res.end(JSON.stringify({
            error: 'Rota não encontrada',
            path: pathname,
            method: req.method,
            available_routes: [
                'GET /api/health',
                'POST /api/evolution/qrcode',
                'GET /api/evolution/status/:instance_id',
                'POST /api/evolution/send',
                'POST /api/disparos/criar',
                'POST /api/disparos/enviar',
                'GET /api/disparos/status/:campaign_id'
            ]
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
    console.log(`║  WhatsApp SaaS Backend (TEST MODE)     ║`);
    console.log(`║  🚀 Servidor rodando em:              ║`);
    console.log(`║  http://localhost:${PORT}                    ║`);
    console.log(`║  Banco: ${DB_NAME}          ║`);
    console.log(`║  Modo: TESTE COM MOCKS                 ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    console.log('📌 Rotas disponíveis:');
    console.log('   GET  /api/health');
    console.log('   POST /api/evolution/qrcode');
    console.log('   GET  /api/evolution/status/:instance_id');
    console.log('   POST /api/evolution/send');
    console.log('   POST /api/disparos/criar');
    console.log('   POST /api/disparos/enviar');
    console.log('   GET  /api/disparos/status/:campaign_id\n');
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado.');
        process.exit(0);
    });
});
