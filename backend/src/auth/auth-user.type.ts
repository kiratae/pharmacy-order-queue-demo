export type Role = 'OWNER' | 'PHARMACIST';

export interface AuthUser {
  userId: string;
  role: Role;
  unitId?: string;
}
