/**
 * Notification Service — Chelona
 */

import { storage } from './storage';

export interface NotificationPref {
  id: string;           // moduleId + '_' + field
  moduleId: string;
  field: string;
  label: string;
  type: 'date' | 'km';
  targetValue: string;  // ISO date string OPPURE km soglia (numero come stringa)
  reminderOffset: number; // giorni prima (date) o km prima della soglia (km)
  enabled: boolean;
  lastFiredDate?: string; // YYYY-MM-DD
}

function stringToNumericId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 2000000000) + 1;
}

export const notificationService = {
  getAll(): NotificationPref[] {
    return storage.loadNotificationPrefs();
  },

  save(prefs: NotificationPref[]) {
    storage.saveNotificationPrefs(prefs);
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

  async ensurePermissionsAndChannel(): Promise<boolean> {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        // Android High Importance Channel
        await LocalNotifications.createChannel({
          id: 'chelona_reminders',
          name: 'Scadenze e Promemoria Chelona',
          description: 'Notifiche per scadenze auto, documenti, rate e spese',
          importance: 5, // max (sound + banner)
          visibility: 1,
          sound: 'default',
          vibration: true
        });

        const perm = await LocalNotifications.requestPermissions();
        return perm.display === 'granted';
      } catch (e) {
        console.error('[NotificationService] Errore permessi nativi:', e);
        return false;
      }
    }

    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  },

  isGranted(): boolean {
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  },

  async requestPermission(): Promise<boolean> {
    return this.ensurePermissionsAndChannel();
  },

  async fire(title: string, body: string) {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        await this.ensurePermissionsAndChannel();
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Math.floor(Math.random() * 1000000) + 1,
            schedule: { at: new Date(Date.now() + 500) },
            channelId: 'chelona_reminders'
          }]
        });
      } catch (e) {
        console.error('[NotificationService] Errore notifica nativa:', e);
      }
      return;
    }

    const granted = await this.ensurePermissionsAndChannel();
    if (!granted) return;
    try {
      const notif = new Notification(title, { body, icon: '/icon-192.png' });
      notif.onclick = () => {
        window.focus();
      };
    } catch (e) {
      console.warn('[NotificationService] Notifica fallita:', e);
    }
  },

  async syncAllModuleNotifications(modules: any[]) {
    if (!modules || !Array.isArray(modules)) return;
    const isGranted = await this.ensurePermissionsAndChannel();
    if (!isGranted) return;

    const now = new Date();
    const scheduledNotifs: Array<{ id: number; title: string; body: string; at: Date }> = [];

    modules.forEach(m => {
      // 1. AUTO
      if (m.type === 'auto') {
        const fields = [
          { key: 'lastInsurance', label: 'Assicurazione Auto' },
          { key: 'lastTax', label: 'Bollo Auto' },
          { key: 'lastRevision', label: 'Revisione Auto' },
          { key: 'battery12vExpiryDate', label: 'Batteria 12V' },
          { key: 'hybridBatteryExpiryDate', label: 'Batteria Ibrida' },
          { key: 'lastGplCylinder', label: 'Bombola GPL' },
          { key: 'lastMethaneCylinder', label: 'Bombola Metano' },
        ];
        const carName = `${m.brand || ''} ${m.model || ''}`.trim() || 'Auto';

        fields.forEach(f => {
          const val = m[f.key];
          if (val) {
            const pref = this.get(m.id, f.key);
            const enabled = pref ? pref.enabled : true;
            const offset = pref ? pref.reminderOffset : 7;
            if (enabled) {
              const targetDate = new Date(val);
              const remindDate = new Date(targetDate.getTime() - offset * 86400000);
              remindDate.setHours(9, 0, 0, 0);

              if (remindDate.getTime() > now.getTime()) {
                scheduledNotifs.push({
                  id: stringToNumericId(`auto_${m.id}_${f.key}`),
                  title: `⏰ Scadenza ${f.label}`,
                  body: `La scadenza per ${carName} è il ${new Date(val).toLocaleDateString('it-IT')}!`,
                  at: remindDate
                });
              }
            }
          }
        });
      }

      // 2. DOCUMENTI
      if (m.type === 'document' && m.expiryDate) {
        const docName = m.title || m.documentType || 'Documento';
        const targetDate = new Date(m.expiryDate);

        // 7 giorni prima
        const remindDate = new Date(targetDate.getTime() - 7 * 86400000);
        remindDate.setHours(9, 0, 0, 0);
        if (remindDate.getTime() > now.getTime()) {
          scheduledNotifs.push({
            id: stringToNumericId(`doc_${m.id}_7d`),
            title: `📄 Scadenza Documento`,
            body: `Il documento "${docName}" scade tra 7 giorni (${new Date(m.expiryDate).toLocaleDateString('it-IT')})!`,
            at: remindDate
          });
        }

        // Il giorno stesso
        const dayOfRemind = new Date(targetDate);
        dayOfRemind.setHours(9, 0, 0, 0);
        if (dayOfRemind.getTime() > now.getTime()) {
          scheduledNotifs.push({
            id: stringToNumericId(`doc_${m.id}_0d`),
            title: `⚠️ Documento in Scadenza Oggi`,
            body: `Il documento "${docName}" scade oggi (${new Date(m.expiryDate).toLocaleDateString('it-IT')})!`,
            at: dayOfRemind
          });
        }
      }

      // 3. RATE / INSTALLMENTS
      if (m.type === 'installments' && m.payments && Array.isArray(m.payments)) {
        const title = m.title || 'Rata';
        m.payments.forEach((p: any, idx: number) => {
          if (!p.isPaid && p.dueDate) {
            const targetDate = new Date(p.dueDate);
            const remindDate = new Date(targetDate.getTime() - 3 * 86400000);
            remindDate.setHours(9, 0, 0, 0);

            if (remindDate.getTime() > now.getTime()) {
              scheduledNotifs.push({
                id: stringToNumericId(`inst_${m.id}_${idx}_3d`),
                title: `💳 Scadenza Rata: ${title}`,
                body: `Rata ${idx + 1} di €${Number(p.amount || 0).toFixed(2)} in scadenza il ${new Date(p.dueDate).toLocaleDateString('it-IT')}!`,
                at: remindDate
              });
            }
          }
        });
      }

      // 4. SPESA SINGOLA
      if (m.type === 'single-expense' && m.expiryDate) {
        const title = m.description || 'Spesa';
        const targetDate = new Date(m.expiryDate);
        const remindDate = new Date(targetDate.getTime() - 3 * 86400000);
        remindDate.setHours(9, 0, 0, 0);

        if (remindDate.getTime() > now.getTime()) {
          scheduledNotifs.push({
            id: stringToNumericId(`exp_${m.id}_3d`),
            title: `🏷️ Scadenza Spesa: ${title}`,
            body: `La spesa "${title}" ha una scadenza prevista per il ${new Date(m.expiryDate).toLocaleDateString('it-IT')}!`,
            at: remindDate
          });
        }
      }
    });

    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const pending = await LocalNotifications.getPending();
        if (pending && pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }

        if (scheduledNotifs.length > 0) {
          await LocalNotifications.schedule({
            notifications: scheduledNotifs.map(n => ({
              id: n.id,
              title: n.title,
              body: n.body,
              schedule: { at: n.at },
              channelId: 'chelona_reminders'
            }))
          });
        }
      } catch (e) {
        console.error('[NotificationService] Errore schedulazione nativa:', e);
      }
    }
  },

  async checkAndFire(modules: any[]) {
    await this.ensurePermissionsAndChannel();

    const prefs = this.getAll().filter(p => p.enabled);
    if (prefs.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const updated = prefs.map(pref => {
        if (pref.lastFiredDate === todayStr) return pref;

        const mod = modules.find(m => m.id === pref.moduleId);
        if (!mod) return pref;
        const carName = `${mod.brand || ''} ${mod.model || ''}`.trim() || 'Auto';

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

    this.checkAutoKmReminders(modules);
    await this.syncAllModuleNotifications(modules);
  },

  async scheduleNotification(title: string, body: string, at: Date) {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      try {
        await this.ensurePermissionsAndChannel();
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Math.floor(Math.random() * 1000000) + 1,
            schedule: { at },
            channelId: 'chelona_reminders'
          }]
        });
      } catch (e) {
        console.error('[NotificationService] Errore schedulazione nativa:', e);
      }
      return;
    }

    const delay = at.getTime() - Date.now();
    if (delay > 0 && delay < 86400000) {
      setTimeout(() => this.fire(title, body), delay);
    }
  },

  checkAutoKmReminders(modules: any[]) {
    const today = new Date();
    
    modules.filter(m => m.type === 'auto').forEach(a => {
      const lastUpdate = a.lastKmUpdatedAt ? new Date(a.lastKmUpdatedAt) : new Date(a.createdAt || Date.now());
      const daysDiff = (today.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff >= 7) {
        const prefId = `auto_km_weekly_${a.id}`;
        const getWeekNumber = (d: Date) => {
          const oneJan = new Date(d.getFullYear(), 0, 1);
          const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
          return Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        };
        const fireKey = `${today.getFullYear()}-w${getWeekNumber(today)}`;
        const lastFired = storage.loadNotifFired(prefId);
        
        if (lastFired !== fireKey) {
          this.fire(
            `🚗 Aggiorna i Chilometri`,
            `È passata una settimana dall'ultimo aggiornamento km per la tua ${a.brand || 'auto'}. Tocca qui per aggiornarli!`
          );
          storage.saveNotifFired(prefId, fireKey);
        }
      }
    });
  }
};

try {
  import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
    LocalNotifications.addListener('localNotificationActionPerformed', () => {
      window.dispatchEvent(new CustomEvent('trigger-auto-km-page'));
    });
  });
} catch (e) {
  // Ignora se non in ambiente nativo
}
