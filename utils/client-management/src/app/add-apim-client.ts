import { AppDependencies } from '.';

export type ApimClient = {
  apimId: string;
  clientId: string;
};

export function createAddApimClientCommand({ infra }: AppDependencies) {
  return async function addApimClientCommand(
    params: ApimClient
  ): Promise<{ [key: string]: string }> {
    let apimClients = await infra.clientRepository.getApimClients();

    if (!apimClients) {
      apimClients = {};
    }

    console.log('APIM Clients Retrieved:', apimClients);

    const existingApimId = Object.keys(apimClients).includes(params.apimId);

    if (existingApimId) {
      throw new Error(`APIM ID ${params.apimId} already exists.`);
    }

    const existingClientId = Object.values(apimClients).includes(
      params.clientId
    );

    // if the clientId already exists, delete the existing one and replace it with the new clientId
    if (existingClientId) {
      const existingClientIdKey = Object.keys(apimClients).find(
        (key) => apimClients && apimClients[key] === params.clientId
      );

      if (existingClientIdKey) {
        delete apimClients[existingClientIdKey];
      }
    }

    const newClient: ApimClient = {
      apimId: params.apimId,
      clientId: params.clientId,
    };

    apimClients[newClient.apimId] = newClient.clientId;

    console.log('Updated APIM Clients:', apimClients);

    await infra.clientRepository.putApimClients(apimClients);

    return apimClients;
  };
}
