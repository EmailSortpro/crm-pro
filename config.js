// ===================================
// CRM PRO - CONFIGURATION MIXTE
// Netlify functions + CRMService complet
// ===================================

console.log('🚀 CRM Pro - Initialisation...');

// Configuration par défaut (SANS CLÉS SENSIBLES)
const DEFAULT_CONFIG = {
    SUPABASE_URL: 'https://oxyiamruvyliueecpaam.supabase.co',
    SUPABASE_ANON_KEY: '' // ❌ JAMAIS de clé en dur
};

// Détection de l'environnement
function detectEnvironment() {
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return {
        hostname,
        isNetlify,
        isLocalhost,
        type: isNetlify ? 'netlify' : isLocalhost ? 'localhost' : 'production'
    };
}

// Chargement des variables via fonction Netlify
async function loadNetlifyEnvVars() {
    try {
        console.log('🔧 Chargement variables via fonction Netlify...');
        
        const response = await fetch('/.netlify/functions/env-vars');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const jsCode = await response.text();
        
        // Vérifier que c'est du JavaScript, pas du HTML
        if (jsCode.trim().startsWith('<')) {
            throw new Error('Réponse HTML reçue au lieu de JavaScript - fonction non trouvée');
        }
        
        eval(jsCode);
        
        if (window.NETLIFY_ENV && window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY) {
            console.log('✅ Variables Netlify chargées avec succès');
            return {
                SUPABASE_URL: window.NETLIFY_ENV.VITE_SUPABASE_URL || DEFAULT_CONFIG.SUPABASE_URL,
                SUPABASE_ANON_KEY: window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY
            };
        } else {
            throw new Error('Variables non trouvées dans la réponse');
        }
        
    } catch (error) {
        console.warn('⚠️ Erreur chargement fonction Netlify:', error.message);
        return null;
    }
}

// Récupération unifiée de la configuration
async function getConfig() {
    const env = detectEnvironment();
    let config = { ...DEFAULT_CONFIG };
    let source = 'default';
    
    console.log('🔍 Environnement détecté:', env);
    
    // 1. Variables déjà injectées via window.NETLIFY_ENV (priorité 1)
    if (window.NETLIFY_ENV?.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.NETLIFY_ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        source = 'netlify-preloaded';
        console.log('✅ Configuration via variables Netlify pré-chargées');
    }
    // 2. Essayer de charger via fonction Netlify
    else if (env.isNetlify) {
        const netlifyConfig = await loadNetlifyEnvVars();
        if (netlifyConfig) {
            config = { ...config, ...netlifyConfig };
            source = 'netlify-function';
        }
    }
    // 3. Fallback localStorage pour développement local
    else if (env.isLocalhost) {
        try {
            const stored = localStorage.getItem('crmConfig');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.SUPABASE_ANON_KEY) {
                    config.SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY;
                    config.SUPABASE_URL = parsed.SUPABASE_URL || config.SUPABASE_URL;
                    source = 'localStorage';
                    console.log('✅ Configuration via localStorage');
                }
            }
        } catch (e) {
            console.warn('⚠️ Erreur localStorage:', e.message);
        }
    }
    
    return { config, source, env };
}

// ===================================
// CLIENT SUPABASE
// ===================================

let supabaseClient = null;
let isInitialized = false;
let APP_CONFIG = null;
let CONFIG_SOURCE = null;
let ENV_INFO = null;

