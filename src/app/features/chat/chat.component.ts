import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { ChatConversation, ChatMessage } from '../../core/models/chat.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit {
  conversations: ChatConversation[] = [];
  selectedConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  unreadTotal = 0;

  private route = inject(ActivatedRoute);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  ngOnInit(): void {
    this.refresh();

    this.route.queryParams.subscribe(params => {
      const current = this.authService.currentUser();
      if (!current) return;

      const partnerId = Number(params['partnerId']);
      const partnerName = params['partnerName'];
      const partnerRole = params['partnerRole'];

      if (partnerId && partnerName && partnerRole) {
        const convo = this.chatService.getConversationBetween(
          current.id,
          current.name,
          current.role,
          partnerId,
          partnerName,
          partnerRole
        );
        this.refresh();
        this.selectConversation(convo.id);
      }
    });
  }

  refresh() {
    const current = this.authService.currentUser();
    if (!current) return;

    this.conversations = this.chatService.getConversationsForUser(current.id);
    this.unreadTotal = this.chatService.getUnreadCountForUser(current.id);

    if (!this.selectedConversation && this.conversations.length) {
      this.selectConversation(this.conversations[0].id);
    } else if (this.selectedConversation) {
      this.selectConversation(this.selectedConversation.id);
    }
  }

  selectConversation(conversationId: string) {
    const current = this.authService.currentUser();
    if (!current) return;

    const convo = this.conversations.find(c => c.id === conversationId) || null;
    this.selectedConversation = convo;
    this.messages = convo ? this.chatService.getMessages(convo.id) : [];

    if (convo) {
      this.chatService.markConversationAsRead(convo.id, current.id);
      this.messages = this.chatService.getMessages(convo.id);
      this.unreadTotal = this.chatService.getUnreadCountForUser(current.id);
    }
  }

  sendMessage() {
    const current = this.authService.currentUser();
    if (!current || !this.selectedConversation) return;

    try {
      this.chatService.sendMessage(this.selectedConversation.id, current.id, current.name, this.newMessage);
      const receiverId = this.selectedConversation.participants.find(id => id !== current.id);
      if (receiverId) {
        this.notificationService.createNotification({
          userId: receiverId,
          message: `${current.name} sent you a message in chat.`,
          type: 'CHAT_MESSAGE'
        }).subscribe({ error: () => {} });
      }
      this.newMessage = '';
      this.refresh();
    } catch {
      Swal.fire('Message required', 'Please type a message before sending.', 'info');
    }
  }

  getOtherParticipantName(convo: ChatConversation): string {
    const currentId = this.authService.currentUser()?.id;
    if (!currentId) return 'Unknown';

    const otherId = convo.participants.find(id => id !== currentId);
    if (!otherId) return 'Unknown';
    return convo.participantNames[otherId] || `User ${otherId}`;
  }

  getOtherParticipantRole(convo: ChatConversation): string {
    const currentId = this.authService.currentUser()?.id;
    if (!currentId) return '';

    const otherId = convo.participants.find(id => id !== currentId);
    if (!otherId) return '';
    return convo.participantRoles[otherId] || '';
  }

  unreadForConversation(convo: ChatConversation): number {
    const currentId = this.authService.currentUser()?.id;
    if (!currentId) return 0;

    return this.chatService.getUnreadCountForConversation(convo.id, currentId);
  }

  isMine(message: ChatMessage): boolean {
    return message.senderId === this.authService.currentUser()?.id;
  }
}
