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
    phoneNumber = String(phoneNumber).replace(/\D/g, '');
    console.log('🧹 Limpo:', phoneNumber);

    // Remover código do país se já tiver (55)
    if (phoneNumber.startsWith('55')) {
      phoneNumber = phoneNumber.substring(2);
      console.log('🌍 Removeu código país:', phoneNumber);
    }

    // Verificar tamanho
    if (phoneNumber.length === 11) {
      console.log('📱 Tipo: Celular (11 dígitos)');
    } else if (phoneNumber.length === 10) {
      console.log('☎️ Tipo: Fixo (10 dígitos)');
    } else {
      console.error('❌ Tamanho inválido:', phoneNumber.length);
      throw new Error(`Número com tamanho inválido: ${phoneNumber} (${phoneNumber.length} dígitos)`);
    }

    // Adicionar código do país (55)
    const withCountryCode = '55' + phoneNumber;
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

      // Formata o número base
      let baseChatId = this.formatPhoneNumber(phoneNumber);

      // Extrai DDD e número (sem código país)
      const match = baseChatId.match(/^55(\d{2})(\d{8,9})@c\.us$/);
      if (!match) throw new Error(`Formato de número inválido: ${phoneNumber}`);

      const ddd = match[1];
      let numero = match[2];

      // Cria as duas variações possíveis
      const possibleIds = [];

      if (numero.length === 9) {
        // Já tem o 9, tenta primeiro com 9 e depois sem
        possibleIds.push(`55${ddd}${numero}@c.us`);
        possibleIds.push(`55${ddd}${numero.substring(1)}@c.us`);
      } else if (numero.length === 8) {
        // Não tem o 9, tenta primeiro sem e depois com 9
        possibleIds.push(`55${ddd}${numero}@c.us`);
        possibleIds.push(`55${ddd}9${numero}@c.us`);
      }

      let chatIdToUse = null;

      // Testa qual versão realmente tem WhatsApp
      for (const id of possibleIds) {
        const exists = await this.client.isRegisteredUser(id);
        if (exists) {
          chatIdToUse = id;
          break;
        }
      }

      if (!chatIdToUse) {
        throw new Error('Nenhuma versão do número possui WhatsApp.');
      }

      // 📤 Enviar mensagem
      const msg = await this.client.sendMessage(chatIdToUse, message);
      onProgress?.(`✅ Enviado com sucesso para ${phoneNumber}`);
      return { success: true, id: msg.id.id, chatId: chatIdToUse };

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