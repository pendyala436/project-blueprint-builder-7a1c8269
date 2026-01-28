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
    
    // Try multiple common endpoints to detect service type
    const endpoints = [
      '/languages',           // LibreTranslate
      '/docs',                // FastAPI docs
      '/openapi.json',        // FastAPI OpenAPI spec
      '/',                    // Root
    ];
    
    const results: Record<string, any> = {};
    
    // Check root/docs first to identify service type
    try {
      const docsResponse = await fetch(`${baseUrl}/openapi.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (docsResponse.ok) {
        const openapi = await docsResponse.json();
        results.serviceType = openapi.info?.title || 'Unknown FastAPI';
        results.version = openapi.info?.version;
        results.endpoints = Object.keys(openapi.paths || {});
        
        // Extract supported languages from paths if available
        const paths = openapi.paths || {};
        const translateEndpoint = paths['/translate'] || paths['/v1/translate'];
        
        if (translateEndpoint) {
          results.hasTranslate = true;
        }
      }
    } catch (e) {
      console.log('OpenAPI spec not available');
    }
    
    // Try /languages endpoint
    try {
      const languagesResponse = await fetch(`${baseUrl}/languages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (languagesResponse.ok) {
        const languages = await languagesResponse.json();
        results.languages = Array.isArray(languages) 
          ? languages.map((lang: any) => ({ code: lang.code || lang, name: lang.name || lang }))
          : languages;
        results.totalLanguages = Array.isArray(languages) ? languages.length : 'unknown';
      }
    } catch (e) {
      console.log('/languages endpoint not available');
    }
    
    // Try root to get any info
    try {
      const rootResponse = await fetch(baseUrl, {
        method: 'GET',
      });
      
      if (rootResponse.ok) {
        const contentType = rootResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          results.rootInfo = await rootResponse.json();
        } else {
          results.rootStatus = rootResponse.status;
        }
      }
    } catch (e) {
      console.log('Root endpoint not available');
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
