export interface IMessageSendPayload {
  content: string;
  recipientUsername: string;
}

export interface IMessageGetPayload {
  recipientUsername: string;
}

export interface IMessageReadPayload {
  messageId: string;
}

export interface IMessage {
  id: string;
  content: string;
  senderId: number;
  recipientId: number;
  isRead: boolean;
  createdAt: Date;
  sender: {
    username: string;
    name?: string;
    picture?: string;
  };
  recipient: {
    username: string;
    name?: string;
    picture?: string;
  };
}

export interface IConversation {
  recipientUsername: string;
  recipientName?: string;
  recipientPicture?: string;
  lastMessage: {
    content: string;
    createdAt: Date;
    isFromMe: boolean;
  };
  unreadCount: number;
}
