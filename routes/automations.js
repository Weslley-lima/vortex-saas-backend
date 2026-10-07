// ============================================
// ROUTES/AUTOMATIONS.JS - Rotas de Automações/Flows
// Descrição: Gerencia automações e fluxos de mensagens
// ============================================

const express = require('express');
const router = express.Router();

// ============================================
// ROTA: POST /api/automations
// Descrição: Cria uma nova automação
// ============================================
router.post('/', async (req, res) => {
    try {
        const { user_id, automation_name, trigger_type, action_type, flow_data } = req.body;

        // ✅ Validação de dados
        if (!user_id || !automation_name || !trigger_type || !action_type) {
            return res.status(400).json({
                error: 'user_id, automation_name, trigger_type e action_type são obrigatórios',
                received: { user_id, automation_name, trigger_type, action_type }
            });
        }

        console.log(`\n⚙️ Criando automação: ${automation_name} para usuário ${user_id}`);

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
        // PASSO 2: Inserir automação no banco de dados
        // ============================================
        const insertQuery = `
            INSERT INTO automations (user_id, automation_name, trigger_type, action_type, flow_data, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING id, user_id, automation_name, trigger_type, action_type, status, created_at;
        `;

        const metadata = JSON.stringify(flow_data || {});

        const result = await db.query(insertQuery, [
            user_id,
            automation_name,
            trigger_type,
            action_type,
            metadata
        ]);

        const automation = result.rows[0];

        console.log(`✅ Automação criada com sucesso: ${automation.id}`);

        // ============================================
        // Retornar resposta de sucesso
        // ============================================
        res.status(201).json({
            message: 'Automação criada com sucesso!',
            automation: {
                id: automation.id,
                user_id: automation.user_id,
                automation_name: automation.automation_name,
                trigger_type: automation.trigger_type,
                action_type: automation.action_type,
                status: automation.status,
                created_at: automation.created_at
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar automação:', error.message);
        res.status(500).json({
            error: 'Erro ao criar automação',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/automations
// Descrição: Lista todas as automações de um usuário
// ============================================
router.get('/', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        console.log(`\n📋 Listando automações para usuário: ${user_id}`);

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, automation_name, trigger_type, action_type, status, created_at, updated_at
            FROM automations
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query, [user_id]);

        console.log(`✅ ${result.rows.length} automações encontradas`);

        res.status(200).json({
            message: 'Automações listadas com sucesso',
            total: result.rows.length,
            automations: result.rows
        });

    } catch (error) {
        console.error('❌ Erro ao listar automações:', error.message);
        res.status(500).json({
            error: 'Erro ao listar automações',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/automations/:automation_id
// Descrição: Obtém detalhes de uma automação
// ============================================
router.get('/:automation_id', async (req, res) => {
    try {
        const { automation_id } = req.params;

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, automation_name, trigger_type, action_type, flow_data, status, created_at, updated_at
            FROM automations
            WHERE id = $1;
        `;

        const result = await db.query(query, [automation_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Automação não encontrada',
                automation_id
            });
        }

        const automation = result.rows[0];

        res.status(200).json({
            message: 'Automação obtida com sucesso',
            automation
        });

    } catch (error) {
        console.error('❌ Erro ao obter automação:', error.message);
        res.status(500).json({
            error: 'Erro ao obter automação',
            message: error.message
        });
    }
});

// ============================================
// ROTA: PUT /api/automations/:automation_id
// Descrição: Atualiza uma automação
// ============================================
router.put('/:automation_id', async (req, res) => {
    try {
        const { automation_id } = req.params;
        const { automation_name, trigger_type, action_type, status, flow_data } = req.body;

        const db = req.app.locals.db;

        const updateQuery = `
            UPDATE automations
            SET automation_name = COALESCE($1, automation_name),
                trigger_type = COALESCE($2, trigger_type),
                action_type = COALESCE($3, action_type),
                status = COALESCE($4, status),
                flow_data = COALESCE($5, flow_data),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING id, automation_name, trigger_type, action_type, status, updated_at;
        `;

        const metadata = flow_data ? JSON.stringify(flow_data) : null;

        const result = await db.query(updateQuery, [
            automation_name,
            trigger_type,
            action_type,
            status,
            metadata,
            automation_id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Automação não encontrada',
                automation_id
            });
        }

        const automation = result.rows[0];

        console.log(`✅ Automação atualizada: ${automation.id}`);

        res.status(200).json({
            message: 'Automação atualizada com sucesso',
            automation
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar automação:', error.message);
        res.status(500).json({
            error: 'Erro ao atualizar automação',
            message: error.message
        });
    }
});

// ============================================
// ROTA: DELETE /api/automations/:automation_id
// Descrição: Deleta uma automação
// ============================================
router.delete('/:automation_id', async (req, res) => {
    try {
        const { automation_id } = req.params;

        const db = req.app.locals.db;

        const deleteQuery = `
            DELETE FROM automations
            WHERE id = $1
            RETURNING id, automation_name;
        `;

        const result = await db.query(deleteQuery, [automation_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Automação não encontrada',
                automation_id
            });
        }

        const automation = result.rows[0];

        console.log(`✅ Automação deletada: ${automation.id}`);

        res.status(200).json({
            message: 'Automação deletada com sucesso',
            automation
        });

    } catch (error) {
        console.error('❌ Erro ao deletar automação:', error.message);
        res.status(500).json({
            error: 'Erro ao deletar automação',
            message: error.message
        });
    }
});

module.exports = router;
