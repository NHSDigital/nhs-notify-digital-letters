import {
  type ClientMetadataProvider,
  type ClientMetadataType,
  type ClientMetadata,
  type ClientMetadataIndex,
  type NonEmptyArray,
  schemaForType,
} from 'utils';
import { z, type SafeParseReturnType } from 'zod';
import { ValidationException } from './exceptions';
import type { MetadataIndex } from '../infra/interfaces';

export type CreateClientMetadataParameters = ClientMetadata;

export type IndexParseResult = SafeParseReturnType<
  Record<string, string>,
  MetadataIndex
>;

export const METADATA_SCOPE: NonEmptyArray<ClientMetadata['scope']> = [
  'client-metadata',
  'campaign-metadata',
];

export const METADATA_PROVIDERS: NonEmptyArray<ClientMetadataProvider> = [
  'govuknotify',
  'rfr-override',
];

export const METADATA_TYPES: NonEmptyArray<ClientMetadataType> = [
  'api_key',
  'polling_index',
  'polling_index_international_numbers',
  'codes',
];

const $CampaignId = z.string().refine((id) => !id.includes('_'), {
  message: 'campaignId must not contain underscores',
});

const $MetadataBase = z.object({
  clientId: z.string().nonempty(),
  provider: z.enum(METADATA_PROVIDERS),
  type: z.enum(METADATA_TYPES),
});

const $MetadataIndex = schemaForType<ClientMetadataIndex>()(
  z.discriminatedUnion('scope', [
    $MetadataBase.merge(
      z.object({
        scope: z.literal('client-metadata'),
      })
    ),
    $MetadataBase.merge(
      z.object({
        scope: z.literal('campaign-metadata'),
        campaignId: $CampaignId,
      })
    ),
  ])
);

function parseIndexFields(input: Record<string, string>): IndexParseResult {
  return $MetadataIndex.safeParse(input);
}

export function parseMetadataIndex(path: string): ClientMetadataIndex | null {
  const match = path.match(
    /^\/comms\/[^/]+\/clients\/(?<clientId>[^/]+)\/(?<scope>[^/]+)\/((?<campaignId>[^/]+)\/)?(?<provider>[^/]+)\/(?<type>[^/]+)$/
  );

  const { clientId, scope, provider, type, campaignId } = match?.groups ?? {};

  const index = { clientId, scope, provider, type, campaignId };

  const validationResult = parseIndexFields(index);

  return validationResult.success ? validationResult.data : null;
}

export function createMetadata(
  metadata: CreateClientMetadataParameters
): ClientMetadata {
  if (!metadata.value) {
    throw new ValidationException('Metadata value not given.');
  }

  const indexParseResult = parseIndexFields(metadata);

  if (indexParseResult.success === false) {
    const { message, issues } = indexParseResult.error;

    const issue = issues?.[0];

    const logMessage =
      issue.message && issue.path
        ? `${issue.message} path: ${issue.path}`
        : message;

    throw new ValidationException(
      `Failed to parse metadata index: ${logMessage}`
    );
  }

  const commonArgs = {
    clientId: metadata.clientId,
    provider: metadata.provider,
    type: metadata.type,
    value: String(metadata.value),
  } satisfies Partial<ClientMetadata>;

  return metadata.scope === 'campaign-metadata'
    ? {
        ...commonArgs,
        scope: metadata.scope,
        campaignId: metadata.campaignId,
      }
    : {
        ...commonArgs,
        scope: metadata.scope,
      };
}
