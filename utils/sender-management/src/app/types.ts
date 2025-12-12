import { Domain } from '../domain';
import { Infrastructure } from '../infra';

export type AppDependencies = {
  domain: Domain;
  infra: Infrastructure;
};
