export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: number;
  senderName: string;
  text: string;
  createdAt: string;
  readBy: number[];
}

export interface ChatConversation {
  id: string;
  participants: number[];
  participantNames: Record<number, string>;
  participantRoles: Record<number, string>;
  updatedAt: string;
}
