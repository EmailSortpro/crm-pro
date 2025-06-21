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
    // Méthode utilitaire pour les logs
    static log(action, data = null) {
        console.log(`🔄 CRM Service - ${action}`, data ? data : '');
    }

    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            this.log('Récupération des sociétés');
            
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }

            // Valider les données
            if (!companyData.name) {
                throw new Error('Le nom de la société est obligatoire');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            // Vérifier s'il y a des licences associées
            const { data: licenses } = await supabase
                .from('company_licenses')
                .select('id')
                .eq('company_id', id);
                
            if (licenses && licenses.length > 0) {
                throw new Error('Impossible de supprimer une société qui a des licences actives');
            }
            
            const { error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            let query = supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }

            // Valider les données
            if (!contactData.company_id || !contactData.first_name || !contactData.last_name) {
                throw new Error('Société, prénom et nom sont obligatoires');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { error } = await supabase
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
    
    // ========== LICENCES (Table company_licenses) ==========
    
    static async getLicenses() {
        try {
            this.log('Récupération des licences');
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }

            // Valider les données
            if (!licenseData.company_id || !licenseData.plan_id || !licenseData.license_count) {
                throw new Error('Société, plan et nombre de licences sont obligatoires');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            // Supprimer d'abord les utilisateurs associés
            await supabase
                .from('license_users')
                .delete()
                .eq('company_license_id', id);
            
            const { error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            // Vérifier que le contact existe
            const { data: contact, error: contactError } = await supabase
                .from('company_contacts')
                .select('*')
                .eq('id', contactId)
                .single();
                
            if (contactError || !contact) {
                throw new Error('Contact non trouvé');
            }
            
            const { data, error } = await supabase
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
            
            if (!supabase) {
                throw new Error('Base de données non disponible');
            }
            
            const { error } = await supabase
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
        animation: slideIn 0.3s ease;
    `;
    
    // Ajouter les keyframes d'animation
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
