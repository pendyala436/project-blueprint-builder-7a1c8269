const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const baseUrl = url || 'http://194.163.175.245:8000';
    
    console.log(`Checking translation service at: ${baseUrl}`);
    
    const results: Record<string, any> = {};
    
    // Check OpenAPI spec for TWB-MT FastAPI
    try {
      const docsResponse = await fetch(`${baseUrl}/openapi.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (docsResponse.ok) {
        const openapi = await docsResponse.json();
        results.serviceType = openapi.info?.title || 'Unknown FastAPI';
        results.version = openapi.info?.version;
        results.description = openapi.info?.description;
        results.endpoints = Object.keys(openapi.paths || {});
        
        // Get full schemas to find language enums
        const schemas = openapi.components?.schemas || {};
        results.allSchemas = Object.keys(schemas);
        
        // Look for TranslationRequest schema
        if (schemas.TranslationRequest) {
          results.translationRequestSchema = schemas.TranslationRequest;
        }
        
        // Look for any language-related schemas
        for (const [name, schema] of Object.entries(schemas)) {
          if (name.toLowerCase().includes('lang') || 
              (schema as any).enum || 
              name === 'Language' ||
              name === 'src' ||
              name === 'tgt') {
            results[`schema_${name}`] = schema;
          }
        }
      }
    } catch (e) {
      console.log('OpenAPI spec error:', e);
    }
    
    // Try common language endpoints for TWB-MT
    const langEndpoints = ['/api/v1/languages', '/languages', '/api/languages', '/v1/languages'];
    for (const endpoint of langEndpoints) {
      try {
        const langResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (langResponse.ok) {
          const langData = await langResponse.json();
          results.languagesEndpoint = endpoint;
          results.languages = langData;
          results.totalLanguages = Array.isArray(langData) ? langData.length : 
                                   (typeof langData === 'object' ? Object.keys(langData).length : 'unknown');
          break;
        }
      } catch (e) {
        // Continue to next endpoint
      }
    }
    
    // Try a test translation with correct TWB-MT params (src/tgt instead of source/target)
    try {
      const testResponse = await fetch(`${baseUrl}/api/v1/translate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: 'Hello, how are you?',
          src: 'eng',
          tgt: 'hin'
        }),
      });
      
      const testData = await testResponse.json();
      results.testTranslation = {
        status: testResponse.status,
        response: testData
      };
    } catch (e) {
      console.log('Test translation error:', e);
    }
    
    // Test different language codes to find supported ones
    const testLangPairs = [
      { src: 'en', tgt: 'hi' },
      { src: 'eng', tgt: 'hin' },
      { src: 'en', tgt: 'es' },
      { src: 'eng', tgt: 'spa' },
      { src: 'en', tgt: 'te' },
      { src: 'eng', tgt: 'tel' },
      { src: 'en', tgt: 'ta' },
      { src: 'eng', tgt: 'tam' },
    ];
    
    results.languageTests = [];
    for (const pair of testLangPairs) {
      try {
        const testResp = await fetch(`${baseUrl}/api/v1/translate/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Hello', ...pair }),
        });
        const testResult = await testResp.json();
        results.languageTests.push({
          pair,
          status: testResp.status,
          success: testResp.ok,
          translation: testResp.ok ? testResult.translation : testResult.detail?.[0]?.msg
        });
      } catch (e) {
        results.languageTests.push({ pair, error: String(e) });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        baseUrl,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking translation service:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
