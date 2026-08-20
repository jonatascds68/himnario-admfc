/*
 * ADMFC_7Y10_OFFICIAL_MASTER_GATE_PROTOTYPE
 *
 * Objetivo:
 * preparar gate explícito para assets/base_mestre.json.
 *
 * IMPORTANTE:
 * 7Y.10 NÃO habilita escrita oficial.
 * Nenhum apply deve ser executado nesta etapa.
 */

/*
 * ADMFC_7Y43_POST_COMMIT_CONDITIONAL
 * Pós-commit somente após evidência física de commit.
 */
/*
 * ADMFC_7Y41_SIMULATED_OFFICIAL_GATE
 * Ensaio isolado da fronteira oficial.
 */
const fs = require('fs');
const crypto = require('crypto');

const EXPECTED_HASH =
  '29fe35592ba18e5ef8793dff6af2e59be0736dcf977422936014204b0052847d';

const ALLOWED_FIELDS = new Set([
  'titulo',
  'letra',
  'bloques',
  'numero_equivalente',
  'himnario_equivalente',
  'estado',
  'fuente',
  'observacion',
  'categorias',
  'has_lyrics',
  'tom',
  'cifra',
  'cifra_bloques',
  'cifra_url',
  'audio_url',
  'audio_local',
  'audio_external_url',
  'cifra_autorizada',
  'cifra_procedencia',
  'audio_autorizado',
  'audio_procedencia',
]);

function sha256(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}

function same(a, b) {
  return JSON.stringify(a ?? null) ===
         JSON.stringify(b ?? null);
}

function fail(message, code = 2) {
  console.error('ERRO:', message);
  process.exitCode = code;
}


const ADMFC_7Y41_OFFICIAL_SIMULATED_BASE =
  'assets/base_mestre.OFICIAL-SIMULADA-7Y43.json';

const baseFile = process.argv[2];

/*
 * ADMFC_7Y43_COMMIT_EVIDENCE
 *
 * Só poderá assumir true depois que o rename
 * do commit oficial simulado for concluído.
 */
let officialCommitExecuted = false;
const packageFile = process.argv[3];
const applyMode = process.argv.includes('--apply');

/*
 * ADMFC_7Y2_OFFICIAL_AUTH_PROTOTYPE
 *
 * PROTÓTIPO SOMENTE.
 *
 * A escrita na Base Mestre oficial exige:
 * 1. --apply
 * 2. --authorize-official
 * 3. token explícito
 * 4. checkpoint oficial correto
 *
 * Nesta fase o mecanismo será testado apenas
 * em modo de autorização simulada.
 */
const authorizeOfficial =
  process.argv.includes('--authorize-official');

const officialTokenPrefix =
  '--official-token=';

const officialTokenArg =
  process.argv.find(
    arg => arg.startsWith(officialTokenPrefix)
  );

const officialToken =
  officialTokenArg
    ? officialTokenArg.slice(
        officialTokenPrefix.length
      )
    : null;

const REQUIRED_OFFICIAL_TOKEN =
  'ADMFC_CONFIRM_OFFICIAL_BASE_WRITE';

console.log('======================================================');
console.log(' ADMFC — APLICADOR TRANSACIONAL 7R');
console.log(' MODO:', applyMode ? 'APPLY' : 'DRY-RUN');
console.log('======================================================');

