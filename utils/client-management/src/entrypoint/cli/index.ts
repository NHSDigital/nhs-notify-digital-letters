import { ParameterStore } from 'utils';
import type { ClientMetadata } from 'utils';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { ClientManagement } from '../..';
import {
  METADATA_PROVIDERS,
  METADATA_SCOPE,
  METADATA_TYPES,
} from '../../domain/metadata';

type PrintFormat = 'json' | 'table';
type PrintFunction = (value: unknown) => void;

function getPrinter(format: PrintFormat): PrintFunction {
  /* eslint-disable no-console */
  if (format === 'json') {
    return (value) => console.log(JSON.stringify(value, null, 2));
  }

  return (value) => console.table(Array.isArray(value) ? value : [value]);
  /* eslint-enable no-console */
}

async function main() {
  let clientManagement: ReturnType<typeof ClientManagement>;
  let print: PrintFunction;

  function setGlobals(argv: { environment?: string; format: string }) {
    clientManagement = ClientManagement({
      parameterStore: new ParameterStore(),
      configOverrides: { environment: argv.environment },
    });

    print = getPrinter(argv.format as PrintFormat);
  }

  await yargs(hideBin(process.argv))
    .option('environment', {
      type: 'string',
      global: true,
      demandOption: true,
    })
    .option('format', {
      type: 'string',
      choices: ['json', 'table'],
      default: 'table',
      global: true,
      demandOption: false,
    })
    .middleware(setGlobals)
    .command(
      'delete-client',
      'delete a specific client by id, including the APIM client',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
        'delete-metadata': {
          type: 'boolean',
          default: false,
        },
      },
      async (argv) => {
        await clientManagement.deleteClient({
          clientId: argv.clientId,
          deleteMetadata: argv.deleteMetadata,
        });

        print({ clientId: argv.clientId });

        const apimClient = await clientManagement.deleteApimClient({
          clientId: argv.clientId,
        });

        print(apimClient);
      }
    )
    .command(
      'get-client',
      'return a specific client by id',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        const client = await clientManagement.getClient({
          clientId: argv.clientId,
        });

        print(client);
      }
    )
    .command(
      'get-client-by-name',
      'return a specific client by name',
      {
        name: {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        const client = await clientManagement.getClientByName({
          name: argv.name,
        });

        print(client);
      }
    )
    .command('list-clients', 'return a list of clients', {}, async () => {
      const clients = await clientManagement.listClients();

      print(clients);
    })
    .command(
      'put-client',
      'create or update a client',
      {
        'client-id': {
          type: 'string',
          demandOption: false,
        },
        name: {
          type: 'string',
          demandOption: true,
        },
        'mesh-mailbox-id': {
          type: 'string',
          demandOption: false,
        },
        'allow-ods-override': {
          type: 'boolean',
          demandOption: false,
        },
        'sender-ods-code': {
          type: 'string',
          demandOption: false,
        },
        'allow-alternative-contact-details': {
          type: 'boolean',
          demandOption: false,
        },
        'unprefixed-name': {
          type: 'boolean',
          demandOption: false,
        },
        'allow-anonymous-patient': {
          type: 'boolean',
          demandOption: false,
        },
        'ignore-security-flag': {
          type: 'boolean',
          demandOption: false,
        },
        'allow-rfr-override': {
          type: 'boolean',
          demandOption: false,
        },
        'allow-rfr-override-codes': {
          type: 'string',
          demandOption: false,
          describe:
            'comma separated list of RfR override codes (only used if --allow-rfr-override is true)',
        },
        'apim-id': {
          type: 'string',
          demandOption: false,
        },
      },
      async (argv) => {
        const client = await clientManagement.putClient({
          clientId: argv.clientId,
          name: argv.name,
          meshMailboxId: argv.meshMailboxId,
          allowOdsOverride: argv.allowOdsOverride,
          senderOdsCode: argv.senderOdsCode,
          allowAlternativeContactDetails: argv.allowAlternativeContactDetails,
          unprefixedName: argv.unprefixedName,
          allowAnonymousPatient: argv.allowAnonymousPatient,
          ignoreSecurityFlag: argv.ignoreSecurityFlag,
          allowRfrOverride: argv.allowRfrOverride,
        });

        print(client);

        if (argv.allowRfrOverrideCodes !== undefined) {
          const metaData = await clientManagement.putClientMetadata({
            clientId: client.clientId,
            provider: 'rfr-override',
            type: 'codes',
            value: argv.allowRfrOverrideCodes,
            scope: 'client-metadata',
          });

          print(metaData);
        }

        if (argv.apimId !== undefined) {
          const apimClient = await clientManagement.addApimClient({
            apimId: argv.apimId,
            clientId: client.clientId,
          });

          print(apimClient);
        }
      }
    )
    .check((argv) => {
      if (
        argv['allow-rfr-override'] === false &&
        argv['allow-rfr-override-codes']
      ) {
        /* eslint-disable no-console */
        console.log(
          '\u001B[43m\u001B[30m WARNING \u001B[0m \u001B[33m--allow-rfr-override-codes will have no effect because --allow-rfr-override is false.\u001B[0m'
        );
      }
      return true;
    })
    .command(
      'get-client-metadata',
      'retrieve an item of client metadata',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
        'campaign-id': {
          type: 'string',
        },
        scope: {
          type: 'string',
          demandOption: true,
          choices: METADATA_SCOPE,
        },
        provider: {
          type: 'string',
          demandOption: true,
          choices: METADATA_PROVIDERS,
        },
        type: {
          type: 'string',
          demandOption: true,
          choices: METADATA_TYPES,
        },
      },
      async (argv) => {
        const commonArgs = {
          clientId: argv.clientId,
          provider: argv.provider,
          type: argv.type,
        } satisfies Partial<ClientMetadata>;

        if (argv.scope === 'campaign-metadata') {
          if (!argv.campaignId) {
            throw new Error(
              'If scope is campaign-metadata, campaign-id must be provided'
            );
          }

          print(
            await clientManagement.getClientMetadata({
              ...commonArgs,
              campaignId: argv.campaignId,
              scope: argv.scope,
            })
          );
        } else {
          print(
            await clientManagement.getClientMetadata({
              ...commonArgs,
              scope: argv.scope,
            })
          );
        }
      }
    )
    .command(
      'list-client-metadata',
      'list all client metadata items for a client',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        const items = await clientManagement.listClientMetadata({
          clientId: argv.clientId,
        });

        print(items);
      }
    )
    .command(
      'put-client-metadata',
      'create or update an item of client metadata',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
        'campaign-id': {
          type: 'string',
        },
        provider: {
          type: 'string',
          demandOption: true,
          choices: METADATA_PROVIDERS,
        },
        scope: {
          type: 'string',
          demandOption: true,
          choices: METADATA_SCOPE,
        },
        type: {
          type: 'string',
          demandOption: true,
          choices: METADATA_TYPES,
        },
        value: {
          type: 'string',
          demandOption: true,
          describe:
            'Value to store. If provider=rfr-override and type=codes, this can be comma-separated codes.',
        },
      },
      async (argv) => {
        const commonArgs = {
          clientId: argv.clientId,
          provider: argv.provider,
          type: argv.type,
          value: argv.value,
        } satisfies Partial<ClientMetadata>;

        if (argv.scope === 'campaign-metadata') {
          if (!argv.campaignId) {
            throw new Error(
              'If scope is campaign-metadata, campaign-id must be provided'
            );
          }

          print(
            await clientManagement.putClientMetadata({
              ...commonArgs,
              campaignId: argv.campaignId,
              scope: argv.scope,
            })
          );
        } else {
          print(
            await clientManagement.putClientMetadata({
              ...commonArgs,
              scope: argv.scope,
            })
          );
        }
      }
    )
    .command(
      'delete-client-metadata',
      'delete an item of client metadata',
      {
        'client-id': {
          type: 'string',
          demandOption: true,
        },
        'campaign-id': {
          type: 'string',
        },
        scope: {
          type: 'string',
          demandOption: true,
          choices: METADATA_SCOPE,
        },
        provider: {
          type: 'string',
          demandOption: true,
          choices: METADATA_PROVIDERS,
        },
        type: {
          type: 'string',
          demandOption: true,
          choices: METADATA_TYPES,
        },
      },
      async (argv) => {
        const commonArgs = {
          clientId: argv.clientId,
          provider: argv.provider,
          type: argv.type,
        } satisfies Partial<ClientMetadata>;

        if (argv.scope === 'campaign-metadata') {
          if (!argv.campaignId) {
            throw new Error(
              'If scope is campaign-metadata, campaign-id must be provided'
            );
          }

          print(
            await clientManagement.deleteClientMetadata({
              ...commonArgs,
              campaignId: argv.campaignId,
              scope: argv.scope,
            })
          );
        } else {
          print(
            await clientManagement.deleteClientMetadata({
              ...commonArgs,
              scope: argv.scope,
            })
          );
        }
      }
    )
    .command(
      'rename-clients',
      'change the client name for existing clients',
      {
        filename: {
          type: 'string',
          demandOption: true,
          describe: 'Filename of mapping CSV located in inputs folder',
        },
        dryRun: {
          type: 'boolean',
          default: true,
          demandOption: false,
          describe: 'Only put changes if dryRun false; defaults true',
        },
      },
      async (argv) => {
        const updates = await clientManagement.renameClients({
          filename: argv.filename,
          dryRun: argv.dryRun,
        });

        print(
          argv.dryRun
            ? 'Dry Run - The following have not been applied:'
            : 'Live Run - The following have been applied:'
        );
        print(updates);
      }
    )
    .demandCommand(1)
    .parse();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}
