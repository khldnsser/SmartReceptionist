import * as clientRepo from '../repositories/client.repo';
import type { Client, ClientFields } from '../repositories/client.repo';

export async function getClient(waId: string): Promise<Client | null> {
  return clientRepo.getClientByWaId(waId);
}

export async function upsertClient(waId: string, fields: ClientFields): Promise<Client> {
  return clientRepo.upsertClient(waId, fields);
}

export async function updateClient(waId: string, fields: ClientFields): Promise<Client> {
  return clientRepo.updateClient(waId, fields);
}
