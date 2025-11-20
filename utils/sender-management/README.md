# sender-management

TypeScript Library / CLI utility for managing comms manager sender configuration. These are currently stored in SSM Parameter Store.

## Usage

### CLI Usage

From the repo root run:

```bash
npm --prefix utils/sender-management run-script cli -- <command> [options]
```

### Library Usage

Install the package as `@sender-management`

Instantiate an instance of the library as follows. The library should take an implementation of an `IParameterStore` to define how the library will interact with SSM (e.g. caching vs non-caching).

```ts
import { SenderManagement } from '@sender-management';

const sm = SenderManagement({ parameterStore: new ParameterStore() });
```

### Global Options

#### CLI Options

- `--environment` - The name of the environment to run the command on e.g. 'de-<shortcode>', 'uat', 'prod'. Required.
- `--format` - print data in json or tabular format. Default is `table`.

#### Library Options

```ts
const sm = SenderManagement({
  parameterStore: new ParameterStore(),
  configOverrides: { environment: 'de-miha12' },
});
```

## Commands

### Sender Configuration Commands

- [Put Sender](#put-sender)
- [List Senders](#list-senders)
- [Get Sender](#get-sender)
- [Delete Sender](#delete-sender)

#### Put Sender

Insert a new sender or update an existing one. Omit the `--sender-id` option to insert a new sender. Include it to update an existing sender. Note: the INT and PROD senderIds should be the same ID.

##### Put Sender Options

- `--sender-id` - the ID of the sender to update. (defaults to uuid. Should typically be excluded unless overwriting an existing sender). It cannot contain spaces.
- `--sender-name` - the display name of the sender. Will throw an error if this name is already taken. Unique across all the senders. (required)
- `--mesh-mailbox-sender-id` - the mesh mailbox id for this sender. Unique across all the senders. (required)
- `--mesh-mailbox-reports-id` - the mesh mailbox id used for reporting for this sender. It can be the same as mesh-mailbox-sender-id. (required)
- `--fallback-wait-time-seconds` - the fallback wait time to print letters. (required) (number)
- `--routing-config-id` - the routing configuration id. (required)

##### Put Sender Examples

```bash
npm --prefix utils/sender-management run-script cli -- put-sender \
  --sender-name 'Derby & Burton Trust' \
  --mesh-mailbox-sender-id 'DerbyMailboxId' \
  --mesh-mailbox-reports-id 'DerbyMailboxReportsId' \
  --fallback-wait-time-seconds 100 \
  --routing-config-id 'abc123' \
  --environment 'de-cljo1'
```

```bash
npm --prefix utils/sender-management run-script cli -- put-sender \
  --sender-id 'integration_test_sender' \
  --sender-name 'integration test sender' \
  --mesh-mailbox-sender-id '123456' \
  --mesh-mailbox-reports-id '123456' \
  --fallback-wait-time-seconds 100 \
  --routing-config-id 'abc123' \
  --environment 'de-cljo1'
```

```ts
const sender = await sm.putSender({
  senderName: 'vaccs',
  meshMailboxSenderId: 'meshMailbox1234',
  meshMailboxReportsId: 'meshMailboxReport1234',
  fallbackWaitTimeSeconds: 300,
  routingConfigId: '1234',
});
```

#### List Senders

Return a list of all existing senders

##### List Senders Examples

```bash
npm --prefix utils/sender-management run-script cli -- list-senders --environment de-cljo1
```

```ts
const senders = await sm.listSenders();
```

#### Get Sender

Return an individual sender by senderId

##### Get Sender Examples

```bash
npm --prefix utils/sender-management run-script cli -- get-sender \
  --sender-id 'integration_test_sender' \
  --environment 'de-cljo1'
```

```ts
const sender = await sm.getSender({
  senderId: 'integration_test_sender',
});
```

#### Delete Sender

Delete an individual sender by senderId.

##### Delete Sender Examples

```bash
npm --prefix utils/sender-management run-script cli -- delete-sender \
  --sender-id 'integration_test_sender' \
  --environment de-cljo1
```

```ts
const sender = await sm.deleteSender({
  senderId: 'integration_test_sender',
});
```
