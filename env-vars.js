// env-vars.js - Fonction Netlify simple
// À créer directement à la racine du projet (même niveau que config.js)

exports.handler = async (event, context) => {
  console.log('🔧 Fonction env-vars appelée depuis la racine');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Variables:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });

    if (!supabaseKey) {
      return {
        statusCode: 200,
        headers,
        body: `console.error('❌ VITE_SUPABASE_ANON_KEY manquante dans Netlify !');`
      };
    }

    const jsCode = `
console.log('🌐 Variables chargées via fonction Netlify');
window.NETLIFY_ENV = {
  VITE_SUPABASE_URL: '${supabaseUrl || 'https://oxyiamruvyliueecpaam.supabase.co'}',
  VITE_SUPABASE_ANON_KEY: '${supabaseKey.replace(/'/g, "\\'")}'
};
console.log('✅ Clé chargée, longueur:', window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY.length);
`;

    return { statusCode: 200, headers, body: jsCode };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: `console.error('❌ Erreur fonction:', '${error.message}');`
    };
  }
};
