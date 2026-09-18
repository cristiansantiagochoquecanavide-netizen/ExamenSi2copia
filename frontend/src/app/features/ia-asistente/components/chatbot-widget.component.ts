import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService } from '../services/chatbot.service';
import { PrendaChatCard } from '../models/ia-asistente.models';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating Launcher Bubble (Bottom Right) -->
    <div class="chatbot-floating-container">
      @if (!chatbotService.isOpen()) {
        <button
          type="button"
          class="chatbot-launcher-btn"
          (click)="chatbotService.open()"
          title="Consultar con Atelier Concierge (IA)"
          aria-label="Abrir asistente virtual Atelier Concierge"
        >
          <!-- Isotipo Logo de la Web: Diamante Tallado con Bisel Oro -->
          <svg class="launcher-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="24,13 76,13 95,40 50,88 5,40" stroke="#c5a880" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" fill="#ffffff"/>
            <polygon points="26,16 74,16 92,40 50,84 8,40" stroke="#000000" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
            <line x1="8" y1="40" x2="92" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="26" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="74" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="84" x2="34" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="84" x2="66" y2="40" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span class="launcher-ai-badge">IA</span>
        </button>
      }

      <!-- Mini-Chat Window Popup -->
      @if (chatbotService.isOpen()) {
        <section class="chatbot-window-card" role="dialog" aria-label="Ventana de chat Atelier Concierge">
          <!-- Header -->
          <header class="chat-header">
            <div class="chat-header-info">
              <!-- Avatar de la IA: Logo Oficial de la Web -->
              <div class="concierge-avatar-ring">
                <svg class="avatar-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="24,13 76,13 95,40 50,88 5,40" stroke="#c5a880" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" fill="#ffffff"/>
                  <polygon points="26,16 74,16 92,40 50,84 8,40" stroke="#000000" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
                  <line x1="8" y1="40" x2="92" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="26" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="74" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="84" x2="34" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                  <line x1="50" y1="84" x2="66" y2="40" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="concierge-titles">
                <h3 class="concierge-title">ATELIER CONCIERGE</h3>
                <span class="concierge-status">
                  <span class="status-pulse-dot"></span>
                  Asesor de Alta Costura • Online
                </span>
              </div>
            </div>

            <div class="chat-header-actions">
              <button
                type="button"
                class="header-btn"
                (click)="onStartNewSession()"
                title="Nueva conversación"
                aria-label="Reiniciar chat"
              >
                &#x21bb;
              </button>
              <button
                type="button"
                class="header-btn btn-close"
                (click)="chatbotService.close()"
                title="Minimizar asistente"
                aria-label="Cerrar chat"
              >
                &times;
              </button>
            </div>
          </header>

          <!-- Messages Container -->
          <div class="chat-messages-scroll" #messagesContainer>
            @for (msg of chatbotService.messages(); track $index) {
              <div
                class="chat-bubble-row"
                [class.row-user]="msg.remitente === 'USUARIO'"
                [class.row-bot]="msg.remitente === 'ASISTENTE'"
              >
                @if (msg.remitente === 'ASISTENTE') {
                  <div class="bot-micro-avatar">
                    <svg class="micro-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="24,13 76,13 95,40 50,88 5,40" stroke="#c5a880" stroke-width="5" stroke-linejoin="round" fill="#ffffff"/>
                      <polygon points="26,16 74,16 92,40 50,84 8,40" stroke="#000000" stroke-width="4" stroke-linejoin="round"/>
                      <line x1="8" y1="40" x2="92" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="26" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="74" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="50" y1="16" x2="34" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="50" y1="16" x2="66" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="50" y1="84" x2="34" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                      <line x1="50" y1="84" x2="66" y2="40" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                }

                <div class="chat-bubble" [class.bubble-user]="msg.remitente === 'USUARIO'" [class.bubble-bot]="msg.remitente === 'ASISTENTE'">
                  <div class="bubble-text" [innerHTML]="formatMessageText(msg.texto)"></div>

                  <!-- Product Cards (RAG) -->
                  @if (msg.prendas_recomendadas && msg.prendas_recomendadas.length > 0) {
                    <div class="rag-products-carousel">
                      <div class="rag-header-tag">Recomendaciones Curadas:</div>
                      <div class="cards-track">
                        @for (card of msg.prendas_recomendadas; track card.id) {
                          <div class="rag-product-card">
                            <div class="card-thumb-wrap">
                              <img
                                [src]="card.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80'"
                                [alt]="card.nombre"
                                class="card-thumb-img"
                                loading="lazy"
                              />
                              <span class="card-rating-badge">&#9733; {{ card.rating_promedio }}</span>
                            </div>
                            <div class="card-body-wrap">
                              <span class="card-sector-tag">{{ card.categoria_nombre }}</span>
                              <h4 class="card-title">{{ card.nombre }}</h4>
                              <div class="card-footer-row">
                                <span class="card-price">\${{ card.precio_base | number:'1.2-2' }}</span>
                                <button
                                  type="button"
                                  class="btn-view-card"
                                  (click)="verEnCatalogo(card)"
                                >
                                  Ver Prenda &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Quick Reply Suggestion Chips -->
                  @if (msg.sugerencias_rapidas && msg.sugerencias_rapidas.length > 0 && isLatestAssistantMessage($index)) {
                    <div class="quick-suggestions-wrap">
                      <div class="suggestions-label">Sugerencias rápidas:</div>
                      <div class="chips-container">
                        @for (sug of msg.sugerencias_rapidas; track sug) {
                          <button
                            type="button"
                            class="suggestion-chip"
                            (click)="sendQuickReply(sug)"
                          >
                            {{ sug }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Loading / Thinking Indicator -->
            @if (chatbotService.isLoading()) {
              <div class="chat-bubble-row row-bot">
                <div class="bot-micro-avatar">
                  <svg class="micro-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="24,13 76,13 95,40 50,88 5,40" stroke="#c5a880" stroke-width="5" stroke-linejoin="round" fill="#ffffff"/>
                    <polygon points="26,16 74,16 92,40 50,84 8,40" stroke="#000000" stroke-width="4" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="chat-bubble bubble-bot typing-bubble">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            }
          </div>

          <!-- Input Footer -->
          <footer class="chat-input-bar">
            <!-- Voice Dictation Button (Microfono Negro de Alta Visibilidad) -->
            <button
              type="button"
              class="btn-voice-input"
              [class.listening]="chatbotService.isListening()"
              (click)="onVoiceClick()"
              title="Dictar mensaje por voz"
              aria-label="Hablar al asistente"
            >
              <svg viewBox="0 0 24 24" class="mic-icon-svg" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <textarea
              #inputArea
              [(ngModel)]="inputText"
              (keydown)="onKeydown($event)"
              class="chat-text-input"
              rows="1"
              placeholder="Escribe tu consulta de moda..."
              aria-label="Mensaje para Atelier Concierge"
            ></textarea>

            <!-- Send Button: Avión de Papel en Azul Vibrante -->
            <button
              type="button"
              class="btn-send-message"
              [disabled]="!inputText.trim() || chatbotService.isLoading()"
              (click)="onSend()"
              title="Enviar mensaje"
              aria-label="Enviar"
            >
              <!-- Icono Avión de Papel -->
              <svg viewBox="0 0 24 24" class="send-plane-svg" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </footer>
        </section>
      }
    </div>
  `,
  styles: [`
    /* =========================================================================
       ATELIER CONCIERGE WIDGET - HAUTE COUTURE LUXURY DESIGN SYSTEM
       ========================================================================= */

    .chatbot-floating-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Launcher Button: High-Contrast Solid Black with Gold Rim */
    .chatbot-launcher-btn {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: #000000;
      border: 2.2px solid #c5a880;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42), 0 0 18px rgba(197, 168, 128, 0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease;
      outline: none;
    }

    .chatbot-launcher-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), 0 0 26px rgba(197, 168, 128, 0.5);
      border-color: #dfcaa7;
    }

    .launcher-logo-svg {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
    }

    .launcher-ai-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: linear-gradient(135deg, #c5a880 0%, #a48256 100%);
      color: #000000;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 10px;
      border: 1.5px solid #000000;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    /* Popup Mini-Chat Window */
    .chatbot-window-card {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 580px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid rgba(197, 168, 128, 0.45);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28), 0 4px 16px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: chatPopupFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes chatPopupFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Header */
    .chat-header {
      background: #000000 !important;
      color: #ffffff !important;
      padding: 14px 18px;
      border-bottom: 2px solid #c5a880;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .concierge-avatar-ring {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #c5a880;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      padding: 3px;
    }

    .avatar-logo-svg {
      width: 28px;
      height: 28px;
    }

    .concierge-titles {
      display: flex;
      flex-direction: column;
    }

    /* 1. Titulo en blanco puro visible */
    .concierge-title {
      font-size: 14.5px !important;
      font-weight: 800 !important;
      letter-spacing: 1.2px;
      margin: 0 !important;
      color: #ffffff !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .concierge-status {
      font-size: 12px !important;
      color: #ffffff !important;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      opacity: 0.95;
    }

    .status-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      box-shadow: 0 0 8px #22c55e;
    }

    .chat-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-btn {
      background: transparent;
      border: none;
      color: #e0e0e0 !important;
      font-size: 19px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, color 0.2s;
    }

    .header-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff !important;
    }

    .btn-close {
      font-size: 24px;
      line-height: 1;
    }

    /* Messages Scroll Area */
    .chat-messages-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #fbfbfb;
      scroll-behavior: smooth;
    }

    .chat-bubble-row {
      display: flex;
      gap: 9px;
      max-width: 100%;
    }

    .row-user {
      justify-content: flex-end;
    }

    .row-bot {
      justify-content: flex-start;
      align-items: flex-start;
    }

    .bot-micro-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #ffffff;
      border: 1.5px solid #c5a880;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 3px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      padding: 2px;
    }

    .micro-logo-svg {
      width: 18px;
      height: 18px;
    }

    /* 5. Aumento de tamaño de letra en burbujas (+1 / legibilidad mejorada) */
    .chat-bubble {
      max-width: 82%;
      padding: 12px 15px;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
      word-wrap: break-word;
    }

    .bubble-user {
      background: #000000;
      color: #ffffff;
      border-radius: 16px 16px 3px 16px;
      border: 1px solid #222222;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .bubble-bot {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #e5e5e5;
      border-radius: 16px 16px 16px 3px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .bubble-text {
      white-space: pre-wrap;
    }

    /* Product Cards RAG */
    .rag-products-carousel {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #e2ded8;
    }

    .rag-header-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #8c7657;
      margin-bottom: 8px;
    }

    .cards-track {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rag-product-card {
      display: flex;
      gap: 10px;
      background: #fdfdfd;
      border: 1px solid #e8e3dc;
      border-radius: 8px;
      padding: 8px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .rag-product-card:hover {
      border-color: #c5a880;
      box-shadow: 0 3px 10px rgba(197, 168, 128, 0.15);
    }

    .card-thumb-wrap {
      width: 62px;
      height: 78px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
      background: #eaeaea;
    }

    .card-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-rating-badge {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: rgba(0, 0, 0, 0.75);
      color: #ffd700;
      font-size: 9.5px;
      padding: 1px 4px;
      border-radius: 4px;
      font-weight: 600;
    }

    .card-body-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
    }

    .card-sector-tag {
      font-size: 10.5px;
      color: #777777;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #000000;
      margin: 2px 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }

    .card-price {
      font-size: 13.5px;
      font-weight: 700;
      color: #111111;
    }

    .btn-view-card {
      background: #000000;
      color: #ffffff;
      border: 1px solid #c5a880;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }

    .btn-view-card:hover {
      background: #c5a880;
      color: #000000;
    }

    /* Quick Reply Suggestions Chips */
    .quick-suggestions-wrap {
      margin-top: 10px;
      padding-top: 8px;
    }

    .suggestions-label {
      font-size: 11.5px;
      color: #888888;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .suggestion-chip {
      background: #f4f0eb;
      color: #222222;
      border: 1px solid #dfd8cf;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .suggestion-chip:hover {
      background: #000000;
      color: #ffffff;
      border-color: #c5a880;
      transform: translateY(-1px);
    }

    /* Typing Animation */
    .typing-bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
    }

    .typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c5a880;
      display: inline-block;
      animation: typingPulse 1.2s infinite ease-in-out;
    }

    .typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingPulse {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.4;
      }
      40% {
        transform: scale(1.1);
        opacity: 1;
      }
    }

    /* Footer Input Bar */
    .chat-input-bar {
      padding: 10px 14px;
      background: #ffffff;
      border-top: 1px solid #eeeeee;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .chat-text-input {
      flex: 1;
      border: 1.5px solid #dcdcdc;
      border-radius: 20px;
      padding: 9px 14px;
      font-size: 14px;
      outline: none;
      resize: none;
      line-height: 1.4;
      max-height: 70px;
      font-family: inherit;
      color: #111111;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .chat-text-input:focus {
      border-color: #0066ff;
      box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.15);
    }

    /* 4. Icono del micrófono en color negro sobre borde nítido */
    .btn-voice-input {
      background: #ffffff;
      border: 1.8px solid #000000;
      color: #000000;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .btn-voice-input:hover {
      background: #000000;
      color: #ffffff;
    }

    .btn-voice-input:hover .mic-icon-svg {
      stroke: #ffffff;
    }

    .btn-voice-input.listening {
      background: #dc2626 !important;
      border-color: #dc2626 !important;
      color: #ffffff !important;
      animation: pulseMic 1.4s infinite;
    }

    .btn-voice-input.listening .mic-icon-svg {
      stroke: #ffffff !important;
    }

    @keyframes pulseMic {
      0% {
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(220, 38, 38, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
      }
    }

    .mic-icon-svg {
      width: 19px;
      height: 19px;
      stroke: #000000;
      transition: stroke 0.2s;
    }

    /* 3. Botón de enviar con Avión de Papel en color Azul */
    .btn-send-message {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0066ff;
      border: none;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(0, 102, 255, 0.35);
    }

    .btn-send-message:hover:not(:disabled) {
      background: #0052cc;
      transform: scale(1.06);
      box-shadow: 0 4px 14px rgba(0, 102, 255, 0.45);
    }

    .btn-send-message:disabled {
      background: #7bb4ff;
      opacity: 0.85;
      cursor: not-allowed;
      box-shadow: none;
    }

    .send-plane-svg {
      width: 18px;
      height: 18px;
      margin-left: 2px;
      stroke: #ffffff;
    }

    /* Mobile Adaptability */
    @media (max-width: 480px) {
      .chatbot-window-card {
        bottom: 84px;
        right: 12px;
        width: calc(100vw - 24px);
        height: calc(100vh - 100px);
      }
      .chatbot-floating-container {
        bottom: 16px;
        right: 16px;
      }
    }
  `]
})
export class ChatbotWidgetComponent implements AfterViewChecked {
  readonly chatbotService = inject(ChatbotService);
  private readonly router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputArea') private inputArea?: ElementRef<HTMLTextAreaElement>;

  inputText = '';
  private shouldScrollBottom = false;

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      // Ignorar error de scrolling
    }
  }

  formatMessageText(text: string): string {
    if (!text) return '';
    // Formato básico de markdown: **bold**
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/•/g, '&bull;');
    return formatted;
  }

  isLatestAssistantMessage(index: number): boolean {
    const msgs = this.chatbotService.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].remitente === 'ASISTENTE') {
        return i === index;
      }
    }
    return false;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  onSend(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.inputText = '';
    this.chatbotService.sendMessage(text);
    this.shouldScrollBottom = true;
  }

  sendQuickReply(text: string): void {
    this.chatbotService.sendMessage(text);
    this.shouldScrollBottom = true;
  }

  onVoiceClick(): void {
    this.chatbotService.toggleVoiceRecognition((spokenText) => {
      this.inputText = spokenText;
      if (this.inputArea) {
        this.inputArea.nativeElement.focus();
      }
    });
  }

  onStartNewSession(): void {
    this.chatbotService.startNewSession();
    this.shouldScrollBottom = true;
  }

  verEnCatalogo(card: PrendaChatCard): void {
    this.chatbotService.close();
    this.router.navigate(['/catalogo'], { queryParams: { q: card.nombre } });
  }
}
