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
    const baseUrl = url || 'http://194.163.175.245:8080';
    
    console.log(`Checking LibreTranslate at: ${baseUrl}`);
    
    // Try to get languages list
    const languagesResponse = await fetch(`${baseUrl}/languages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!languagesResponse.ok) {
      throw new Error(`Failed to fetch languages: ${languagesResponse.status}`);
    }
    
    const languages = await languagesResponse.json();
    
    console.log(`Found ${languages.length} languages`);
    
    // Extract language codes and names
    const languageList = languages.map((lang: any) => ({
      code: lang.code,
      name: lang.name,
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        baseUrl,
        totalLanguages: languages.length,
        languages: languageList,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking LibreTranslate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
