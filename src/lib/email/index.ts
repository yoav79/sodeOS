export { sendEmail } from './service';
export type { SendEmailInput, SendEmailResult } from './types';
export {
  renderBaseEmailLayout,
  stripHtmlToText,
  renderBrainInvitationEmail,
  type RenderBrainInvitationEmailInput,
  type RenderedEmailTemplate,
} from './templates';
