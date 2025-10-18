export type UserRole = 'master' | 'user';

export interface MasterUser extends Record<string, unknown> {
  id: string; // 'master'
  username: string; // 'adm' (padrão inicial)
  passHash: string; // SHA-256 da senha
  createdAt: string;
  updatedAt: string;
  deviceId: string; // vínculo do tablet/dispositivo
  role: UserRole; // 'master'
}
