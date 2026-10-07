// ============================================
// SERVER.JS - Servidor Express Principal
// Descrição: Inicializa o servidor Express com middlewares e rotas
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pg = require('pg');

// Importar rotas
const zernioRoutes = require('./routes/zernio');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const automationsRoutes = require('./routes/automations');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');

// Inicializar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// POOL DE CONEXÃO COM POSTGRESQL
// ============================================
const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Testar conexão com o banco de dados
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err);
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
    }
});

// Exportar pool para ser usado em outras rotas
app.locals.db = pool;

// ============================================
// MIDDLEWARES
// ============================================

// CORS - Permitir requisições do frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser - Parsear JSON
app.use(express.json());

// Body Parser - Parsear URL Encoded
app.use(express.urlencoded({ extended: true }));

// Middleware de Logging (opcional)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// ROTAS
// ============================================

// Rota de Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Servidor WhatsApp SaaS está funcionando! 🚀',
        timestamp: new Date().toISOString()
    });
});

// Rotas da Zernio (integração com WhatsApp)
app.use('/api', zernioRoutes);

// Rotas de Autenticação
app.use('/api/auth', authRoutes);

// Rotas de Dashboard
app.use('/api/dashboard', dashboardRoutes);

// Rotas de Automações
app.use('/api/automations', automationsRoutes);

// Rotas de Contatos
app.use('/api/contacts', contactsRoutes);

// Rotas de Mensagens
app.use('/api/messages', messagesRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// Rota não encontrada (404)
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        status: err.status || 500
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  WhatsApp SaaS Backend                ║`);
    console.log(`║  🚀 Servidor rodando em:              ║`);
    console.log(`║  http://localhost:${PORT}                    ║`);
    console.log(`║  Modo: ${process.env.NODE_ENV}                       ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
});

// ============================================
// TRATAMENTO DE ENCERRAMENTOS
// ============================================

process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando servidor...');
    pool.end(() => {
        console.log('✅ Conexão com banco de dados fechada.');
        process.exit(0);
    });
});

module.exports = app;
