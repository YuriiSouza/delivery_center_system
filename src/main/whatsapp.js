import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { join } from 'path';

class WhatsAppAutomation {
  constructor() {
    this.client = null;
    this.isRunning = false;
    this.shouldStop = false;
    this.isReady = false;
  }

  /**
   * Inicializar WhatsApp Web
   */
  async initialize(onProgress) {
    return new Promise((resolve, reject) => {
      try {
        onProgress?.('Configurando WhatsApp Web...');

        // Criar cliente com autenticação local (salva sessão)
        this.client = new Client({
          authStrategy: new LocalAuth({
            clientId: 'delivery-central-system',
            dataPath: join(process.cwd(), '.wwebjs_auth')
          }),
          puppeteer: {
            headless: false, // Mostra o navegador
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu'
            ]
          }
        });

        // Evento: QR Code gerado
        this.client.on('qr', (qr) => {
          console.log('📱 QR Code gerado!');
          onProgress?.('📱 Escaneie o QR Code no navegador que abriu');
          
          // Mostrar QR code no terminal também
          qrcode.generate(qr, { small: true });
        });

        // Evento: Autenticando
        this.client.on('authenticated', () => {
          console.log('✅ Autenticado!');
          onProgress?.('✅ Autenticado com sucesso!');
        });

        // Evento: Falha na autenticação
        this.client.on('auth_failure', (msg) => {
          console.error('❌ Falha na autenticação:', msg);
          onProgress?.('❌ Falha na autenticação. Tente novamente.');
          reject(new Error('Falha na autenticação'));
        });

        // Evento: Cliente pronto
        this.client.on('ready', () => {
          console.log('🚀 WhatsApp Web está pronto!');
          this.isReady = true;
          this.isRunning = true;
          onProgress?.('🚀 WhatsApp Web conectado e pronto!');
          resolve({ success: true });
        });

        // Evento: Desconectado
        this.client.on('disconnected', (reason) => {
          console.log('⚠️ WhatsApp desconectado:', reason);
          this.isReady = false;
          this.isRunning = false;
          onProgress?.('⚠️ WhatsApp desconectado');
        });

        // Inicializar cliente
        onProgress?.('Inicializando WhatsApp Web...');
        this.client.initialize();

      } catch (error) {
        console.error('Erro ao inicializar WhatsApp:', error);
        reject({ success: false, error: error.message });
      }
    });
  }

  /**
   * Formatar número de telefone
   */
formatPhoneNumber(phoneNumber) {
  console.log('\n=== FORMATANDO NÚMERO ===');
  console.log('📞 Entrada:', phoneNumber);
  
  // Converter para string e remover tudo que não é número
  let cleaned = String(phoneNumber).replace(/\D/g, '');
  console.log('🧹 Limpo:', cleaned);
  console.log('📏 Tamanho:', cleaned.length);
  
  // Remover código do país se já tiver (55)
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
    console.log('🌍 Removeu código país:', cleaned);
  }
  
  // Verificar tamanho do número
  // DDD (2 dígitos) + Celular (9 dígitos) = 11 dígitos
  // DDD (2 dígitos) + Fixo (8 dígitos) = 10 dígitos
  
  if (cleaned.length === 11) {
    // Celular: DDD + 9XXXXXXXX
    console.log('📱 Tipo: Celular (11 dígitos)');
  } else if (cleaned.length === 10) {
    // Fixo: DDD + XXXXXXXX
    console.log('📞 Tipo: Fixo (10 dígitos)');
  } else if (cleaned.length === 9) {
    // Pode ser celular sem DDD - ERRO!
    console.warn('⚠️ ATENÇÃO: Número com 9 dígitos - falta DDD!');
    throw new Error(`Número inválido (falta DDD): ${phoneNumber}`);
  } else if (cleaned.length === 8) {
    // Pode ser fixo sem DDD - ERRO!
    console.warn('⚠️ ATENÇÃO: Número com 8 dígitos - falta DDD!');
    throw new Error(`Número inválido (falta DDD): ${phoneNumber}`);
  } else {
    console.error('❌ Tamanho inválido:', cleaned.length);
    throw new Error(`Número com tamanho inválido: ${phoneNumber} (${cleaned.length} dígitos)`);
  }
  
  // Adicionar código do país (55)
  const withCountryCode = '55' + cleaned;
  console.log('🌍 Com código país:', withCountryCode);
  
  // Criar chatId
  const chatId = withCountryCode + '@c.us';
  console.log('💬 ChatId final:', chatId);
  console.log('========================\n');
  
  return chatId;
}

  /**
   * Enviar mensagem para um número
   */
  async sendMessage(phoneNumber, message, onProgress) {
    try {
      if (!this.client || !this.isReady) {
        throw new Error('WhatsApp não está pronto. Inicialize primeiro.');
      }

      onProgress?.(`Enviando para ${phoneNumber}...`);

      // Formatar número
      const chatId = this.formatPhoneNumber(phoneNumber);

      // Verificar se o número existe no WhatsApp
      const isRegistered = await this.client.isRegisteredUser(chatId);
      
      if (!isRegistered) {
        throw new Error('Número não possui WhatsApp');
      }

      // Enviar mensagem
      await this.client.sendMessage(chatId, message);

      onProgress?.(`✅ Enviado para ${phoneNumber}`);

      return { success: true };
    } catch (error) {
      console.error(`Erro ao enviar para ${phoneNumber}:`, error);
      onProgress?.(`❌ Falhou: ${phoneNumber} - ${error.message}`);
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

    if (!this.client || !this.isReady) {
      return {
        success: false,
        error: 'WhatsApp não está pronto',
        results
      };
    }

    this.shouldStop = false;

    for (let i = 0; i < phoneNumbers.length && !this.shouldStop; i++) {
      const phone = phoneNumbers[i];

      // Notificar progresso
      onProgress?.({
        type: 'progress',
        current: i + 1,
        total: phoneNumbers.length,
        phone,
      });

      // Enviar mensagem
      const result = await this.sendMessage(phone, message, (msg) => {
        onProgress?.({ type: 'log', message: msg });
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ phone, error: result.error });
      }

      // Delay entre mensagens (evita bloqueio)
      if (i < phoneNumbers.length - 1 && !this.shouldStop) {
        await this.sleep(delay);
      }
    }

    return { success: true, results };
  }

  /**
   * Parar execução
   */
  stop() {
    this.shouldStop = true;
    console.log('⏹️ Parando envio de mensagens...');
  }

  /**
   * Fechar WhatsApp
   */
  async close() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
        this.isReady = false;
        this.isRunning = false;
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao fechar WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isReady: this.isReady,
      isInitialized: this.client !== null,
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WhatsAppAutomation;