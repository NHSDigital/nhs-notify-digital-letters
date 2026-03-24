/* eslint-disable no-console */
import { createOutputDir, writeFile, writeTypesIndex } from 'file-utils';
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

    let guardFunction = `import ${validatorVariableName} from 'digital-letters-events/${typeName}.js'\n`;
    guardFunction += `import { InvalidEvent, type ${typeName} } from 'digital-letters-events';`;
    guardFunction += `import { Logger } from 'utils';\n\n`;

    guardFunction += `export function validate${typeName}(\n`;
    guardFunction += `  event: unknown,\n`;
    guardFunction += `  logger: Logger,\n`;
    guardFunction += `): asserts event is ${typeName} {\n`;
    guardFunction += `  if (!${validatorVariableName}(event)) {\n`;
    guardFunction += `    logger.error({\n`;
    guardFunction += `      err: ${validatorVariableName}.errors,\n`;
    guardFunction += `      description: 'Error parsing ${typeName} event',\n`;
    guardFunction += `    });\n`;
    guardFunction += `    throw new InvalidEvent(${validatorVariableName}.errors);\n`;
    guardFunction += `  }\n`;
    guardFunction += `}\n`;


    const typeDeclarationName = `${typeName}`;
    const typeDeclarationFilename = `${typeDeclarationName}.ts`;
    writeFile(outputDir, typeDeclarationFilename, guardFunction);
    console.log(typeDeclarationFilename);

    indexLines.push(`export * from './${typeDeclarationName}';`);
  }
  console.groupEnd();

  writeFileSync(path.join(outputDir, 'index.ts'), `${indexLines.join('\n')}\n`);
  console.log('index.ts file written');
}