async function initializeSupabase() {
    if (supabaseClient && isInitialized) {
        return supabaseClient;
    }
    
    try {
        console.log('🔧 Initialisation Supabase...');
        
        // Charger la configuration si pas déjà fait
        if (!APP_CONFIG) {
            const configData = await getConfig();
            APP_CONFIG = configData.config;
            CONFIG_SOURCE = configData.source;
            ENV_INFO = configData.env;
        }
        
        // Vérifier que la librairie est chargée
        if (!window.supabase) {
            console.log('⏳ Attente de la librairie Supabase...');
            let attempts = 0;
            while (!window.supabase && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.supabase) {
                throw new Error('Librairie Supabase non disponible');
            }
        }
        
        // Vérifier la configuration
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Clé Supabase manquante - vérifiez les variables d\'environnement Netlify');
        }
        
        // Validation basique : clé non vide et ne contenant pas de placeholders
        if (APP_CONFIG.SUPABASE_ANON_KEY.includes('%') || APP_CONFIG.SUPABASE_ANON_KEY.trim().length === 0) {
            throw new Error('Clé Supabase invalide - contient des placeholders ou est vide');
        }
        
        console.log('🔑 Clé API info:', {
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0,
            keyPreview: APP_CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...' + APP_CONFIG.SUPABASE_ANON_KEY?.slice(-10)
        });
        
        // Créer le client
        supabaseClient = window.supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );
        
        // Test de connexion simple
        try {
            const { error } = await supabaseClient.auth.getSession();
            if (error && error.message.includes('Invalid API key')) {
                throw new Error('Clé API Supabase invalide selon le serveur');
            }
        } catch (testError) {
            console.warn('⚠️ Test de connexion échoué:', testError.message);
        }
        
        isInitialized = true;
        console.log('✅ Supabase initialisé avec succès');
        console.log('📊 Configuration:', {
            source: CONFIG_SOURCE,
            environment: ENV_INFO.type,
            url: APP_CONFIG.SUPABASE_URL,
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0
        });
        
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Erreur Supabase:', error.message);
        supabaseClient = null;
        isInitialized = false;
        
        // Instructions de debug améliorées
        if (!APP_CONFIG?.SUPABASE_ANON_KEY) {
            console.group('🚨 CONFIGURATION REQUISE');
            console.error('❌ Clé Supabase manquante !');
            console.log('🌐 SOLUTION NETLIFY:');
            console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
            console.log('2. Ajouter: VITE_SUPABASE_ANON_KEY = votre_cle_supabase');
            console.log('3. Redéployer le site');
            console.log('🔑 Clé Supabase: supabase.com → projet → Settings → API → clé "anon"');
            console.groupEnd();
        } else if (APP_CONFIG.SUPABASE_ANON_KEY.includes('%')) {
            console.group('🚨 PROBLÈME DE SUBSTITUTION');
            console.error('❌ Variables Netlify non substituées !');
            console.log('🔧 La clé contient encore des % - vérifiez le déploiement');
            console.log('📝 Clé reçue:', APP_CONFIG.SUPABASE_ANON_KEY);
            console.groupEnd();
        }
        
        throw error;
    }
}

// ===================================
// SERVICES AUTHENTIFICATION
// ===================================

class AuthService {
    static async getClient() {
        if (!supabaseClient) {
            await initializeSupabase();
        }
        return supabaseClient;
    }
    
    static async getCurrentUser() {
        try {
            const client = await this.getClient();
            const { data: { user }, error } = await client.auth.getUser();
            return error ? null : user;
        } catch (error) {
            console.warn('⚠️ Erreur getCurrentUser:', error.message);
            return null;
        }
    }
    
    static async requireAuth() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.log('🔒 Authentification requise - redirection');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Erreur requireAuth:', error.message);
            window.location.href = 'login.html';
            return false;
        }
    }
    
    static async login(email, password) {
        try {
            const client = await this.getClient();
            
            const { data, error } = await client.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
            
            if (error) throw error;
            
            // Sauvegarder les infos utilisateur
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || 'user',
                    created_at: data.user.created_at
                };
                
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('✅ Connexion réussie:', data.user.email);
            }
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Erreur login:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async logout() {
        try {
            const client = await this.getClient();
            await client.auth.signOut();
            localStorage.removeItem('userInfo');
            console.log('✅ Déconnexion réussie');
        } catch (error) {
            console.warn('⚠️ Erreur logout:', error.message);
        } finally {
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        }
    }
    
    static getUserInfo() {
        try {
            const stored = localStorage.getItem('userInfo');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('⚠️ Erreur getUserInfo:', error.message);
            return null;
        }
    }
    
    static isAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo?.role === 'admin';
    }
}

