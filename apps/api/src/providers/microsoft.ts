import type { ProviderClient, ProviderToken, SnapshotRecord } from '../types.js';

interface DriveItem {
  id: string;
  name: string;
  file?: Record<string, unknown>;
  size?: number;
  lastModifiedDateTime?: string;
  parentReference?: { driveId?: string };
}

export class MicrosoftDriveClient implements ProviderClient {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';
  private readonly fileName = 'ac-backup.json.enc';

  private async request<T>(token: ProviderToken, path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Microsoft Graph falhou (${response.status}): ${text}`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  private async findFile(token: ProviderToken, projectId: string): Promise<DriveItem | null> {
    const result = await this.request<{ value: DriveItem[] }>(
      token,
      `/me/drive/special/approot/children?$filter=name eq '${projectId}-${this.fileName}'&select=id,name,size,lastModifiedDateTime`
    );
    return result.value?.[0] ?? null;
  }

  async push(record: SnapshotRecord, token: ProviderToken): Promise<void> {
    const name = `${record.meta.projectId}-${this.fileName}`;
    const body = JSON.stringify({
      payload: record.payload,
      meta: record.meta,
    });
    const existing = await this.findFile(token, record.meta.projectId);
    const url = existing
      ? `/me/drive/items/${existing.id}/content`
      : `/me/drive/special/approot:/${name}:/content`;
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Microsoft upload falhou (${response.status}): ${text}`);
    }
  }

  async pull(projectId: string, token: ProviderToken): Promise<SnapshotRecord | null> {
    const existing = await this.findFile(token, projectId);
    if (!existing) return null;
    const response = await fetch(`${this.baseUrl}/me/drive/items/${existing.id}/content`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Microsoft download falhou (${response.status}): ${text}`);
    }
    const content = (await response.json()) as { payload: SnapshotRecord['payload']; meta?: SnapshotRecord['meta'] };
    const meta: SnapshotRecord['meta'] = content.meta ?? {
      provider: 'microsoft',
      projectId,
      deviceId: 'unknown',
      hash: '',
      updatedAt: existing.lastModifiedDateTime ? Date.parse(existing.lastModifiedDateTime) : Date.now(),
      size: existing.size ?? JSON.stringify(content.payload).length,
    };
    return {
      id: existing.id,
      payload: content.payload,
      meta,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
