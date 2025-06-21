// ===================================
// CONFIGURATION CRM PRO - VERSION NETLIFY
// Récupération forcée des variables d'environnement
// ===================================

console.log('🚀 CRM Config - Démarrage...');

// Configuration par défaut
const DEFAULT_CONFIG = {
    SUPABASE_URL: 'https://oxyiamruvyliueecpaam.supabase.co',
    SUPABASE_ANON_KEY: ''
};

// FORCER LA RÉCUPÉRATION DES VARIABLES NETLIFY
function getNetlifyConfig() {
    const config = { ...DEFAULT_CONFIG };
    
    console.log('🔍 Recherche variables d\'environnement...');
    
    // 1. Via window.ENV (injection manuelle)
    if (window.ENV && window.ENV.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        console.log('✅ Variables trouvées via window.ENV');
        return config;
    }
    
    // 2. Via variables Netlify injectées (si build process disponible)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.VITE_SUPABASE_ANON_KEY) {
            config.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
            config.SUPABASE_URL = process.env.VITE_SUPABASE_URL || config.SUPABASE_URL;
            console.log('✅ Variables trouvées via process.env');
            return config;
        }
    }
    
    // 3. Via localStorage (développement)
    const localConfig = localStorage.getItem('crmConfig');
    if (localConfig) {
        try {
            const parsed = JSON.parse(localConfig);
            if (parsed.SUPABASE_ANON_KEY) {
                config.SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY;
                console.log('✅ Variables trouvées via localStorage');
                return config;
            }
        } catch (e) {
            console.warn('⚠️ Erreur lecture localStorage');
        }
    }
    
    // 4. Clé de développement en dur (TEMPORAIRE)
    // ⚠️ REMPLACEZ PAR VOTRE VRAIE CLÉ SUPABASE
    const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWlhbXJ1dnlsaXVlZWNwYWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MjAxOTY0MzIwMH0.REMPLACEZ_PAR_VOTRE_VRAIE_CLE';
    
    if (DEV_KEY && !DEV_KEY.includes('REMPLACEZ')) {
        config.SUPABASE_ANON_KEY = DEV_KEY;
        console.log('⚠️ Utilisation clé de développement');
        return config;
    }
    
    console.error('❌ Aucune clé Supabase trouvée');
    return config;
}

// Récupération de la configuration
const APP_CONFIG = getNetlifyConfig();

console.log('📊 Configuration chargée:', {
    url: APP_CONFIG.SUPABASE_URL,
    hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
    keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0
});

// Messages d'aide si pas de clé
if (!APP_CONFIG.SUPABASE_ANON_KEY) {
    console.group('🚨 CONFIGURATION REQUISE');
    console.error('Aucune clé Supabase trouvée !');
    console.log('');
    console.log('🛠️ Solutions (choisissez une) :');
    console.log('');
    console.log('1️⃣ SOLUTION TEMPORAIRE - Ajoutez avant config.js :');
    console.log('<script>');
    console.log('window.ENV = {');
    console.log('  VITE_SUPABASE_ANON_KEY: "votre_cle_supabase"');
    console.log('};');
    console.log('</script>');
    console.log('');
    console.log('2️⃣ SOLUTION DÉVELOPPEMENT - localStorage :');
    console.log('localStorage.setItem("crmConfig", JSON.stringify({');
    console.log('  SUPABASE_ANON_KEY: "votre_cle_supabase"');
    console.log('}));');
    console.log('');
    console.log('3️⃣ SOLUTION PRODUCTION - Modifier ce fichier :');
    console.log('Remplacez REMPLACEZ_PAR_VOTRE_VRAIE_CLE par votre clé dans config.js ligne ~60');
    console.log('');
    console.log('🔑 Récupérer votre clé : supabase.com → projet → Settings → API → clé "anon"');
    console.groupEnd();
}

// Variables globales
let supabase = null;
let isReady = false;

// ===================================
// INITIALISATION SUPABASE
// ===================================

