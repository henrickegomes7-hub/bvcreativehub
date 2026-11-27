export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL } = process.env;
  if (![GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REFRESH_TOKEN,GMAIL_SENDER_EMAIL].every(Boolean)) throw new Error('MAIL_NOT_CONFIGURED');
  if ([to,GMAIL_SENDER_EMAIL].some(value => /[\r\n]/.test(value!))) throw new Error('INVALID_RECIPIENT');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', signal:AbortSignal.timeout(10000),
    body:new URLSearchParams({client_id:GMAIL_CLIENT_ID!,client_secret:GMAIL_CLIENT_SECRET!,refresh_token:GMAIL_REFRESH_TOKEN!,grant_type:'refresh_token'}),
  });
  const token = await response.json();
  if (!response.ok || typeof token.access_token !== 'string') throw new Error('MAIL_AUTH_FAILED');
  const message = [
    `From: BV Creative Hub <${GMAIL_SENDER_EMAIL}>`, `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    Buffer.from(body).toString('base64').match(/.{1,76}/g)!.join('\r\n'),
  ].join('\r\n');
  const sent = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method:'POST', signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify({raw:Buffer.from(message).toString('base64url')}),
  });
  if (!sent.ok) throw new Error('MAIL_SEND_FAILED');
}
