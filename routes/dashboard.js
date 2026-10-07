// ============================================
// ROUTES/DASHBOARD.JS - Rotas do Dashboard
// Descrição: Retorna estatísticas e dados agregados do usuário
// ============================================

const express = require('express');
const router = express.Router();

// ============================================
// ROTA: GET /api/dashboard/:user_id
// Descrição: Obtém estatísticas do dashboard para um usuário
// ============================================
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // ✅ Validação de dados
        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        console.log(`\n📊 Obtendo dashboard para usuário: ${user_id}`);

        const db = req.app.locals.db;

        // ============================================
        // PASSO 1: Verificar se usuário existe
        // ============================================
        const userQuery = `
            SELECT id, email, name, status, created_at
            FROM users
            WHERE id = $1;
        `;

        const userResult = await db.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            console.warn(`⚠️ Usuário não encontrado: ${user_id}`);
            return res.status(404).json({
                error: 'Usuário não encontrado',
                user_id
            });
        }

        const user = userResult.rows[0];

        // ============================================
        // PASSO 2: Contar instâncias (WhatsApp conectadas)
        // ============================================
        const instancesQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'connecting' THEN 1 ELSE 0 END) as connecting,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM instances
            WHERE user_id = $1;
        `;

        const instancesResult = await db.query(instancesQuery, [user_id]);
        const instances = instancesResult.rows[0];

        // ============================================
        // PASSO 3: Contar contatos
        // ============================================
        const contactsQuery = `
            SELECT COUNT(*) as total
            FROM contacts
            WHERE user_id = $1;
        `;

        const contactsResult = await db.query(contactsQuery, [user_id]);
        const contacts = contactsResult.rows[0];

        // ============================================
        // PASSO 4: Contar automações/flows
        // ============================================
        const automationsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused
            FROM automations
            WHERE user_id = $1;
        `;

        const automationsResult = await db.query(automationsQuery, [user_id]);
        const automations = automationsResult.rows[0];

        // ============================================
        // PASSO 5: Contar mensagens
        // ============================================
        const messagesQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
                SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
            FROM message_logs
            WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '30 days';
        `;

        const messagesResult = await db.query(messagesQuery, [user_id]);
        const messages = messagesResult.rows[0];

        // ============================================
        // PASSO 6: Listar instâncias recentes
        // ============================================
        const recentInstancesQuery = `
            SELECT id, instance_name, phone_number, status, created_at
            FROM instances
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 5;
        `;

        const recentInstancesResult = await db.query(recentInstancesQuery, [user_id]);
        const recentInstances = recentInstancesResult.rows;

        console.log(`✅ Dashboard obtido com sucesso`);

        // ============================================
        // Retornar resposta com todas as estatísticas
        // ============================================
        res.status(200).json({
            message: 'Dashboard obtido com sucesso',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                status: user.status,
                created_at: user.created_at
            },
            statistics: {
                instances: {
                    total: parseInt(instances.total) || 0,
                    active: parseInt(instances.active) || 0,
                    connecting: parseInt(instances.connecting) || 0,
                    pending: parseInt(instances.pending) || 0
                },
                contacts: {
                    total: parseInt(contacts.total) || 0
                },
                automations: {
                    total: parseInt(automations.total) || 0,
                    active: parseInt(automations.active) || 0,
                    paused: parseInt(automations.paused) || 0
                },
                messages: {
                    total: parseInt(messages.total) || 0,
                    incoming: parseInt(messages.incoming) || 0,
                    outgoing: parseInt(messages.outgoing) || 0,
                    period: '30 dias'
                }
            },
            recentInstances: recentInstances
        });

    } catch (error) {
        console.error('❌ Erro ao obter dashboard:', error.message);
        res.status(500).json({
            error: 'Erro ao obter dashboard',
            message: error.message
        });
    }
});

module.exports = router;