async function initializeSupabase() {
    if (supabase) return supabase;
    
    console.log('🔧 Initialisation Supabase...');
    
    try {
        // Attendre que Supabase soit chargé
        if (!window.supabase) {
            console.log('⏳ Attente de la librairie Supabase...');
            let attempts = 0;
            while (!window.supabase && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }
            
            if (!window.supabase) {
                throw new Error('Librairie Supabase non chargée');
            }
        }
        
        // Vérifier la clé
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Clé Supabase manquante');
        }
        
        if (APP_CONFIG.SUPABASE_ANON_KEY.includes('REMPLACEZ')) {
            throw new Error('Clé Supabase non configurée');
        }
        
        // Créer le client Supabase
        supabase = window.supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );
        
        console.log('✅ Client Supabase créé');
        
        // Test de connexion
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            if (error.message.includes('Invalid API key')) {
                console.error('🚨 Clé API Supabase invalide');
                throw new Error('Clé API invalide');
            } else {
                console.warn('⚠️ Avertissement auth:', error.message);
            }
        }
        
        console.log('✅ Connexion Supabase validée');
        isReady = true;
        return supabase;
        
    } catch (error) {
        console.error('❌ Erreur initialisation Supabase:', error.message);
        supabase = null;
        return null;
    }
}

// ===================================
// SERVICES CRM
// ===================================

class AuthService {
    static async ensureReady() {
        if (!supabase) {
            supabase = await initializeSupabase();
        }
        if (!supabase) {
            throw new Error('Service non disponible. Vérifiez votre configuration Supabase.');
        }
        return supabase;
    }
    
    static async getCurrentUser() {
        try {
            const client = await this.ensureReady();
            const { data: { user }, error } = await client.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Erreur getCurrentUser:', error);
            return null;
        }
    }
    
