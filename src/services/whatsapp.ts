import fetch from "node-fetch";

export const WHATSAPP_CONFIG = {
  appId: process.env.WHATSAPP_APP_ID || "1966874557250899",
  appSecret: process.env.WHATSAPP_APP_SECRET || "61d5d3d83ccfd2e8fa3fb8d2bf93e0f3",
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "EAAnr71PnCNcBSSkq94w9xD9SzAy9MmwNPUmaQVlfu7O8Sp4yDYRiTFdMI08AZBFnMT6EkdzTz5DuDiveDhfywuBSQpxiFjWGLnWJg9zQUz8TadqYJcnTGNG9xJGrTFyDYrWO5QCRyIvdUqp7tPbP0XAxuhxeAhs4119V3YqHm6gkZAtNIq1D9x59sgaQZDZD",
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "amarena_sorvetes_passos_2026",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  graphApiVersion: "v20.0"
};

/**
 * Envia uma mensagem de texto de volta para o cliente via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(toPhone: string, textMessage: string, customPhoneNumberId?: string) {
  try {
    const phoneNumberId = customPhoneNumberId || WHATSAPP_CONFIG.phoneNumberId;
    if (!phoneNumberId) {
      console.warn("[WhatsApp Cloud API] PhoneNumberId não configurado para envio de mensagem.");
      return { success: false, error: "PhoneNumberId ausente" };
    }

    const cleanPhone = toPhone.replace(/\D/g, "");
    const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.graphApiVersion}/${phoneNumberId}/messages`;

    console.log(`[WhatsApp Cloud API] Enviando mensagem para ${cleanPhone}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: true,
          body: textMessage
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[WhatsApp Cloud API] Erro ao enviar mensagem:", errText);
      return { success: false, error: errText };
    }

    const resData = await response.json();
    console.log("[WhatsApp Cloud API] Mensagem enviada com sucesso:", resData);
    return { success: true, data: resData };
  } catch (error: any) {
    console.error("[WhatsApp Cloud API] Erro inesperado:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
