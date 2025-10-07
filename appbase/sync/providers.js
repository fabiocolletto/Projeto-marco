const PROVIDER_CONFIGS = {
  googleDrive: {
    check() {
      return (
        typeof window !== 'undefined' &&
        (window.gapi || window.google || window.googleDriveNative)
      );
    },
    missingCode: 'GOOGLE_PROVIDER_MISSING',
    missingMessage:
      'Instale o Google Drive para Desktop e conecte sua conta corporativa.',
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  },
  oneDrive: {
    check() {
      return (
        typeof window !== 'undefined' &&
        (window.OneDrive || window.Microsoft || window.msOnedrive)
      );
    },
    missingCode: 'ONEDRIVE_PROVIDER_MISSING',
    missingMessage:
      'Instale o cliente OneDrive e faça login com sua conta antes de continuar.',
    scopes: ['Files.ReadWrite.AppFolder'],
  },
};

const sessions = {
  googleDrive: null,
  oneDrive: null,
};

function getSession(provider) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Provider não suportado: ${provider}`);
  }
  if (!sessions[provider]) {
    sessions[provider] = {
      token: null,
      scopes: [...config.scopes],
      lastSync: '',
      devices: [],
      message: '',
    };
  }
  return sessions[provider];
}

function ensureProvider(provider) {
  return new Promise((resolve, reject) => {
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      const error = new Error(`Provider não suportado: ${provider}`);
      error.code = 'UNSUPPORTED_PROVIDER';
      reject(error);
      return;
    }
    if (!config.check()) {
      const error = new Error(config.missingMessage);
      error.code = config.missingCode;
      reject(error);
      return;
    }
    const session = getSession(provider);
    resolve({
      provider,
      scopes: [...session.scopes],
    });
  });
}

function syncProvider(provider) {
  return ensureProvider(provider).then(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const offlineError = new Error('Sincronização indisponível offline.');
      offlineError.code = 'NETWORK_UNAVAILABLE';
      throw offlineError;
    }
    const session = getSession(provider);
    const now = new Date().toISOString();
    session.token = `token-${provider}-${now}`;
    const localDevice = buildLocalDevice();
    localDevice.lastSeen = now;
    session.lastSync = now;
    session.devices = mergeDevices(session.devices, localDevice);
    session.message = 'Sincronização concluída.';
    return {
      lastSync: session.lastSync,
      devices: session.devices.map((device) => ({ ...device })),
      message: session.message,
    };
  });
}

function disconnectAll(provider) {
  return ensureProvider(provider).then(() => {
    const session = getSession(provider);
    session.token = null;
    session.lastSync = '';
    session.devices = [];
    session.message = '';
    return {
      lastSync: session.lastSync,
      devices: [],
      message: session.message,
    };
  });
}

function resetSessions() {
  Object.keys(sessions).forEach((provider) => {
    sessions[provider] = null;
  });
}

function buildLocalDevice() {
  const agent =
    (typeof navigator !== 'undefined' && navigator.userAgent) || 'Navegador';
  let model = agent;
  if (agent.includes('(') && agent.includes(')')) {
    model = agent.slice(agent.indexOf('(') + 1, agent.indexOf(')'));
  }
  return {
    name: 'Este dispositivo',
    model: model.trim(),
  };
}

function mergeDevices(devices, current) {
  const registry = Array.isArray(devices) ? [...devices] : [];
  const existingIndex = registry.findIndex((device) => device.name === current.name);
  if (existingIndex > -1) {
    registry[existingIndex] = {
      ...registry[existingIndex],
      ...current,
      lastSeen: current.lastSeen,
    };
  } else {
    registry.unshift({ ...current });
  }
  return registry;
}

export { ensureProvider, syncProvider, disconnectAll, resetSessions };
