// ============================================
// ROUTES/MESSAGES.JS - Rotas de Mensagens
// Descrição: Gerencia envio e recebimento de mensagens WhatsApp
// ============================================

const express = require('express');
const axios = require('axios');
const router = express.Router();

// ============================================
// ROTA: POST /api/messages/send
// Descrição: Envia uma mensagem WhatsApp via Zernio
// ============================================
router.post('/send', async (req, res) => {
    try {
        const { user_id, zernio_profile_id, phone_number, message_text } = req.body;

        // ✅ Validação de dados
        if (!user_id || !zernio_profile_id || !phone_number || !message_text) {
            return res.status(400).json({
                error: 'user_id, zernio_profile_id, phone_number e message_text são obrigatórios',
                received: { user_id, zernio_profile_id, phone_number }
            });
        }

        console.log(`\n💬 Enviando mensagem para ${phone_number} via perfil ${zernio_profile_id}`);

        const db = req.app.locals.db;

        // ============================================
        // PASSO 1: Validar se usuário existe
        // ============================================
        const userQuery = 'SELECT id FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuário não encontrado',
                user_id
            });
        }

        // ============================================
        // PASSO 2: Validar se instância existe
        // ============================================
        const instanceQuery = 'SELECT id, status FROM instances WHERE user_id = $1 AND zernio_profile_id = $2';
        const instanceResult = await db.query(instanceQuery, [user_id, zernio_profile_id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Instância não encontrada',
                zernio_profile_id
            });
        }

        const instance = instanceResult.rows[0];

        if (instance.status !== 'active') {
            return res.status(400).json({
                error: 'Instância não está ativa',
                status: instance.status
            });
        }

        // ============================================
        // PASSO 3: Enviar mensagem via Zernio API
        // ============================================
        const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
        const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL;

        const zernioClient = axios.create({
            baseURL: ZERNIO_BASE_URL,
            headers: {
                'Authorization': `Bearer ${ZERNIO_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const zernioResponse = await zernioClient.post('/send-message', {
            profileId: zernio_profile_id,
            phone: phone_number,
            text: message_text
        });

        const zernio_message_id = zernioResponse.data.messageId || zernioResponse.data.id;

        if (!zernio_message_id) {
            console.error('❌ Zernio não retornou messageId:', zernioResponse.data);
            return res.status(500).json({
                error: 'Zernio não retornou messageId válido',
                zernio_response: zernioResponse.data
            });
        }

        console.log(`✅ Mensagem enviada via Zernio: ${zernio_message_id}`);

        // ============================================
        // PASSO 4: Registrar mensagem no banco de dados
        // ============================================
        const insertQuery = `
            INSERT INTO message_logs (user_id, zernio_profile_id, phone_number, message_text, direction, zernio_message_id, status)
            VALUES ($1, $2, $3, $4, 'outgoing', $5, 'sent')
            RETURNING id, user_id, phone_number, message_text, direction, status, created_at;
        `;

        const result = await db.query(insertQuery, [
            user_id,
            zernio_profile_id,
            phone_number,
            message_text,
            zernio_message_id
        ]);

        const message = result.rows[0];

        // ============================================
        // PASSO 5: Atualizar last_message_at do contato
        // ============================================
        const updateContactQuery = `
            UPDATE contacts
            SET last_message_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND phone_number = $2;
        `;

        await db.query(updateContactQuery, [user_id, phone_number]);

        console.log(`✅ Mensagem registrada no banco de dados: ${message.id}`);

        // ============================================
        // Retornar resposta de sucesso
        // ============================================
        res.status(201).json({
            message: 'Mensagem enviada com sucesso!',
            messageLog: {
                id: message.id,
                user_id: message.user_id,
                phone_number: message.phone_number,
                message_text: message.message_text,
                direction: message.direction,
                status: message.status,
                created_at: message.created_at
            },
            zernio_message_id: zernio_message_id
        });

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);

        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: 'Erro na API Zernio',
                details: error.response.data,
                status: error.response.status
            });
        }

        res.status(500).json({
            error: 'Erro ao enviar mensagem',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/messages
// Descrição: Lista todas as mensagens de um usuário
// ============================================
router.get('/', async (req, res) => {
    try {
        const { user_id, phone_number, zernio_profile_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        console.log(`\n📋 Listando mensagens para usuário: ${user_id}`);

        const db = req.app.locals.db;

        let query = `
            SELECT id, user_id, phone_number, message_text, direction, status, created_at
            FROM message_logs
            WHERE user_id = $1
        `;

        const params = [user_id];
        let paramIndex = 2;

        if (phone_number) {
            query += ` AND phone_number = $${paramIndex}`;
            params.push(phone_number);
            paramIndex++;
        }

        if (zernio_profile_id) {
            query += ` AND zernio_profile_id = $${paramIndex}`;
            params.push(zernio_profile_id);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await db.query(query, params);

        console.log(`✅ ${result.rows.length} mensagens encontradas`);

        res.status(200).json({
            message: 'Mensagens listadas com sucesso',
            total: result.rows.length,
            messages: result.rows
        });

    } catch (error) {
        console.error('❌ Erro ao listar mensagens:', error.message);
        res.status(500).json({
            error: 'Erro ao listar mensagens',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/messages/:message_id
// Descrição: Obtém detalhes de uma mensagem
// ============================================
router.get('/:message_id', async (req, res) => {
    try {
        const { message_id } = req.params;

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, zernio_profile_id, phone_number, message_text, direction, status, zernio_message_id, created_at, updated_at
            FROM message_logs
            WHERE id = $1;
        `;

        const result = await db.query(query, [message_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Mensagem não encontrada',
                message_id
            });
        }

        const message = result.rows[0];

        res.status(200).json({
            message: 'Mensagem obtida com sucesso',
            messageLog: message
        });

    } catch (error) {
        console.error('❌ Erro ao obter mensagem:', error.message);
        res.status(500).json({
            error: 'Erro ao obter mensagem',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/messages/conversation/:phone_number
// Descrição: Obtém histórico de conversação com um contato
// ============================================
router.get('/conversation/:phone_number', async (req, res) => {
    try {
        const { phone_number } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        console.log(`\n💬 Carregando conversa com ${phone_number}`);

        const db = req.app.locals.db;

        const query = `
            SELECT id, phone_number, message_text, direction, status, created_at
            FROM message_logs
            WHERE user_id = $1 AND phone_number = $2
            ORDER BY created_at DESC
            LIMIT 50;
        `;

        const result = await db.query(query, [user_id, phone_number]);

        console.log(`✅ ${result.rows.length} mensagens da conversa carregadas`);

        res.status(200).json({
            message: 'Conversa carregada com sucesso',
            phone_number: phone_number,
            total: result.rows.length,
            messages: result.rows.reverse()
        });

    } catch (error) {
        console.error('❌ Erro ao carregar conversa:', error.message);
        res.status(500).json({
            error: 'Erro ao carregar conversa',
            message: error.message
        });
    }
});

module.exports = router;
