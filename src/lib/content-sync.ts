import { api, ContentPatchPackage } from './api';

/*
 * ADMFC — sincronização automática de conteúdo.
 *
 * O usuário não precisa tocar em nenhum botão.
 * Quando o aplicativo tiver acesso à internet, este módulo consulta
 * o manifesto oficial e aplica somente revisões ainda não instaladas.
 */

const MANIFEST_URL =
  'https://raw.githubusercontent.com/jonatascds68/himnario-admfc/main/updates/manifest.json';

const BASE_URL =
  'https://raw.githubusercontent.com/jonatascds68/himnario-admfc/main/updates';

interface ContentManifest {
  schema_version: 'admfc-content-manifest-1';
  latest_revision: number;
  patches: string[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Error HTTP ${response.status} al consultar actualizaciones`
    );
  }

  return (await response.json()) as T;
}

export async function syncContentUpdates() {
  /*
   * Falha de internet nunca impede o funcionamento do hinário.
   * O aplicativo continua usando normalmente sua base local.
   */
  try {
    const manifest =
      await fetchJson<ContentManifest>(
        `${MANIFEST_URL}?t=${Date.now()}`
      );

    if (
      !manifest ||
      manifest.schema_version !==
        'admfc-content-manifest-1' ||
      !Number.isInteger(manifest.latest_revision) ||
      manifest.latest_revision < 0 ||
      !Array.isArray(manifest.patches)
    ) {
      throw new Error(
        'Manifesto de actualización inválido'
      );
    }

    let localRevision =
      await api.getContentRevision();

    if (manifest.latest_revision <= localRevision) {
      return {
        ok: true,
        updated: false,
        revision: localRevision,
      };
    }

    /*
     * Os pacotes são aplicados em ordem de revisão.
     * Isso permite que um aparelho que ficou muito tempo offline
     * alcance a versão atual sem perder nenhuma correção.
     */
    for (
      let revision = localRevision + 1;
      revision <= manifest.latest_revision;
      revision++
    ) {
      const filename =
        `admfc-update-r${String(revision).padStart(6, '0')}.json`;

      if (!manifest.patches.includes(filename)) {
        throw new Error(
          `Paquete ausente para revisión ${revision}`
        );
      }

      const pkg =
        await fetchJson<ContentPatchPackage>(
          `${BASE_URL}/${filename}?t=${Date.now()}`
        );

      if (pkg.revision !== revision) {
        throw new Error(
          `Revisión inesperada en ${filename}`
        );
      }

      await api.applyContentUpdates(pkg);

      localRevision = revision;
    }

    return {
      ok: true,
      updated: true,
      revision: localRevision,
    };
  } catch (error) {
    /*
     * Sincronização é best-effort:
     * sem internet, GitHub indisponível ou pacote inválido
     * jamais tornam o aplicativo inutilizável.
     */
    console.warn(
      'ADMFC content sync:',
      error
    );

    return {
      ok: false,
      updated: false,
      revision: await api
        .getContentRevision()
        .catch(() => 0),
    };
  }
}
