// ============================================
// ROUTES/ZERNIO.JS - Rotas de Integração com Zernio
// Descrição: Gerencia a criação e conexão de instâncias WhatsApp via Zernio
// ============================================

const express = require('express');
const axios = require('axios');
const router = express.Router();

// ============================================
// CONFIGURAÇÃO DA API ZERNIO
// ============================================
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL;

// Cliente Axios pré-configurado para Zernio
const zernioClient = axios.create({
    baseURL: ZERNIO_BASE_URL,
    headers: {
        'Authorization': `Bearer ${ZERNIO_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// ============================================
// ROTA: POST /api/instances/create
// Descrição: Cria um novo perfil na Zernio e salva no banco de dados
// ============================================
router.post('/instances/create', async (req, res) => {
    try {
        const { instance_name, user_id } = req.body;

        // ✅ Validação de dados
        if (!instance_name || !user_id) {
            return res.status(400).json({
                error: 'instance_name e user_id são obrigatórios',
                received: { instance_name, user_id }
            });
        }

        console.log(`\n📱 Criando instância: ${instance_name} para usuário ${user_id}`);

        // ============================================
        // PASSO 1: Chamar API Zernio para criar Perfil
        // ============================================
        console.log(`🔗 Chamando Zernio: POST /v1/profiles`);

        const zernioResponse = await zernioClient.post('/profiles', {
            name: instance_name
        });

        // Extrair ID do perfil retornado pela Zernio (Zernio retorna _id)
        const zernio_profile_id = zernioResponse.data._id || zernioResponse.data.profileId || zernioResponse.data.id;

        if (!zernio_profile_id) {
            console.error('❌ Zernio não retornou um profile_id válido:', zernioResponse.data);
            return res.status(500).json({
                error: 'Zernio não retornou um profile_id válido',
                zernio_response: zernioResponse.data
            });
        }

        console.log(`✅ Perfil criado na Zernio: ${zernio_profile_id}`);

        // ============================================
        // PASSO 2: Salvar instância no banco de dados PostgreSQL
        // ============================================
        const db = req.app.locals.db;

        const insertQuery = `
            INSERT INTO instances (user_id, zernio_profile_id, instance_name, status, metadata)
            VALUES ($1, $2, $3, 'pending', $4)
            RETURNING id, user_id, zernio_profile_id, instance_name, status, created_at;
        `;

        const metadata = JSON.stringify({
            created_by_api: true,
            zernio_response: {
                type: zernioResponse.data.type,
                created_at: zernioResponse.data.created_at
            }
        });

        const result = await db.query(insertQuery, [
            user_id,
            zernio_profile_id,
            instance_name,
            metadata
        ]);

        const instance = result.rows[0];

        console.log(`✅ Instância salva no banco de dados com ID: ${instance.id}`);

        // ============================================
        // Retornar resposta de sucesso
        // ============================================
        res.status(201).json({
            message: 'Instância criada com sucesso!',
            instance: {
                id: instance.id,
                user_id: instance.user_id,
                zernio_profile_id: instance.zernio_profile_id,
                instance_name: instance.instance_name,
                status: instance.status,
                created_at: instance.created_at
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar instância:', error.message);

        // Tratamento de erros específicos da Zernio
        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: 'Erro na API Zernio',
                details: error.response.data,
                status: error.response.status
            });
        }

        // Erro genérico
        res.status(500).json({
            error: 'Erro ao criar instância',
            message: error.message
        });
    }
});

// ============================================
// ROTA: POST /api/instances/connect
// Descrição: Obtém a URL de conexão do WhatsApp (authUrl) para autenticação da Meta
// ============================================
router.post('/instances/connect', async (req, res) => {
    try {
        const { zernio_profile_id } = req.body;

        // ✅ Validação de dados
        if (!zernio_profile_id) {
            return res.status(400).json({
                error: 'zernio_profile_id é obrigatório',
                received: { zernio_profile_id }
            });
        }

        console.log(`\n🔐 Obtendo URL de autenticação para perfil: ${zernio_profile_id}`);

        // ============================================
        // PASSO 1: Chamar API Zernio para obter authUrl
        // ============================================
        console.log(`🔗 Chamando Zernio: GET /connect/whatsapp?profileId=${zernio_profile_id}`);

        const zernioResponse = await zernioClient.get(`/connect/whatsapp`, {
            params: {
                profileId: zernio_profile_id
            }
        });

        // Extrair authUrl da resposta (Zernio retorna authUrl)
        const authUrl = zernioResponse.data.authUrl || zernioResponse.data.auth_url || zernioResponse.data.url;

        if (!authUrl) {
            console.error('❌ Zernio não retornou uma authUrl válida:', zernioResponse.data);
            return res.status(500).json({
                error: 'Zernio não retornou uma authUrl válida',
                zernio_response: zernioResponse.data
            });
        }

        console.log(`✅ URL de autenticação obtida com sucesso`);

        // ============================================
        // PASSO 2: Atualizar status da instância no banco de dados
        // ============================================
        const db = req.app.locals.db;

        const updateQuery = `
            UPDATE instances
            SET status = 'connecting', updated_at = CURRENT_TIMESTAMP
            WHERE zernio_profile_id = $1
            RETURNING id, instance_name, status, updated_at;
        `;

        const result = await db.query(updateQuery, [zernio_profile_id]);

        if (result.rows.length === 0) {
            console.warn(`⚠️ Instância não encontrada para profile_id: ${zernio_profile_id}`);
            return res.status(404).json({
                error: 'Instância não encontrada',
                zernio_profile_id
            });
        }

        const instance = result.rows[0];
        console.log(`✅ Status da instância atualizado para 'connecting'`);

        // ============================================
        // Retornar resposta com a URL de autenticação
        // ============================================
        res.status(200).json({
            message: 'URL de autenticação obtida com sucesso!',
            authUrl: authUrl,
            instance: {
                id: instance.id,
                instance_name: instance.instance_name,
                status: instance.status,
                updated_at: instance.updated_at
            },
            instructions: 'Abra a authUrl em um navegador ou pop-up para autenticar com sua conta WhatsApp Business'
        });

    } catch (error) {
        console.error('❌ Erro ao obter URL de autenticação:', error.message);

        // Tratamento de erros específicos da Zernio
        if (error.response) {
            return res.status(error.response.status || 500).json({
                error: 'Erro na API Zernio',
                details: error.response.data,
                status: error.response.status
            });
        }

        // Erro genérico
        res.status(500).json({
            error: 'Erro ao obter URL de autenticação',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/instances
// Descrição: Lista todas as instâncias de um usuário (bônus)
// ============================================
router.get('/instances', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, zernio_profile_id, instance_name, phone_number, status, created_at, updated_at
            FROM instances
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query, [user_id]);

        res.status(200).json({
            message: 'Instâncias listadas com sucesso',
            total: result.rows.length,
            instances: result.rows
        });

    } catch (error) {
        console.error('❌ Erro ao listar instâncias:', error.message);
        res.status(500).json({
            error: 'Erro ao listar instâncias',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/instances/:zernio_profile_id
// Descrição: Obtém detalhes de uma instância específica (bônus)
// ============================================
router.get('/instances/:zernio_profile_id', async (req, res) => {
    try {
        const { zernio_profile_id } = req.params;

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, zernio_profile_id, instance_name, phone_number, status, metadata, created_at, updated_at
            FROM instances
            WHERE zernio_profile_id = $1;
        `;

        const result = await db.query(query, [zernio_profile_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Instância não encontrada',
                zernio_profile_id
            });
        }

        const instance = result.rows[0];

        res.status(200).json({
            message: 'Instância obtida com sucesso',
            instance
        });

    } catch (error) {
        console.error('❌ Erro ao obter instância:', error.message);
        res.status(500).json({
            error: 'Erro ao obter instância',
            message: error.message
        });
    }
});

module.exports = router;