// ===================================
// SERVICE DE DONNÉES CRM (COMPLET)
// ===================================

class CRMService {
    static async getClient() {
        if (!supabaseClient) {
            await initializeSupabase();
        }
        return supabaseClient;
    }
    
    // Méthode utilitaire pour les logs
    static log(action, data = null) {
        console.log(`🔄 CRM Service - ${action}`, data ? data : '');
    }

    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            this.log('Récupération des sociétés');
            
            const client = await this.getClient();
            const { data, error } = await client
                .from('companies')
                .select(`
                    *,
                    company_contacts (
                        id,
                        first_name,
                        last_name,
                        email,
                        position,
                        phone,
                        contact_type,
                        is_admin_contact,
                        is_payment_contact,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erreur Supabase getCompanies:', error);
                throw error;
            }
            
            this.log('Sociétés récupérées', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération sociétés:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCompany(companyData) {
        try {
            this.log('Création société', companyData);
            
            const client = await this.getClient();
            
            // Valider les données
            if (!companyData.name) {
                throw new Error('Le nom de la société est obligatoire');
            }
            
            const { data, error } = await client
                .from('companies')
                .insert([{
                    ...companyData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) {
                console.error('❌ Erreur création société:', error);
                throw error;
            }
            
            this.log('Société créée avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            this.log('Mise à jour société', { id, data: companyData });
            
            const client = await this.getClient();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            const { data, error } = await client
                .from('companies')
                .update({
                    ...companyData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) {
                console.error('❌ Erreur mise à jour société:', error);
                throw error;
            }
            
            if (!data || data.length === 0) {
                throw new Error('Société non trouvée');
            }
            
            this.log('Société mise à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            this.log('Suppression société', { id });
            
            const client = await this.getClient();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            // Vérifier s'il y a des licences associées
            const { data: licenses } = await client
                .from('company_licenses')
                .select('id')
                .eq('company_id', id);
                
            if (licenses && licenses.length > 0) {
                throw new Error('Impossible de supprimer une société qui a des licences actives');
            }
            
            const { error } = await client
                .from('companies')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression société:', error);
                throw error;
            }
            
            this.log('Société supprimée avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression société:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== CONTACTS ==========
    
    static async getContacts(companyId = null) {
        try {
            this.log('Récupération des contacts', { companyId });
            
            const client = await this.getClient();
            
            let query = client
                .from('company_contacts')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Erreur Supabase getContacts:', error);
                throw error;
            }
            
            this.log('Contacts récupérés', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération contacts:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            this.log('Création contact', contactData);
            
            const client = await this.getClient();

            // Valider les données
            if (!contactData.company_id || !contactData.first_name || !contactData.last_name) {
                throw new Error('Société, prénom et nom sont obligatoires');
            }
            
            const { data, error } = await client
                .from('company_contacts')
                .insert([{
                    ...contactData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) {
                console.error('❌ Erreur création contact:', error);
                throw error;
            }
            
            this.log('Contact créé avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            this.log('Mise à jour contact', { id, data: contactData });
            
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('company_contacts')
                .update({
                    ...contactData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) {
                console.error('❌ Erreur mise à jour contact:', error);
                throw error;
            }
            
            this.log('Contact mis à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            this.log('Suppression contact', { id });
            
            const client = await this.getClient();
            
            const { error } = await client
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression contact:', error);
                throw error;
            }
            
            this.log('Contact supprimé avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== LICENCES ==========
    
    static async getLicenses() {
        try {
            this.log('Récupération des licences');
            
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('company_licenses')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erreur Supabase getLicenses:', error);
                throw error;
            }
            
            this.log('Licences récupérées', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération licences:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicense(licenseData) {
        try {
            this.log('Création licence', licenseData);
            
            const client = await this.getClient();

            // Valider les données
            if (!licenseData.company_id || !licenseData.plan_id || !licenseData.license_count) {
                throw new Error('Société, plan et nombre de licences sont obligatoires');
            }
            
            const { data, error } = await client
                .from('company_licenses')
                .insert([{
                    ...licenseData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur création licence:', error);
                throw error;
            }
            
            this.log('Licence créée avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLicense(id, licenseData) {
        try {
            this.log('Mise à jour licence', { id, data: licenseData });
            
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('company_licenses')
                .update({
                    ...licenseData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur mise à jour licence:', error);
                throw error;
            }
            
            this.log('Licence mise à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicense(id) {
        try {
            this.log('Suppression licence', { id });
            
            const client = await this.getClient();
            
            // Supprimer d'abord les utilisateurs associés
            await client
                .from('license_users')
                .delete()
                .eq('company_license_id', id);
            
            const { error } = await client
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression licence:', error);
                throw error;
            }
            
            this.log('Licence supprimée avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicensePlans() {
        try {
            this.log('Récupération des plans de licence');
            
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) {
                console.error('❌ Erreur Supabase getLicensePlans:', error);
                throw error;
            }
            
            this.log('Plans de licence récupérés', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération plans de licence:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== UTILISATEURS DE LICENCE ==========
    
    static async getLicenseUsers(licenseId) {
        try {
            this.log('Récupération utilisateurs licence', { licenseId });
            
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('license_users')
                .select(`
                    *,
                    company_contacts (
                        id,
                        first_name,
                        last_name,
                        email,
                        position,
                        phone
                    )
                `)
                .eq('company_license_id', licenseId)
                .eq('is_active', true)
                .order('activated_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erreur récupération utilisateurs licence:', error);
                throw error;
            }
            
            // Transformer les données pour l'affichage
            const users = data.map(user => ({
                id: user.id,
                license_id: licenseId,
                contact_id: user.contact_id,
                first_name: user.company_contacts?.first_name || 'Prénom',
                last_name: user.company_contacts?.last_name || 'Nom',
                email: user.company_contacts?.email || 'email@inconnu.com',
                position: user.company_contacts?.position || null,
                phone: user.company_contacts?.phone || null,
                is_active: user.is_active,
                activated_at: user.activated_at,
                status: user.is_active ? 'active' : 'inactive'
            }));
            
            this.log('Utilisateurs licence récupérés', `${users.length} entrées`);
            return { success: true, data: users };
        } catch (error) {
            console.error('❌ Erreur récupération utilisateurs licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicenseUser(licenseId, contactId) {
        try {
            this.log('Création utilisateur licence', { licenseId, contactId });
            
            const client = await this.getClient();
            
            // Vérifier que le contact existe
            const { data: contact, error: contactError } = await client
                .from('company_contacts')
                .select('*')
                .eq('id', contactId)
                .single();
                
            if (contactError || !contact) {
                throw new Error('Contact non trouvé');
            }
            
            const { data, error } = await client
                .from('license_users')
                .insert([{
                    company_license_id: licenseId,
                    contact_id: contactId,
                    is_active: true,
                    activated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    company_contacts (
                        id,
                        first_name,
                        last_name,
                        email,
                        position,
                        phone
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur création utilisateur licence:', error);
                throw error;
            }
            
            this.log('Utilisateur licence créé avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création utilisateur licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicenseUser(userId) {
        try {
            this.log('Suppression utilisateur licence', { userId });
            
            const client = await this.getClient();
            
            const { error } = await client
                .from('license_users')
                .delete()
                .eq('id', userId);
            
            if (error) {
                console.error('❌ Erreur suppression utilisateur licence:', error);
                throw error;
            }
            
            this.log('Utilisateur licence supprimé avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression utilisateur licence:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== CONTACTS DISPONIBLES ==========
    
    static async getAvailableContacts(companyId = null) {
        try {
            this.log('Récupération contacts disponibles', { companyId });
            
            const client = await this.getClient();
            
            let query = client
                .from('company_contacts')
                .select(`
                    id,
                    first_name,
                    last_name,
                    email,
                    position,
                    company_id,
                    companies (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Erreur récupération contacts disponibles:', error);
                throw error;
            }
            
            this.log('Contacts disponibles récupérés', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération contacts disponibles:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== OPPORTUNITÉS ==========
    
    static async getOpportunities() {
        try {
            this.log('Récupération des opportunités');
            
            const client = await this.getClient();
            const { data, error } = await client
                .from('opportunities')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erreur Supabase getOpportunities:', error);
                throw error;
            }
            
            this.log('Opportunités récupérées', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération opportunités:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createOpportunity(opportunityData) {
        try {
            this.log('Création opportunité', opportunityData);
            
            const client = await this.getClient();
            
            // Valider les données
            if (!opportunityData.company_id) {
                throw new Error('La société est obligatoire');
            }
            
            const { data, error } = await client
                .from('opportunities')
                .insert([{
                    ...opportunityData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur création opportunité:', error);
                throw error;
            }
            
            this.log('Opportunité créée avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création opportunité:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateOpportunity(id, opportunityData) {
        try {
            this.log('Mise à jour opportunité', { id, data: opportunityData });
            
            const client = await this.getClient();
            
            if (!id) {
                throw new Error('ID d\'opportunité manquant');
            }
            
            const { data, error } = await client
                .from('opportunities')
                .update({
                    ...opportunityData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur mise à jour opportunité:', error);
                throw error;
            }
            
            if (!data || data.length === 0) {
                throw new Error('Opportunité non trouvée');
            }
            
            this.log('Opportunité mise à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour opportunité:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteOpportunity(id) {
        try {
            this.log('Suppression opportunité', { id });
            
            const client = await this.getClient();
            
            if (!id) {
                throw new Error('ID d\'opportunité manquant');
            }
            
            const { error } = await client
                .from('opportunities')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression opportunité:', error);
                throw error;
            }
            
            this.log('Opportunité supprimée avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression opportunité:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== STATISTIQUES ==========
    
    static async getStats() {
        try {
            this.log('Calcul des statistiques');
            
            const [companiesResult, licensesResult, contactsResult] = await Promise.all([
                this.getCompanies(),
                this.getLicenses(),
                this.getContacts()
            ]);
            
            if (!companiesResult.success || !licensesResult.success || !contactsResult.success) {
                throw new Error('Erreur récupération données pour statistiques');
            }
            
            const companies = companiesResult.data;
            const licenses = licensesResult.data;
            const contacts = contactsResult.data;
            
            // Calculs des statistiques
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            const stats = {
                // Sociétés
                totalCompanies: companies.length,
                prospects: companies.filter(c => c.status === 'prospect').length,
                sponsors: companies.filter(c => c.status === 'sponsor').length,
                clients: companies.filter(c => c.status === 'client').length,
                onboarded: companies.filter(c => c.status === 'onboarded').length,
                
                // Contacts
                totalContacts: contacts.length,
                
                // Licences
                totalLicenses: licenses.length,
                activeLicenses: licenses.filter(l => l.status === 'active').length,
                totalLicenseCount: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.license_count || 0), 0),
                
                // Revenus
                monthlyRevenue: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.monthly_cost || 0), 0),
                
                yearlyRevenue: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + ((l.monthly_cost || 0) * 12), 0),
                
                // Expirations
                expiringLicenses: licenses.filter(l => {
                    if (l.status !== 'active' || !l.renewal_date) return false;
                    const renewalDate = new Date(l.renewal_date);
                    return renewalDate <= thirtyDaysFromNow && renewalDate >= now;
                }).length,
                
                expiredLicenses: licenses.filter(l => l.status === 'expired').length
            };
            
            this.log('Statistiques calculées', stats);
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ Erreur calcul statistiques:', error);
            return { success: false, error: error.message };
        }
    }
}

// ===================================
// UTILITAIRES GÉNÉRAUX
// ===================================

// Formatage des dates
function formatDate(dateString) {
    if (!dateString) return 'Non défini';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Date invalide';
    }
}

function formatDateShort(dateString) {
    if (!dateString) return 'Non défini';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    } catch (error) {
        return 'Date invalide';
    }
}

// Formatage des montants
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
    
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Génération d'initiales
function getInitials(firstName, lastName) {
    if (!firstName && !lastName) return '??';
    
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

// Gestion des erreurs avec UI
function showError(message, duration = 5000) {
    console.error('Erreur:', message);
    
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-container';
        errorContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(errorContainer);
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification error';
    errorDiv.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #dc2626;
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: auto;
        animation: slideIn 0.3s ease;
    `;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    errorDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
        opacity: 0.8;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => errorDiv.remove();
    
    errorDiv.appendChild(closeBtn);
    errorContainer.appendChild(errorDiv);
    
    if (duration > 0) {
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    }
}

function showSuccess(message, duration = 3000) {
    console.log('Succès:', message);
    
    let successContainer = document.getElementById('success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = 'success-container';
        successContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(successContainer);
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'notification success';
    successDiv.style.cssText = `
        background: #d1fae5;
        color: #065f46;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #10b981;
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: auto;
        animation: slideIn 0.3s ease;
    `;
    successDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
        opacity: 0.8;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => successDiv.remove();
    
    successDiv.appendChild(closeBtn);
    successContainer.appendChild(successDiv);
    
    if (duration > 0) {
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, duration);
    }
}

function showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(3px);
            `;
            
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 3rem;
                height: 3rem;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            loader.appendChild(spinner);
            
            if (!document.getElementById('spinner-styles')) {
                const style = document.createElement('style');
                style.id = 'spinner-styles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function withTimeout(promise, timeoutMs = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
    ]);
}

// ===================================
// EXPOSITION GLOBALE
// ===================================

// Initialisation automatique
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM chargé - Initialisation des services...');
    
    try {
        const configData = await getConfig();
        APP_CONFIG = configData.config;
        CONFIG_SOURCE = configData.source;
        ENV_INFO = configData.env;
        
        console.log('✅ Configuration chargée');
    } catch (error) {
        console.error('❌ Erreur chargement configuration:', error.message);
    }
});

// Services globaux
window.AuthService = AuthService;
window.CRMService = CRMService;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.formatCurrency = formatCurrency;
window.getInitials = getInitials;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.withTimeout = withTimeout;

// Fonction de diagnostic améliorée
window.testConfig = async function() {
    if (!APP_CONFIG) {
        const configData = await getConfig();
        APP_CONFIG = configData.config;
        CONFIG_SOURCE = configData.source;
        ENV_INFO = configData.env;
    }
    
    console.group('🔍 Diagnostic CRM');
    console.log('Environment:', ENV_INFO);
    console.log('Config Source:', CONFIG_SOURCE);
    console.log('Supabase URL:', APP_CONFIG.SUPABASE_URL);
    console.log('Has Key:', !!APP_CONFIG.SUPABASE_ANON_KEY);
    console.log('Key Length:', APP_CONFIG.SUPABASE_ANON_KEY?.length || 0);
    console.log('Key Preview:', APP_CONFIG.SUPABASE_ANON_KEY ? 
        APP_CONFIG.SUPABASE_ANON_KEY.substring(0, 20) + '...' + APP_CONFIG.SUPABASE_ANON_KEY.slice(-10) 
        : 'Non définie');
    console.log('Supabase Client:', !!supabaseClient);
    console.log('Is Initialized:', isInitialized);
    console.log('CRMService Methods:', Object.getOwnPropertyNames(CRMService).filter(name => name !== 'length' && name !== 'name' && name !== 'prototype'));
    console.groupEnd();
    
    return {
        environment: ENV_INFO,
        configSource: CONFIG_SOURCE,
        hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
        keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0,
        isInitialized,
        client: !!supabaseClient,
        crmMethods: Object.getOwnPropertyNames(CRMService).filter(name => name !== 'length' && name !== 'name' && name !== 'prototype')
    };
};

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.error('Erreur globale:', e.error?.message);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason?.message);
    e.preventDefault();
});

console.log('✅ Configuration CRM chargée - Prêt pour l\'initialisation');
