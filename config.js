// ===================================
// CONFIGURATION SUPABASE
// ===================================

// Configuration avec tes vraies clés Supabase
const SUPABASE_URL = 'https://oxyiamruvyliueecpaam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWlhbXJ1dnlsaXVlZWNwYWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MDM0MTgsImV4cCI6MjA2NTk3OTQxOH0.Wy_jbUB7D5Bly-rZB6oc2bXUHzZQ8MivDL4vdM1jcE0';

// Initialisation du client Supabase avec gestion d'erreur
let supabase = null;

try {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Connexion Supabase initialisée');
        
        // Test de connexion
        supabase.auth.getSession().then(({ data, error }) => {
            if (error && error.message.includes('Invalid API key')) {
                console.error('🚨 Clé API Supabase invalide');
            } else {
                console.log('✅ Connexion Supabase validée');
            }
        }).catch(err => {
            console.warn('⚠️ Test de connexion Supabase échoué:', err.message);
        });
    } else {
        console.warn('⚠️ Supabase client non disponible');
        throw new Error('Supabase non disponible');
    }
} catch (error) {
    console.error('❌ Erreur initialisation Supabase:', error.message);
    supabase = null;
}

// ===================================
// GESTION DE L'AUTHENTIFICATION
// ===================================

class AuthService {
    static async getCurrentUser() {
        try {
            if (!supabase) {
                throw new Error('Supabase non initialisé');
            }
            
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return null;
        }
    }
    
    static async login(email, password) {
        try {
            if (!supabase) {
                throw new Error('Service non disponible');
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Sauvegarder les infos utilisateur
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || 'user'
                };
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Erreur connexion:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async logout() {
        try {
            if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            }
            
            // Nettoyer le localStorage
            localStorage.removeItem('userInfo');
            
            // Rediriger vers la page de connexion
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            showError('Erreur lors de la déconnexion');
        }
    }
    
    static getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
    
    static isAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo.role === 'admin';
    }
    
    static async requireAuth() {
        const user = await this.getCurrentUser();
        if (!user) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

// ===================================
// SERVICE DE DONNÉES CRM
// ===================================

class CRMService {
    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
                .from('companies')
                .select(`
                    *,
                    company_contacts (
                        id,
                        first_name,
                        last_name,
                        email,
                        position,
                        contact_type,
                        is_admin_contact,
                        is_payment_contact
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erreur récupération sociétés:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCompany(companyData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            console.error('Erreur création société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            console.error('Erreur mise à jour société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression société:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== CONTACTS ==========
    
    static async getContacts(companyId = null) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            let query = supabase
                .from('company_contacts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erreur récupération contacts:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            console.error('Erreur création contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            console.error('Erreur mise à jour contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { error } = await supabase
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== LICENCES ==========
    
    static async getLicenses() {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            console.log('🔍 Requête Supabase pour les licences...');
            
            const { data, error } = await supabase
                .from('company_licenses')
                .select(`
                    *,
                    companies!company_licenses_company_id_fkey (
                        id,
                        name,
                        status
                    ),
                    license_plans!company_licenses_plan_id_fkey (
                        id,
                        name,
                        price_per_user
                    )
                `)
                .order('created_at', { ascending: false });
            
            console.log('📊 Réponse Supabase licences:', { data, error });
            
            if (error) {
                console.error('❌ Erreur Supabase:', error);
                throw error;
            }
            
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération licences:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicense(licenseData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            console.log('📝 Création licence:', licenseData);
            
            const { data, error } = await supabase
                .from('company_licenses')
                .insert([{
                    ...licenseData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    companies!company_licenses_company_id_fkey (
                        id,
                        name,
                        status
                    ),
                    license_plans!company_licenses_plan_id_fkey (
                        id,
                        name,
                        price_per_user
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur création licence:', error);
                throw error;
            }
            
            console.log('✅ Licence créée:', data);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLicense(id, licenseData) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            console.log('📝 Mise à jour licence:', id, licenseData);
            
            const { data, error } = await supabase
                .from('company_licenses')
                .update({
                    ...licenseData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select(`
                    *,
                    companies!company_licenses_company_id_fkey (
                        id,
                        name,
                        status
                    ),
                    license_plans!company_licenses_plan_id_fkey (
                        id,
                        name,
                        price_per_user
                    )
                `);
            
            if (error) {
                console.error('❌ Erreur mise à jour licence:', error);
                throw error;
            }
            
            console.log('✅ Licence mise à jour:', data);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicense(id) {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            console.log('🗑️ Suppression licence:', id);
            
            const { error } = await supabase
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression licence:', error);
                throw error;
            }
            
            console.log('✅ Licence supprimée');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression licence:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicensePlans() {
        try {
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            console.log('🔍 Requête Supabase pour les plans de licence...');
            
            const { data, error } = await supabase
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            console.log('📊 Réponse Supabase plans:', { data, error });
            
            if (error) {
                console.error('❌ Erreur Supabase plans:', error);
                throw error;
            }
            
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération plans:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== STATISTIQUES ==========
    
    static async getStats() {
        try {
            const [companiesResult, licensesResult] = await Promise.all([
                this.getCompanies(),
                this.getLicenses()
            ]);
            
            if (!companiesResult.success || !licensesResult.success) {
                throw new Error('Erreur récupération données');
            }
            
            const companies = companiesResult.data;
            const licenses = licensesResult.data;
            
            const stats = {
                totalCompanies: companies.length,
                prospects: companies.filter(c => c.status === 'prospect').length,
                sponsors: companies.filter(c => c.status === 'sponsor').length,
                clients: companies.filter(c => c.status === 'client').length,
                onboarded: companies.filter(c => c.status === 'onboarded').length,
                activeLicenses: licenses.filter(l => l.status === 'active').length,
                totalLicenseCount: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.license_count || 0), 0),
                monthlyRevenue: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.monthly_cost || 0), 0),
                expiringLicenses: licenses.filter(l => {
                    if (l.status !== 'active') return false;
                    const renewalDate = new Date(l.renewal_date);
                    const now = new Date();
                    const diffTime = renewalDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 30 && diffDays >= 0;
                }).length
            };
            
            return { success: true, data: stats };
        } catch (error) {
            console.error('Erreur calcul statistiques:', error);
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

// Gestion des erreurs
function showError(message, duration = 5000) {
    console.error('Erreur:', message);
    
    // Créer ou réutiliser le conteneur d'erreurs
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
    
    // Créer le message d'erreur
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
    `;
    errorDiv.textContent = message;
    
    // Ajouter le bouton de fermeture
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
    
    // Auto-suppression
    if (duration > 0) {
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    }
}

// Gestion des succès
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

// Loading overlay
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
            
            // Ajout des keyframes pour l'animation
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

// Gestion des timeouts pour éviter les blocages
function withTimeout(promise, timeoutMs = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
    ]);
}

// ===================================
// EXPORT GLOBAL
// ===================================

// Rendre les services disponibles globalement
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

// Gestion globale des erreurs
window.addEventListener('error', (e) => {
    console.error('Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason);
    e.preventDefault(); // Empêcher l'affichage dans la console
});

console.log('🚀 Configuration CRM Pro chargée avec succès');
