// ============================================
// TESTE-ZERNIO.JS - Testar Integração com Zernio
// Descrição: Script para testar os endpoints da API antes de integrar com o backend
// Executar com: node teste-zernio.js
// ============================================

require('dotenv').config();
const axios = require('axios');

// ============================================
// CONFIGURAÇÃO
// ============================================
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL;

console.log('\n╔════════════════════════════════════════╗');
console.log('║  TESTE DE INTEGRAÇÃO COM ZERNIO       ║');
console.log('╚════════════════════════════════════════╝\n');

// Validar credenciais
if (!ZERNIO_API_KEY || !ZERNIO_BASE_URL) {
    console.error('❌ ERRO: ZERNIO_API_KEY ou ZERNIO_BASE_URL não configurados no .env');
    console.error('Verifique o arquivo .env\n');
    process.exit(1);
}

console.log(`📍 Base URL: ${ZERNIO_BASE_URL}`);
console.log(`🔑 API Key: ${ZERNIO_API_KEY.substring(0, 10)}...${ZERNIO_API_KEY.substring(-10)}\n`);

// Cliente Axios para Zernio
const zernioClient = axios.create({
    baseURL: ZERNIO_BASE_URL,
    headers: {
        'Authorization': `Bearer ${ZERNIO_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// ============================================
// TESTE 1: Criar Perfil
// ============================================
async function testarCriarPerfil() {
    try {
        console.log('\n📱 TESTE 1: Criar Perfil na Zernio');
        console.log('─'.repeat(40));

        const payload = {
            name: `Teste SaaS ${new Date().getTime()}`
        };

        console.log(`📤 POST /profiles`);
        console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));

        const response = await zernioClient.post('/profiles', payload);

        console.log(`\n✅ SUCESSO!`);
        console.log(`📋 Resposta:`, JSON.stringify(response.data, null, 2));

        // Extrair profile ID
        const profileId = response.data._id || response.data.profileId || response.data.id;
        console.log(`\n🎯 Profile ID obtido: ${profileId}`);

        return profileId;

    } catch (error) {
        console.error(`\n❌ ERRO ao criar perfil:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Dados:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`Mensagem: ${error.message}`);
        }
        return null;
    }
}

// ============================================
// TESTE 2: Obter URL de Autenticação
// ============================================
async function testarObterAuthUrl(profileId) {
    try {
        console.log('\n\n🔐 TESTE 2: Obter URL de Autenticação WhatsApp');
        console.log('─'.repeat(40));

        if (!profileId) {
            console.error('❌ Profile ID não disponível. Execute o Teste 1 primeiro.');
            return null;
        }

        console.log(`📤 GET /connect/whatsapp?profileId=${profileId}`);

        const response = await zernioClient.get('/connect/whatsapp', {
            params: {
                profileId: profileId
            }
        });

        console.log(`\n✅ SUCESSO!`);
        console.log(`📋 Resposta:`, JSON.stringify(response.data, null, 2));

        // Extrair Auth URL
        const authUrl = response.data.authUrl || response.data.auth_url || response.data.url;
        console.log(`\n🌐 Auth URL obtida:`);
        console.log(`${authUrl}`);

        return authUrl;

    } catch (error) {
        console.error(`\n❌ ERRO ao obter URL de autenticação:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Dados:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`Mensagem: ${error.message}`);
        }
        return null;
    }
}

// ============================================
// TESTE 3: Listar Contas Conectadas
// ============================================
async function testarListarContas() {
    try {
        console.log('\n\n📋 TESTE 3: Listar Contas Conectadas');
        console.log('─'.repeat(40));

        console.log(`📤 GET /accounts`);

        const response = await zernioClient.get('/accounts');

        console.log(`\n✅ SUCESSO!`);
        console.log(`📋 Resposta:`, JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.error(`\n❌ ERRO ao listar contas:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Dados:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`Mensagem: ${error.message}`);
        }
        return null;
    }
}

// ============================================
// EXECUTAR TESTES
// ============================================
async function executarTestes() {
    try {
        // Teste 1: Criar Perfil
        const profileId = await testarCriarPerfil();

        if (profileId) {
            // Teste 2: Obter URL de Autenticação
            const authUrl = await testarObterAuthUrl(profileId);

            if (authUrl) {
                console.log('\n\n✅ URLs para teste:');
                console.log(`1. Abra este link em um navegador para autenticar:`);
                console.log(`   ${authUrl}`);
            }
        }

        // Teste 3: Listar Contas
        await testarListarContas();

        console.log('\n\n╔════════════════════════════════════════╗');
        console.log('║  ✅ TESTES CONCLUÍDOS!                ║');
        console.log('║  Integração com Zernio funcionando 🎉 ║');
        console.log('╚════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

// Executar
executarTestes();