    static async login(email, password) {
        try {
            const client = await this.ensureReady();
            
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
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
                sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('✅ Connexion réussie:', data.user.email);
            }
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Erreur de connexion:', error);
            return { 
                success: false, 
                error: error.message || 'Erreur de connexion' 
            };
        }
    }
    
    static async logout() {
        try {
            if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            }
            
            sessionStorage.removeItem('userInfo');
            console.log('✅ Déconnexion réussie');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            // Forcer la déconnexion même en cas d'erreur
            sessionStorage.removeItem('userInfo');
            window.location.href = 'index.html';
        }
    }
    
    static getUserInfo() {
        const userInfo = sessionStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
    
    static isAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo.role === 'admin';
    }
    
    static async requireAuth() {
        const user = await this.getCurrentUser();
        if (!user) {
            console.log('⚠️ Accès non autorisé - redirection');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

class CRMService {
    static async ensureReady() {
        if (!supabase) {
            supabase = await initializeSupabase();
        }
        if (!supabase) {
            throw new Error('Base de données non disponible');
        }
        return supabase;
    }
    
    static async getCompanies() {
        try {
            const client = await this.ensureReady();
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
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getCompanies:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCompany(companyData) {
        try {
            const client = await this.ensureReady();
            
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
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur createCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('companies')
                .update({
                    ...companyData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur updateCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            const client = await this.ensureReady();
            
            // Vérifier les licences associées
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
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getContacts(companyId = null) {
        try {
            const client = await this.ensureReady();
            
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
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getContacts:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            const client = await this.ensureReady();
            
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
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur createContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('company_contacts')
                .update({
                    ...contactData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur updateContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            const client = await this.ensureReady();
            const { error } = await client
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicenses() {
        try {
            const client = await this.ensureReady();
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
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getLicenses:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicense(licenseData) {
        try {
            const client = await this.ensureReady();
            
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
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur createLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLicense(id, licenseData) {
        try {
            const client = await this.ensureReady();
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
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur updateLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicense(id) {
        try {
            const client = await this.ensureReady();
            
            // Supprimer d'abord les utilisateurs associés
            await client
                .from('license_users')
                .delete()
                .eq('company_license_id', id);
            
            const { error } = await client
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicensePlans() {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getLicensePlans:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getStats() {
        try {
            const [companiesResult, licensesResult, contactsResult] = await Promise.all([
                this.getCompanies(),
                this.getLicenses(),
                this.getContacts()
            ]);
            
            if (!companiesResult.success || !licensesResult.success || !contactsResult.success) {
                throw new Error('Erreur récupération données');
            }
            
            const companies = companiesResult.data;
            const licenses = licensesResult.data;
            const contacts = contactsResult.data;
            
            const stats = {
                totalCompanies: companies.length,
                prospects: companies.filter(c => c.status === 'prospect').length,
                sponsors: companies.filter(c => c.status === 'sponsor').length,
                clients: companies.filter(c => c.status === 'client').length,
                onboarded: companies.filter(c => c.status === 'onboarded').length,
                totalContacts: contacts.length,
                totalLicenses: licenses.length,
                activeLicenses: licenses.filter(l => l.status === 'active').length,
                monthlyRevenue: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.monthly_cost || 0), 0)
            };
            
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ Erreur getStats:', error);
            return { success: false, error: error.message };
        }
    }
}

// ===================================
// UTILITAIRES
// ===================================

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

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function getInitials(firstName, lastName) {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

function showError(message, duration = 5000) {
    console.error('🔴 Erreur:', message);
    
    let container = document.getElementById('error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'error-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const errorDiv = document.createElement('div');
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
    `;
    
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
    `;
    closeBtn.onclick = () => errorDiv.remove();
    
    errorDiv.appendChild(closeBtn);
    container.appendChild(errorDiv);
    
    if (duration > 0) {
        setTimeout(() => errorDiv.remove(), duration);
    }
}

function showSuccess(message, duration = 3000) {
    console.log('🟢 Succès:', message);
    
    let container = document.getElementById('success-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'success-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const successDiv = document.createElement('div');
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
    `;
    closeBtn.onclick = () => successDiv.remove();
    
    successDiv.appendChild(closeBtn);
    container.appendChild(successDiv);
    
    if (duration > 0) {
        setTimeout(() => successDiv.remove(), duration);
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
                style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
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

// ===================================
// INITIALISATION ET EXPOSITION GLOBALE
// ===================================

async function initCRM() {
    console.log('🔧 Initialisation CRM...');
    
    // Initialiser Supabase
    await initializeSupabase();
    
    // Exposer les services globalement
    window.AuthService = AuthService;
    window.CRMService = CRMService;
    window.formatDate = formatDate;
    window.formatDateShort = formatDateShort;
    window.formatCurrency = formatCurrency;
    window.getInitials = getInitials;
    window.showError = showError;
    window.showSuccess = showSuccess;
    window.showLoading = showLoading;
    
    // Diagnostic
    window.testConfig = function() {
        console.group('🔍 Test Configuration CRM');
        console.log('Supabase URL:', APP_CONFIG.SUPABASE_URL);
        console.log('Has Key:', !!APP_CONFIG.SUPABASE_ANON_KEY);
        console.log('Key Length:', APP_CONFIG.SUPABASE_ANON_KEY?.length || 0);
        console.log('Supabase Library:', !!window.supabase);
        console.log('Supabase Client:', !!supabase);
        console.log('AuthService:', !!window.AuthService);
        console.log('CRMService:', !!window.CRMService);
        console.log('Is Ready:', isReady);
        console.groupEnd();
        
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            console.warn('❌ Pas de clé Supabase - configurez window.ENV ou modifiez config.js');
        } else if (!supabase) {
            console.warn('❌ Client Supabase non initialisé');
        } else {
            console.log('✅ Configuration OK !');
        }
    };
    
    // Signaler que tout est prêt
    window.dispatchEvent(new CustomEvent('crmConfigReady', {
        detail: {
            supabase: !!supabase,
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            ready: isReady
        }
    }));
    
    console.log('✅ CRM initialisé - Utilisez testConfig() pour vérifier');
}

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCRM);
} else {
    initCRM();
}

// Gestion des erreurs
window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise rejetée:', e.reason);
    e.preventDefault();
});

console.log('📋 CRM Config chargé - Suivez les instructions ci-dessus pour configurer');
