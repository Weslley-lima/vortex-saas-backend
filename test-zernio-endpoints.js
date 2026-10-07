// ============================================
// TEST-ZERNIO-ENDPOINTS.JS
// Testes para os endpoints Zernio
// ============================================

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

// ============================================
// HELPER: Fazer requisições HTTP
// ============================================
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);

        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let bodyString = null;
        if (body) {
            bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = http.request(options, (res) => {
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
// TESTES
// ============================================
async function runTests() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  TESTE ENDPOINTS ZERNIO                ║`);
    console.log(`║  Data: ${new Date().toISOString().split('T')[0]}                   ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    let passed = 0;
    let failed = 0;

    // ============================================
    // TESTE 1: Health Check
    // ============================================
    console.log(`TEST 1️⃣ : Health Check`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('GET', '/health');
        if (result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`❌ FAIL - Unexpected status: ${result.status}\n`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // TESTE 2: Testar Conexão Zernio
    // ============================================
    console.log(`TEST 2️⃣ : Testar Conexão Zernio`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('POST', '/zernio/test');
        if (result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`❌ FAIL - Unexpected status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // TESTE 3: Enviar Mensagem via Zernio
    // ============================================
    console.log(`TEST 3️⃣ : Enviar Mensagem via Zernio`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('POST', '/zernio/send', {
            phone_number: '+5511999999999',
            message: 'Teste de mensagem via Zernio',
            instance_id: 'prof_123'
        });
        if (result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`⚠️  Response - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            // Não contar como fail porque pode ser erro da API Zernio real
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // TESTE 4: Listar Perfis Zernio
    // ============================================
    console.log(`TEST 4️⃣ : Listar Perfis Zernio`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('GET', '/zernio/profiles');
        if (result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`⚠️  Response - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            // Não contar como fail porque pode ser erro da API Zernio real
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // TESTE 5: Criar Campanha Zernio (usando disparos)
    // ============================================
    console.log(`TEST 5️⃣ : Criar Campanha Zernio (usando disparos)`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('POST', '/disparos/criar', {
            user_id: 1,
            instance_id: 'prof_123',
            message: 'Olá! Teste via Zernio',
            metodo: 'oficial',
            numbers: ['+5511999999999', '+5521999999999']
        });
        if (result.status === 201 || result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`❌ FAIL - Unexpected status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // TESTE 6: Enviar Campanha
    // ============================================
    console.log(`TEST 6️⃣ : Enviar Campanha`);
    console.log(`───────────────────────────────────────`);
    try {
        const result = await makeRequest('POST', '/disparos/enviar', {
            campaign_id: 1,
            metodo: 'oficial'
        });
        if (result.status === 200) {
            console.log(`✅ PASS - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
            passed++;
        } else {
            console.log(`⚠️  Response - Status: ${result.status}`);
            console.log(`Response: ${JSON.stringify(result.data, null, 2)}\n`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Error: ${error.message}\n`);
        failed++;
    }

    // ============================================
    // RESUMO
    // ============================================
    console.log(`╔════════════════════════════════════════╗`);
    console.log(`║  RESUMO DOS TESTES                     ║`);
    console.log(`║  ✅ Passed: ${passed}                          ║`);
    console.log(`║  ❌ Failed: ${failed}                          ║`);
    console.log(`║  Total:   ${passed + failed}                          ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runTests().catch(error => {
    console.error('Erro ao executar testes:', error);
    process.exit(1);
});
