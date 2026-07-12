const WA_API = "https://graph.facebook.com/v21.0";

export interface WASendResult {
  messageId: string;
  status: string;
}

class WhatsAppClient {
  private get phoneId() { return process.env.WA_PHONE_NUMBER_ID!; }
  private get token() { return process.env.WA_ACCESS_TOKEN!; }

  private async send(type: string, to: string, params: Record<string, unknown>): Promise<WASendResult> {
    const res = await fetch(`${WA_API}/${this.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\+/g, ""),
        type,
        [type]: params,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`WA API error: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return { messageId: data.messages[0].id, status: "sent" };
  }

  sendText(to: string, message: string) {
    return this.send("text", to, { body: message });
  }

  sendTemplate(to: string, templateName: string, language = "id", components?: unknown[]) {
    return this.send("template", to, {
      name: templateName,
      language: { code: language },
      ...(components ? { components } : {}),
    });
  }
}

export const waClient = new WhatsAppClient();