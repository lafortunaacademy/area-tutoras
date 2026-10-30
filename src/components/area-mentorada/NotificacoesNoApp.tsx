'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Liga as notificações quando a página está dentro do app de celular
 * (la-fortuna-app, Capacitor). No navegador não faz nada.
 *
 * O Capacitor injeta `window.Capacitor` nas páginas que o app abre; os plugins
 * são usados por ali, sem pacote a mais no site.
 */
type Escuta = { remove: () => Promise<void> };
type PluginDePush = {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(evento: 'registration', f: (t: { value: string }) => void): Promise<Escuta>;
  addListener(
    evento: 'pushNotificationActionPerformed',
    f: (a: { notification: { data?: Record<string, unknown> } }) => void,
  ): Promise<Escuta>;
};
type Capacitor = {
  isNativePlatform(): boolean;
  getPlatform(): string;
  Plugins: { PushNotifications?: PluginDePush };
};

export function NotificacoesNoApp() {
  const router = useRouter();

  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: Capacitor }).Capacitor;
    const push = cap?.Plugins.PushNotifications;
    if (!cap?.isNativePlatform() || !push) return;

    const escutas: Promise<Escuta>[] = [
      push.addListener('registration', ({ value }) => {
        void fetch('/api/dispositivos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: value, plataforma: cap.getPlatform() }),
        });
      }),
      // Tocou na notificação: abre a parte da área de que ela fala.
      push.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const url = notification.data?.url;
        if (typeof url === 'string' && url.startsWith('/')) router.push(url);
      }),
    ];

    (async () => {
      let { receive } = await push.checkPermissions();
      if (receive === 'prompt' || receive === 'prompt-with-rationale') ({ receive } = await push.requestPermissions());
      if (receive === 'granted') await push.register();
    })().catch(() => {});

    return () => {
      for (const e of escutas) void e.then((x) => x.remove());
    };
  }, [router]);

  return null;
}
