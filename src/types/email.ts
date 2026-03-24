export type EmailTemplateName = "USER_INVITED" | "API_KEY_ROTATED" | "RATE_LIMIT_WARNING";

export interface EmailTemplateContextMap {
  USER_INVITED: {
    tenantName: string;
    invitedByEmail: string;
    inviteeName: string;
    role: string;
  };
  API_KEY_ROTATED: {
    tenantName: string;
    ownerEmail: string;
    keyName: string;
    graceExpiresAt: string;
  };
  RATE_LIMIT_WARNING: {
    tenantName: string;
    usagePercent: number;
    currentCount: number;
    limit: number;
  };
}

export interface CompiledEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface QueueEmailJob<TTemplate extends EmailTemplateName = EmailTemplateName> {
  tenantId: string;
  recipient: string;
  template: TTemplate;
  context: EmailTemplateContextMap[TTemplate];
}
