import type { ProviderClient, ProviderToken, SnapshotRecord } from '../types.js';

interface GoogleFile {
  id: string;
  name: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
  size?: string;
}

export class GoogleDriveClient implements ProviderClient {
  private readonly baseUrl = 'https://www.googleapis.com/drive/v3';
  private readonly uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
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
      throw new Error(`Google API falhou (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }

  private async findFile(token: ProviderToken, projectId: string): Promise<GoogleFile | null> {
    const query = [
      `name='${this.fileName}'`,
      "trashed=false",
      `appProperties has { key='projectId' and value='${projectId}' }`,
    ].join(' and ');
    const result = await this.request<{ files: GoogleFile[] }>(
      token,
      `/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id,name,modifiedTime,appProperties,size)`
    );
    return result.files?.[0] ?? null;
  }

  private buildMultipart(record: SnapshotRecord): { body: string; boundary: string } {
    const boundary = `-------marco_sync_${Date.now().toString(16)}`;
    const metadata = {
      name: this.fileName,
      parents: ['appDataFolder'],
      appProperties: {
        projectId: record.meta.projectId,
        hash: record.meta.hash,
        updatedAt: String(record.meta.updatedAt),
      },
    };
    const payload = JSON.stringify(record.payload);
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      `${payload}\r\n` +
      `--${boundary}--`;
    return { body, boundary };
  }

  async push(record: SnapshotRecord, token: ProviderToken): Promise<void> {
    const existing = await this.findFile(token, record.meta.projectId);
    const { body, boundary } = this.buildMultipart(record);
    const url = existing
      ? `${this.uploadUrl}/files/${existing.id}?uploadType=multipart&fields=id`
      : `${this.uploadUrl}/files?uploadType=multipart&fields=id`;
    const method = existing ? 'PATCH' : 'POST';
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google upload falhou (${response.status}): ${text}`);
    }
  }

  async pull(projectId: string, token: ProviderToken): Promise<SnapshotRecord | null> {
    const existing = await this.findFile(token, projectId);
    if (!existing) return null;
    const response = await fetch(`${this.baseUrl}/files/${existing.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google download falhou (${response.status}): ${text}`);
    }
    const payload = (await response.json()) as SnapshotRecord['payload'];
    const meta: SnapshotRecord['meta'] = {
      provider: 'google',
      projectId,
      deviceId: existing.appProperties?.deviceId ?? 'unknown',
      hash: existing.appProperties?.hash ?? '',
      updatedAt: existing.appProperties?.updatedAt ? Number(existing.appProperties.updatedAt) : Date.now(),
      size: existing.size ? Number(existing.size) : payload.ciphertext.length,
    };
    return {
      id: existing.id,
      payload,
      meta,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
