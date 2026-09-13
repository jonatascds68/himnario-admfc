import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { kv } from './storage';

const APP_VERSION_URL =
  'https://raw.githubusercontent.com/jonatascds68/himnario-admfc/main/updates/app-version.json';

const LAST_APP_VERSION_CHECK_KEY =
  'admfc_last_app_version_check_v1';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type AppVersionConfig = {
  schema_version: 'admfc-app-version-1';
  latest_version: string;
  minimum_version: string;
  required: boolean;
  message?: string;
  play_store_url: string;
};

function normalizeVersion(version: string): number[] {
  return String(version ?? '')
    .trim()
    .split('.')
    .map(part => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
    });
}

function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;

    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}

async function openStore(url: string): Promise<void> {
  if (Platform.OS === 'android') {
    const marketUrl =
      'market://details?id=org.admfc.himnario';

    try {
      const supported = await Linking.canOpenURL(marketUrl);

      if (supported) {
        await Linking.openURL(marketUrl);
        return;
      }
    } catch {
      // Fallback para a URL HTTPS abaixo.
    }
  }

  await Linking.openURL(url);
}

export async function checkForAppUpdate(
  force = false
): Promise<void> {
  const now = Date.now();

  if (!force) {
    const lastCheckRaw =
      await kv.get(LAST_APP_VERSION_CHECK_KEY);

    const lastCheck = Number(lastCheckRaw);

    if (
      Number.isFinite(lastCheck) &&
      now - lastCheck < CHECK_INTERVAL_MS
    ) {
      return;
    }
  }

  const response = await fetch(
    `${APP_VERSION_URL}?t=${now}`,
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo verificar la versión disponible (${response.status})`
    );
  }

  const config =
    (await response.json()) as AppVersionConfig;

  if (
    !config ||
    config.schema_version !== 'admfc-app-version-1' ||
    typeof config.latest_version !== 'string' ||
    typeof config.minimum_version !== 'string' ||
    typeof config.required !== 'boolean' ||
    typeof config.play_store_url !== 'string' ||
    !config.play_store_url.trim()
  ) {
    throw new Error(
      'La información remota de versión es inválida'
    );
  }

  await kv.set(
    LAST_APP_VERSION_CHECK_KEY,
    String(now)
  );

  const installedVersion =
    Constants.expoConfig?.version ?? '0.0.0';

  const hasUpdate =
    compareVersions(
      config.latest_version,
      installedVersion
    ) > 0;

  if (!hasUpdate) {
    return;
  }

  const isRequired =
    config.required ||
    compareVersions(
      installedVersion,
      config.minimum_version
    ) < 0;

  const message =
    config.message?.trim() ||
    `Ya está disponible Himnario ADMFC ${config.latest_version}. Actualice la aplicación para recibir las últimas mejoras y correcciones.`;

  if (isRequired) {
    Alert.alert(
      'Actualización necesaria',
      message,
      [
        {
          text: 'Actualizar ahora',
          onPress: () => {
            openStore(config.play_store_url).catch(
              () => undefined
            );
          },
        },
      ],
      {
        cancelable: false,
      }
    );

    return;
  }

  Alert.alert(
    'Nueva versión disponible',
    message,
    [
      {
        text: 'Más tarde',
        style: 'cancel',
      },
      {
        text: 'Actualizar ahora',
        onPress: () => {
          openStore(config.play_store_url).catch(
            () => undefined
          );
        },
      },
    ],
    {
      cancelable: true,
    }
  );
}
