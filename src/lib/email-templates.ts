import { CompiledEmailTemplate, EmailTemplateContextMap, EmailTemplateName } from "../types/email";

const templateRegistry: {
  [T in EmailTemplateName]: (context: EmailTemplateContextMap[T]) => CompiledEmailTemplate;
} = {
  USER_INVITED: (context) => ({
    subject: "You have been invited to " + context.tenantName,
    text:
      "Hello " +
      context.inviteeName +
      ",\n\n" +
      context.invitedByEmail +
      " invited you to join " +
      context.tenantName +
      " as " +
      context.role +
      ".",
    html:
      "<p>Hello " +
      context.inviteeName +
      ",</p><p>" +
      context.invitedByEmail +
      " invited you to join <strong>" +
      context.tenantName +
      "</strong> as " +
      context.role +
      ".</p>"
  }),
  API_KEY_ROTATED: (context) => ({
    subject: "API key rotated for " + context.tenantName,
    text:
      "Hello " +
      context.ownerEmail +
      ",\n\nThe API key '" +
      context.keyName +
      "' was rotated. The previous key remains valid until " +
      context.graceExpiresAt +
      ".",
    html:
      "<p>Hello " +
      context.ownerEmail +
      ",</p><p>The API key <strong>" +
      context.keyName +
      "</strong> was rotated. The previous key remains valid until <strong>" +
      context.graceExpiresAt +
      "</strong>.</p>"
  }),
  RATE_LIMIT_WARNING: (context) => ({
    subject: "Rate limit warning for " + context.tenantName,
    text:
      context.tenantName +
      " has reached " +
      context.usagePercent +
      "% of the per-minute tenant request budget (" +
      context.currentCount +
      "/" +
      context.limit +
      ").",
    html:
      "<p><strong>" +
      context.tenantName +
      "</strong> has reached " +
      context.usagePercent +
      "% of the per-minute tenant request budget (" +
      context.currentCount +
      "/" +
      context.limit +
      ").</p>"
  })
};

export function renderEmailTemplate<TTemplate extends EmailTemplateName>(
  template: TTemplate,
  context: EmailTemplateContextMap[TTemplate]
) {
  return templateRegistry[template](context as never);
}
