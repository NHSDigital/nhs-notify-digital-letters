import {
  DescribeDeliveryStreamCommand,
  DescribeDeliveryStreamCommandOutput,
  ExtendedS3DestinationUpdate,
  FirehoseClient,
  UpdateDestinationCommand,
} from '@aws-sdk/client-firehose';
import { FIREHOSE_STREAM_NAME, REGION } from 'constants/backend-constants';

export async function alterFirehoseBufferIntervals(bufferIntervalConfig: {
  expected: {
    destination: number;
    processor: number;
  };
  update: {
    destination: number;
    processor: number;
  };
}) {
  const client = new FirehoseClient({ region: REGION });

  const deliveryStreamDetails: DescribeDeliveryStreamCommandOutput =
    await client.send(
      new DescribeDeliveryStreamCommand({
        DeliveryStreamName: FIREHOSE_STREAM_NAME,
      }),
    );

  const destinations =
    deliveryStreamDetails.DeliveryStreamDescription?.Destinations ?? [];
  if (destinations.length !== 1) {
    throw new Error('expected a single delivery destination');
  }

  const destination = destinations[0];

  const currentDestinationBufferInterval =
    destination.ExtendedS3DestinationDescription?.BufferingHints
      ?.IntervalInSeconds;

  if (
    currentDestinationBufferInterval !==
    bufferIntervalConfig.expected.destination
  ) {
    throw new Error(
      `Expected destination buffer size to be ${bufferIntervalConfig.expected.destination} - got ${currentDestinationBufferInterval} - cannot safely alter, has the default value changed in code or manually?`,
    );
  }

  const processors =
    destination.ExtendedS3DestinationDescription?.ProcessingConfiguration
      ?.Processors;

  if (processors?.length !== 1) {
    throw new Error('Expected one processor to be configured');
  }

  const processor = processors[0];

  const currentProcessorBufferInterval = processor.Parameters?.find(
    (p) => p.ParameterName === 'BufferIntervalInSeconds',
  )?.ParameterValue;

  const otherParams =
    processor.Parameters?.filter(
      (p) => p.ParameterName !== 'BufferIntervalInSeconds',
    ) ?? [];

  if (
    currentProcessorBufferInterval !==
    bufferIntervalConfig.expected.processor.toString()
  ) {
    throw new Error(
      `Expected processor buffer size to be ${bufferIntervalConfig.expected.processor} - got ${currentProcessorBufferInterval} - cannot safely alter, has the default value changed in code or manually?`,
    );
  }

  const destinationId = destination.DestinationId;

  if (!destinationId) {
    throw new Error('Destination ID not found');
  }

  const updatedDestinationConfig: ExtendedS3DestinationUpdate = {
    ...destination.ExtendedS3DestinationDescription,
    BufferingHints: {
      ...destination.ExtendedS3DestinationDescription?.BufferingHints,
      IntervalInSeconds: bufferIntervalConfig.update.destination,
    },
    ProcessingConfiguration: {
      ...destination.ExtendedS3DestinationDescription?.ProcessingConfiguration,
      Processors: [
        {
          ...processor,
          Parameters: [
            ...otherParams,
            {
              ParameterName: 'BufferIntervalInSeconds',
              ParameterValue: bufferIntervalConfig.update.processor.toString(),
            },
          ],
        },
      ],
    },
  };

  await client.send(
    new UpdateDestinationCommand({
      DeliveryStreamName: FIREHOSE_STREAM_NAME,
      DestinationId: destinationId,
      CurrentDeliveryStreamVersionId:
        deliveryStreamDetails.DeliveryStreamDescription?.VersionId,
      ExtendedS3DestinationUpdate: updatedDestinationConfig,
    }),
  );
}
