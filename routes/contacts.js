// ============================================
// ROUTES/CONTACTS.JS - Rotas de Contatos
// Descrição: Gerencia contatos de usuários
// ============================================

const express = require('express');
const router = express.Router();

// ============================================
// ROTA: POST /api/contacts
// Descrição: Cria um novo contato
// ============================================
router.post('/', async (req, res) => {
    try {
        const { user_id, phone_number, contact_name, email } = req.body;

        // ✅ Validação de dados
        if (!user_id || !phone_number || !contact_name) {
            return res.status(400).json({
                error: 'user_id, phone_number e contact_name são obrigatórios',
                received: { user_id, phone_number, contact_name }
            });
        }

        console.log(`\n👤 Criando contato: ${contact_name} (${phone_number}) para usuário ${user_id}`);

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
        // PASSO 2: Verificar se contato já existe
        // ============================================
        const checkQuery = `
            SELECT id FROM contacts
            WHERE user_id = $1 AND phone_number = $2
        `;
        const checkResult = await db.query(checkQuery, [user_id, phone_number]);

        if (checkResult.rows.length > 0) {
            console.warn(`⚠️ Contato já existe: ${phone_number}`);
            return res.status(409).json({
                error: 'Contato com este número já existe',
                phone_number
            });
        }

        // ============================================
        // PASSO 3: Inserir contato no banco de dados
        // ============================================
        const insertQuery = `
            INSERT INTO contacts (user_id, phone_number, contact_name, email, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING id, user_id, phone_number, contact_name, email, status, created_at;
        `;

        const result = await db.query(insertQuery, [
            user_id,
            phone_number,
            contact_name,
            email || null
        ]);

        const contact = result.rows[0];

        console.log(`✅ Contato criado com sucesso: ${contact.id}`);

        // ============================================
        // Retornar resposta de sucesso
        // ============================================
        res.status(201).json({
            message: 'Contato criado com sucesso!',
            contact: {
                id: contact.id,
                user_id: contact.user_id,
                phone_number: contact.phone_number,
                contact_name: contact.contact_name,
                email: contact.email,
                status: contact.status,
                created_at: contact.created_at
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar contato:', error.message);
        res.status(500).json({
            error: 'Erro ao criar contato',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/contacts
// Descrição: Lista todos os contatos de um usuário
// ============================================
router.get('/', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                error: 'user_id é obrigatório'
            });
        }

        console.log(`\n📋 Listando contatos para usuário: ${user_id}`);

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, phone_number, contact_name, email, status, last_message_at, created_at, updated_at
            FROM contacts
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;

        const result = await db.query(query, [user_id]);

        console.log(`✅ ${result.rows.length} contatos encontrados`);

        res.status(200).json({
            message: 'Contatos listados com sucesso',
            total: result.rows.length,
            contacts: result.rows
        });

    } catch (error) {
        console.error('❌ Erro ao listar contatos:', error.message);
        res.status(500).json({
            error: 'Erro ao listar contatos',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/contacts/:contact_id
// Descrição: Obtém detalhes de um contato
// ============================================
router.get('/:contact_id', async (req, res) => {
    try {
        const { contact_id } = req.params;

        const db = req.app.locals.db;

        const query = `
            SELECT id, user_id, phone_number, contact_name, email, status, last_message_at, metadata, created_at, updated_at
            FROM contacts
            WHERE id = $1;
        `;

        const result = await db.query(query, [contact_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Contato não encontrado',
                contact_id
            });
        }

        const contact = result.rows[0];

        res.status(200).json({
            message: 'Contato obtido com sucesso',
            contact
        });

    } catch (error) {
        console.error('❌ Erro ao obter contato:', error.message);
        res.status(500).json({
            error: 'Erro ao obter contato',
            message: error.message
        });
    }
});

// ============================================
// ROTA: PUT /api/contacts/:contact_id
// Descrição: Atualiza um contato
// ============================================
router.put('/:contact_id', async (req, res) => {
    try {
        const { contact_id } = req.params;
        const { contact_name, email, status } = req.body;

        const db = req.app.locals.db;

        const updateQuery = `
            UPDATE contacts
            SET contact_name = COALESCE($1, contact_name),
                email = COALESCE($2, email),
                status = COALESCE($3, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, phone_number, contact_name, email, status, updated_at;
        `;

        const result = await db.query(updateQuery, [
            contact_name,
            email,
            status,
            contact_id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Contato não encontrado',
                contact_id
            });
        }

        const contact = result.rows[0];

        console.log(`✅ Contato atualizado: ${contact.id}`);

        res.status(200).json({
            message: 'Contato atualizado com sucesso',
            contact
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar contato:', error.message);
        res.status(500).json({
            error: 'Erro ao atualizar contato',
            message: error.message
        });
    }
});

// ============================================
// ROTA: DELETE /api/contacts/:contact_id
// Descrição: Deleta um contato
// ============================================
router.delete('/:contact_id', async (req, res) => {
    try {
        const { contact_id } = req.params;

        const db = req.app.locals.db;

        const deleteQuery = `
            DELETE FROM contacts
            WHERE id = $1
            RETURNING id, contact_name, phone_number;
        `;

        const result = await db.query(deleteQuery, [contact_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Contato não encontrado',
                contact_id
            });
        }

        const contact = result.rows[0];

        console.log(`✅ Contato deletado: ${contact.id}`);

        res.status(200).json({
            message: 'Contato deletado com sucesso',
            contact
        });

    } catch (error) {
        console.error('❌ Erro ao deletar contato:', error.message);
        res.status(500).json({
            error: 'Erro ao deletar contato',
            message: error.message
        });
    }
});

module.exports = router;
