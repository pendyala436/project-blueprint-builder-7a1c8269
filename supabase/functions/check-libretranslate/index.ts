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
    
    // Get OpenAPI spec
    const openapiResponse = await fetch(`${baseUrl}/openapi.json`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!openapiResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch OpenAPI spec: ${openapiResponse.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const openapi = await openapiResponse.json();
    
    // Extract all relevant info
    const result = {
      success: true,
      serviceInfo: {
        title: openapi.info?.title,
        version: openapi.info?.version,
        description: openapi.info?.description,
      },
      endpoints: Object.keys(openapi.paths || {}),
      schemas: openapi.components?.schemas || {},
      fullSpec: openapi, // Return full spec for inspection
    };
    
    return new Response(
      JSON.stringify(result, null, 2),
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
