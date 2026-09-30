export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword';

export type ChatType = 'user' | 'group' | 'channel' | 'bot';

export type OutgoingStatus =
  | 'delivered'
  | 'read'
  | 'failed'
  | 'noAccount'
  | 'notInGroup';

export type TypeWebhook =
  | 'incomingMessageReceived'
  | 'outgoingMessageReceived'
  | 'outgoingAPIMessageReceived'
  | 'outgoingMessageStatus'
  | 'stateInstanceChanged'
  | 'quotaExceeded';

export interface InstanceData {
  idInstance: number;
  wid: string;
  typeInstance: string;
}

export interface SenderData {
  chatId: string;
  chatName: string;
  chatType: ChatType;
  sender: string;
  senderName: string;
  senderType: ChatType;
  senderContactName: string;
  senderPhoneNumber: number;
}

export interface TextMessageData {
  textMessage: string;
  isForwarded?: boolean;
  forwardingScore?: number;
}

export interface QuotedMessage {
  stanzaId: string;
  participant: string;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: TextMessageData;
  quotedMessage?: QuotedMessage;
}

interface NotificationBase {
  instanceData: InstanceData;
  timestamp: number;
}

export type MessageNotification = NotificationBase & {
  typeWebhook:
    | 'incomingMessageReceived'
    | 'outgoingMessageReceived'
    | 'outgoingAPIMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
};

export type StatusNotification = NotificationBase & {
  typeWebhook: 'outgoingMessageStatus';
  idMessage: string;
  chatId: string;
  status: OutgoingStatus;
  description: string;
};

export type StateNotification = NotificationBase & {
  typeWebhook: 'stateInstanceChanged';
  stateInstance: InstanceState;
};

export interface ReceiveNotificationResponse {
  receiptId: number;
  body:
    | MessageNotification
    | StatusNotification
    | StateNotification
    | { typeWebhook: TypeWebhook; [key: string]: unknown }
    | null;
}

export interface AccountSettings {
  avatar: string;
  phone: string;
  stateInstance: InstanceState;
  chatId: string;
  logoutProcess: boolean;
  suspendedUntil?: number;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  fromCache: boolean;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface DeleteNotificationResponse {
  result: boolean;
  reason: string;
}

export interface SetSettingsResponse {
  saveSettings: boolean;
}

export interface AvatarResponse {
  urlAvatar: string;
}

export type MessageState = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  localId: string;
  idMessage: string | null;
  chatId: string;
  text: string;
  timestamp: number;
  outgoing: boolean;
  status: MessageState;
  error?: string;
}

export interface Chat {
  chatId: string;
  title: string;
  phone?: string;
  avatarUrl?: string;
  lastActivity: number;
  unread: number;
  messages: ChatMessage[];
}

export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
}

export interface StoredSession {
  credentials: Credentials;
  chats: Chat[];
  activeChatId: string | null;
}