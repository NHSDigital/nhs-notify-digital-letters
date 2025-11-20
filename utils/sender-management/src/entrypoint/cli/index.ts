import { ParameterStore } from 'utils';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { SenderManagement } from '../..';

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

export async function main() {
  let senderManagement: ReturnType<typeof SenderManagement>;
  let print: PrintFunction;

  function setGlobals(argv: { environment?: string; format: string }) {
    senderManagement = SenderManagement({
      parameterStore: new ParameterStore(),
      configOverrides: { environment: argv.environment },
    });

    print = getPrinter(argv.format as PrintFormat);
  }

  await yargs(hideBin(process.argv))
    .exitProcess(false)
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
      'delete-sender',
      'delete a specific sender by id',
      {
        'sender-id': {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        await senderManagement.deleteSender({
          senderId: argv.senderId,
        });

        print({ senderId: argv.senderId });
      },
    )
    .command(
      'get-sender',
      'return a specific sender by id',
      {
        'sender-id': {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        const sender = await senderManagement.getSender({
          senderId: argv.senderId,
        });

        print(sender);
      },
    )
    .command('list-senders', 'return a list of senders', {}, async () => {
      const senders = await senderManagement.listSenders();

      print(senders);
    })
    .command(
      'put-sender',
      'create or update a sender',
      {
        'sender-id': {
          type: 'string',
          demandOption: false,
        },
        'sender-name': {
          type: 'string',
          demandOption: true,
        },
        'mesh-mailbox-sender-id': {
          type: 'string',
          demandOption: true,
        },
        'mesh-mailbox-reports-id': {
          type: 'string',
          demandOption: true,
        },
        'fallback-wait-time-seconds': {
          type: 'number',
          demandOption: true,
        },
        'routing-config-id': {
          type: 'string',
          demandOption: true,
        },
      },
      async (argv) => {
        const sender = await senderManagement.putSender({
          senderId: argv.senderId,
          senderName: argv.senderName,
          meshMailboxSenderId: argv.meshMailboxSenderId,
          meshMailboxReportsId: argv.meshMailboxReportsId,
          fallbackWaitTimeSeconds: argv.fallbackWaitTimeSeconds,
          routingConfigId: argv.routingConfigId,
        });

        print(sender);
      },
    )
    .demandCommand(1)
    .parse();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error); // eslint-disable-line no-console
    process.exitCode = 1;
  });
}
