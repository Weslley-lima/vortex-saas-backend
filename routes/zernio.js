// ============================================
// ROUTES/ZERNIO.JS - Integração Zernio (Official WhatsApp)
// Descrição: Endpoints para enviar mensagens via Zernio API
// Usa apenas módulos built-in Node.js (https)
// ============================================

const express = require('express');
const https = require('https');
const router = express.Router();

// ============================================
// CONFIGURAÇÃO DA API ZERNIO
// ============================================
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL || 'https://zernio.com/api/v1';

// ============================================
// HELPER: Fazer chamadas HTTPS para Zernio
// ============================================
function callZernioAPI(method, path, body = null) {
    return new Promise((resolve, reject) => {
        // Parse URL
        const url = new URL(path, ZERNIO_BASE_URL);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': `Bearer ${ZERNIO_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        // Se tem body, adicionar Content-Length
        let bodyString = null;
        if (body) {
            bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (bodyString) {
            req.write(bodyString);
        }

        req.end();
    });
}

// ============================================
// ROTA: POST /api/zernio/send
// Descrição: Enviar mensagem via Zernio (método oficial)
// ============================================
router.post('/send', async (req, res) => {
    try {
        const { phone_number, message, instance_id } = req.body;

        // ✅ Validação de dados
        if (!phone_number || !message) {
            return res.status(400).json({
                error: 'phone_number e message são obrigatórios',
                received: { phone_number, message, instance_id }
            });
        }

        console.log(`\n📱 Enviando mensagem via Zernio para ${phone_number}`);
        console.log(`📝 Mensagem: ${message}`);

        // ============================================
        // PASSO 1: Chamar API Zernio para enviar mensagem
        // ============================================
        const zernioResponse = await callZernioAPI('POST', '/messages/send', {
            to: phone_number,
            body: message,
            type: 'text'
        });

        if (zernioResponse.status !== 200 && zernioResponse.status !== 201) {
            console.error('❌ Erro ao enviar via Zernio:', zernioResponse);
            return res.status(zernioResponse.status).json({
                error: 'Erro ao enviar mensagem via Zernio',
                details: zernioResponse.data
            });
        }

        console.log(`✅ Mensagem enviada com sucesso via Zernio`);

        // ============================================
        // PASSO 2: Registrar envio no banco de dados
        // ============================================
        const db = req.app.locals.db;
        const message_id = zernioResponse.data._id || zernioResponse.data.id || `msg_${Date.now()}`;

        const logQuery = `
            INSERT INTO message_logs (user_id, instance_id, phone_number, message, method, status, message_id, sent_at)
            VALUES ($1, $2, $3, $4, 'oficial', 'sent', $5, CURRENT_TIMESTAMP)
            RETURNING id, message_id, status, sent_at;
        `;

        try {
            const logResult = await db.query(logQuery, [
                null, // user_id (será preenchido pelo frontend)
                instance_id || 'prof_default',
                phone_number,
                message,
                message_id
            ]);

            const logEntry = logResult.rows[0];

            // ============================================
            // Retornar resposta de sucesso
            // ============================================
            res.status(200).json({
                message: 'Mensagem enviada com sucesso!',
                data: {
                    message_id: message_id,
                    phone_number: phone_number,
                    status: 'sent',
                    sent_at: logEntry.sent_at,
                    method: 'oficial'
                }
            });

        } catch (dbError) {
            // Se falhar ao registrar, ainda assim retornar sucesso (mensagem foi enviada)
            console.warn('⚠️ Aviso ao registrar no banco:', dbError.message);
            res.status(200).json({
                message: 'Mensagem enviada com sucesso!',
                data: {
                    message_id: message_id,
                    phone_number: phone_number,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    method: 'oficial'
                }
            });
        }

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);
        res.status(500).json({
            error: 'Erro ao enviar mensagem',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/zernio/status/:message_id
// Descrição: Obter status de uma mensagem enviada
// ============================================
router.get('/status/:message_id', async (req, res) => {
    try {
        const { message_id } = req.params;

        console.log(`\n📊 Obtendo status da mensagem: ${message_id}`);

        // ============================================
        // PASSO 1: Chamar API Zernio para obter status
        // ============================================
        const zernioResponse = await callZernioAPI('GET', `/messages/${message_id}`);

        if (zernioResponse.status !== 200) {
            console.error('❌ Erro ao obter status:', zernioResponse);
            return res.status(zernioResponse.status).json({
                error: 'Erro ao obter status da mensagem',
                details: zernioResponse.data
            });
        }

        console.log(`✅ Status obtido com sucesso`);

        res.status(200).json({
            message: 'Status obtido com sucesso',
            data: {
                message_id: message_id,
                status: zernioResponse.data.status || 'sent',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Erro ao obter status:', error.message);
        res.status(500).json({
            error: 'Erro ao obter status',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/zernio/profiles
// Descrição: Listar perfis criados na Zernio
// ============================================
router.get('/profiles', async (req, res) => {
    try {
        console.log(`\n📋 Listando perfis Zernio`);

        // ============================================
        // Chamar API Zernio para listar perfis
        // ============================================
        const zernioResponse = await callZernioAPI('GET', '/profiles');

        if (zernioResponse.status !== 200) {
            console.error('❌ Erro ao listar perfis:', zernioResponse);
            return res.status(zernioResponse.status).json({
                error: 'Erro ao listar perfis',
                details: zernioResponse.data
            });
        }

        console.log(`✅ Perfis listados com sucesso`);

        res.status(200).json({
            message: 'Perfis listados com sucesso',
            total: Array.isArray(zernioResponse.data) ? zernioResponse.data.length : 0,
            data: zernioResponse.data
        });

    } catch (error) {
        console.error('❌ Erro ao listar perfis:', error.message);
        res.status(500).json({
            error: 'Erro ao listar perfis',
            message: error.message
        });
    }
});

// ============================================
// ROTA: POST /api/zernio/test
// Descrição: Testar conexão com Zernio
// ============================================
router.post('/test', async (req, res) => {
    try {
        console.log(`\n🧪 Testando conexão com Zernio`);

        const zernioResponse = await callZernioAPI('GET', '/profiles');

        if (zernioResponse.status === 200 || zernioResponse.status === 401) {
            res.status(200).json({
                message: 'Conexão com Zernio OK',
                status: 'connected',
                zernio_response: zernioResponse.status,
                api_key_configured: !!ZERNIO_API_KEY
            });
        } else {
            res.status(500).json({
                message: 'Erro ao conectar com Zernio',
                status: 'error',
                error_code: zernioResponse.status
            });
        }

    } catch (error) {
        console.error('❌ Erro ao testar conexão:', error.message);
        res.status(500).json({
            message: 'Erro ao testar conexão',
            error: error.message
        });
    }
});

module.exports = router;
