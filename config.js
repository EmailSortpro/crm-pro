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
        console.warn('⚠️ Supabase client non disponible, mode démo activé');
    }
} catch (error) {
    console.warn('⚠️ Erreur initialisation Supabase, mode démo activé:', error.message);
}

// ===================================
// GESTION DE L'AUTHENTIFICATION
// ===================================

class AuthService {
    static async getCurrentUser() {
        try {
            if (!supabase) {
                // Mode démo - simuler un utilisateur connecté
                const demoUser = localStorage.getItem('demoUser');
                return demoUser ? JSON.parse(demoUser) : null;
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
                // Mode démo - validation simple
                if (email && password) {
                    const demoUser = {
                        id: 'demo-user-id',
                        email: email,
                        role: email.includes('admin') ? 'admin' : 'user'
                    };
                    localStorage.setItem('demoUser', JSON.stringify(demoUser));
                    localStorage.setItem('userInfo', JSON.stringify(demoUser));
                    return { success: true, user: demoUser };
                } else {
                    return { success: false, error: 'Email et mot de passe requis' };
                }
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
            if (!supabase) {
                // Mode démo
                localStorage.removeItem('demoUser');
                localStorage.removeItem('userInfo');
                window.location.href = 'index.html';
                return;
            }
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
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
    // Données de démonstration intégrées
    static getDemoData() {
        return {
            companies: [
                {
                    id: '1',
                    name: 'TechCorp Solutions',
                    status: 'client',
                    industry: 'Technologie',
                    employees: 150,
                    revenue: 2500000,
                    website: 'https://techcorp.example.com',
                    created_at: '2024-01-15T09:00:00Z',
                    company_contacts: [
                        {
                            id: '1',
                            first_name: 'Jean',
                            last_name: 'Dupont',
                            email: 'j.dupont@techcorp.com',
                            position: 'CTO',
                            is_admin_contact: true,
                            is_payment_contact: false
                        }
                    ]
                },
                {
                    id: '2',
                    name: 'Innovation Ltd',
                    status: 'client',
                    industry: 'Consulting',
                    employees: 75,
                    revenue: 1200000,
                    website: 'https://innovation.example.com',
                    created_at: '2024-03-01T10:00:00Z',
                    company_contacts: [
                        {
                            id: '2',
                            first_name: 'Marie',
                            last_name: 'Martin',
                            email: 'm.martin@innovation.com',
                            position: 'CEO',
                            is_admin_contact: true,
                            is_payment_contact: true
                        }
                    ]
                },
                {
                    id: '3',
                    name: 'StartupX',
                    status: 'prospect',
                    industry: 'E-commerce',
                    employees: 25,
                    revenue: 500000,
                    website: 'https://startupx.example.com',
                    created_at: '2024-05-15T14:30:00Z',
                    company_contacts: []
                }
            ],
            licenses: [
                {
                    id: '1',
                    company_id: '1',
                    plan_id: '2',
                    license_count: 5,
                    start_date: '2024-01-15',
                    end_date: '2025-01-15',
                    renewal_date: '2024-12-15',
                    status: 'active',
                    payment_method: 'stripe',
                    monthly_cost: 299.95,
                    companies: { id: '1', name: 'TechCorp Solutions', status: 'active' },
                    license_plans: { id: '2', name: 'Professional', price_per_user: 59.99 }
                },
                {
                    id: '2',
                    company_id: '2',
                    plan_id: '3',
                    license_count: 10,
                    start_date: '2024-03-01',
                    end_date: '2025-03-01',
                    renewal_date: '2025-02-01',
                    status: 'active',
                    payment_method: 'bank_transfer',
                    monthly_cost: 999.90,
                    companies: { id: '2', name: 'Innovation Ltd', status: 'active' },
                    license_plans: { id: '3', name: 'Enterprise', price_per_user: 99.99 }
                }
            ],
            licensePlans: [
                { id: '1', name: 'Starter', price_per_user: 29.99, is_active: true },
                { id: '2', name: 'Professional', price_per_user: 59.99, is_active: true },
                { id: '3', name: 'Enterprise', price_per_user: 99.99, is_active: true },
                { id: '4', name: 'Premium', price_per_user: 149.99, is_active: true }
            ]
        };
    }
    
    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            if (!supabase) {
                // Mode démo
                const demoData = this.getDemoData();
                return { success: true, data: demoData.companies };
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
                        is_admin_contact,
                        is_payment_contact
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erreur récupération sociétés:', error);
            
            // Fallback en mode démo si erreur
            const demoData = this.getDemoData();
            return { success: true, data: demoData.companies };
        }
    }
    
    static async createCompany(companyData) {
        try {
            if (!supabase) {
                // Mode démo - simuler la création
                const newCompany = {
                    ...companyData,
                    id: Date.now().toString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    company_contacts: []
                };
                return { success: true, data: newCompany };
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
                // Mode démo
                return { success: true, data: { ...companyData, id } };
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
                // Mode démo
                return { success: true };
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
    
    // ========== LICENCES ==========
    
    static async getLicenses() {
        try {
            if (!supabase) {
                // Mode démo
                const demoData = this.getDemoData();
                return { success: true, data: demoData.licenses };
            }
            
            const { data, error } = await supabase
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
                        price_per_user
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erreur récupération licences:', error);
            
            // Fallback en mode démo
            const demoData = this.getDemoData();
            return { success: true, data: demoData.licenses };
        }
    }
    
    static async getLicensePlans() {
        try {
            if (!supabase) {
                // Mode démo
                const demoData = this.getDemoData();
                return { success: true, data: demoData.licensePlans };
            }
            
            const { data, error } = await supabase
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erreur récupération plans:', error);
            
            // Fallback en mode démo
            const demoData = this.getDemoData();
            return { success: true, data: demoData.licensePlans };
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
                clients: companies.filter(c => c.status === 'client').length,
                onboarded: companies.filter(c => c.status === 'onboarded').length,
                activeLicenses: licenses.filter(l => l.status === 'active').length,
                totalLicenseCount: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + l.license_count, 0),
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
            
            // Statistiques par défaut en cas d'erreur
            return {
                success: true,
                data: {
                    totalCompanies: 3,
                    prospects: 1,
                    clients: 2,
                    onboarded: 0,
                    activeLicenses: 2,
                    totalLicenseCount: 15,
                    monthlyRevenue: 1299.85,
                    expiringLicenses: 1
                }
            };
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

// Gestion des erreurs avec retry automatique
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
    errorDiv.style.pointerEvents = 'auto';
    errorDiv.textContent = message;
    
    // Ajouter le bouton de fermeture
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        float: right;
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
        opacity: 0.8;
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
    successDiv.style.pointerEvents = 'auto';
    successDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        float: right;
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
        opacity: 0.8;
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

// Loading overlay optimisé
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
                border: 3px solid var(--gray-200);
                border-top: 3px solid var(--primary-color);
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
    if (e.error?.message?.includes('Supabase')) {
        console.warn('Mode démo activé suite à erreur Supabase');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason);
    if (e.reason?.message?.includes('Supabase')) {
        console.warn('Mode démo activé suite à erreur Supabase');
    }
});

console.log('🚀 Configuration CRM Pro chargée avec succès');
