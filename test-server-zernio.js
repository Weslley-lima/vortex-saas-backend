// ============================================
// TEST-SERVER-ZERNIO.JS
// Servidor de teste com endpoints Zernio
// Usa apenas módulos Node.js built-in
// ============================================

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Load .env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && !key.startsWith('#') && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL || 'https://zernio.com/api/v1';

// ============================================
// HELPER: Parse JSON from request
// ============================================
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

// ============================================
// HELPER: Send JSON response
// ============================================
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
}

// ============================================
// ROUTES
// ============================================
const routes = {
    'GET /api/health': (req, res) => {
        sendJSON(res, 200, {
            status: 'ok',
            message: 'Servidor WhatsApp SaaS está funcionando! 🚀',
            timestamp: new Date().toISOString()
        });
    },

    'POST /api/zernio/test': (req, res) => {
        sendJSON(res, 200, {
            message: 'Conexão com Zernio OK',
            status: 'connected',
            zernio_response: 200,
            api_key_configured: !!ZERNIO_API_KEY,
            api_key_value: ZERNIO_API_KEY ? ZERNIO_API_KEY.substring(0, 10) + '...' : 'NOT_SET'
        });
    },

    'POST /api/zernio/send': async (req, res) => {
        try {
            const body = await parseRequestBody(req);
            const { phone_number, message, instance_id } = body;

            if (!phone_number || !message) {
                return sendJSON(res, 400, {
                    error: 'phone_number e message são obrigatórios',
                    received: { phone_number, message, instance_id }
                });
            }

            console.log(`\n📱 Enviando mensagem via Zernio para ${phone_number}`);
            console.log(`📝 Mensagem: ${message}`);

            const message_id = `msg_${Date.now()}`;

            sendJSON(res, 200, {
                message: 'Mensagem enviada com sucesso!',
                data: {
                    message_id: message_id,
                    phone_number: phone_number,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    method: 'oficial'
                }
            });
        } catch (error) {
            console.error('❌ Erro:', error.message);
            sendJSON(res, 500, {
                error: 'Erro ao enviar mensagem',
                message: error.message
            });
        }
    },

    'GET /api/zernio/profiles': (req, res) => {
        sendJSON(res, 200, {
            message: 'Perfis listados com sucesso',
            total: 2,
            data: [
                {
                    id: 'prof_123',
                    name: 'Vortex Default',
                    status: 'active',
                    phone_number: '+5511987654321',
                    created_at: '2026-10-01T10:00:00Z'
                },
                {
                    id: 'prof_456',
                    name: 'Vortex Backup',
                    status: 'active',
                    phone_number: '+5521987654321',
                    created_at: '2026-10-02T10:00:00Z'
                }
            ]
        });
    },

    'GET /api/zernio/status/:message_id': (req, res, params) => {
        const { message_id } = params;
        sendJSON(res, 200, {
            message: 'Status obtido com sucesso',
            data: {
                message_id: message_id,
                status: 'sent',
                timestamp: new Date().toISOString()
            }
        });
    },

    'POST /api/disparos/criar': async (req, res) => {
        try {
            const body = await parseRequestBody(req);
            const { user_id, instance_id, message, metodo, numbers } = body;

            // Validação
            const required = ['user_id', 'instance_id', 'message', 'metodo', 'numbers'];
            const missing = required.filter(f => !body[f]);
            if (missing.length > 0) {
                return sendJSON(res, 400, {
                    message: 'Erro: Campos obrigatórios faltando',
                    required: required,
                    error: 'MISSING_FIELDS'
                });
            }

            if (metodo !== 'oficial' && metodo !== 'qrcode') {
                return sendJSON(res, 400, {
                    message: 'Erro: metodo deve ser "oficial" ou "qrcode"',
                    error: 'INVALID_METHOD'
                });
            }

            const campaign_id = Math.floor(Math.random() * 1000) + 1;

            sendJSON(res, 201, {
                message: 'Campanha criada com sucesso (mock)',
                data: {
                    campaign_id: campaign_id,
                    total_numbers: numbers.length,
                    method: metodo,
                    status: 'pending',
                    scheduled_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Erro:', error.message);
            sendJSON(res, 500, {
                error: 'Erro ao criar campanha',
                message: error.message
            });
        }
    },

    'POST /api/disparos/enviar': async (req, res) => {
        try {
            const body = await parseRequestBody(req);
            const { campaign_id, metodo } = body;

            sendJSON(res, 200, {
                message: 'Disparos iniciados',
                data: {
                    campaign_id: campaign_id,
                    total: 10,
                    sent: 9,
                    failed: 1,
                    status: 'processing'
                }
            });
        } catch (error) {
            console.error('❌ Erro:', error.message);
            sendJSON(res, 500, {
                error: 'Erro ao enviar campanha',
                message: error.message
            });
        }
    },

    'GET /api/disparos/status/:campaign_id': (req, res, params) => {
        const { campaign_id } = params;
        sendJSON(res, 200, {
            message: 'Status da campanha',
            data: {
                campaign_id: campaign_id,
                status: 'processing',
                method: 'oficial',
                total: 10,
                sent: 7,
                failed: 1,
                pending: 2,
                created_at: new Date().toISOString(),
                scheduled_at: null
            }
        });
    }
};

// ============================================
// SERVER
// ============================================
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.writeHead(200);
        res.end();
    }

    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

    // Match routes
    let matched = false;
    for (const [route, handler] of Object.entries(routes)) {
        const [routeMethod, routePath] = route.split(' ');

        if (method !== routeMethod) continue;

        // Simple pattern matching for :param
        const routePattern = routePath
            .replace(/:[^/]+/g, '([^/]+)')
            .replace(/\//g, '\\/');

        const regex = new RegExp(`^${routePattern}$`);
        const match = pathname.match(regex);

        if (match) {
            // Extract params
            const params = {};
            const paramNames = (routePath.match(/:[^/]+/g) || []).map(p => p.substring(1));
            paramNames.forEach((name, i) => {
                params[name] = match[i + 1];
            });

            matched = true;
            try {
                await handler(req, res, params);
            } catch (error) {
                console.error('❌ Error:', error);
                sendJSON(res, 500, {
                    error: 'Internal server error',
                    message: error.message
                });
            }
            break;
        }
    }

    if (!matched) {
        sendJSON(res, 404, {
            error: 'Rota não encontrada',
            path: pathname,
            method: method
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  WhatsApp SaaS Backend (Test Server)   ║`);
    console.log(`║  🚀 Servidor rodando em:              ║`);
    console.log(`║  http://localhost:${PORT}                    ║`);
    console.log(`║  Modo: test (sem dependências)         ║`);
    console.log(`║  📤 Endpoints Zernio: ATIVO            ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
});
