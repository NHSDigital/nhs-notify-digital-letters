/* eslint-disable no-console */
import { createOutputDir, writeFile } from 'file-utils';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { eventSchemasDir, listEventSchemas, loadSchema } from 'utils';

export async function generateGuardFunctions() {
  const eventSchemaFilenames = listEventSchemas();
  const outputDir = createOutputDir('guard-functions');
  console.log(`Output directory created at ${outputDir}`);

  console.group('Writing guard functions:');
  const indexLines: string[] = [];
  for (const eventSchemaFilename of eventSchemaFilenames) {
    const eventSchemaPath = path.join(eventSchemasDir, eventSchemaFilename);
    const eventSchema = loadSchema(eventSchemaPath);
    const typeName = eventSchema.title;

    const validatorVariableName = `event${typeName}Validator`;

    const guardFunction = `import ${validatorVariableName} from 'digital-letters-events/${typeName}.js';
import { InvalidEvent, type ${typeName} } from 'digital-letters-events';
import { Logger } from 'utils';

export function validate${typeName}(
  event: unknown,
  logger: Logger,
): asserts event is ${typeName} {
  if (!${validatorVariableName}(event)) {
    logger.error({
      err: ${validatorVariableName}.errors,
      description: 'Error parsing ${typeName} event',
    });
    throw new InvalidEvent(${validatorVariableName}.errors);
  }
}`;

    const typeDeclarationFilename = `${typeName}.ts`;
    writeFile(outputDir, typeDeclarationFilename, guardFunction);
    console.log(typeDeclarationFilename);

    indexLines.push(`export * from './${typeName}';`);
  }
  console.groupEnd();

  writeFileSync(path.join(outputDir, 'index.ts'), `${indexLines.join('\n')}\n`);
  console.log('index.ts file written');
}
