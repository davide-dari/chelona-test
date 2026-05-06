/**
 * Notification Service — Chelona
 *
 * Browser: usa la Web Notifications API (notifiche quando l'app è aperta).
 *
 * 🤖 Capacitor APK migration path:
 *   npm install @capacitor/local-notifications
 *   Sostituire il body di `fire()` con:
 *     import { LocalNotifications } from '@capacitor/local-notifications';
 *     await LocalNotifications.schedule({ notifications: [{
 *       title, body, id: Date.now(),
 *       schedule: { at: new Date() }
 *     }]});
 *   E schedulare le notifiche future con date precise anziché controllare al launch.
 */

export interface NotificationPref {
  id: string;           // moduleId + '_' + field
  moduleId: string;
  field: string;
  label: string;
  type: 'date' | 'km';
  targetValue: string;  // ISO date string OPPURE km soglia (numero come stringa)
  reminderOffset: number; // giorni prima (date) o km prima della soglia (km)
  enabled: boolean;
  lastFiredDate?: string; // YYYY-MM-DD — evita di sparare due volte nello stesso giorno
}

const STORAGE_KEY = 'diari_notification_prefs';

export const notificationService = {
  getAll(): NotificationPref[] {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      
      // 🚚 MIGRATION: Se non ci sono preferenze Chelona, prova a cercarle sotto Diari
      if (!saved) {
        const legacy = localStorage.getItem('diari_notification_prefs');
        if (legacy) {
          localStorage.setItem(STORAGE_KEY, legacy);
          saved = legacy;
        }
      }

      return JSON.parse(saved || '[]');
    } catch {
      return [];
    }
  },

  save(prefs: NotificationPref[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  },

  get(moduleId: string, field: string): NotificationPref | undefined {
    return this.getAll().find(p => p.moduleId === moduleId && p.field === field);
  },

  upsert(pref: NotificationPref) {
    const all = this.getAll().filter(p => p.id !== pref.id);
    this.save([...all, pref]);
  },

  remove(moduleId: string, field: string) {
    this.save(this.getAll().filter(p => !(p.moduleId === moduleId && p.field === field)));
  },

  removeAllForModule(moduleId: string) {
    this.save(this.getAll().filter(p => p.moduleId !== moduleId));
  },

  /** Restituisce true se l'utente ha già concesso il permesso */
  isGranted(): boolean {
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  },

  async requestPermission(): Promise<boolean> {
    // 🤖 Capacitor: il plugin gestisce i permessi nativi — sempre true
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  fire(title: string, body: string) {
    // 🤖 Capacitor APK: sostituire con LocalNotifications.schedule(...)
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      console.log('[CAPACITOR NOTIF]', title, body);
      return;
    }
    if (!this.isGranted()) return;
    try {
      new Notification(title, { body, icon: '/icon-192.png' });
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  },

  /**
   * Controlla tutti i pref abilitati e notifica quelli scaduti/in scadenza.
   * Chiamare all'avvio dell'app dopo il login.
   */
  checkAndFire(modules: any[]) {
    if (!this.isGranted()) return;

    // Controllo notifiche standard
    const prefs = this.getAll().filter(p => p.enabled);
    if (prefs.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const updated = prefs.map(pref => {
        if (pref.lastFiredDate === todayStr) return pref;

        const mod = modules.find(m => m.id === pref.moduleId);
        if (!mod) return pref;
        const carName = `${mod.brand || ''} ${mod.model || ''}`.trim();

        if (pref.type === 'date') {
          const target = new Date(pref.targetValue);
          target.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

          if (diffDays < 0) {
            this.fire(`⚠️ ${pref.label} scaduta`, `Scaduta da ${Math.abs(diffDays)} giorni — ${carName}`);
            return { ...pref, lastFiredDate: todayStr };
          }
          if (diffDays <= pref.reminderOffset) {
            const when = diffDays === 0 ? 'Scade oggi!' : `Scade tra ${diffDays} giorno${diffDays !== 1 ? 'i' : ''}`;
            this.fire(`⏰ ${pref.label}`, `${when} — ${carName}`);
            return { ...pref, lastFiredDate: todayStr };
          }
        }

        if (pref.type === 'km') {
          const currentKm = Number(mod.currentKm) || 0;
          const targetKm = Number(pref.targetValue);
          const remaining = targetKm - currentKm;

          if (remaining < 0) {
            this.fire(`⚠️ ${pref.label} in ritardo`, `Superato di ${Math.abs(remaining).toLocaleString('it-IT')} km — ${carName}`);
            return { ...pref, lastFiredDate: todayStr };
          }
          if (remaining <= pref.reminderOffset) {
            this.fire(`🔧 ${pref.label}`, `Mancano ${remaining.toLocaleString('it-IT')} km — ${carName}`);
            return { ...pref, lastFiredDate: todayStr };
          }
        }

        return pref;
      });

      const enabledIds = new Set(prefs.map(p => p.id));
      const rest = this.getAll().filter(p => !enabledIds.has(p.id));
      this.save([...rest, ...updated]);
    }

    // Controlli Custom
    this.checkMiniWallets(modules);
    this.checkAutoKmReminders(modules);
  },

  async scheduleNotification(title: string, body: string, at: Date) {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at }
          }]
        });
      } catch (e) {
        console.error('Failed to schedule native notification:', e);
      }
      return;
    }
    
    // Fallback browser timeout if within current session
    const delay = at.getTime() - Date.now();
    if (delay > 0 && delay < 86400000) { // Solo se entro le prossime 24h
      setTimeout(() => this.fire(title, body), delay);
    }
  },

  checkMiniWallets(modules: any[]) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    modules.filter(m => m.type === 'wallet').forEach(w => {
      if (!w.dueDate) return;
      const due = new Date(w.dueDate);
      const saved = Number(w.savedAmount) || 0;
      const total = Number(w.totalAmount) || 0;
      if (saved >= total) return; // Finito, skip

      const diffMonths = (due.getFullYear() - currentYear) * 12 + (due.getMonth() - currentMonth);
      // Notifica se entro 1 mese la scadenza, o scaduta
      if (diffMonths <= 1) {
        const prefId = `wallet_${w.id}`;
        const fireKey = `${currentYear}-${currentMonth}`;
        const lastFired = localStorage.getItem(`notif_fired_${prefId}`);
        
        if (lastFired !== fireKey) {
          this.fire(`💼 Portafoglio`, `Ricordati di accantonare i fondi per la scadenza imminente: ${w.title}`);
          localStorage.setItem(`notif_fired_${prefId}`, fireKey);
        }
      }
    });
  },

  checkAutoKmReminders(modules: any[]) {
    const today = new Date();
    
    modules.filter(m => m.type === 'auto').forEach(a => {
      if (a.lastKmUpdatedAt) {
        const lastUpdate = new Date(a.lastKmUpdatedAt);
        const daysDiff = (today.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff >= 60) {
          const prefId = `auto_km_${a.id}`;
          // Notifica una volta al mese (fireKey basato sul mese corrente)
          const fireKey = `${today.getFullYear()}-${today.getMonth()}`;
          const lastFired = localStorage.getItem(`notif_fired_${prefId}`);
          
          if (lastFired !== fireKey) {
            this.fire(`🚗 Aggiorna i Chilometri`, `Sono passati più di 2 mesi. Aggiorna i km della tua ${a.title || 'Auto'}`);
            localStorage.setItem(`notif_fired_${prefId}`, fireKey);
          }
        }
      }
    });
  }
};
