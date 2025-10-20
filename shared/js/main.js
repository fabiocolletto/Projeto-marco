import initRegisterForm from './auth/register.js';

function bootstrap() {
  try {
    initRegisterForm();
  } catch (error) {
    console.error('register: initialization failed', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
