import { Injectable } from '@angular/core';
import { ChatConversation, ChatMessage } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly conversationKey = 'recruit_chat_conversations';
  private readonly messageKey = 'recruit_chat_messages';

  getConversationsForUser(userId: number): ChatConversation[] {
    return this.readConversations()
      .filter(c => c.participants.includes(userId))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }

  getConversationBetween(
    userAId: number,
    userAName: string,
    userARole: string,
    userBId: number,
    userBName: string,
    userBRole: string
  ): ChatConversation {
    const id = this.makeConversationId(userAId, userBId);
    const conversations = this.readConversations();
    const existing = conversations.find(c => c.id === id);

    if (existing) {
      existing.participantNames[userAId] = userAName;
      existing.participantNames[userBId] = userBName;
      existing.participantRoles[userAId] = userARole;
      existing.participantRoles[userBId] = userBRole;
      this.writeConversations(conversations);
      return existing;
    }

    const conversation: ChatConversation = {
      id,
      participants: [userAId, userBId],
      participantNames: {
        [userAId]: userAName,
        [userBId]: userBName
      },
      participantRoles: {
        [userAId]: userARole,
        [userBId]: userBRole
      },
      updatedAt: new Date().toISOString()
    };

    conversations.push(conversation);
    this.writeConversations(conversations);
    return conversation;
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.readMessages()
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }

  sendMessage(conversationId: string, senderId: number, senderName: string, text: string): ChatMessage {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Message cannot be empty');
    }

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      conversationId,
      senderId,
      senderName,
      text: cleanText,
      createdAt: new Date().toISOString(),
      readBy: [senderId]
    };

    const messages = this.readMessages();
    messages.push(message);
    this.writeMessages(messages);

    const conversations = this.readConversations();
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) {
      convo.updatedAt = message.createdAt;
      this.writeConversations(conversations);
    }

    return message;
  }

  markConversationAsRead(conversationId: string, userId: number) {
    const messages = this.readMessages();
    let changed = false;

    for (const message of messages) {
      if (message.conversationId !== conversationId) continue;
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        changed = true;
      }
    }

    if (changed) this.writeMessages(messages);
  }

  getUnreadCountForUser(userId: number): number {
    return this.readMessages().filter(m => m.senderId !== userId && !m.readBy.includes(userId)).length;
  }

  getUnreadCountForConversation(conversationId: string, userId: number): number {
    return this.readMessages().filter(
      m => m.conversationId === conversationId && m.senderId !== userId && !m.readBy.includes(userId)
    ).length;
  }

  private makeConversationId(a: number, b: number): string {
    return [a, b].sort((x, y) => x - y).join('-');
  }

  private readConversations(): ChatConversation[] {
    return this.readJson<ChatConversation[]>(this.conversationKey, []);
  }

  private writeConversations(value: ChatConversation[]) {
    localStorage.setItem(this.conversationKey, JSON.stringify(value));
  }

  private readMessages(): ChatMessage[] {
    return this.readJson<ChatMessage[]>(this.messageKey, []);
  }

  private writeMessages(value: ChatMessage[]) {
    localStorage.setItem(this.messageKey, JSON.stringify(value));
  }

  private readJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}
