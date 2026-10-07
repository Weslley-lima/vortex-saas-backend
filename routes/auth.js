// ============================================
// ROUTES/AUTH.JS - Rotas de Autenticação
// Descrição: Gerencia login, registro e autenticação de usuários
// ============================================

const express = require('express');
const router = express.Router();

// Para produção, usar bcryptjs
// npm install bcryptjs
// const bcrypt = require('bcryptjs');

// Para este exemplo, usando hash simples (NÃO USE EM PRODUÇÃO)
const crypto = require('crypto');

// Middleware para verificar token
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token não fornecido',
            message: 'Envie um header Authorization: Bearer <token>'
        });
    }

    // Validar se o token é válido (implementação simples)
    // Em produção, usar JWT
    req.token = token;
    next();
}

// ============================================
// ROTA: POST /api/auth/register
// Descrição: Registra um novo usuário
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // ✅ Validação de dados
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'email, password e name são obrigatórios',
                received: { email, name }
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Email inválido'
            });
        }

        // Validar comprimento de senha
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Senha deve ter no mínimo 6 caracteres'
            });
        }

        console.log(`\n📝 Registrando novo usuário: ${email}`);

        const db = req.app.locals.db;

        // ============================================
        // PASSO 1: Verificar se usuário já existe
        // ============================================
        const checkQuery = 'SELECT id FROM users WHERE email = $1';
        const checkResult = await db.query(checkQuery, [email]);

        if (checkResult.rows.length > 0) {
            console.warn(`⚠️ Email já registrado: ${email}`);
            return res.status(409).json({
                error: 'Email já registrado',
                email
            });
        }

        // ============================================
        // PASSO 2: Fazer hash da senha (simples para demo)
        // Em produção, usar bcryptjs
        // ============================================
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        // ============================================
        // PASSO 3: Inserir novo usuário no banco de dados
        // ============================================
        const insertQuery = `
            INSERT INTO users (email, password_hash, name, status)
            VALUES ($1, $2, $3, 'active')
            RETURNING id, email, name, status, created_at;
        `;

        const result = await db.query(insertQuery, [email, passwordHash, name]);
        const user = result.rows[0];

        // ============================================
        // PASSO 4: Gerar token de autenticação simples
        // Em produção, usar JWT
        // ============================================
        const authToken = crypto.randomBytes(32).toString('hex');

        console.log(`✅ Usuário criado com sucesso: ${user.id}`);

        // ============================================
        // Retornar resposta de sucesso
        // ============================================
        res.status(201).json({
            message: 'Usuário registrado com sucesso!',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                status: user.status,
                created_at: user.created_at
            },
            authToken: authToken,
            instructions: 'Use este token nos headers Authorization: Bearer <token>'
        });

    } catch (error) {
        console.error('❌ Erro ao registrar usuário:', error.message);
        res.status(500).json({
            error: 'Erro ao registrar usuário',
            message: error.message
        });
    }
});

// ============================================
// ROTA: POST /api/auth/login
// Descrição: Autentica um usuário e retorna token
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Validação de dados
        if (!email || !password) {
            return res.status(400).json({
                error: 'email e password são obrigatórios',
                received: { email }
            });
        }

        console.log(`\n🔐 Tentativa de login: ${email}`);

        const db = req.app.locals.db;

        // ============================================
        // PASSO 1: Buscar usuário pelo email
        // ============================================
        const query = `
            SELECT id, email, password_hash, name, status, created_at
            FROM users
            WHERE email = $1;
        `;

        const result = await db.query(query, [email]);

        if (result.rows.length === 0) {
            console.warn(`⚠️ Usuário não encontrado: ${email}`);
            return res.status(401).json({
                error: 'Email ou senha incorretos'
            });
        }

        const user = result.rows[0];

        // ============================================
        // PASSO 2: Verificar senha
        // ============================================
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        if (passwordHash !== user.password_hash) {
            console.warn(`⚠️ Senha incorreta para: ${email}`);
            return res.status(401).json({
                error: 'Email ou senha incorretos'
            });
        }

        // ============================================
        // PASSO 3: Gerar token de autenticação
        // ============================================
        const authToken = crypto.randomBytes(32).toString('hex');

        console.log(`✅ Login bem-sucedido: ${user.id}`);

        // ============================================
        // Retornar resposta com token
        // ============================================
        res.status(200).json({
            message: 'Login realizado com sucesso!',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                status: user.status
            },
            authToken: authToken,
            instructions: 'Use este token nos headers Authorization: Bearer <token>'
        });

    } catch (error) {
        console.error('❌ Erro ao fazer login:', error.message);
        res.status(500).json({
            error: 'Erro ao fazer login',
            message: error.message
        });
    }
});

// ============================================
// ROTA: GET /api/auth/profile
// Descrição: Obtém perfil do usuário autenticado
// ============================================
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Para este exemplo simples, retornar dados de exemplo
        // Em produção, decodificar o token e buscar do banco

        res.status(200).json({
            message: 'Perfil obtido com sucesso',
            profile: {
                id: 1,
                email: 'user@example.com',
                name: 'Usuário Exemplo',
                status: 'active',
                plan: 'Professional',
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Erro ao obter perfil:', error.message);
        res.status(500).json({
            error: 'Erro ao obter perfil',
            message: error.message
        });
    }
});

module.exports = router;