if (!baseFile || !packageFile) {
  console.error(
    'USO: node scripts/admin-7r-aplicador.js BASE PACOTE'
  );
  process.exitCode = 1;
} else if (
  !fs.existsSync(baseFile) ||
  !fs.existsSync(packageFile)
) {
  fail('Base ou pacote não encontrado.', 1);
} else {
  const hashBefore = sha256(baseFile);

  console.log('');
  console.log('BASE:', baseFile);
  console.log('HASH:', hashBefore);
  console.log('PACOTE:', packageFile);

  let base;
  let pack;

  try {
    base = JSON.parse(
      fs.readFileSync(baseFile, 'utf8')
    );

    pack = JSON.parse(
      fs.readFileSync(packageFile, 'utf8')
    );
  } catch (e) {
    fail('JSON inválido: ' + e.message);
  }

  if (!process.exitCode) {
    if (
      !base ||
      !Array.isArray(base.himnos)
    ) {
      fail('Estrutura base.himnos inválida.');
    } else if (
      typeof base.total === 'number' &&
      base.total !== base.himnos.length
    ) {
      fail('base.total diverge de himnos.length.');
    } else if (
      pack.schema_version !==
      'admfc-admin-changes-1'
    ) {
      fail('schema_version inválido.');
    } else if (!Array.isArray(pack.changes)) {
      fail('changes inválido.');
    } else if (
      pack.total_changes !== pack.changes.length
    ) {
      fail('total_changes divergente.');
    }
  }

  if (!process.exitCode) {
    let ready = 0;
    let already = 0;
    let conflict = 0;
    let invalid = 0;

    console.log('');
    console.log('=== ANÁLISE ===');

    for (const change of pack.changes) {
      console.log('');
      console.log(
        change.hymn_id,
        '—',
        change.titulo
      );

      let recordInvalid = false;
      let recordConflict = false;
      let recordReady = false;
      let recordAlready = false;

      if (change.action !== 'update') {
        console.log('INVALID: action');
        recordInvalid = true;
      }

      const hymn = base.himnos.find(
        h => h.id === change.hymn_id
      );

      if (!hymn) {
        console.log('INVALID: hymn_id');
        recordInvalid = true;
      }

      if (
        hymn &&
        (
          hymn.himnario !== change.himnario ||
          hymn.numero !== change.numero
        )
      ) {
        console.log('INVALID: identidade');
        recordInvalid = true;
      }

      if (
        !Array.isArray(change.changed_fields) ||
        change.changed_fields.length === 0
      ) {
        console.log('INVALID: changed_fields');
        recordInvalid = true;
      }

      if (
        !recordInvalid &&
        hymn
      ) {
        for (const field of change.changed_fields) {
          if (!ALLOWED_FIELDS.has(field)) {
            console.log(field + ': INVALID_FIELD');
            recordInvalid = true;
            continue;
          }

          const current = hymn[field];
          const before = change.before?.[field];
          const after = change.after?.[field];

          if (same(current, after)) {
            console.log(field + ': ALREADY_APPLIED');
            recordAlready = true;
          } else if (same(current, before)) {
            console.log(field + ': READY_TO_APPLY');
            recordReady = true;
          } else {
            console.log(field + ': CONFLICT');
            recordConflict = true;
          }
        }
      }

      if (recordInvalid) {
        invalid++;
        console.log('RESULTADO: INVALID');
      } else if (recordConflict) {
        conflict++;
        console.log('RESULTADO: CONFLICT');
      } else if (recordReady) {
        ready++;
        console.log('RESULTADO: READY_TO_APPLY');
      } else if (recordAlready) {
        already++;
        console.log('RESULTADO: ALREADY_APPLIED');
      } else {
        invalid++;
        console.log('RESULTADO: INVALID');
      }
    }

    console.log('');
    console.log('=== RESUMO ===');
    console.log('READY_TO_APPLY:', ready);
    console.log('ALREADY_APPLIED:', already);
    console.log('CONFLICT:', conflict);
    console.log('INVALID:', invalid);

    if (conflict || invalid) {
      console.log('DECISÃO: BLOQUEADO');
      process.exitCode = 2;
    } else if (ready) {
      console.log('DECISÃO: APTO PARA APLICAÇÃO');
    } else {
      console.log('DECISÃO: JÁ SINCRONIZADO');
    }


    /*
     * ADMFC_7X_ORPHAN_RECOVERY
     *
     * Antes de qualquer nova escrita, verifica se existe
     * um .tmp deixado por uma execução interrompida.
     *
     * Política conservadora:
     * - nunca promove automaticamente o TEMP;
     * - nunca apaga silenciosamente;
     * - preserva como artefato órfão;
     * - só faz isso quando BASE e BACKUP representam
     *   o mesmo estado pré-commit.
     */
    if (applyMode) {
      const orphanTemp =
        baseFile + '.tmp';

      const orphanBackup =
        baseFile + '.bak-before-apply';

      if (fs.existsSync(orphanTemp)) {
        console.log('');
        console.log(
          '=== RECUPERAÇÃO DE TRANSAÇÃO INTERROMPIDA ==='
        );

        if (!fs.existsSync(orphanBackup)) {
          console.error(
            'BLOQUEADO: TEMP órfão existe sem backup correspondente.'
          );

          process.exitCode = 6;
        } else {
          let tempValid = false;
          let backupValid = false;

          try {
            const tempData = JSON.parse(
              fs.readFileSync(orphanTemp, 'utf8')
            );

            tempValid =
              !!tempData &&
              Array.isArray(tempData.himnos);
          } catch (_) {
            tempValid = false;
          }

          try {
            const backupData = JSON.parse(
              fs.readFileSync(orphanBackup, 'utf8')
            );

            backupValid =
              !!backupData &&
              Array.isArray(backupData.himnos);
          } catch (_) {
            backupValid = false;
          }

          if (!tempValid || !backupValid) {
            console.error(
              'BLOQUEADO: artefatos de recuperação inválidos.'
            );

            process.exitCode = 6;
          } else {
            const currentHash =
              sha256(baseFile);

            const backupHash =
              sha256(orphanBackup);

            const tempHash =
              sha256(orphanTemp);

            console.log(
              'HASH BASE:  ',
              currentHash
            );

            console.log(
              'HASH BACKUP:',
              backupHash
            );

            console.log(
              'HASH TEMP:  ',
              tempHash
            );

            if (
              currentHash === backupHash &&
              tempHash !== currentHash
            ) {
              let orphanFile =
                orphanTemp + '.orphan';

              let suffix = 1;

              while (fs.existsSync(orphanFile)) {
                orphanFile =
                  orphanTemp +
                  '.orphan-' +
                  suffix;

                suffix++;
              }

              fs.renameSync(
                orphanTemp,
                orphanFile
              );

              console.log(
                'TEMP ÓRFÃO DETECTADO'
              );

              console.log(
                'TEMP NÃO FOI PROMOVIDO'
              );

              console.log(
                'ARTEFATO PRESERVADO:',
                orphanFile
              );

              console.log(
                'RECUPERAÇÃO CONSERVADORA: OK'
              );

              console.log(
                'NOVA APLICAÇÃO: BLOQUEADA NESTA EXECUÇÃO'
              );

              console.log(
                'Execute novamente o aplicador após revisar o artefato órfão.'
              );

              process.exitCode = 6;
            } else if (
              tempHash === currentHash
            ) {
              console.error(
                'BLOQUEADO: TEMP coincide com BASE; estado requer auditoria.'
              );

              process.exitCode = 6;
            } else {
              console.error(
                'BLOQUEADO: estado transacional órfão não reconhecido.'
              );

              process.exitCode = 6;
            }
          }
        }
      }
    }

    if (
      !process.exitCode &&
      applyMode &&
      ready > 0 &&
      conflict === 0 &&
      invalid === 0
    ) {
      console.log('');
      console.log('=== APLICAÇÃO TRANSACIONAL ===');

      /*
       * Proteção crítica:
       * nesta fase 7R.3 é proibido aplicar diretamente
       * na Base Mestre oficial.
       */
      if (baseFile === "assets/base_mestre.OFICIAL-SIMULADA-7Y43.json") {
        /*
         * PROTÓTIPO 7Y.2:
         *
         * Mesmo com autorização correta,
         * esta versão NÃO executará escrita oficial.
         *
         * Ela apenas prova que o gate reconhece
         * ou rejeita a autorização.
         */
        if (!authorizeOfficial) {
          console.error(
            'BLOQUEADO: autorização oficial ausente.'
          );

          process.exitCode = 4;
        } else if (
          officialToken !== REQUIRED_OFFICIAL_TOKEN
        ) {
          console.error(
            'BLOQUEADO: token oficial ausente ou inválido.'
          );

          process.exitCode = 5;
        } else if (
          hashBefore !== EXPECTED_HASH
        ) {
          console.error(
            'BLOQUEADO: checkpoint oficial divergente.'
          );

          process.exitCode = 3;
        } else {
          console.log(
            'AUTORIZAÇÃO OFICIAL SIMULADA: RECONHECIDA'
          );

          /*
           * 7Y.3:
           * Commit permitido exclusivamente quando
           * o alvo é a Base Oficial Simulada.
           */
          if (baseFile !== "assets/base_mestre.OFICIAL-SIMULADA-7Y43.json") {
            console.error(
              'BLOQUEADO: alvo não corresponde à Base Oficial Simulada 7Y.3.'
            );

            process.exitCode = 9;
          } else {
            const backupFile =
              baseFile + '.bak-before-apply';

            const tempFile =
              baseFile + '.tmp';

            fs.copyFileSync(
              baseFile,
              backupFile
            );

            console.log(
              'BACKUP:',
              backupFile
            );

            let appliedFields = 0;

            for (const change of pack.changes) {
              const hymn = base.himnos.find(
                h => h.id === change.hymn_id
              );

              if (!hymn) continue;

              for (
                const field of change.changed_fields
              ) {
                if (!ALLOWED_FIELDS.has(field)) {
                  continue;
                }

                const current =
                  hymn[field];

                const before =
                  change.before?.[field];

                const after =
                  change.after?.[field];

                if (same(current, before)) {
                  hymn[field] = after;

                  appliedFields++;

                  console.log(
                    change.hymn_id +
                    '.' +
                    field +
                    ': APPLIED'
                  );
                }
              }
            }

            const serialized =
              JSON.stringify(base, null, 2) + '\n';

            fs.writeFileSync(
              tempFile,
              serialized,
              'utf8'
            );

            /*
             * Validação física do TEMP.
             */
            const tempData = JSON.parse(
              fs.readFileSync(
                tempFile,
                'utf8'
              )
            );

            if (
              !tempData ||
              !Array.isArray(tempData.himnos) ||
              tempData.himnos.length !==
                base.himnos.length
            ) {
              console.error(
                'ERRO: TEMP transacional inválido.'
              );

              process.exitCode = 10;
            } else {
              console.log(
                'TEMP: VALIDADO'
              );

              fs.renameSync(
                tempFile,
                baseFile
              );

              /*
               * Evidência somente após rename bem-sucedido.
               */
              officialCommitExecuted = true;

              console.log(
                'COMMIT ATÔMICO: EXECUTADO'
              );

              console.log(
                'CAMPOS APLICADOS:',
                appliedFields
              );

              console.log(
                'TRANSAÇÃO SIMULADA: CONCLUÍDA'
              );
            }
          }
        }
      } else {
        const backupFile =
          baseFile + '.bak-before-apply';

        const tempFile =
          baseFile + '.tmp';

        fs.copyFileSync(
          baseFile,
          backupFile
        );

        console.log(
          'BACKUP:',
          backupFile
        );

        let appliedFields = 0;

        for (const change of pack.changes) {
          const hymn = base.himnos.find(
            h => h.id === change.hymn_id
          );

          if (!hymn) continue;

          for (const field of change.changed_fields) {
            if (!ALLOWED_FIELDS.has(field)) continue;

            const current = hymn[field];
            const before = change.before?.[field];
            const after = change.after?.[field];

            if (same(current, before)) {
              hymn[field] = after;
              appliedFields++;

              console.log(
                change.hymn_id + '.' + field +
                ': APPLIED'
              );
            }
          }
        }

        const serialized =
          JSON.stringify(base, null, 2) + '\n';

        fs.writeFileSync(
          tempFile,
          serialized,
          'utf8'
        );

        /*
         * Valida o JSON temporário antes da substituição.
         */
        JSON.parse(
          fs.readFileSync(tempFile, 'utf8')
        );

        fs.renameSync(
          tempFile,
          baseFile
        );

        console.log(
          'CAMPOS APLICADOS:',
          appliedFields
        );

        console.log(
          'TRANSAÇÃO: CONCLUÍDA'
        );
      }
    }

    console.log('');
    console.log(
      applyMode
        ? '=== GARANTIA PÓS-TRANSAÇÃO ==='
        : '=== GARANTIA DRY-RUN ==='
    );

    const hashAfter = sha256(baseFile);

    console.log('HASH ANTES:', hashBefore);
    console.log('HASH DEPOIS:', hashAfter);

    if (!applyMode) {
      if (hashBefore !== hashAfter) {
        console.error(
          'ERRO CRÍTICO: DRY-RUN ALTEROU A BASE.'
        );
        process.exitCode = 3;
      } else {
        console.log('BASE: INTACTA');
      }
    } else {
      console.log(
        'HASH ALTERADO:',
        hashBefore !== hashAfter ? 'SIM' : 'NÃO'
      );
    }

    if (
      baseFile === "assets/base_mestre.OFICIAL-SIMULADA-7Y43.json"
    ) {
      console.log(
        'CHECKPOINT OFICIAL:',
        hashAfter === EXPECTED_HASH
          ? 'OK'
          : 'DIVERGENTE'
      );

      /*
       * ADMFC_7Y31_POST_COMMIT_SEMANTICS
       *
       * EXPECTED_HASH representa o checkpoint
       * obrigatório de ENTRADA.
       *
       * Após um commit autorizado, o hash novo
       * deve divergir se houve alteração real.
       */
      if (officialCommitExecuted) {
        if (hashAfter === hashBefore) {
          console.error(
            'ERRO: commit autorizado não produziu novo estado.'
          );

          process.exitCode = 11;
        } else {
          console.log(
            'CHECKPOINT PRÉ-COMMIT: VALIDADO'
          );

          console.log(
            'NOVO ESTADO PÓS-COMMIT: ACEITO'
          );
        }
      } else if (
        applyMode &&
        ready > 0 &&
        !officialCommitExecuted &&
        process.exitCode
      ) {
        console.log(
          'PÓS-COMMIT: NÃO APLICÁVEL — TRANSAÇÃO BLOQUEADA'
        );
      } else if (
        !applyMode &&
        hashAfter !== EXPECTED_HASH
      ) {
        process.exitCode = 3;
      }
    }
  }
}
