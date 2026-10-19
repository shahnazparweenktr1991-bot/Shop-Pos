/**
 * Natural Human Voice Assistant for Retail POS
 * Supports bilingual Hindi ('hi') and English ('en') voice announcements
 * Speaks dynamic custom shop name with warm retail greeting.
 */

export type VoicePersona = 'polite_customer_care' | 'friendly_retail' | 'fast_register';
export type VoiceLanguage = 'en' | 'hi';

class VoiceAssistantService {
  private isEnabled: boolean = true;
  private language: VoiceLanguage = 'en';
  private voiceRate: number = 0.95;
  private voicePitch: number = 1.02;
  private persona: VoicePersona = 'friendly_retail';
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedEnabled = localStorage.getItem('ak_voice_announcements');
        this.isEnabled = storedEnabled !== 'false';

        const storedLang = localStorage.getItem('ak_voice_language') as VoiceLanguage;
        if (storedLang === 'hi' || storedLang === 'en') {
          this.language = storedLang;
        }

        const storedRate = localStorage.getItem('ak_voice_rate');
        if (storedRate) this.voiceRate = parseFloat(storedRate) || 0.95;

        const storedPersona = localStorage.getItem('ak_voice_persona') as VoicePersona;
        if (storedPersona) this.persona = storedPersona;

        if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = () => {
            this.initVoice();
          };
          this.initVoice();
        }
      } catch {}
    }
  }

  public initVoice(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    this.availableVoices = voices;

    if (this.language === 'hi') {
      // Find natural Hindi voice
      const hindiVoice = voices.find(v => 
        v.lang.toLowerCase().includes('hi-in') || 
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('lekha')
      );
      this.selectedVoice = hindiVoice || voices.find(v => v.lang.toLowerCase().includes('in')) || voices[0];
    } else {
      // Prioritize natural human-sounding English voices
      const naturalVoice = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')) &&
        (v.lang.toLowerCase().includes('en-in') || v.lang.startsWith('en'))
      );

      const indianCareVoice = voices.find(v => 
        v.lang.toLowerCase().includes('en-in') &&
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('neerja') || v.name.toLowerCase().includes('heera'))
      );

      const pleasantEnglishVoice = voices.find(v => 
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Ava') || v.name.includes('Victoria'))
      );

      const fallbackEnglish = voices.find(v => v.lang.startsWith('en'));
      this.selectedVoice = naturalVoice || indianCareVoice || pleasantEnglishVoice || fallbackEnglish || voices[0];
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setIsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('ak_voice_announcements', String(enabled));
    } catch {}
  }

  public getLanguage(): VoiceLanguage {
    return this.language;
  }

  public setLanguage(lang: VoiceLanguage): void {
    this.language = lang;
    try {
      localStorage.setItem('ak_voice_language', lang);
    } catch {}
    this.initVoice();
  }

  public toggleLanguage(): VoiceLanguage {
    const nextLang: VoiceLanguage = this.language === 'en' ? 'hi' : 'en';
    this.setLanguage(nextLang);
    return nextLang;
  }

  public getRate(): number {
    return this.voiceRate;
  }

  public setRate(rate: number): void {
    this.voiceRate = rate;
    try {
      localStorage.setItem('ak_voice_rate', String(rate));
    } catch {}
  }

  public getPersona(): VoicePersona {
    return this.persona;
  }

  public setPersona(persona: VoicePersona): void {
    this.persona = persona;
    try {
      localStorage.setItem('ak_voice_persona', persona);
    } catch {}
    if (persona === 'friendly_retail') {
      this.voiceRate = 0.94;
      this.voicePitch = 1.04;
    } else if (persona === 'polite_customer_care') {
      this.voiceRate = 0.92;
      this.voicePitch = 1.0;
    } else {
      this.voiceRate = 1.0;
      this.voicePitch = 0.98;
    }
  }

  public getSelectedVoiceName(): string {
    return this.selectedVoice ? `${this.selectedVoice.name} (${this.selectedVoice.lang})` : 'Default Voice';
  }

  /**
   * Speak a phrase out loud with natural human cadence.
   */
  public speak(text: string, force: boolean = false): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.isEnabled && !force) return;

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (!this.selectedVoice) {
        this.initVoice();
      }
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang;
      } else {
        utterance.lang = this.language === 'hi' ? 'hi-IN' : 'en-IN';
      }

      utterance.rate = this.voiceRate;
      utterance.pitch = this.voicePitch;
      utterance.volume = 1.0;

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch {}
      }, 50);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  /**
   * Announcement on completed purchase speaking dynamic shop name in Hindi or English
   * Exact requested phrasing: "Thank you (Name) for shopping with (Shop name)"
   */
  public announcePurchase(customerName?: string, totalAmount?: number): void {
    const isNamed = customerName && customerName !== 'Walk-in Customer' && customerName !== 'Cash Customer';
    const rawShopName = (typeof localStorage !== 'undefined' && localStorage.getItem('ak_shop_name')) || 'Hardware Store';
    const shopName = rawShopName.trim();
    const cleanCustomer = isNamed ? customerName.trim() : '';

    let phrase = '';

    if (this.language === 'hi') {
      // 3 Hindi Persona Options
      if (this.persona === 'polite_customer_care') {
        phrase = cleanCustomer
          ? `${cleanCustomer} जी, ${shopName} में खरीदारी के लिए आपका बहुत-बहुत धन्यवाद! आपका दिन शुभ हो!`
          : `${shopName} में खरीदारी के लिए आपका बहुत-बहुत धन्यवाद! आपका दिन शुभ हो!`;
      } else if (this.persona === 'friendly_retail') {
        phrase = cleanCustomer
          ? `${cleanCustomer} जी, ${shopName} में शॉपिंग के लिए धन्यवाद!`
          : `${shopName} में शॉपिंग के लिए धन्यवाद!`;
      } else {
        // fast_register
        phrase = cleanCustomer
          ? `${cleanCustomer} जी से भुगतान प्राप्त हुआ। ${shopName} में खरीदारी के लिए धन्यवाद।`
          : `भुगतान प्राप्त हुआ। ${shopName} में खरीदारी के लिए धन्यवाद।`;
      }
    } else {
      // 3 English Persona Options
      if (this.persona === 'polite_customer_care') {
        phrase = cleanCustomer
          ? `Thank you ${cleanCustomer} for shopping with ${shopName}. We appreciate your business!`
          : `Thank you for shopping with ${shopName}. We appreciate your business!`;
      } else if (this.persona === 'friendly_retail') {
        phrase = cleanCustomer
          ? `Thank you ${cleanCustomer} for shopping with ${shopName}!`
          : `Thank you for shopping with ${shopName}!`;
      } else {
        // fast_register
        phrase = cleanCustomer
          ? `Payment received from ${cleanCustomer}. Thank you for shopping with ${shopName}.`
          : `Payment received. Thank you for shopping with ${shopName}.`;
      }
    }

    this.speak(phrase);
  }
}

export const voiceAssistant = new VoiceAssistantService();
