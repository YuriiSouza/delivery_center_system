const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

class WhatsAppAutomation {
  constructor() {
    this.driver = null;
    this.isRunning = false;
  }

  /**
   * Inicializar navegador
   */
  async initialize(onProgress) {
    try {
      onProgress?.('Configurando navegador...');

      // Configurar Chrome
      const options = new chrome.Options();
      options.addArguments('--start-maximized');
      options.addArguments('--disable-blink-features=AutomationControlled');

      // Usar perfil persistente para manter sessão
      const userDataDir = path.join(process.cwd(), 'perfil_chrome_wpp');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      options.addArguments(`--user-data-dir=${userDataDir}`);

      onProgress?.('Abrindo WhatsApp Web...');

      // Criar driver
      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      // Abrir WhatsApp Web
      await this.driver.get('https://web.whatsapp.com/');

      onProgress?.('Aguardando WhatsApp carregar...');

      // Aguardar carregar (até 3 minutos para escanear QR code)
      await this.driver.wait(
        until.elementLocated(By.css('[data-testid="chat-list"]')),
        180000
      );

      onProgress?.('WhatsApp Web carregado!');

      return { success: true };
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensagem para um número
   */
  async sendMessage(phoneNumber, message, onProgress) {
    try {
      if (!this.driver) {
        throw new Error('WhatsApp não inicializado');
      }

      onProgress?.(`Enviando para ${phoneNumber}...`);

      // Abrir conversa
      const url = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      await this.driver.get(url);

      // Aguardar caixa de texto
      await this.driver.wait(
        until.elementLocated(By.css('[data-testid="conversation-compose-box-input"]')),
        30000
      );

      await this.sleep(2000);

      // Enviar mensagem (pressionar Enter)
      const inputBox = await this.driver.findElement(
        By.css('[data-testid="conversation-compose-box-input"]')
      );
      await inputBox.sendKeys(Key.RETURN);

      onProgress?.(`✅ Enviado para ${phoneNumber}`);

      return { success: true };
    } catch (error) {
      console.error(`Erro ao enviar para ${phoneNumber}:`, error);
      onProgress?.(`❌ Falhou: ${phoneNumber}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensagens para múltiplos números
   */
  async sendBulkMessages(phoneNumbers, message, delay = 3000, onProgress) {
    const results = {
      total: phoneNumbers.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    this.isRunning = true;

    for (let i = 0; i < phoneNumbers.length && this.isRunning; i++) {
      const phone = phoneNumbers[i];

      onProgress?.({
        type: 'progress',
        current: i + 1,
        total: phoneNumbers.length,
        phone,
      });

      const result = await this.sendMessage(phone, message, (msg) => {
        onProgress?.({ type: 'log', message: msg });
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ phone, error: result.error });
      }

      // Delay entre mensagens
      if (i < phoneNumbers.length - 1) {
        await this.sleep(delay);
      }
    }

    return results;
  }

  /**
   * Parar execução
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Fechar navegador
   */
  async close() {
    try {
      if (this.driver) {
        await this.driver.quit();
        this.driver = null;
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao fechar WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar se está rodando
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isInitialized: this.driver !== null,
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WhatsAppAutomation;

