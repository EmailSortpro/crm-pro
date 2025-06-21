// env-vars.js - Fonction Netlify pour exposer les variables d'environnement
// À placer à la racine du projet

exports.handler = async (event, context) => {
  console.log('🔧 Fonction env-vars appelée');
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Récupérer les variables d'environnement depuis Netlify
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 Variables trouvées:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      keyLength: supabaseKey?.length || 0
    });

    // Vérifier que la clé principale existe
    if (!supabaseKey) {
      console.error('❌ VITE_SUPABASE_ANON_KEY manquante !');
      
      const errorJs = `
console.error('❌ Variables Netlify non configurées !');
console.error('🚨 VITE_SUPABASE_ANON_KEY manquante dans les variables d\\'environnement Netlify');
console.log('📝 Pour configurer :');
console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
console.log('2. Ajouter : VITE_SUPABASE_ANON_KEY = votre_cle_supabase');
console.log('3. Redéployer le site');
window.NETLIFY_ENV_ERROR = 'Variables manquantes';
`;
      
      return {
        statusCode: 200, // 200 pour éviter les erreurs CORS
        headers,
        body: errorJs
      };
    }

    // Générer le JavaScript qui injecte les variables
    const jsResponse = `
// 🌐 Variables d'environnement Netlify via fonction
console.log('🔧 Injection des variables via fonction Netlify...');

window.NETLIFY_ENV = {
  VITE_SUPABASE_URL: '${supabaseUrl || 'https://oxyiamruvyliueecpaam.supabase.co'}',
  VITE_SUPABASE_ANON_KEY: '${supabaseKey.replace(/'/g, "\\'")}'
};

console.log('✅ Variables Netlify injectées via fonction:', {
  hasUrl: !!window.NETLIFY_ENV.VITE_SUPABASE_URL,
  hasKey: !!window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY,
  keyLength: window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY?.length || 0,
  source: 'netlify-function'
});
`;

    console.log('✅ Fonction réussie, clé de longueur:', supabaseKey.length);

    return {
      statusCode: 200,
      headers,
      body: jsResponse
    };

  } catch (error) {
    console.error('❌ Erreur dans la fonction env-vars:', error);
    
    const errorJs = `
console.error('❌ Erreur dans la fonction Netlify env-vars:', '${error.message}');
window.NETLIFY_ENV_ERROR = '${error.message}';
`;
    
    return {
      statusCode: 200, // 200 pour éviter les erreurs CORS
      headers,
      body: errorJs
    };
  }
};
