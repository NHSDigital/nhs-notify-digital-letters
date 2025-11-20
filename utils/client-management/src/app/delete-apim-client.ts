import { AppDependencies } from '.';

export function createDeleteApimClientCommand({ infra }: AppDependencies) {
  return async function deleteApimClientCommand(params: { clientId: string }) {
    const apimClients = await infra.clientRepository.getApimClients();

    if (!apimClients) {
      throw new Error(`No APIM clients found.`);
    }

    console.log('APIM Clients Retrieved:', apimClients);

    const existingClientId = Object.values(apimClients).includes(
      params.clientId
    );

    if (!existingClientId) {
      throw new Error(`Client ID ${params.clientId} does not exist.`);
    }

    // if the clientId exists, find the key and delete it
    const existingClientIdKey = Object.keys(apimClients).find(
      (key) => apimClients && apimClients[key] === params.clientId
    );
    delete apimClients[existingClientIdKey as string];

    console.log('Removed APIM Client:', params.clientId);
    console.log('Updated APIM Clients:', apimClients);

    await infra.clientRepository.putApimClients(apimClients);

    return apimClients;
  };
}
